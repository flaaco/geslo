let logoDataUrl = '';

document.addEventListener('DOMContentLoaded', ()=>{
  const settings = DB.get(DB.KEYS.settings, {});
  const fees = DB.get(DB.KEYS.fees, []);

  logoDataUrl = settings.logo || '';
  if(logoDataUrl){
    document.getElementById('logoInner').innerHTML = `<img src="${logoDataUrl}" style="width:100%;height:100%;object-fit:contain;display:block;">`;
    document.getElementById('logoRemove').style.display = 'flex';
  }

  document.getElementById('sEtablissement').value = settings.etablissement || '';
  document.getElementById('sAnnee').value = settings.annee || '';
  document.getElementById('sAdresse').value = settings.adresse || 'Pointe-Noire / Mbota-Carlos';

  document.getElementById('settingsFees').innerHTML = fees.map((f,i)=>`
    <label class="checkbox-row"><input type="checkbox" class="settingFee" data-i="${i}" ${f.actif?'checked':''}>${f.type}</label>`).join('') || '<div class="empty-state">Aucun frais configuré</div>';

  renderCaissiersList();

  document.getElementById('mEspeces').checked = !!settings.modesPaiement?.especes;
  document.getElementById('mMomo').checked = !!settings.modesPaiement?.momo;
  document.getElementById('mOrange').checked = !!settings.modesPaiement?.orangeMoney;
  document.getElementById('mCheque').checked = !!settings.modesPaiement?.cheque;
  document.getElementById('mVirement').checked = !!settings.modesPaiement?.virement;
  document.getElementById('seuilMin').value = settings.seuilAlerteMin ?? 1;
  document.getElementById('seuilMax').value = settings.seuilAlerteMax ?? 500;
  document.getElementById('s2FA').checked = !!settings.twoFA;
  document.getElementById('notifDebiteurs').checked = settings.notifDebiteurs !== false;
  document.getElementById('notifEcheances').checked = settings.notifEcheances !== false;
  document.getElementById('notifPaie').checked = settings.notifPaie !== false;
  document.getElementById('sonsActifs').checked = settings.sonsActifs !== false;

  document.querySelectorAll('#settingsTabs .tab').forEach(t=>{
    t.addEventListener('click', ()=>{
      document.querySelectorAll('#settingsTabs .tab').forEach(x=>x.classList.remove('active'));
      t.classList.add('active');
      ['general','finances','securite','notifications'].forEach(p=>{
        document.getElementById('panel-'+p).style.display = (p===t.dataset.panel) ? 'block' : 'none';
      });
    });
  });
});

/* ============== CAISSIERS (liste affichée dans le sélecteur de la page Paiement) ============== */
function renderCaissiersList(){
  const caissiers = DB.getCaissiers();
  document.getElementById('caissiersList').innerHTML = caissiers.length ? caissiers.map(c => `
    <span class="badge badge-gray" style="display:inline-flex;align-items:center;gap:6px;padding:6px 10px;">
      ${c}
      <span style="cursor:pointer;font-weight:800;" title="Retirer" onclick="supprimerCaissierUI('${c.replace(/'/g,"\\'")}')">✕</span>
    </span>`).join('') : '<div class="empty-state">Aucun caissier configuré</div>';
}

function ajouterCaissierUI(){
  const input = document.getElementById('newCaissierInput');
  const res = DB.ajouterCaissier(input.value);
  if(!res.success){ toast('⚠ ' + res.message); return; }
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-plus-icon lucide-user-plus"><path d="M2 21a8 8 0 0 1 13.292-6"/><circle cx="10" cy="8" r="5"/><path d="M19 16v6"/><path d="M22 19h-6"/></svg>', `Nouveau caissier ajouté : "${input.value.trim()}"`);
  toast('✔ Caissier ajouté');
  input.value = '';
  renderCaissiersList();
}

function supprimerCaissierUI(nom){
  if(!confirm(`Retirer "${nom}" de la liste des caissiers ?`)) return;
  DB.supprimerCaissier(nom);
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>', `Caissier retiré : "${nom}"`);
  toast('✔ Caissier retiré');
  renderCaissiersList();
}

/* ============== LOGO DE L'ÉTABLISSEMENT ============== */
function choisirLogo(input){
  const file = input.files[0];
  if(!file) return;
  DB.readLogoAsDataURL(file, 300, 0.92).then(dataUrl => {
    logoDataUrl = dataUrl;
    document.getElementById('logoInner').innerHTML = `<img src="${dataUrl}" style="width:100%;height:100%;object-fit:contain;display:block;">`;
    document.getElementById('logoRemove').style.display = 'flex';
  }).catch(err => toast('⚠ ' + err.message));
}
function retirerLogo(e){
  if(e) e.stopPropagation();
  logoDataUrl = '';
  document.getElementById('logoInner').textContent = '';
  document.getElementById('logoRemove').style.display = 'none';
  const input = document.querySelector('#logoBox input[type=file]');
  if(input) input.value = '';
}

function saveSettings(){
  const settings = DB.get(DB.KEYS.settings, {});
  settings.etablissement = document.getElementById('sEtablissement').value;
  settings.logo = logoDataUrl;
  settings.annee = document.getElementById('sAnnee').value;
  settings.adresse = document.getElementById('sAdresse').value;

  const fees = DB.get(DB.KEYS.fees, []);
  document.querySelectorAll('.settingFee').forEach(chk=>{
    fees[Number(chk.dataset.i)].actif = chk.checked;
  });
  DB.set(DB.KEYS.fees, fees);

  settings.modesPaiement = {
    especes: document.getElementById('mEspeces').checked,
    momo: document.getElementById('mMomo').checked,
    orangeMoney: document.getElementById('mOrange').checked,
    cheque: document.getElementById('mCheque').checked,
    virement: document.getElementById('mVirement').checked
  };
  settings.seuilAlerteMin = Number(document.getElementById('seuilMin').value);
  settings.seuilAlerteMax = Number(document.getElementById('seuilMax').value);
  settings.twoFA = document.getElementById('s2FA').checked;
  settings.notifDebiteurs = document.getElementById('notifDebiteurs').checked;
  settings.notifEcheances = document.getElementById('notifEcheances').checked;
  settings.notifPaie = document.getElementById('notifPaie').checked;
  settings.sonsActifs = document.getElementById('sonsActifs').checked;

  DB.set(DB.KEYS.settings, settings);
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings-icon lucide-settings"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>', 'Mise à jour des paramètres système');
  toast('✔ Paramètres sauvegardés');
}

function testerSons(){
  DB.playAlertSound();
  setTimeout(()=> DB.playNotificationSound(), 700);
  toast('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-megaphone-icon lucide-megaphone"><path d="M11 6a13 13 0 0 0 8.4-2.8A1 1 0 0 1 21 4v12a1 1 0 0 1-1.6.8A13 13 0 0 0 11 14H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/><path d="M6 14a12 12 0 0 0 2.4 7.2 2 2 0 0 0 3.2-2.4A8 8 0 0 1 10 14"/><path d="M8 6v8"/></svg> Son d\'alerte puis son de notification joués');
}

function reinitialiserDonnees(){
  const premiere = confirm('Ceci va effacer DÉFINITIVEMENT toutes les données de ce logiciel sur cette machine :\n\nélèves, échéances, paiements, dépenses, personnel, enseignants, pointages, paie, bulletins, documents et journal d\'activité.\n\n(Votre licence et votre compte restent actifs — pas besoin de réactiver.)\n\nPensez à exporter une sauvegarde avant si besoin.\n\nContinuer ?');
  if(!premiere) return;
  const seconde = confirm('Dernière confirmation : voulez-vous vraiment repartir sur une base totalement vierge ? Cette action est irréversible.');
  if(!seconde) return;

  // On préserve la licence, le compte et l'identifiant machine : réinitialiser
  // les données de l'école ne doit pas obliger à se reconnecter à internet.
  const preserved = [DB.KEYS.license, DB.KEYS.accountCreated, DB.KEYS.machineId];
  Object.values(DB.KEYS).forEach(k => { if(!preserved.includes(k)) localStorage.removeItem(k); });
  localStorage.removeItem('cepeed_rapports_history');
  localStorage.removeItem('cepeed_seen_alert_ids');

  DB.seed();
  toast('✔ Toutes les données ont été effacées — le logiciel est maintenant vierge');
  setTimeout(()=> location.href = 'dashboard.html', 900);
}

function exporterSauvegarde(){
  // La licence, le compte et l'identifiant machine ne sont JAMAIS inclus dans l'export :
  // une clé de licence reste liée à une seule machine, même en transférant les données.
  const exclus = [DB.KEYS.license, DB.KEYS.accountCreated, DB.KEYS.machineId];
  const backup = { __cepeed_export__: true, version: 1, exportedAt: new Date().toISOString(), data: {} };
  Object.values(DB.KEYS).forEach(k => { if(!exclus.includes(k)) backup.data[k] = DB.get(k, null); });
  const blob = new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cepeed-donnees-completes-' + new Date().toISOString().slice(0,10) + '.json';
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-save-icon lucide-save"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg>', 'Export de toutes les données du logiciel (transfert / sauvegarde)');
  toast('✔ Toutes les données ont été exportées dans un seul fichier');
  document.getElementById('lastExportInfo').textContent = 'Dernier export : ' + new Date().toLocaleString('fr-FR');
}

let pendingImportData = null;

function importerSauvegarde(input){
  const file = input.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = function(e){
    let parsed;
    try{
      parsed = JSON.parse(e.target.result);
    }catch(err){
      toast('⚠ Fichier invalide : ce n\'est pas un fichier JSON valide');
      input.value = '';
      return;
    }

    // accepte le format d'export CEPEED (avec enveloppe) ou un ancien export brut (clés directes)
    const data = (parsed && parsed.__cepeed_export__) ? parsed.data : parsed;
    if(!data || typeof data !== 'object'){
      toast('⚠ Ce fichier ne contient pas de données CEPEED reconnaissables');
      input.value = '';
      return;
    }

    const knownKeys = Object.values(DB.KEYS);
    const foundKeys = Object.keys(data).filter(k => knownKeys.includes(k));
    if(!foundKeys.length){
      toast('⚠ Ce fichier ne contient aucune donnée CEPEED reconnaissable');
      input.value = '';
      return;
    }

    pendingImportData = data;

    const compteur = (k) => Array.isArray(data[k]) ? data[k].length : (data[k] ? 1 : 0);
    const nbEleves = compteur(DB.KEYS.students);
    const nbPaiements = compteur(DB.KEYS.payments);
    const nbEcheances = compteur(DB.KEYS.echeances);
    const nbStaff = compteur(DB.KEYS.staffAdmin) + compteur(DB.KEYS.teachers);
    const dateExport = parsed && parsed.exportedAt ? new Date(parsed.exportedAt).toLocaleString('fr-FR') : 'inconnue';

    document.getElementById('importSummary').innerHTML = `
      <p><b>Fichier</b> : ${file.name}</p>
      <p><b>Exporté le</b> : ${dateExport}</p>
      <p><b>Contenu détecté</b> : ${nbEleves} élève(s), ${nbPaiements} paiement(s), ${nbEcheances} échéance(s), ${nbStaff} membre(s) du personnel/enseignant(s).</p>
    `;
    document.getElementById('importModal').classList.add('open');
    input.value = '';
  };
  reader.onerror = function(){
    toast('⚠ Impossible de lire le fichier');
    input.value = '';
  };
  reader.readAsText(file);
}

function closeImportModal(){
  document.getElementById('importModal').classList.remove('open');
  pendingImportData = null;
}

function confirmerImport(){
  if(!pendingImportData) return;
  // Sécurité : un fichier importé ne peut jamais écraser la licence,
  // le statut de compte ou l'identifiant machine de CETTE installation.
  const proteges = [DB.KEYS.license, DB.KEYS.accountCreated, DB.KEYS.machineId];
  Object.values(DB.KEYS).forEach(k=>{
    if(proteges.includes(k)) return;
    if(Object.prototype.hasOwnProperty.call(pendingImportData, k) && pendingImportData[k] !== null){
      localStorage.setItem(k, JSON.stringify(pendingImportData[k]));
    }
  });
  closeImportModal();
  toast('✔ Données importées avec succès — rechargement...');
  setTimeout(()=> location.reload(), 900);
}
