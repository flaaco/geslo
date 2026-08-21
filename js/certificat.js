document.addEventListener('DOMContentLoaded', ()=>{
  const params = new URLSearchParams(location.search);
  const eleveId = params.get('eleve');
  const students = DB.get(DB.KEYS.students, []);
  const settings = DB.get(DB.KEYS.settings, {});
  const page = document.getElementById('certifPage');

  const el = students.find(s=>s.id===eleveId);
  if(!el){
    page.innerHTML = '<div class="empty-state">Aucun élève trouvé.</div>';
    return;
  }

  const naissanceStr = el.naissance ? new Date(el.naissance).toLocaleDateString('fr-FR') : 'non renseignée';
  const today = new Date();
  const numero = 'CERT-' + today.getFullYear() + '-' + String(students.indexOf(el)+1).padStart(4,'0');

  page.innerHTML = `
    <div class="doc-head">
      ${DB.docCrestHTML(settings)}
      <div class="doc-country">RÉPUBLIQUE DU CONGO</div>
      <div class="doc-meta" style="font-weight:700;">MINISTÈRE DE L'ENSEIGNEMENT PRIMAIRE, SECONDAIRE ET TECHNIQUE</div>
      <div class="doc-org">${(settings.etablissement || 'Établissement Scolaire').toUpperCase()}</div>
      <div class="doc-meta">${settings.adresse || 'Pointe-Noire / Mbota-Carlos'}</div>
    </div>

    <div class="doc-title">CERTIFICAT DE SCOLARITÉ</div>

    <div class="doc-field text-right">N° ${numero}</div>

    <div style="margin:28px 0;font-size:14px;line-height:2;text-align:justify;">
      Je soussigné(e), Chef d'Établissement de <b>${(settings.etablissement || 'Établissement Scolaire')}</b>,
      certifie que l'élève :
    </div>

    <div class="doc-row" style="margin:20px 0;">
      <div class="doc-col">
        <div class="doc-field"><b>Nom</b>: ${el.nom}</div>
        <div class="doc-field"><b>Prénom</b>: ${el.prenom}</div>
        <div class="doc-field"><b>Matricule</b>: ${el.id}</div>
      </div>
      <div class="doc-col">
        <div class="doc-field"><b>Né(e) le</b>: ${naissanceStr}</div>
        <div class="doc-field"><b>À</b>: ${el.lieuNaissance || 'non renseigné'}</div>
        <div class="doc-field"><b>Nationalité</b>: ${el.nationalite || 'non renseignée'}</div>
      </div>
    </div>

    <div style="margin:20px 0;font-size:14px;line-height:2;text-align:justify;">
      est régulièrement inscrit(e) dans notre établissement en classe de <b>${el.classe}</b>,
      au titre de l'année scolaire <b>${settings.annee || '2025-2026'}</b>.
    </div>

    <div style="margin:20px 0;font-size:14px;line-height:2;text-align:justify;">
      En foi de quoi, le présent certificat lui est délivré pour servir et valoir ce que de droit.
    </div>

    <div class="doc-field text-right mt-16">Fait à ${(settings.adresse || 'Pointe-Noire').split('/')[0].trim()}, le ${today.toLocaleDateString('fr-FR')}</div>

    <div class="doc-sign">
      <div></div>
      <div class="line">Le Chef d'Établissement<br>(Cachet et Signature)</div>
    </div>
  `;
});
