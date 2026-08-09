/* ============================================================
   CEPEED — Sidebar & Topbar communs à toutes les pages
   ============================================================ */

const NAV = [
  {type:'link', page:'dashboard.html', icon:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-layout-dashboard-icon lucide-layout-dashboard"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>', label:'Tableau de bord'},
  {type:'group', key:'eleves', icon:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-icon lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>', label:'Gestion des Élèves', items:[
    {page:'inscription.html', label:'Inscription'},
    {page:'inscription.html', label:'Dossier'}
  ]},
  {type:'link', page:'parcours.html', icon:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-graduation-cap-icon lucide-graduation-cap"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>', label:'Parcours Scolaire'},
  {type:'group', key:'finance', icon:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-piggy-bank-icon lucide-piggy-bank"><path d="M11 17h3v2a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a3.16 3.16 0 0 0 2-2h1a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-1a5 5 0 0 0-2-4V3a4 4 0 0 0-3.2 1.6l-.3.4H11a6 6 0 0 0-6 6v1a5 5 0 0 0 2 4v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1z"/><path d="M16 10h.01"/><path d="M2 8v1a2 2 0 0 0 2 2h1"/></svg>', label:'Gestion Financière', items:[
    {page:'frais.html', label:'Frais'},
    {page:'echeances.html', label:'Échéances'},
    {page:'paiements.html', label:'Paiements'}
  ]},
  {type:'group', key:'rh', icon:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-round-cog-icon lucide-user-round-cog"><path d="m14.305 19.53.923-.382"/><path d="m15.228 16.852-.923-.383"/><path d="m16.852 15.228-.383-.923"/><path d="m16.852 20.772-.383.924"/><path d="m19.148 15.228.383-.923"/><path d="m19.53 21.696-.382-.924"/><path d="M2 21a8 8 0 0 1 10.434-7.62"/><path d="m20.772 16.852.924-.383"/><path d="m20.772 19.148.924.383"/><circle cx="10" cy="8" r="5"/><circle cx="18" cy="18" r="3"/></svg>', label:'RH (Personnel)', items:[
    {page:'rh-admin.html', label:'Personnel Administratif'},
    {page:'rh-enseignants.html', label:'Pointage Enseignants'}
  ]},
  {type:'link', page:'rapports.html', icon:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chart-spline-icon lucide-chart-spline"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M7 16c.5-2 1.5-7 4-7 2 0 2 3 4 3 2.5 0 4.5-5 5-7"/></svg>', label:'Rapports'},
  {type:'link', page:'parametres.html', icon:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings-icon lucide-settings"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>', label:'Paramètres'},
  {type:'link', page:'profil.html', icon:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-shield-icon lucide-user-shield"><path d="M10 15H6a4 4 0 0 0-4 4v2"/><path d="M22 17.5c0 2.499-1.75 3.749-3.83 4.474a.5.5 0 0 1-.335-.005c-2.085-.72-3.835-1.97-3.835-4.47V14a.5.5 0 0 1 .5-.499c1 0 2.25-.6 3.12-1.36a.6.6 0 0 1 .76-.001c.875.765 2.12 1.36 3.12 1.36a.5.5 0 0 1 .5.5z"/><circle cx="9" cy="7" r="4"/></svg>', label:'Profil'}
];

function currentPage(){
  return location.pathname.split('/').pop() || 'dashboard.html';
}

function renderSidebar(){
  const cur = currentPage();
  let html = `<div class="sidebar-logo"><img src="img/logo.png" alt="GESLO" class="logo-icon">GESLO</div><div class="sidebar-nav">`;
  NAV.forEach(item=>{
    if(item.type === 'link'){
      const isActive = item.page.split('#')[0] === cur;
      html += `<a class="nav-item ${isActive?'active':''}" href="${item.page}"><span class="ico">${item.icon}</span>${item.label}</a>`;
    } else {
      const isOpen = item.items.some(sub => sub.page.split('#')[0] === cur);
      html += `<div class="nav-group ${isOpen?'open':''}">
        <div class="nav-item nav-group-toggle" onclick="this.parentElement.classList.toggle('open')">
          <span class="ico">${item.icon}</span>${item.label}<span class="nav-caret">▾</span>
        </div>
        <div class="nav-submenu">`;
      item.items.forEach(sub=>{
        const subActive = sub.page.split('#')[0] === cur;
        html += `<a class="nav-item ${subActive?'active':''}" href="${sub.page}">${sub.label}</a>`;
      });
      html += `</div></div>`;
    }
  });
  html += `</div>`;
  document.getElementById('sidebar').innerHTML = html;
}

/* ============== ALERTES / NOTIFICATIONS ============== */
function getSystemAlerts(){
  const students = DB.get(DB.KEYS.students, []);
  const echeances = DB.get(DB.KEYS.echeances, []);
  const alerts = [];

  const debiteurs = echeances.filter(e => (Number(e.montantDu)||0) > 0);
  debiteurs.forEach(e=>{
    const el = students.find(s=>s.id===e.eleveId);
    if(!el) return;
    const ps = DB.paymentStatus(el.id);
    alerts.push({
      id: e.id,
      icon: ps.status==='nonpaye' ? '🔴' : '🟠',
      text: `${el.prenom} ${el.nom} (${el.classe}) — ${e.type}: ${DB.fmtFCFA(e.montantDu)} dû${ps.moisRetard>0 ? ' — '+ps.moisRetard+' mois de retard' : ''}`,
      link: `classe.html?classe=${encodeURIComponent(el.classe)}`
    });
  });
  return alerts;
}

/* Joue le son d'alerte uniquement pour les alertes réellement NOUVELLES depuis la dernière visite
   (une échéance déjà vue ne redéclenche pas le son à chaque changement de page). */
function detecterNouvellesAlertes(alerts){
  const seen = DB.get('cepeed_seen_alert_ids', []);
  const currentIds = alerts.map(a=>a.id);
  const nouvelles = currentIds.filter(id => !seen.includes(id));
  if(nouvelles.length > 0){
    DB.playAlertSound();
  }
  DB.set('cepeed_seen_alert_ids', currentIds);
}

function renderTopbar(opts){
  opts = opts || {};
  const session = DB.get(DB.KEYS.session, {nom:'', role:'Comptable'});
  const nomAffiche = session.nom && session.nom.trim() ? session.nom : 'Configurer mon profil';
  const now = new Date();
  const dateStr = now.toLocaleDateString('fr-FR', {day:'numeric', month:'long'}) + ' ' + now.getFullYear();
  const timeStr = now.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
  const initials = nomAffiche.split(' ').filter(Boolean).map(s=>s[0]).join('').slice(0,2).toUpperCase() || '?';
  const alerts = getSystemAlerts();
  detecterNouvellesAlertes(alerts);

  const html = `
    <div class="topbar-left">
      <span class="burger" onclick="document.querySelector('.sidebar').classList.toggle('collapsed-mobile')">☰</span>
      ${opts.search !== false ? `<div class="topbar-search"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search-icon lucide-search"><path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/></svg><input placeholder="Rechercher un élève (nom ou matricule)..." id="globalSearch"></div>` : `<div></div>`}
    </div>
    <div class="topbar-right">
      <span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-icon lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ${nomAffiche} (${session.role || 'Comptable'})</span>
      <span><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clock-fading-icon lucide-clock-fading"><path d="M12 2a10 10 0 0 1 7.38 16.75"/><path d="M12 6v6l4 2"/><path d="M2.5 8.875a10 10 0 0 0-.5 3"/><path d="M2.83 16a10 10 0 0 0 2.43 3.4"/><path d="M4.636 5.235a10 10 0 0 1 .891-.857"/><path d="M8.644 21.42a10 10 0 0 0 7.631-.38"/></svg> ${timeStr} • ${dateStr}</span>
      <span class="icon-btn" id="helpBtn"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-circle-question-mark-icon lucide-circle-question-mark"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
        <div class="popover" id="helpPopover">
          <div class="popover-title">Aide rapide</div>
          <div class="popover-item"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-banknote-arrow-down-icon lucide-banknote-arrow-down"><path d="M12 18H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5"/><path d="m16 19 3 3 3-3"/><path d="M18 12h.01"/><path d="M19 16v6"/><path d="M6 12h.01"/><circle cx="12" cy="12" r="2"/></svg> Paiements → encaisser / imprimer un reçu</div>
          <div class="popover-item"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-open-text-icon lucide-book-open-text"><path d="M12 5v16"/><path d="M16 13h2"/><path d="M16 9h2"/><path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z"/><path d="M6 13h2"/><path d="M6 9h2"/></svg> Parcours Scolaire → consulter / imprimer le bulletin</div>
          <div class="popover-item"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-shield-icon lucide-user-shield"><path d="M10 15H6a4 4 0 0 0-4 4v2"/><path d="M22 17.5c0 2.499-1.75 3.749-3.83 4.474a.5.5 0 0 1-.335-.005c-2.085-.72-3.835-1.97-3.835-4.47V14a.5.5 0 0 1 .5-.499c1 0 2.25-.6 3.12-1.36a.6.6 0 0 1 .76-.001c.875.765 2.12 1.36 3.12 1.36a.5.5 0 0 1 .5.5z"/><circle cx="9" cy="7" r="4"/></svg> RH → gérer le personnel et générer la paie</div>
          <a class="popover-item link-btn" href="README.md" target="_blank"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package-open-icon lucide-package-open"><path d="M12 22v-9"/><path d="M15.17 2.21a1.67 1.67 0 0 1 1.63 0L21 4.57a1.93 1.93 0 0 1 0 3.36L8.82 14.79a1.655 1.655 0 0 1-1.64 0L3 12.43a1.93 1.93 0 0 1 0-3.36z"/><path d="M20 13v3.87a2.06 2.06 0 0 1-1.11 1.83l-6 3.08a1.93 1.93 0 0 1-1.78 0l-6-3.08A2.06 2.06 0 0 1 4 16.87V13"/><path d="M21 12.43a1.93 1.93 0 0 0 0-3.36L8.83 2.2a1.64 1.64 0 0 0-1.63 0L3 4.57a1.93 1.93 0 0 0 0 3.36l12.18 6.86a1.636 1.636 0 0 0 1.63 0z"/></svg> Consulter le guide complet</a>
        </div>
      </span>
      <span class="icon-btn" id="notifBtn"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bell-icon lucide-bell"><path d="M10.268 21a2 2 0 0 0 3.464 0"/><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"/></svg>${alerts.length ? '<span class="dot"></span>' : ''}
        <div class="popover popover-wide" id="notifPopover">
          <div class="popover-title">Alertes (${alerts.length})</div>
          ${alerts.length ? alerts.slice(0,6).map(a=>`<a class="popover-item" href="${a.link}">${a.icon} ${a.text}</a>`).join('')
            : '<div class="popover-item text-muted">Aucune alerte <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-party-popper-icon lucide-party-popper"><path d="M5.8 11.3 2 22l10.7-3.79"/><path d="M4 3h.01"/><path d="M22 8h.01"/><path d="M15 2h.01"/><path d="M22 20h.01"/><path d="m22 2-2.24.75a2.9 2.9 0 0 0-1.96 3.12c.1.86-.57 1.63-1.45 1.63h-.38c-.86 0-1.6.6-1.76 1.44L14 10"/><path d="m22 13-.82-.33c-.86-.34-1.82.2-1.98 1.11c-.11.7-.72 1.22-1.43 1.22H17"/><path d="m11 2 .33.82c.34.86-.2 1.82-1.11 1.98C9.52 4.9 9 5.52 9 6.23V7"/><path d="M11 13c1.93 1.93 2.83 4.17 2 5-.83.83-3.07-.07-5-2-1.93-1.93-2.83-4.17-2-5 .83-.83 3.07.07 5 2Z"/></svg></div>'}
          ${alerts.length ? `<a class="popover-item link-btn" href="echeances.html">Voir toutes les échéances →</a>` : ''}
        </div>
      </span>
      <div class="avatar" onclick="location.href='profil.html'" style="cursor:pointer;">${initials}</div>
    </div>`;
  document.getElementById('topbar').innerHTML = html;

  // toggle popovers
  const bind = (btnId, popId) => {
    const btn = document.getElementById(btnId);
    const pop = document.getElementById(popId);
    btn.addEventListener('click', (e)=>{
      e.stopPropagation();
      const isOpen = pop.classList.contains('open');
      document.querySelectorAll('.popover.open').forEach(p=>p.classList.remove('open'));
      if(!isOpen) pop.classList.add('open');
    });
  };
  bind('helpBtn','helpPopover');
  bind('notifBtn','notifPopover');
  document.addEventListener('click', ()=> document.querySelectorAll('.popover.open').forEach(p=>p.classList.remove('open')));

  // recherche globale fonctionnelle
  const searchInput = document.getElementById('globalSearch');
  if(searchInput){
    searchInput.addEventListener('keydown', (e)=>{
      if(e.key !== 'Enter') return;
      const q = searchInput.value.trim().toLowerCase();
      if(!q) return;
      const students = DB.get(DB.KEYS.students, []);
      const match = students.find(s => (s.nom+' '+s.prenom+' '+s.id).toLowerCase().includes(q));
      if(match){ location.href = `inscription.html?eleve=${match.id}`; }
      else { toast('⚠ Aucun élève trouvé pour "' + searchInput.value + '"'); }
    });
  }
}

function toast(msg){
  let t = document.getElementById('appToast');
  if(!t){
    t = document.createElement('div');
    t.id = 'appToast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.innerHTML = msg;
  t.classList.add('show');
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=> t.classList.remove('show'), 2600);
}

document.addEventListener('DOMContentLoaded', ()=>{
  renderSidebar();
  renderTopbar();
});
