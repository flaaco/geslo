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

  // fige le numéro de reçu et le code paiement une seule fois, puis les persiste
  if(!payment.numero) payment.numero = DB.receiptNumber();
  if(!payment.codePaiement) payment.codePaiement = DB.codePaiement();
  const pIdx = payments.findIndex(p=>p.id===payment.id);
  if(pIdx>-1){ payments[pIdx] = payment; DB.set(DB.KEYS.payments, payments); }

  const el = students.find(s=>s.id===payment.eleveId) || {};
  const items = payment.items && payment.items.length ? payment.items : [{type: payment.type || 'Paiement', montant: payment.montantPaye}];
  const dt = new Date(payment.date || Date.now());

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
      <div class="doc-org">${(settings.etablissement || 'CEPEED School International').toUpperCase()}</div>
      <div class="doc-meta">Pointe-Noire / Mbota-Carlos</div>
    </div>

    <div class="doc-title">REÇU</div>

    <div class="doc-row">
      <div class="doc-col">
        <div class="doc-field"><b>Date</b>: ${dt.toLocaleDateString('fr-FR')} &nbsp; Heure: ${dt.toLocaleTimeString('fr-FR')}</div>
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

    <div class="doc-note">
      NB: - Tous les frais payés à la caisse ne sont pas remboursables.<br>
      &nbsp;&nbsp;&nbsp;- Tout reçu raturé ou falsifié est sans valeur.
    </div>

    <div class="doc-sign">
      <div></div>
      <div class="line">Signature</div>
    </div>
  `;
});
