document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('cDate').value = new Date().toISOString().slice(0,10);
  renderAll();
  window.addEventListener('cepeed:data-changed', renderAll);
  window.addEventListener('storage', renderAll);
});

/* Fusionne enseignants + personnel administratif ACTIFS en une seule liste unifiée
   (chacun peut manger à la cantine, prof comme administratif). */
function getPersonnelActif(){
  const teachers = DB.get(DB.KEYS.teachers, []).filter(t=>t.statut==='Actif')
    .map(t=>({id:t.id, nom:t.nom, prenom:t.prenom, type:'enseignant', poste:t.matiere, tauxHoraire:t.tauxHoraire}));
  const staff = DB.get(DB.KEYS.staffAdmin, []).filter(s=>s.statut==='Actif')
    .map(s=>({id:s.id, nom:s.nom, prenom:s.prenom, type:'admin', poste:s.poste, salaireFixe:s.salaireFixe}));
  return [...teachers, ...staff];
}
/* Version incluant aussi le personnel inactif/supprimé, pour ne pas casser l'affichage
   de l'historique si quelqu'un a été désactivé ou supprimé entre-temps. */
function getPersonnelTous(){
  const teachers = DB.get(DB.KEYS.teachers, [])
    .map(t=>({id:t.id, nom:t.nom, prenom:t.prenom, type:'enseignant', poste:t.matiere, tauxHoraire:t.tauxHoraire}));
  const staff = DB.get(DB.KEYS.staffAdmin, [])
    .map(s=>({id:s.id, nom:s.nom, prenom:s.prenom, type:'admin', poste:s.poste, salaireFixe:s.salaireFixe}));
  return [...teachers, ...staff];
}

function renderAll(){
  fillPersonneSelect();
  renderStats();
  renderRecapCantine();
  renderHistorique();
}

function fillPersonneSelect(){
  const personnel = getPersonnelActif();
  const enseignants = personnel.filter(p=>p.type==='enseignant');
  const admins = personnel.filter(p=>p.type==='admin');
  const sel = document.getElementById('cPersonne');
  const previous = sel.value;
  sel.innerHTML =
    (enseignants.length ? `<optgroup label="Enseignants">${enseignants.map(p=>`<option value="${p.id}">${p.prenom} ${p.nom} — ${p.poste}</option>`).join('')}</optgroup>` : '') +
    (admins.length ? `<optgroup label="Personnel Administratif">${admins.map(p=>`<option value="${p.id}">${p.prenom} ${p.nom} — ${p.poste}</option>`).join('')}</optgroup>` : '');
  if(!sel.innerHTML) sel.innerHTML = '<option value="" disabled selected>Aucun personnel actif — voir RH</option>';
  else if(previous) sel.value = previous;
}

function enregistrerConsommation(){
  const personId = document.getElementById('cPersonne').value;
  const montant = Number(document.getElementById('cMontant').value);
  const description = document.getElementById('cDescription').value.trim();
  const date = document.getElementById('cDate').value;
  if(!personId){ toast('⚠ Sélectionnez une personne'); return; }
  if(!montant || montant<=0){ toast('⚠ Indiquez le montant consommé (variable selon le repas)'); return; }
  if(!date){ toast('⚠ Indiquez la date'); return; }

  const personne = getPersonnelActif().find(p=>p.id===personId);
  if(!personne){ toast('⚠ Personne introuvable'); return; }

  DB.enregistrerConsommationCantine({
    personId, personType: personne.type, nom: `${personne.prenom} ${personne.nom}`,
    montant, description, date
  });
  DB.logActivity('🍽', `Consommation cantine enregistrée pour ${personne.prenom} ${personne.nom} — ${DB.fmtFCFA(montant)}${description ? ' ('+description+')' : ''}`);
  toast('✔ Consommation enregistrée (' + DB.fmtFCFA(montant) + ')');
  document.getElementById('cMontant').value = '';
  document.getElementById('cDescription').value = '';
  renderAll();
}

function supprimerConsommation(id){
  if(!confirm('Supprimer cette consommation ?')) return;
  const conso = DB.get(DB.KEYS.cantineConso, []).filter(c=>c.id!==id);
  DB.set(DB.KEYS.cantineConso, conso);
  toast('✔ Consommation supprimée');
  renderAll();
}

function renderStats(){
  const conso = DB.get(DB.KEYS.cantineConso, []);
  const today = new Date().toISOString().slice(0,10);
  const curMonth = new Date().toISOString().slice(0,7);

  const consoAujourdhui = conso.filter(c=>c.date===today);
  const consoMois = conso.filter(c=>c.date.startsWith(curMonth));

  document.getElementById('statConsoJour').textContent = DB.fmtFCFA(consoAujourdhui.reduce((s,c)=>s+c.montant,0));
  document.getElementById('statRepasJour').textContent = consoAujourdhui.length;
  document.getElementById('statConsoMois').textContent = DB.fmtFCFA(consoMois.reduce((s,c)=>s+c.montant,0));
  document.getElementById('statPersonnesActives').textContent = getPersonnelActif().length;
}

/* Récapitulatif du mois en cours : ce qui est dû (pointage d'heures pour un enseignant,
   salaire fixe pour un administratif) VS ce qui a déjà été consommé à la cantine VS ce
   qu'il reste réellement à payer à la personne. */
function renderRecapCantine(){
  const personnel = getPersonnelActif();
  const curMonth = new Date().toISOString().slice(0,7);

  document.getElementById('recapCantineBody').innerHTML = personnel.length ? personnel.map(p=>{
    const due = DB.duPersonnelAvantCantine(p, p.type, curMonth);
    const cantine = DB.totalConsommationCantine(p.id, curMonth);
    const net = due.montant - cantine;
    return `<tr>
      <td>${p.prenom} ${p.nom}</td>
      <td><span class="badge ${p.type==='enseignant'?'badge-blue':'badge-gray'}">${p.type==='enseignant'?'Enseignant':'Administratif'}</span></td>
      <td>${due.heures!=null ? due.heures.toFixed(2)+' h' : '—'}</td>
      <td style="text-align:right;">${DB.fmtFCFA(due.montant)}</td>
      <td style="text-align:right;color:${cantine>0?'var(--red)':'inherit'};">${cantine>0 ? '- '+DB.fmtFCFA(cantine) : '-'}</td>
      <td style="text-align:right;font-weight:700;${net<0?'color:var(--red);':''}">${DB.fmtFCFA(net)}</td>
      <td><button class="btn btn-outline btn-sm" onclick="window.open('cantine-releve.html?personId=${p.id}&mois=${curMonth}','_blank')"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-save-icon lucide-save"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"/><path d="M7 3v4a1 1 0 0 0 1 1h7"/></svg> Imprimer</button></td>
    </tr>`;
  }).join('') : '<tr><td colspan="7" class="empty-state">Aucun personnel actif</td></tr>';
}

function renderHistorique(){
  const conso = DB.get(DB.KEYS.cantineConso, []).slice().sort((a,b)=> b.horodatage.localeCompare(a.horodatage));
  const personnel = getPersonnelTous();
  document.getElementById('historiqueBody').innerHTML = conso.length ? conso.map(c=>{
    const p = personnel.find(x=>x.id===c.personId);
    return `<tr>
      <td>${c.date}</td>
      <td>${c.nom}${p ? '' : ' <span class="small text-muted">(supprimé)</span>'}</td>
      <td><span class="badge ${c.personType==='enseignant'?'badge-blue':'badge-gray'}">${c.personType==='enseignant'?'Enseignant':'Administratif'}</span></td>
      <td>${c.description}</td>
      <td style="text-align:right;font-weight:700;">${DB.fmtFCFA(c.montant)}</td>
      <td><button class="btn btn-danger btn-sm" onclick="supprimerConsommation('${c.id}')"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-icon lucide-trash"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button></td>
    </tr>`;
  }).join('') : '<tr><td colspan="6" class="empty-state">Aucune consommation enregistrée</td></tr>';
}
