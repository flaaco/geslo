document.addEventListener('DOMContentLoaded', ()=>{
  const params = new URLSearchParams(location.search);
  const paieId = params.get('paie');
  const payroll = DB.get(DB.KEYS.payroll, []);
  const settings = DB.get(DB.KEYS.settings, {});
  const page = document.getElementById('paiePage');

  const record = payroll.find(p=>p.id===paieId) || payroll[payroll.length-1];
  if(!record){
    page.innerHTML = '<div class="empty-state">Aucun bulletin de paie trouvé à imprimer.</div>';
    return;
  }

  const staffAdmin = DB.get(DB.KEYS.staffAdmin, []);
  const teachers = DB.get(DB.KEYS.teachers, []);
  const person = record.type === 'admin'
    ? staffAdmin.find(s=>s.id===record.staffId)
    : teachers.find(t=>t.id===record.staffId);

  const brut = record.salaireBrutAvantCantine != null ? record.salaireBrutAvantCantine : record.salaireNet; // montant gagné (heures pointées ou salaire fixe), avant déduction cantine
  const cantine = record.cantineDeduite || 0;
  const net = Math.max(0, brut - cantine);

  const [an, mois] = (record.mois || new Date().toISOString().slice(0,7)).split('-');
  const moisLabel = new Date(an, mois-1, 1).toLocaleDateString('fr-FR', {month:'long', year:'numeric'});

  page.innerHTML = `
    <div class="doc-row" style="margin-bottom:0;">
      <div class="doc-col" style="display:flex;gap:10px;align-items:flex-start;">
        ${settings.logo ? `<img src="${settings.logo}" alt="Logo" style="width:44px;height:44px;object-fit:contain;flex-shrink:0;">` : ''}
        <div>
          <div style="font-weight:800;font-size:15px;">${(settings.etablissement || 'Établissement Scolaire').toUpperCase()}</div>
          <div class="doc-field text-muted">Pointe-Noire / Mbota-Carlos — République du Congo</div>
          <div class="doc-field text-muted">Matricule employeur: ${settings.matriculeEmployeur || (DB.matriculePrefix().toUpperCase()+'-EMP-001')}</div>
        </div>
      </div>
      <div class="doc-col text-right">
        <div style="font-weight:800;">FICHE DE PAIE</div>
        <div class="doc-field">Période: ${moisLabel}</div>
        <div class="doc-field">Paiement le: ${record.datePaiement}</div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="doc-row">
      <div class="doc-col">
        <div style="font-weight:800;margin-bottom:6px;">SALARIÉ</div>
        <div class="doc-field"><b>Matricule</b>: ${record.staffId}</div>
        <div class="doc-field"><b>Nom</b>: ${record.nom}</div>
        <div class="doc-field"><b>Fonction</b>: ${record.poste}</div>
        ${record.type==='enseignant' ? `<div class="doc-field"><b>Heures Prestées</b>: ${record.heures.toFixed(2)} h</div>` : `<div class="doc-field"><b>Type de Contrat</b>: Salaire Fixe</div>`}
      </div>
      <div class="doc-col">
        <div style="font-weight:800;margin-bottom:6px;">RÉMUNÉRATION</div>
        <div class="doc-field"><b>Salaire (avant cantine)</b>: ${DB.fmtFCFA(brut)}</div>
        ${person && person.tel ? `<div class="doc-field"><b>Téléphone</b>: ${person.tel}</div>` : ''}
        ${person && person.mode ? `<div class="doc-field"><b>Mode de Paiement</b>: ${person.mode}</div>` : ''}
      </div>
    </div>

    <table class="doc-table">
      <thead><tr><th>Rubriques</th><th class="num">Montant</th></tr></thead>
      <tbody>
        <tr><td style="font-weight:700;">${record.type==='enseignant' ? `Salaire (${record.heures.toFixed(2)} h pointées)` : 'Salaire Fixe'}</td><td class="num">${DB.fmtFCFA(brut)}</td></tr>
        ${cantine>0 ? `<tr><td style="color:var(--red);">Consommation Cantine (déduite)</td><td class="num" style="color:var(--red);">- ${DB.fmtFCFA(cantine)}</td></tr>` : ''}
      </tbody>
    </table>

    <div class="doc-net-box">
      <span>NET À PAYER AU SALARIÉ</span>
      <span>${DB.fmtFCFA(net)}</span>
    </div>

    <div class="doc-note">
      Ce bulletin est établi sur la base des données enregistrées dans le système.
      À conserver sans limitation de durée.
    </div>

    <div class="doc-sign">
      <div class="line">Signature de l'Employeur</div>
      <div class="line">Signature du Salarié</div>
    </div>
  `;
});
