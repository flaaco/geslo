document.addEventListener('DOMContentLoaded', renderAll);

function renderAll(){
  renderStaff();
  renderStats();
  renderPayroll();
}

function renderStats(){
  const staff = DB.get(DB.KEYS.staffAdmin, []);
  const payroll = DB.get(DB.KEYS.payroll, []);
  const curMonth = new Date().toISOString().slice(0,7);

  document.getElementById('statCount').textContent = staff.filter(s=>s.statut==='Actif').length;
  document.getElementById('statMasse').textContent = DB.fmtFCFA(staff.filter(s=>s.statut==='Actif').reduce((s,x)=>s+Number(x.salaireFixe||0),0));

  const bulletinsCeMois = payroll.filter(p=>p.type==='admin' && p.mois===curMonth);
  document.getElementById('statBulletins').textContent = bulletinsCeMois.length;
  document.getElementById('statPaieStatus').textContent = bulletinsCeMois.length ? 'Traitée ✔' : 'Non traitée';
}

function renderStaff(){
  const staff = DB.get(DB.KEYS.staffAdmin, []);
  document.getElementById('staffBody').innerHTML = staff.length ? staff.map((s,i)=>`
    <tr>
      <td>${s.id}</td>
      <td>${s.nom} ${s.prenom}</td>
      <td>${s.poste}</td>
      <td>${s.service}</td>
      <td>${s.dateEmbauche || '-'}</td>
      <td style="font-weight:700;">${DB.fmtFCFA(s.salaireFixe)}</td>
      <td>${s.mode}</td>
      <td><span class="badge ${s.statut==='Actif'?'badge-green':'badge-gray'}">${s.statut}</span></td>
      <td class="flex gap-8">
        <button class="btn btn-outline btn-sm" onclick="openStaffModal(${i})"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg> Modifier</button>
        <button class="btn btn-outline btn-sm" onclick="toggleStaff(${i})">${s.statut==='Actif'?'Désactiver':'Activer'}</button>
        <button class="btn btn-danger btn-sm" onclick="deleteStaff(${i})"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Supprimer</button>
      </td>
    </tr>`).join('') : '<tr><td colspan="9" class="empty-state">Aucun membre du personnel enregistré</td></tr>';
}

let editingStaffIndex = null;

function openStaffModal(i){
  editingStaffIndex = (typeof i === 'number') ? i : null;
  document.querySelector('#staffModal h3').textContent = editingStaffIndex!==null ? "Modifier le Membre du Personnel" : "Nouveau Membre du Personnel";

  if(editingStaffIndex !== null){
    const s = DB.get(DB.KEYS.staffAdmin, [])[editingStaffIndex];
    document.getElementById('mNom').value = s.nom;
    document.getElementById('mPrenom').value = s.prenom;
    document.getElementById('mPoste').value = s.poste;
    document.getElementById('mService').value = s.service;
    document.getElementById('mDateEmbauche').value = s.dateEmbauche || '';
    document.getElementById('mSalaire').value = s.salaireFixe;
    document.getElementById('mMode').value = s.mode;
    document.getElementById('mTel').value = s.tel || '';
  } else {
    ['mNom','mPrenom','mService','mDateEmbauche','mSalaire','mTel'].forEach(f=>document.getElementById(f).value='');
  }
  document.getElementById('staffModal').classList.add('open');
}
function closeStaffModal(){
  document.getElementById('staffModal').classList.remove('open');
  editingStaffIndex = null;
}

function saveStaff(){
  const nom = document.getElementById('mNom').value.trim();
  const prenom = document.getElementById('mPrenom').value.trim();
  const salaire = Number(document.getElementById('mSalaire').value);
  if(!nom || !prenom || !salaire){ toast('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> Nom, prénom et salaire sont obligatoires'); return; }

  const staff = DB.get(DB.KEYS.staffAdmin, []);
  const fields = {
    nom, prenom,
    poste: document.getElementById('mPoste').value,
    service: document.getElementById('mService').value,
    dateEmbauche: document.getElementById('mDateEmbauche').value,
    salaireFixe: salaire,
    mode: document.getElementById('mMode').value,
    tel: document.getElementById('mTel').value
  };

  if(editingStaffIndex !== null){
    staff[editingStaffIndex] = { ...staff[editingStaffIndex], ...fields };
    DB.set(DB.KEYS.staffAdmin, staff);
    DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>', `Modification du dossier de ${nom} ${prenom} (${fields.poste})`);
    toast('✔ Membre du personnel modifié');
  } else {
    staff.push({ id: DB.uid(DB.matriculePrefix()+'-STF'), statut:'Actif', ...fields });
    DB.set(DB.KEYS.staffAdmin, staff);
    DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-speech-icon lucide-speech"><path d="M8.8 20v-4.1l1.9.2a2.3 2.3 0 0 0 2.164-2.1V8.3A5.37 5.37 0 0 0 2 8.25c0 2.8.656 3.054 1 4.55a5.77 5.77 0 0 1 .029 2.758L2 20"/><path d="M19.8 17.8a7.5 7.5 0 0 0 .003-10.603"/><path d="M17 15a3.5 3.5 0 0 0-.025-4.975"/></svg>\u200d<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wallet-cards-icon lucide-wallet-cards"><path d="M3 11h3.75a2 2 0 0 1 1.6.8l.45.6a4 4 0 0 0 6.4 0l.45-.6a2 2 0 0 1 1.6-.8H21"/><path d="M3 7h18"/><rect x="3" y="3" width="18" height="18" rx="2"/></svg>', `Ajout de ${nom} ${prenom} au personnel administratif (${fields.poste})`);
    toast('✔ Membre du personnel ajouté');
  }
  closeStaffModal();
  renderAll();
}

function toggleStaff(i){
  const staff = DB.get(DB.KEYS.staffAdmin, []);
  staff[i].statut = staff[i].statut === 'Actif' ? 'Inactif' : 'Actif';
  DB.set(DB.KEYS.staffAdmin, staff);
  renderAll();
}
function deleteStaff(i){
  const staff = DB.get(DB.KEYS.staffAdmin, []);
  const s = staff[i];
  if(!confirm(`Supprimer ${s.prenom} ${s.nom} du personnel administratif ?\n\nSes bulletins de paie déjà générés seront conservés dans l'historique.`)) return;
  staff.splice(i,1);
  DB.set(DB.KEYS.staffAdmin, staff);
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>', `Suppression de ${s.prenom} ${s.nom} du personnel administratif`);
  renderAll();
  toast('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Membre supprimé');
}

function genererPaieMois(){
  const staff = DB.get(DB.KEYS.staffAdmin, []).filter(s=>s.statut==='Actif');
  if(!staff.length){ toast('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> Aucun personnel actif'); return; }
  const curMonth = new Date().toISOString().slice(0,7);
  let payroll = DB.get(DB.KEYS.payroll, []);
  const dejaTraite = payroll.some(p => p.type==='admin' && p.mois===curMonth);
  if(dejaTraite){
    if(!confirm('La paie du personnel administratif a déjà été générée pour ce mois.\n\nRégénérer va annuler l\'ancienne sortie de caisse et la recréer. Continuer ?')) return;
    // annule l'ancienne dépense correspondante avant de régénérer
    const depenses = DB.get(DB.KEYS.depenses, []).filter(d => d.reference !== 'PAIE-ADMIN-'+curMonth);
    DB.set(DB.KEYS.depenses, depenses);
  }
  payroll = payroll.filter(p => !(p.type==='admin' && p.mois===curMonth)); // évite doublons

  const lignes = staff.map(s=>{
    const salaireBrut = Number(s.salaireFixe||0);
    const cantine = DB.totalConsommationCantine(s.id, curMonth);
    const salaireNet = Math.max(0, salaireBrut - cantine);
    return {
      id: DB.uid('PAIE'), type:'admin', staffId: s.id, nom: `${s.nom} ${s.prenom}`,
      poste: s.poste, mois: curMonth, salaireBrutAvantCantine: salaireBrut,
      cantineDeduite: cantine, salaireNet,
      datePaiement: new Date().toISOString().slice(0,10)
    };
  });
  const total = lignes.reduce((s,l)=>s+l.salaireNet,0);
  const totalCantine = lignes.reduce((s,l)=>s+l.cantineDeduite,0);
  const soldeAvant = DB.soldeCaisse();
  if(total > soldeAvant){
    if(!confirm(`Le solde de caisse actuel (${DB.fmtFCFA(soldeAvant)}) est insuffisant pour couvrir la masse salariale (${DB.fmtFCFA(total)}).\n\nLa caisse passera en négatif (${DB.fmtFCFA(soldeAvant-total)}). Continuer quand même ?`)) return;
  }

  payroll = payroll.concat(lignes);
  DB.set(DB.KEYS.payroll, payroll);

  DB.enregistrerDepense({
    categorie:'Paie Personnel Administratif',
    libelle:`Paie du personnel administratif — ${curMonth} (${staff.length} membre(s))`,
    montant: total, reference:'PAIE-ADMIN-'+curMonth
  });

  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-hand-coins-icon lucide-hand-coins"><path d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"/><path d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/><path d="m2 16 6 6"/><circle cx="16" cy="9" r="2.9"/><circle cx="6" cy="5" r="3"/></svg>', `Génération de la paie du personnel administratif pour ${curMonth} — ${DB.fmtFCFA(total)} débités de la caisse${totalCantine>0 ? ` (dont ${DB.fmtFCFA(totalCantine)} déjà déduits pour consommation cantine)` : ''}`);
  toast(`✔ Paie générée pour ${staff.length} membres — ${DB.fmtFCFA(total)} débités${totalCantine>0 ? ` (cantine déduite : ${DB.fmtFCFA(totalCantine)})` : ''}. Nouveau solde : ${DB.fmtFCFA(DB.soldeCaisse())}`);
  renderAll();
}

function renderPayroll(){
  const payroll = DB.get(DB.KEYS.payroll, []).filter(p=>p.type==='admin');
  document.getElementById('payrollBody').innerHTML = payroll.length ? payroll.slice().reverse().map(p=>`
    <tr>
      <td>${p.mois}</td>
      <td>${p.nom}</td>
      <td>${p.poste}</td>
      <td>${p.cantineDeduite ? '- '+DB.fmtFCFA(p.cantineDeduite) : '-'}</td>
      <td style="font-weight:700;">${DB.fmtFCFA(p.salaireNet)}</td>
      <td>${p.datePaiement}</td>
      <td><button class="btn btn-outline btn-sm" onclick="window.open('paie.html?paie=${p.id}','_blank')"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-save-icon lucide-save"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Bulletin</button></td>
    </tr>`).join('') : '<tr><td colspan="7" class="empty-state">Aucun bulletin généré</td></tr>';
}
