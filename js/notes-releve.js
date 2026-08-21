document.addEventListener('DOMContentLoaded', ()=>{
  const params = new URLSearchParams(location.search);
  const classe = params.get('classe') || '';
  const trimestre = params.get('trimestre') && DB.TRIMESTRES.includes(params.get('trimestre')) ? params.get('trimestre') : DB.TRIMESTRES[0];
  const settings = DB.get(DB.KEYS.settings, {});
  const page = document.getElementById('relevePage');

  const matieres = DB.matieresDeClasse(classe);
  const classement = DB.classementClasse(classe, trimestre);

  const lignes = classement.map(l=>{
    const cellules = matieres.map(m=>{
      const r = DB.moyenneMatiereEleve(l.eleve.id, m.id, trimestre);
      return r ? r.moyenne.toFixed(2) : '—';
    });
    return {...l, cellules};
  });

  const headMatieres = matieres.map(m=>`<th class="num">${m.nom}<br><span style="font-weight:400;">(coef. ${m.coefficient})</span></th>`).join('');
  const rows = lignes.length ? lignes.map(l=>`
    <tr>
      <td>${l.eleve.prenom} ${l.eleve.nom}</td>
      ${l.cellules.map(c=>`<td class="num">${c}</td>`).join('')}
      <td class="num" style="font-weight:800;">${l.moyenne!==null ? l.moyenne.toFixed(2) : '—'}</td>
      <td class="num">${l.rang ? l.rang+'e' : '—'}</td>
    </tr>`).join('') : `<tr><td colspan="${matieres.length+3}" class="empty-state">Aucun élève dans cette classe</td></tr>`;

  page.innerHTML = `
    <div class="doc-head">
      ${DB.docCrestHTML(settings)}
      <div class="doc-country">RÉPUBLIQUE DU CONGO</div>
      <div class="doc-org" style="font-size:18px;">${(settings.etablissement || 'Établissement Scolaire').toUpperCase()}</div>
    </div>

    <div class="doc-title" style="font-size:16px;">RELEVÉ DE NOTES — CLASSE ${classe.toUpperCase()} — ${trimestre.toUpperCase()}</div>
    <div class="doc-field mb-16">Année scolaire ${settings.annee || '2025-2026'} — Effectif : ${classement.length} élève(s) — Généré le ${new Date().toLocaleDateString('fr-FR')}</div>

    <table class="doc-table">
      <thead><tr><th>Élève</th>${headMatieres}<th class="num">Moy. Générale</th><th class="num">Rang</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="doc-note">
      La moyenne de chaque matière correspond à la moyenne de tous les devoirs (Devoir de Classe, Devoir de Département, Composition) déjà notés dans cette matière pour le ${trimestre}. La moyenne générale trimestrielle est pondérée par le coefficient de chaque matière.
    </div>

    <div class="doc-sign">
      <div class="line">Le Directeur des Études</div>
      <div class="line">Le Chef d'Établissement</div>
    </div>
  `;
});
