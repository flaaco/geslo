document.addEventListener('DOMContentLoaded', ()=>{
  const params = new URLSearchParams(location.search);
  const type = params.get('type') || 'Situation Financière';
  const classeFilter = params.get('classe') || '';
  const settings = DB.get(DB.KEYS.settings, {});
  const students = DB.get(DB.KEYS.students, []).filter(s => !classeFilter || s.classe===classeFilter);
  const payments = DB.get(DB.KEYS.payments, []);
  const page = document.getElementById('reportPage');

  let body = '';

  if(type === 'Journal de Caisse'){
    const depenses = DB.get(DB.KEYS.depenses, []);
    const allStudents = DB.get(DB.KEYS.students, []);
    const entrees = payments.map(p=>{
      const el = allStudents.find(s=>s.id===p.eleveId) || {nom:'',prenom:''};
      return {date:p.date, libelle:`Paiement ${p.type} — ${el.prenom} ${el.nom}`, entree:p.montantPaye, sortie:0};
    });
    const sorties = depenses.map(d=> ({date:d.date, libelle:d.libelle, entree:0, sortie:d.montant}));
    const ecritures = entrees.concat(sorties).sort((a,b)=> (a.date||'').localeCompare(b.date||''));
    let solde = 0;
    const rows = ecritures.map(e=>{
      solde += e.entree - e.sortie;
      return `<tr><td>${e.date}</td><td>${e.libelle}</td><td class="num">${e.entree?DB.fmtFCFA(e.entree):'-'}</td><td class="num">${e.sortie?DB.fmtFCFA(e.sortie):'-'}</td><td class="num" style="font-weight:700;">${DB.fmtFCFA(solde)}</td></tr>`;
    }).join('');
    body = `
      <table class="doc-table">
        <thead><tr><th>Date</th><th>Libellé</th><th class="num">Entrée</th><th class="num">Sortie</th><th class="num">Solde Cumulé</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="5" class="empty-state">Aucune écriture</td></tr>'}</tbody>
      </table>`;
  } else if(type === 'Grand Livre'){
    const rows = payments.filter(p => !classeFilter || (students.find(s=>s.id===p.eleveId)));
    body = `
      <table class="doc-table">
        <thead><tr><th>Date</th><th>Élève</th><th>Matricule</th><th>Type</th><th class="num">Montant Payé</th><th>Mode</th><th>Caissier</th></tr></thead>
        <tbody>
          ${rows.map(p=>{
            const el = students.find(s=>s.id===p.eleveId) || DB.get(DB.KEYS.students,[]).find(s=>s.id===p.eleveId) || {nom:'',prenom:''};
            return `<tr><td>${p.date}</td><td>${el.prenom} ${el.nom}</td><td>${p.eleveId}</td><td>${p.type}</td><td class="num">${DB.fmtFCFA(p.montantPaye)}</td><td>${p.mode||'-'}</td><td>${p.caissier||'-'}</td></tr>`;
          }).join('') || '<tr><td colspan="7" class="empty-state">Aucune écriture</td></tr>'}
        </tbody>
      </table>`;
  } else if(type === 'État Débiteurs'){
    const list = students.map(s=>({el:s, ps:DB.paymentStatus(s.id)})).filter(r=>r.ps.status!=='paye');
    body = `
      <table class="doc-table">
        <thead><tr><th>Élève</th><th>Matricule</th><th>Classe</th><th>Statut</th><th class="num">Total Dû</th><th class="num">Mois de Retard</th></tr></thead>
        <tbody>
          ${list.map(r=>`<tr><td>${r.el.prenom} ${r.el.nom}</td><td>${r.el.id}</td><td>${r.el.classe}</td><td>${r.ps.status==='acompte'?'Acompte':'Non Payé'}</td><td class="num">${DB.fmtFCFA(r.ps.totalDu)}</td><td class="num">${r.ps.moisRetard}</td></tr>`).join('') || '<tr><td colspan="6" class="empty-state">Aucun débiteur <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-party-popper-icon lucide-party-popper"><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/></svg></td></tr>'}
        </tbody>
      </table>`;
  } else if(type === 'Synthèse des Encaissements'){
    const debut = params.get('debut') || '';
    const fin = params.get('fin') || '';
    const data = DB.encaissementsParType(debut, fin);
    const rowsType = data.lignes.map(l=>`<tr><td>${l.type}</td><td class="num">${l.nb}</td><td class="num">${DB.fmtFCFA(l.montant)}</td></tr>`).join('')
      || '<tr><td colspan="3" class="empty-state">Aucun encaissement sur cette période</td></tr>';
    const rowsMode = data.modes.map(m=>`<tr><td>${m.mode}</td><td class="num">${DB.fmtFCFA(m.montant)}</td></tr>`).join('')
      || '<tr><td colspan="2" class="empty-state">Aucun encaissement sur cette période</td></tr>';
    body = `
      <table class="doc-table">
        <thead><tr><th>Type de Frais</th><th class="num">Nb Paiements</th><th class="num">Montant Encaissé</th></tr></thead>
        <tbody>${rowsType}</tbody>
        <tfoot><tr class="doc-total-row"><td>TOTAL (${data.nbPaiements} paiement(s))</td><td></td><td class="num">${DB.fmtFCFA(data.total)}</td></tr></tfoot>
      </table>
      <div class="section-title mt-16" style="font-size:13px;">Répartition par Mode de Paiement</div>
      <table class="doc-table">
        <thead><tr><th>Mode de Paiement</th><th class="num">Montant Encaissé</th></tr></thead>
        <tbody>${rowsMode}</tbody>
      </table>`;
  } else if(type === 'Effectifs'){
    const classes = [...new Set(students.map(s=>s.classe))];
    body = `
      <table class="doc-table">
        <thead><tr><th>Classe</th><th class="num">Effectif</th></tr></thead>
        <tbody>
          ${classes.map(c=>`<tr><td>${c}</td><td class="num">${students.filter(s=>s.classe===c).length}</td></tr>`).join('')}
          <tr class="doc-total-row"><td>TOTAL</td><td class="num">${students.length}</td></tr>
        </tbody>
      </table>`;
  } else {
    const recettes = payments.reduce((s,p)=> s + (Number(p.montantPaye)||0), 0);
    const depenses = DB.get(DB.KEYS.depenses, []).reduce((s,d)=> s + Number(d.montant||0), 0);
    const solde = DB.soldeCaisse();
    const totalDu = students.reduce((s,el)=> s + DB.paymentStatus(el.id).totalDu, 0);
    body = `
      <table class="doc-table">
        <tbody>
          <tr><td>Total des Recettes (Paiements Élèves)</td><td class="num">${DB.fmtFCFA(recettes)}</td></tr>
          <tr><td>Total des Dépenses (Paie, etc.)</td><td class="num">${DB.fmtFCFA(depenses)}</td></tr>
          <tr class="doc-total-row"><td>Solde de Caisse Actuel</td><td class="num" style="font-weight:800;">${DB.fmtFCFA(solde)}</td></tr>
          <tr><td>Total des Créances (Restes à Payer)</td><td class="num" style="font-weight:800;color:var(--red);">${DB.fmtFCFA(totalDu)}</td></tr>
          <tr><td>Nombre d'Élèves ${classeFilter?('— '+classeFilter):''}</td><td class="num">${students.length}</td></tr>
          <tr><td>Nombre de Paiements Enregistrés</td><td class="num">${payments.length}</td></tr>
        </tbody>
      </table>`;
  }

  page.innerHTML = `
    <div class="doc-head">
      ${DB.docCrestHTML(settings)}
      <div class="doc-country">RÉPUBLIQUE DU CONGO</div>
      <div class="doc-org">${(settings.etablissement || 'Établissement Scolaire').toUpperCase()}</div>
      <div class="doc-meta">${settings.adresse || 'Pointe-Noire / Mbota-Carlos'}</div>
    </div>
    <div class="doc-title" style="font-size:16px;">${type.toUpperCase()}${classeFilter ? ' — '+classeFilter : ''}</div>
    <div class="doc-field mb-16">${params.get('label') ? ('Période : ' + params.get('label') + ' — ') : ''}Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} — Année scolaire ${settings.annee || '2025-2026'}</div>
    ${body}
    <div class="doc-sign">
      <div></div>
      <div class="line">Le Comptable</div>
    </div>
  `;
});
