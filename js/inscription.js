let currentDossierId = null;
let currentDossierTab = 'infos';
let nouvellePhotoDataUrl = '';
let modifPhotoDataUrl = '';

const DOC_TYPES = ["Acte de Naissance", "Bulletins Précédents", "Certificat Médical", "Photo d'Identité"];

let wizStep = 1;
let wizDocsStaged = {}; // { label: {filename, dataUrl} } — documents chargés avant la création de l'élève

document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('fClasse').innerHTML = DB.getClasses().map(c=>`<option>${c}</option>`).join('');
  document.getElementById('fAnneeScolaire').value = anneeScolaireCourante();
  document.getElementById('fDateInscription').value = new Date().toISOString().slice(0,10);
  renderWizDocTypes();

  document.querySelectorAll('#wizTabs .tab').forEach(t=>{
    t.addEventListener('click', ()=> goToWizStep(Number(t.dataset.step)));
  });

  const students = DB.get(DB.KEYS.students, []);
  const params = new URLSearchParams(location.search);
  currentDossierId = params.get('eleve') || (students[0] && students[0].id);
  renderDossier(currentDossierId);
});

function anneeScolaireCourante(){
  const now = new Date();
  const y = now.getFullYear();
  return now.getMonth() >= 7 ? `${y}-${y+1}` : `${y-1}-${y}`;
}

/* ============== ASSISTANT D'INSCRIPTION EN 4 ÉTAPES ============== */
function goToWizStep(step){
  if(step === wizStep) return;
  // On ne bloque pas la navigation libre entre onglets, sauf quitter l'étape 1
  // sans nom ni prénom renseignés (indispensables pour la suite du dossier).
  if(wizStep === 1 && step > 1){
    const nom = document.getElementById('fNom').value.trim();
    const prenom = document.getElementById('fPrenom').value.trim();
    if(!nom || !prenom){
      toast('⚠️ Veuillez renseigner au minimum le nom et le prénom avant de continuer.');
      return;
    }
  }
  wizStep = step;
  for(let i=1;i<=4;i++){
    document.getElementById('step'+i).style.display = (i===wizStep) ? '' : 'none';
  }
  document.querySelectorAll('#wizTabs .tab').forEach(t=>{
    t.classList.toggle('active', Number(t.dataset.step) === wizStep);
  });
}
function wizardSuivant(){ if(wizStep < 4) goToWizStep(wizStep + 1); }
function wizardPrecedent(){ if(wizStep > 1) goToWizStep(wizStep - 1); }

function resetWizard(){
  wizStep = 1;
  wizDocsStaged = {};
  goToWizStep(1);
  renderWizDocTypes();
}

/* ============== ÉTAPE 3 : DOCUMENTS (chargés avant création de l'élève) ============== */
function renderWizDocTypes(){
  const grid = document.getElementById('wizDocTypesGrid');
  if(!grid) return;
  grid.innerHTML = DOC_TYPES.map(label=>{
    const doc = wizDocsStaged[label];
    return `<div class="small">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-scroll-text-icon lucide-scroll-text"><path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/></svg> ${label}<br>
      ${doc
        ? `<span class="link-btn" style="color:var(--green,#1a9e5c);">✔ ${doc.filename}</span> &nbsp;
           <button class="link-btn" style="color:var(--red);border:none;background:none;cursor:pointer;" onclick="retirerWizDoc('${label.replace(/'/g,"\\'")}')">Retirer</button>`
        : `<label class="link-btn" style="cursor:pointer;">⬆ Charger un fichier<input type="file" style="display:none;" onchange="chargerWizDoc(this,'${label.replace(/'/g,"\\'")}')"></label>`}
    </div>`;
  }).join('');
}

function chargerWizDoc(input, label){
  const file = input.files[0];
  if(!file) return;
  if(file.size > 2*1024*1024){ toast('⚠️ Fichier trop volumineux (max 2 Mo pour le stockage local)'); return; }
  const reader = new FileReader();
  reader.onload = function(e){
    wizDocsStaged[label] = {filename: file.name, dataUrl: e.target.result};
    renderWizDocTypes();
  };
  reader.readAsDataURL(file);
}
function retirerWizDoc(label){
  delete wizDocsStaged[label];
  renderWizDocTypes();
}

function genMatricule(){
  const year = new Date().getFullYear().toString().slice(-2);
  const num = 4800 + DB.get(DB.KEYS.students,[]).length + 1;
  document.getElementById('fMatricule').value = `${DB.matriculePrefix()}-${year}-${num}`;
}

function validerInscription(){
  const nom = document.getElementById('fNom').value.trim();
  const prenom = document.getElementById('fPrenom').value.trim();
  if(!nom || !prenom){
    toast('⚠️ Veuillez renseigner au minimum le nom et le prénom.');
    goToWizStep(1);
    return;
  }

  if(!document.getElementById('fMatricule').value) genMatricule();
  const id = document.getElementById('fMatricule').value;
  const classe = document.getElementById('fClasse').value;

  const students = DB.get(DB.KEYS.students, []);
  students.push({
    id, nom, prenom,
    postnom: document.getElementById('fPostnom').value,
    sexe: document.getElementById('fSexe').value,
    naissance: document.getElementById('fNaissance').value,
    lieuNaissance: document.getElementById('fLieu').value,
    nationalite: document.getElementById('fNationalite').value,
    classe, statut: 'Inscrit', photo: nouvellePhotoDataUrl, historique:[],
    pereNom: document.getElementById('fPereNom').value,
    pereTel: document.getElementById('fPereTel').value,
    mereNom: document.getElementById('fMereNom').value,
    mereTel: document.getElementById('fMereTel').value,
    tuteurNom: document.getElementById('fTuteurNom').value,
    tuteurTel: document.getElementById('fTuteurTel').value,
    adresse: document.getElementById('fAdresse').value,
    anneeScolaire: document.getElementById('fAnneeScolaire').value,
    dateInscription: document.getElementById('fDateInscription').value
  });
  DB.set(DB.KEYS.students, students);

  // Rattachement des documents chargés à l'étape 3 (le cas échéant)
  if(Object.keys(wizDocsStaged).length){
    const documents = DB.get(DB.KEYS.documents, []);
    Object.entries(wizDocsStaged).forEach(([label, doc])=>{
      documents.push({
        id: DB.uid('DOC'), eleveId: id,
        label, filename: doc.filename, dataUrl: doc.dataUrl,
        dateUpload: new Date().toISOString()
      });
    });
    DB.set(DB.KEYS.documents, documents);
  }

  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-round-icon lucide-user-round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>', `Inscription de ${nom} ${prenom} (${classe})`);
  toast('✔ Élève inscrit avec succès');
  currentDossierId = id;
  currentDossierTab = 'infos';
  renderDossier(id);

  ['fNom','fPostnom','fPrenom','fLieu','fPereNom','fPereTel','fMereNom','fMereTel','fTuteurNom','fTuteurTel','fAdresse'].forEach(f=>document.getElementById(f).value='');
  document.getElementById('fMatricule').value='';
  document.getElementById('fDateInscription').value = new Date().toISOString().slice(0,10);
  retirerNouvellePhoto();
  resetWizard();
}

/* ============== PHOTO DE L'ÉLÈVE (nouvelle inscription) ============== */
function choisirNouvellePhoto(input){
  const file = input.files[0];
  if(!file) return;
  DB.readImageAsDataURL(file, 240, 0.82).then(dataUrl => {
    nouvellePhotoDataUrl = dataUrl;
    document.getElementById('newPhotoInner').innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;display:block;">`;
    document.getElementById('newPhotoRemove').style.display = 'flex';
  }).catch(err => toast('⚠ ' + err.message));
}
function retirerNouvellePhoto(e){
  if(e) e.stopPropagation();
  nouvellePhotoDataUrl = '';
  document.getElementById('newPhotoInner').textContent = '';
  document.getElementById('newPhotoRemove').style.display = 'none';
  const input = document.querySelector('#newPhotoBox input[type=file]');
  if(input) input.value = '';
}

function searchEleve(q){
  const students = DB.get(DB.KEYS.students, []);
  q = q.trim().toLowerCase();
  if(!q) return;
  const found = students.find(s => (s.nom+' '+s.prenom+' '+s.id).toLowerCase().includes(q));
  if(found){ currentDossierId = found.id; currentDossierTab = 'infos'; renderDossier(found.id); }
}

function imprimerFicheEleve(){
  if(!currentDossierId){ toast('⚠ Sélectionnez un élève'); return; }
  window.open('fiche-eleve.html?eleve=' + currentDossierId, '_blank');
}

function genererCertificat(){
  if(!currentDossierId){ toast('⚠ Sélectionnez un élève'); return; }
  window.open('certificat.html?eleve=' + currentDossierId, '_blank');
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-save-icon lucide-save"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>', `Génération du certificat de scolarité pour ${currentDossierId}`);
}

/* ============== DOSSIER : coquille + onglets ============== */
function renderDossier(id){
  const students = DB.get(DB.KEYS.students, []);
  const el = students.find(s=>s.id===id);
  const card = document.getElementById('dossierCard');
  if(!el){ card.innerHTML = '<div class="empty-state">Aucun élève trouvé</div>'; return; }

  const tabs = [
    {key:'infos', label:'Informations Générales'},
    {key:'historique', label:'Historique Scolaire'},
    {key:'finance', label:'Finance'},
    {key:'documents', label:'Documents Numérisés'},
    {key:'notifications', label:'Notifications'}
  ];

  card.innerHTML = `
    <div class="flex-between mb-16">
      <div class="flex gap-12" style="align-items:center;">
        ${DB.avatarHTML(el.photo, 64, '10px', 26)}
        <div>
          <div style="font-weight:800;font-size:16px;">Dossier Complet: ${el.prenom} ${el.nom} (${el.id})</div>
          <div class="small text-muted">${el.classe} — <span class="badge badge-green">${el.statut}</span></div>
        </div>
      </div>
      <div class="flex gap-8">
        <button class="btn btn-outline btn-sm" onclick="imprimerFicheEleve()"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text-icon lucide-file-text"><path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg> Imprimer Fiche Élève</button>
        <button class="btn btn-dark btn-sm" onclick="genererCertificat()"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-save-icon lucide-save"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Générer Certificat de Scolarité</button>
        <button class="btn btn-outline btn-sm" onclick="openEditEleve()"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg> Modifier</button>
        <button class="btn btn-danger btn-sm" onclick="supprimerEleve()"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Supprimer</button>
      </div>
    </div>

    <div class="tabs" id="dossierTabs">
      ${tabs.map(t=>`<div class="tab ${currentDossierTab===t.key?'active':''}" data-key="${t.key}">${t.label}</div>`).join('')}
    </div>

    <div id="dossierTabContent"></div>
  `;

  document.querySelectorAll('#dossierTabs .tab').forEach(t=>{
    t.addEventListener('click', ()=>{
      currentDossierTab = t.dataset.key;
      renderDossier(id);
    });
  });

  renderDossierTabContent(el);
}

function renderDossierTabContent(el){
  const container = document.getElementById('dossierTabContent');

  if(currentDossierTab === 'infos'){
    container.innerHTML = `
      <div class="form-row">
        <div>
          <p class="small"><b>Nom</b><br>${el.nom}</p>
          <p class="small"><b>Postnom</b><br>${el.postnom || '-'}</p>
          <p class="small"><b>Sexe</b><br>${el.sexe==='M'?'Masculin':'Féminin'}</p>
          <p class="small"><b>Date de Naissance</b><br>${el.naissance||'-'}</p>
        </div>
        <div>
          <p class="small"><b>Prénom</b><br>${el.prenom}</p>
          <p class="small"><b>Lieu de Naissance</b><br>${el.lieuNaissance||'-'}</p>
          <p class="small"><b>Nationalité</b><br>${el.nationalite||'-'}</p>
          <p class="small"><b>Classe</b><br>${el.classe}</p>
        </div>
      </div>
      ${(el.pereNom || el.mereNom || el.tuteurNom || el.adresse) ? `
      <div class="section-title mt-16">Parents / Tuteur</div>
      <div class="form-row">
        <div>
          <p class="small"><b>Père</b><br>${el.pereNom || '-'}${el.pereTel ? ' — ' + el.pereTel : ''}</p>
          <p class="small"><b>Mère</b><br>${el.mereNom || '-'}${el.mereTel ? ' — ' + el.mereTel : ''}</p>
        </div>
        <div>
          <p class="small"><b>Tuteur</b><br>${el.tuteurNom || '-'}${el.tuteurTel ? ' — ' + el.tuteurTel : ''}</p>
          <p class="small"><b>Adresse</b><br>${el.adresse || '-'}</p>
        </div>
      </div>` : ''}`;
    return;
  }

  if(currentDossierTab === 'historique'){
    const histo = el.historique && el.historique.length ? el.historique : [{annee:'2025-2026', classe:el.classe, moyenne:null, decision:'En cours'}];
    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Année</th><th>Classe</th><th>Moyenne</th><th>Décision</th></tr></thead>
          <tbody>
            ${histo.slice().reverse().map(h=>`<tr><td>${h.annee}</td><td>${h.classe}</td><td>${h.moyenne!=null?h.moyenne.toFixed(2):'--'}</td><td>${h.decision}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <a class="link-btn" href="parcours.html?eleve=${el.id}">Voir le parcours scolaire complet →</a>`;
    return;
  }

  if(currentDossierTab === 'finance'){
    const echeances = DB.get(DB.KEYS.echeances, []).filter(e=>e.eleveId===el.id);
    const payments = DB.get(DB.KEYS.payments, []).filter(p=>p.eleveId===el.id);
    const ps = DB.paymentStatus(el.id);
    const statusLabel = {paye:['✔ À jour','badge-green'], acompte:['◐ Acompte','badge-orange'], nonpaye:['✕ Non Payé','badge-red']};
    const [label, cls] = statusLabel[ps.status];

    container.innerHTML = `
      <div class="flex-between mb-16">
        <span class="badge ${cls}">${label}</span>
        <span class="small">Total dû : <b style="color:${ps.totalDu>0?'var(--red)':'inherit'};">${DB.fmtFCFA(ps.totalDu)}</b></span>
        <a class="btn btn-primary btn-sm" href="paiements.html?eleve=${el.id}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-banknote-arrow-down-icon lucide-banknote-arrow-down"><path d="M12 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5"/><path d="m16 19 3 3 3-3"/><path d="M18 12h.01"/><path d="M19 16v6"/><path d="M6 12h.01"/><circle cx="12" cy="12" r="2"/></svg> Encaisser</a>
      </div>

      <div class="section-title">Échéances</div>
      <div class="table-wrap mb-16">
        <table>
          <thead><tr><th>Type</th><th>Mois</th><th>Échéance</th><th>Payé</th><th>Reste Dû</th><th>Statut</th></tr></thead>
          <tbody>
            ${echeances.length ? echeances.map(e=>`<tr><td>${e.type}</td><td>${e.mois||'-'}</td><td>${e.dateEcheance||'-'}</td><td>${DB.fmtFCFA(e.montantPaye)}</td><td style="${e.montantDu>0?'color:var(--red);font-weight:700;':''}">${DB.fmtFCFA(e.montantDu)}</td><td><span class="badge ${e.montantDu<=0?'badge-green':'badge-orange'}">${e.montantDu<=0?'Soldée':'Ouverte'}</span></td></tr>`).join('') : '<tr><td colspan="6" class="empty-state">Aucune échéance enregistrée</td></tr>'}
          </tbody>
        </table>
      </div>

      <div class="section-title">Historique des Paiements</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Détail</th><th>Mois Payé(s)</th><th>Montant Payé</th><th>Mode</th><th>Reçu</th></tr></thead>
          <tbody>
            ${payments.length ? payments.slice().reverse().map(p=>{
              const moisListe = (p.items||[]).flatMap(it=>it.mois||[]);
              const moisUniques = [...new Set(moisListe)];
              const moisTxt = moisUniques.length ? moisUniques.map(m=>DB.fmtMois(m)).join(', ') : '-';
              return `<tr><td>${p.date}</td><td>${p.type}</td><td>${moisTxt}</td><td style="font-weight:700;">${DB.fmtFCFA(p.montantPaye)}</td><td>${p.mode||'-'}</td><td><a class="link-btn" href="recu.html?payment=${p.id}" target="_blank"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-save-icon lucide-save"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Voir</a></td></tr>`;
            }).join('') : '<tr><td colspan="6" class="empty-state">Aucun paiement enregistré</td></tr>'}
          </tbody>
        </table>
      </div>`;
    return;
  }

  if(currentDossierTab === 'documents'){
    const documents = DB.get(DB.KEYS.documents, []).filter(d=>d.eleveId===el.id);
    container.innerHTML = `
      <div class="grid grid-2-eq mb-16" id="docTypesGrid">
        ${DOC_TYPES.map(label=>{
          const doc = documents.find(d=>d.label===label);
          return `<div class="small">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-scroll-text-icon lucide-scroll-text"><path d="M15 12h-5"/><path d="M15 8h-5"/><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/></svg> ${label}<br>
            ${doc
              ? `<a class="link-btn" href="${doc.dataUrl}" download="${doc.filename}">⬇ Télécharger (${doc.filename})</a> &nbsp;
                 <button class="link-btn" style="color:var(--red);border:none;background:none;cursor:pointer;" onclick="supprimerDocument('${doc.id}')">Supprimer</button>`
              : `<label class="link-btn" style="cursor:pointer;">⬆ Charger un fichier<input type="file" style="display:none;" onchange="uploaderDocument(this,'${label.replace(/'/g,"\\'")}')"></label>`}
          </div>`;
        }).join('')}
      </div>

      <div class="section-title">Autres Pièces</div>
      <div id="autresDocs">
        ${documents.filter(d=>!DOC_TYPES.includes(d.label)).map(d=>`
          <div class="flex-between small" style="padding:6px 0;border-bottom:1px solid var(--border);">
            <span>📎 ${d.label} (${d.filename})</span>
            <span><a class="link-btn" href="${d.dataUrl}" download="${d.filename}">⬇ Télécharger</a> &nbsp;
            <button class="link-btn" style="color:var(--red);border:none;background:none;cursor:pointer;" onclick="supprimerDocument('${d.id}')">Supprimer</button></span>
          </div>`).join('') || ''}
      </div>
      <label class="link-btn" style="display:block;border:1px dashed var(--border);border-radius:8px;padding:16px;text-align:center;cursor:pointer;margin-top:10px;">
        ⬆ Uploadez nouveaux document...
        <input type="file" style="display:none;" onchange="uploaderDocument(this, null)">
      </label>`;
    return;
  }

  if(currentDossierTab === 'notifications'){
    const activities = DB.get(DB.KEYS.activities, []).filter(a => a.text.includes(el.prenom) && a.text.includes(el.nom));
    container.innerHTML = activities.length ? activities.map(a=>`
      <div class="activity-item"><div class="activity-ico">${a.icon}</div>
        <div><div class="activity-text">${a.text}</div><div class="activity-time">${DB.timeAgo(a.time)}</div></div>
      </div>`).join('') : '<div class="empty-state">Aucune notification pour cet élève</div>';
    return;
  }
}

function uploaderDocument(input, label){
  const file = input.files[0];
  if(!file) return;
  if(file.size > 2*1024*1024){ toast('⚠ Fichier trop volumineux (max 2 Mo pour le stockage local)'); return; }

  const reader = new FileReader();
  reader.onload = function(e){
    const documents = DB.get(DB.KEYS.documents, []);
    documents.push({
      id: DB.uid('DOC'), eleveId: currentDossierId,
      label: label || file.name, filename: file.name,
      dataUrl: e.target.result, dateUpload: new Date().toISOString()
    });
    DB.set(DB.KEYS.documents, documents);
    DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus-icon lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>', `Document "${label || file.name}" ajouté au dossier de ${currentDossierId}`);
    toast('✔ Document chargé');
    renderDossier(currentDossierId);
  };
  reader.readAsDataURL(file);
}

function supprimerDocument(docId){
  if(!confirm('Supprimer ce document ?')) return;
  let documents = DB.get(DB.KEYS.documents, []);
  documents = documents.filter(d=>d.id!==docId);
  DB.set(DB.KEYS.documents, documents);
  toast('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Document supprimé');
  renderDossier(currentDossierId);
}

/* ============== MODIFIER / SUPPRIMER UN ÉLÈVE ============== */
function openEditEleve(){
  const students = DB.get(DB.KEYS.students, []);
  const el = students.find(s=>s.id===currentDossierId);
  if(!el) return;

  document.getElementById('eNom').value = el.nom || '';
  document.getElementById('ePostnom').value = el.postnom || '';
  document.getElementById('ePrenom').value = el.prenom || '';
  document.getElementById('eSexe').value = el.sexe || 'M';
  document.getElementById('eNaissance').value = el.naissance || '';
  document.getElementById('eLieu').value = el.lieuNaissance || '';
  document.getElementById('eNationalite').value = el.nationalite || '';
  document.getElementById('eClasse').innerHTML = DB.getClasses().map(c=>`<option>${c}</option>`).join('');
  document.getElementById('eClasse').value = el.classe || '';
  document.getElementById('eStatut').value = el.statut || 'Inscrit';

  modifPhotoDataUrl = el.photo || '';
  document.getElementById('editPhotoInner').innerHTML = modifPhotoDataUrl
    ? `<img src="${modifPhotoDataUrl}" style="width:100%;height:100%;object-fit:cover;display:block;">` : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-round-icon lucide-user-round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>';
  document.getElementById('editPhotoRemove').style.display = modifPhotoDataUrl ? 'flex' : 'none';
  const fileInput = document.querySelector('#editPhotoBox input[type=file]');
  if(fileInput) fileInput.value = '';

  document.getElementById('editEleveModal').classList.add('open');
}

/* ============== PHOTO DE L'ÉLÈVE (modification) ============== */
function choisirModifPhoto(input){
  const file = input.files[0];
  if(!file) return;
  DB.readImageAsDataURL(file, 240, 0.82).then(dataUrl => {
    modifPhotoDataUrl = dataUrl;
    document.getElementById('editPhotoInner').innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;display:block;">`;
    document.getElementById('editPhotoRemove').style.display = 'flex';
  }).catch(err => toast('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> ' + err.message));
}
function retirerModifPhoto(e){
  if(e) e.stopPropagation();
  modifPhotoDataUrl = '';
  document.getElementById('editPhotoInner').textContent = '';
  document.getElementById('editPhotoRemove').style.display = 'none';
  const input = document.querySelector('#editPhotoBox input[type=file]');
  if(input) input.value = '';
}

function closeEditEleve(){
  document.getElementById('editEleveModal').classList.remove('open');
}

function enregistrerModifEleve(){
  const nom = document.getElementById('eNom').value.trim();
  const prenom = document.getElementById('ePrenom').value.trim();
  if(!nom || !prenom){ toast('⚠ Le nom et le prénom sont obligatoires'); return; }

  const students = DB.get(DB.KEYS.students, []);
  const idx = students.findIndex(s=>s.id===currentDossierId);
  if(idx === -1) return;

  const ancienneClasse = students[idx].classe;
  students[idx] = {
    ...students[idx],
    nom, prenom,
    postnom: document.getElementById('ePostnom').value,
    sexe: document.getElementById('eSexe').value,
    naissance: document.getElementById('eNaissance').value,
    lieuNaissance: document.getElementById('eLieu').value,
    nationalite: document.getElementById('eNationalite').value,
    classe: document.getElementById('eClasse').value,
    statut: document.getElementById('eStatut').value,
    photo: modifPhotoDataUrl
  };
  DB.set(DB.KEYS.students, students);

  const nouvelleClasse = students[idx].classe;
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>', `Modification du dossier de ${nom} ${prenom}${ancienneClasse!==nouvelleClasse ? ` (classe: ${ancienneClasse} → ${nouvelleClasse})` : ''}`);
  toast('✔ Élève modifié avec succès');
  closeEditEleve();
  renderDossier(currentDossierId);
}

function supprimerEleve(){
  const students = DB.get(DB.KEYS.students, []);
  const el = students.find(s=>s.id===currentDossierId);
  if(!el) return;

  const echeances = DB.get(DB.KEYS.echeances, []).filter(e=>e.eleveId===el.id);
  const payments = DB.get(DB.KEYS.payments, []).filter(p=>p.eleveId===el.id);
  const documents = DB.get(DB.KEYS.documents, []).filter(d=>d.eleveId===el.id);

  const confirmMsg = `Supprimer définitivement ${el.prenom} ${el.nom} (${el.id}) ?\n\n` +
    `Cela supprimera aussi : ${echeances.length} échéance(s), ${payments.length} paiement(s), ` +
    `${documents.length} document(s) et son bulletin de notes.\n\nCette action est irréversible.`;
  if(!confirm(confirmMsg)) return;

  DB.set(DB.KEYS.students, DB.get(DB.KEYS.students, []).filter(s=>s.id!==el.id));
  DB.set(DB.KEYS.echeances, DB.get(DB.KEYS.echeances, []).filter(e=>e.eleveId!==el.id));
  DB.set(DB.KEYS.payments, DB.get(DB.KEYS.payments, []).filter(p=>p.eleveId!==el.id));
  DB.set(DB.KEYS.documents, DB.get(DB.KEYS.documents, []).filter(d=>d.eleveId!==el.id));
  DB.set(DB.KEYS.notes, DB.get(DB.KEYS.notes, []).filter(n=>n.eleveId!==el.id));

  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>', `Suppression du dossier de ${el.prenom} ${el.nom} (${el.id})`);
  toast('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Élève et toutes ses données associées supprimés');

  const remaining = DB.get(DB.KEYS.students, []);
  currentDossierId = remaining[0] ? remaining[0].id : null;
  currentDossierTab = 'infos';
  if(currentDossierId){
    renderDossier(currentDossierId);
  } else {
    document.getElementById('dossierCard').innerHTML = '<div class="empty-state">Aucun élève enregistré</div>';
  }
}
