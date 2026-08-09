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

  const brut = record.salaireNet; // base avant retenues (montant de référence enregistré)
  const rubriques = [
    {nom:'Sécurité Sociale (CNSS)', base:brut, tauxSal:5, tauxPat:9},
    {nom:'Assurance Maladie', base:brut, tauxSal:2, tauxPat:4},
    {nom:'INPP (Formation Prof.)', base:brut, tauxSal:0, tauxPat:3},
    {nom:'Allocations Familiales', base:brut, tauxSal:0, tauxPat:6.5}
  ];
  const totalRetenues = rubriques.reduce((s,r)=> s + Math.round(r.base * r.tauxSal/100), 0);
  const totalPatronal = rubriques.reduce((s,r)=> s + Math.round(r.base * r.tauxPat/100), 0);
  const net = brut - totalRetenues;

  const [an, mois] = (record.mois || new Date().toISOString().slice(0,7)).split('-');
  const moisLabel = new Date(an, mois-1, 1).toLocaleDateString('fr-FR', {month:'long', year:'numeric'});

  const rows = rubriques.map(r => `
    <tr>
      <td>${r.nom}</td>
      <td class="num">${DB.fmtFCFA(r.base)}</td>
      <td class="num">${r.tauxSal}%</td>
      <td class="num">${DB.fmtFCFA(Math.round(r.base*r.tauxSal/100))}</td>
      <td class="num">${r.tauxPat}%</td>
      <td class="num">${DB.fmtFCFA(Math.round(r.base*r.tauxPat/100))}</td>
    </tr>`).join('');

  page.innerHTML = `
    <div class="doc-row" style="margin-bottom:0;">
      <div class="doc-col" style="display:flex;gap:10px;align-items:flex-start;">
        ${settings.logo ? `<img src="${settings.logo}" alt="Logo" style="width:44px;height:44px;object-fit:contain;flex-shrink:0;">` : ''}
        <div>
          <div style="font-weight:800;font-size:15px;">${(settings.etablissement || 'CEPEED School International').toUpperCase()}</div>
          <div class="doc-field text-muted">Pointe-Noire / Mbota-Carlos — République du Congo</div>
          <div class="doc-field text-muted">Matricule employeur: ${settings.matriculeEmployeur || 'CEPEED-EMP-001'}</div>
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
        <div class="doc-field"><b>Salaire de Base (Brut)</b>: ${DB.fmtFCFA(brut)}</div>
        ${person && person.tel ? `<div class="doc-field"><b>Téléphone</b>: ${person.tel}</div>` : ''}
        ${person && person.mode ? `<div class="doc-field"><b>Mode de Paiement</b>: ${person.mode}</div>` : ''}
      </div>
    </div>

    <table class="doc-table">
      <thead><tr><th>Rubriques</th><th class="num">Base</th><th class="num">Taux Salarial</th><th class="num">Cot. Salariales</th><th class="num">Taux Patronal</th><th class="num">Cot. Patronales</th></tr></thead>
      <tbody>
        <tr><td style="font-weight:700;">Salaire Brut</td><td class="num">${DB.fmtFCFA(brut)}</td><td colspan="4"></td></tr>
        ${rows}
        <tr class="doc-total-row"><td colspan="3">TOTAL DES RETENUES</td><td class="num">${DB.fmtFCFA(totalRetenues)}</td><td>TOTAL PATRONAL</td><td class="num">${DB.fmtFCFA(totalPatronal)}</td></tr>
      </tbody>
    </table>

    <div class="doc-net-box">
      <span>NET À PAYER AU SALARIÉ</span>
      <span>${DB.fmtFCFA(net)}</span>
    </div>

    <div class="doc-note">
      Ce bulletin est établi sur la base des données enregistrées dans le système CEPEED.
      À conserver sans limitation de durée.
    </div>

    <div class="doc-sign">
      <div class="line">Signature de l'Employeur</div>
      <div class="line">Signature du Salarié</div>
    </div>
  `;
});
