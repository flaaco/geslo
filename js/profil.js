document.addEventListener('DOMContentLoaded', ()=>{
  const session = DB.get(DB.KEYS.session, {});
  const activities = DB.get(DB.KEYS.activities, []);

  document.getElementById('profAvatar').textContent = (session.nom||'??').split(' ').map(s=>s[0]).join('').slice(0,2).toUpperCase();
  document.getElementById('profNom').textContent = session.nom || '';
  document.getElementById('profMatricule').textContent = 'Matricule: ' + (session.matricule||'');
  document.getElementById('profRole').textContent = 'Rôle: ' + (session.role||'');

  document.getElementById('fProfNom').value = session.nom || '';
  document.getElementById('fProfEmail').value = session.email || '';
  document.getElementById('fProfTel').value = session.tel || '';
  document.getElementById('fProfRole').value = session.role || 'Comptable';

  document.getElementById('profActivity').innerHTML = activities.slice(0,15).map(a=>`
    <div class="activity-item"><div class="activity-ico">${a.icon}</div>
      <div><div class="activity-text">${a.text}</div><div class="activity-time">${DB.timeAgo(a.time)}</div></div>
    </div>`).join('') || '<div class="empty-state">Aucune activité</div>';

  document.getElementById('statActions').textContent = activities.length;
  document.getElementById('statDerniere').textContent = activities.length ? DB.timeAgo(activities[0].time) + ' — ' + activities[0].text : '-';

  const license = DB.get(DB.KEYS.license, null);
  if(license){
    document.getElementById('licKey').textContent = license.key;
    document.getElementById('licDate').textContent = new Date(license.activatedAt).toLocaleString('fr-FR');
  }
  document.getElementById('licMachine').textContent = DB.getMachineId();

  document.querySelectorAll('.tabs .tab').forEach(t=>{
    t.addEventListener('click', ()=>{
      document.querySelectorAll('.tabs .tab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      ['infos','activite'].forEach(p=>{
        document.getElementById('panel-'+p).style.display = (p===t.dataset.panel) ? 'block' : 'none';
      });
    });
  });
});

function saveProfil(){
  const session = DB.get(DB.KEYS.session, {});
  session.nom = document.getElementById('fProfNom').value;
  session.email = document.getElementById('fProfEmail').value;
  session.tel = document.getElementById('fProfTel').value;
  session.role = document.getElementById('fProfRole').value;
  DB.set(DB.KEYS.session, session);
  toast('✔ Profil mis à jour');
  setTimeout(()=>location.reload(), 400);
}

function deconnexion(){
  DB.logActivity('⏻', 'Déconnexion du compte');
  toast('✔ Déconnexion effectuée');
}
