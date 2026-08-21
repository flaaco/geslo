document.addEventListener('DOMContentLoaded', ()=>{
  const params = new URLSearchParams(location.search);
  const eleveId = params.get('eleve');
  const students = DB.get(DB.KEYS.students, []);
  const settings = DB.get(DB.KEYS.settings, {});
  const page = document.getElementById('fichePage');

  const el = students.find(s=>s.id===eleveId);
  if(!el){
    page.innerHTML = '<div class="empty-state">Aucun élève trouvé.</div>';
    return;
  }

  const histo = el.historique && el.historique.length ? el.historique : [{annee: settings.annee || '2025-2026', classe: el.classe, moyenne:null, decision:'En cours'}];
  const ps = DB.paymentStatus(el.id);
  const echeances = DB.get(DB.KEYS.echeances, []).filter(e=>e.eleveId===el.id);
  const documents = DB.get(DB.KEYS.documents, []).filter(d=>d.eleveId===el.id);
  const statusLabel = {paye:'À jour des paiements', acompte:'Paiement partiel en cours', nonpaye:'Impayés en attente'};

  page.innerHTML = `
    <div class="doc-photo">${el.photo ? `<img src="${el.photo}" alt="Photo">` : '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-round-icon lucide-user-round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>'}</div>
    <div class="doc-head">
      ${DB.docCrestHTML(settings)}
      <div class="doc-country">RÉPUBLIQUE DU CONGO</div>
      <div class="doc-org">${(settings.etablissement || 'Établissement Scolaire').toUpperCase()}</div>
      <div class="doc-meta">${settings.adresse || 'Pointe-Noire / Mbota-Carlos'}</div>
    </div>

    <div class="doc-title">FICHE ÉLÈVE</div>

    <div class="doc-row">
      <div class="doc-col">
        <div class="doc-field"><b>Matricule</b>: ${el.id}</div>
        <div class="doc-field"><b>Nom</b>: ${el.nom}</div>
        <div class="doc-field"><b>Postnom</b>: ${el.postnom || '-'}</div>
        <div class="doc-field"><b>Prénom</b>: ${el.prenom}</div>
        <div class="doc-field"><b>Sexe</b>: ${el.sexe==='F'?'Féminin':'Masculin'}</div>
      </div>
      <div class="doc-col">
        <div class="doc-field"><b>Date de Naissance</b>: ${el.naissance || '-'}</div>
        <div class="doc-field"><b>Lieu de Naissance</b>: ${el.lieuNaissance || '-'}</div>
        <div class="doc-field"><b>Nationalité</b>: ${el.nationalite || '-'}</div>
        <div class="doc-field"><b>Classe</b>: ${el.classe}</div>
        <div class="doc-field"><b>Statut</b>: ${el.statut}</div>
      </div>
    </div>

    <div class="section-title">Historique Scolaire</div>
    <table class="doc-table">
      <thead><tr><th>Année</th><th>Classe</th><th class="num">Moyenne</th><th>Décision</th></tr></thead>
      <tbody>
        ${histo.slice().reverse().map(h=>`<tr><td>${h.annee}</td><td>${h.classe}</td><td class="num">${h.moyenne!=null?h.moyenne.toFixed(2):'--'}</td><td>${h.decision}</td></tr>`).join('')}
      </tbody>
    </table>

    <div class="section-title">Situation Financière — ${statusLabel[ps.status]}</div>
    <table class="doc-table">
      <thead><tr><th>Type de Frais</th><th>Mois</th><th class="num">Payé</th><th class="num">Reste Dû</th></tr></thead>
      <tbody>
        ${echeances.length ? echeances.map(e=>`<tr><td>${e.type}</td><td>${e.mois||'-'}</td><td class="num">${DB.fmtFCFA(e.montantPaye)}</td><td class="num">${DB.fmtFCFA(e.montantDu)}</td></tr>`).join('')
          : '<tr><td colspan="4" class="empty-state">Aucune échéance enregistrée</td></tr>'}
        <tr class="doc-total-row"><td colspan="3">TOTAL RESTE DÛ</td><td class="num">${DB.fmtFCFA(ps.totalDu)}</td></tr>
      </tbody>
    </table>

    <div class="section-title">Documents Numérisés au Dossier</div>
    <div class="doc-note" style="margin-top:0;">
      ${documents.length ? documents.map(d=>`• ${d.label} (${d.filename})`).join('<br>') : 'Aucun document numérisé au dossier.'}
    </div>

    <div class="doc-sign">
      <div class="line">Le Chef d'Établissement</div>
      <div class="line">Cachet de l'École</div>
    </div>
  `;
});
