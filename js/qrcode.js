/* ============================================================
   CEPEED — Générateur de code QR 100% local (aucun appel réseau,
   aucune dépendance CDN — cohérent avec l'architecture hors-ligne
   de l'application). Implémentation compacte de la norme QR Code
   (mode Octet uniquement, versions 1 à 20 — largement suffisant
   pour des codes de vérification de quelques dizaines de
   caractères comme ceux utilisés sur les reçus et bulletins).
   ============================================================ */
const QRCodeLib = (function(){

  /* ---- Arithmétique du corps de Galois GF(256), polynôme 0x11D ---- */
  const EXP_TABLE = new Array(256);
  const LOG_TABLE = new Array(256);
  (function(){
    let x = 1;
    for(let i=0;i<255;i++){
      EXP_TABLE[i] = x;
      LOG_TABLE[x] = i;
      x <<= 1;
      if(x & 0x100) x ^= 0x11D;
    }
    for(let i=255;i<512;i++) EXP_TABLE[i] = EXP_TABLE[i-255];
  })();
  function gexp(n){ while(n<0) n+=255; while(n>=255) n-=255; return EXP_TABLE[n]; }
  function glog(n){ return LOG_TABLE[n]; }

  /* ---- Polynômes sur GF(256) ---- */
  function Polynomial(num, shift){
    shift = shift || 0;
    let offset = 0;
    while(offset < num.length && num[offset]===0) offset++;
    this.num = new Array(num.length - offset + shift);
    for(let i=0;i<num.length-offset;i++) this.num[i] = num[i+offset];
    for(let i=0;i<shift;i++) this.num[num.length-offset+i] = 0;
  }
  Polynomial.prototype.get = function(i){ return this.num[i]; };
  Polynomial.prototype.getLength = function(){ return this.num.length; };
  Polynomial.prototype.multiply = function(e){
    const num = new Array(this.getLength() + e.getLength() - 1).fill(0);
    for(let i=0;i<this.getLength();i++){
      for(let j=0;j<e.getLength();j++){
        num[i+j] ^= gexp(glog(this.get(i)) + glog(e.get(j)));
      }
    }
    return new Polynomial(num, 0);
  };
  Polynomial.prototype.mod = function(e){
    if(this.getLength() - e.getLength() < 0) return this;
    const ratio = glog(this.get(0)) - glog(e.get(0));
    const num = this.num.slice();
    for(let i=0;i<e.getLength();i++) num[i] ^= gexp(glog(e.get(i)) + ratio);
    return new Polynomial(num, 0).mod(e);
  };
  function errorCorrectPolynomial(ecLength){
    let a = new Polynomial([1]);
    for(let i=0;i<ecLength;i++) a = a.multiply(new Polynomial([1, gexp(i)]));
    return a;
  }

  /* ---- Tampon de bits ---- */
  function BitBuffer(){ this.buffer=[]; this.length=0; }
  BitBuffer.prototype.put = function(num, length){
    for(let i=0;i<length;i++) this.putBit(((num >>> (length-i-1)) & 1) === 1);
  };
  BitBuffer.prototype.putBit = function(bit){
    const idx = Math.floor(this.length/8);
    if(this.buffer.length <= idx) this.buffer.push(0);
    if(bit) this.buffer[idx] |= (0x80 >>> (this.length % 8));
    this.length++;
  };

  /* ---- Table des blocs Reed-Solomon (versions 1-20), source: norme QR /
     implémentation de référence MIT "qrcode-generator" (kazuhikoarase) ----
     Ordre par version: L, M, Q, H. Chaque ligne: [nbBlocs,total,data, ...] */
  const RS_BLOCK_TABLE = {
    1:{L:[[1,26,19]],M:[[1,26,16]],Q:[[1,26,13]],H:[[1,26,9]]},
    2:{L:[[1,44,34]],M:[[1,44,28]],Q:[[1,44,22]],H:[[1,44,16]]},
    3:{L:[[1,70,55]],M:[[1,70,44]],Q:[[2,35,17]],H:[[2,35,13]]},
    4:{L:[[1,100,80]],M:[[2,50,32]],Q:[[2,50,24]],H:[[4,25,9]]},
    5:{L:[[1,134,108]],M:[[2,67,43]],Q:[[2,33,15],[2,34,16]],H:[[2,33,11],[2,34,12]]},
    6:{L:[[2,86,68]],M:[[4,43,27]],Q:[[4,43,19]],H:[[4,43,15]]},
    7:{L:[[2,98,78]],M:[[4,49,31]],Q:[[2,32,14],[4,33,15]],H:[[4,39,13],[1,40,14]]},
    8:{L:[[2,121,97]],M:[[2,60,38],[2,61,39]],Q:[[4,40,18],[2,41,19]],H:[[4,40,14],[2,41,15]]},
    9:{L:[[2,146,116]],M:[[3,58,36],[2,59,37]],Q:[[4,36,16],[4,37,17]],H:[[4,36,12],[4,37,13]]},
    10:{L:[[2,86,68],[2,87,69]],M:[[4,69,43],[1,70,44]],Q:[[6,43,19],[2,44,20]],H:[[6,43,15],[2,44,16]]},
    11:{L:[[4,101,81]],M:[[1,80,50],[4,81,51]],Q:[[4,50,22],[4,51,23]],H:[[3,36,12],[8,37,13]]},
    12:{L:[[2,116,92],[2,117,93]],M:[[6,58,36],[2,59,37]],Q:[[4,46,20],[6,47,21]],H:[[7,42,14],[4,43,15]]},
    13:{L:[[4,133,107]],M:[[8,59,37],[1,60,38]],Q:[[8,44,20],[4,45,21]],H:[[12,33,11],[4,34,12]]},
    14:{L:[[3,145,115],[1,146,116]],M:[[4,64,40],[5,65,41]],Q:[[11,36,16],[5,37,17]],H:[[11,36,12],[5,37,13]]},
    15:{L:[[5,109,87],[1,110,88]],M:[[5,65,41],[5,66,42]],Q:[[5,54,24],[7,55,25]],H:[[11,36,12],[7,37,13]]},
    16:{L:[[5,122,98],[1,123,99]],M:[[7,73,45],[3,74,46]],Q:[[15,43,19],[2,44,20]],H:[[3,45,15],[13,46,16]]},
    17:{L:[[1,135,107],[5,136,108]],M:[[10,74,46],[1,75,47]],Q:[[1,50,22],[15,51,23]],H:[[2,42,14],[17,43,15]]},
    18:{L:[[5,150,120],[1,151,121]],M:[[9,69,43],[4,70,44]],Q:[[17,50,22],[1,51,23]],H:[[2,42,14],[19,43,15]]},
    19:{L:[[3,141,113],[4,142,114]],M:[[3,70,44],[11,71,45]],Q:[[17,47,21],[4,48,22]],H:[[9,39,13],[16,40,14]]},
    20:{L:[[3,135,107],[5,136,108]],M:[[3,67,41],[13,68,42]],Q:[[15,54,24],[5,55,25]],H:[[15,43,15],[10,44,16]]}
  };
  function getRSBlocks(typeNumber, ec){
    const spec = RS_BLOCK_TABLE[typeNumber][ec];
    const list = [];
    spec.forEach(([count,total,data])=>{
      for(let i=0;i<count;i++) list.push({total, data});
    });
    return list;
  }

  /* ---- Positions des motifs d'alignement (versions 1-20) ---- */
  const PATTERN_POSITION_TABLE = [
    [], [6,18], [6,22], [6,26], [6,30], [6,34],
    [6,22,38], [6,24,42], [6,26,46], [6,28,50],
    [6,30,54], [6,32,58], [6,34,62], [6,26,46,66], [6,26,48,70],
    [6,26,50,74], [6,30,54,78], [6,30,56,82], [6,30,58,86], [6,34,62,90]
  ];

  /* ---- Constantes BCH pour les informations de format / version ---- */
  const G15 = (1<<10)|(1<<8)|(1<<5)|(1<<4)|(1<<2)|(1<<1)|(1<<0);
  const G18 = (1<<12)|(1<<11)|(1<<10)|(1<<9)|(1<<8)|(1<<5)|(1<<2)|(1<<0);
  const G15_MASK = (1<<14)|(1<<12)|(1<<10)|(1<<4)|(1<<1);
  function bchDigit(data){ let d=0; while(data!==0){ d++; data >>>= 1; } return d; }
  function bchTypeInfo(data){
    let d = data << 10;
    while(bchDigit(d) - bchDigit(G15) >= 0) d ^= (G15 << (bchDigit(d)-bchDigit(G15)));
    return ((data<<10)|d) ^ G15_MASK;
  }
  function bchTypeNumber(data){
    let d = data << 12;
    while(bchDigit(d) - bchDigit(G18) >= 0) d ^= (G18 << (bchDigit(d)-bchDigit(G18)));
    return (data<<12)|d;
  }

  const EC_BITS = {L:1, M:0, Q:3, H:2}; // indicateur d'ECC dans les infos de format

  function getMask(pattern, i, j){
    switch(pattern){
      case 0: return (i+j)%2===0;
      case 1: return i%2===0;
      case 2: return j%3===0;
      case 3: return (i+j)%3===0;
      case 4: return (Math.floor(i/2)+Math.floor(j/3))%2===0;
      case 5: return (i*j)%2 + (i*j)%3 === 0;
      case 6: return ((i*j)%2 + (i*j)%3)%2 === 0;
      case 7: return ((i*j)%3 + (i+j)%2)%2 === 0;
    }
    return false;
  }

  /* Encode une chaîne UTF-8 en tableau d'octets (mode Octet) */
  function toUtf8Bytes(s){
    const utf8 = unescape(encodeURIComponent(s));
    const bytes = new Array(utf8.length);
    for(let i=0;i<utf8.length;i++) bytes[i] = utf8.charCodeAt(i);
    return bytes;
  }

  function lengthBits(typeNumber){ return typeNumber < 10 ? 8 : 16; }

  function createData(typeNumber, ec, bytes){
    const rsBlocks = getRSBlocks(typeNumber, ec);
    const buffer = new BitBuffer();
    buffer.put(4, 4); // mode Octet = 0100
    buffer.put(bytes.length, lengthBits(typeNumber));
    bytes.forEach(b => buffer.put(b, 8));

    let totalDataCount = 0;
    rsBlocks.forEach(b => totalDataCount += b.data);
    if(buffer.length + 4 <= totalDataCount*8) buffer.put(0,4);
    while(buffer.length % 8 !== 0) buffer.putBit(false);
    while(buffer.length < totalDataCount*8){
      buffer.put(0xEC, 8);
      if(buffer.length >= totalDataCount*8) break;
      buffer.put(0x11, 8);
    }

    // Répartition en blocs + calcul des codes de correction Reed-Solomon
    let offset = 0, maxDc = 0, maxEc = 0;
    const dcdata = [], ecdata = [];
    rsBlocks.forEach(block=>{
      const dcCount = block.data, ecCount = block.total - block.data;
      maxDc = Math.max(maxDc, dcCount); maxEc = Math.max(maxEc, ecCount);
      const dc = new Array(dcCount);
      for(let i=0;i<dcCount;i++) dc[i] = buffer.buffer[i+offset] & 0xff;
      offset += dcCount;
      const rsPoly = errorCorrectPolynomial(ecCount);
      const rawPoly = new Polynomial(dc, rsPoly.getLength()-1);
      const modPoly = rawPoly.mod(rsPoly);
      const ec_ = new Array(rsPoly.getLength()-1);
      for(let i=0;i<ec_.length;i++){
        const idx = i + modPoly.getLength() - ec_.length;
        ec_[i] = idx>=0 ? modPoly.get(idx) : 0;
      }
      dcdata.push(dc); ecdata.push(ec_);
    });

    let totalCount = 0;
    rsBlocks.forEach(b=> totalCount += b.total);
    const data = new Array(totalCount);
    let idx = 0;
    for(let i=0;i<maxDc;i++) dcdata.forEach(dc=>{ if(i<dc.length) data[idx++] = dc[i]; });
    for(let i=0;i<maxEc;i++) ecdata.forEach(ec_=>{ if(i<ec_.length) data[idx++] = ec_[i]; });
    return data;
  }

  function QRCodeModel(typeNumber, ec){
    this.typeNumber = typeNumber;
    this.ec = ec;
    this.moduleCount = typeNumber*4+17;
    this.modules = [];
  }
  QRCodeModel.prototype.isDark = function(row,col){
    if(row<0||this.moduleCount<=row||col<0||this.moduleCount<=col) return false;
    return !!this.modules[row][col];
  };
  QRCodeModel.prototype.setupPositionProbePattern = function(row,col){
    for(let r=-1;r<=7;r++){
      for(let c=-1;c<=7;c++){
        if(row+r<=-1||this.moduleCount<=row+r||col+c<=-1||this.moduleCount<=col+c) continue;
        this.modules[row+r][col+c] =
          (0<=r&&r<=6&&(c===0||c===6)) || (0<=c&&c<=6&&(r===0||r===6)) || (2<=r&&r<=4&&2<=c&&c<=4);
      }
    }
  };
  QRCodeModel.prototype.setupTimingPattern = function(){
    for(let i=8;i<this.moduleCount-8;i++){
      if(this.modules[i][6]!==null) continue;
      this.modules[i][6] = (i%2===0);
      this.modules[6][i] = (i%2===0);
    }
  };
  QRCodeModel.prototype.setupPositionAdjustPattern = function(){
    const pos = PATTERN_POSITION_TABLE[this.typeNumber-1];
    for(let i=0;i<pos.length;i++){
      for(let j=0;j<pos.length;j++){
        const row=pos[i], col=pos[j];
        if(this.modules[row][col]!==null) continue;
        for(let r=-2;r<=2;r++){
          for(let c=-2;c<=2;c++){
            this.modules[row+r][col+c] = (r===-2||r===2||c===-2||c===2||(r===0&&c===0));
          }
        }
      }
    }
  };
  QRCodeModel.prototype.setupTypeNumber = function(test){
    if(this.typeNumber < 7) return;
    const bits = bchTypeNumber(this.typeNumber);
    for(let i=0;i<18;i++){
      const mod = (!test && ((bits>>i)&1)===1);
      this.modules[Math.floor(i/3)][i%3+this.moduleCount-8-3] = mod;
      this.modules[i%3+this.moduleCount-8-3][Math.floor(i/3)] = mod;
    }
  };
  QRCodeModel.prototype.setupTypeInfo = function(test, maskPattern){
    const data = (EC_BITS[this.ec]<<3) | maskPattern;
    const bits = bchTypeInfo(data);
    for(let i=0;i<15;i++){
      const mod = (!test && ((bits>>i)&1)===1);
      if(i<6) this.modules[i][8] = mod;
      else if(i<8) this.modules[i+1][8] = mod;
      else this.modules[this.moduleCount-15+i][8] = mod;
      if(i<8) this.modules[8][this.moduleCount-i-1] = mod;
      else if(i<9) this.modules[8][15-i-1+1] = mod;
      else this.modules[8][15-i-1] = mod;
    }
    this.modules[this.moduleCount-8][8] = !test;
  };
  QRCodeModel.prototype.mapData = function(data, maskPattern){
    let inc=-1, row=this.moduleCount-1, bitIndex=7, byteIndex=0;
    for(let col=this.moduleCount-1; col>0; col-=2){
      if(col===6) col--;
      while(true){
        for(let c=0;c<2;c++){
          if(this.modules[row][col-c]===null){
            let dark = false;
            if(byteIndex < data.length) dark = (((data[byteIndex]>>>bitIndex)&1)===1);
            if(getMask(maskPattern,row,col-c)) dark = !dark;
            this.modules[row][col-c] = dark;
            bitIndex--;
            if(bitIndex===-1){ byteIndex++; bitIndex=7; }
          }
        }
        row += inc;
        if(row<0 || this.moduleCount<=row){ row -= inc; inc = -inc; break; }
      }
    }
  };
  QRCodeModel.prototype.build = function(bytes){
    const dataArr = createData(this.typeNumber, this.ec, bytes);
    let bestPattern = 0, bestScore = -1, bestModules = null;
    for(let p=0;p<8;p++){
      this.modules = [];
      for(let i=0;i<this.moduleCount;i++) this.modules.push(new Array(this.moduleCount).fill(null));
      this.setupPositionProbePattern(0,0);
      this.setupPositionProbePattern(this.moduleCount-7,0);
      this.setupPositionProbePattern(0,this.moduleCount-7);
      this.setupPositionAdjustPattern();
      this.setupTimingPattern();
      this.setupTypeInfo(true,p);
      this.setupTypeNumber(true);
      this.mapData(dataArr,p);
      const score = lostPoint(this);
      if(bestScore===-1 || score < bestScore){ bestScore = score; bestPattern = p; bestModules = this.modules; }
    }
    this.modules = bestModules;
    // régénère la version finale (non-test) avec le meilleur masque
    this.modules = [];
    for(let i=0;i<this.moduleCount;i++) this.modules.push(new Array(this.moduleCount).fill(null));
    this.setupPositionProbePattern(0,0);
    this.setupPositionProbePattern(this.moduleCount-7,0);
    this.setupPositionProbePattern(0,this.moduleCount-7);
    this.setupPositionAdjustPattern();
    this.setupTimingPattern();
    this.setupTypeInfo(false,bestPattern);
    this.setupTypeNumber(false);
    this.mapData(dataArr,bestPattern);
  };

  function lostPoint(qr){
    const n = qr.moduleCount;
    let lost = 0;
    for(let row=0;row<n;row++){
      for(let col=0;col<n;col++){
        let sameCount=0;
        const dark = qr.isDark(row,col);
        for(let r=-1;r<=1;r++){
          if(row+r<0||n<=row+r) continue;
          for(let c=-1;c<=1;c++){
            if((col+c<0||n<=col+c)||(r===0&&c===0)) continue;
            if(dark===qr.isDark(row+r,col+c)) sameCount++;
          }
        }
        if(sameCount>5) lost += 3+sameCount-5;
      }
    }
    for(let row=0;row<n-1;row++){
      for(let col=0;col<n-1;col++){
        let count=0;
        if(qr.isDark(row,col)) count++;
        if(qr.isDark(row+1,col)) count++;
        if(qr.isDark(row,col+1)) count++;
        if(qr.isDark(row+1,col+1)) count++;
        if(count===0||count===4) lost += 3;
      }
    }
    for(let row=0;row<n;row++){
      for(let col=0;col<n-6;col++){
        if(qr.isDark(row,col)&&!qr.isDark(row,col+1)&&qr.isDark(row,col+2)&&qr.isDark(row,col+3)&&qr.isDark(row,col+4)&&!qr.isDark(row,col+5)&&qr.isDark(row,col+6)) lost += 40;
      }
    }
    for(let col=0;col<n;col++){
      for(let row=0;row<n-6;row++){
        if(qr.isDark(row,col)&&!qr.isDark(row+1,col)&&qr.isDark(row+2,col)&&qr.isDark(row+3,col)&&qr.isDark(row+4,col)&&!qr.isDark(row+5,col)&&qr.isDark(row+6,col)) lost += 40;
      }
    }
    let dark=0;
    for(let col=0;col<n;col++) for(let row=0;row<n;row++) if(qr.isDark(row,col)) dark++;
    lost += Math.abs(100*dark/n/n - 50)/5*10;
    return lost;
  }

  /* Choisit la plus petite version (1-20) capable de contenir les données,
     pour le niveau de correction d'erreur donné ('L'|'M'|'Q'|'H'). */
  function build(text, ec){
    ec = ec || 'M';
    const bytes = toUtf8Bytes(String(text));
    for(let typeNumber=1; typeNumber<=20; typeNumber++){
      const rsBlocks = getRSBlocks(typeNumber, ec);
      let totalDataCount = 0;
      rsBlocks.forEach(b=> totalDataCount += b.data);
      const capacityBits = totalDataCount*8;
      const neededBits = 4 + lengthBits(typeNumber) + bytes.length*8;
      if(neededBits <= capacityBits){
        const qr = new QRCodeModel(typeNumber, ec);
        qr.build(bytes);
        return qr;
      }
    }
    // Repli : tronque si (cas très improbable ici) le texte dépasse la version 20-L
    return build(String(text).slice(0,300), 'L');
  }

  /* Rendu SVG (chaîne de balisage) — cellSize/margin en "unités module" */
  function toSVG(qr, cellSize, margin, dark, light){
    cellSize = cellSize || 4; margin = margin != null ? margin : cellSize*2;
    dark = dark || '#14213d'; light = light || '#ffffff';
    const n = qr.moduleCount;
    const size = n*cellSize + margin*2;
    let rects = `<rect x="0" y="0" width="${size}" height="${size}" fill="${light}"/>`;
    for(let r=0;r<n;r++){
      for(let c=0;c<n;c++){
        if(qr.isDark(r,c)){
          rects += `<rect x="${margin+c*cellSize}" y="${margin+r*cellSize}" width="${cellSize}" height="${cellSize}" fill="${dark}" shape-rendering="crispEdges"/>`;
        }
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${rects}</svg>`;
  }

  return {
    /* API publique : makeSVG(texte, options) → balisage <svg> prêt à insérer */
    makeSVG(text, opts){
      opts = opts || {};
      const qr = build(text, opts.ec || 'M');
      return toSVG(qr, opts.cellSize, opts.margin, opts.dark, opts.light);
    }
  };
})();
