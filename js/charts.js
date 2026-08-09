/* ============================================================
   CEPEED — Moteur de graphiques "Pro" 100% maison (Canvas 2D)
   Aucune dépendance externe, aucun CDN : l'application reste
   utilisable hors-ligne (voir README). Réutilisable sur toutes
   les pages du logiciel.

   API :
     CepeedCharts.area(canvasId, options)   -> courbe / aire dégradée
     CepeedCharts.donut(canvasId, options)  -> anneau (répartition)
     CepeedCharts.bars(canvasId, options)   -> barres (verticales/horizontales)
     CepeedCharts.gauge(canvasId, options)  -> jauge en arc (taux %)

   Toutes les fonctions :
     - s'adaptent en haute définition (devicePixelRatio)
     - se redessinent automatiquement au redimensionnement
     - s'animent à l'affichage (easing)
     - affichent une info-bulle au survol
     - se re-rendent instantanément si on les rappelle avec de
       nouvelles données (mise à jour "temps réel")
   ============================================================ */

const CepeedCharts = (() => {

  const PALETTE = {
    blue: '#2f6fed', blueSoft: 'rgba(47,111,237,.14)',
    green: '#2fbf71', greenSoft: 'rgba(47,191,113,.14)',
    orange: '#f5a623', orangeSoft: 'rgba(245,166,35,.14)',
    red: '#e5484d', redSoft: 'rgba(229,72,77,.14)',
    gray: '#9aa2ba', text: '#16213e', muted: '#7c85a3', grid: '#eef0f6'
  };

  function easeOutCubic(t){ return 1 - Math.pow(1-t, 3); }

  function fmtCompact(v){
    v = Number(v)||0;
    if(Math.abs(v) >= 1000000) return (v/1000000).toLocaleString('fr-FR',{maximumFractionDigits:1})+'M';
    if(Math.abs(v) >= 1000) return (v/1000).toLocaleString('fr-FR',{maximumFractionDigits:0})+'k';
    return v.toLocaleString('fr-FR');
  }

  /* ---------- Tooltip flottant partagé par tous les graphiques ---------- */
  let tooltipEl = null;
  function tooltip(){
    if(!tooltipEl){
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'chart-tooltip';
      document.body.appendChild(tooltipEl);
    }
    return tooltipEl;
  }
  function showTooltip(x, y, html){
    const t = tooltip();
    t.innerHTML = html;
    t.style.display = 'block';
    const pad = 14;
    let left = x + pad, top = y - t.offsetHeight - pad;
    if(left + t.offsetWidth > window.innerWidth - 10) left = x - t.offsetWidth - pad;
    if(top < 10) top = y + pad;
    t.style.left = left + 'px';
    t.style.top = top + 'px';
  }
  function hideTooltip(){ if(tooltipEl) tooltipEl.style.display = 'none'; }

  /* ---------- Prépare un canvas en haute définition + suit son conteneur ---------- */
  function setupCanvas(canvas, heightOverride){
    const parent = canvas.parentElement;
    const cssW = parent.clientWidth;
    const cssH = heightOverride || parent.clientHeight || 180;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return {ctx, w: cssW, h: cssH};
  }

  /* Relance la dernière fonction de rendu du canvas quand son conteneur change de taille.
     Le tout premier appel du ResizeObserver arrive dès l'observation initiale (avant même
     un vrai redimensionnement) : on l'ignore pour ne pas couper l'animation d'entrée. */
  function watchResize(canvas, renderFn){
    if(canvas._cepeedRO) canvas._cepeedRO.disconnect();
    let first = true;
    const ro = new ResizeObserver(() => {
      if(first){ first = false; return; }
      renderFn(false);
    });
    ro.observe(canvas.parentElement);
    canvas._cepeedRO = ro;
  }

  function animate(canvas, duration, onFrame){
    if(canvas._cepeedRAF) cancelAnimationFrame(canvas._cepeedRAF);
    const start = performance.now();
    function step(now){
      const p = Math.min(1, (now - start) / duration);
      onFrame(easeOutCubic(p));
      if(p < 1) canvas._cepeedRAF = requestAnimationFrame(step);
    }
    canvas._cepeedRAF = requestAnimationFrame(step);
  }

  /* ================= COURBE / AIRE DÉGRADÉE ================= */
  function area(canvasId, opts){
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const values = opts.values || [];
    const labels = opts.labels || [];
    const color = opts.color || PALETTE.blue;
    const unit = opts.unit || '';
    const animated = opts.animate !== false;

    function render(withAnim){
      const {ctx, w, h} = setupCanvas(canvas);
      const padL = 46, padR = 14, padT = 18, padB = 26;
      const plotW = w - padL - padR, plotH = h - padT - padB;
      const max = Math.max(...values, 1) * 1.2;
      const min = Math.min(0, Math.min(...values));

      const xAt = i => padL + (values.length > 1 ? (plotW/(values.length-1))*i : plotW/2);
      const yAt = v => padT + plotH - ((v-min)/(max-min))*plotH;

      const points = values.map((v,i) => ({x: xAt(i), y: yAt(v), v, label: labels[i]}));

      function draw(progress){
        ctx.clearRect(0,0,w,h);

        // grille horizontale + labels Y
        ctx.strokeStyle = PALETTE.grid;
        ctx.lineWidth = 1;
        ctx.font = '10.5px Inter, sans-serif';
        ctx.fillStyle = PALETTE.muted;
        ctx.textBaseline = 'middle';
        for(let i=0;i<=3;i++){
          const gv = min + (max-min)/3*i;
          const gy = padT + plotH - (plotH/3)*i;
          ctx.beginPath(); ctx.moveTo(padL, gy); ctx.lineTo(w-padR, gy); ctx.stroke();
          ctx.fillText(fmtCompact(gv), 2, gy);
        }

        if(points.length < 2){ return; }

        // chemin lissé (courbes de Bézier entre points), révélé progressivement de gauche à droite
        const revealX = padL + plotW*progress;

        function smoothPath(ctxPath){
          ctxPath.moveTo(points[0].x, points[0].y);
          for(let i=0;i<points.length-1;i++){
            const p0 = points[i], p1 = points[i+1];
            const midX = (p0.x+p1.x)/2;
            ctxPath.bezierCurveTo(midX, p0.y, midX, p1.y, p1.x, p1.y);
          }
        }

        ctx.save();
        ctx.beginPath();
        ctx.rect(padL-2, 0, Math.max(0,(plotW+padR)*progress), h);
        ctx.clip();

        // aire dégradée
        const grad = ctx.createLinearGradient(0, padT, 0, padT+plotH);
        grad.addColorStop(0, hexToRgba(color, .22));
        grad.addColorStop(1, hexToRgba(color, 0));
        ctx.beginPath();
        smoothPath(ctx);
        ctx.lineTo(points[points.length-1].x, padT+plotH);
        ctx.lineTo(points[0].x, padT+plotH);
        ctx.closePath();
        ctx.fillStyle = grad;
        ctx.fill();

        // ligne
        ctx.beginPath();
        smoothPath(ctx);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();

        // points + valeurs
        points.forEach((p,i)=>{
          if(p.x > revealX + 1 && progress < 1) return;
          ctx.beginPath();
          ctx.arc(p.x, p.y, canvas._hoverIdx===i ? 5.5 : 3.5, 0, Math.PI*2);
          ctx.fillStyle = '#fff';
          ctx.fill();
          ctx.lineWidth = 2.2;
          ctx.strokeStyle = color;
          ctx.stroke();
        });

        // labels X
        ctx.fillStyle = PALETTE.muted;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        points.forEach(p=>{
          if(p.x > revealX + 1 && progress < 1) return;
          ctx.fillText(p.label || '', p.x, h - 6);
        });
        ctx.textAlign = 'left';
      }

      canvas._render = draw;
      if(animated && withAnim !== false) animate(canvas, 750, draw); else draw(1);

      canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        let nearest = 0, dist = Infinity;
        points.forEach((p,i)=>{ const d = Math.abs(p.x-mx); if(d<dist){dist=d; nearest=i;} });
        if(dist < 40){
          canvas._hoverIdx = nearest;
          draw(1);
          const p = points[nearest];
          showTooltip(e.clientX, e.clientY, `<b>${p.label}</b><br>${fmtCompact(p.v)}${unit}`);
        } else { canvas._hoverIdx = -1; draw(1); hideTooltip(); }
      };
      canvas.onmouseleave = () => { canvas._hoverIdx = -1; draw(1); hideTooltip(); };
    }

    watchResize(canvas, () => render(false));
    render(true);
  }

  function hexToRgba(hex, a){
    const h = hex.replace('#','');
    const r = parseInt(h.substring(0,2),16), g = parseInt(h.substring(2,4),16), b = parseInt(h.substring(4,6),16);
    return `rgba(${r},${g},${b},${a})`;
  }

  /* ================= ANNEAU (DONUT) ================= */
  function donut(canvasId, opts){
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const segments = (opts.segments || []).filter(s => s.value > 0);
    const total = segments.reduce((s,x)=>s+x.value, 0) || 1;
    const centerTitle = opts.centerTitle || '';
    const legendEl = opts.legendId ? document.getElementById(opts.legendId) : null;

    function render(withAnim){
      const {ctx, w, h} = setupCanvas(canvas);
      const cx = w/2, cy = h/2;
      const r = Math.min(w,h)/2 - 8;
      const rInner = r * 0.62;

      function draw(progress){
        ctx.clearRect(0,0,w,h);
        let start = -Math.PI/2;
        segments.forEach((s,i)=>{
          const sweep = (s.value/total) * Math.PI*2 * progress;
          const hovered = canvas._hoverIdx === i;
          const rr = hovered ? r+4 : r;
          ctx.beginPath();
          ctx.arc(cx, cy, rr, start, start+sweep);
          ctx.arc(cx, cy, rInner, start+sweep, start, true);
          ctx.closePath();
          ctx.fillStyle = s.color;
          ctx.globalAlpha = hovered || canvas._hoverIdx==null || canvas._hoverIdx===-1 ? 1 : .45;
          ctx.fill();
          ctx.globalAlpha = 1;
          s._start = start; s._end = start+sweep;
          start += sweep;
        });

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = PALETTE.text;
        ctx.font = '800 20px Inter, sans-serif';
        ctx.fillText(fmtCompact(total*progress), cx, cy-8);
        ctx.font = '700 10.5px Inter, sans-serif';
        ctx.fillStyle = PALETTE.muted;
        ctx.fillText(centerTitle, cx, cy+12);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      }

      canvas._render = draw;
      if(opts.animate !== false && withAnim !== false) animate(canvas, 700, draw); else draw(1);

      canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left - cx, my = e.clientY - rect.top - cy;
        const dist = Math.sqrt(mx*mx+my*my);
        let idx = -1;
        if(dist >= rInner && dist <= r+6){
          let ang = Math.atan2(my, mx);
          if(ang < -Math.PI/2) ang += Math.PI*2;
          segments.forEach((s,i)=>{ if(ang >= s._start && ang <= s._end) idx = i; });
        }
        if(idx !== canvas._hoverIdx){
          canvas._hoverIdx = idx;
          draw(1);
        }
        if(idx >= 0){
          const s = segments[idx];
          const pct = Math.round(s.value/total*100);
          showTooltip(e.clientX, e.clientY, `<b>${s.label}</b><br>${fmtCompact(s.value)} (${pct}%)`);
        } else hideTooltip();
      };
      canvas.onmouseleave = () => { canvas._hoverIdx = -1; draw(1); hideTooltip(); };

      if(legendEl){
        legendEl.innerHTML = segments.map((s,i)=>`
          <div class="chart-legend-item" data-idx="${i}">
            <span class="chart-legend-dot" style="background:${s.color}"></span>
            <span class="chart-legend-label">${s.label}</span>
            <span class="chart-legend-value">${Math.round(s.value/total*100)}%</span>
          </div>`).join('');
        legendEl.querySelectorAll('.chart-legend-item').forEach(item=>{
          item.onmouseenter = () => { canvas._hoverIdx = Number(item.dataset.idx); canvas._render(1); };
          item.onmouseleave = () => { canvas._hoverIdx = -1; canvas._render(1); };
        });
      }
    }

    watchResize(canvas, () => render(false));
    render(true);
  }

  /* ================= BARRES (verticales ou horizontales) ================= */
  function bars(canvasId, opts){
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const labels = opts.labels || [];
    const values = opts.values || [];
    const color = opts.color || PALETTE.blue;
    const horizontal = !!opts.horizontal;
    const unit = opts.unit || '';
    const rowH = opts.rowHeight || 26;
    const heightOverride = horizontal ? Math.max(140, labels.length * rowH + 20) : null;

    function render(withAnim){
      const {ctx, w, h} = setupCanvas(canvas, heightOverride);
      const max = Math.max(...values, 1) * 1.15;

      function draw(progress){
        ctx.clearRect(0,0,w,h);
        ctx.font = '11px Inter, sans-serif';

        if(horizontal){
          const padL = 6, padR = 46, gap = 8;
          const bh = Math.min(16, rowH - gap);
          labels.forEach((lab,i)=>{
            const y = i*rowH + gap/2;
            const bw = (values[i]/max) * (w-padL-padR) * progress;
            // piste
            ctx.fillStyle = PALETTE.grid;
            roundRect(ctx, padL, y, w-padL-padR, bh, bh/2); ctx.fill();
            // barre
            const grad = ctx.createLinearGradient(padL,0,w-padR,0);
            grad.addColorStop(0, hexToRgba(color,.75));
            grad.addColorStop(1, color);
            ctx.fillStyle = canvas._hoverIdx===i ? color : grad;
            roundRect(ctx, padL, y, Math.max(bh, bw), bh, bh/2); ctx.fill();
            // libellé
            ctx.fillStyle = PALETTE.text;
            ctx.textBaseline = 'middle';
            ctx.fillText(lab, padL+8, y+bh/2);
            // valeur
            ctx.fillStyle = PALETTE.muted;
            ctx.textAlign = 'right';
            ctx.fillText(fmtCompact(values[i]), w-padR+40, y+bh/2);
            ctx.textAlign = 'left';
          });
        } else {
          const padL = 34, padR = 8, padT = 14, padB = 24, gap = 10;
          const plotW = w-padL-padR, plotH = h-padT-padB;
          const bw = (plotW/values.length) - gap;
          // grille
          ctx.strokeStyle = PALETTE.grid;
          ctx.fillStyle = PALETTE.muted;
          ctx.textBaseline = 'middle';
          for(let i=0;i<=3;i++){
            const gy = padT + plotH - (plotH/3)*i;
            ctx.beginPath(); ctx.moveTo(padL,gy); ctx.lineTo(w-padR,gy); ctx.stroke();
            ctx.fillText(fmtCompact(max/3*i), 0, gy);
          }
          values.forEach((v,i)=>{
            const x = padL + i*(bw+gap) + gap/2;
            const bh = (v/max)*plotH*progress;
            const y = padT+plotH-bh;
            const grad = ctx.createLinearGradient(0,y,0,padT+plotH);
            grad.addColorStop(0, color);
            grad.addColorStop(1, hexToRgba(color,.5));
            ctx.fillStyle = canvas._hoverIdx===i ? color : grad;
            roundRect(ctx, x, y, bw, Math.max(2,bh), [5,5,0,0]); ctx.fill();
            ctx.fillStyle = PALETTE.muted;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(labels[i], x+bw/2, h-8);
          });
          ctx.textAlign = 'left';
        }
      }

      canvas._render = draw;
      if(opts.animate !== false && withAnim !== false) animate(canvas, 700, draw); else draw(1);

      canvas.onmousemove = (e) => {
        const rect = canvas.getBoundingClientRect();
        let idx = -1;
        if(horizontal){
          const my = e.clientY - rect.top;
          idx = Math.floor(my/rowH);
          if(idx<0||idx>=labels.length) idx = -1;
        } else {
          const padL=34,padR=8,gap=10;
          const plotW = w-padL-padR;
          const bw = (plotW/values.length)-gap;
          const mx = e.clientX - rect.left;
          idx = Math.floor((mx-padL)/(bw+gap));
          if(idx<0||idx>=values.length) idx=-1;
        }
        if(idx !== canvas._hoverIdx){ canvas._hoverIdx = idx; canvas._render(1); }
        if(idx>=0) showTooltip(e.clientX, e.clientY, `<b>${labels[idx]}</b><br>${fmtCompact(values[idx])}${unit}`);
        else hideTooltip();
      };
      canvas.onmouseleave = () => { canvas._hoverIdx=-1; canvas._render(1); hideTooltip(); };
    }

    watchResize(canvas, () => render(false));
    render(true);
  }

  function roundRect(ctx, x, y, w, h, r){
    if(typeof r === 'number') r = [r,r,r,r];
    const [r1,r2,r3,r4] = r;
    ctx.beginPath();
    ctx.moveTo(x+r1, y);
    ctx.lineTo(x+w-r2, y);
    ctx.arcTo(x+w, y, x+w, y+r2, r2);
    ctx.lineTo(x+w, y+h-r3);
    ctx.arcTo(x+w, y+h, x+w-r3, y+h, r3);
    ctx.lineTo(x+r4, y+h);
    ctx.arcTo(x, y+h, x, y+h-r4, r4);
    ctx.lineTo(x, y+r1);
    ctx.arcTo(x, y, x+r1, y, r1);
    ctx.closePath();
  }

  /* ================= JAUGE EN ARC (taux %) ================= */
  function gauge(canvasId, opts){
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const percent = Math.max(0, Math.min(100, opts.percent||0));
    const color = opts.color || PALETTE.blue;
    const label = opts.label || '';

    function render(withAnim){
      const {ctx, w, h} = setupCanvas(canvas);
      const cx = w/2, cy = h - 22;
      const r = Math.max(20, Math.min(w/2 - 14, cy - 14));
      const start = Math.PI, full = Math.PI;
      const textY = cy - r*0.42;

      function draw(progress){
        ctx.clearRect(0,0,w,h);
        // piste
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.strokeStyle = PALETTE.grid;
        ctx.beginPath(); ctx.arc(cx, cy, r, start, start+full); ctx.stroke();
        // valeur
        const grad = ctx.createLinearGradient(cx-r, cy, cx+r, cy);
        grad.addColorStop(0, hexToRgba(color,.55));
        grad.addColorStop(1, color);
        ctx.strokeStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, r, start, start + full*(percent/100)*progress); ctx.stroke();

        ctx.textAlign = 'center';
        ctx.fillStyle = PALETTE.text;
        ctx.font = '800 24px Inter, sans-serif';
        ctx.fillText(Math.round(percent*progress)+'%', cx, textY);
        ctx.font = '700 10px Inter, sans-serif';
        ctx.fillStyle = PALETTE.muted;
        ctx.fillText(label, cx, textY+18);
        ctx.textAlign = 'left';
      }

      canvas._render = draw;
      if(opts.animate !== false && withAnim !== false) animate(canvas, 800, draw); else draw(1);
    }

    watchResize(canvas, () => render(false));
    render(true);
  }

  return {area, donut, bars, gauge, PALETTE};
})();
