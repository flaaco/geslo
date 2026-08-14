document.addEventListener('DOMContentLoaded', ()=>{
  renderEcheances();

  const students = DB.get(DB.KEYS.students, []);
  document.getElementById('eEleve').innerHTML = students.map(s=>`<option value="${s.id}">${s.prenom} ${s.nom} (${s.id}) — ${s.classe}</option>`).join('');
  const fees = DB.get(DB.KEYS.fees, []).filter(f=>f.actif);
  document.getElementById('eType').innerHTML = fees.map(f=>`<option value="${f.type}">${f.type}</option>`).join('');
  document.getElementById('eMois').value = new Date().toISOString().slice(0,7);
  document.getElementById('eDate').value = new Date().toISOString().slice(0,10);

  const majMontant = ()=>{
    const eleve = students.find(s=>s.id===document.getElementById('eEleve').value);
    const type = document.getElementById('eType').value;
    document.getElementById('eMontant').value = DB.tarifFrais(type, eleve ? eleve.classe : null);
  };
  document.getElementById('eType').addEventListener('change', majMontant);
  document.getElementById('eEleve').addEventListener('change', majMontant);
  majMontant();
});

function renderEcheances(){
  const students = DB.get(DB.KEYS.students, []);
  const today = new Date();
  const echeances = DB.get(DB.KEYS.echeances, []).filter(e=>e.montantDu>0 && (!e.dateEcheance || new Date(e.dateEcheance) <= today))
    .sort((a,b)=> (a.dateEcheance||'').localeCompare(b.dateEcheance||''));

  document.getElementById('echeancesBody').innerHTML = echeances.length ? echeances.map(e=>{
    const el = students.find(s=>s.id===e.eleveId) || {nom:'?',prenom:'?',classe:'?'};
    const late = e.dateEcheance && new Date(e.dateEcheance) < today;
    return `<tr>
      <td>${e.eleveId}</td>
      <td>${el.prenom} ${el.nom}</td>
      <td>${el.classe}</td>
      <td>${e.type}</td>
      <td>${e.mois || '-'}</td>
      <td>${e.dateEcheance || '-'}</td>
      <td style="font-weight:700;color:var(--red);">${DB.fmtFCFA(e.montantDu)}</td>
      <td><span class="badge ${late?'badge-red':'badge-orange'}">${late?'En retard':'À venir'}${e.statut==='partiel'?' (Acompte)':''}</span></td>
      <td><a class="btn btn-outline btn-sm" href="paiements.html?eleve=${e.eleveId}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-banknote-arrow-down-icon lucide-banknote-arrow-down"><path d="M12 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5"/><path d="m16 19 3 3 3-3"/><path d="M18 12h.01"/><path d="M19 16v6"/><path d="M6 12h.01"/><circle cx="12" cy="12" r="2"/></svg> Encaisser</a></td>
    </tr>`;
  }).join('') : '<tr><td colspan="9" class="empty-state">Aucune échéance en attente <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-party-popper-icon lucide-party-popper"><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/></svg></td></tr>';
}

function openEcheanceModal(){ document.getElementById('echeanceModal').classList.add('open'); }
function closeEcheanceModal(){ document.getElementById('echeanceModal').classList.remove('open'); }

function creerEcheance(){
  const eleveId = document.getElementById('eEleve').value;
  const type = document.getElementById('eType').value;
  const mois = document.getElementById('eMois').value;
  const dateEcheance = document.getElementById('eDate').value;
  const montant = Number(document.getElementById('eMontant').value);
  if(!eleveId || !type || !montant){ toast('⚠ Veuillez remplir tous les champs'); return; }

  const echeances = DB.get(DB.KEYS.echeances, []);
  echeances.push({
    id: DB.uid('ECH'), eleveId, type, mois,
    montantInitial: montant, montantPaye: 0, montantDu: montant,
    dateEcheance, statut: 'du'
  });
  DB.set(DB.KEYS.echeances, echeances);

  const students = DB.get(DB.KEYS.students, []);
  const el = students.find(s=>s.id===eleveId);
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar-days-icon lucide-calendar-days"><path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M8 13h.01"/><path d="M12 13h.01"/><path d="M16 13h.01"/><path d="M8 17h.01"/><path d="M12 17h.01"/><path d="M16 17h.01"/></svg>', `Nouvelle échéance "${type}" (${DB.fmtFCFA(montant)}) créée pour ${el?el.prenom+' '+el.nom:eleveId}`);
  toast('✔ Échéance créée');
  closeEcheanceModal();
  renderEcheances();
}
