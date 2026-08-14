let selectedEleve = null;
let dernierMontantPaye = 0;

document.addEventListener('DOMContentLoaded', ()=>{
  const students = DB.get(DB.KEYS.students, []);
  const classes = [...new Set(students.map(s=>s.classe))];
  const sel = document.getElementById('classeFilter');
  classes.forEach(c => sel.innerHTML += `<option value="${c}">${c}</option>`);

  renderClasses();
  renderAlertList();
  renderEleveSummary();
  renderStatsBox();
  renderFicheComplete();

  const params = new URLSearchParams(location.search);
  const eleveId = params.get('eleve');
  if(eleveId) selectEleve(eleveId);
});

/* ---------------- PORTAIL / ALERTES (inchangé) ---------------- */
function renderClasses(){
  const students = DB.get(DB.KEYS.students, []);
  const filter = document.getElementById('classeFilter').value;
  const classes = [...new Set(students.map(s=>s.classe))].filter(c => !filter || c===filter).sort();

  document.getElementById('classCards').innerHTML = classes.map(c=>{
    const classStudents = students.filter(s=>s.classe===c);
    const statuses = classStudents.map(s=>DB.paymentStatus(s.id));
    const nbDebiteurs = statuses.filter(s=>s.status!=='paye').length;
    const totalDu = statuses.reduce((s,x)=>s+x.totalDu,0);
    return `<div class="card" style="background:${nbDebiteurs? 'var(--orange-bg)':'#fff'};cursor:pointer;" onclick="location.href='classe.html?classe=${encodeURIComponent(c)}'">
      <div style="font-weight:800;font-size:13px;">CLASSE: ${c} (Alertes: ${nbDebiteurs})</div>
      <div class="small mt-8">
        ${nbDebiteurs ? `${nbDebiteurs} élève(s) en retard — <b>${DB.fmtFCFA(totalDu)}</b> au total.` : 'Aucune alerte pour cette classe.'}
      </div>
      <div class="link-btn small mt-8">Voir la classe →</div>
    </div>`;
  }).join('') || '<div class="empty-state">Aucune classe</div>';
}

/* Une alerte par ÉLÈVE (pas une par échéance/mois) : un élève avec plusieurs mois
   en retard n'apparaît qu'une fois, avec son total dû. */
function renderAlertList(){
  const students = DB.get(DB.KEYS.students, []);
  const today = new Date();
  const echeances = DB.get(DB.KEYS.echeances, []).filter(e=>e.montantDu>0 && (!e.dateEcheance || new Date(e.dateEcheance) <= today));
  const idsDebiteurs = [...new Set(echeances.map(e=>e.eleveId))];
  document.getElementById('alertList').innerHTML = idsDebiteurs.length ? idsDebiteurs.map(eleveId=>{
    const el = students.find(s=>s.id===eleveId) || {nom:'?',prenom:'?',classe:'?'};
    const ps = DB.paymentStatus(eleveId);
    return `<li><a href="classe.html?classe=${encodeURIComponent(el.classe)}">${el.prenom} ${el.nom} (${el.classe})</a>${ps.moisRetard>0 ? ' — '+ps.moisRetard+' mois de retard' : ''}: <b>${DB.fmtFCFA(ps.totalDu)} dû</b></li>`;
  }).join('') : '<li>Aucune alerte</li>';
}

function genererRapportRetard(){
  const history = DB.get('cepeed_rapports_history', []);
  history.unshift({type:'État Débiteurs', date: new Date().toLocaleDateString('fr-FR') + ' - ' + new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})});
  DB.set('cepeed_rapports_history', history.slice(0,10));
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16c.5-2 1.5-7 4-7 2 0 2 3 4 3 2.5 0 4.5-5 5-7"/></svg>', 'Génération du rapport "État Débiteurs"');
  toast('✔ Rapport de retard généré');
  setTimeout(()=> location.href='rapports.html', 600);
}

function envoyerConfirmationSMS(){
  if(!selectedEleve){ toast('⚠ Sélectionnez un élève d\'abord'); return; }
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/></svg>', `SMS de confirmation de paiement envoyé à ${selectedEleve.prenom} ${selectedEleve.nom}`);
  toast('✔ SMS de confirmation envoyé à ' + selectedEleve.prenom + ' ' + selectedEleve.nom);
}

/* ---------------- RECHERCHE / SÉLECTION ÉLÈVE ---------------- */
function filterEleve(q){
  const students = DB.get(DB.KEYS.students, []);
  q = q.trim().toLowerCase();
  const box = document.getElementById('eleveResults');
  if(!q){ box.innerHTML=''; return; }
  const matches = students.filter(s => (s.nom+' '+s.prenom+' '+s.id).toLowerCase().includes(q)).slice(0,6);
  box.innerHTML = matches.map(s=>`<div class="link-btn" style="display:block;padding:4px 0;" onclick="selectEleve('${s.id}')">${s.prenom} ${s.nom} — ${s.id} (${s.classe})</div>`).join('') || 'Aucun résultat';
}

function lockEleve(){
  const val = document.getElementById('searchPayEleve').value.trim();
  const students = DB.get(DB.KEYS.students, []);
  const match = students.find(s => (s.nom+' '+s.prenom+' '+s.id).toLowerCase().includes(val.toLowerCase()));
  if(match) selectEleve(match.id); else toast('⚠ Élève introuvable');
}

function selectEleve(id){
  const students = DB.get(DB.KEYS.students, []);
  const el = students.find(s=>s.id===id);
  if(!el) return;
  selectedEleve = el;
  dernierMontantPaye = 0;
  window.__lastPaymentId = null;
  document.getElementById('searchPayEleve').value = `${el.id} (${el.prenom} ${el.nom})`;
  document.getElementById('eleveResults').innerHTML = '';
  renderEleveSummary();
  renderStatsBox();
  renderFicheComplete();
}

function renderEleveSummary(){
  const box = document.getElementById('eleveSummaryBox');
  if(!selectedEleve){ box.innerHTML = '<div class="empty-state small">Aucun élève sélectionné.</div>'; return; }
  const ps = DB.paymentStatus(selectedEleve.id);
  const statusLabel = {paye:['✔ À jour','badge-green'], acompte:['◐ Acompte','badge-orange'], nonpaye:['✕ Non Payé','badge-red']};
  const [label, cls] = statusLabel[ps.status];
  box.innerHTML = `
    <div class="flex gap-12" style="align-items:center;">
      ${DB.avatarHTML(selectedEleve.photo, 46, '50%', 15)}
      <div style="flex:1;">
        <div style="font-weight:800;">${selectedEleve.prenom} ${selectedEleve.nom}</div>
        <div class="small text-muted">${selectedEleve.classe} — ${selectedEleve.id}</div>
      </div>
      <span class="badge ${cls}">${label}</span>
    </div>`;
}

/* ---------------- STATISTIQUES ANNUELLES (4 montants demandés) ---------------- */
function renderStatsBox(){
  const box = document.getElementById('statsBox');
  if(!selectedEleve){ box.innerHTML = ''; return; }
  const sit = DB.situationAnnuelle(selectedEleve.id);
  box.innerHTML = `
    <div class="card stat-card"><div class="card-title">Total Année Scolaire</div><div class="stat-value" style="font-size:17px;">${DB.fmtFCFA(sit.totalAnnee)}</div></div>
    <div class="card stat-card"><div class="card-title">Total Réglé</div><div class="stat-value" style="font-size:17px;color:var(--green);">${DB.fmtFCFA(sit.totalRegle)}</div></div>
    <div class="card stat-card"><div class="card-title">Vient de Payer</div><div class="stat-value" style="font-size:17px;color:var(--blue-accent);">${DB.fmtFCFA(dernierMontantPaye)}</div></div>
    <div class="card stat-card"><div class="card-title">Total Restant</div><div class="stat-value" style="font-size:17px;color:${sit.totalRestant>0?'var(--red)':'inherit'};">${DB.fmtFCFA(sit.totalRestant)}</div></div>`;
}

/* ---------------- FICHE COMPLÈTE (mensualités + autres frais + infos + docs) ---------------- */
function renderFicheComplete(){
  const container = document.getElementById('ficheCompleteSection');
  if(!selectedEleve){
    container.innerHTML = `<div class="card empty-state">Recherchez un élève ci-dessus pour ouvrir sa fiche complète et encaisser un paiement.</div>`;
    return;
  }
  const el = selectedEleve;
  const sit = DB.situationAnnuelle(el.id);
  const settings = DB.get(DB.KEYS.settings, {});
  const documents = DB.get(DB.KEYS.documents, []).filter(d=>d.eleveId===el.id);
  const DOC_TYPES_APERCU = ["Acte de Naissance", "Bulletins Précédents", "Certificat Médical", "Photo d'Identité"];

  container.innerHTML = `
    <div class="card mb-16">
      <div class="flex-between mb-16">
        <div class="section-title" style="margin-bottom:0;">Fiche Complète de Paiement — ${el.prenom} ${el.nom}</div>
        <a class="btn btn-outline btn-sm" href="inscription.html?eleve=${el.id}">Voir le dossier élève complet →</a>
      </div>

      <div class="section-title">Mensualités ${settings.annee || ''} (Octobre → Juin)</div>
      <div class="table-wrap mb-16">
        <table>
          <thead><tr>
            <th>Frais Mensuel</th>
            ${DB.MOIS_SCOLAIRES.map(m=>`<th class="num">${DB.NOMS_MOIS_COURT[m]}</th>`).join('')}
          </tr></thead>
          <tbody>
            ${DB.fraisMensuels().length ? DB.fraisMensuels().map((f,ti)=>`
              <tr>
                <td style="font-weight:700;white-space:nowrap;">${f.type}<br><span class="small text-muted">${DB.fmtFCFA(DB.tarifFrais(f.type, el.classe))}/mois</span></td>
                ${DB.MOIS_SCOLAIRES.map((numMois,mi)=> celluleMois(f.type, sit, numMois)).join('')}
              </tr>`).join('') : `<tr><td colspan="${DB.MOIS_SCOLAIRES.length+1}" class="empty-state">Aucun frais mensuel actif (configurable dans Frais)</td></tr>`}
          </tbody>
        </table>
      </div>
      <div class="small text-muted mb-16">Cochez le(s) mois à régler (paiement total ou acompte partiel — modifiez le montant proposé si besoin). Les mois déjà soldés apparaissent en vert.</div>

      <div class="section-title">Autres Frais (Inscription, Réinscription, etc.)</div>
      <div id="feeChecklist"></div>

      <div class="flex-between mt-16" style="font-weight:800;font-size:15px;">
        <span>Total de cette transaction:</span><span id="sousTotal">0 FCFA</span>
      </div>
      <div class="divider"></div>

      <div class="form-row">
        <div class="form-group">
          <label>Remises & Promotions</label>
          <select id="remise" onchange="recalcTotal()">
            <option value="0">Aucune remise</option>
            <option value="10">Promotion Familiale -10%</option>
            <option value="5">Bourse Partielle -5%</option>
          </select>
        </div>
        <div class="form-group">
          <label>Mode de Paiement</label>
          <select id="modePaiement">
            <option>Espèces</option><option>MTN MoMo</option><option>Orange Money</option><option>Banque</option><option>Virement</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Détails Mobile Money</label>
          <input type="text" id="momoNum" placeholder="numéro: +242 06 600 XXXX">
        </div>
        <div class="form-group">
          <label>Caissier</label>
          <select id="caissier">${DB.getCaissiers().map(c=>`<option>${c}</option>`).join('') || '<option disabled>Aucun caissier configuré (voir Paramètres)</option>'}</select>
        </div>
      </div>

      <div class="flex gap-8 mt-16">
        <button class="btn btn-primary" onclick="validerPaiement()">✔ Valider Paiement</button>
        <button class="btn btn-outline" onclick="ouvrirRecu()">🖨 Imprimer Reçu</button>
        <button class="btn btn-outline" onclick="envoyerConfirmationSMS()">💬 Envoyer Confirmation SMS</button>
      </div>
    </div>

    <div class="grid grid-2-eq">
      <div class="card">
        <div class="section-title">Informations Personnelles</div>
        <div class="form-row">
          <div>
            <p class="small"><b>Nom</b><br>${el.nom}</p>
            <p class="small"><b>Postnom</b><br>${el.postnom || '-'}</p>
            <p class="small"><b>Sexe</b><br>${el.sexe==='M'?'Masculin':'Féminin'}</p>
            <p class="small"><b>Date de Naissance</b><br>${el.naissance||'-'}</p>
          </div>
          <div>
            <p class="small"><b>Prénom</b><br>${el.prenom}</p>
            <p class="small"><b>Lieu de Naissance</b><br>${el.lieuNaissance||'-'}</p>
            <p class="small"><b>Nationalité</b><br>${el.nationalite||'-'}</p>
            <p class="small"><b>Classe</b><br>${el.classe}</p>
          </div>
        </div>
        <div class="section-title mt-16">Parents / Tuteur</div>
        <div class="form-row">
          <div>
            <p class="small"><b>Père</b><br>${el.pereNom || '-'}${el.pereTel ? ' — ' + el.pereTel : ''}</p>
            <p class="small"><b>Mère</b><br>${el.mereNom || '-'}${el.mereTel ? ' — ' + el.mereTel : ''}</p>
          </div>
          <div>
            <p class="small"><b>Tuteur</b><br>${el.tuteurNom || '-'}${el.tuteurTel ? ' — ' + el.tuteurTel : ''}</p>
            <p class="small"><b>Adresse</b><br>${el.adresse || '-'}</p>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="section-title">Documents de l'Élève</div>
        ${DOC_TYPES_APERCU.map(label=>{
          const doc = documents.find(d=>d.label===label);
          return `<div class="flex-between small" style="padding:6px 0;border-bottom:1px solid var(--border);">
            <span>📎 ${label}</span>
            ${doc ? `<a class="link-btn" href="${doc.dataUrl}" download="${doc.filename}">⬇ Télécharger</a>` : `<span class="text-muted">Non fourni</span>`}
          </div>`;
        }).join('')}
        ${documents.filter(d=>!DOC_TYPES_APERCU.includes(d.label)).map(d=>`
          <div class="flex-between small" style="padding:6px 0;border-bottom:1px solid var(--border);">
            <span>📎 ${d.label}</span>
            <a class="link-btn" href="${d.dataUrl}" download="${d.filename}">⬇ Télécharger</a>
          </div>`).join('')}
        <a class="link-btn small mt-8" style="display:block;" href="inscription.html?eleve=${el.id}">Gérer / téléverser des documents →</a>
      </div>
    </div>`;

  renderAutresFrais();
  recalcTotal();
}

function celluleMois(type, sit, numMois){
  const mois = DB.moisAnneeScolaire(numMois);
  const ech = (sit.mensuels[type] && sit.mensuels[type][mois]) || {montantDu:0, montantPaye:0};
  const montantDu = Number(ech.montantDu)||0;
  const montantPaye = Number(ech.montantPaye)||0;

  if(montantDu <= 0){
    return `<td class="num" style="text-align:center;background:var(--green-bg);">
      <span class="badge badge-green" style="font-size:9.5px;">✔ Payé</span>
    </td>`;
  }
  return `<td class="num" style="text-align:center;">
    <div class="mois-cell">
      <input type="checkbox" class="moisCheck" data-type="${type}" data-mois="${mois}" onchange="onMoisToggle(this)">
      ${montantPaye>0 ? `<div class="small" style="color:var(--orange);font-size:9.5px;">Acompte: ${DB.fmtFCFA(montantPaye)}</div>` : ''}
      <input type="number" class="moisAmt" data-type="${type}" data-mois="${mois}" value="${montantDu}" min="1" max="${montantDu}" style="width:70px;font-size:11px;padding:3px;display:none;margin-top:3px;" oninput="recalcTotal()">
    </div>
  </td>`;
}

function onMoisToggle(chk){
  const wrap = chk.closest('.mois-cell');
  const amt = wrap.querySelector('.moisAmt');
  amt.style.display = chk.checked ? 'inline-block' : 'none';
  if(chk.checked) amt.focus();
  recalcTotal();
}

function renderAutresFrais(){
  const fees = DB.get(DB.KEYS.fees, []).filter(f=>f.actif && !f.mensuel);
  const classe = selectedEleve.classe;
  document.getElementById('feeChecklist').innerHTML = fees.length ? fees.map((f,i) => {
    const prixClasse = DB.tarifFrais(f.type, classe);
    const resteDu = DB.resteDuPourType(selectedEleve.id, f.type);
    return `
    <div class="checkbox-row" style="align-items:center;flex-wrap:wrap;">
      <input type="checkbox" class="feeCheck" data-i="${i}" data-name="${f.type}" data-prix="${prixClasse}" onchange="recalcTotal()">
      <span style="flex:1;min-width:140px;">${f.type} <span class="small text-muted">(${DB.fmtFCFA(prixClasse)})</span>${resteDu>0 ? ` <span class="small" style="color:var(--red);">(reste dû: ${DB.fmtFCFA(resteDu)})</span>` : ''}</span>
      <input type="number" class="feeAmount" id="feeAmount${i}" data-i="${i}" value="${resteDu>0?resteDu:prixClasse}" min="0" style="width:100px;" oninput="recalcTotal()">
    </div>`;
  }).join('') : '<div class="empty-state small">Aucun frais additionnel actif</div>';
}

function recalcTotal(){
  let total = 0;
  document.querySelectorAll('.moisCheck:checked').forEach(chk=>{
    const amt = chk.closest('.mois-cell').querySelector('.moisAmt');
    total += Number(amt.value) || 0;
  });
  document.querySelectorAll('.feeCheck:checked').forEach(chk=>{
    const input = document.getElementById('feeAmount'+chk.dataset.i);
    total += Number(input.value) || 0;
  });
  const remiseEl = document.getElementById('remise');
  const remise = remiseEl ? Number(remiseEl.value || 0) : 0;
  total = Math.round(total - (total * remise/100));
  const out = document.getElementById('sousTotal');
  if(out) out.textContent = DB.fmtFCFA(total);
}

function ouvrirRecu(){
  if(!window.__lastPaymentId){ toast('⚠ Validez un paiement avant d\'imprimer le reçu'); return; }
  window.open('recu.html?payment=' + window.__lastPaymentId, '_blank');
}

/* ---------------- VALIDATION DU PAIEMENT ---------------- */
function validerPaiement(){
  if(!selectedEleve){ toast('⚠ Sélectionnez un élève avant de valider'); return; }

  const moisChecked = [...document.querySelectorAll('.moisCheck:checked')];
  const feesChecked = [...document.querySelectorAll('.feeCheck:checked')];
  if(!moisChecked.length && !feesChecked.length){ toast('⚠ Cochez au moins un mois ou un frais à régler'); return; }

  const remise = Number(document.getElementById('remise').value || 0);
  const itemsMap = {}; // type -> {montant, mois:[]}

  // 1) Mensualités cochées (Octobre → Juin) — imputées précisément sur le mois choisi
  moisChecked.forEach(chk=>{
    const type = chk.dataset.type, mois = chk.dataset.mois;
    const amtInput = chk.closest('.mois-cell').querySelector('.moisAmt');
    const saisi = Number(amtInput.value) || 0;
    if(saisi<=0) return;
    const montantApresRemise = Math.round(saisi - saisi*remise/100);
    DB.appliquerPaiementMois(selectedEleve.id, type, mois, montantApresRemise);
    if(!itemsMap[type]) itemsMap[type] = {montant:0, mois:[]};
    itemsMap[type].montant += montantApresRemise;
    itemsMap[type].mois.push(mois);
  });

  // 2) Autres frais (non-mensuels) — imputés sur l'échéance ouverte la plus ancienne
  feesChecked.forEach(chk => {
    const type = chk.dataset.name;
    const saisi = Number(document.getElementById('feeAmount'+chk.dataset.i).value) || 0;
    if(saisi <= 0) return;
    const montantApresRemise = Math.round(saisi - saisi*remise/100);
    const applied = DB.appliquerPaiement(selectedEleve.id, type, montantApresRemise);
    const moisPayes = [...new Set(applied.map(a=>a.mois).filter(Boolean))];
    if(!itemsMap[type]) itemsMap[type] = {montant:0, mois:[]};
    itemsMap[type].montant += montantApresRemise;
    itemsMap[type].mois.push(...moisPayes);
  });

  const items = Object.entries(itemsMap).map(([type,v])=>({
    type, montant: v.montant, reste: DB.resteDuPourType(selectedEleve.id, type), mois: [...new Set(v.mois)]
  })).filter(it=>it.montant>0);

  if(!items.length){ toast('⚠ Aucun montant valide saisi'); return; }

  const montant = items.reduce((s,it)=> s + it.montant, 0);
  const types = items.map(it=>it.type).join(', ');

  const payments = DB.get(DB.KEYS.payments, []);
  const newPayment = {
    id: DB.uid('PAY'), numero: DB.receiptNumber(), codePaiement: DB.codePaiement(),
    eleveId: selectedEleve.id, type: types, items,
    montantPaye: montant, date: new Date().toISOString().slice(0,10), horodatage: new Date().toISOString(),
    caissier: document.getElementById('caissier').value,
    mode: document.getElementById('modePaiement').value
  };
  payments.push(newPayment);
  DB.set(DB.KEYS.payments, payments);
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5"/><path d="m16 19 3 3 3-3"/><path d="M18 12h.01"/><path d="M19 16v6"/><path d="M6 12h.01"/><circle cx="12" cy="12" r="2"/></svg>', `Paiement de ${DB.fmtFCFA(montant)} pour ${selectedEleve.prenom} ${selectedEleve.nom} (Caissier ${document.getElementById('caissier').value})`);
  toast('✔ Paiement validé avec succès');

  window.__lastPaymentId = newPayment.id;
  dernierMontantPaye = montant;

  renderClasses();
  renderAlertList();
  renderEleveSummary();
  renderStatsBox();
  renderFicheComplete();
}
