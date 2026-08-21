document.addEventListener('DOMContentLoaded', ()=>{
  const params = new URLSearchParams(location.search);
  const personId = params.get('personId');
  const mois = params.get('mois') || new Date().toISOString().slice(0,7);
  const settings = DB.get(DB.KEYS.settings, {});
  const page = document.getElementById('relevePage');

  const teacher = DB.get(DB.KEYS.teachers, []).find(t=>t.id===personId);
  const staff = DB.get(DB.KEYS.staffAdmin, []).find(s=>s.id===personId);
  const personType = teacher ? 'enseignant' : 'admin';
  const person = teacher || staff;

  if(!person){
    page.innerHTML = '<div class="empty-state">Personne introuvable.</div>';
    return;
  }

  const conso = DB.get(DB.KEYS.cantineConso, [])
    .filter(c => c.personId === personId && c.date.startsWith(mois))
    .sort((a,b)=> a.date.localeCompare(b.date));

  const due = DB.duPersonnelAvantCantine(person, personType, mois);
  const totalConso = conso.reduce((s,c)=>s+Number(c.montant||0),0);
  const net = due.montant - totalConso;

  const [an, m] = mois.split('-');
  const moisLabel = new Date(Number(an), Number(m)-1, 1).toLocaleDateString('fr-FR', {month:'long', year:'numeric'});

  const rows = conso.map(c=>`<tr><td>${c.date}</td><td>${c.description}</td><td class="num">${DB.fmtFCFA(c.montant)}</td></tr>`).join('')
    || '<tr><td colspan="3" class="empty-state">Aucune consommation enregistrée ce mois-ci</td></tr>';

  page.innerHTML = `
    <div class="doc-row" style="margin-bottom:0;">
      <div class="doc-col" style="display:flex;gap:10px;align-items:flex-start;">
        ${settings.logo ? `<img src="${settings.logo}" alt="Logo" style="width:44px;height:44px;object-fit:contain;flex-shrink:0;">` : ''}
        <div>
          <div style="font-weight:800;font-size:15px;">${(settings.etablissement || 'Établissement Scolaire').toUpperCase()}</div>
          <div class="doc-field text-muted">Pointe-Noire / Mbota-Carlos — République du Congo</div>
        </div>
      </div>
      <div class="doc-col text-right">
        <div style="font-weight:800;">RELEVÉ DE CONSOMMATION CANTINE</div>
        <div class="doc-field">Période: ${moisLabel}</div>
        <div class="doc-field">Généré le: ${new Date().toLocaleDateString('fr-FR')}</div>
      </div>
    </div>

    <div class="divider"></div>

    <div class="doc-row">
      <div class="doc-col">
        <div style="font-weight:800;margin-bottom:6px;">PERSONNE</div>
        <div class="doc-field"><b>Matricule</b>: ${person.id}</div>
        <div class="doc-field"><b>Nom</b>: ${person.prenom} ${person.nom}</div>
        <div class="doc-field"><b>Fonction</b>: ${personType==='enseignant' ? person.matiere : person.poste}</div>
        <div class="doc-field"><b>Type</b>: ${personType==='enseignant' ? 'Enseignant' : 'Personnel Administratif'}</div>
      </div>
      <div class="doc-col">
        <div style="font-weight:800;margin-bottom:6px;">RÉMUNÉRATION DU MOIS</div>
        ${personType==='enseignant' ? `<div class="doc-field"><b>Heures Prestées</b>: ${due.heures.toFixed(2)} h</div><div class="doc-field"><b>Taux Horaire</b>: ${DB.fmtFCFA(person.tauxHoraire)}</div>` : `<div class="doc-field"><b>Salaire Fixe</b>: ${DB.fmtFCFA(person.salaireFixe)}</div>`}
        <div class="doc-field"><b>Dû (avant cantine)</b>: ${DB.fmtFCFA(due.montant)}</div>
      </div>
    </div>

    <table class="doc-table">
      <thead><tr><th>Date</th><th>Description</th><th class="num">Montant</th></tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr class="doc-total-row"><td colspan="2">TOTAL CONSOMMÉ</td><td class="num">${DB.fmtFCFA(totalConso)}</td></tr></tfoot>
    </table>

    <div class="doc-net-box">
      <span>NET À PAYER (dû − cantine consommée)</span>
      <span style="${net<0?'color:var(--red);':''}">${DB.fmtFCFA(net)}</span>
    </div>
    ${net<0 ? `<div class="doc-note" style="color:var(--red);">La consommation dépasse le montant dû ce mois-ci — le solde négatif sera reporté ou à régulariser directement avec la personne.</div>` : ''}

    <div class="doc-note">
      Ce relevé est établi sur la base des données enregistrées dans le système.
    </div>

    <div class="doc-sign">
      <div class="line">Le Comptable</div>
      <div class="line">Le/La Bénéficiaire</div>
    </div>
  `;
});
