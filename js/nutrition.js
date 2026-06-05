/* ═══ WELCOME SCREEN ═══ */
function _wsInit(){
  const ws = document.getElementById('welcome-screen');
  if(!ws) return;
  // Programme pré-chargé — on masque directement l'écran de bienvenue
  ws.classList.add('hidden');
  document.body.style.overflow = '';
}
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', _wsInit);
} else {
  _wsInit();
}

function _wsApplyData(data){
  if(!data.week || !Array.isArray(data.week) || data.week.length !== 7){
    showToast('❌ Fichier invalide — format incorrect');
    return;
  }
  S = {
    week:          data.week          || defaultState().week,
    logs:          data.logs          || {},
    done:          data.done          || {},
    notes:         data.notes         || {},
    savedWeeks:    data.savedWeeks    || {},
    wellness:      data.wellness      || {},
    periodization: data.periodization || {enabled:false,anchor:null,weeks:{A:null,B:null,C:null}},
  };
  applyPeriodizationWeek();
  saveState();
  wsDismiss();
  renderStats();
  renderVolumeDayChart();
  renderWeekCmp();
  renderStrip();
  renderSession();
  renderPerioBar('perio-dash-bar');
  showToast('Programme chargé ✓');
}

function _wsReadFile(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    try {
      const data = JSON.parse(e.target.result);
      _wsApplyData(data);
    } catch(err){
      alert('Fichier invalide : ' + err.message);
    }
  };
  reader.readAsText(file);
}

function wsFileLoad(inp){
  _wsReadFile(inp.files[0]);
}

function wsDragOver(e){
  e.preventDefault();
  document.getElementById('ws-drop').classList.add('dragover');
}
function wsDragLeave(e){
  document.getElementById('ws-drop').classList.remove('dragover');
}
function wsDrop(e){
  e.preventDefault();
  document.getElementById('ws-drop').classList.remove('dragover');
  _wsReadFile(e.dataTransfer.files[0]);
}

function wsDismiss(){
  const ws = document.getElementById('welcome-screen');
  if(ws){
    ws.style.opacity = '0';
    ws.style.transition = 'opacity .25s ease';
    setTimeout(() => { ws.classList.add('hidden'); ws.style.opacity=''; }, 250);
  }
  document.body.style.overflow = '';
}






(function(){
  const canvas = document.createElement('canvas');
  canvas.id = 'confetti-canvas';
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;display:none';
  document.body.appendChild(canvas);

  const banner = document.createElement('div');
  banner.id = 'pr-banner';
  banner.innerHTML = `<div class="pr-banner-icon" id="pr-banner-icon">🏆</div>
    <div class="pr-banner-body">
      <div class="pr-banner-title">Nouveau record !</div>
      <div class="pr-banner-detail" id="pr-banner-detail">—</div>
      <div class="pr-banner-sub" id="pr-banner-sub"></div>
    </div>
    <button class="pr-banner-close" onclick="hidePRBanner()">✕</button>`;
  document.body.appendChild(banner);
})();

let _prBannerTimer = null;
let _confettiAnim = null;
let _lastPRKey = null;

function firePRCelebration(exName, w, r, prevW, prevR){
  const newStr = w ? `${w}kg × ${r} rép.` : `${r} rép.`;
  const prevStr = (prevW || prevR) ? (prevW ? `${prevW}kg × ${prevR} rép.` : `${prevR} rép.`) : null;

  document.getElementById('pr-banner-detail').textContent = exName.split('(')[0].trim();
  const subEl = document.getElementById('pr-banner-sub');
  subEl.textContent = newStr + (prevStr ? ' — Avant : ' + prevStr : ' — Premier record !');

  const iconEl = document.getElementById('pr-banner-icon');
  iconEl.classList.remove('shake');
  void iconEl.offsetWidth;
  iconEl.classList.add('shake');

  const banner = document.getElementById('pr-banner');
  banner.classList.remove('hide');
  banner.classList.add('show');

  if(_prBannerTimer) clearTimeout(_prBannerTimer);
  _prBannerTimer = setTimeout(hidePRBanner, 4500);

  launchConfetti();
}

function hidePRBanner(){
  if(_prBannerTimer){ clearTimeout(_prBannerTimer); _prBannerTimer=null; }
  const banner = document.getElementById('pr-banner');
  banner.classList.remove('show');
  banner.classList.add('hide');
  setTimeout(()=>banner.classList.remove('hide'), 350);
}

function launchConfetti(){
  const canvas = document.getElementById('confetti-canvas');
  if(!canvas) return;
  canvas.style.display = 'block';
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d');

  const COLORS = ['#4ade80','#60a5fa','#fbbf24','#f87171','#a78bfa','#34d399','#fb923c'];
  const pieces = Array.from({length:120}, ()=>({
    x: Math.random() * canvas.width,
    y: -12 - Math.random() * 220,
    r: 4 + Math.random() * 5,
    d: 1.6 + Math.random() * 2.8,
    color: COLORS[Math.floor(Math.random()*COLORS.length)],
    tilt: Math.random() * 10 - 5,
    tiltAngle: 0,
    tiltSpeed: 0.07 + Math.random() * 0.09,
    shape: Math.random() > 0.45 ? 'rect' : 'circle',
    w: 6 + Math.random() * 7,
    h: 3 + Math.random() * 4,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.18,
    opacity: 1,
  }));

  let frame = 0;
  if(_confettiAnim) cancelAnimationFrame(_confettiAnim);

  function draw(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    frame++;
    let alive = false;

    pieces.forEach(p=>{
      p.tiltAngle += p.tiltSpeed;
      p.y += p.d + Math.sin(frame * 0.022 + p.tilt) * 0.6;
      p.x += Math.sin(frame * 0.016 + p.tiltAngle) * 1.3;
      p.rot += p.rotSpeed;
      if(frame > 90) p.opacity = Math.max(0, p.opacity - 0.011);

      if(p.y < canvas.height + 20 && p.opacity > 0) alive = true;

      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      if(p.shape === 'circle'){
        ctx.beginPath();
        ctx.arc(0,0,p.r,0,Math.PI*2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);
      }
      ctx.restore();
    });

    if(alive){
      _confettiAnim = requestAnimationFrame(draw);
    } else {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      canvas.style.display = 'none';
    }
  }
  draw();
}

/* ═══════════════════════════════════════════
   NUTRITION MODULE
   ═══════════════════════════════════════════ */
let _nutrDay = null; // YYYY-MM-DD string, null = today
let _nutrChart = null;
let _nutrChartMode = 'kcal'; // 'kcal' | 'prot'

function nutrTodayKey(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function nutrCurrentKey(){ return _nutrDay || nutrTodayKey(); }

function nutrGoToday(){ _nutrDay=null; renderNutrition(); }
function nutrNav(delta){
  const k = nutrCurrentKey();
  const d = new Date(k+'T12:00:00');
  d.setDate(d.getDate()+delta);
  const nk = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  if(nk===nutrTodayKey()) _nutrDay=null; else _nutrDay=nk;
  renderNutrition();
}

function nutrGetData(){ return S.nutrition || {}; }
function nutrGetEntry(dk){ const d=nutrGetData(); return d[dk] || {kcal:'',prot:''}; }
function nutrGetGoals(){ return S.nutrGoals || {kcal:2000,prot:150}; }

function nutrSaveGoals(){
  const gk = document.getElementById('nutr-goal-kcal');
  const gp = document.getElementById('nutr-goal-prot');
  const kcal = gk ? (parseInt(gk.value)||0) : ((S.nutrGoals&&S.nutrGoals.kcal)||0);
  const prot = gp ? (parseInt(gp.value)||0) : ((S.nutrGoals&&S.nutrGoals.prot)||0);
  S.nutrGoals = {kcal,prot};
  saveState();
  renderNutrDayCards();
  renderNutrWeekChart();
  renderNutrCorr();
  renderNutrStreak();
}

function nutrSaveEntry(dk, field, val){
  if(!S.nutrition) S.nutrition={};
  if(!S.nutrition[dk]) S.nutrition[dk]={kcal:'',prot:''};
  S.nutrition[dk][field] = val===''?'':(parseInt(val)||0);
  saveState();

  // ── On NE re-rend PAS les cartes (ça détruirait l'input en cours de frappe). ──
  // On met seulement à jour l'affichage et la barre de progression du champ concerné, en direct.
  const stored = S.nutrition[dk][field];
  const goals = nutrGetGoals();
  const goal = field==='kcal' ? (goals.kcal||0) : (goals.prot||0);

  // Met à jour le gros chiffre affiché
  const disp = document.getElementById('nutr-disp-'+field);
  if(disp) disp.textContent = (stored!=='' && stored!=null) ? stored : '—';

  // Met à jour la barre de progression du même champ
  const card = document.getElementById('nutr-card-'+field);
  if(card){
    const barWrap = card.querySelector('.nutr-progress');
    const pctLbl  = card.querySelector('.nutr-goal-pct');
    if(goal){
      const numeric = (stored!=='' && stored!=null) ? +stored : 0;
      const pct = Math.min(100, Math.round((numeric/goal)*100));
      const over = numeric>goal;
      const fillCls = over ? 'nutr-progress-over' : (field==='kcal'?'nutr-progress-kcal':'nutr-progress-prot');
      if(barWrap){
        barWrap.innerHTML = `<div class="nutr-progress-fill ${fillCls}" style="width:${pct}%"></div>`;
      }
      if(pctLbl){
        pctLbl.textContent = `${pct}% de l'objectif (${goal}${field==='kcal'?'kcal':'g'})`;
      }
    }
  }

  // Le graphe et la corrélation peuvent être rafraîchis sans toucher aux inputs.
  renderNutrWeekChart();
  renderNutrCorr();
  renderNutrStreak();
}

function nutrSwitchChart(mode){
  _nutrChartMode = mode;
  document.getElementById('nutr-tab-kcal').className='mt'+(mode==='kcal'?' on':'');
  document.getElementById('nutr-tab-prot').className='mt'+(mode==='prot'?' on':'');
  renderNutrWeekChart();
}

// ── Streak : jours consécutifs (jusqu'à hier/aujourd'hui) avec ≥90% de l'objectif kcal ──
function nutrComputeStreak(){
  const goals = nutrGetGoals();
  const data  = nutrGetData();
  const goal  = goals.kcal || 0;
  if(!goal) return 0;
  const seuil = goal * 0.9;

  // On part d'aujourd'hui. Si aujourd'hui n'est pas encore rempli, on démarre la veille
  // (pour ne pas casser le streak juste parce que la journée n'est pas finie).
  let cur = new Date();
  const fmt = d => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  const todayKey = fmt(cur);
  const todayEntry = data[todayKey];
  const todayKcal = todayEntry && todayEntry.kcal!=='' ? +todayEntry.kcal : null;
  if(todayKcal === null || todayKcal < seuil){
    cur.setDate(cur.getDate() - 1); // on ignore aujourd'hui, on compte depuis hier
  }

  let streak = 0;
  for(let i=0; i<400; i++){ // garde-fou
    const e = data[fmt(cur)];
    const k = e && e.kcal!=='' ? +e.kcal : null;
    if(k !== null && k >= seuil){ streak++; cur.setDate(cur.getDate()-1); }
    else break;
  }
  return streak;
}

function renderNutrStreak(){
  const el = document.getElementById('nutr-streak');
  if(!el) return;
  const s = nutrComputeStreak();
  if(s <= 0){ el.style.display='none'; el.innerHTML=''; return; }
  const flame = s >= 7 ? '🔥🔥' : '🔥';
  const col = s >= 14 ? 'var(--green)' : s >= 7 ? 'var(--yellow)' : 'var(--t1)';
  el.style.display = 'inline-flex';
  el.innerHTML = '<span style="display:inline-flex;align-items:center;gap:5px;font-family:var(--mono);font-size:10px;background:var(--s3);border:1px solid var(--b2);border-radius:var(--r);padding:3px 9px">'
    + flame + '<b style="color:'+col+';font-size:12px">'+s+'</b>'
    + '<span style="color:var(--t3)">jour'+(s>1?'s':'')+' d\'affilée</span></span>';
}

function renderNutrition(){
  const dk = nutrCurrentKey();
  const today = nutrTodayKey();
  const isToday = dk===today;

  // Date label
  const d = new Date(dk+'T12:00:00');
  const dayNames = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const monthNames = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];
  const sub = document.getElementById('nutr-date-sub');
  const navLbl = document.getElementById('nutr-nav-lbl');
  if(sub) sub.textContent = isToday ? "Aujourd'hui · "+dayNames[d.getDay()]+' '+d.getDate()+' '+monthNames[d.getMonth()] : dayNames[d.getDay()]+' '+d.getDate()+' '+monthNames[d.getMonth()]+' '+d.getFullYear();
  if(navLbl) navLbl.textContent = d.getDate()+'/'+String(d.getMonth()+1).padStart(2,'0');

  // Goals
  const goals = nutrGetGoals();
  const gk = document.getElementById('nutr-goal-kcal');
  const gp = document.getElementById('nutr-goal-prot');
  if(gk&&!gk.matches(':focus')) gk.value = goals.kcal||'';
  if(gp&&!gp.matches(':focus')) gp.value = goals.prot||'';

  renderNutrDayCards();
  renderNutrWeekChart();
  renderNutrCorr();
  renderNutrStreak();
}

function renderNutrDayCards(){
  const dk = nutrCurrentKey();
  const entry = nutrGetEntry(dk);
  const goals = nutrGetGoals();
  const el = document.getElementById('nutr-day-cards');
  if(!el) return;

  function pctBlock(val, goal, field){
    // Conteneurs TOUJOURS présents (même vides) pour pouvoir les mettre à jour en direct.
    if(!goal){
      return `<div class="nutr-progress" style="display:none"></div><div class="nutr-goal-pct" style="display:none"></div>`;
    }
    const numeric = (val!=='' && val!=null) ? +val : 0;
    const pct = Math.min(100, Math.round((numeric/goal)*100));
    const over = numeric>goal;
    const fillCls = over ? 'nutr-progress-over' : (field==='kcal'?'nutr-progress-kcal':'nutr-progress-prot');
    return `<div class="nutr-progress"><div class="nutr-progress-fill ${fillCls}" style="width:${pct}%"></div></div>
            <div class="nutr-goal-pct">${pct}% de l'objectif (${goal}${field==='kcal'?'kcal':'g'})</div>`;
  }

  el.innerHTML = `
    <div class="nutr-day-card" id="nutr-card-kcal">
      <div>
        <div class="nutr-card-label">🔥 Calories</div>
        <div class="nutr-val-row">
          <span class="nutr-val" id="nutr-disp-kcal">${entry.kcal!==''?entry.kcal:'—'}</span>
          <span class="nutr-unit">kcal</span>
        </div>
      </div>
      <div class="nutr-inp-row">
        <input class="nutr-inp" type="number" inputmode="numeric" min="0" step="50" placeholder="Entrer kcal…"
          value="${entry.kcal!==''?entry.kcal:''}"
          oninput="nutrSaveEntry('${dk}','kcal',this.value)"/>
      </div>
      ${pctBlock(entry.kcal, goals.kcal, 'kcal')}
    </div>
    <div class="nutr-day-card" id="nutr-card-prot">
      <div>
        <div class="nutr-card-label">💪 Protéines</div>
        <div class="nutr-val-row">
          <span class="nutr-val" id="nutr-disp-prot">${entry.prot!==''?entry.prot:'—'}</span>
          <span class="nutr-unit">g</span>
        </div>
      </div>
      <div class="nutr-inp-row">
        <input class="nutr-inp" type="number" inputmode="numeric" min="0" step="5" placeholder="Entrer protéines…"
          value="${entry.prot!==''?entry.prot:''}"
          oninput="nutrSaveEntry('${dk}','prot',this.value)"/>
      </div>
      ${pctBlock(entry.prot, goals.prot, 'prot')}
    </div>`;
}

function nutrWeek7(){
  // Returns array of 7 date keys (Mon to today or any 7 days ending on current nutr day)
  const dk = nutrCurrentKey();
  const d = new Date(dk+'T12:00:00');
  const keys=[];
  for(let i=6;i>=0;i--){const dd=new Date(d);dd.setDate(d.getDate()-i);keys.push(dd.getFullYear()+'-'+String(dd.getMonth()+1).padStart(2,'0')+'-'+String(dd.getDate()).padStart(2,'0'));}
  return keys;
}

function renderNutrWeekChart(){
  const keys = nutrWeek7();
  const data = nutrGetData();
  const goals = nutrGetGoals();
  const mode = _nutrChartMode;

  const labels = keys.map(k=>{ const d=new Date(k+'T12:00:00'); return ['D','L','M','M','J','V','S'][d.getDay()]; });
  const vals = keys.map(k=>{ const e=data[k]; if(!e) return null; const v=e[mode]; return v!==''&&v!=null?+v:null; });
  const goalLine = goals[mode]||null;

  const canvas = document.getElementById('gc-nutr-week');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');

  const cs = getComputedStyle(document.documentElement);
  const accentColor = mode==='kcal' ? cs.getPropertyValue('--yellow').trim() : cs.getPropertyValue('--blue').trim();
  const t2 = cs.getPropertyValue('--t2').trim();
  const t3 = cs.getPropertyValue('--t3').trim();
  const b1 = cs.getPropertyValue('--b1').trim();
  const green = cs.getPropertyValue('--green').trim();

  if(_nutrChart){ _nutrChart.destroy(); _nutrChart=null; }

  const datasets = [{
    label: mode==='kcal'?'Calories':'Protéines',
    data: vals,
    backgroundColor: accentColor.replace(')',', 0.15)').replace('rgb','rgba'),
    borderColor: accentColor,
    borderWidth: 2,
    borderRadius: 4,
    spanGaps: true,
    type: 'bar',
    order: 2,
  }];

  if(goalLine){
    datasets.push({
      label: 'Objectif',
      data: keys.map(()=>goalLine),
      borderColor: green,
      borderWidth: 1.5,
      borderDash: [4,4],
      pointRadius: 0,
      type: 'line',
      fill: false,
      order: 1,
      tension: 0,
    });
  }

  _nutrChart = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: {display:false}, tooltip: {
        backgroundColor: '#1b1b1b', borderColor: '#333', borderWidth:1,
        callbacks: { label: ctx => ctx.dataset.label+': '+(ctx.raw!=null?ctx.raw+(mode==='kcal'?' kcal':' g'):'—') }
      }},
      scales: {
        x: { grid:{color:b1}, ticks:{color:t3,font:{size:10}} },
        y: { grid:{color:b1}, ticks:{color:t3,font:{size:10}}, beginAtZero:true }
      }
    }
  });

  // Legend
  const leg = document.getElementById('nutr-chart-legend');
  if(leg){
    const avg = vals.filter(v=>v!=null).reduce((a,b)=>a+b,0) / (vals.filter(v=>v!=null).length||1);
    leg.innerHTML = `
      <div class="gl"><div class="gl-d" style="background:${accentColor}"></div>${mode==='kcal'?'Calories':'Protéines'}</div>
      ${goalLine?`<div class="gl"><div class="gl-d" style="background:${green}"></div>Objectif ${goalLine}${mode==='kcal'?' kcal':' g'}</div>`:''}
      ${vals.filter(v=>v!=null).length?`<div class="gl" style="margin-left:auto"><span style="color:var(--t2)">Moy. : ${Math.round(avg)}${mode==='kcal'?' kcal':' g'}</span></div>`:''}`;
  }
}

function renderNutrCorr(){
  const el = document.getElementById('nutr-corr-body');
  if(!el) return;
  const keys = nutrWeek7();
  const nutData = nutrGetData();
  const goals = nutrGetGoals();

  // Compute volume per day from logs
  function volForDay(dk){
    let vol=0;
    Object.entries(S.logs).forEach(([k,logs])=>{
      if(!logs||!logs.length) return;
      const parts=k.split('_'); if(parts.length<3) return;
      const d=parts.slice(2).join('_');
      if(d===dk) logs.forEach(l=>{ vol+=((l.w||0)*(l.r||0)||(l.r||0)); });
    });
    return vol;
  }

  // Week summary
  const weekEntries = keys.map(dk=>({dk, nutr:nutData[dk]||{kcal:'',prot:''}, vol:volForDay(dk)}));
  const hasNutr = weekEntries.some(e=>e.nutr.kcal!==''||e.nutr.prot!=='');
  const hasVol = weekEntries.some(e=>e.vol>0);

  if(!hasNutr&&!hasVol){
    el.innerHTML=`<div style="padding:24px;text-align:center;color:var(--t3);font-size:12px">Aucune donnée cette semaine.<br>Entre tes calories/protéines et enregistre tes séances pour voir la corrélation.</div>`;
    return;
  }

  // Summary bar
  const totalKcal = weekEntries.reduce((a,e)=>a+(e.nutr.kcal!==''?+e.nutr.kcal:0),0);
  const totalProt = weekEntries.reduce((a,e)=>a+(e.nutr.prot!==''?+e.nutr.prot:0),0);
  const totalVol  = weekEntries.reduce((a,e)=>a+e.vol,0);
  const trainDays = weekEntries.filter(e=>e.vol>0).length;
  const nutrDays  = weekEntries.filter(e=>e.nutr.kcal!==''||e.nutr.prot!=='').length;

  // Correlation insight
  let insight = '';
  const trainWithNutr = weekEntries.filter(e=>e.vol>0&&(e.nutr.kcal!==''||e.nutr.prot!==''));
  const trainNoNutr   = weekEntries.filter(e=>e.vol>0&&e.nutr.kcal===''&&e.nutr.prot==='');
  if(trainDays>0&&nutrDays>0){
    const avgKcalTrain = trainWithNutr.length ? Math.round(trainWithNutr.reduce((a,e)=>a+(e.nutr.kcal!==''?+e.nutr.kcal:0),0)/trainWithNutr.length) : null;
    const avgProtTrain = trainWithNutr.length ? Math.round(trainWithNutr.reduce((a,e)=>a+(e.nutr.prot!==''?+e.nutr.prot:0),0)/trainWithNutr.length) : null;
    const protOk = goals.prot&&avgProtTrain!=null&&avgProtTrain>=goals.prot;
    const kcalOk = goals.kcal&&avgKcalTrain!=null&&avgKcalTrain>=goals.kcal*0.9&&avgKcalTrain<=goals.kcal*1.1;
    if(avgProtTrain!=null){
      insight = `<div style="padding:10px 0;font-size:12px;color:var(--t2)">
        Les jours avec entraînement : <b>${avgProtTrain}g</b> de protéines en moyenne
        <span style="margin-left:6px;font-family:var(--mono);font-size:9px" class="${protOk?'nutr-corr-badge nutr-corr-good':'nutr-corr-badge nutr-corr-warn'}">${protOk?'✓ objectif atteint':'↓ sous objectif'}</span>
        ${avgKcalTrain!=null?` — <b>${avgKcalTrain}</b> kcal`:''}
        ${trainNoNutr.length?`<span style="margin-left:6px;color:var(--t3);font-size:11px">(${trainNoNutr.length} séance(s) sans données nutrition)</span>`:''}
      </div>`;
    }
  }

  const dayNames2 = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
  const rows = weekEntries.map(e=>{
    const d=new Date(e.dk+'T12:00:00');
    const label = dayNames2[d.getDay()]+' '+d.getDate();
    const kcal = e.nutr.kcal!==''?e.nutr.kcal:null;
    const prot = e.nutr.prot!==''?e.nutr.prot:null;
    const vol = e.vol;

    const kcalBadge = kcal!=null ? (goals.kcal&&kcal>=goals.kcal*0.9&&kcal<=goals.kcal*1.1?'nutr-corr-good':kcal<goals.kcal*0.8?'nutr-corr-warn':'nutr-corr-miss') : 'nutr-corr-miss';
    const protBadge = prot!=null ? (goals.prot&&prot>=goals.prot?'nutr-corr-good':prot!=null&&goals.prot&&prot>=goals.prot*0.8?'nutr-corr-warn':'nutr-corr-miss') : 'nutr-corr-miss';

    return `<div class="nutr-corr-day">
      <div class="nutr-corr-day-title">${label}${vol>0?` <span style="color:var(--green);font-size:9px;font-family:var(--mono)">💪 ${vol>=1000?(vol/1000).toFixed(1)+'t':vol+'kg'}</span>`:''}</div>
      <div class="nutr-corr-row"><span>Calories</span> <span><span class="nutr-corr-badge ${kcalBadge}" style="margin-right:4px">${kcal!=null?kcal+'kcal':'—'}</span></span></div>
      <div class="nutr-corr-row"><span>Protéines</span> <span><span class="nutr-corr-badge ${protBadge}" style="margin-right:4px">${prot!=null?prot+'g':'—'}</span></span></div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="nutr-summary-bar">
      <div class="nutr-sum-item"><div class="nutr-sum-val" style="color:var(--yellow)">${totalKcal>0?totalKcal.toLocaleString('fr-FR'):'—'}</div><div class="nutr-sum-lbl">kcal semaine</div></div>
      <div class="nutr-sum-item"><div class="nutr-sum-val" style="color:var(--blue)">${totalProt>0?totalProt+'g':'—'}</div><div class="nutr-sum-lbl">protéines</div></div>
      <div class="nutr-sum-item"><div class="nutr-sum-val" style="color:var(--green)">${totalVol>=1000?(totalVol/1000).toFixed(1)+'t':totalVol>0?totalVol+'kg':'—'}</div><div class="nutr-sum-lbl">volume entraîn.</div></div>
      <div class="nutr-sum-item"><div class="nutr-sum-val">${trainDays}</div><div class="nutr-sum-lbl">séances</div></div>
    </div>
    ${insight}
    <div class="nutr-corr-grid">${rows}</div>`;
}

