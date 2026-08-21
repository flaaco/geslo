/* ============================================================
   CEPEED — Couche de données (100% locale — localStorage)
   Aucun appel réseau. Toutes les données restent sur la machine.
   ============================================================ */

const DB = {
  CLASSES: ['Maternelle','CP1','CP2','CE1','CE2','CM1','CM2','6ème A','5ème A','5ème B','4ème','3ème'],
  KEYS:{
    students:'cepeed_students',
    payments:'cepeed_payments',
    fees:'cepeed_fees',
    activities:'cepeed_activities',
    staffAdmin:'cepeed_staff_admin',
    teachers:'cepeed_teachers',
    pointages:'cepeed_pointages',
    payroll:'cepeed_payroll',
    settings:'cepeed_settings',
    session:'cepeed_session',
    notes:'cepeed_notes',
    echeances:'cepeed_echeances',
    documents:'cepeed_documents',
    depenses:'cepeed_depenses',
    machineId:'cepeed_machine_id',
    license:'cepeed_license',
    accountCreated:'cepeed_account_created',
    classes:'cepeed_classes',
    caissiers:'cepeed_caissiers',
    cantineConso:'cepeed_cantine_conso',
    matieresClasse:'cepeed_matieres_classe',
    devoirNotes:'cepeed_devoir_notes'
  },
  CAISSIERS_DEFAUT: ['Marie','Alain','Sylvie'],

  get(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : (fallback !== undefined ? fallback : []);
    }catch(e){ return fallback !== undefined ? fallback : []; }
  },
  set(key, value){
    localStorage.setItem(key, JSON.stringify(value));
    // Signale le changement à la page courante (ex: le tableau de bord) pour
    // qu'elle puisse se mettre à jour en temps réel sans rechargement.
    window.dispatchEvent(new CustomEvent('cepeed:data-changed', {detail:{key}}));
    return value;
  },
  uid(prefix){
    return (prefix||'ID') + '-' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random()*90+10);
  },
  /* Préfixe de matricule dérivé du nom de l'établissement (ex: "GESLO SCHOOL" -> "geslo",
     "Flyer School" -> "flyer"). Utilisé pour TOUS les matricules générés : élèves,
     enseignants, personnel administratif, comptes utilisateurs, etc. Se met à jour
     automatiquement si le nom de l'établissement est modifié dans Paramètres — seuls les
     NOUVEAUX matricules créés après le changement adoptent le nouveau préfixe. */
  matriculePrefix(){
    const settings = DB.get(DB.KEYS.settings, {});
    const nom = (settings.etablissement || '').trim();
    const premierMot = nom.split(/\s+/)[0] || '';
    const propre = premierMot.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    return propre || 'ecole';
  },
  /* Identifiant unique et persistant de CETTE machine/navigateur (généré une seule fois).
     Sert à lier une clé de licence à un seul poste. */
  getMachineId(){
    let id = localStorage.getItem(DB.KEYS.machineId);
    if(!id){
      id = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : ('MID-' + Date.now() + '-' + Math.random().toString(36).slice(2));
      localStorage.setItem(DB.KEYS.machineId, id);
    }
    return id;
  },
  isLicensed(){
    return !!DB.get(DB.KEYS.license, null);
  },
  hasAccount(){
    return DB.get(DB.KEYS.accountCreated, false) === true;
  },
  fmtFCFA(n){
    n = Number(n)||0;
    return n.toLocaleString('fr-FR').replace(/,/g,' ') + ' FCFA';
  },
  /* Formate "2026-11" en "Novembre 2026" */
  fmtMois(mois){
    if(!mois) return '-';
    const [an, m] = mois.split('-');
    if(!an || !m) return mois;
    return new Date(Number(an), Number(m)-1, 1).toLocaleDateString('fr-FR', {month:'long', year:'numeric'});
  },
  /* Télécharge des données tabulaires sous forme d'un seul fichier CSV (compatible Excel) */
  csvEscape(v){
    v = String(v ?? '');
    return /[",;\n]/.test(v) ? '"' + v.replace(/"/g,'""') + '"' : v;
  },
  downloadCSV(filename, rows){
    const csv = rows.map(r => r.map(DB.csvEscape).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], {type:'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  },

  /* ---------------- PHOTO DE PROFIL ÉLÈVE (avatar) ----------------
     Tout est stocké en local (dataURL dans localStorage), donc on
     redimensionne/compresse systématiquement l'image choisie pour
     ne pas alourdir le stockage du navigateur. */
  readImageAsDataURL(file, maxDim, quality){
    maxDim = maxDim || 240; quality = quality || 0.82;
    return new Promise((resolve, reject) => {
      if(!file) { reject(new Error('Aucun fichier')); return; }
      if(!file.type || !file.type.startsWith('image/')){ reject(new Error('Le fichier choisi n\'est pas une image')); return; }
      if(file.size > 8*1024*1024){ reject(new Error('Image trop volumineuse (max 8 Mo)')); return; }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Image illisible'));
        img.onload = () => {
          // Recadrage carré centré (cover) puis redimensionnement à maxDim x maxDim
          const side = Math.min(img.width, img.height);
          const sx = (img.width - side) / 2, sy = (img.height - side) / 2;
          const canvas = document.createElement('canvas');
          canvas.width = maxDim; canvas.height = maxDim;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, sx, sy, side, side, 0, 0, maxDim, maxDim);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },
  /* Rendu HTML d'un avatar élève (photo réelle si disponible, silhouette sinon) —
     centralisé ici pour rester cohérent sur toutes les pages du logiciel. */
  avatarHTML(photo, size, radius, fontSize){
    size = size || 40; radius = radius != null ? radius : '10px'; fontSize = fontSize || Math.round(size*0.4);
    if(typeof radius === 'number') radius = radius + 'px';
    if(photo){
      return `<img src="${photo}" alt="Photo" style="width:${size}px;height:${size}px;border-radius:${radius};object-fit:cover;display:block;flex-shrink:0;">`;
    }
    return `<div style="width:${size}px;height:${size}px;border-radius:${radius};background:#dfe4f2;display:flex;align-items:center;justify-content:center;font-size:${fontSize}px;flex-shrink:0;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-round-icon lucide-user-round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg></div>`;
  },

  /* ---------------- LOGO DE L'ÉTABLISSEMENT ----------------
     Importé une seule fois dans Paramètres (settings.logo, en dataURL PNG pour
     préserver la transparence), puis réutilisé sur TOUS les documents imprimables
     (bulletin, reçu, certificat, fiche de paie, fiche élève, rapports). */
  readLogoAsDataURL(file, maxDim, quality){
    maxDim = maxDim || 300; quality = quality || 0.92;
    return new Promise((resolve, reject) => {
      if(!file){ reject(new Error('Aucun fichier')); return; }
      if(!file.type || !file.type.startsWith('image/')){ reject(new Error('Le fichier choisi n\'est pas une image')); return; }
      if(file.size > 8*1024*1024){ reject(new Error('Image trop volumineuse (max 8 Mo)')); return; }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Lecture du fichier impossible'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Image illisible'));
        img.onload = () => {
          // Redimensionne SANS recadrer (contrairement à l'avatar élève) pour ne
          // pas déformer ni couper un logo rectangulaire.
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/png', quality));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },
  /* Rendu HTML de l'écusson d'en-tête des documents : le logo importé par l'école
     s'il existe, sinon l'icône générique par défaut. Centralisé ici pour que TOUT
     document imprimable affiche automatiquement le bon logo. */
  docCrestHTML(settings){
    settings = settings || DB.get(DB.KEYS.settings, {});
    if(settings.logo){
      return `<div class="doc-crest has-logo"><img src="${settings.logo}" alt="Logo de l'établissement"></div>`;
    }
    return `<div class="doc-crest"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-graduation-cap-icon lucide-graduation-cap"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg></div>`;
  },

  /* ============== SONS D'ALERTE / NOTIFICATION (générés localement, sans fichier audio) ============== */
  _audioCtx: null,
  _getAudioCtx(){
    if(!DB._audioCtx){
      try{ DB._audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch(e){ return null; }
    }
    if(DB._audioCtx.state === 'suspended'){ DB._audioCtx.resume().catch(()=>{}); }
    return DB._audioCtx;
  },
  _sonsActifs(){
    const settings = DB.get(DB.KEYS.settings, {});
    return settings.sonsActifs !== false;
  },
  _tone(ctx, freq, startAt, duration, gain){
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, startAt);
    g.gain.linearRampToValueAtTime(gain, startAt + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(startAt); osc.stop(startAt + duration + 0.02);
  },
  /* Son d'ALERTE : deux tonalités descendantes, plus marquées (débiteurs, échéances en retard) */
  playAlertSound(){
    if(!DB._sonsActifs()) return;
    const ctx = DB._getAudioCtx();
    if(!ctx) return;
    try{
      const now = ctx.currentTime;
      DB._tone(ctx, 880, now, 0.16, 0.22);
      DB._tone(ctx, 622, now + 0.18, 0.20, 0.22);
    }catch(e){}
  },
  /* Son de NOTIFICATION : un seul bip court et doux (activité, paiement, document, etc.) */
  playNotificationSound(){
    if(!DB._sonsActifs()) return;
    const ctx = DB._getAudioCtx();
    if(!ctx) return;
    try{
      const now = ctx.currentTime;
      DB._tone(ctx, 1046, now, 0.14, 0.15);
    }catch(e){}
  },

  /* Solde de caisse réel = total encaissé (paiements élèves) - total décaissé (dépenses : paies, etc.) */
  soldeCaisse(){
    const recettes = DB.get(DB.KEYS.payments, []).reduce((s,p)=> s + (Number(p.montantPaye)||0), 0);
    const depenses = DB.get(DB.KEYS.depenses, []).reduce((s,d)=> s + (Number(d.montant)||0), 0);
    return recettes - depenses;
  },
  /* Regroupe les ENCAISSEMENTS (tout l'argent qui rentre — paiements élèves) par type de
     frais sur une période donnée (dateDebut/dateFin au format 'AAAA-MM-JJ', inclusifs).
     S'appuie sur "items" de chaque paiement (un même paiement peut couvrir plusieurs types
     à la fois, ex: Scolarité + Cantine réglés en une seule transaction), afin que le total
     "Scolarité du jour" ou "Inscription du mois" soit exact même dans ce cas. */
  encaissementsParType(dateDebut, dateFin){
    const payments = DB.get(DB.KEYS.payments, []).filter(p=>{
      const d = (p.date||'').slice(0,10);
      return (!dateDebut || d >= dateDebut) && (!dateFin || d <= dateFin);
    });
    const parType = {}, parMode = {};
    let total = 0;
    payments.forEach(p=>{
      const mode = p.mode || 'Non précisé';
      parMode[mode] = (parMode[mode]||0) + (Number(p.montantPaye)||0);
      const items = (p.items && p.items.length) ? p.items : [{type:p.type||'Divers', montant:p.montantPaye}];
      items.forEach(it=>{
        const type = it.type || 'Divers';
        if(!parType[type]) parType[type] = {montant:0, nb:0};
        parType[type].montant += Number(it.montant)||0;
        parType[type].nb += 1;
      });
      total += Number(p.montantPaye)||0;
    });
    const lignes = Object.entries(parType).map(([type,v])=>({type, montant:v.montant, nb:v.nb})).sort((a,b)=>b.montant-a.montant);
    const modes = Object.entries(parMode).map(([mode,montant])=>({mode, montant})).sort((a,b)=>b.montant-a.montant);
    return {lignes, modes, total, nbPaiements: payments.length};
  },
  /* Enregistre une sortie de caisse (dépense) et journalise l'activité correspondante */
  enregistrerDepense({categorie, libelle, montant, reference}){
    const depenses = DB.get(DB.KEYS.depenses, []);
    const dep = {
      id: DB.uid('DEP'), categorie, libelle, montant: Math.round(Number(montant)||0),
      reference: reference || '', date: new Date().toISOString().slice(0,10)
    };
    depenses.push(dep);
    DB.set(DB.KEYS.depenses, depenses);
    return dep;
  },

  /* ---------------- CANTINE DU PERSONNEL (montant libre, pas de tarif fixe) ----------------
     Un enseignant ou un membre du personnel administratif peut manger à la cantine —
     certains tous les jours, d'autres jamais — pour un montant qui varie à chaque fois.
     Chaque repas est enregistré individuellement, puis vient en déduction de ce qui lui
     est dû (heures pointées pour un enseignant, salaire fixe pour un administratif) au
     moment de la génération de la paie du mois. */
  enregistrerConsommationCantine({personId, personType, nom, montant, description, date}){
    const conso = DB.get(DB.KEYS.cantineConso, []);
    const rec = {
      id: DB.uid('CANT'), personId, personType, nom,
      montant: Math.round(Number(montant)||0),
      description: (description || 'Repas').trim(),
      date: date || new Date().toISOString().slice(0,10), horodatage: new Date().toISOString()
    };
    conso.push(rec);
    DB.set(DB.KEYS.cantineConso, conso);
    return rec;
  },
  /* Total consommé par une personne sur un mois donné ('AAAA-MM'), ou sur tout l'historique
     si mois est omis. */
  totalConsommationCantine(personId, mois){
    return DB.get(DB.KEYS.cantineConso, [])
      .filter(c => c.personId === personId && (!mois || c.date.startsWith(mois)))
      .reduce((s,c)=> s + Number(c.montant||0), 0);
  },
  /* Ce qui est dû à un membre du personnel pour un mois donné, AVANT déduction de la
     cantine : basé sur le pointage d'heures pour un enseignant, ou le salaire fixe pour
     un membre du personnel administratif. */
  duPersonnelAvantCantine(person, personType, mois){
    if(personType === 'enseignant'){
      const heures = DB.get(DB.KEYS.pointages, [])
        .filter(p=>p.profId===person.id && p.date.startsWith(mois))
        .reduce((s,p)=>s+p.heures,0);
      return {heures, montant: Math.round(heures * (person.tauxHoraire||0))};
    }
    return {heures:null, montant: Number(person.salaireFixe||0)};
  },

  /* ---------------- MATIÈRES & COEFFICIENTS PAR CLASSE (Notes du DE) ----------------
     Chaque classe a sa propre liste de matières, chacune avec un coefficient — modifiable
     librement par le Directeur des Études (DE), sans toucher au code. */
  matieresDeClasse(classe){
    const table = DB.get(DB.KEYS.matieresClasse, {});
    return table[classe] || [];
  },
  ajouterMatiereClasse(classe, nom, coefficient){
    nom = (nom||'').trim();
    if(!nom) return {success:false, message:'Nom de matière vide'};
    const table = DB.get(DB.KEYS.matieresClasse, {});
    if(!table[classe]) table[classe] = [];
    if(table[classe].some(m=>m.nom.toLowerCase()===nom.toLowerCase())){
      return {success:false, message:'Cette matière existe déjà dans cette classe'};
    }
    table[classe].push({id: DB.uid('MAT'), nom, coefficient: Math.max(1, Number(coefficient)||1)});
    DB.set(DB.KEYS.matieresClasse, table);
    return {success:true};
  },
  modifierCoefficientMatiere(classe, matiereId, coefficient){
    const table = DB.get(DB.KEYS.matieresClasse, {});
    const m = (table[classe]||[]).find(x=>x.id===matiereId);
    if(m){ m.coefficient = Math.max(1, Number(coefficient)||1); DB.set(DB.KEYS.matieresClasse, table); }
  },
  supprimerMatiereClasse(classe, matiereId){
    const table = DB.get(DB.KEYS.matieresClasse, {});
    table[classe] = (table[classe]||[]).filter(m=>m.id!==matiereId);
    DB.set(DB.KEYS.matieresClasse, table);
    // Les notes déjà saisies pour cette matière restent en base (historique) mais ne
    // compteront plus dans la moyenne générale puisque la matière n'existe plus pour la classe.
  },

  /* ---------------- NOTES DE DEVOIRS (Devoir de Classe / Devoir de Département / Composition) ----------------
     Chaque enregistrement correspond à UN devoir précis (matière + type + date) pour UN
     élève. La moyenne d'une matière pour un élève = moyenne de TOUS ses devoirs dans cette
     matière (peu importe le type), donc automatiquement divisée par le nombre de devoirs
     déjà faits. La moyenne générale = moyenne des moyennes de matières, PONDÉRÉE par le
     coefficient de chaque matière — seules les matières où l'élève a déjà au moins un
     devoir noté entrent dans le calcul. */
  enregistrerNoteDevoir({eleveId, classe, matiereId, matiereNom, type, date, note, bareme, trimestre}){
    const notes = DB.get(DB.KEYS.devoirNotes, []);
    trimestre = trimestre || DB.TRIMESTRES[0];
    // upsert : ressaisir le même devoir (élève + matière + type + date + trimestre) met à
    // jour la note existante au lieu de la dupliquer.
    const idx = notes.findIndex(n => n.eleveId===eleveId && n.matiereId===matiereId && n.type===type && n.date===date && (n.trimestre||DB.TRIMESTRES[0])===trimestre);
    const rec = {
      id: idx>-1 ? notes[idx].id : DB.uid('DVR'),
      eleveId, classe, matiereId, matiere: matiereNom, type, date, trimestre,
      note: Math.max(0, Number(note)||0),
      bareme: Number(bareme)||20
    };
    if(idx>-1) notes[idx] = rec; else notes.push(rec);
    DB.set(DB.KEYS.devoirNotes, notes);
    return rec;
  },
  supprimerNoteDevoir(id){
    const notes = DB.get(DB.KEYS.devoirNotes, []).filter(n=>n.id!==id);
    DB.set(DB.KEYS.devoirNotes, notes);
  },
  /* Supprime TOUT un devoir (tous les élèves) — matière + type + date + trimestre d'une
     classe donnée. */
  supprimerDevoirEntier(classe, matiereId, type, date, trimestre){
    trimestre = trimestre || DB.TRIMESTRES[0];
    const notes = DB.get(DB.KEYS.devoirNotes, [])
      .filter(n => !(n.classe===classe && n.matiereId===matiereId && n.type===type && n.date===date && (n.trimestre||DB.TRIMESTRES[0])===trimestre));
    DB.set(DB.KEYS.devoirNotes, notes);
  },
  /* Moyenne d'un élève dans UNE matière POUR UN TRIMESTRE donné, ramenée sur 20 = moyenne
     de tous ses devoirs de ce trimestre dans cette matière (chacun ramené sur 20 selon son
     barème). Les anciennes notes sans trimestre enregistré comptent comme 1er Trimestre. */
  moyenneMatiereEleve(eleveId, matiereId, trimestre){
    trimestre = trimestre || DB.TRIMESTRES[0];
    const notes = DB.get(DB.KEYS.devoirNotes, [])
      .filter(n=>n.eleveId===eleveId && n.matiereId===matiereId && (n.trimestre||DB.TRIMESTRES[0])===trimestre);
    if(!notes.length) return null;
    const total = notes.reduce((s,n)=> s + (n.note / (n.bareme||20)) * 20, 0);
    return {moyenne: total / notes.length, nbDevoirs: notes.length};
  },
  /* Détail de la moyenne d'une matière PAR TYPE de devoir (Devoir de Classe / Devoir de
     Département / Composition) pour un élève et un trimestre donné — utilisé pour afficher
     le détail dans le bulletin imprimable. Retourne {type: moyenne|null}. */
  moyennesParTypeMatiereEleve(eleveId, matiereId, trimestre){
    trimestre = trimestre || DB.TRIMESTRES[0];
    const notes = DB.get(DB.KEYS.devoirNotes, [])
      .filter(n=>n.eleveId===eleveId && n.matiereId===matiereId && (n.trimestre||DB.TRIMESTRES[0])===trimestre);
    const parType = {};
    DB.TYPES_DEVOIR.forEach(type=>{
      const notesType = notes.filter(n=>n.type===type);
      parType[type] = notesType.length
        ? notesType.reduce((s,n)=> s + (n.note/(n.bareme||20))*20, 0) / notesType.length
        : null;
    });
    return parType;
  },
  /* Moyenne générale d'un élève dans sa classe POUR UN TRIMESTRE donné = moyenne des
     moyennes de matières de ce trimestre, pondérée par les coefficients — seules les
     matières déjà notées ce trimestre comptent. */
  moyenneGeneraleEleve(eleveId, classe, trimestre){
    trimestre = trimestre || DB.TRIMESTRES[0];
    const matieres = DB.matieresDeClasse(classe);
    let sommePonderee = 0, sommeCoef = 0, nbMatieresNotees = 0;
    matieres.forEach(m=>{
      const r = DB.moyenneMatiereEleve(eleveId, m.id, trimestre);
      if(r){
        sommePonderee += r.moyenne * m.coefficient;
        sommeCoef += m.coefficient;
        nbMatieresNotees++;
      }
    });
    return {
      moyenne: sommeCoef ? (sommePonderee/sommeCoef) : null,
      nbMatieresNotees, nbMatieresTotal: matieres.length
    };
  },
  /* Classement complet d'une classe pour un trimestre donné : liste des élèves triés par
     moyenne générale décroissante, avec rang et effectif — utilisé par la liste de classe,
     l'écran de saisie du DE et les bulletins individuels, pour que le rang affiché soit
     TOUJOURS identique partout. */
  classementClasse(classe, trimestre){
    trimestre = trimestre || DB.TRIMESTRES[0];
    const eleves = DB.get(DB.KEYS.students, []).filter(s=>s.classe===classe)
      .sort((a,b)=> (a.nom+a.prenom).localeCompare(b.nom+b.prenom));
    const lignes = eleves.map(eleve=>{
      const g = DB.moyenneGeneraleEleve(eleve.id, classe, trimestre);
      return {eleve, moyenne: g.moyenne, nbMatieresNotees: g.nbMatieresNotees, nbMatieresTotal: g.nbMatieresTotal};
    });
    const classees = lignes.filter(l=>l.moyenne!==null).sort((a,b)=> b.moyenne - a.moyenne);
    const nonClassees = lignes.filter(l=>l.moyenne===null);
    const rangs = new Map();
    classees.forEach((l,i)=> rangs.set(l.eleve.id, i+1));
    const effectif = eleves.length;
    return [...classees, ...nonClassees].map(l=> ({...l, rang: rangs.get(l.eleve.id) || null, effectif}));
  },
  logActivity(icon, text){
    const acts = DB.get(DB.KEYS.activities, []);
    acts.unshift({id:DB.uid('ACT'), icon, text, time:new Date().toISOString()});
    DB.set(DB.KEYS.activities, acts.slice(0,40));
    DB.playNotificationSound();
  },
  codePaiement(){
    return Math.floor(1000+Math.random()*8999) + '-' + Math.floor(1000+Math.random()*8999);
  },
  /* Statut de paiement d'un élève, calculé à partir des ÉCHÉANCES (dûs mensuels/frais),
     et non plus des transactions — une échéance soldée disparaît définitivement des alertes.
     Seules les échéances déjà ÉCHUES (date d'échéance atteinte ou dépassée) comptent comme
     "dues" pour les alertes — les mois futurs (payables d'avance depuis Paiements) ne sont
     pas signalés en retard tant que leur échéance n'est pas encore arrivée.
     Retourne: {status:'paye'|'acompte'|'nonpaye', totalDu, moisRetard, records} */
  paymentStatus(eleveId){
    const today = new Date();
    const echeances = DB.get(DB.KEYS.echeances, []).filter(e=>e.eleveId===eleveId);
    const dueRecords = echeances.filter(e => (Number(e.montantDu)||0) > 0 && (!e.dateEcheance || new Date(e.dateEcheance) <= today));
    const totalDu = dueRecords.reduce((s,e)=> s + Number(e.montantDu||0), 0);

    let status = 'paye';
    if(dueRecords.length){
      const hasAcompte = dueRecords.some(e => Number(e.montantPaye||0) > 0 || e.statut === 'partiel');
      status = hasAcompte ? 'acompte' : 'nonpaye';
    }

    let moisRetard = 0;
    dueRecords.forEach(e=>{
      if(!e.dateEcheance) return;
      const ech = new Date(e.dateEcheance);
      if(ech < today){
        const m = (today.getFullYear()-ech.getFullYear())*12 + (today.getMonth()-ech.getMonth());
        if(m > moisRetard) moisRetard = m;
      }
    });

    return {status, totalDu, moisRetard, records: dueRecords};
  },
  /* Applique un paiement (montant) sur les échéances ouvertes d'un élève pour un type de frais donné.
     Règle: on solde d'abord les échéances les plus anciennes (mois le plus ancien) ; si le montant
     dépasse ce qui est dû, le surplus crée/alimente l'échéance du mois en cours (paiement d'avance).
     Permet de gérer "payer le mois complet", "payer la moitié" ou tout montant personnalisé. */
  appliquerPaiement(eleveId, type, montant){
    const echeances = DB.get(DB.KEYS.echeances, []);
    let ouvertes = echeances.filter(e=>e.eleveId===eleveId && e.type===type && e.montantDu>0)
      .sort((a,b)=> (a.mois||'').localeCompare(b.mois||''));

    let restant = Math.round(Number(montant)||0);
    const applied = [];

    ouvertes.forEach(e=>{
      if(restant<=0) return;
      const pay = Math.min(restant, e.montantDu);
      e.montantPaye = Math.round((Number(e.montantPaye)||0) + pay);
      e.montantDu = Math.max(0, Math.round(e.montantDu - pay));
      e.statut = e.montantDu<=0 ? 'paye' : 'partiel';
      restant -= pay;
      applied.push({echeanceId:e.id, montant:pay, resteApres:e.montantDu, mois:e.mois});
    });

    if(restant > 0){
      const students = DB.get(DB.KEYS.students, []);
      const el = students.find(s=>s.id===eleveId);
      const montantInitial = Math.max(DB.tarifFrais(type, el ? el.classe : null), restant);
      const mois = new Date().toISOString().slice(0,7);
      const today = new Date();
      const nouvelle = {
        id: DB.uid('ECH'), eleveId, type, mois,
        montantInitial, montantPaye: restant,
        montantDu: Math.max(0, montantInitial - restant),
        dateEcheance: mois + '-' + String(today.getDate()).padStart(2,'0'),
        statut: (montantInitial - restant) <= 0 ? 'paye' : 'partiel'
      };
      echeances.push(nouvelle);
      applied.push({echeanceId: nouvelle.id, montant:restant, resteApres:nouvelle.montantDu, mois:nouvelle.mois});
    }

    DB.set(DB.KEYS.echeances, echeances);
    return applied;
  },
  /* Tarif d'un type de frais POUR UNE CLASSE DONNÉE (chaque classe peut avoir son propre montant).
     Retombe sur le montant par défaut du frais si la classe n'a pas de tarif spécifique. */
  tarifFrais(type, classe){
    const fee = DB.get(DB.KEYS.fees, []).find(f=>f.type===type);
    if(!fee) return 0;
    if(classe && fee.tarifs && Object.prototype.hasOwnProperty.call(fee.tarifs, classe)){
      return Number(fee.tarifs[classe]) || 0;
    }
    return Number(fee.montantParDefaut ?? fee.montant ?? 0);
  },

  /* ---------------- GESTION DES CLASSES (100% manuel, sans toucher au code) ---------------- */
  getClasses(){
    return DB.get(DB.KEYS.classes, DB.CLASSES.slice());
  },
  ajouterClasse(nom){
    nom = (nom||'').trim();
    if(!nom) return {success:false, message:'Nom de classe vide'};
    const classes = DB.getClasses();
    if(classes.includes(nom)) return {success:false, message:'Cette classe existe déjà'};
    classes.push(nom);
    DB.set(DB.KEYS.classes, classes);

    // Ajoute un tarif pour cette nouvelle classe sur chaque frais existant (= son montant par défaut)
    const fees = DB.get(DB.KEYS.fees, []);
    fees.forEach(f=>{
      if(!f.tarifs) f.tarifs = {};
      f.tarifs[nom] = Number(f.montantParDefaut ?? f.montant ?? 0);
    });
    DB.set(DB.KEYS.fees, fees);

    return {success:true};
  },
  renommerClasse(ancien, nouveau){
    ancien = (ancien||'').trim(); nouveau = (nouveau||'').trim();
    if(!nouveau) return {success:false, message:'Nouveau nom vide'};
    if(ancien === nouveau) return {success:true};
    const classes = DB.getClasses();
    if(!classes.includes(ancien)) return {success:false, message:'Classe introuvable'};
    if(classes.includes(nouveau)) return {success:false, message:'Une classe porte déjà ce nom'};

    DB.set(DB.KEYS.classes, classes.map(c => c===ancien ? nouveau : c));

    // Renomme la clé de tarif correspondante dans chaque frais
    const fees = DB.get(DB.KEYS.fees, []);
    fees.forEach(f=>{
      if(f.tarifs && Object.prototype.hasOwnProperty.call(f.tarifs, ancien)){
        f.tarifs[nouveau] = f.tarifs[ancien];
        delete f.tarifs[ancien];
      }
    });
    DB.set(DB.KEYS.fees, fees);

    // Met à jour tous les élèves actuellement dans cette classe
    const students = DB.get(DB.KEYS.students, []);
    let touched = 0;
    students.forEach(s=>{ if(s.classe === ancien){ s.classe = nouveau; touched++; } });
    if(touched) DB.set(DB.KEYS.students, students);

    return {success:true, elevesModifies: touched};
  },
  supprimerClasse(nom){
    const students = DB.get(DB.KEYS.students, []);
    const nbEleves = students.filter(s=>s.classe===nom).length;
    if(nbEleves > 0){
      return {success:false, message:`Impossible : ${nbEleves} élève(s) sont encore dans cette classe. Changez leur classe avant de la supprimer.`};
    }
    const classes = DB.getClasses().filter(c=>c!==nom);
    DB.set(DB.KEYS.classes, classes);

    const fees = DB.get(DB.KEYS.fees, []);
    fees.forEach(f=>{ if(f.tarifs) delete f.tarifs[nom]; });
    DB.set(DB.KEYS.fees, fees);

    return {success:true};
  },
  /* ---------------- GESTION DES CAISSIERS (liste modifiable depuis les Paramètres) ---------------- */
  getCaissiers(){
    return DB.get(DB.KEYS.caissiers, DB.CAISSIERS_DEFAUT.slice());
  },
  ajouterCaissier(nom){
    nom = (nom||'').trim();
    if(!nom) return {success:false, message:'Nom vide'};
    const caissiers = DB.getCaissiers();
    if(caissiers.some(c=>c.toLowerCase()===nom.toLowerCase())) return {success:false, message:'Ce caissier existe déjà'};
    caissiers.push(nom);
    DB.set(DB.KEYS.caissiers, caissiers);
    return {success:true};
  },
  supprimerCaissier(nom){
    const caissiers = DB.getCaissiers().filter(c=>c!==nom);
    DB.set(DB.KEYS.caissiers, caissiers);
    return {success:true};
  },

  /* Reste dû actuel pour un type de frais donné chez un élève (toutes échéances confondues) */
  resteDuPourType(eleveId, type){
    return DB.get(DB.KEYS.echeances, [])
      .filter(e=>e.eleveId===eleveId && e.type===type)
      .reduce((s,e)=> s + Number(e.montantDu||0), 0);
  },
  receiptNumber(){
    const payments = DB.get(DB.KEYS.payments, []);
    return (payments.filter(p=>p.numero).length + 1);
  },

  /* ---------------- MENSUALITÉS (Octobre → Juin, 9 mois) ----------------
     Les frais "mensuels" (ex: Scolarité, Cantine, Transport) se paient
     mois par mois. On matérialise une échéance par mois de l'année
     scolaire en cours pour chaque frais mensuel actif d'un élève, afin
     de pouvoir cocher précisément le(s) mois réglé(s) sur la page
     Paiements — plutôt que de tout imputer automatiquement au mois le
     plus ancien. */
  MOIS_SCOLAIRES: [10,11,12,1,2,3,4,5,6],
  NOMS_MOIS_COURT: {1:'Jan',2:'Fév',3:'Mar',4:'Avr',5:'Mai',6:'Juin',7:'Juil',8:'Août',9:'Sep',10:'Oct',11:'Nov',12:'Déc'},
  /* Convertit un numéro de mois (1-12) en clé "YYYY-MM" selon l'année scolaire
     configurée dans Paramètres (ex: "2025-2026" → Octobre=2025-10, Février=2026-02) */
  moisAnneeScolaire(numMois, anneeScolaire){
    anneeScolaire = anneeScolaire || DB.get(DB.KEYS.settings, {}).annee || '2025-2026';
    const parts = anneeScolaire.split('-').map(Number);
    const anneeDebut = parts[0] || new Date().getFullYear();
    const anneeFin = parts[1] || (anneeDebut+1);
    const an = numMois >= 10 ? anneeDebut : anneeFin;
    return an + '-' + String(numMois).padStart(2,'0');
  },
  /* Date d'échéance d'un mois de fréquentation donné ("YYYY-MM") : par tolérance,
     le frais du mois M n'est exigible qu'à partir du 2 du mois SUIVANT (l'élève
     fréquente librement tout le mois M ; l'alerte de retard n'apparaît qu'au
     changement de mois — ex: frais d'Octobre exigible à partir du 2 Novembre). */
  dateEcheanceMois(mois){
    const [an, m] = mois.split('-').map(Number);
    let anSuivant = an, moisSuivant = m + 1;
    if(moisSuivant > 12){ moisSuivant = 1; anSuivant = an + 1; }
    return anSuivant + '-' + String(moisSuivant).padStart(2,'0') + '-02';
  },
  /* Convertit la date d'inscription d'un élève ("YYYY-MM-DD") en clé "YYYY-MM" DANS
     le référentiel de l'année scolaire (Oct→Juin), pour la comparer aux mois générés.
     - Si le mois d'inscription fait partie de l'année scolaire (Oct→Juin), on le
       replace sur la bonne année calendaire de l'année scolaire CONFIGURÉE (et non
       l'année civile brute saisie dans le formulaire — évite tout décalage si
       l'année scolaire n'a pas encore été mise à jour dans les Paramètres).
     - Si l'inscription a lieu hors période scolaire (Juillet/Août/Septembre), c'est
       une pré-inscription pour la PROCHAINE rentrée : tous les mois (à partir
       d'Octobre) sont dus, rien n'est exclu.
     - Si la date est absente/invalide, comportement historique : dès Octobre. */
  moisScolaireInscription(dateInscription, anneeScolaire){
    if(dateInscription && /^\d{4}-\d{2}/.test(dateInscription)){
      const numMois = Number(dateInscription.slice(5,7));
      if(DB.MOIS_SCOLAIRES.includes(numMois)){
        return DB.moisAnneeScolaire(numMois, anneeScolaire);
      }
    }
    return DB.moisAnneeScolaire(DB.MOIS_SCOLAIRES[0], anneeScolaire);
  },
  /* Nettoie les échéances déjà créées (par une version antérieure du logiciel) pour des
     mois ANTÉRIEURS à la date d'inscription de l'élève. On ne supprime que les échéances
     jamais payées (montantPaye===0) — un mois déjà réglé n'est jamais touché. Idempotent,
     peut être rappelée sans risque à chaque chargement. */
  nettoyerEcheancesAvantInscription(){
    const students = DB.get(DB.KEYS.students, []);
    const settingsAnnee = DB.get(DB.KEYS.settings, {}).annee;
    const echeances = DB.get(DB.KEYS.echeances, []);
    const parEleve = {};
    students.forEach(s => { parEleve[s.id] = DB.moisScolaireInscription(s.dateInscription, settingsAnnee); });
    const filtered = echeances.filter(e=>{
      if(!e.mois || !(e.eleveId in parEleve)) return true; // frais non-mensuels ou élève inconnu : inchangé
      if(Number(e.montantPaye) > 0) return true; // jamais toucher un mois déjà réglé
      return e.mois >= parEleve[e.eleveId];
    });
    if(filtered.length !== echeances.length) DB.set(DB.KEYS.echeances, filtered);
  },
  /* Les types de frais marqués "mensuel" — anciens dossiers migrés automatiquement
     (Scolarité/Cantine/Transport mensuels par défaut, le reste reste annuel/unique) */
  migrerFraisMensuel(){
    const fees = DB.get(DB.KEYS.fees, []);
    let touched = false;
    const mensuelParDefaut = ['Scolarité','Cantine','Transport'];
    fees.forEach(f=>{
      if(typeof f.mensuel === 'undefined'){
        f.mensuel = mensuelParDefaut.includes(f.type);
        touched = true;
      }
    });
    if(touched) DB.set(DB.KEYS.fees, fees);
  },
  fraisMensuels(){
    return DB.get(DB.KEYS.fees, []).filter(f=>f.actif && f.mensuel);
  },
  /* Corrige les échéances mensuelles déjà créées par une version antérieure (qui
     fixait la date d'échéance au 5 du MÊME mois — trop tôt, l'élève étant encore en
     train de fréquenter ce mois-là) pour qu'elles utilisent désormais le 2 du mois
     SUIVANT. Idempotent : peut être rappelée sans risque à chaque chargement. */
  migrerDateEcheanceMensuelle(){
    const fees = DB.get(DB.KEYS.fees, []);
    const typesMensuels = new Set(fees.filter(f=>f.mensuel).map(f=>f.type));
    const echeances = DB.get(DB.KEYS.echeances, []);
    let touched = false;
    echeances.forEach(e=>{
      if(e.mois && typesMensuels.has(e.type)){
        const bonneDate = DB.dateEcheanceMois(e.mois);
        if(e.dateEcheance !== bonneDate){ e.dateEcheance = bonneDate; touched = true; }
      }
    });
    if(touched) DB.set(DB.KEYS.echeances, echeances);
  },
  /* Génère (si besoin) les échéances mensuelles Oct→Juin pour TOUS les élèves —
     appelé au chargement de chaque page afin que les alertes/soldes dus soient
     toujours exacts sur le Tableau de Bord, les Classes et les Échéances, même
     avant qu'un caissier n'ait ouvert la fiche de paiement de l'élève. */
  assurerEcheancesMensuellesTous(){
    DB.get(DB.KEYS.students, []).forEach(s => DB.assurerEcheancesMensuelles(s.id));
  },
  /* Garantit qu'une échéance existe pour chacun des mois de l'année scolaire à partir
     du mois d'INSCRIPTION de l'élève (jamais avant — un élève inscrit en Décembre ne
     doit pas se retrouver avec Octobre et Novembre déjà "en retard"), pour chaque frais
     mensuel actif. Ne recrée jamais une échéance déjà existante — n'écrase donc jamais
     un paiement déjà enregistré. */
  assurerEcheancesMensuelles(eleveId){
    const students = DB.get(DB.KEYS.students, []);
    const el = students.find(s=>s.id===eleveId);
    if(!el) return;
    const anneeScolaire = DB.get(DB.KEYS.settings, {}).annee;
    const moisInscription = DB.moisScolaireInscription(el.dateInscription, anneeScolaire);
    const echeances = DB.get(DB.KEYS.echeances, []);
    let touched = false;
    DB.fraisMensuels().forEach(f=>{
      const montant = DB.tarifFrais(f.type, el.classe);
      DB.MOIS_SCOLAIRES.forEach(numMois=>{
        const mois = DB.moisAnneeScolaire(numMois, anneeScolaire);
        if(mois < moisInscription) return; // mois antérieur à l'inscription : pas dû
        const existe = echeances.some(e=>e.eleveId===eleveId && e.type===f.type && e.mois===mois);
        if(!existe){
          echeances.push({
            id: DB.uid('ECH'), eleveId, type:f.type, mois,
            montantInitial: montant, montantPaye:0, montantDu: montant,
            dateEcheance: DB.dateEcheanceMois(mois), statut:'du'
          });
          touched = true;
        }
      });
    });
    if(touched) DB.set(DB.KEYS.echeances, echeances);
  },
  /* Applique un paiement (total ou acompte) sur UN mois précis d'un frais mensuel —
     utilisé par la grille de cases à cocher Oct→Juin de la page Paiements. */
  appliquerPaiementMois(eleveId, type, mois, montant){
    montant = Math.round(Number(montant)||0);
    if(montant<=0) return null;
    const echeances = DB.get(DB.KEYS.echeances, []);
    let e = echeances.find(x=>x.eleveId===eleveId && x.type===type && x.mois===mois);
    if(!e){
      const students = DB.get(DB.KEYS.students, []);
      const el = students.find(s=>s.id===eleveId);
      const montantInitial = DB.tarifFrais(type, el ? el.classe : null);
      e = {id: DB.uid('ECH'), eleveId, type, mois, montantInitial, montantPaye:0, montantDu: montantInitial, dateEcheance: DB.dateEcheanceMois(mois), statut:'du'};
      echeances.push(e);
    }
    e.montantPaye = Math.round((Number(e.montantPaye)||0) + montant);
    e.montantDu = Math.max(0, Math.round((Number(e.montantInitial)||0) - e.montantPaye));
    e.statut = e.montantDu<=0 ? 'paye' : 'partiel';
    DB.set(DB.KEYS.echeances, echeances);
    return {echeanceId:e.id, montant, resteApres:e.montantDu, mois};
  },
  /* Vue d'ensemble financière ANNUELLE d'un élève : total dû pour l'année,
     total déjà réglé, total restant, et détail des échéances mensuelles
     (pour la grille de cases à cocher) et des frais non-mensuels. */
  situationAnnuelle(eleveId){
    DB.assurerEcheancesMensuelles(eleveId);
    const echeances = DB.get(DB.KEYS.echeances, []).filter(e=>e.eleveId===eleveId);
    const totalAnnee = echeances.reduce((s,e)=> s + Number(e.montantInitial||0), 0);
    const totalRegle = echeances.reduce((s,e)=> s + Number(e.montantPaye||0), 0);
    const totalRestant = echeances.reduce((s,e)=> s + Number(e.montantDu||0), 0);

    const mensuels = {};
    DB.fraisMensuels().forEach(f=>{
      mensuels[f.type] = {};
      DB.MOIS_SCOLAIRES.forEach(numMois=>{
        const mois = DB.moisAnneeScolaire(numMois);
        mensuels[f.type][mois] = echeances.find(e=>e.type===f.type && e.mois===mois) || null;
      });
    });

    const typesNonMensuels = DB.get(DB.KEYS.fees, []).filter(f=>f.actif && !f.mensuel);

    return {totalAnnee, totalRegle, totalRestant, echeances, mensuels, typesNonMensuels};
  },
  timeAgo(iso){
    const diff = Math.floor((Date.now() - new Date(iso).getTime())/60000);
    if(diff < 1) return "à l'instant";
    if(diff < 60) return diff + ' min';
    const h = Math.floor(diff/60);
    if(h < 24) return h + ' h';
    return Math.floor(h/24) + ' j';
  },

  /* ---------------- SEED (première utilisation uniquement) ---------------- */
  seed(){
    if(!localStorage.getItem(DB.KEYS.classes)){
      DB.set(DB.KEYS.classes, DB.CLASSES.slice());
    }
    if(!localStorage.getItem(DB.KEYS.students)){
      DB.set(DB.KEYS.students, []);
    }
    if(!localStorage.getItem(DB.KEYS.fees)){
      // Pour chaque classe, un tarif par défaut identique au montant de base — modifiable
      // ensuite classe par classe dans Frais (ex: la Scolarité peut varier selon le niveau).
      const tarifsUniformes = (montant) => {
        const t = {}; DB.CLASSES.forEach(c => t[c] = montant); return t;
      };
      DB.set(DB.KEYS.fees, [
        {type:'Inscription', montantParDefaut:25000, actif:true, mensuel:false, tarifs: tarifsUniformes(25000)},
        {type:'Réinscription', montantParDefaut:20000, actif:true, mensuel:false, tarifs: tarifsUniformes(20000)},
        {type:'Scolarité', montantParDefaut:25000, actif:true, mensuel:true, tarifs: tarifsUniformes(25000)},
        {type:'Cantine', montantParDefaut:30000, actif:true, mensuel:true, tarifs: tarifsUniformes(30000)},
        {type:'Transport', montantParDefaut:20000, actif:true, mensuel:true, tarifs: tarifsUniformes(20000)},
        {type:'Rame Papier', montantParDefaut:5000, actif:true, mensuel:false, tarifs: tarifsUniformes(5000)},
        {type:'TD/TP', montantParDefaut:10000, actif:true, mensuel:false, tarifs: tarifsUniformes(10000)},
        {type:'Maillot Éco.', montantParDefaut:15000, actif:true, mensuel:false, tarifs: tarifsUniformes(15000)}
      ]);
    }
    if(!localStorage.getItem(DB.KEYS.payments)){
      DB.set(DB.KEYS.payments, []);
    }
    if(!localStorage.getItem(DB.KEYS.echeances)){
      DB.set(DB.KEYS.echeances, []);
    }
    if(!localStorage.getItem(DB.KEYS.documents)){
      DB.set(DB.KEYS.documents, []);
    }
    if(!localStorage.getItem(DB.KEYS.depenses)){
      DB.set(DB.KEYS.depenses, []);
    }
    if(!localStorage.getItem(DB.KEYS.activities)){
      DB.set(DB.KEYS.activities, []);
    }
    if(!localStorage.getItem(DB.KEYS.staffAdmin)){
      DB.set(DB.KEYS.staffAdmin, []);
    }
    if(!localStorage.getItem(DB.KEYS.teachers)){
      DB.set(DB.KEYS.teachers, []);
    }
    if(!localStorage.getItem(DB.KEYS.pointages)){
      DB.set(DB.KEYS.pointages, []);
    }
    if(!localStorage.getItem(DB.KEYS.payroll)){
      DB.set(DB.KEYS.payroll, []);
    }
    if(!localStorage.getItem(DB.KEYS.settings)){
      DB.set(DB.KEYS.settings, {
        etablissement:'',
        logo:'',
        annee:'2025-2026',
        modesPaiement:{especes:true, momo:true, orangeMoney:true, cheque:false, virement:true},
        seuilAlerteMin:1, seuilAlerteMax:500,
        sonsActifs:true,
        fraisActifs:{Inscription:true,Réinscription:true,Scolarité:true,Cantine:true,Transport:true,'Rame Papier':true,'TD/TP':true,'Maillot Éco.':true}
      });
    }
    if(!localStorage.getItem(DB.KEYS.session)){
      DB.set(DB.KEYS.session, {nom:'', matricule:'', role:'Comptable', email:''});
    }
    if(!localStorage.getItem(DB.KEYS.notes)){
      DB.set(DB.KEYS.notes, []);
    }
    if(!localStorage.getItem(DB.KEYS.cantineConso)){
      DB.set(DB.KEYS.cantineConso, []);
    }
    if(!localStorage.getItem(DB.KEYS.matieresClasse)){
      DB.set(DB.KEYS.matieresClasse, {});
    }
    if(!localStorage.getItem(DB.KEYS.devoirNotes)){
      DB.set(DB.KEYS.devoirNotes, []);
    }
  }
};

/* Structure des matières / domaines pour le bulletin (Humanités — RD Congo) */
DB.MATIERES = [
  {nom:'Algèbre, Stat, Et Analy.', domaine:'Domaine des sciences (Mathématiques)', max:80},
  {nom:'Géom, Et.Trig.', domaine:'Domaine des sciences (Mathématiques)', max:40},
  {nom:'Dessin scientifique', domaine:'Domaine des sciences (Mathématiques)', max:20},
  {nom:'Biologie générale', domaine:'Sous-domaine des sciences de la vie et de la terre', max:20},
  {nom:'Hygiène', domaine:'Sous-domaine des sciences de la vie et de la terre', max:20},
  {nom:'Chimie', domaine:'Sous-domaine des sciences Physique, Techn et TIC', max:60},
  {nom:'Physique', domaine:'Sous-domaine des sciences Physique, Techn et TIC', max:40},
  {nom:'Techn. d\'Info & Ordi TIC', domaine:'Sous-domaine des sciences Physique, Techn et TIC', max:20},
  {nom:'Anglais', domaine:'Domaine de la langue', max:60},
  {nom:'Français', domaine:'Domaine de la langue', max:80},
  {nom:'Éd. Civique et Morale', domaine:'Domaine de l\'univers social et environnemental', max:20},
  {nom:'Géographie', domaine:'Domaine de l\'univers social et environnemental', max:40},
  {nom:'Histoire', domaine:'Domaine de l\'univers social et environnemental', max:40},
  {nom:'Éducation à la vie', domaine:'Domaine de l\'univers social et environnemental', max:20},
  {nom:'Économie familiale', domaine:'Domaine de l\'univers social et environnemental', max:20},
  {nom:'Religion', domaine:'Domaine de l\'univers social et environnemental', max:40},
  {nom:'Éducation physique', domaine:'Domaine de développement personnel', max:20}
];

DB.seed();
DB.migrerFraisMensuel();
DB.migrerDateEcheanceMensuelle();
DB.nettoyerEcheancesAvantInscription();
DB.assurerEcheancesMensuellesTous();

/* Types de devoirs reconnus par le module Notes du DE (Directeur des Études) */
DB.TYPES_DEVOIR = ['Devoir de Classe', 'Devoir de Département', 'Composition'];

/* Trimestres reconnus par le module Notes du DE. Chaque devoir est rattaché à UN
   trimestre — les moyennes, classements et bulletins sont toujours calculés pour
   un trimestre donné (jamais mélangés entre trimestres). */
DB.TRIMESTRES = ['1er Trimestre', '2e Trimestre', '3e Trimestre'];

/* ---------------- CODE QR DE VÉRIFICATION (reçus & bulletins) ----------------
   Rendu SVG local (js/qrcode.js, sans dépendance réseau). Retourne une chaîne
   vide si la bibliothèque n'est pas chargée sur la page (elle n'est incluse
   que sur les documents imprimables concernés). */
DB.qrCodeSVG = function(text, cellSize){
  if(typeof QRCodeLib === 'undefined') return '';
  try{
    return QRCodeLib.makeSVG(String(text), {cellSize: cellSize||4, margin:(cellSize||4)*2, dark:'#14213d', light:'#ffffff', ec:'L'});
  }catch(e){ return ''; }
};
/* Construit le texte lisible encodé dans le QR d'un REÇU — affiché tel quel par
   n'importe quelle application de scan (pas besoin d'ouvrir CEPEED). L'entête
   utilise le nom réel de l'établissement (configuré dans Paramètres), car
   plusieurs écoles différentes utilisent ce logiciel. */
DB.qrRecuTexte = function(payment, el, sit, moisPayesTransaction){
  const settings = DB.get(DB.KEYS.settings, {});
  const nomEtablissement = (settings.etablissement || 'Établissement Scolaire').toUpperCase();
  const dt = payment.horodatage ? new Date(payment.horodatage) : new Date((payment.date||'') + 'T00:00:00');
  const dateTxt = dt.toLocaleDateString('fr-FR');
  const heureTxt = payment.horodatage ? dt.toLocaleTimeString('fr-FR') : '—';
  const lignes = [
    nomEtablissement,
    'REÇU DE PAIEMENT N°' + (payment.numero || '-'),
    'Code: ' + (payment.codePaiement || '-'),
    'Élève: ' + ((el && (el.prenom+' '+el.nom)) || payment.eleveId || '-'),
    'Classe: ' + ((el && el.classe) || '-'),
    'Matricule: ' + ((el && el.id) || payment.eleveId || '-'),
    'Mois réglé(s): ' + (moisPayesTransaction && moisPayesTransaction.length ? moisPayesTransaction.map(m=>DB.fmtMois(m)).join(', ') : 'Aucun (frais non-mensuel)'),
    'Montant payé: ' + DB.fmtFCFA(payment.montantPaye),
    'Mode de paiement: ' + (payment.mode || '-'),
    'Date: ' + dateTxt + '  Heure: ' + heureTxt,
    'Caissier: ' + (payment.caissier || '-'),
    'Reste dû (année scolaire): ' + DB.fmtFCFA(sit ? sit.totalRestant : 0)
  ];
  return lignes.join('\n');
};
/* Construit le texte lisible encodé dans le QR d'un BULLETIN. */
DB.qrBulletinTexte = function(rec, el, resume){
  const settings = DB.get(DB.KEYS.settings, {});
  const nomEtablissement = (settings.etablissement || 'Établissement Scolaire').toUpperCase();
  const lignes = [
    nomEtablissement,
    'BULLETIN SCOLAIRE',
    'Code: ' + (rec.qrCode || '-'),
    'Élève: ' + ((el && (el.prenom+' '+el.nom)) || rec.eleveId || '-'),
    'Classe: ' + ((el && el.classe) || '-'),
    'Matricule: ' + ((el && el.id) || rec.eleveId || '-'),
    'Année scolaire: ' + (rec.annee || '-'),
    'Période: ' + (resume && resume.periode || '-'),
    'Résultat: ' + (resume && resume.total || '-'),
    'Place: ' + ((rec.place || '-') + ' / ' + (rec.effectif || '-'))
  ];
  return lignes.join('\n');
};

/* Construit le texte lisible encodé dans le QR d'un BULLETIN DE NOTES DU DE (système
   devoirs/trimestres — distinct du bulletin semestriel classique). */
DB.qrBulletinDETexte = function(el, classe, trimestre, resume){
  const settings = DB.get(DB.KEYS.settings, {});
  const nomEtablissement = (settings.etablissement || 'Établissement Scolaire').toUpperCase();
  const lignes = [
    nomEtablissement,
    'BULLETIN DE NOTES',
    'Élève: ' + ((el && (el.prenom+' '+el.nom)) || '-'),
    'Matricule: ' + ((el && el.id) || '-'),
    'Classe: ' + (classe || '-'),
    'Année scolaire: ' + (settings.annee || '2025-2026'),
    'Période: ' + (trimestre || '-'),
    'Moyenne générale: ' + (resume && resume.moyenne || '-'),
    'Rang: ' + (resume && resume.rang || '-')
  ];
  return lignes.join('\n');
};

/* ============================================================
   VERROU DE LICENCE — s'applique à TOUTE page qui charge data.js.
   Sans clé de licence validée (en ligne, une seule fois) + compte créé,
   l'utilisateur est renvoyé vers l'écran d'activation.
   ============================================================ */
(function enforceLicenseGate(){
  const page = location.pathname.split('/').pop() || 'dashboard.html';
  const exempt = ['license.html', 'compte-creation.html'];
  if(exempt.includes(page)) return;
  if(!DB.isLicensed() || !DB.hasAccount()){
    location.href = 'license.html';
  }
})();
