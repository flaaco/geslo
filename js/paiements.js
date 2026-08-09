let selectedEleve = null;

document.addEventListener('DOMContentLoaded', ()=>{
  const students = DB.get(DB.KEYS.students, []);
  const classes = [...new Set(students.map(s=>s.classe))];
  const sel = document.getElementById('classeFilter');
  classes.forEach(c => sel.innerHTML += `<option value="${c}">${c}</option>`);

  renderClasses();
  renderFeeChecklist();
  renderAlertList();

  const params = new URLSearchParams(location.search);
  const eleveId = params.get('eleve');
  if(eleveId) selectEleve(eleveId);

  document.querySelectorAll('#paiements-tabs .tab').forEach(()=>{});
  document.querySelectorAll('.tabs .tab').forEach(t=>{
    t.addEventListener('click', ()=>{
      document.querySelectorAll('.tabs .tab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
    });
  });
});

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

function renderAlertList(){
  const students = DB.get(DB.KEYS.students, []);
  const echeances = DB.get(DB.KEYS.echeances, []).filter(e=>e.montantDu>0);
  document.getElementById('alertList').innerHTML = echeances.length ? echeances.map(e=>{
    const el = students.find(s=>s.id===e.eleveId) || {nom:'?',prenom:'?',classe:'?'};
    return `<li><a href="classe.html?classe=${encodeURIComponent(el.classe)}">${el.prenom} ${el.nom} (${el.classe})</a> - ${e.type}: <b>${DB.fmtFCFA(e.montantDu)} dû</b></li>`;
  }).join('') : '<li>Aucune alerte</li>';
}

function genererRapportRetard(){
  const history = DB.get('cepeed_rapports_history', []);
  history.unshift({type:'État Débiteurs', date: new Date().toLocaleDateString('fr-FR') + ' - ' + new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})});
  DB.set('cepeed_rapports_history', history.slice(0,10));
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chart-spline-icon lucide-chart-spline"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16c.5-2 1.5-7 4-7 2 0 2 3 4 3 2.5 0 4.5-5 5-7"/></svg>', 'Génération du rapport "État Débiteurs"');
  toast('✔ Rapport de retard généré');
  setTimeout(()=> location.href='rapports.html', 600);
}

function envoyerConfirmationSMS(){
  if(!selectedEleve){ toast('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> Sélectionnez un élève d\'abord'); return; }
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle-more-icon lucide-message-circle-more"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/></svg>', `SMS de confirmation de paiement envoyé à ${selectedEleve.prenom} ${selectedEleve.nom}`);
  toast('✔ SMS de confirmation envoyé à ' + selectedEleve.prenom + ' ' + selectedEleve.nom);
}

function filterEleve(q){
  const students = DB.get(DB.KEYS.students, []);
  q = q.trim().toLowerCase();
  const box = document.getElementById('eleveResults');
  if(!q){ box.innerHTML=''; return; }
  const matches = students.filter(s => (s.nom+' '+s.prenom+' '+s.id).toLowerCase().includes(q)).slice(0,5);
  box.innerHTML = matches.map(s=>`<div class="link-btn" style="display:block;padding:4px 0;" onclick="selectEleve('${s.id}')">${s.prenom} ${s.nom} — ${s.id}</div>`).join('') || 'Aucun résultat';
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
  document.getElementById('searchPayEleve').value = `${el.id} (${el.prenom} ${el.nom})`;
  document.getElementById('eleveResults').innerHTML = '';
  renderFeeChecklist();
}

function renderFeeChecklist(){
  const fees = DB.get(DB.KEYS.fees, []).filter(f=>f.actif);
  const preset = ['Scolarité','Rame Papier','TD/TP','Maillot Éco.','Transport'];
  const classe = selectedEleve ? selectedEleve.classe : null;
  document.getElementById('feeChecklist').innerHTML = fees.map((f,i) => {
    const prixClasse = DB.tarifFrais(f.type, classe);
    const resteDu = selectedEleve ? DB.resteDuPourType(selectedEleve.id, f.type) : 0;
    return `
    <div class="checkbox-row" style="align-items:center;flex-wrap:wrap;">
      <input type="checkbox" class="feeCheck" data-i="${i}" data-name="${f.type}" data-prix="${prixClasse}" ${preset.includes(f.type)?'checked':''} onchange="recalc()">
      <span style="flex:1;min-width:120px;">${f.type}${classe ? ` <span class="small text-muted">(${classe}: ${DB.fmtFCFA(prixClasse)})</span>` : ''}${resteDu>0 ? ` <span class="small" style="color:var(--red);">(reste dû: ${DB.fmtFCFA(resteDu)})</span>` : ''}</span>
      <input type="number" class="feeAmount" id="feeAmount${i}" data-i="${i}" value="${resteDu>0?resteDu:prixClasse}" min="0" style="width:100px;" oninput="recalc()">
      <div class="flex gap-8">
        <button type="button" class="btn btn-outline btn-sm" onclick="setQuickAmount(${i},'full')">Mois complet</button>
        <button type="button" class="btn btn-outline btn-sm" onclick="setQuickAmount(${i},'half')">½ Mois</button>
      </div>
    </div>`;
  }).join('');
  recalc();
}

function setQuickAmount(i, mode){
  const chk = document.querySelector(`.feeCheck[data-i="${i}"]`);
  const input = document.getElementById('feeAmount'+i);
  const prix = Number(chk.dataset.prix);
  const resteDu = selectedEleve ? DB.resteDuPourType(selectedEleve.id, chk.dataset.name) : 0;
  const base = resteDu>0 ? resteDu : prix;
  input.value = mode==='full' ? base : Math.round(base/2);
  chk.checked = true;
  recalc();
}

function recalc(){
  const checked = [...document.querySelectorAll('.feeCheck:checked')];
  let total = checked.reduce((s,c)=>{
    const amt = Number(document.getElementById('feeAmount'+c.dataset.i).value) || 0;
    return s + amt;
  }, 0);
  const remise = Number(document.getElementById('remise').value || 0);
  total = total - (total * remise/100);
  document.getElementById('sousTotal').textContent = DB.fmtFCFA(total);
}

function ouvrirRecu(){
  if(!window.__lastPaymentId){ toast('⚠ Validez un paiement avant d\'imprimer le reçu'); return; }
  window.open('recu.html?payment=' + window.__lastPaymentId, '_blank');
}

function validerPaiement(){
  if(!selectedEleve){ toast('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> Sélectionnez un élève avant de valider'); return; }
  const checked = [...document.querySelectorAll('.feeCheck:checked')];
  if(!checked.length){ toast('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> Sélectionnez au moins un frais'); return; }

  const remise = Number(document.getElementById('remise').value || 0);
  const items = [];

  checked.forEach(c => {
    const type = c.dataset.name;
    const saisi = Number(document.getElementById('feeAmount'+c.dataset.i).value) || 0;
    if(saisi <= 0) return;
    const montantApresRemise = Math.round(saisi - saisi*remise/100);
    // applique le paiement sur les échéances ouvertes de ce type (paie le plus ancien mois d'abord)
    const applied = DB.appliquerPaiement(selectedEleve.id, type, montantApresRemise);
    const resteApres = DB.resteDuPourType(selectedEleve.id, type);
    const moisPayes = [...new Set(applied.map(a=>a.mois).filter(Boolean))];
    items.push({ type, montant: montantApresRemise, reste: resteApres, mois: moisPayes });
  });

  if(!items.length){ toast('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> Aucun montant valide saisi'); return; }

  const montant = items.reduce((s,it)=> s + it.montant, 0);
  const types = items.map(it=>it.type).join(', ');

  const payments = DB.get(DB.KEYS.payments, []);
  const newPayment = {
    id: DB.uid('PAY'), numero: DB.receiptNumber(), codePaiement: DB.codePaiement(),
    eleveId: selectedEleve.id, type: types, items,
    montantPaye: montant, date: new Date().toISOString().slice(0,10),
    caissier: document.getElementById('caissier').value,
    mode: document.getElementById('modePaiement').value
  };
  payments.push(newPayment);
  DB.set(DB.KEYS.payments, payments);
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-banknote-arrow-down-icon lucide-banknote-arrow-down"><path d="M12 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5"/><path d="m16 19 3 3 3-3"/><path d="M18 12h.01"/><path d="M19 16v6"/><path d="M6 12h.01"/><circle cx="12" cy="12" r="2"/></svg>', `Paiement de ${DB.fmtFCFA(montant)} pour ${selectedEleve.prenom} ${selectedEleve.nom} (Caissier ${document.getElementById('caissier').value})`);
  toast('✔ Paiement validé avec succès');
  window.__lastPaymentId = newPayment.id;
  renderClasses();
  renderAlertList();
  renderFeeChecklist();
}
