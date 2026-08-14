document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('periodeRapport').value = new Date().toISOString().slice(0,10);

  const students = DB.get(DB.KEYS.students, []);
  const classes = [...new Set(students.map(s=>s.classe))].sort();
  document.getElementById('classeRapport').innerHTML += classes.map(c=>`<option>${c}</option>`).join('');

  renderRapportsStats();
  renderRapportsHistory();

  const settings = DB.get(DB.KEYS.settings, {});
  if(settings.rapportPlanifie){
    document.getElementById('planStatus').textContent = `📅 Envoi planifié : ${settings.rapportPlanifie.type} — ${settings.rapportPlanifie.frequence}`;
  }

  // Temps réel : le solde de caisse et les compteurs se recalculent automatiquement
  // dès qu'un paiement, une dépense (ex: génération de paie) ou une échéance change,
  // sans que l'utilisateur ait besoin de recharger la page.
  window.addEventListener('cepeed:data-changed', renderRapportsStats);
  window.addEventListener('storage', renderRapportsStats);
});

function renderRapportsStats(){
  const students = DB.get(DB.KEYS.students, []);

  const solde = DB.soldeCaisse();
  document.getElementById('soldeCaisse').textContent = DB.fmtFCFA(solde);

  const statuses = students.map(s=>DB.paymentStatus(s.id));
  document.getElementById('statAJour').textContent = statuses.filter(s=>s.status==='paye').length;
  document.getElementById('statAcompte').textContent = statuses.filter(s=>s.status==='acompte').length;
  document.getElementById('statNonPaye').textContent = statuses.filter(s=>s.status==='nonpaye').length;
}

function renderRapportsHistory(){
  const history = DB.get('cepeed_rapports_history', []);
  document.getElementById('rapportsHistory').innerHTML = history.length ? history.map(h=>`
    <div class="flex-between" style="padding:10px 0;border-bottom:1px solid var(--border);">
      <div class="small">Rapport: ${h.type} généré<br><span class="text-muted">${h.date}</span></div>
      <a class="link-btn" href="report.html?type=${encodeURIComponent(h.type)}" target="_blank">👁 Consulter</a>
    </div>`).join('') : '<div class="empty-state">Aucun rapport généré pour le moment</div>';

  if(history.length){
    document.getElementById('lastReportType').textContent = history[0].type;
    document.getElementById('lastReportDate').textContent = history[0].date;
  }
}

function logReport(type){
  const history = DB.get('cepeed_rapports_history', []);
  history.unshift({type, date: new Date().toLocaleDateString('fr-FR') + ' - ' + new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})});
  DB.set('cepeed_rapports_history', history.slice(0,15));
  DB.logActivity('📊', `Génération du rapport "${type}"`);
  renderRapportsHistory();
}

function genererRapport(){
  const type = document.getElementById('typeRapport').value;
  logReport(type);
  toast('✔ Rapport généré');
}

function genererPDF(){
  const type = document.getElementById('typeRapport').value;
  const classe = document.getElementById('classeRapport').value;
  logReport(type);
  window.open(`report.html?type=${encodeURIComponent(type)}&classe=${encodeURIComponent(classe)}`, '_blank');
}

function csvEscape(v){
  v = String(v ?? '');
  return /[",;\n]/.test(v) ? '"' + v.replace(/"/g,'""') + '"' : v;
}

function downloadCSV(filename, rows){
  const csv = rows.map(r => r.map(csvEscape).join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function exporterExcel(){
  const type = document.getElementById('typeRapport').value;
  const students = DB.get(DB.KEYS.students, []);
  const payments = DB.get(DB.KEYS.payments, []);
  let rows = [];

  if(type === 'Journal de Caisse'){
    rows.push(['Date','Libellé','Entrée','Sortie']);
    const depenses = DB.get(DB.KEYS.depenses, []);
    const ecritures = payments.map(p=>{
      const el = students.find(s=>s.id===p.eleveId) || {nom:'',prenom:''};
      return {date:p.date, libelle:`Paiement ${p.type} — ${el.prenom} ${el.nom}`, entree:p.montantPaye, sortie:0};
    }).concat(depenses.map(d=>({date:d.date, libelle:d.libelle, entree:0, sortie:d.montant})))
      .sort((a,b)=> (a.date||'').localeCompare(b.date||''));
    ecritures.forEach(e => rows.push([e.date, e.libelle, e.entree||'', e.sortie||'']));
  } else if(type === 'Grand Livre'){
    rows.push(['Date','Élève','Matricule','Type','Montant Payé','Mode','Caissier']);
    payments.forEach(p=>{
      const el = students.find(s=>s.id===p.eleveId) || {nom:'',prenom:''};
      rows.push([p.date, `${el.prenom} ${el.nom}`, p.eleveId, p.type, p.montantPaye, p.mode||'', p.caissier||'']);
    });
  } else if(type === 'État Débiteurs'){
    rows.push(['Élève','Matricule','Classe','Statut','Total Dû','Mois de Retard']);
    students.forEach(s=>{
      const ps = DB.paymentStatus(s.id);
      if(ps.status==='paye') return;
      rows.push([`${s.prenom} ${s.nom}`, s.id, s.classe, ps.status==='acompte'?'Acompte':'Non Payé', ps.totalDu, ps.moisRetard]);
    });
  } else if(type === 'Effectifs'){
    rows.push(['Classe','Effectif']);
    const classes = [...new Set(students.map(s=>s.classe))];
    classes.forEach(c=> rows.push([c, students.filter(s=>s.classe===c).length]));
  } else {
    const solde = DB.soldeCaisse();
    const depenses = DB.get(DB.KEYS.depenses, []).reduce((s,d)=>s+Number(d.montant||0),0);
    rows.push(['Indicateur','Valeur']);
    rows.push(['Solde de Caisse', solde]);
    rows.push(['Total Dépenses (Paie, etc.)', depenses]);
    rows.push(['Nombre d\'Élèves', students.length]);
    rows.push(['Nombre de Paiements Enregistrés', payments.length]);
  }

  downloadCSV(`CEPEED-${type.replace(/\s+/g,'_')}-${new Date().toISOString().slice(0,10)}.csv`, rows);
  logReport(type);
  toast('✔ Export Excel (CSV) téléchargé');
}

function planifierEnvoi(){
  const type = document.getElementById('typeRapport').value;
  const settings = DB.get(DB.KEYS.settings, {});
  settings.rapportPlanifie = {type, frequence:'Mensuel (le 1er de chaque mois)', creeLe:new Date().toISOString()};
  DB.set(DB.KEYS.settings, settings);
  DB.logActivity('📅', `Planification de l'envoi automatique du rapport "${type}" (mensuel)`);
  document.getElementById('planStatus').textContent = `📅 Envoi planifié : ${type} — Mensuel (le 1er de chaque mois)`;
  toast('✔ Envoi planifié avec succès');
}
