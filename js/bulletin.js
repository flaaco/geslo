let currentEleveId = null;
let editMode = false;

document.addEventListener('DOMContentLoaded', ()=>{
  const students = DB.get(DB.KEYS.students, []);
  const sel = document.getElementById('eleveSelect');
  sel.innerHTML = students.map(s=>`<option value="${s.id}">${s.prenom} ${s.nom} (${s.id})</option>`).join('');

  const params = new URLSearchParams(location.search);
  const initial = params.get('eleve') || (students[0] && students[0].id);
  sel.value = initial;
  loadBulletin(initial);
});

function getOrCreateNotes(eleveId){
  const settings = DB.get(DB.KEYS.settings, {});
  const annee = settings.annee || '2025-2026';
  const notes = DB.get(DB.KEYS.notes, []);
  let rec = notes.find(n => n.eleveId===eleveId && n.annee===annee);
  if(!rec){
    rec = { eleveId, annee, qrCode: DB.uid('QRB'), matieres: DB.MATIERES.map(m => ({
      nom:m.nom, domaine:m.domaine, max:m.max, s1trav:0, s1exam:0, s2trav:0, s2exam:0
    }))};
    notes.push(rec);
    DB.set(DB.KEYS.notes, notes);
  }
  if(!rec.qrCode){ rec.qrCode = DB.uid('QRB'); persistCurrentNotes(rec); }
  return rec;
}

function persistCurrentNotes(rec){
  const notes = DB.get(DB.KEYS.notes, []);
  const idx = notes.findIndex(n=>n.eleveId===rec.eleveId && n.annee===rec.annee);
  if(idx>-1) notes[idx] = rec; else notes.push(rec);
  DB.set(DB.KEYS.notes, notes);
}

function loadBulletin(eleveId){
  currentEleveId = eleveId;
  getOrCreateNotes(eleveId);
  renderBulletin();
}

function toggleEditMode(){
  editMode = !editMode;
  document.getElementById('editModeBtn').classList.toggle('btn-primary', editMode);
  document.getElementById('editModeBtn').textContent = editMode ? '✔ Terminer l\'Édition' : 'Mode Édition';
  renderBulletin();
}

function renderBulletin(){
  const students = DB.get(DB.KEYS.students, []);
  const settings = DB.get(DB.KEYS.settings, {});
  const el = students.find(s=>s.id===currentEleveId);
  const rec = getOrCreateNotes(currentEleveId);
  const mode = document.getElementById('semestreSelect').value;
  const page = document.getElementById('bulletinPage');

  // group matières by domaine, preserving order
  const domaines = [];
  rec.matieres.forEach((m,i) => {
    let d = domaines.find(x=>x.nom===m.domaine);
    if(!d){ d = {nom:m.domaine, items:[]}; domaines.push(d); }
    d.items.push({...m, idx:i});
  });

  const colCount = (mode==='both' ? 9 : 6) + (editMode ? 1 : 0);
  let grandMax=0, grandS1=0, grandS2=0, grandTG=0;

  const domainBlocks = domaines.map(d => {
    let subMax=0, subS1=0, subS2=0, subTG=0;
    const rows = d.items.map(m => {
      const s1tot = Math.min(m.max, (Number(m.s1trav)||0) + (Number(m.s1exam)||0));
      const s2tot = Math.min(m.max, (Number(m.s2trav)||0) + (Number(m.s2exam)||0));
      const tg = s1tot + s2tot;
      subMax += Number(m.max)||0; subS1 += s1tot; subS2 += s2tot; subTG += tg;

      return `<tr>
        <td>${editMode
          ? `<input class="doc-input" style="width:150px;text-align:left;" value="${m.nom}" onchange="updateField(${m.idx},'nom',this.value)">`
          : m.nom}</td>
        <td class="num">${editMode
          ? `<input class="doc-input" style="width:44px;" type="number" min="1" value="${m.max}" onchange="updateField(${m.idx},'max',this.value)">`
          : m.max}</td>
        ${mode!=='2' ? `
        <td class="num"><input class="doc-input" type="number" min="0" max="${m.max}" value="${m.s1trav}" data-i="${m.idx}" data-f="s1trav" onchange="recalcLive()"></td>
        <td class="num"><input class="doc-input" type="number" min="0" max="${m.max}" value="${m.s1exam}" data-i="${m.idx}" data-f="s1exam" onchange="recalcLive()"></td>
        <td class="num" style="font-weight:700;">${s1tot}</td>` : ''}
        ${mode!=='1' ? `
        <td class="num"><input class="doc-input" type="number" min="0" max="${m.max}" value="${m.s2trav}" data-i="${m.idx}" data-f="s2trav" onchange="recalcLive()"></td>
        <td class="num"><input class="doc-input" type="number" min="0" max="${m.max}" value="${m.s2exam}" data-i="${m.idx}" data-f="s2exam" onchange="recalcLive()"></td>
        <td class="num" style="font-weight:700;">${s2tot}</td>` : ''}
        <td class="num" style="font-weight:800;">${mode==='1'?s1tot:mode==='2'?s2tot:tg}</td>
        ${editMode ? `<td class="num no-print"><button class="btn btn-danger btn-sm" onclick="deleteMatiere(${m.idx})"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></td>` : ''}
      </tr>`;
    }).join('');

    grandMax += subMax; grandS1 += subS1; grandS2 += subS2; grandTG += subTG;
    const subTotalDisplay = mode==='1'?subS1:mode==='2'?subS2:subTG;

    return `
      <tr class="doc-domain-row">
        <td colspan="${colCount}">
          <div class="flex-between">
            <span>${d.nom}</span>
            ${editMode ? `<span class="no-print">
              <button class="btn btn-outline btn-sm" onclick="renameDomaine('${d.nom.replace(/'/g,"\\'")}')" style="margin-right:6px;"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg> Renommer</button>
              <button class="btn btn-danger btn-sm" onclick="deleteDomaine('${d.nom.replace(/'/g,"\\'")}')"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Supprimer le domaine</button>
            </span>` : ''}
          </div>
        </td>
      </tr>
      ${rows}
      ${editMode ? `<tr class="no-print"><td colspan="${colCount}"><button class="btn btn-outline btn-sm" onclick="addMatiere('${d.nom.replace(/'/g,"\\'")}')">+ Ajouter une matière dans ce domaine</button></td></tr>` : ''}
      <tr class="doc-subtotal-row">
        <td>Sous-total</td><td class="num">${subMax}</td>
        ${mode!=='2' ? `<td colspan="2"></td><td class="num">${subS1}</td>` : ''}
        ${mode!=='1' ? `<td colspan="2"></td><td class="num">${subS2}</td>` : ''}
        <td class="num">${subTotalDisplay}</td>
        ${editMode ? `<td></td>` : ''}
      </tr>`;
  }).join('');

  const grandDisplay = mode==='1'?grandS1:mode==='2'?grandS2:grandTG;
  const maxTotal = mode==='both' ? grandMax*2 : grandMax;
  const pourcentage = maxTotal ? ((grandDisplay/maxTotal)*100).toFixed(1) : '0.0';

  page.innerHTML = `
    <div class="doc-head">
      ${DB.docCrestHTML(settings)}
      <div class="doc-country">RÉPUBLIQUE DU CONGO</div>
      <div class="doc-meta" style="font-weight:700;">MINISTÈRE DE L'ENSEIGNEMENT PRIMAIRE, SECONDAIRE ET TECHNIQUE</div>
      <div class="doc-org" style="font-size:18px;">${(settings.etablissement || 'Établissement Scolaire').toUpperCase()}</div>
    </div>

    <div class="doc-row">
      <div class="doc-col">
        <div class="doc-field"><b>Nom</b>: ${el ? el.nom : ''}</div>
        <div class="doc-field"><b>Prénom</b>: ${el ? el.prenom : ''}</div>
        <div class="doc-field"><b>Matricule</b>: ${el ? el.id : ''}</div>
      </div>
      <div class="doc-col text-right">
        <div class="doc-field"><b>Sexe</b>: ${el && el.sexe==='F' ? 'Féminin' : 'Masculin'}</div>
        <div class="doc-field"><b>Classe</b>: ${el ? el.classe : ''}</div>
        <div class="doc-field"><b>Année Scolaire</b>: ${rec.annee}</div>
      </div>
    </div>

    <div class="doc-title" style="font-size:15px;letter-spacing:1px;">BULLETIN SCOLAIRE — ${mode==='1'?'1er SEMESTRE':mode==='2'?'2nd SEMESTRE':'ANNÉE COMPLÈTE'}</div>

    ${editMode ? `<div class="no-print mb-16"><button class="btn btn-dark btn-sm" onclick="addDomaine()">+ Ajouter un Nouveau Domaine / Matière</button></div>` : ''}

    <table class="doc-table">
      <thead>
        <tr>
          <th rowspan="2">Matière</th><th rowspan="2">Max</th>
          ${mode!=='2' ? `<th colspan="3">Premier Semestre</th>` : ''}
          ${mode!=='1' ? `<th colspan="3">Second Semestre</th>` : ''}
          <th rowspan="2">T.G.</th>
          ${editMode ? `<th rowspan="2" class="no-print"></th>` : ''}
        </tr>
        <tr>
          ${mode!=='2' ? `<th class="num">Trav.Journ</th><th class="num">Exam</th><th class="num">Tot</th>` : ''}
          ${mode!=='1' ? `<th class="num">Trav.Journ</th><th class="num">Exam</th><th class="num">Tot</th>` : ''}
        </tr>
      </thead>
      <tbody>
        ${domainBlocks || `<tr><td colspan="${colCount}" class="empty-state">Aucune matière — utilisez "Mode Édition" pour en ajouter</td></tr>`}
        <tr class="doc-total-row">
          <td>TOTAUX</td><td class="num">${grandMax}</td>
          ${mode!=='2' ? `<td colspan="2"></td><td class="num">${grandS1}</td>` : ''}
          ${mode!=='1' ? `<td colspan="2"></td><td class="num">${grandS2}</td>` : ''}
          <td class="num">${grandDisplay}</td>
          ${editMode ? `<td></td>` : ''}
        </tr>
      </tbody>
    </table>

    <div class="doc-row">
      <div class="doc-col">
        <div class="doc-field"><b>Pourcentage</b>: ${pourcentage}%</div>
        <div class="doc-field"><b>Place</b>: <input class="doc-input" style="width:50px;" id="fPlace" value="${rec.place||''}"> / <input class="doc-input" style="width:50px;" id="fEffectif" value="${rec.effectif||''}"> élèves</div>
      </div>
      <div class="doc-col">
        <div class="doc-field"><b>Application</b>: <input class="doc-input" style="width:120px;text-align:left;" id="fApplication" value="${rec.application||''}"></div>
        <div class="doc-field"><b>Conduite</b>: <input class="doc-input" style="width:120px;text-align:left;" id="fConduite" value="${rec.conduite||''}"></div>
      </div>
    </div>

    <div class="doc-note">
      1. L'élève pourra passer dans la classe supérieure s'il n'a subi aucun examen de 2ème session.<br>
      2. L'élève passe la classe supérieure. &nbsp; 3. L'élève double la classe. &nbsp; 4. L'élève doit rentrer et s'inscrire dans une autre école.
    </div>

    <div class="doc-sign">
      <div class="doc-qr-box">
        ${DB.qrCodeSVG(DB.qrBulletinTexte(rec, el, {
          periode: mode==='1'?'1er Semestre':mode==='2'?'2nd Semestre':'Année complète',
          total: grandDisplay + ' / ' + maxTotal + ' (' + pourcentage + '%)'
        }), 4)}
        <div class="doc-qr-label">Code de vérification unique du document<br><b>${rec.qrCode}</b></div>
      </div>
      <div class="line">Signature de l'Élève</div>
      <div class="line">Le Chef d'Établissement</div>
    </div>
  `;
}

/* ---------------- ÉDITION LIBRE DU BULLETIN ---------------- */

function updateField(i, field, value){
  const rec = getOrCreateNotes(currentEleveId);
  if(field === 'max'){
    value = Math.max(1, Number(value)||1);
  }
  rec.matieres[i][field] = value;
  persistCurrentNotes(rec);
  renderBulletin();
}

function deleteMatiere(i){
  const rec = getOrCreateNotes(currentEleveId);
  if(!confirm(`Supprimer la matière "${rec.matieres[i].nom}" du bulletin ?`)) return;
  rec.matieres.splice(i,1);
  persistCurrentNotes(rec);
  toast('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Matière supprimée');
  renderBulletin();
}

function addMatiere(domaine){
  const rec = getOrCreateNotes(currentEleveId);
  const nom = prompt('Nom de la nouvelle matière :', 'Nouvelle matière');
  if(!nom) return;
  const max = Number(prompt('Note maximale pour cette matière :', '20')) || 20;
  rec.matieres.push({nom, domaine, max, s1trav:0, s1exam:0, s2trav:0, s2exam:0});
  persistCurrentNotes(rec);
  toast('✔ Matière ajoutée');
  renderBulletin();
}

function addDomaine(){
  const domaine = prompt('Nom du nouveau domaine :', 'Nouveau domaine');
  if(!domaine) return;
  const nom = prompt('Nom de la première matière de ce domaine :', 'Nouvelle matière');
  if(!nom) return;
  const max = Number(prompt('Note maximale pour cette matière :', '20')) || 20;
  const rec = getOrCreateNotes(currentEleveId);
  rec.matieres.push({nom, domaine, max, s1trav:0, s1exam:0, s2trav:0, s2exam:0});
  persistCurrentNotes(rec);
  toast('✔ Domaine ajouté');
  renderBulletin();
}

function renameDomaine(oldName){
  const newName = prompt('Nouveau nom du domaine :', oldName);
  if(!newName || newName === oldName) return;
  const rec = getOrCreateNotes(currentEleveId);
  rec.matieres.forEach(m => { if(m.domaine === oldName) m.domaine = newName; });
  persistCurrentNotes(rec);
  toast('✔ Domaine renommé');
  renderBulletin();
}

function deleteDomaine(domaine){
  if(!confirm(`Supprimer le domaine "${domaine}" et toutes ses matières ?`)) return;
  const rec = getOrCreateNotes(currentEleveId);
  rec.matieres = rec.matieres.filter(m => m.domaine !== domaine);
  persistCurrentNotes(rec);
  toast('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Domaine supprimé');
  renderBulletin();
}

function recalcLive(){
  // live recalculation without losing structural edits — re-render using values currently in the DOM
  const inputs = [...document.querySelectorAll('.doc-input[data-i]')];
  const rec = getOrCreateNotes(currentEleveId);
  inputs.forEach(inp=>{
    const i = Number(inp.dataset.i);
    const f = inp.dataset.f;
    rec.matieres[i][f] = Number(inp.value)||0;
  });
  persistCurrentNotes(rec);
  renderBulletin();
}

function saveNotes(){
  const rec = getOrCreateNotes(currentEleveId);
  rec.place = document.getElementById('fPlace') ? document.getElementById('fPlace').value : rec.place;
  rec.effectif = document.getElementById('fEffectif') ? document.getElementById('fEffectif').value : rec.effectif;
  rec.application = document.getElementById('fApplication') ? document.getElementById('fApplication').value : rec.application;
  rec.conduite = document.getElementById('fConduite') ? document.getElementById('fConduite').value : rec.conduite;

  persistCurrentNotes(rec);
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-refresh-cw-icon lucide-refresh-cw"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></svg>', `Mise à jour du bulletin de ${currentEleveId}`);
  toast('✔ Notes enregistrées');
}
