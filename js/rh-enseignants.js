document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('pDate').value = new Date().toISOString().slice(0,10);
  renderAll();
});

function renderAll(){
  fillProfSelect();
  renderTeachers();
  renderPointages();
  renderRecap();
  renderStats();
  renderPayrollProf();
}

function fillProfSelect(){
  const teachers = DB.get(DB.KEYS.teachers, []).filter(t=>t.statut==='Actif');
  document.getElementById('pProf').innerHTML = teachers.map(t=>`<option value="${t.id}">${t.prenom} ${t.nom} — ${t.matiere}</option>`).join('');
}

function renderTeachers(){
  const teachers = DB.get(DB.KEYS.teachers, []);
  document.getElementById('teachersBody').innerHTML = teachers.length ? teachers.map((t,i)=>`
    <tr>
      <td>${t.id}</td><td>${t.nom} ${t.prenom}</td><td>${t.matiere}</td>
      <td>${DB.fmtFCFA(t.tauxHoraire)}</td>
      <td><span class="badge ${t.statut==='Actif'?'badge-green':'badge-gray'}">${t.statut}</span></td>
      <td class="flex gap-8">
        <button class="btn btn-outline btn-sm" onclick="openTeacherModal(${i})"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg></button>
        <button class="btn btn-outline btn-sm" onclick="toggleTeacher(${i})">${t.statut==='Actif'?'Désactiver':'Activer'}</button>
        <button class="btn btn-danger btn-sm" onclick="deleteTeacher(${i})"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
      </td>
    </tr>`).join('') : '<tr><td colspan="6" class="empty-state">Aucun enseignant</td></tr>';
}

function toggleTeacher(i){
  const teachers = DB.get(DB.KEYS.teachers, []);
  teachers[i].statut = teachers[i].statut==='Actif' ? 'Inactif' : 'Actif';
  DB.set(DB.KEYS.teachers, teachers);
  renderAll();
}

function deleteTeacher(i){
  const teachers = DB.get(DB.KEYS.teachers, []);
  const t = teachers[i];
  if(!confirm(`Supprimer l'enseignant ${t.prenom} ${t.nom} ?\n\nSes pointages et bulletins déjà générés seront conservés dans l'historique.`)) return;
  teachers.splice(i,1);
  DB.set(DB.KEYS.teachers, teachers);
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>', `Suppression de l'enseignant ${t.prenom} ${t.nom}`);
  renderAll();
  toast('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Enseignant supprimé');
}

let editingTeacherIndex = null;

function openTeacherModal(i){
  editingTeacherIndex = (typeof i === 'number') ? i : null;
  document.querySelector('#teacherModal h3').textContent = editingTeacherIndex!==null ? "Modifier l'Enseignant" : "Nouvel Enseignant";

  if(editingTeacherIndex !== null){
    const t = DB.get(DB.KEYS.teachers, [])[editingTeacherIndex];
    document.getElementById('tNom').value = t.nom;
    document.getElementById('tPrenom').value = t.prenom;
    document.getElementById('tMatiere').value = t.matiere;
    document.getElementById('tTaux').value = t.tauxHoraire;
    document.getElementById('tTel').value = t.tel || '';
  } else {
    ['tNom','tPrenom','tMatiere','tTaux','tTel'].forEach(f=>document.getElementById(f).value='');
  }
  document.getElementById('teacherModal').classList.add('open');
}
function closeTeacherModal(){
  document.getElementById('teacherModal').classList.remove('open');
  editingTeacherIndex = null;
}

function saveTeacher(){
  const nom = document.getElementById('tNom').value.trim();
  const prenom = document.getElementById('tPrenom').value.trim();
  const taux = Number(document.getElementById('tTaux').value);
  if(!nom || !prenom || !taux){ toast('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> Nom, prénom et taux horaire obligatoires'); return; }
  const teachers = DB.get(DB.KEYS.teachers, []);
  const fields = {
    nom, prenom,
    matiere: document.getElementById('tMatiere').value,
    tauxHoraire: taux, tel: document.getElementById('tTel').value
  };

  if(editingTeacherIndex !== null){
    teachers[editingTeacherIndex] = { ...teachers[editingTeacherIndex], ...fields };
    DB.set(DB.KEYS.teachers, teachers);
    DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>', `Modification du dossier de l'enseignant ${nom} ${prenom}`);
    toast('✔ Enseignant modifié');
    closeTeacherModal();
    renderAll();
    return;
  }

  teachers.push({
    id: DB.uid('CPI-PROF'), ...fields, statut:'Actif'
  });
  DB.set(DB.KEYS.teachers, teachers);
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-icon lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>\u200d<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-school-icon lucide-school"><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M18 4.933V21"/><path d="m4 6 7.106-3.79a2 2 0 0 1 1.788 0L20 6"/><path d="m6 11-3.52 2.147a1 1 0 0 0-.48.854V19a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a1 1 0 0 0-.48-.853L18 11"/><path d="M6 4.933V21"/><circle cx="12" cy="9" r="2"/></svg>', `Ajout de l'enseignant ${nom} ${prenom}`);
  closeTeacherModal();
  renderAll();
  toast('✔ Enseignant ajouté');
  ['tNom','tPrenom','tMatiere','tTaux','tTel'].forEach(f=>document.getElementById(f).value='');
}

function heuresEntre(entree, sortie){
  const [h1,m1] = entree.split(':').map(Number);
  const [h2,m2] = sortie.split(':').map(Number);
  if(isNaN(h1)||isNaN(h2)) return 0;
  let diff = (h2*60+m2) - (h1*60+m1);
  if(diff < 0) diff = 0;
  return Math.round((diff/60)*100)/100;
}

function ajouterPointage(){
  const profId = document.getElementById('pProf').value;
  const date = document.getElementById('pDate').value;
  const entree = document.getElementById('pEntree').value.trim();
  const sortie = document.getElementById('pSortie').value.trim();
  if(!profId || !date || !entree || !sortie){ toast('⚠ Veuillez remplir tous les champs (format HH:MM)'); return; }

  const heures = heuresEntre(entree, sortie);
  if(heures <= 0){ toast('⚠ Heures invalides — vérifiez le format HH:MM'); return; }

  const pointages = DB.get(DB.KEYS.pointages, []);
  pointages.push({id: DB.uid('PTG'), profId, date, heureEntree:entree, heureSortie:sortie, heures});
  DB.set(DB.KEYS.pointages, pointages);

  const teachers = DB.get(DB.KEYS.teachers, []);
  const t = teachers.find(x=>x.id===profId);
  DB.logActivity('⏱', `Pointage enregistré pour ${t?t.prenom+' '+t.nom:profId} (${heures} h le ${date})`);
  toast('✔ Pointage enregistré (' + heures + ' h)');
  renderAll();
}

function renderPointages(){
  const pointages = DB.get(DB.KEYS.pointages, []).slice().sort((a,b)=> b.date.localeCompare(a.date));
  const teachers = DB.get(DB.KEYS.teachers, []);
  document.getElementById('pointagesBody').innerHTML = pointages.length ? pointages.map(p=>{
    const t = teachers.find(x=>x.id===p.profId) || {nom:'?',prenom:'?'};
    return `<tr><td>${p.date}</td><td>${t.prenom} ${t.nom}</td><td>${p.heureEntree}</td><td>${p.heureSortie}</td><td style="font-weight:700;">${p.heures} h</td></tr>`;
  }).join('') : '<tr><td colspan="5" class="empty-state">Aucun pointage enregistré</td></tr>';
}

function renderRecap(){
  const teachers = DB.get(DB.KEYS.teachers, []).filter(t=>t.statut==='Actif');
  const pointages = DB.get(DB.KEYS.pointages, []);
  const curMonth = new Date().toISOString().slice(0,7);

  document.getElementById('recapBody').innerHTML = teachers.length ? teachers.map(t=>{
    const heures = pointages.filter(p=>p.profId===t.id && p.date.startsWith(curMonth)).reduce((s,p)=>s+p.heures,0);
    const total = heures * t.tauxHoraire;
    return `<tr><td>${t.prenom} ${t.nom}</td><td>${heures.toFixed(2)} h</td><td>${DB.fmtFCFA(t.tauxHoraire)}</td><td style="font-weight:700;">${DB.fmtFCFA(total)}</td></tr>`;
  }).join('') : '<tr><td colspan="4" class="empty-state">Aucun enseignant actif</td></tr>';
}

function renderStats(){
  const teachers = DB.get(DB.KEYS.teachers, []);
  const pointages = DB.get(DB.KEYS.pointages, []);
  const curMonth = new Date().toISOString().slice(0,7);
  const today = new Date().toISOString().slice(0,10);

  document.getElementById('statProfs').textContent = teachers.filter(t=>t.statut==='Actif').length;

  const heuresMois = pointages.filter(p=>p.date.startsWith(curMonth)).reduce((s,p)=>s+p.heures,0);
  document.getElementById('statHeures').textContent = heuresMois.toFixed(1) + ' h';

  const cout = pointages.filter(p=>p.date.startsWith(curMonth)).reduce((s,p)=>{
    const t = teachers.find(x=>x.id===p.profId);
    return s + (t ? p.heures * t.tauxHoraire : 0);
  }, 0);
  document.getElementById('statCout').textContent = DB.fmtFCFA(cout);

  document.getElementById('statAujourdhui').textContent = pointages.filter(p=>p.date===today).length;
}

function genererPaieProfs(){
  const teachers = DB.get(DB.KEYS.teachers, []).filter(t=>t.statut==='Actif');
  const pointages = DB.get(DB.KEYS.pointages, []);
  const curMonth = new Date().toISOString().slice(0,7);
  if(!teachers.length){ toast('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> Aucun enseignant actif'); return; }

  let payroll = DB.get(DB.KEYS.payroll, []);
  const dejaTraite = payroll.some(p => p.type==='enseignant' && p.mois===curMonth);
  if(dejaTraite){
    if(!confirm('La paie des enseignants a déjà été générée pour ce mois.\n\nRégénérer va annuler l\'ancienne sortie de caisse et la recréer. Continuer ?')) return;
    const depenses = DB.get(DB.KEYS.depenses, []).filter(d => d.reference !== 'PAIE-PROF-'+curMonth);
    DB.set(DB.KEYS.depenses, depenses);
  }
  payroll = payroll.filter(p => !(p.type==='enseignant' && p.mois===curMonth));

  let count = 0, total = 0;
  const lignes = [];
  teachers.forEach(t=>{
    const heures = pointages.filter(p=>p.profId===t.id && p.date.startsWith(curMonth)).reduce((s,p)=>s+p.heures,0);
    if(heures <= 0) return;
    const salaireNet = Math.round(heures * t.tauxHoraire);
    lignes.push({
      id: DB.uid('PAIE'), type:'enseignant', staffId: t.id, nom: `${t.prenom} ${t.nom}`,
      poste: t.matiere, mois: curMonth, heures, salaireNet,
      datePaiement: new Date().toISOString().slice(0,10)
    });
    total += salaireNet;
    count++;
  });

  if(!count){ toast('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> Aucune heure pointée ce mois-ci'); return; }

  const soldeAvant = DB.soldeCaisse();
  if(total > soldeAvant){
    if(!confirm(`Le solde de caisse actuel (${DB.fmtFCFA(soldeAvant)}) est insuffisant pour couvrir la paie des enseignants (${DB.fmtFCFA(total)}).\n\nLa caisse passera en négatif (${DB.fmtFCFA(soldeAvant-total)}). Continuer quand même ?`)) return;
  }

  payroll = payroll.concat(lignes);
  DB.set(DB.KEYS.payroll, payroll);

  DB.enregistrerDepense({
    categorie:'Paie Enseignants',
    libelle:`Paie des enseignants — ${curMonth} (${count} enseignant(s))`,
    montant: total, reference:'PAIE-PROF-'+curMonth
  });

  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hand-coins-icon lucide-hand-coins"><path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"/><path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 16 6 6"/><circle cx="16" cy="9" r="2.9"/><circle cx="6" cy="5" r="3"/></svg>', `Génération de la paie des enseignants pour ${curMonth} — ${DB.fmtFCFA(total)} débités de la caisse`);
  toast(`✔ Paie générée pour ${count} enseignant(s) — ${DB.fmtFCFA(total)} débités. Nouveau solde : ${DB.fmtFCFA(DB.soldeCaisse())}`);
  renderAll();
}

function renderPayrollProf(){
  const payroll = DB.get(DB.KEYS.payroll, []).filter(p=>p.type==='enseignant');
  document.getElementById('payrollProfBody').innerHTML = payroll.length ? payroll.slice().reverse().map(p=>`
    <tr>
      <td>${p.mois}</td><td>${p.nom}</td><td>${p.heures.toFixed(2)} h</td>
      <td style="font-weight:700;">${DB.fmtFCFA(p.salaireNet)}</td><td>${p.datePaiement}</td>
      <td><button class="btn btn-outline btn-sm" onclick="window.open('paie.html?paie=${p.id}','_blank')"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-save-icon lucide-save"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Bulletin</button></td>
    </tr>`).join('') : '<tr><td colspan="6" class="empty-state">Aucun bulletin généré</td></tr>';
}
