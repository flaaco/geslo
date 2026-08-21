document.addEventListener('DOMContentLoaded', ()=>{
  renderDashboard(true);

  // --- Temps réel : le tableau de bord se redessine automatiquement dès que
  // des données changent (paiement encaissé, élève ajouté, échéance créée...)
  // sans que l'utilisateur ait besoin de recharger la page.
  window.addEventListener('cepeed:data-changed', () => renderDashboard(false));
  // Changement fait depuis un autre onglet ouvert sur le même poste
  window.addEventListener('storage', () => renderDashboard(false));
  // Filet de sécurité (ex: date qui change pendant que la page reste ouverte)
  setInterval(() => renderDashboard(false), 30000);
});

function renderDashboard(withEntryAnim){
  const settings = DB.get(DB.KEYS.settings, {});
  const students = DB.get(DB.KEYS.students, []);
  const payments = DB.get(DB.KEYS.payments, []);
  const echeances = DB.get(DB.KEYS.echeances, []);
  const activities = DB.get(DB.KEYS.activities, []);
  const depenses = DB.get(DB.KEYS.depenses, []);
  const classes = (DB.getClasses ? DB.getClasses() : DB.CLASSES);

  const now = new Date();
  const curMonthKey = now.toISOString().slice(0,7);

  const monthLabel = now.toLocaleDateString('fr-FR', {month:'long', year:'numeric'}).toUpperCase();
  document.getElementById('dashTitle').textContent = 'TABLEAU DE BORD - ' + monthLabel;
  document.getElementById('dashSubtitle').textContent = 'Vue globale — ' + (settings.etablissement || 'Établissement Scolaire');

  document.getElementById('statEleves').textContent = students.length.toLocaleString('fr-FR');

  const recettesMoisCourant = payments
    .filter(p => (p.date||'').slice(0,7) === curMonthKey)
    .reduce((s,p)=> s + (Number(p.montantPaye)||0), 0);
  document.getElementById('statRecettes').textContent = DB.fmtFCFA(recettesMoisCourant);

  const debiteurs = echeances.filter(e => (Number(e.montantDu)||0) > 0 && (!e.dateEcheance || new Date(e.dateEcheance) <= now));
  // Nombre d'ÉLÈVES débiteurs (pas le nombre d'échéances) : un même élève peut avoir
  // plusieurs échéances en retard (frais différents, mois différents...), il ne doit
  // compter qu'une seule fois.
  const nbElevesDebiteurs = new Set(debiteurs.map(e=>e.eleveId)).size;
  document.getElementById('statDebiteurs').textContent = nbElevesDebiteurs;

  document.getElementById('statSms').innerHTML = activities.filter(a=>a.icon==='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle-more-icon lucide-message-circle-more"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/></svg>').length + ' <span style="font-size:14px;font-weight:600;color:var(--text-muted)">envoyées</span>';

  // Activités récentes
  const list = document.getElementById('activityList');
  if(activities.length === 0){
    list.innerHTML = '<div class="empty-state">Aucune activité récente</div>';
  } else {
    list.innerHTML = activities.slice(0,6).map(a => `
      <div class="activity-item">
        <div class="activity-ico">${a.icon}</div>
        <div>
          <div class="activity-text">${a.text}</div>
          <div class="activity-time">${DB.timeAgo(a.time)}</div>
        </div>
      </div>`).join('');
  }

  // Débiteurs (source unique de vérité : les échéances ouvertes — se met à jour dès qu'un paiement les solde)
  // Regroupés par ÉLÈVE : un élève avec plusieurs mois en retard n'apparaît qu'une
  // seule fois, avec son total dû et l'échéance la plus ancienne — pas une ligne par mois.
  const body = document.getElementById('debtorsBody');
  const idsDebiteurs = [...new Set(debiteurs.map(e=>e.eleveId))];
  if(idsDebiteurs.length === 0){
    body.innerHTML = '<tr><td colspan="7" class="empty-state">Aucun élève en retard de paiement <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-party-popper-icon lucide-party-popper"><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/></svg></td></tr>';
  } else {
    body.innerHTML = idsDebiteurs.map(eleveId=>{
      const el = students.find(s=>s.id===eleveId) || {nom:'?',prenom:'?'};
      const ps = DB.paymentStatus(eleveId);
      const echeancePlusAncienne = ps.records
        .slice()
        .sort((a,b)=>(a.dateEcheance||'').localeCompare(b.dateEcheance||''))[0];
      return `<tr>
        <td>${DB.avatarHTML(el.photo, 34, '50%', 14)}</td>
        <td>${eleveId}</td>
        <td>${el.nom} ${el.prenom}</td>
        <td>${ps.moisRetard>0 ? ps.moisRetard+' mois' : 'Mois en cours'}</td>
        <td>${echeancePlusAncienne ? (echeancePlusAncienne.dateEcheance || '-') : '-'}</td>
        <td style="color:var(--red);font-weight:700;">${DB.fmtFCFA(ps.totalDu)}</td>
        <td class="flex gap-8">
          <a class="btn btn-outline btn-sm" href="paiements.html?eleve=${eleveId}"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-banknote-arrow-down-icon lucide-banknote-arrow-down"><path d="M12 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5"/><path d="m16 19 3 3 3-3"/><path d="M18 12h.01"/><path d="M19 16v6"/><path d="M6 12h.01"/><circle cx="12" cy="12" r="2"/></svg> Encaisser</a>
          <button class="btn btn-outline btn-sm" onclick="envoyerRappelDashboard('${eleveId}')"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bell-ring-icon lucide-bell-ring"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M22 8c0-2.3-.8-4.3-2-6"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/><path d="M4 2C2.8 3.7 2 5.7 2 8"/></svg> Rappel</button>
        </td>
      </tr>`;
    }).join('');
  }

  // Alert header count
  document.querySelector('#alertHeader .alert-box-title').textContent = `ALERTES PAIEMENT EN RETARD (${nbElevesDebiteurs})`;

  /* ============ GRAPHIQUES ============ */

  // 1) Encaissements des 6 derniers mois (courbe dégradée)
  const months = [];
  for(let i=5;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push({key: d.toISOString().slice(0,7), label: capitalize(d.toLocaleDateString('fr-FR',{month:'short'})).replace('.','')});
  }
  const encaissementsParMois = months.map(m =>
    payments.filter(p => (p.date||'').slice(0,7) === m.key).reduce((s,p)=> s + (Number(p.montantPaye)||0), 0)
  );
  CepeedCharts.area('chartEncaissements', {
    values: encaissementsParMois,
    labels: months.map(m=>m.label),
    color: CepeedCharts.PALETTE.blue,
    unit: ' FCFA'
  });

  // 2) Répartition des paiements élèves (payé / partiel / non payé) — statut réel calculé par élève
  let nbPaye = 0, nbPartiel = 0, nbNonPaye = 0;
  students.forEach(s => {
    const ps = DB.paymentStatus(s.id);
    if(ps.status === 'paye') nbPaye++;
    else if(ps.status === 'acompte') nbPartiel++;
    else nbNonPaye++;
  });
  CepeedCharts.donut('chartRepartition', {
    centerTitle: 'Élèves',
    legendId: 'legendRepartition',
    segments: [
      {label:'Payé à jour', value: nbPaye, color: CepeedCharts.PALETTE.green},
      {label:'Paiement partiel', value: nbPartiel, color: CepeedCharts.PALETTE.orange},
      {label:'Non payé', value: nbNonPaye, color: CepeedCharts.PALETTE.red}
    ]
  });

  // 3) Couverture des dépenses du mois par les recettes du mois
  const depensesMoisCourant = depenses.filter(d => (d.date||'').slice(0,7) === curMonthKey)
    .reduce((s,d)=> s + (Number(d.montant)||0), 0);
  const couverture = depensesMoisCourant > 0 ? Math.round((recettesMoisCourant/depensesMoisCourant)*100) : (recettesMoisCourant > 0 ? 100 : 0);
  const couvertureColor = couverture >= 100 ? CepeedCharts.PALETTE.green : couverture >= 50 ? CepeedCharts.PALETTE.orange : CepeedCharts.PALETTE.red;
  CepeedCharts.gauge('chartCouverture', {
    percent: Math.min(100, couverture),
    color: couvertureColor,
    label: 'des dépenses couvertes'
  });
  document.getElementById('couvertureNote').textContent = depensesMoisCourant > 0
    ? `${DB.fmtFCFA(recettesMoisCourant)} encaissés pour ${DB.fmtFCFA(depensesMoisCourant)} de dépenses ce mois.`
    : 'Aucune dépense enregistrée ce mois-ci.';

  // 4) Effectifs par classe
  const classesAvecEleves = classes.filter(c => students.some(s=>s.classe===c));
  const effectifs = classesAvecEleves.map(c => students.filter(s=>s.classe===c).length);
  document.getElementById('boxEffectifs').style.height = Math.max(140, classesAvecEleves.length*26+20) + 'px';
  CepeedCharts.bars('chartEffectifs', {
    labels: classesAvecEleves,
    values: effectifs,
    horizontal: true,
    color: CepeedCharts.PALETTE.blue,
    unit: ' élève(s)'
  });

  // 5) Montant dû par classe (échéances ouvertes uniquement)
  const dusParClasse = {};
  debiteurs.forEach(e => {
    const el = students.find(s=>s.id===e.eleveId);
    const c = el ? el.classe : 'Autre';
    dusParClasse[c] = (dusParClasse[c]||0) + (Number(e.montantDu)||0);
  });
  const classesDues = Object.keys(dusParClasse).sort((a,b)=> dusParClasse[b]-dusParClasse[a]).slice(0,8);
  document.getElementById('boxDus').style.height = Math.max(140, classesDues.length*26+20) + 'px';
  CepeedCharts.bars('chartDus', {
    labels: classesDues.length ? classesDues : ['—'],
    values: classesDues.length ? classesDues.map(c=>dusParClasse[c]) : [0],
    horizontal: true,
    color: CepeedCharts.PALETTE.red,
    unit: ' FCFA'
  });
}

function capitalize(s){ return s ? s.charAt(0).toUpperCase()+s.slice(1) : s; }

function envoyerRappelDashboard(eleveId){
  const students = DB.get(DB.KEYS.students, []);
  const el = students.find(s=>s.id===eleveId);
  const ps = DB.paymentStatus(eleveId);
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle-more-icon lucide-message-circle-more"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/></svg>', `Envoi de SMS de rappel pour ${el.prenom} ${el.nom} — ${DB.fmtFCFA(ps.totalDu)} dû`);
  toast('✔ SMS de rappel envoyé à ' + el.prenom + ' ' + el.nom);
}
