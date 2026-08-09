document.addEventListener('DOMContentLoaded', ()=>{
  // Déjà activé + compte créé sur cette machine → inutile de repasser par ici
  if(DB.isLicensed() && DB.hasAccount()){
    location.href = 'dashboard.html';
    return;
  }
  // Déjà activé mais compte pas encore créé → direct vers la création de compte
  if(DB.isLicensed() && !DB.hasAccount()){
    location.href = 'compte-creation.html';
    return;
  }

  document.getElementById('machineIdDisplay').textContent = 'ID de cette machine : ' + DB.getMachineId();

  document.getElementById('keyInput').addEventListener('keydown', (e)=>{
    if(e.key === 'Enter') activerLicence();
  });
  document.getElementById('keyInput').addEventListener('input', function(){
    this.value = this.value.toUpperCase();
  });
});

function showMsg(type, text){
  const el = document.getElementById('activationMsg');
  el.className = 'activation-msg ' + type;
  el.textContent = text;
}

async function activerLicence(){
  const key = document.getElementById('keyInput').value.trim();
  if(!key){ showMsg('error', '⚠ Veuillez saisir une clé de licence.'); return; }

  const btn = document.getElementById('activateBtn');
  const machineId = DB.getMachineId();

  // ---- Clé de test locale : aucun appel réseau, active directement ----
  if(typeof TEST_LICENSE_KEY !== 'undefined' && TEST_LICENSE_KEY && key === TEST_LICENSE_KEY){
    btn.disabled = true;
    btn.textContent = '⏳ Activation...';
    showMsg('info', 'Clé de test détectée — activation locale sans Supabase...');
    DB.set(DB.KEYS.license, { key, machineId, activatedAt: new Date().toISOString(), status: 'test_local' });
    showMsg('success', '✔ Logiciel activé en mode test (sans Supabase). Redirection...');
    setTimeout(()=> location.href = 'compte-creation.html', 900);
    return;
  }

  if(!SUPABASE_URL || !SUPABASE_ANON_KEY){
    showMsg('error', '⚠ Configuration manquante : renseignez SUPABASE_URL et SUPABASE_ANON_KEY dans js/license-config.js, ou utilisez la clé de test CEPEED-TEST-0000-DEMO pour essayer le logiciel sans Supabase.');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Vérification en cours...';
  showMsg('info', 'Connexion au serveur de licences...');

  try{
    const res = await fetch(SUPABASE_URL.replace(/\/$/,'') + '/rest/v1/rpc/activate_license_key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY
      },
      body: JSON.stringify({ p_key: key, p_machine_id: machineId })
    });

    if(!res.ok){
      const errText = await res.text().catch(()=> '');
      throw new Error('http_' + res.status + (errText ? (': ' + errText) : ''));
    }

    const result = await res.json();

    if(result && result.success){
      DB.set(DB.KEYS.license, { key, machineId, activatedAt: new Date().toISOString(), status: result.message });
      showMsg('success', '✔ Licence activée avec succès. Redirection...');
      setTimeout(()=> location.href = 'compte-creation.html', 900);
    } else {
      const messages = {
        invalid_key: 'Cette clé de licence est invalide.',
        key_already_used: 'Cette clé est déjà utilisée sur une autre machine.',
        missing_key: 'Veuillez saisir une clé.',
        missing_machine_id: 'Erreur interne (identifiant machine manquant).'
      };
      showMsg('error', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-ban-icon lucide-ban"><circle cx="12" cy="12" r="10"/><path d="M4.929 4.929 19.07 19.071"/></svg> ' + (messages[result && result.message] || 'Activation refusée.'));
      btn.disabled = false;
      btn.textContent = 'Activer le Logiciel';
    }
  }catch(err){
    showMsg('error', '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> Impossible de contacter le serveur de licences. Vérifiez votre connexion internet et réessayez. (' + err.message + ')');
    btn.disabled = false;
    btn.textContent = 'Activer le Logiciel';
  }
}
