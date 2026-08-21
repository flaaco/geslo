document.addEventListener('DOMContentLoaded', ()=>{
  const params = new URLSearchParams(location.search);
  const classe = params.get('classe') || '';
  const trimestre = params.get('trimestre') && DB.TRIMESTRES.includes(params.get('trimestre')) ? params.get('trimestre') : DB.TRIMESTRES[0];
  const eleveId = params.get('eleve') || '';

  const settings = DB.get(DB.KEYS.settings, {});
  const matieres = DB.matieresDeClasse(classe);
  const classement = DB.classementClasse(classe, trimestre);
  const lignes = eleveId ? classement.filter(l=>l.eleve.id===eleveId) : classement;

  const wrap = document.getElementById('bulletinsWrap');
  wrap.innerHTML = lignes.length
    ? lignes.map(l=> bulletinHTML(l, classe, trimestre, matieres, settings)).join('')
    : `<div class="doc-page doc-page-wide"><div class="empty-state">Aucun élève trouvé pour cette classe</div></div>`;
});

function mentionPour(moyenne){
  if(moyenne===null) return '—';
  if(moyenne>=16) return 'Excellent';
  if(moyenne>=14) return 'Très Bien';
  if(moyenne>=12) return 'Bien';
  if(moyenne>=10) return 'Assez Bien';
  return 'Insuffisant';
}

function bulletinHTML(ligne, classe, trimestre, matieres, settings){
  const el = ligne.eleve;

  const rows = matieres.map(m=>{
    const parType = DB.moyennesParTypeMatiereEleve(el.id, m.id, trimestre);
    const r = DB.moyenneMatiereEleve(el.id, m.id, trimestre);
    return `<tr>
      <td>${m.nom}</td>
      <td class="num">${m.coefficient}</td>
      <td class="num">${parType['Devoir de Classe']!==null ? parType['Devoir de Classe'].toFixed(2) : '—'}</td>
      <td class="num">${parType['Devoir de Département']!==null ? parType['Devoir de Département'].toFixed(2) : '—'}</td>
      <td class="num">${parType['Composition']!==null ? parType['Composition'].toFixed(2) : '—'}</td>
      <td class="num" style="font-weight:700;">${r ? r.moyenne.toFixed(2) : '—'}</td>
      <td class="num">${r ? (r.moyenne*m.coefficient).toFixed(2) : '—'}</td>
    </tr>`;
  }).join('');

  const moyenneGenerale = ligne.moyenne;
  const mention = mentionPour(moyenneGenerale);
  const resume = {
    moyenne: moyenneGenerale!==null ? moyenneGenerale.toFixed(2)+'/20' : '—',
    rang: ligne.rang ? (ligne.rang + 'e / ' + ligne.effectif) : '—'
  };

  return `
    <div class="doc-page doc-page-wide">
      <div class="doc-head">
        ${DB.docCrestHTML(settings)}
        <div class="doc-country">RÉPUBLIQUE DU CONGO</div>
        <div class="doc-meta" style="font-weight:700;">MINISTÈRE DE L'ENSEIGNEMENT PRIMAIRE, SECONDAIRE ET TECHNIQUE</div>
        <div class="doc-org" style="font-size:18px;">${(settings.etablissement || 'Établissement Scolaire').toUpperCase()}</div>
      </div>

      <div class="doc-row">
        <div class="doc-col">
          <div class="doc-field"><b>Nom</b>: ${el.nom}</div>
          <div class="doc-field"><b>Prénom</b>: ${el.prenom}</div>
          <div class="doc-field"><b>Matricule</b>: ${el.id}</div>
        </div>
        <div class="doc-col text-right">
          <div class="doc-field"><b>Sexe</b>: ${el.sexe==='F' ? 'Féminin' : 'Masculin'}</div>
          <div class="doc-field"><b>Classe</b>: ${classe}</div>
          <div class="doc-field"><b>Année Scolaire</b>: ${settings.annee || '2025-2026'}</div>
        </div>
      </div>

      <div class="doc-title" style="font-size:15px;letter-spacing:1px;">BULLETIN DE NOTES — ${trimestre.toUpperCase()}</div>

      <table class="doc-table">
        <thead>
          <tr>
            <th>Matière</th><th class="num">Coef.</th>
            <th class="num">Devoir de<br>Classe</th>
            <th class="num">Devoir de<br>Département</th>
            <th class="num">Composition</th>
            <th class="num">Moyenne</th>
            <th class="num">Moy. x Coef.</th>
          </tr>
        </thead>
        <tbody>
          ${rows || `<tr><td colspan="7" class="empty-state">Aucune matière pour cette classe</td></tr>`}
          <tr class="doc-total-row">
            <td colspan="5">MOYENNE GÉNÉRALE DU TRIMESTRE</td>
            <td class="num">${moyenneGenerale!==null ? moyenneGenerale.toFixed(2)+'/20' : '—'}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div class="doc-row">
        <div class="doc-col">
          <div class="doc-field"><b>Rang</b>: ${ligne.rang ? ligne.rang+'e' : '—'} / ${ligne.effectif} élèves</div>
          <div class="doc-field"><b>Matières notées</b>: ${ligne.nbMatieresNotees} / ${ligne.nbMatieresTotal}</div>
        </div>
        <div class="doc-col text-right">
          <div class="doc-field"><b>Mention</b>: ${mention}</div>
        </div>
      </div>

      <div class="doc-note">
        La moyenne de chaque matière est la moyenne de tous les devoirs notés ce trimestre dans cette matière (Devoir de Classe, Devoir de Département, Composition). La moyenne générale est pondérée par le coefficient de chaque matière — seules les matières déjà notées ce trimestre entrent dans le calcul.
      </div>

      <div class="doc-sign">
        <div class="doc-qr-box">
          ${DB.qrCodeSVG ? DB.qrCodeSVG(DB.qrBulletinDETexte(el, classe, trimestre, resume), 4) : ''}
          <div class="doc-qr-label">Code de vérification du document</div>
        </div>
        <div class="line">Le Directeur des Études</div>
        <div class="line">Le Chef d'Établissement</div>
      </div>
    </div>
  `;
}
