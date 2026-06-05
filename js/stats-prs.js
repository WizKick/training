/* ═══ PRs DASHBOARD ═══ */
let _prSort = 'volume'; // 'volume' | 'poids' | 'orm' | 'recent'

function setPRSort(s){
  _prSort = s;
  const map = {volume:'vol', poids:'weight', orm:'orm', recent:'recent'};
  Object.keys(map).forEach(k=>{
    const el = document.getElementById('pr-sort-'+map[k]);
    if(el) el.classList.toggle('on', k===s);
  });
  renderPRs();
}

// expand state for pr cards
let _prOpen = {};

function togglePRCard(key){
  _prOpen[key] = !_prOpen[key];
  const hist = document.getElementById('prhist-'+key);
  if(hist) hist.classList.toggle('open', !!_prOpen[key]);
  const card = document.getElementById('prcard-'+key);
  if(card) card.querySelector('.pr-card-main').style.borderBottom = _prOpen[key] ? '1px solid var(--b1)' : 'none';
}

function renderPRs(){
  const el = document.getElementById('prv');
  const sumEl = document.getElementById('pr-summary');
  if(!el) return;

  const typeFilter = (document.getElementById('pr-type-filter')||{value:''}).value;

  // ── Build PR data ──
  const items = []; // {di, ei, ex, sessName, sessType, best, bestDate, allEntries, orm, totalSessions}
  const now = Date.now();
  const WEEK_MS = 7 * 24 * 3600 * 1000;

  S.week.forEach((s, di) => {
    if(!s.name || s.type === 'rest') return;
    if(typeFilter && s.type !== typeFilter) return;
    s.exercises.forEach((ex, ei) => {
      const allEntries = getAllLogs(di, ei);
      if(!allEntries.length) return;

      // Best set (max volume = w*r)
      let bestSet = null, bestDate = '', bestDateObj = null;
      allEntries.forEach(([k, logs]) => {
        const dateStr = k.split('_').slice(2).join('_');
        logs.forEach(l => {
          const vol = (l.w||0)*(l.r||0) || (l.r||0);
          const cur = bestSet ? ((bestSet.w||0)*(bestSet.r||0)||(bestSet.r||0)) : -1;
          if(vol > cur){ bestSet = l; bestDate = dateStr; bestDateObj = new Date(dateStr); }
        });
      });

      // Derived metrics
      const allSets = allEntries.flatMap(([,v])=>v);
      const maxW = allSets.reduce((a,l)=>Math.max(a,l.w||0),0);
      const maxR = allSets.reduce((a,l)=>Math.max(a,l.r||0),0);
      const maxVol = allSets.reduce((a,l)=>Math.max(a,(l.w||0)*(l.r||0)||(l.r||0)),0);
      const orm = maxW>0&&maxR>0 ? Math.round(maxW*(1+maxR/30)) : 0;
      const isNew = bestDateObj && (now - bestDateObj.getTime()) < WEEK_MS;

      items.push({ di, ei, ex, sessName: s.name, sessType: s.type, bestSet, bestDate, bestDateObj,
        allEntries, maxW, maxR, maxVol, orm, totalSessions: allEntries.length, isNew });
    });
  });

  if(!items.length){
    sumEl.innerHTML = '';
    el.innerHTML = `<div class="empty-box"><div class="eb-ico">🏆</div><div class="eb-t">Aucun record enregistré</div><div class="eb-s">Logue tes séries dans Séance pour voir tes PRs apparaître ici.</div></div>`;
    return;
  }

  // ── Sort ──
  const sorted = [...items].sort((a,b) => {
    if(_prSort === 'volume') return b.maxVol - a.maxVol;
    if(_prSort === 'poids')  return b.maxW - a.maxW;
    if(_prSort === 'orm')    return b.orm - a.orm;
    if(_prSort === 'recent') return (b.bestDateObj||0) - (a.bestDateObj||0);
    return 0;
  });

  // ── Summary cards ──
  const totalPRs = items.length;
  const newPRs = items.filter(i=>i.isNew).length;
  const totalVol = items.reduce((a,i)=>a+i.maxVol,0);
  const best1RM = Math.max(...items.map(i=>i.orm||0));
  const volFmt = totalVol >= 1000 ? (totalVol/1000).toFixed(1)+'t' : totalVol+'kg';

  sumEl.innerHTML = `<div class="pr-summary-grid">
    <div class="pr-sum-card">
      <div class="pr-sum-lbl">Exercices tracés</div>
      <div class="pr-sum-val">${totalPRs}</div>
      <div class="pr-sum-sub">avec au moins 1 log</div>
    </div>
    <div class="pr-sum-card">
      <div class="pr-sum-lbl">PRs cette semaine</div>
      <div class="pr-sum-val" style="color:${newPRs>0?'var(--yellow)':'var(--t1)'}">${newPRs}</div>
      <div class="pr-sum-sub">7 derniers jours</div>
    </div>
    <div class="pr-sum-card">
      <div class="pr-sum-lbl">Volume PR total</div>
      <div class="pr-sum-val">${volFmt}</div>
      <div class="pr-sum-sub">somme des maxima</div>
    </div>
  </div>`;

  // ── Group by session type ──
  const typeOrder = ['push','pull','legs','full','cardio','custom'];
  const typeColors = {push:'var(--push)',pull:'var(--pull)',legs:'var(--legs)',full:'var(--blue)',cardio:'var(--green)',custom:'var(--t3)'};
  const typeLabels = {push:'Push',pull:'Pull',legs:'Legs',full:'Full Body',cardio:'Cardio',custom:'Autre'};

  // If type filter active, flat list; else grouped
  let html = '';

  if(typeFilter){
    html += buildPRList(sorted, typeColors[typeFilter]||'var(--t3)');
  } else {
    typeOrder.forEach(type => {
      const group = sorted.filter(i=>i.sessType===type);
      if(!group.length) return;
      html += `<div class="pr-type-section">
        <div class="pr-type-header">
          <div class="pr-type-dot" style="background:${typeColors[type]}"></div>
          <div class="pr-type-title">${typeLabels[type]}</div>
          <div class="pr-type-count">${group.length} exercice${group.length>1?'s':''}</div>
        </div>
        <div class="pr-list">${buildPRList(group, typeColors[type])}</div>
      </div>`;
    });
  }

  el.innerHTML = html;
}

function buildPRList(items, typeColor){
  return items.map(item => {
    const key = item.di+'_'+item.ei;
    const dateParts = item.bestDate ? item.bestDate.split('-') : [];
    const dateFmt = dateParts.length===3 ? dateParts[2]+'/'+dateParts[1]+'/'+dateParts[0] : '—';

    // History rows (last 6 sessions, newest first)
    const histEntries = [...item.allEntries].sort(([a],[b])=>b.localeCompare(a)).slice(0,6);
    const allMaxVol = item.allEntries.flatMap(([,v])=>v).reduce((a,l)=>Math.max(a,(l.w||0)*(l.r||0)||(l.r||0)),0);

    const histRows = histEntries.map(([k, logs]) => {
      const dateStr = k.split('_').slice(2).join('_');
      const dp = dateStr.split('-');
      const df = dp[2]+'/'+dp[1];
      const mW = logs.reduce((a,l)=>Math.max(a,l.w||0),0);
      const mR = logs.reduce((a,l)=>Math.max(a,l.r||0),0);
      const vol = logs.reduce((a,l)=>Math.max(a,(l.w||0)*(l.r||0)||(l.r||0)),0);
      const orm = mW>0&&mR>0 ? Math.round(mW*(1+mR/30)) : 0;
      const isPeak = vol === allMaxVol && allMaxVol > 0;
      return `<div class="pr-hist-row${isPeak?' pr-peak':''}">
        <span class="pr-hist-date">${df}</span>
        <span class="pr-hist-sets">${logs.length}×</span>
        <span class="pr-hist-weight">${mW?mW+'kg':'—'}</span>
        <span class="pr-hist-reps">${mR?mR+' rép':'—'}</span>
        <span class="pr-hist-vol">${vol?'vol '+vol+'kg':'—'}</span>
        ${isPeak?'<span class="pr-new-badge">PR</span>':''}
      </div>`;
    }).join('');

    // Trend: compare last 2 sessions by max weight
    let trendHTML = '';
    if(item.allEntries.length >= 2){
      const sorted2 = [...item.allEntries].sort(([a],[b])=>a.localeCompare(b));
      const last2 = sorted2.slice(-2);
      const wA = last2[0][1].reduce((a,l)=>Math.max(a,l.w||0),0);
      const wB = last2[1][1].reduce((a,l)=>Math.max(a,l.w||0),0);
      const diff = +(wB - wA).toFixed(1);
      if(diff > 0)       trendHTML = `<span class="pr-trend-up">↑ +${diff}kg vs session précédente</span>`;
      else if(diff < 0)  trendHTML = `<span class="pr-trend-dn">↓ ${diff}kg vs session précédente</span>`;
      else               trendHTML = `<span class="pr-trend-eq">= stable</span>`;
    }

    // ── Mini-courbe de progression (sparkline) du poids max par session ──
    let sparkHTML = '';
    if(item.allEntries.length >= 2){
      const chrono = [...item.allEntries].sort(([a],[b])=>a.localeCompare(b)).slice(-12); // 12 dernières sessions
      const pts = chrono.map(([,logs]) => {
        const w = logs.reduce((a,l)=>Math.max(a,l.w||0),0);
        const r = logs.reduce((a,l)=>Math.max(a,l.r||0),0);
        // métrique : poids si dispo, sinon reps (poids du corps)
        return w>0 ? w : r;
      });
      const max = Math.max(...pts), min = Math.min(...pts);
      const range = max - min || 1;
      const W = 240, H = 40, pad = 4;
      const stepX = (W - pad*2) / (pts.length - 1);
      const coords = pts.map((v,i) => {
        const x = pad + i*stepX;
        const y = pad + (H - pad*2) * (1 - (v - min)/range);
        return [x, y];
      });
      const linePath = coords.map((c,i)=>(i===0?'M':'L')+c[0].toFixed(1)+' '+c[1].toFixed(1)).join(' ');
      const areaPath = linePath + ` L${coords[coords.length-1][0].toFixed(1)} ${H-pad} L${coords[0][0].toFixed(1)} ${H-pad} Z`;
      const last = coords[coords.length-1];
      const up = pts[pts.length-1] >= pts[0];
      const col = up ? 'var(--green)' : 'var(--red)';
      sparkHTML = `<div class="pr-spark">
        <div class="pr-hist-title" style="margin-bottom:4px">Progression (${pts.length} dern. sessions)</div>
        <svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" style="display:block">
          <defs><linearGradient id="prg-${key}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="${col}" stop-opacity="0.22"/>
            <stop offset="100%" stop-color="${col}" stop-opacity="0"/>
          </linearGradient></defs>
          <path d="${areaPath}" fill="url(#prg-${key})"/>
          <path d="${linePath}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
          <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.6" fill="${col}"/>
        </svg>
        <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:8px;color:var(--t3);margin-top:2px">
          <span>${min}${item.maxW?'kg':''}</span><span>${max}${item.maxW?'kg':''}</span>
        </div>
      </div>`;
    }

    const isOpen = !!_prOpen[key];

    return `<div class="pr-card${item.isNew?' is-new':''}" id="prcard-${key}" onclick="togglePRCard('${key}')">
      <div class="pr-card-main" style="border-bottom:${isOpen?'1px solid var(--b1)':'none'}">
        <div class="pr-card-left">
          <div class="pr-exo-name">${item.ex.name}${item.isNew?` <span class="pr-new-badge">NEW PR</span>`:''}</div>
          <div class="pr-exo-day" style="margin-top:3px">
            <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${typeColor};vertical-align:middle;margin-right:4px"></span>
            ${item.sessName} &middot; ${item.totalSessions} session${item.totalSessions>1?'s':''} &middot; PR le ${dateFmt}
          </div>
        </div>
        <div class="pr-card-metrics">
          ${item.maxW ? `<div class="pr-metric highlight">
            <div class="pr-metric-val">${item.maxW}<span class="pr-metric-unit">kg</span></div>
            <div class="pr-metric-lbl">Poids max</div>
          </div>` : ''}
          ${item.maxR ? `<div class="pr-metric">
            <div class="pr-metric-val">${item.maxR}</div>
            <div class="pr-metric-lbl">Rép. max</div>
          </div>` : ''}
          ${item.maxVol ? `<div class="pr-metric">
            <div class="pr-metric-val">${item.maxVol}<span class="pr-metric-unit">kg</span></div>
            <div class="pr-metric-lbl">Vol. max</div>
          </div>` : ''}
        </div>
      </div>
      <div class="pr-history${isOpen?' open':''}" id="prhist-${key}">
        ${sparkHTML}
        <div class="pr-hist-title">Historique des sessions</div>
        ${histRows}
        ${trendHTML ? `<div class="pr-trend">${trendHTML}</div>` : ''}
      </div>
    </div>`;
  }).join('');
}

/* ═══ EXERCICES LIBRARY ═══ */
let _exoSort = 'alpha';
let _exoOpen = {};

function setExoSort(s){
  _exoSort = s;
  const map = {alpha:'alpha', volume:'volume', sessions:'sessions', pr:'pr'};
  Object.keys(map).forEach(k=>{
    const el = document.getElementById('exo-sort-'+map[k]);
    if(el) el.classList.toggle('on', k===s);
  });
  renderExos();
}

function toggleExoCard(key){
  _exoOpen[key] = !_exoOpen[key];
  const card = document.getElementById('exocard-'+key);
  if(card) card.classList.toggle('exo-lib-open', !!_exoOpen[key]);
}

function renderExos(){
  const el = document.getElementById('exov');
  const sumEl = document.getElementById('exo-summary');
  if(!el) return;

  const typeFilter = (document.getElementById('exo-type-filter')||{value:''}).value;
  const search = ((document.getElementById('exo-search')||{value:''}).value||'').toLowerCase().trim();

  const typeColors = {push:'var(--push)',pull:'var(--pull)',legs:'var(--legs)',full:'var(--blue)',cardio:'var(--green)',custom:'var(--t3)'};
  const typeLabels = {push:'Push',pull:'Pull',legs:'Legs',full:'Full Body',cardio:'Cardio',custom:'Autre'};
  const typeIcons  = {push:'💪',pull:'🔙',legs:'🦵',full:'⚡',cardio:'🏃',custom:'🎯',rest:'😴'};

  // ── Build exercise list from ALL week exercises (logged + not logged) ──
  const items = [];
  S.week.forEach((s, di) => {
    if(!s.name || s.type === 'rest') return;
    if(typeFilter && s.type !== typeFilter) return;
    s.exercises.forEach((ex, ei) => {
      if(search && !ex.name.toLowerCase().includes(search)) return;

      const allEntries = getAllLogs(di, ei);
      // Compute stats from logs
      const allSets = allEntries.flatMap(([,v])=>v);
      const totalSessions = allEntries.length;
      const totalSets = allSets.length;
      const totalVolume = allSets.reduce((a,l)=>a+((l.w||0)*(l.r||0)||(l.r||0)),0);
      const maxW = allSets.reduce((a,l)=>Math.max(a,l.w||0),0);
      const maxR = allSets.reduce((a,l)=>Math.max(a,l.r||0),0);
      const maxVol = allSets.reduce((a,l)=>Math.max(a,(l.w||0)*(l.r||0)||(l.r||0)),0);
      const orm = maxW>0&&maxR>0 ? Math.round(maxW*(1+maxR/30)) : 0;

      // Best date
      let bestDate = '';
      let bestDateObj = null;
      if(allEntries.length){
        allEntries.forEach(([k, logs])=>{
          const dateStr = k.split('_').slice(2).join('_');
          logs.forEach(l => {
            const vol = (l.w||0)*(l.r||0)||(l.r||0);
            if(vol >= maxVol && maxVol > 0){ bestDate = dateStr; bestDateObj = new Date(dateStr); }
          });
        });
      }

      // Planned target
      const planned = ex.sets && ex.reps ? `${ex.sets}×${ex.reps}${ex.weight?` @ ${ex.weight}kg`:''}` : '—';

      items.push({
        di, ei, ex, sessName: s.name, sessType: s.type,
        allEntries, totalSessions, totalSets, totalVolume,
        maxW, maxR, maxVol, orm, bestDate, bestDateObj, planned
      });
    });
  });

  // ── Summary ──
  const trackedCount = items.filter(i=>i.totalSessions>0).length;
  const totalExos = items.length;
  const grandVol = items.reduce((a,i)=>a+i.totalVolume,0);
  const grandSess = items.reduce((a,i)=>a+i.totalSessions,0);
  const best1RM = Math.max(0,...items.map(i=>i.orm||0));
  const volFmt = v => v>=1000?(v/1000).toFixed(1)+'t':v?v+'kg':'—';

  sumEl.innerHTML = `<div class="exo-summary-grid">
    <div class="stat-card"><div class="stat-lbl">Exercices</div><div class="stat-val">${totalExos}</div><div class="stat-sub">${trackedCount} tracés</div></div>
    <div class="stat-card"><div class="stat-lbl">Volume total</div><div class="stat-val" style="font-size:18px">${volFmt(grandVol)}</div><div class="stat-sub">toutes sessions</div></div>
    <div class="stat-card"><div class="stat-lbl">Sessions logguées</div><div class="stat-val">${grandSess}</div><div class="stat-sub">séries enregistrées</div></div>
  </div>`;

  if(!items.length){
    el.innerHTML = `<div class="exo-lib-empty"><div class="eb-ico">📚</div><div class="eb-t">Aucun exercice trouvé</div><div class="eb-s">Modifie ta recherche ou tes filtres.</div></div>`;
    return;
  }

  // ── Sort ──
  const sorted = [...items].sort((a,b)=>{
    if(_exoSort==='alpha')    return a.ex.name.localeCompare(b.ex.name,'fr');
    if(_exoSort==='volume')   return b.totalVolume - a.totalVolume;
    if(_exoSort==='sessions') return b.totalSessions - a.totalSessions;
    if(_exoSort==='pr')       return b.maxVol - a.maxVol;
    return 0;
  });

  // ── Group by type (if no type filter) ──
  const typeOrder = ['push','pull','legs','full','cardio','custom'];

  function buildExoCard(item){
    const key = item.di+'_'+item.ei;
    const tc = typeColors[item.sessType]||'var(--t3)';
    const icon = typeIcons[item.sessType]||'🏋️';
    const hasLogs = item.totalSessions > 0;

    // Build history rows (last 5 sessions, newest first)
    const histEntries = [...item.allEntries].sort(([a],[b])=>b.localeCompare(a)).slice(0,5);
    const allMaxVol = item.maxVol;

    const histRows = histEntries.map(([k, logs])=>{
      const dateStr = k.split('_').slice(2).join('_');
      const dp = dateStr.split('-');
      const df = dp.length===3 ? dp[2]+'/'+dp[1]+'/'+dp[0] : dateStr;
      const mW = logs.reduce((a,l)=>Math.max(a,l.w||0),0);
      const mR = logs.reduce((a,l)=>Math.max(a,l.r||0),0);
      const vol = logs.reduce((a,l)=>Math.max(a,(l.w||0)*(l.r||0)||(l.r||0)),0);
      const ormV = mW>0&&mR>0 ? Math.round(mW*(1+mR/30)) : 0;
      const isPR = vol>0 && vol===allMaxVol;
      return `<tr class="${isPR?'exo-lib-pr-row':''}">
        <td>${df}</td>
        <td>${logs.length}×</td>
        <td>${mW?mW+'kg':'—'}</td>
        <td>${mR||'—'}</td>
        <td>${vol?vol+'kg':'—'}${isPR?' ★':''}</td>
      </tr>`;
    }).join('');

    const bestFmt = item.bestDate ? (()=>{const p=item.bestDate.split('-');return p[2]+'/'+p[1]+'/'+p[0];})() : '';

    const prBadge = item.maxW ? `<span class="exo-lib-pr-badge">PR ${item.maxW}kg</span>` : (item.maxR ? `<span class="exo-lib-pr-badge">PR ${item.maxR} rép</span>` : '');

    const totVolFmt = item.totalVolume>=1000?(item.totalVolume/1000).toFixed(1)+'t':item.totalVolume?item.totalVolume+'kg':'—';
    const maxVolFmt = item.maxVol?item.maxVol+'kg':'—';

    return `<div class="exo-lib-card${_exoOpen[key]?' exo-lib-open':''}" id="exocard-${key}" onclick="toggleExoCard('${key}')">
      <div class="exo-lib-top">
        <div class="exo-lib-icon" style="background:${tc}20;border:1px solid ${tc}30">${icon}</div>
        <div class="exo-lib-info">
          <div class="exo-lib-name" title="${item.ex.name}">${item.ex.name}</div>
          <div class="exo-lib-sub">
            <span style="display:inline-block;width:5px;height:5px;border-radius:50%;background:${tc}"></span>
            <span>${item.sessName}</span>
            ${hasLogs?`<span>·</span>${prBadge}`:'<span style="color:var(--t4);font-size:8px">Non logué</span>'}
          </div>
        </div>
        <div style="font-size:10px;color:var(--t4);flex-shrink:0">▾</div>
      </div>
      <div class="exo-lib-metrics">
        <div class="exo-lib-metric">
          <div class="exo-lib-mval">${item.totalSessions||'0'}</div>
          <div class="exo-lib-mlbl">Sessions</div>
        </div>
        <div class="exo-lib-metric">
          <div class="exo-lib-mval" style="font-size:11px">${totVolFmt}</div>
          <div class="exo-lib-mlbl">Vol. total</div>
        </div>
      </div>
      <div class="exo-lib-detail">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;flex-wrap:wrap;gap:6px">
          <div style="font-family:var(--mono);font-size:9px;color:var(--t3)">
            Planifié : <span style="color:var(--t2)">${item.planned}</span>
            ${item.maxW?` · Poids max : <span style="color:var(--green)">${item.maxW}kg</span>`:''}
            ${bestFmt?` · Dernier PR : <span style="color:var(--t2)">${bestFmt}</span>`:''}
          </div>
          ${item.totalSets?`<div style="font-family:var(--mono);font-size:9px;color:var(--t3)">${item.totalSets} série${item.totalSets>1?'s':''} totales</div>`:''}
        </div>
        ${hasLogs ? `<table class="exo-lib-hist">
          <thead><tr><th>Date</th><th>Séries</th><th>Poids max</th><th>Rép. max</th><th>Vol. max</th></tr></thead>
          <tbody>${histRows}</tbody>
        </table>` : `<div style="text-align:center;padding:12px 0;font-size:11px;color:var(--t3)">Aucun log pour cet exercice — commence ta séance pour voir les stats ici.</div>`}
      </div>
    </div>`;
  }

  let html = '';
  if(typeFilter || search){
    // Flat list
    html = `<div class="exo-lib-grid">${sorted.map(buildExoCard).join('')}</div>`;
  } else {
    typeOrder.forEach(type=>{
      const group = sorted.filter(i=>i.sessType===type);
      if(!group.length) return;
      html += `<div class="exo-lib-section">
        <div class="exo-lib-section-head">
          <div class="exo-lib-section-dot" style="background:${typeColors[type]}"></div>
          <div class="exo-lib-section-title">${typeLabels[type]}</div>
          <div class="exo-lib-section-count">${group.length} exercice${group.length>1?'s':''}</div>
        </div>
        <div class="exo-lib-grid">${group.map(buildExoCard).join('')}</div>
      </div>`;
    });
  }

  el.innerHTML = html || `<div class="exo-lib-empty"><div class="eb-ico">📚</div><div class="eb-t">Aucun exercice</div><div class="eb-s">Ajoute des exercices à ton programme pour les voir ici.</div></div>`;
}


/* ═══ ACTIVITY HEATMAP ═══ */
function renderHeatmap(){
  const el = document.getElementById('journal-heatmap');
  if(!el) return;

  // ── Build date → session data map ──
  const sessionMap = buildSessionMap(); // dateStr → {di, exoLogs[], sess}

  // Date range: 52 complete weeks ending today (Mon-aligned) = ~364 days + partial first week
  const today = new Date();
  const todayStr = todayKey();
  // Start from Monday 52 weeks ago
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 364); // 52 weeks back
  // Align to Monday
  let dow = startDate.getDay(); // 0=Sun
  dow = dow===0 ? 6 : dow-1;   // Mon=0
  startDate.setDate(startDate.getDate() - dow);

  // Build all days
  const allDays = []; // [{dateStr, dateObj, weekIdx, dayOfWeek}]
  const cur = new Date(startDate);
  let weekIdx = 0;
  while(cur <= today || allDays.length % 7 !== 0){
    const ds = cur.getFullYear()+'-'+String(cur.getMonth()+1).padStart(2,'0')+'-'+String(cur.getDate()).padStart(2,'0');
    const dow2 = cur.getDay(); const d = dow2===0?6:dow2-1;
    if(d===0 && allDays.length>0) weekIdx++;
    allDays.push({ dateStr: ds, dateObj: new Date(cur), weekIdx, dayOfWeek: d, isFuture: cur > today });
    cur.setDate(cur.getDate()+1);
  }
  const totalWeeks = weekIdx + 1;

  // ── Compute intensity per day ──
  // intensity: 0 = no session, 1-4 based on volume or exercise count
  const dayData = {};
  Object.entries(sessionMap).forEach(([ds, sess])=>{
    const vol = sess.exoLogs.reduce((a,l)=>a+l.vol,0);
    const exoCount = sess.exoLogs.length;
    const prCount = sess.exoLogs.filter(l=>l.isPR).length;
    dayData[ds] = { vol, exoCount, prCount, sess };
  });
  // Also check S.done for sessions marked done with no logs
  Object.keys(S.done||{}).forEach(k=>{
    if(!S.done[k]) return;
    const parts = k.split('_');
    if(parts.length<2) return;
    const dateStr = parts.slice(1).join('_');
    if(!dayData[dateStr]) dayData[dateStr] = { vol:0, exoCount:0, prCount:0, sess:{} };
  });

  // Max vol for scaling
  const allVols = Object.values(dayData).map(d=>d.vol).filter(v=>v>0);
  const maxVol = allVols.length ? Math.max(...allVols) : 1;

  function intensity(ds){
    const d = dayData[ds];
    if(!d) return 0;
    if(d.vol === 0 && d.exoCount === 0) return 1; // done but no vol
    const ratio = d.vol / maxVol;
    if(ratio < 0.25) return 1;
    if(ratio < 0.5)  return 2;
    if(ratio < 0.75) return 3;
    return 4;
  }

  // ── Month labels ──
  // For each week column, if the first day of the week is a new month, label it
  const weekFirstDay = {};
  allDays.forEach(d=>{ if(d.dayOfWeek===0) weekFirstDay[d.weekIdx] = d; });
  const monthNames = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

  let monthLabels = '';
  const colWidth = 13; // cell 11px + gap 2px
  let lastMonth = -1;
  for(let w=0; w<totalWeeks; w++){
    const fd = weekFirstDay[w];
    if(fd){
      const m = fd.dateObj.getMonth();
      if(m !== lastMonth){
        monthLabels += `<span class="heatmap-month-lbl" style="width:${colWidth}px">${monthNames[m]}</span>`;
        lastMonth = m;
      } else {
        monthLabels += `<span class="heatmap-month-lbl" style="width:${colWidth}px"></span>`;
      }
    }
  }

  // ── Build columns (one per week) ──
  const typeColors = {push:'var(--push)',pull:'var(--pull)',legs:'var(--legs)',full:'var(--blue)',cardio:'var(--green)',custom:'var(--t3)'};
  const weeks = {};
  allDays.forEach(d=>{ if(!weeks[d.weekIdx]) weeks[d.weekIdx]=[]; weeks[d.weekIdx].push(d); });

  let colsHtml = '';
  for(let w=0; w<totalWeeks; w++){
    const days = weeks[w]||[];
    let cells = '';
    for(let d=0; d<7; d++){
      const day = days.find(x=>x.dayOfWeek===d);
      if(!day){ cells+=`<div class="hm-cell hm-l0" style="opacity:0"></div>`; continue; }
      if(day.isFuture){ cells+=`<div class="hm-cell hm-future"></div>`; continue; }
      const lvl = intensity(day.dateStr);
      const data = dayData[day.dateStr];
      const sessType = data?.sess?.type||'';
      const dp = day.dateStr.split('-');
      const dateFmt = dp[2]+'/'+dp[1]+'/'+dp[0];
      const volStr = data?.vol ? `${data.vol>=1000?(data.vol/1000).toFixed(1)+'t':data.vol+'kg'}` : '';
      const prStr = data?.prCount>0 ? ` · ${data.prCount} PR` : '';
      const sessName = data?.sess?.name||'';
      const tooltip = lvl>0
        ? `${dateFmt}${sessName?' — '+sessName:''}${volStr?' · vol '+volStr:''}${prStr}`
        : dateFmt+' — repos';
      cells+=`<div class="hm-cell hm-l${lvl}" 
        onmouseenter="showHmTooltip(event,'${tooltip}','${sessType}')"
        onmouseleave="hideHmTooltip()"
        onclick="hmCellClick('${day.dateStr}')"></div>`;
    }
    colsHtml+=`<div class="heatmap-col">${cells}</div>`;
  }

  // ── Stats: streaks ──
  const activeDates = Object.keys(dayData).filter(ds=>dayData[ds].exoCount>0||dayData[ds].vol>0).sort();
  let curStreak=0, maxStreak=0, tempStreak=0;
  // Check streak ending today (scan backwards from today)
  const todayObj = new Date(todayStr);
  for(let i=0; i<365; i++){
    const d = new Date(todayObj); d.setDate(d.getDate()-i);
    const ds = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    if(dayData[ds]&&(dayData[ds].exoCount>0||dayData[ds].vol>0)){ curStreak++; } else { break; }
  }
  // Max streak across all time
  let streak=0;
  const sortedActive = [...activeDates];
  for(let i=0;i<sortedActive.length;i++){
    if(i===0){ streak=1; }
    else {
      const prev = new Date(sortedActive[i-1]); prev.setDate(prev.getDate()+1);
      const prevStr = prev.getFullYear()+'-'+String(prev.getMonth()+1).padStart(2,'0')+'-'+String(prev.getDate()).padStart(2,'0');
      streak = prevStr===sortedActive[i] ? streak+1 : 1;
    }
    if(streak>maxStreak) maxStreak=streak;
  }
  const totalSessions = Object.keys(dayData).length;
  const thisYear = new Date().getFullYear();
  const sessThisYear = Object.keys(dayData).filter(ds=>ds.startsWith(thisYear+'')).length;

  el.innerHTML = `
    <div class="heatmap-wrap">
      <div class="heatmap-head">
        <div class="heatmap-title">Activité — 12 derniers mois</div>
        <div class="heatmap-meta">${totalSessions} session${totalSessions>1?'s':''} · ${sessThisYear} cette année</div>
      </div>
      <div style="overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch">
        <div style="min-width:${totalWeeks*13+24}px">
          <div class="heatmap-months" style="padding-left:22px">${monthLabels}</div>
          <div class="heatmap-rows">
            <div class="heatmap-dow">
              <div class="heatmap-dow-lbl"></div>
              <div class="heatmap-dow-lbl">Lun</div>
              <div class="heatmap-dow-lbl"></div>
              <div class="heatmap-dow-lbl">Mer</div>
              <div class="heatmap-dow-lbl"></div>
              <div class="heatmap-dow-lbl">Ven</div>
              <div class="heatmap-dow-lbl"></div>
            </div>
            <div class="heatmap-cols">${colsHtml}</div>
          </div>
        </div>
      </div>
      <div class="hm-streaks">
        <div class="hm-streak-chip"><div class="hm-streak-val" style="color:${curStreak>=3?'var(--green)':'var(--t1)'}">${curStreak}j</div><div class="hm-streak-lbl">Série actuelle</div></div>
        <div class="hm-streak-chip"><div class="hm-streak-val">${maxStreak}j</div><div class="hm-streak-lbl">Meilleure série</div></div>
        <div class="hm-streak-chip"><div class="hm-streak-val">${sessThisYear}</div><div class="hm-streak-lbl">Sessions ${thisYear}</div></div>
        <div class="hm-streak-chip"><div class="hm-streak-val">${totalSessions}</div><div class="hm-streak-lbl">Total all-time</div></div>
        <div style="flex:1"></div>
        <div class="heatmap-legend">
          <span class="heatmap-legend-lbl">Moins</span>
          ${[0,1,2,3,4].map(l=>`<div class="hm-legend-cell hm-l${l}"></div>`).join('')}
          <span class="heatmap-legend-lbl">Plus</span>
        </div>
      </div>
    </div>`;

  // Scroll heatmap to right (latest)
  const cols = el.querySelector('.heatmap-cols');
  if(cols) cols.scrollLeft = cols.scrollWidth;
}

function showHmTooltip(e, text, type){
  const tip = document.getElementById('hm-tooltip');
  if(!tip) return;
  const typeColors = {push:'var(--push)',pull:'var(--pull)',legs:'var(--legs)',full:'var(--blue)',cardio:'var(--green)',custom:'var(--t3)'};
  const col = typeColors[type]||'';
  tip.innerHTML = col
    ? `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${col};margin-right:5px;vertical-align:middle"></span>${text}`
    : text;
  tip.style.display = 'block';
  const x = e.clientX, y = e.clientY;
  tip.style.left = (x+12)+'px';
  tip.style.top  = (y-32)+'px';
}
function hideHmTooltip(){
  const tip = document.getElementById('hm-tooltip');
  if(tip) tip.style.display='none';
}
function hmCellClick(dateStr){
  // Switch to calendar view on that month
  const parts = dateStr.split('-');
  _calYear = parseInt(parts[0]);
  _calMonth = parseInt(parts[1])-1;
  _calSelectedDate = dateStr;
  setJournalView('cal');
  // Switch the tab button state
  document.querySelectorAll('#page-journal .mt').forEach(b=>b.classList.remove('on'));
  const calBtn = document.getElementById('jv-cal-btn');
  if(calBtn) calBtn.classList.add('on');
}


let _calYear = new Date().getFullYear();
let _calMonth = new Date().getMonth(); // 0-based
let _calSelectedDate = null;

function setJournalView(v){
  _journalView = v;
  ['list','cal'].forEach(id=>{
    const b = document.getElementById('jv-'+id+'-btn');
    if(b){ b.classList.toggle('on', id===v); }
  });
  // hide filters in calendar view (they complicate the grid), show month nav instead
  const filters = document.getElementById('journal-filters');
  if(filters) filters.style.display = v==='list' ? 'flex' : 'none';
  _calSelectedDate = null;
  renderJournal();
}

function buildSessionMap(){
  // Returns a Map: dateStr → { di, exoLogs[], note, sess }
  const byDate = {};
  Object.entries(S.logs||{}).forEach(([key,sets])=>{
    if(!sets||!sets.length) return;
    const parts=key.split('_');
    if(parts.length<3) return;
    const di=parseInt(parts[0]), ei=parseInt(parts[1]);
    const dateStr=parts.slice(2).join('_');
    const ex=(S.week[di]&&S.week[di].exercises[ei])||null;
    if(!ex) return;
    if(!byDate[dateStr]) byDate[dateStr]={di,dateStr,exoLogs:[],note:''};
    const bestSet=sets.reduce((a,b)=>((b.w||0)*(b.r||0)>(a.w||0)*(a.r||0)?b:a),sets[0]);
    const vol=sets.reduce((s,l)=>s+((l.w||0)*(l.r||0)||(l.r||0)),0);
    const globalBest=getBest(di,ei);
    const isPR=globalBest&&(bestSet.w||0)===(globalBest.w||0)&&(bestSet.r||0)===(globalBest.r||0)&&vol>0;
    byDate[dateStr].exoLogs.push({di,ei,exName:ex.name,amrap:!!ex.amrap,sets,bestSet,vol,isPR});
    byDate[dateStr].di=di;
  });
  Object.entries(S.notes||{}).forEach(([key,text])=>{
    if(!text||!text.trim()) return;
    const parts=key.split('_');
    if(parts.length<2) return;
    const di=parseInt(parts[0]);
    const dateStr=parts.slice(1).join('_');
    if(!byDate[dateStr]) byDate[dateStr]={di,dateStr,exoLogs:[],note:''};
    byDate[dateStr].note=text.trim();
    if(!byDate[dateStr].exoLogs.length) byDate[dateStr].di=di;
  });
  // Enrich with session info
  Object.values(byDate).forEach(e=>{
    e.sess = S.week[e.di]||{};
  });
  return byDate;
}

function renderJournalCalendar(){
  const el = document.getElementById('jv'); if(!el) return;
  const typeColors = {push:'var(--push)',pull:'var(--pull)',legs:'var(--legs)',full:'var(--blue)',cardio:'var(--green)',custom:'var(--t3)'};
  const sessionMap = buildSessionMap();

  const today = new Date();
  const todayStr = weekStorageKey(today);
  const monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
  const dowLabels = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

  // First day of displayed month
  const firstDay = new Date(_calYear, _calMonth, 1);
  // Day-of-week of first day (Mon=0)
  let startDow = firstDay.getDay(); // 0=Sun
  startDow = startDow===0 ? 6 : startDow-1; // convert to Mon-based
  const daysInMonth = new Date(_calYear, _calMonth+1, 0).getDate();
  const daysInPrev  = new Date(_calYear, _calMonth, 0).getDate();

  // Build cells
  let cells = '';
  // Previous month filler
  for(let i=0;i<startDow;i++){
    const d = daysInPrev - startDow + 1 + i;
    cells += `<div class="jcal-cell other-month"><div class="jcal-num">${d}</div></div>`;
  }
  // Current month
  for(let d=1;d<=daysInMonth;d++){
    const dateStr = _calYear+'-'+String(_calMonth+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    const sess = sessionMap[dateStr];
    const isToday = dateStr===todayStr;
    const isSelected = dateStr===_calSelectedDate;
    if(sess){
      const tc = typeColors[sess.sess.type]||'var(--t3)';
      const bg = isSelected?'background:var(--s4)':'background:var(--s2)';
      const pips = Math.min(sess.exoLogs.length||1, 4);
      const dots = `<div class="jcal-dot">${Array(pips).fill(`<div class="jcal-pip" style="background:${tc}"></div>`).join('')}</div>`;
      cells += `<div class="jcal-cell has-session${isToday?' today':''}${isSelected?' selected':''}" style="${bg}" onclick="calSelectDate('${dateStr}')">
        <div class="jcal-num">${d}</div>${dots}</div>`;
    } else {
      cells += `<div class="jcal-cell${isToday?' today':''}">
        <div class="jcal-num">${d}</div></div>`;
    }
  }
  // Next month filler to complete grid
  const totalCells = startDow + daysInMonth;
  const remainder = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for(let i=1;i<=remainder;i++){
    cells += `<div class="jcal-cell other-month"><div class="jcal-num">${i}</div></div>`;
  }

  // session detail panel
  let detailHtml = '';
  if(_calSelectedDate && sessionMap[_calSelectedDate]){
    const e = sessionMap[_calSelectedDate];
    const tc = typeColors[e.sess.type]||'var(--t3)';
    const parts = _calSelectedDate.split('-');
    const dateFmt = parts[2]+'/'+parts[1]+'/'+parts[0];
    const dayName = DAYS[e.di]||'';
    const totalVol = e.exoLogs.reduce((s,l)=>s+l.vol,0);
    const totalSets = e.exoLogs.reduce((s,l)=>s+l.sets.length,0);
    const rows = e.exoLogs.map(l=>{
      const setsStr = l.sets.map(s=>s.w?`${s.w}kg×${s.r}`:s.r?`${s.r} rép`:'?').join(' / ');
      return `<div class="jcal-detail-row">
        <div class="jcal-detail-exo">${l.exName}</div>
        <div class="jcal-detail-sets">${l.sets.length}×&nbsp;${setsStr}</div>
        ${l.isPR?'<div class="ji-pr" style="margin-left:6px">PR</div>':''}
      </div>`;
    }).join('');
    detailHtml = `<div class="jcal-detail">
      <div class="jcal-detail-head">
        <div style="display:flex;flex-direction:column;gap:3px">
          <div class="jcal-detail-date">${dateFmt} — ${dayName}</div>
          <div class="jcal-detail-sess">
            <div style="width:7px;height:7px;border-radius:50%;background:${tc}"></div>
            <span style="font-size:11px;font-weight:500;color:var(--t1)">${e.sess.name||'—'}</span>
            ${e.sess.type?`<span class="badge">${e.sess.type}</span>`:''}
          </div>
        </div>
        <button class="btn btn-ghost btn-xs" onclick="_calSelectedDate=null;renderJournal()">✕</button>
      </div>
      ${rows?`<div class="jcal-detail-rows">${rows}</div>`:''}
      ${(totalVol||totalSets)?`<div class="jcal-detail-vol">
        <span>${totalSets} série${totalSets>1?'s':''}</span>
        <span>·</span>
        <span>${e.exoLogs.length} exercice${e.exoLogs.length>1?'s':''}</span>
        ${totalVol?`<span>·</span><span style="color:var(--t1);font-weight:500">${totalVol>=1000?(totalVol/1000).toFixed(1)+'t':totalVol+'kg'}</span>`:''}
      </div>`:''}
      ${e.note?`<div class="jcal-detail-note">💬 ${e.note}</div>`:''}
    </div>`;
  }

  // Count sessions in this month
  const sessCount = Object.keys(sessionMap).filter(k=>k.startsWith(_calYear+'-'+String(_calMonth+1).padStart(2,'0'))).length;

  el.innerHTML = `
    <div class="jcal-nav">
      <button class="btn btn-ghost btn-sm" onclick="calNav(-1)">← Préc.</button>
      <div style="text-align:center">
        <div class="jcal-month">${monthNames[_calMonth]} ${_calYear}</div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-top:2px">${sessCount} session${sessCount>1?'s':''} ce mois</div>
      </div>
      <button class="btn btn-ghost btn-sm" onclick="calNav(1)">Suiv. →</button>
    </div>
    <div style="background:var(--s1);border:1px solid var(--b1);border-radius:var(--r2);padding:14px">
      <div class="jcal-grid" style="margin-bottom:8px">
        ${dowLabels.map(d=>`<div class="jcal-dow">${d}</div>`).join('')}
      </div>
      <div class="jcal-grid">${cells}</div>
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;padding:0 2px">
      ${Object.entries(typeColors).map(([t,c])=>`<div class="gl"><div class="gl-d" style="background:${c}"></div>${{push:'Push',pull:'Pull',legs:'Legs',full:'Full Body',cardio:'Cardio',custom:'Autre'}[t]}</div>`).join('')}
    </div>
    ${detailHtml}`;
}

function calNav(dir){
  _calMonth += dir;
  if(_calMonth > 11){ _calMonth=0; _calYear++; }
  if(_calMonth < 0) { _calMonth=11; _calYear--; }
  _calSelectedDate = null;
  renderJournal();
}

function calSelectDate(dateStr){
  _calSelectedDate = _calSelectedDate===dateStr ? null : dateStr;
  renderJournal();
}

function renderJournal(){
  renderHeatmap();
  if(_journalView==='cal'){ renderJournalCalendar(); return; }
  const el=document.getElementById('jv');
  if(!el) return;
  const search=(document.getElementById('journal-search')||{value:''}).value.toLowerCase().trim();
  const typeFilter=(document.getElementById('journal-type')||{value:''}).value;
  const monthFilter=(document.getElementById('journal-month')||{value:''}).value;

  // ── Build a map of date → { di, dateStr, sessName, sessType, exoLogs[], note }
  const byDate={};

  // Collect exercise logs
  Object.entries(S.logs||{}).forEach(([key,sets])=>{
    if(!sets||!sets.length) return;
    const parts=key.split('_'); // di_ei_YYYY-MM-DD
    if(parts.length<3) return;
    const di=parseInt(parts[0]), ei=parseInt(parts[1]);
    const dateStr=parts.slice(2).join('_');
    const ex=(S.week[di]&&S.week[di].exercises[ei])||null;
    if(!ex) return;
    if(!byDate[dateStr]) byDate[dateStr]={di,dateStr,exoLogs:[],note:''};
    const bestSet=sets.reduce((a,b)=>((b.w||0)*(b.r||0)>(a.w||0)*(a.r||0)?b:a),sets[0]);
    const vol=sets.reduce((s,l)=>s+((l.w||0)*(l.r||0)||(l.r||0)),0);
    const globalBest=getBest(di,ei);
    const isPR=globalBest&&(bestSet.w||0)===(globalBest.w||0)&&(bestSet.r||0)===(globalBest.r||0)&&vol>0;
    byDate[dateStr].exoLogs.push({di,ei,exName:ex.name,amrap:!!ex.amrap,sets,bestSet,vol,isPR});
    byDate[dateStr].di=di; // keep latest di for this date (same day)
  });

  // Collect notes
  Object.entries(S.notes||{}).forEach(([key,text])=>{
    if(!text||!text.trim()) return;
    const parts=key.split('_');
    if(parts.length<2) return;
    const di=parseInt(parts[0]);
    const dateStr=parts.slice(1).join('_');
    if(!byDate[dateStr]) byDate[dateStr]={di,dateStr,exoLogs:[],note:''};
    byDate[dateStr].note=text.trim();
    byDate[dateStr].noteKey=key;
    if(!byDate[dateStr].exoLogs.length) byDate[dateStr].di=di;
  });

  // Enrich entries with session info
  const entries=Object.values(byDate).map(e=>{
    const sess=S.week[e.di]||{};
    const dateParts=e.dateStr.split('-');
    const dateFmt=dateParts[2]+'/'+dateParts[1]+'/'+dateParts[0];
    const monthKey=dateParts[0]+'-'+dateParts[1]; // YYYY-MM
    const dateObj=new Date(e.dateStr);
    return{...e,sess,sessName:sess.name||'',sessType:sess.type||'',dateFmt,monthKey,dateObj};
  }).sort((a,b)=>b.dateObj-a.dateObj);

  // ── Populate month dropdown
  const monthSel=document.getElementById('journal-month');
  if(monthSel){
    const months=[...new Set(entries.map(e=>e.monthKey))].sort().reverse();
    const cur=monthSel.value;
    monthSel.innerHTML='<option value="">Tous les mois</option>'+months.map(m=>{
      const [y,mo]=m.split('-');
      const label=new Date(y,parseInt(mo)-1,1).toLocaleDateString('fr-FR',{month:'long',year:'numeric'});
      return`<option value="${m}"${m===cur?' selected':''}>${label}</option>`;
    }).join('');
  }

  // ── Show/hide clear button
  const clearBtn=document.getElementById('journal-clear');
  if(clearBtn) clearBtn.style.display=(search||typeFilter||monthFilter)?'inline-flex':'none';

  // ── Apply filters
  const filtered=entries.filter(e=>{
    if(typeFilter&&e.sessType!==typeFilter) return false;
    if(monthFilter&&e.monthKey!==monthFilter) return false;
    if(search){
      const haystack=[
        e.sessName,
        e.note,
        ...e.exoLogs.map(l=>l.exName)
      ].join(' ').toLowerCase();
      if(!haystack.includes(search)) return false;
    }
    return true;
  });

  if(!filtered.length){
    el.innerHTML=`<div class="empty-box">
      <div class="eb-ico">📝</div>
      <div class="eb-t">${search||typeFilter||monthFilter?'Aucun résultat':'Aucune session loguée'}</div>
      <div class="eb-s">${search||typeFilter||monthFilter?'Modifie les filtres pour élargir la recherche.':'Logue tes séries dans Séance pour les voir ici.'}</div>
    </div>`;
    return;
  }

  function hl(str){
    if(!search) return str.replace(/</g,'&lt;');
    const safe=str.replace(/</g,'&lt;');
    const re=new RegExp('('+search.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi');
    return safe.replace(re,'<mark>$1</mark>');
  }

  el.innerHTML=`<div class="journal-list">${filtered.map(e=>{
    const sess=e.sess;
    const typeColor=sess.type==='push'?'var(--push)':sess.type==='pull'?'var(--pull)':sess.type==='legs'?'var(--legs)':'var(--t3)';

    // Exercise log rows
    const logRows=e.exoLogs.map(l=>{
      const setsStr=l.sets.map((s,si)=>{
        const r=s.r||0, w=s.w||0;
        if(l.amrap) return w?`${w}kg×${r||'?'}`:r?`${r} rép`:'?';
        return w?`${w}kg×${r}`:`${r} rép`;
      }).join(' / ');
      return`<div class="ji-log-row">
        <div class="ji-exo-name">${hl(l.exName)}</div>
        <div class="ji-sets">${l.sets.length} série${l.sets.length>1?'s':''} · ${setsStr}</div>
        ${l.isPR?'<div class="ji-pr">PR</div>':''}
        ${l.amrap?'<div class="ji-amrap">AMRAP</div>':''}
      </div>`;
    }).join('');

    // Session volume summary
    const totalVol=e.exoLogs.reduce((s,l)=>s+l.vol,0);
    const totalSets=e.exoLogs.reduce((s,l)=>s+l.sets.length,0);
    const summaryHTML=e.exoLogs.length?`<div class="ji-summary">
      <span>${totalSets} série${totalSets>1?'s':''}</span>
      <span>·</span>
      <span>${e.exoLogs.length} exercice${e.exoLogs.length>1?'s':''}</span>
      ${totalVol?`<span>·</span><span class="ji-sum-val">${totalVol>=1000?(totalVol/1000).toFixed(1)+'t':totalVol+'kg'} volume</span>`:''}
    </div>`:'';

    const noteHTML=e.note?`<div class="ji-text">${hl(e.note)}${e.noteKey?`<button class="ji-del" onclick="deleteNote('${e.noteKey}')" title="Supprimer la note" style="margin-left:8px">✕ note</button>`:''}</div>`:'';
    const wtChips = buildWtChips(e.di, e.dateStr);
    const wtHTML = wtChips ? `<div style="padding:0 16px 10px">${wtChips}</div>` : '';

    return`<div class="journal-item" style="border-left:3px solid ${typeColor}">
      <div class="ji-head">
        <div style="display:flex;flex-direction:column;gap:3px">
          <div class="ji-date">${e.dateFmt} — ${DAYS[e.di]}</div>
          <div class="ji-sess">
            ${e.sessName?`<span style="font-size:11px;font-weight:500;color:var(--t1)">${hl(e.sessName)}</span><span class="badge">${e.sessType}</span>`:'<span style="font-size:11px;color:var(--t3)">—</span>'}
          </div>
        </div>
      </div>
      ${e.exoLogs.length?`<div class="ji-logs">${logRows}</div>`:''}
      ${summaryHTML}
      ${wtHTML}
      ${noteHTML}
    </div>`;
  }).join('')}
  <div style="font-family:var(--mono);font-size:9px;color:var(--t3);text-align:center;padding:16px 0">${filtered.length} session${filtered.length>1?'s':''} · ${entries.length} au total</div>
  </div>`;
}

function clearJournalFilters(){
  const s=document.getElementById('journal-search');
  const t=document.getElementById('journal-type');
  const m=document.getElementById('journal-month');
  if(s) s.value='';
  if(t) t.value='';
  if(m) m.value='';
  renderJournal();
}

function deleteNote(key){
  if(!confirm('Supprimer cette note ?')) return;
  if(S.notes) delete S.notes[key];
  saveState();
  renderJournal();
}

