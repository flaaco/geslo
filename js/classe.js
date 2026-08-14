let currentClasse = null;

document.addEventListener('DOMContentLoaded', ()=>{
  const students = DB.get(DB.KEYS.students, []);
  const classes = [...new Set(students.map(s=>s.classe))].sort();

  if(!classes.length){
    document.getElementById('classeTitle').textContent = 'AUCUNE CLASSE';
    document.getElementById('classeSubtitle').textContent = 'Aucun élève inscrit pour le moment.';
    document.getElementById('classeBody').innerHTML = '<tr><td colspan="6" class="empty-state">Inscrivez des élèves depuis la page Inscription pour voir apparaître les classes ici.</td></tr>';
    return;
  }

  const switcher = document.getElementById('classeSwitcher');
  switcher.innerHTML = classes.map(c=>`<option value="${c}">${c}</option>`).join('');

  const params = new URLSearchParams(location.search);
  const classe = params.get('classe') || classes[0];
  switcher.value = classe;
  currentClasse = classe;

  document.getElementById('classeTitle').textContent = 'CLASSE: ' + classe;

  document.getElementById('sortDir').addEventListener('change', ()=> renderClasse(classe));
  renderClasse(classe);
});

function renderClasse(classe){
  const students = DB.get(DB.KEYS.students, []).filter(s=>s.classe===classe);
  const dir = document.getElementById('sortDir').value;

  const rows = students.map(s => ({el:s, ps: DB.paymentStatus(s.id)}));

  const order = {paye:0, acompte:1, nonpaye:2};
  rows.sort((a,b)=>{
    const byStatus = order[a.ps.status] - order[b.ps.status];
    if(byStatus !== 0) return dir==='asc' ? byStatus : -byStatus;
    return b.ps.moisRetard - a.ps.moisRetard;
  });

  document.getElementById('classeSubtitle').textContent = `${students.length} élève(s) dans cette classe`;
  document.getElementById('cntPaye').textContent = rows.filter(r=>r.ps.status==='paye').length;
  document.getElementById('cntAcompte').textContent = rows.filter(r=>r.ps.status==='acompte').length;
  document.getElementById('cntNonPaye').textContent = rows.filter(r=>r.ps.status==='nonpaye').length;

  const statusLabel = {paye:['Payé','badge-green','✔'], acompte:['Acompte','badge-orange','◐'], nonpaye:['Non Payé','badge-red','✕']};

  document.getElementById('classeBody').innerHTML = rows.length ? rows.map(r=>{
    const [label, cls, icon] = statusLabel[r.ps.status];
    return `<tr>
      <td>${r.el.id}</td>
      <td>${r.el.prenom} ${r.el.nom}</td>
      <td><span class="badge ${cls}">${icon} ${label}</span></td>
      <td style="font-weight:700;${r.ps.totalDu>0?'color:var(--red);':''}">${r.ps.totalDu>0 ? DB.fmtFCFA(r.ps.totalDu) : '—'}</td>
      <td>${r.ps.moisRetard>0 ? r.ps.moisRetard + ' mois' : '—'}</td>
      <td class="flex gap-8">
        <a class="btn btn-outline btn-sm" href="paiements.html?eleve=${r.el.id}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-banknote-arrow-down-icon lucide-banknote-arrow-down"><path d="M12 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5"/><path d="m16 19 3 3 3-3"/><path d="M18 12h.01"/><path d="M19 16v6"/><path d="M6 12h.01"/><circle cx="12" cy="12" r="2"/></svg> Encaisser</a>
        ${r.ps.totalDu>0 ? `<button class="btn btn-outline btn-sm" onclick="envoyerRappel('${r.el.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bell-icon lucide-bell"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg> Rappel</button>` : ''}
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="6" class="empty-state">Aucun élève dans cette classe</td></tr>';
}

function envoyerRappel(eleveId){
  const students = DB.get(DB.KEYS.students, []);
  const el = students.find(s=>s.id===eleveId);
  const ps = DB.paymentStatus(eleveId);
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle-more-icon lucide-message-circle-more"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/></svg>', `Envoi de SMS de rappel pour ${el.prenom} ${el.nom} — ${DB.fmtFCFA(ps.totalDu)} dû`);
  toast('✔ SMS de rappel envoyé à ' + el.prenom + ' ' + el.nom);
}

/* Mois payés (soldés) par un élève, toutes échéances confondues, triés chronologiquement */
function moisPayesParEleve(eleveId){
  const echeances = DB.get(DB.KEYS.echeances, []).filter(e=>e.eleveId===eleveId && e.montantPaye>0);
  const mois = [...new Set(echeances.map(e=>e.mois).filter(Boolean))].sort();
  return mois;
}

/* Télécharge, dans un seul fichier CSV, uniquement les élèves à jour (statut "Payé") de la classe,
   avec les mois qu'ils ont réglés. */
function telechargerElevesAJour(){
  const students = DB.get(DB.KEYS.students, []).filter(s=>s.classe===currentClasse);
  const aJour = students.filter(s => DB.paymentStatus(s.id).status === 'paye');

  if(!aJour.length){ toast('⚠ Aucun élève à jour dans cette classe pour le moment'); return; }

  const rows = [['Matricule','Nom','Prénom','Classe','Mois Payés','Total Payé (FCFA)']];
  aJour.forEach(s=>{
    const totalPaye = DB.get(DB.KEYS.echeances, []).filter(e=>e.eleveId===s.id).reduce((sum,e)=>sum+Number(e.montantPaye||0),0);
    const mois = moisPayesParEleve(s.id).map(m=>DB.fmtMois(m)).join(', ') || '-';
    rows.push([s.id, s.nom, s.prenom, s.classe, mois, totalPaye]);
  });

  DB.downloadCSV(`CEPEED-${currentClasse.replace(/\s+/g,'_')}-eleves-a-jour-${new Date().toISOString().slice(0,10)}.csv`, rows);
  DB.logActivity('⬇', `Export des élèves à jour de la classe ${currentClasse} (${aJour.length} élève(s))`);
  toast(`✔ ${aJour.length} élève(s) à jour exporté(s) dans un seul fichier`);
}

/* Télécharge tous les élèves de la classe (quel que soit leur statut), avec statut et mois payés */
function telechargerToutLaClasse(){
  const students = DB.get(DB.KEYS.students, []).filter(s=>s.classe===currentClasse);
  if(!students.length){ toast('⚠ Aucun élève dans cette classe'); return; }

  const statusLabel = {paye:'Payé', acompte:'Acompte', nonpaye:'Non Payé'};
  const rows = [['Matricule','Nom','Prénom','Classe','Statut','Mois Payés','Total Dû (FCFA)']];
  students.forEach(s=>{
    const ps = DB.paymentStatus(s.id);
    const mois = moisPayesParEleve(s.id).map(m=>DB.fmtMois(m)).join(', ') || '-';
    rows.push([s.id, s.nom, s.prenom, s.classe, statusLabel[ps.status], mois, ps.totalDu]);
  });

  DB.downloadCSV(`CEPEED-${currentClasse.replace(/\s+/g,'_')}-tous-les-eleves-${new Date().toISOString().slice(0,10)}.csv`, rows);
  DB.logActivity('⬇', `Export complet de la classe ${currentClasse} (${students.length} élève(s))`);
  toast(`✔ ${students.length} élève(s) exporté(s) dans un seul fichier`);
}
