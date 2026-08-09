document.addEventListener('DOMContentLoaded', ()=>{
  const students = DB.get(DB.KEYS.students, []);
  const sel = document.getElementById('eleveSelect');
  sel.innerHTML = students.map(s=>`<option value="${s.id}">${s.prenom} ${s.nom} (${s.id})</option>`).join('');
  const params = new URLSearchParams(location.search);
  const initial = params.get('eleve') || (students[0] && students[0].id);
  sel.value = initial;
  loadParcours(initial);
});

function loadParcours(id){
  const students = DB.get(DB.KEYS.students, []);
  const el = students.find(s=>s.id===id);
  if(!el){
    document.getElementById('pNom').textContent = '';
    document.getElementById('pClasse').textContent = '';
    document.getElementById('histoBody').innerHTML = '<tr><td colspan="5" class="empty-state">Aucun élève inscrit pour le moment. Rendez-vous dans Inscription pour en ajouter.</td></tr>';
    return;
  }

  document.getElementById('pNom').textContent = `${el.prenom} ${el.nom} (CEPEED-2026-${el.id.split('-').pop()})`;
  document.getElementById('pClasse').textContent = `Classe: ${el.classe}`;
  document.getElementById('pStatut').textContent = el.statut;
  document.getElementById('pPhotoBox').innerHTML = DB.avatarHTML(el.photo, 64, '50%', 26);

  const histo = (el.historique && el.historique.length) ? el.historique : [
    {annee:'2025-2026', classe: el.classe, moyenne:null, decision:'En cours'}
  ];

  document.getElementById('histoBody').innerHTML = histo.slice().reverse().map(h => `
    <tr>
      <td>${h.annee}</td>
      <td>${h.classe}</td>
      <td>${h.moyenne!=null ? h.moyenne.toFixed(2) : '--'}</td>
      <td>${h.decision}</td>
      <td><button class="btn btn-outline btn-sm" onclick="window.open('bulletin.html?eleve=${el.id}','_blank')"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-eye-icon lucide-eye"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg> View Bull.</button></td>
    </tr>`).join('');

  const chartData = histo.filter(h=>h.moyenne!=null);
  drawBarChart('chartMoyennes',
    chartData.map(h=>h.moyenne),
    chartData.map(h=>h.annee));
}

function drawBarChart(canvasId, values, labels){
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const parent = canvas.parentElement;
  const w = canvas.width = parent.clientWidth;
  const h = canvas.height = 210;
  const max = 20;
  const padL = 34, padB = 24, padT = 14, padR = 10;
  const plotW = w - padL - padR, plotH = h - padT - padB;

  ctx.clearRect(0,0,w,h);
  ctx.font = '10px Inter, sans-serif';

  for(let i=0;i<=4;i++){
    const y = padT + plotH - (plotH/4)*i;
    ctx.strokeStyle = '#e6e9f2';
    ctx.beginPath(); ctx.moveTo(padL,y); ctx.lineTo(w-padR,y); ctx.stroke();
    ctx.fillStyle = '#7c85a3';
    ctx.fillText((max/4*i).toFixed(2), 2, y+3);
  }

  const barW = plotW / values.length * 0.5;
  values.forEach((v,i)=>{
    const slot = plotW / values.length;
    const x = padL + slot*i + (slot-barW)/2;
    const barH = (v/max)*plotH;
    const y = padT + plotH - barH;
    ctx.fillStyle = '#2f6fed';
    ctx.fillRect(x,y,barW,barH);
    ctx.fillStyle = '#16213e';
    ctx.fillText(v.toFixed(2), x-2, y-6);
    ctx.fillStyle = '#7c85a3';
    ctx.fillText(labels[i], x-6, h-6);
  });
}
