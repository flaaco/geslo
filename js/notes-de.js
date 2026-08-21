let deClasseActuelle = null;
let deTrimestreActuelle = null;

document.addEventListener('DOMContentLoaded', ()=>{
  const classes = DB.getClasses ? DB.getClasses() : DB.CLASSES;
  const selClasse = document.getElementById('deClasse');
  selClasse.innerHTML = classes.map(c=>`<option value="${c}">${c}</option>`).join('');

  const selTrimestre = document.getElementById('deTrimestre');
  selTrimestre.innerHTML = DB.TRIMESTRES.map(t=>`<option value="${t}">${t}</option>`).join('');

  document.getElementById('dType').innerHTML = DB.TYPES_DEVOIR.map(t=>`<option value="${t}">${t}</option>`).join('');
  document.getElementById('dDate').value = new Date().toISOString().slice(0,10);

  const params = new URLSearchParams(location.search);
  const initialClasse = params.get('classe') && classes.includes(params.get('classe')) ? params.get('classe') : classes[0];
  selClasse.value = initialClasse;
  const initialTrimestre = params.get('trimestre') && DB.TRIMESTRES.includes(params.get('trimestre')) ? params.get('trimestre') : DB.TRIMESTRES[0];
  selTrimestre.value = initialTrimestre;

  onClasseChange();
  window.addEventListener('cepeed:data-changed', ()=>{ renderMoyennes(); });
});

function elevesDeLaClasse(classe){
  return DB.get(DB.KEYS.students, []).filter(s=>s.classe===classe).sort((a,b)=> (a.nom+a.prenom).localeCompare(b.nom+b.prenom));
}

function onClasseChange(){
  deClasseActuelle = document.getElementById('deClasse').value;
  deTrimestreActuelle = document.getElementById('deTrimestre').value;
  renderMatieres();
  renderMatiereSelect();
  renderEleveSelect();
  chargerDevoirExistant();
  renderMoyennes();
}

function renderEleveSelect(){
  const eleves = elevesDeLaClasse(deClasseActuelle);
  const sel = document.getElementById('deEleve');
  sel.innerHTML = eleves.length
    ? eleves.map(el=>`<option value="${el.id}">${el.prenom} ${el.nom}</option>`).join('')
    : '<option value="" disabled selected>Aucun élève dans cette classe</option>';
}

/* ---------------- MATIÈRES & COEFFICIENTS ---------------- */

function renderMatieres(){
  const matieres = DB.matieresDeClasse(deClasseActuelle);
  document.getElementById('matieresBody').innerHTML = matieres.length ? matieres.map(m=>`
    <tr>
      <td>${m.nom}</td>
      <td style="text-align:right;"><input type="number" min="1" value="${m.coefficient}" style="width:60px;text-align:right;" onchange="modifierCoef('${m.id}',this.value)"></td>
      <td><button class="btn btn-danger btn-sm" onclick="supprimerMatiere('${m.id}','${m.nom.replace(/'/g,"\\'")}')"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></td>
    </tr>`).join('') : '<tr><td colspan="3" class="empty-state">Aucune matière pour cette classe — ajoutez-en une ci-dessous</td></tr>';
}

function ajouterMatiere(){
  const nom = document.getElementById('nMatiere').value.trim();
  const coef = document.getElementById('nCoef').value;
  if(!nom){ toast('⚠ Indiquez le nom de la matière'); return; }
  const res = DB.ajouterMatiereClasse(deClasseActuelle, nom, coef);
  if(!res.success){ toast('⚠ ' + res.message); return; }
  DB.logActivity('📚', `Matière "${nom}" ajoutée à la classe ${deClasseActuelle} (coef. ${coef})`);
  toast('✔ Matière ajoutée');
  document.getElementById('nMatiere').value = '';
  document.getElementById('nCoef').value = '1';
  renderMatieres();
  renderMatiereSelect();
  renderMoyennes();
}

function modifierCoef(matiereId, value){
  DB.modifierCoefficientMatiere(deClasseActuelle, matiereId, value);
  toast('✔ Coefficient mis à jour');
  renderMoyennes();
}

function supprimerMatiere(matiereId, nom){
  if(!confirm(`Supprimer la matière "${nom}" de la classe ${deClasseActuelle} ?\n\nLes notes déjà saisies resteront en historique mais ne compteront plus dans la moyenne générale.`)) return;
  DB.supprimerMatiereClasse(deClasseActuelle, matiereId);
  toast('✔ Matière supprimée de la classe');
  renderMatieres();
  renderMatiereSelect();
  chargerDevoirExistant();
  renderMoyennes();
}

/* ---------------- SAISIE DES NOTES D'UN DEVOIR ---------------- */

function renderMatiereSelect(){
  const matieres = DB.matieresDeClasse(deClasseActuelle);
  const sel = document.getElementById('dMatiere');
  const previous = sel.value;
  sel.innerHTML = matieres.length
    ? matieres.map(m=>`<option value="${m.id}">${m.nom} (coef. ${m.coefficient})</option>`).join('')
    : '<option value="" disabled selected>Ajoutez d\'abord une matière à cette classe</option>';
  if(matieres.some(m=>m.id===previous)) sel.value = previous;
}

function chargerDevoirExistant(){
  const matiereId = document.getElementById('dMatiere').value;
  const type = document.getElementById('dType').value;
  const date = document.getElementById('dDate').value;
  const eleves = elevesDeLaClasse(deClasseActuelle);

  const notesExistantes = matiereId ? DB.get(DB.KEYS.devoirNotes, [])
    .filter(n => n.classe===deClasseActuelle && n.matiereId===matiereId && n.type===type && n.date===date && (n.trimestre||DB.TRIMESTRES[0])===deTrimestreActuelle) : [];

  if(notesExistantes.length){
    document.getElementById('dBareme').value = notesExistantes[0].bareme || 20;
    document.getElementById('btnSuppDevoir').style.display = '';
  } else {
    document.getElementById('btnSuppDevoir').style.display = 'none';
  }

  document.getElementById('saisieBody').innerHTML = eleves.length ? eleves.map(el=>{
    const existante = notesExistantes.find(n=>n.eleveId===el.id);
    return `<tr>
      <td>${el.prenom} ${el.nom}</td>
      <td style="text-align:right;"><input type="number" min="0" step="0.5" data-eleve="${el.id}" class="devoirNoteInput" style="width:70px;text-align:right;" value="${existante ? existante.note : ''}" placeholder="—"></td>
    </tr>`;
  }).join('') : '<tr><td colspan="2" class="empty-state">Aucun élève dans cette classe</td></tr>';
}

function enregistrerDevoir(){
  const matiereId = document.getElementById('dMatiere').value;
  const type = document.getElementById('dType').value;
  const date = document.getElementById('dDate').value;
  const bareme = document.getElementById('dBareme').value;
  if(!matiereId){ toast('⚠ Sélectionnez une matière (ajoutez-en une si la liste est vide)'); return; }
  if(!date){ toast('⚠ Indiquez la date du devoir'); return; }

  const matiere = DB.matieresDeClasse(deClasseActuelle).find(m=>m.id===matiereId);
  const inputs = [...document.querySelectorAll('.devoirNoteInput')].filter(i=>i.value !== '');
  if(!inputs.length){ toast('⚠ Saisissez au moins une note avant d\'enregistrer'); return; }

  inputs.forEach(inp=>{
    DB.enregistrerNoteDevoir({
      eleveId: inp.dataset.eleve, classe: deClasseActuelle,
      matiereId, matiereNom: matiere.nom, type, date,
      note: inp.value, bareme, trimestre: deTrimestreActuelle
    });
  });

  DB.logActivity('📝', `${inputs.length} note(s) enregistrée(s) — ${type} de ${matiere.nom} (${deClasseActuelle}, ${deTrimestreActuelle}, ${date})`);
  toast(`✔ ${inputs.length} note(s) enregistrée(s)`);
  chargerDevoirExistant();
  renderMoyennes();
}

function supprimerDevoirActuel(){
  const matiereId = document.getElementById('dMatiere').value;
  const type = document.getElementById('dType').value;
  const date = document.getElementById('dDate').value;
  const matiere = DB.matieresDeClasse(deClasseActuelle).find(m=>m.id===matiereId);
  if(!confirm(`Supprimer TOUTES les notes de ce devoir (${type} — ${matiere ? matiere.nom : ''} — ${date} — ${deTrimestreActuelle}) ?`)) return;
  DB.supprimerDevoirEntier(deClasseActuelle, matiereId, type, date, deTrimestreActuelle);
  toast('✔ Devoir supprimé');
  chargerDevoirExistant();
  renderMoyennes();
}

/* ---------------- MOYENNES DE LA CLASSE ---------------- */

function renderMoyennes(){
  const matieres = DB.matieresDeClasse(deClasseActuelle);
  const labelEl = document.getElementById('moyennesTrimestreLabel');
  if(labelEl) labelEl.textContent = deTrimestreActuelle;

  document.getElementById('moyennesHead').innerHTML =
    '<th>Élève</th>' +
    matieres.map(m=>`<th style="text-align:right;">${m.nom}<br><span class="small text-muted">(coef. ${m.coefficient})</span></th>`).join('') +
    '<th style="text-align:right;">Moyenne Générale</th><th style="text-align:right;">Rang</th>';

  const classement = DB.classementClasse(deClasseActuelle, deTrimestreActuelle);

  document.getElementById('moyennesBody').innerHTML = classement.length ? classement.map(l=>{
    const cellules = matieres.map(m=>{
      const r = DB.moyenneMatiereEleve(l.eleve.id, m.id, deTrimestreActuelle);
      return r ? `${r.moyenne.toFixed(2)} <span class="small text-muted">(${r.nbDevoirs})</span>` : '—';
    });
    return `
    <tr>
      <td>${l.eleve.prenom} ${l.eleve.nom}</td>
      ${cellules.map(c=>`<td style="text-align:right;">${c}</td>`).join('')}
      <td style="text-align:right;font-weight:700;">${l.moyenne!==null ? l.moyenne.toFixed(2)+'/20' : '—'}</td>
      <td style="text-align:right;">${l.rang ? l.rang+'e' : '—'}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="${matieres.length+3}" class="empty-state">Aucun élève dans cette classe</td></tr>`;
}

function imprimerReleve(){
  DB.logActivity('🖨', `Impression du relevé de notes — ${deClasseActuelle} (${deTrimestreActuelle})`);
  window.open(`notes-releve.html?classe=${encodeURIComponent(deClasseActuelle)}&trimestre=${encodeURIComponent(deTrimestreActuelle)}`, '_blank');
}

/* ---------------- BULLETINS DES ÉLÈVES ---------------- */

function imprimerBulletinEleve(){
  const eleveId = document.getElementById('deEleve').value;
  if(!eleveId){ toast('⚠ Aucun élève sélectionné'); return; }
  DB.logActivity('🖨', `Impression du bulletin — ${deClasseActuelle} (${deTrimestreActuelle})`);
  window.open(`bulletin-de.html?classe=${encodeURIComponent(deClasseActuelle)}&trimestre=${encodeURIComponent(deTrimestreActuelle)}&eleve=${encodeURIComponent(eleveId)}`, '_blank');
}

function imprimerBulletinsClasse(){
  DB.logActivity('🖨', `Impression des bulletins de toute la classe — ${deClasseActuelle} (${deTrimestreActuelle})`);
  window.open(`bulletin-de.html?classe=${encodeURIComponent(deClasseActuelle)}&trimestre=${encodeURIComponent(deTrimestreActuelle)}`, '_blank');
}
