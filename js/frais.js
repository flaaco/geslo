let gridVisible = false;
let classManagerVisible = false;

document.addEventListener('DOMContentLoaded', ()=>{
  fillClasseSelect();
  renderFeesForClasse();
  renderGrid();
  renderClassManager();
});

function fillClasseSelect(){
  const sel = document.getElementById('classeSelect');
  const previous = sel.value;
  sel.innerHTML = DB.getClasses().map(c=>`<option value="${c}">${c}</option>`).join('');
  if(previous && DB.getClasses().includes(previous)) sel.value = previous;
}

function toggleClassManager(){
  classManagerVisible = !classManagerVisible;
  document.getElementById('classManagerCard').style.display = classManagerVisible ? 'block' : 'none';
  if(classManagerVisible) renderClassManager();
}

function renderClassManager(){
  const students = DB.get(DB.KEYS.students, []);
  const classes = DB.getClasses();
  document.getElementById('classesBody').innerHTML = classes.length ? classes.map(c=>{
    const nb = students.filter(s=>s.classe===c).length;
    return `<tr>
      <td style="font-weight:600;">${c}</td>
      <td>${nb}</td>
      <td class="flex gap-8">
        <button class="btn btn-outline btn-sm" onclick="renommerClasseUI('${c.replace(/'/g,"\\'")}')"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg> Renommer</button>
        <button class="btn btn-danger btn-sm" onclick="supprimerClasseUI('${c.replace(/'/g,"\\'")}')"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Supprimer</button>
      </td>
    </tr>`;
  }).join('') : '<tr><td colspan="3" class="empty-state">Aucune classe configurée</td></tr>';
}

function ajouterClasseUI(){
  const input = document.getElementById('newClasseInput');
  const res = DB.ajouterClasse(input.value);
  if(!res.success){ toast('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-triangle-alert-icon lucide-triangle-alert"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> ' + res.message); return; }
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-school-icon lucide-school"><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M18 4.933V21"/><path d="m4 6 7.106-3.79a2 2 0 0 1 1.788 0L20 6"/><path d="m6 11-3.52 2.147a1 1 0 0 0-.48.854V19a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a1 1 0 0 0-.48-.853L18 11"/><path d="M6 4.933V21"/><circle cx="12" cy="9" r="2"/></svg>', `Nouvelle classe créée : "${input.value.trim()}"`);
  toast('✔ Classe ajoutée — un tarif par défaut a été créé pour chaque frais');
  input.value = '';
  fillClasseSelect();
  renderClassManager();
  renderFeesForClasse();
  if(gridVisible) renderGrid();
}

function renommerClasseUI(ancien){
  const nouveau = prompt('Nouveau nom pour la classe :', ancien);
  if(!nouveau || nouveau.trim() === ancien) return;
  const res = DB.renommerClasse(ancien, nouveau);
  if(!res.success){ toast('⚠ ' + res.message); return; }
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pencil-icon lucide-pencil"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/></svg>', `Classe renommée : "${ancien}" → "${nouveau.trim()}"${res.elevesModifies ? ` (${res.elevesModifies} élève(s) mis à jour)` : ''}`);
  toast('✔ Classe renommée');
  fillClasseSelect();
  renderClassManager();
  renderFeesForClasse();
  if(gridVisible) renderGrid();
}

function supprimerClasseUI(nom){
  if(!confirm(`Supprimer définitivement la classe "${nom}" ?`)) return;
  const res = DB.supprimerClasse(nom);
  if(!res.success){ toast('⚠ ' + res.message); return; }
  DB.logActivity('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>', `Classe supprimée : "${nom}"`);
  toast('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Classe supprimée');
  fillClasseSelect();
  renderClassManager();
  renderFeesForClasse();
  if(gridVisible) renderGrid();
}

function toggleGrid(){
  gridVisible = !gridVisible;
  document.getElementById('gridCard').style.display = gridVisible ? 'block' : 'none';
  document.getElementById('singleClasseCard').style.display = gridVisible ? 'none' : 'block';
  document.getElementById('gridToggleBtn').textContent = gridVisible ? 'Voir par Classe' : 'Voir la Grille de Toutes les Classes';
  if(gridVisible) renderGrid();
}

/* ---------------- VUE PAR CLASSE ---------------- */
function renderFeesForClasse(){
  const classe = document.getElementById('classeSelect').value;
  const fees = DB.get(DB.KEYS.fees, []);

  document.getElementById('feesBody').innerHTML = fees.length ? fees.map((f,i)=>`
    <tr>
      <td style="font-weight:600;">${f.type}</td>
      <td>
        <input type="number" class="doc-input" style="width:110px;border:1px solid var(--border);border-radius:6px;padding:6px 8px;"
          value="${DB.tarifFrais(f.type, classe)}" min="0"
          onchange="updateTarif(${i}, '${classe.replace(/'/g,"\\'")}', this.value)">
      </td>
      <td><span class="badge ${f.mensuel?'badge-blue':'badge-gray'}" style="cursor:pointer;" onclick="toggleMensuel(${i})" title="Cliquez pour basculer">${f.mensuel?'Oui (Oct→Juin)':'Non (annuel/unique)'}</span></td>
      <td><span class="badge ${f.actif?'badge-green':'badge-gray'}">${f.actif?'Actif':'Inactif'}</span></td>
      <td class="flex gap-8">
        <button class="btn btn-outline btn-sm" onclick="copierATouteLesClasses(${i}, '${classe.replace(/'/g,"\\'")}')">Appliquer à toutes les classes</button>
        <button class="btn btn-outline btn-sm" onclick="toggleFee(${i})">${f.actif?'Désactiver':'Activer'}</button>
        <button class="btn btn-danger btn-sm" onclick="deleteFee(${i})">Supprimer</button>
      </td>
    </tr>`).join('') : '<tr><td colspan="5" class="empty-state">Aucun frais configuré</td></tr>';
}

function toggleMensuel(i){
  const fees = DB.get(DB.KEYS.fees, []);
  if(!fees[i]) return;
  fees[i].mensuel = !fees[i].mensuel;
  DB.set(DB.KEYS.fees, fees);
  toast(`✔ "${fees[i].type}" est maintenant ${fees[i].mensuel ? 'un frais MENSUEL (Oct→Juin)' : 'un frais annuel/unique'}`);
  renderFeesForClasse();
  if(gridVisible) renderGrid();
}

function updateTarif(i, classe, valeur){
  const fees = DB.get(DB.KEYS.fees, []);
  if(!fees[i]) return;
  if(!fees[i].tarifs) fees[i].tarifs = {};
  fees[i].tarifs[classe] = Math.max(0, Number(valeur)||0);
  DB.set(DB.KEYS.fees, fees);
  toast(`✔ Tarif "${fees[i].type}" mis à jour pour ${classe}`);
  if(gridVisible) renderGrid();
}

function copierATouteLesClasses(i, classeSource){
  const fees = DB.get(DB.KEYS.fees, []);
  const fee = fees[i];
  if(!fee) return;
  const montant = DB.tarifFrais(fee.type, classeSource);
  if(!confirm(`Appliquer ${DB.fmtFCFA(montant)} pour "${fee.type}" à TOUTES les classes ?`)) return;
  fee.tarifs = {};
  DB.getClasses().forEach(c => fee.tarifs[c] = montant);
  fee.montantParDefaut = montant;
  DB.set(DB.KEYS.fees, fees);
  toast('✔ Montant appliqué à toutes les classes');
  renderFeesForClasse();
  if(gridVisible) renderGrid();
}

function toggleFee(i){
  const fees = DB.get(DB.KEYS.fees, []);
  fees[i].actif = !fees[i].actif;
  DB.set(DB.KEYS.fees, fees);
  renderFeesForClasse();
  if(gridVisible) renderGrid();
}
function deleteFee(i){
  const fees = DB.get(DB.KEYS.fees, []);
  if(!confirm(`Supprimer définitivement le frais "${fees[i].type}" (toutes classes confondues) ?`)) return;
  fees.splice(i,1);
  DB.set(DB.KEYS.fees, fees);
  renderFeesForClasse();
  if(gridVisible) renderGrid();
  toast('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg> Frais supprimé');
}

/* ---------------- MODAL NOUVEAU FRAIS ---------------- */
function openFeeModal(){ document.getElementById('feeModal').classList.add('open'); }
function closeFeeModal(){ document.getElementById('feeModal').classList.remove('open'); }
function saveFee(){
  const type = document.getElementById('mFeeType').value.trim();
  const montant = Number(document.getElementById('mFeeMontant').value);
  const mensuel = document.getElementById('mFeeMensuel').checked;
  if(!type || !montant){ toast('⚠ Veuillez remplir tous les champs'); return; }

  const tarifs = {};
  DB.getClasses().forEach(c => tarifs[c] = montant);

  const fees = DB.get(DB.KEYS.fees, []);
  fees.push({type, montantParDefaut: montant, actif:true, mensuel, tarifs});
  DB.set(DB.KEYS.fees, fees);
  closeFeeModal();
  renderFeesForClasse();
  if(gridVisible) renderGrid();
  toast('✔ Frais ajouté pour toutes les classes — ajustez-le classe par classe si besoin');
  document.getElementById('mFeeType').value='';
  document.getElementById('mFeeMontant').value='';
  document.getElementById('mFeeMensuel').checked=false;
}

/* ---------------- VUE GRILLE (TOUTES LES CLASSES) ---------------- */
function renderGrid(){
  const fees = DB.get(DB.KEYS.fees, []);

  document.getElementById('gridHeadRow').innerHTML =
    '<th>Type de Frais</th>' + DB.getClasses().map(c=>`<th>${c}</th>`).join('');

  document.getElementById('gridBody').innerHTML = fees.length ? fees.map((f,i)=>`
    <tr>
      <td style="font-weight:600;white-space:nowrap;">${f.type} ${!f.actif?'<span class="badge badge-gray">Inactif</span>':''}</td>
      ${DB.getClasses().map(c=>`
        <td><input type="number" class="doc-input" style="width:80px;border:1px solid var(--border);border-radius:6px;padding:5px 6px;"
          value="${DB.tarifFrais(f.type, c)}" min="0" onchange="updateTarif(${i}, '${c.replace(/'/g,"\\'")}', this.value)"></td>
      `).join('')}
    </tr>`).join('') : `<tr><td colspan="${DB.getClasses().length+1}" class="empty-state">Aucun frais configuré</td></tr>`;
}
