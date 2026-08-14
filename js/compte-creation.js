document.addEventListener('DOMContentLoaded', ()=>{
  // Bloque l'accès direct à cette page sans licence valide
  if(!DB.isLicensed()){
    location.href = 'license.html';
    return;
  }
  // Compte déjà créé sur cette machine → inutile de repasser ici
  if(DB.hasAccount()){
    location.href = 'dashboard.html';
    return;
  }

  const license = DB.get(DB.KEYS.license, {});
  document.getElementById('licenceBadge').textContent = 'Licence : ' + (license.key || '-');
});

function creerCompte(){
  const nom = document.getElementById('cNom').value.trim();
  if(!nom){ alert('⚠ Veuillez indiquer votre nom'); return; }

  const settings = DB.get(DB.KEYS.settings, {});
  settings.etablissement = document.getElementById('cEtablissement').value.trim() || settings.etablissement;
  settings.annee = document.getElementById('cAnnee').value.trim() || settings.annee;
  DB.set(DB.KEYS.settings, settings);

  DB.set(DB.KEYS.session, {
    nom,
    matricule: DB.uid('CPI-USR'),
    role: document.getElementById('cRole').value,
    email: document.getElementById('cEmail').value.trim(),
    tel: document.getElementById('cTel').value.trim()
  });

  DB.set(DB.KEYS.accountCreated, true);
  DB.logActivity('✔', `Compte créé pour ${nom} — logiciel activé sur cette machine`);

  location.href = 'dashboard.html';
}
