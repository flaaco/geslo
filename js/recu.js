document.addEventListener('DOMContentLoaded', ()=>{
  const params = new URLSearchParams(location.search);
  const paymentId = params.get('payment');
  const payments = DB.get(DB.KEYS.payments, []);
  const students = DB.get(DB.KEYS.students, []);
  const settings = DB.get(DB.KEYS.settings, {});

  const payment = payments.find(p=>p.id===paymentId) || payments[payments.length-1];
  const page = document.getElementById('recuPage');

  if(!payment){
    page.innerHTML = '<div class="empty-state">Aucun paiement trouvé à imprimer.</div>';
    return;
  }

  // fige le numéro de reçu, le code paiement ET le code QR de vérification une seule fois,
  // puis les persiste (un document réimprimé garde toujours le même code QR)
  if(!payment.numero) payment.numero = DB.receiptNumber();
  if(!payment.codePaiement) payment.codePaiement = DB.codePaiement();
  if(!payment.qrCode) payment.qrCode = DB.uid('QR');
  const pIdx = payments.findIndex(p=>p.id===payment.id);
  if(pIdx>-1){ payments[pIdx] = payment; DB.set(DB.KEYS.payments, payments); }

  const el = students.find(s=>s.id===payment.eleveId) || {};
  const items = payment.items && payment.items.length ? payment.items : [{type: payment.type || 'Paiement', montant: payment.montantPaye}];
  const dt = payment.horodatage ? new Date(payment.horodatage) : new Date((payment.date||'') + 'T00:00:00');

  // Situation annuelle actualisée de l'élève (recalculée à chaque impression/réimpression)
  const sit = payment.eleveId ? DB.situationAnnuelle(payment.eleveId) : {totalAnnee:0, totalRegle:0, totalRestant:0};
  const moisPayesTransaction = [...new Set(items.flatMap(it=>it.mois||[]))].sort();

  const qrTexte = DB.qrRecuTexte(payment, el, sit, moisPayesTransaction);
  const qrSVG = DB.qrCodeSVG(qrTexte, 4);

  const rows = items.map(it => `
    <tr>
      <td>${it.type}</td>
      <td>${it.mois && it.mois.length ? it.mois.map(m=>DB.fmtMois(m)).join(', ') : '-'}</td>
      <td class="num">${DB.fmtFCFA(it.montant)}</td>
      <td class="num">${DB.fmtFCFA(it.reste || 0)}</td>
    </tr>`).join('');

  page.innerHTML = `
    <div class="doc-head">
      ${DB.docCrestHTML(settings)}
      <div class="doc-country">RÉPUBLIQUE DU CONGO</div>
      <div class="doc-org">${(settings.etablissement || 'Établissement Scolaire').toUpperCase()}</div>
      <div class="doc-meta">Pointe-Noire / Mbota-Carlos</div>
    </div>

    <div class="doc-title">REÇU</div>

    <div class="doc-row">
      <div class="doc-col">
        <div class="doc-field"><b>Date</b>: ${dt.toLocaleDateString('fr-FR')} &nbsp; Heure: ${payment.horodatage ? dt.toLocaleTimeString('fr-FR') : '—'}</div>
        <div class="doc-field"><b>N° Reçu</b>: ${payment.numero}</div>
        <div class="doc-field"><b>Code Paiement</b>: ${payment.codePaiement}</div>
        <div class="doc-field"><b>Session</b>: ${settings.annee || '2025-2026'}</div>
        <div class="doc-field"><b>Percepteur (Caissier)</b>: ${payment.caissier || '-'}</div>
      </div>
      <div class="doc-col">
        <div class="doc-field" style="font-weight:800;margin-bottom:8px;">ÉLÈVE</div>
        <div class="doc-field"><b>Matricule</b>: ${el.id || payment.eleveId}</div>
        <div class="doc-field"><b>Nom</b>: ${el.nom || ''} ${el.prenom || ''}</div>
        <div class="doc-field"><b>Genre</b>: ${el.sexe === 'F' ? 'Féminin' : 'Masculin'}</div>
        <div class="doc-field"><b>Classe</b>: ${el.classe || '-'}</div>
      </div>
    </div>

    <div class="doc-field"><b>OPÉRATION</b></div>
    <div class="doc-field"><b>Montant versé</b>: ${DB.fmtFCFA(payment.montantPaye)} &nbsp; (Mode: ${payment.mode || '-'})</div>

    <table class="doc-table">
      <thead><tr><th>Type de Frais</th><th>Mois Payé(s)</th><th class="num">Montant</th><th class="num">Reste à Payer</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="doc-annual-box">
      <div class="item">Mois réglé(s) durant cette transaction<b>${moisPayesTransaction.length ? moisPayesTransaction.map(m=>DB.fmtMois(m)).join(', ') : '—'}</b></div>
      <div class="item">Total réglé pour l'année scolaire<b style="color:var(--green);">${DB.fmtFCFA(sit.totalRegle)}</b></div>
      <div class="item">Total restant à payer (année scolaire)<b style="color:${sit.totalRestant>0?'var(--red)':'inherit'};">${DB.fmtFCFA(sit.totalRestant)}</b></div>
    </div>

    <div class="doc-note">
      NB: - Tous les frais payés à la caisse ne sont pas remboursables.<br>
      &nbsp;&nbsp;&nbsp;- Tout reçu raturé ou falsifié est sans valeur.
    </div>

    <div class="doc-sign">
      <div class="doc-qr-box">
        ${qrSVG}
        <div class="doc-qr-label">Code de vérification unique du document<br><b>${payment.qrCode}</b></div>
      </div>
      <div class="line">Signature</div>
    </div>
  `;
});
