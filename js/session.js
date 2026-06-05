/* ═══ STATS ═══ */

/* ── SCORE DE LA SEMAINE ── */
function renderWeekScore(){
  // Section "Score semaine" retirée (dashboard épuré).
  const el = document.getElementById('dash-week-score');
  if(el) el.innerHTML='';
  return;
}
function _renderWeekScore_disabled(){
  const el = document.getElementById('dash-week-score');
  if(!el) return;

  const today = new Date();
  const monday = getMondayOf(today);
  const weekDates = Array.from({length:7},(_,i)=>{ const d=new Date(monday); d.setDate(monday.getDate()+i); return dateKey(d); });
  function dateKey(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }

  // Séances : combien prévues vs faites cette semaine
  let planned = 0, done = 0;
  weekDates.forEach((dk, i) => {
    const day = S.week[i];
    if(!day || day.type === 'rest') return;
    planned++;
    if(S.done && S.done[i+'_'+dk]) done++;
  });

  // Nutrition : combien de jours objectif atteint cette semaine
  const kcalGoal = (S.nutrGoals && S.nutrGoals.kcal) ? S.nutrGoals.kcal : 3000;
  let nutrDays = 0, nutrTracked = 0;
  weekDates.forEach(dk => {
    const n = S.nutrition && S.nutrition[dk];
    if(!n) return;
    nutrTracked++;
    if((n.kcal||0) >= kcalGoal * 0.9) nutrDays++;
  });

  const trainPct  = planned > 0 ? Math.round(done/planned*100) : 0;
  const nutrPct   = nutrTracked > 0 ? Math.round(nutrDays/nutrTracked*100) : null;
  const globalPct = nutrPct !== null ? Math.round((trainPct + nutrPct)/2) : trainPct;

  const scoreColor = globalPct >= 80 ? 'var(--green)' : globalPct >= 50 ? 'var(--yellow)' : 'var(--red)';
  const scoreLabel = globalPct >= 80 ? 'Semaine solide 🔥' : globalPct >= 50 ? 'En cours 💪' : 'À rattraper ⚡';

  const trainBar = `<div style="flex:1;min-width:120px">
    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
      <span style="font-family:var(--mono);font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Séances</span>
      <span style="font-family:var(--mono);font-size:10px;font-weight:600;color:var(--t1)">${done}/${planned}</span>
    </div>
    <div style="height:4px;background:var(--s3);border-radius:2px;overflow:hidden">
      <div style="height:100%;width:${trainPct}%;background:var(--push);border-radius:2px;transition:width .4s"></div>
    </div>
  </div>`;

  const nutrBar = nutrTracked > 0 ? `<div style="flex:1;min-width:120px">
    <div style="display:flex;justify-content:space-between;margin-bottom:4px">
      <span style="font-family:var(--mono);font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Nutrition</span>
      <span style="font-family:var(--mono);font-size:10px;font-weight:600;color:var(--t1)">${nutrDays}/${nutrTracked}j</span>
    </div>
    <div style="height:4px;background:var(--s3);border-radius:2px;overflow:hidden">
      <div style="height:100%;width:${nutrPct}%;background:var(--green);border-radius:2px;transition:width .4s"></div>
    </div>
  </div>` : '';

  el.innerHTML = `<div style="background:var(--s1);border:1px solid var(--b1);border-radius:var(--r2);padding:12px 14px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div style="font-size:12px;font-weight:600;color:var(--t1)">Score semaine</div>
      <div style="font-family:var(--mono);font-size:18px;font-weight:700;color:${scoreColor}">${globalPct}% <span style="font-size:10px;font-weight:400;color:var(--t3)">${scoreLabel}</span></div>
    </div>
    <div style="display:flex;gap:16px;flex-wrap:wrap">${trainBar}${nutrBar}</div>
  </div>`;
}

function renderDashHero(){
  const el = document.getElementById('dash-hero');
  if(!el) return;

  // ── Prochaine séance ──
  const today   = new Date();
  const todayDow = today.getDay() === 0 ? 6 : today.getDay() - 1; // 0=lun
  let nextDay = null, daysAhead = 0;
  for(let i=1; i<=7; i++){
    const idx = (todayDow + i) % 7;
    const day = S.week[idx];
    if(day && day.type !== 'rest' && day.exercises && day.exercises.length > 0){
      nextDay = day; daysAhead = i; break;
    }
  }
  // Also check today
  const todayDay = S.week[todayDow];
  const todayKey2 = (function(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); })();
  const todayDone = S.done && S.done[todayDow+'_'+todayKey2];
  const showToday = todayDay && todayDay.type !== 'rest' && todayDay.exercises && todayDay.exercises.length > 0 && !todayDone;
  const session   = showToday ? todayDay : nextDay;
  const label     = showToday ? "Aujourd'hui" : daysAhead===1 ? "Demain" : DAYS[((todayDow + daysAhead)%7)];
  const typeColor = session ? (session.type==='push'?'var(--push)':session.type==='pull'?'var(--pull)':session.type==='legs'?'var(--legs)':'var(--t3)') : 'var(--t3)';

  // ── Calories du jour ──
  const kcalGoal  = (S.nutrGoals && S.nutrGoals.kcal) ? S.nutrGoals.kcal : 3000;
  const protGoal  = (S.nutrGoals && S.nutrGoals.prot) ? S.nutrGoals.prot : 145;
  const nutrToday = (S.nutrition && S.nutrition[todayKey2]) ? S.nutrition[todayKey2] : null;
  const kcalToday = nutrToday ? (nutrToday.kcal||0) : 0;
  const protToday = nutrToday ? (nutrToday.prot||0) : 0;
  const kcalPct   = Math.min(100, Math.round(kcalToday/kcalGoal*100));
  const kcalColor = kcalPct >= 90 ? 'var(--green)' : kcalPct >= 60 ? 'var(--yellow)' : 'var(--red)';

  // ── Poids actuel (weight tracker) ──
  let wtCurrent = null, wtGoal = parseFloat(localStorage.getItem('wtGoal')||'83')||83, wtPct = 0;
  try {
    const wtData = JSON.parse(localStorage.getItem('wtEntries2')||'[]');
    const _wv = e => parseFloat(e && (e.w!=null ? e.w : e.kg));
    if(wtData.length){ wtCurrent = _wv(wtData[wtData.length-1]); }
    const wtStart = wtData.length ? _wv(wtData[0]) : 65;
    wtPct = wtCurrent ? Math.min(100, Math.max(0, (wtCurrent-wtStart)/(wtGoal-wtStart)*100)) : 0;
  } catch(e){}

  // ── Next session card ──
  const sessionCard = session ? `
    <div style="background:var(--s1);border:1px solid var(--b1);border-radius:var(--r2);padding:14px 16px;display:flex;flex-direction:column;justify-content:space-between;min-height:90px;cursor:pointer;transition:border-color .15s" onclick="go('dash', document.querySelector('.tab'))" onmouseenter="this.style.borderColor='var(--b3)'" onmouseleave="this.style.borderColor='var(--b1)'">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span style="font-family:var(--mono);font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.07em">${label}</span>
        <span style="font-family:var(--mono);font-size:9px;color:${typeColor};text-transform:uppercase;letter-spacing:.07em">${session.type}</span>
      </div>
      <div style="font-size:17px;font-weight:700;color:var(--t1);letter-spacing:-.02em;margin-bottom:4px">${session.name}</div>
      <div style="font-family:var(--mono);font-size:10px;color:var(--t3)">${session.exercises.length} exercices</div>
    </div>` : `
    <div style="background:var(--s1);border:1px solid var(--b1);border-radius:var(--r2);padding:14px 16px;display:flex;align-items:center;justify-content:center;min-height:90px">
      <span style="font-family:var(--mono);font-size:10px;color:var(--t3)">Repos aujourd'hui</span>
    </div>`;

  // ── Calories card ──
  const kcalCard = `
    <div style="background:var(--s1);border:1px solid var(--b1);border-radius:var(--r2);padding:14px 16px;min-width:130px;cursor:pointer" onclick="go('nutrition', document.querySelectorAll('.tab')[6])" onmouseenter="this.style.borderColor='var(--b3)'" onmouseleave="this.style.borderColor='var(--b1)'">
      <div style="font-family:var(--mono);font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Calories auj.</div>
      <div style="font-size:20px;font-weight:700;color:${kcalColor};letter-spacing:-.02em">${kcalToday||'—'}</div>
      <div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-top:2px">/ ${kcalGoal} kcal</div>
      <div style="height:3px;background:var(--s3);border-radius:2px;margin-top:8px;overflow:hidden">
        <div style="height:100%;width:${kcalPct}%;background:${kcalColor};border-radius:2px;transition:width .4s"></div>
      </div>
      <div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-top:4px">${protToday}g / ${protGoal}g prot</div>
    </div>`;

  // ── Poids card ──
  const poidsCard = `
    <div style="background:var(--s1);border:1px solid var(--b1);border-radius:var(--r2);padding:14px 16px;min-width:120px;cursor:pointer" onclick="go('nutrition', document.querySelectorAll('.tab')[6])" onmouseenter="this.style.borderColor='var(--b3)'" onmouseleave="this.style.borderColor='var(--b1)'">
      <div style="font-family:var(--mono);font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Poids actuel</div>
      <div style="font-size:20px;font-weight:700;color:var(--t1);letter-spacing:-.02em">${wtCurrent ? wtCurrent.toFixed(1) : '—'}</div>
      <div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-top:2px">${wtCurrent ? '→ objectif '+wtGoal+'kg' : 'Non enregistré'}</div>
      <div style="height:3px;background:var(--s3);border-radius:2px;margin-top:8px;overflow:hidden">
        <div style="height:100%;width:${wtPct.toFixed(0)}%;background:var(--green);border-radius:2px;transition:width .4s"></div>
      </div>
      <div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-top:4px">${wtCurrent ? (wtGoal-wtCurrent).toFixed(1)+'kg restants' : 'Ajoute ton poids'}</div>
      <div style="display:flex;gap:5px;margin-top:8px" onclick="event.stopPropagation()">
        <input id="dash-quick-weight" type="number" inputmode="decimal" min="30" max="200" step="0.1" placeholder="${wtCurrent ? wtCurrent.toFixed(1) : 'kg'}"
          onclick="event.stopPropagation()"
          onkeydown="if(event.key==='Enter'){ if(window.wtQuickAdd(this.value)) this.value=''; }"
          class="inp-sm" style="font-family:var(--font);flex:1;min-width:0;width:100%"/>
        <button onclick="event.stopPropagation(); var i=document.getElementById('dash-quick-weight'); if(window.wtQuickAdd(i.value)) i.value='';"
          class="btn btn-ghost btn-sm" style="padding:4px 10px" title="Enregistrer mon poids du jour">+</button>
      </div>
    </div>`;

  // Dashboard épuré : on garde uniquement la prochaine séance.
  // Calories et poids sont accessibles dans l'onglet Nutrition.
  el.innerHTML = sessionCard;
  el.style.gridTemplateColumns = '1fr';
}

function renderStats(){
  const el=document.getElementById('stats-grid');
  if(!el) return;

  const today=new Date();
  const monday=getMondayOf(today);
  const sunday=new Date(monday); sunday.setDate(monday.getDate()+6);

  // All unique dates with logs
  const logDates=new Set();
  Object.keys(S.logs).forEach(k=>{
    if(S.logs[k]&&S.logs[k].length>0){
      const parts=k.split('_');
      if(parts.length>=3) logDates.add(parts.slice(2).join('_'));
    }
  });

  // Build per-date metrics for sparklines (last 7 days)
  function dateKey(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }

  const last7=[];
  for(let i=6;i>=0;i--){
    const d=new Date(today); d.setDate(d.getDate()-i);
    last7.push(dateKey(d));
  }

  // Volume per day (last 7)
  const volByDay={};
  Object.entries(S.logs).forEach(([k,logs])=>{
    if(!logs||!logs.length) return;
    const parts=k.split('_'); if(parts.length<3) return;
    const dk=parts.slice(2).join('_');
    if(!volByDay[dk]) volByDay[dk]=0;
    logs.forEach(l=>{ volByDay[dk]+=((l.w||0)*(l.r||0)||(l.r||0)); });
  });

  // Sets per day (last 7)
  const setsByDay={};
  Object.entries(S.logs).forEach(([k,logs])=>{
    if(!logs||!logs.length) return;
    const parts=k.split('_'); if(parts.length<3) return;
    const dk=parts.slice(2).join('_');
    if(!setsByDay[dk]) setsByDay[dk]=0;
    setsByDay[dk]+=logs.length;
  });

  // Sessions per day (1 or 0)
  const sessPerDay={};
  logDates.forEach(dk=>{ sessPerDay[dk]=1; });

  // Streak history (1 if trained, 0 if rest day skipped, -1 if missed)
  function dayOfWeekIdx(date){ const js=date.getDay(); return js===0?6:js-1; }

  const streakByDay={};
  last7.forEach(dk=>{
    const d=new Date(dk+'T12:00:00');
    const wIdx=dayOfWeekIdx(d);
    const dayPlan=S.week[wIdx];
    const isRest=!dayPlan||!dayPlan.name.trim()||dayPlan.type==='rest';
    streakByDay[dk]=isRest?null:(logDates.has(dk)?1:0);
  });

  // Summary stats
  const weekDates=[];
  for(let d=new Date(monday);d<=sunday;d.setDate(d.getDate()+1))
    weekDates.push(dateKey(new Date(d)));

  let sessWeek=0;
  weekDates.forEach(d=>{ if(logDates.has(d)) sessWeek++; });

  const curYear=today.getFullYear(), curMonth=String(today.getMonth()+1).padStart(2,'0');
  const monthPrefix=curYear+'-'+curMonth+'-';
  const sessMonth=[...logDates].filter(d=>d.startsWith(monthPrefix)).length;

  let totalVol=0;
  Object.values(S.logs).forEach(logs=>{
    if(Array.isArray(logs)) logs.forEach(l=>{totalVol+=((l.w||0)*(l.r||0)||(l.r||0));});
  });

  let streak=0;
  if(logDates.size){
    const check=new Date(today); check.setDate(check.getDate()-1);
    for(let i=0;i<365;i++){
      const dk=dateKey(check);
      const wIdx=dayOfWeekIdx(check);
      const dayPlan=S.week[wIdx];
      const isRest=!dayPlan||!dayPlan.name.trim()||dayPlan.type==='rest';
      if(isRest){ check.setDate(check.getDate()-1); continue; }
      if(logDates.has(dk)){ streak++; check.setDate(check.getDate()-1); } else break;
    }
  }

  const volFmt=v=>v>=1000?(v/1000).toFixed(1)+'t':v+'kg';

  // ── SPARKLINE builder ──
  // values: array of 7 numbers (nulls for rest days)
  // accent: CSS color string
  // filled: draw filled area under curve
  function buildSparkline(values, accentVar, filled=true){
    const W=200, H=34, pad=2;
    const nums=values.map(v=>v??0);
    const max=Math.max(...nums,1);
    const min=0;
    const range=max-min||1;
    const pts=nums.map((v,i)=>{
      const x=pad+i*(W-pad*2)/6;
      const y=H-pad-(v-min)/range*(H-pad*2);
      return [x,y];
    });

    // Monotone cubic Hermite interpolation — never overshoots
    // (no waves below baseline when values are sparse / spiky)
    function buildPath(pts){
      const n=pts.length;
      if(n<2) return `M${pts[0][0]},${pts[0][1]}`;

      // 1) slopes between consecutive points
      const dx=[], dy=[], m=[];
      for(let i=0;i<n-1;i++){
        dx[i]=pts[i+1][0]-pts[i][0];
        dy[i]=pts[i+1][1]-pts[i][1];
        m[i]=dy[i]/dx[i];
      }

      // 2) tangents at each point (Fritsch-Carlson)
      const t=new Array(n);
      t[0]=m[0]; t[n-1]=m[n-2];
      for(let i=1;i<n-1;i++){
        if(m[i-1]*m[i]<=0){ t[i]=0; }
        else {
          const w1=2*dx[i]+dx[i-1], w2=dx[i]+2*dx[i-1];
          t[i]=(w1+w2)/(w1/m[i-1]+w2/m[i]);
        }
      }

      // 3) build path using cubic bezier between each pair
      let d=`M${pts[0][0]},${pts[0][1]}`;
      for(let i=0;i<n-1;i++){
        const h=dx[i];
        const c1x=pts[i][0]+h/3,   c1y=pts[i][1]+t[i]*h/3;
        const c2x=pts[i+1][0]-h/3, c2y=pts[i+1][1]-t[i+1]*h/3;
        d+=` C${c1x},${c1y} ${c2x},${c2y} ${pts[i+1][0]},${pts[i+1][1]}`;
      }
      return d;
    }

    const d=buildPath(pts);

    const lastPt=pts[pts.length-1];
    const firstPt=pts[0];
    const areaPath=d+` L${lastPt[0]},${H} L${firstPt[0]},${H} Z`;

    const dotX=lastPt[0], dotY=lastPt[1];
    const hasData=max>0;
    const dotColor=hasData?`var(${accentVar})`:'var(--t4)';
    const lineColor=hasData?`var(${accentVar})`:'var(--t3)';

    return `<svg class="stat-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sg-${accentVar.replace(/[^a-z0-9]/gi,'')}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(${accentVar})" stop-opacity="${hasData?'.18':'0'}"/>
          <stop offset="100%" stop-color="var(${accentVar})" stop-opacity="0"/>
        </linearGradient>
      </defs>
      ${filled&&hasData?`<path d="${areaPath}" fill="url(#sg-${accentVar.replace(/[^a-z0-9]/gi,'')})" stroke="none"/>`:''  }
      <path d="${d}" fill="none" stroke="${lineColor}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="${hasData?'1':'.3'}"/>
      <circle cx="${dotX}" cy="${dotY}" r="2.5" fill="${dotColor}" opacity="${hasData?'1':'.4'}"/>
    </svg>`;
  }

  // ── Trend badge ──
  function trendBadge(vals){
    const nums=vals.filter(v=>v!==null&&v!==undefined);
    if(nums.length<2) return `<span class="stat-trend eq">—</span>`;
    const half=Math.floor(nums.length/2);
    const recent=nums.slice(half).reduce((a,b)=>a+b,0)/(nums.length-half);
    const older=nums.slice(0,half).reduce((a,b)=>a+b,0)/half;
    if(older===0) return recent>0?`<span class="stat-trend up">NEW</span>`:`<span class="stat-trend eq">—</span>`;
    const pct=Math.round((recent-older)/older*100);
    if(pct>5) return `<span class="stat-trend up">↑${pct}%</span>`;
    if(pct<-5) return `<span class="stat-trend dn">↓${Math.abs(pct)}%</span>`;
    return `<span class="stat-trend eq">~${pct>0?'+':''}${pct}%</span>`;
  }

  // ── Day labels (Mon-style for last 7) ──
  const dayNames=['D','L','M','M','J','V','S'];
  function dayLabels(dates){
    return dates.map(dk=>{
      const d=new Date(dk+'T12:00:00');
      return dayNames[d.getDay()];
    });
  }
  const labels=dayLabels(last7);
  function labelsHTML(dates){ return `<div class="stat-spark-days">${dayLabels(dates).map(l=>`<span>${l}</span>`).join('')}</div>`; }

  // ── Data series ──
  const volSeries=last7.map(dk=>volByDay[dk]||0);
  const sessSeries=last7.map(dk=>sessPerDay[dk]||0);
  const setSeries=last7.map(dk=>setsByDay[dk]||0);

  // Streak bar series: 1=done,0=missed, null=rest
  const streakSeries=last7.map(dk=>streakByDay[dk]);

  const trainedDays7=sessSeries.filter(v=>v>0).length;
  const vol7=volSeries.reduce((a,b)=>a+b,0);
  const vol7Fmt=volFmt(vol7);

  // ── Card 1 : Séances semaine ──
  const card1=`<div class="stat-card">
    <div class="stat-top">
      <div class="stat-lbl">Séances / 7 jours</div>
      ${trendBadge(sessSeries)}
    </div>
    <div class="stat-main">
      <span class="stat-val">${trainedDays7}</span>
      <span class="stat-unit">/ 7j</span>
    </div>
    <div class="stat-sub">${sessWeek} cette semaine · ${S.week.filter(d=>d.name&&d.type!=='rest').length} prévues</div>
    <div class="stat-spark-wrap">
      ${buildSparkline(sessSeries,'--blue')}
      ${labelsHTML(last7)}
    </div>
  </div>`;

  // ── Card 2 : Volume 7 jours ──
  const card2=`<div class="stat-card">
    <div class="stat-top">
      <div class="stat-lbl">Volume 7 jours</div>
      ${trendBadge(volSeries)}
    </div>
    <div class="stat-main">
      <span class="stat-val" style="font-size:${vol7>=10000?'18px':vol7>=1000?'22px':'26px'}">${vol7Fmt}</span>
    </div>
    <div class="stat-sub">total : ${volFmt(totalVol)} all-time</div>
    <div class="stat-spark-wrap">
      ${buildSparkline(volSeries,'--green')}
      ${labelsHTML(last7)}
    </div>
  </div>`;

  // ── Card 3 : Streak ──
  const streakNums=streakSeries.map(v=>v===null?null:v);
  const card3=`<div class="stat-card">
    <div class="stat-top">
      <div class="stat-lbl">Streak</div>
      ${streak>0?`<span class="stat-trend up">🔥${streak}j</span>`:`<span class="stat-trend eq">—</span>`}
    </div>
    <div class="stat-main">
      <span class="stat-val">${streak}</span>
      <span class="stat-unit">jours</span>
    </div>
    <div class="stat-sub">consécutifs · ${sessMonth} ce mois</div>
    <div class="stat-spark-wrap">
      ${buildStreakBar(streakSeries)}
      ${labelsHTML(last7)}
    </div>
  </div>`;

  // ── Card 4 : Séries / jour ──
  const card4=`<div class="stat-card">
    <div class="stat-top">
      <div class="stat-lbl">Séries / jour</div>
      ${trendBadge(setSeries)}
    </div>
    <div class="stat-main">
      <span class="stat-val">${setSeries[6]||0}</span>
      <span class="stat-unit">auj.</span>
    </div>
    <div class="stat-sub">moy. 7j : ${setSeries.some(v=>v>0)?(setSeries.reduce((a,b)=>a+b,0)/Math.max(setSeries.filter(v=>v>0).length,1)).toFixed(1):'—'} séries</div>
    <div class="stat-spark-wrap">
      ${buildSparkline(setSeries,'--yellow')}
      ${labelsHTML(last7)}
    </div>
  </div>`;

  // ── Badge d'ancienneté ("ça fait X que tu t'entraînes") ──
  let tenureBanner = '';
  if(logDates.size){
    const sorted = [...logDates].sort();
    const first = new Date(sorted[0]);
    const now = new Date(today);
    const days = Math.floor((now - first)/86400000);
    const totalSessions = logDates.size;
    let icon='💪', headline='';
    if(days >= 365){ const y=Math.floor(days/365); icon='👑'; headline=`${y} an${y>1?'s':''} d'entraînement`; }
    else if(days >= 180){ icon='🔱'; headline='6 mois d\'entraînement'; }
    else if(days >= 90){ icon='🏆'; headline='3 mois d\'entraînement'; }
    else if(days >= 30){ const m=Math.floor(days/30); icon='🔥'; headline=`${m} mois d'entraînement`; }
    else if(days >= 14){ icon='⚡'; headline='2 semaines d\'entraînement'; }
    else if(days >= 7){ icon='✨'; headline='1 semaine d\'entraînement'; }
    else { icon='🌱'; headline='Tu viens de commencer'; }
    tenureBanner = `<div style="grid-column:1/-1;display:flex;align-items:center;gap:12px;background:linear-gradient(135deg,var(--s2),var(--s1));border:1px solid var(--b1);border-radius:var(--r2);padding:12px 16px;margin-bottom:4px">
      <span style="font-size:22px">${icon}</span>
      <div>
        <div style="font-family:var(--font);font-size:13px;font-weight:600;color:var(--t1)">${headline}</div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">${totalSessions} séance${totalSessions>1?'s':''} · depuis le ${(()=>{const p=sorted[0].split('-');return p[2]+'/'+p[1]+'/'+p[0];})()}</div>
      </div>
    </div>`;
  }

  // Affiche UNIQUEMENT le bandeau d'ancienneté (motivant).
  // Les 4 cartes stats (séances 7j, volume 7j, streak, séries/jour) sont retirées
  // pour garder un dashboard épuré centré sur l'essentiel.
  el.innerHTML=tenureBanner;
  renderDashHero();
}

// ── Streak bar (special: dots/bars per day) ──
function buildStreakBar(series){
  const W=200, H=34, n=series.length;
  const bw=18, gap=8;
  const totalW=n*bw+(n-1)*gap;
  const startX=(W-totalW)/2;
  const bars=series.map((v,i)=>{
    const x=startX+i*(bw+gap);
    if(v===null){
      // rest day — faint dot
      return `<rect x="${x}" y="${H/2-2}" width="${bw}" height="4" rx="2" fill="var(--t4)" opacity=".3"/>`;
    }
    const h=v===1?H-4:6;
    const y=H-2-h;
    const col=v===1?'var(--green)':'var(--s5)';
    const op=v===1?'1':'.5';
    return `<rect x="${x}" y="${y}" width="${bw}" height="${h}" rx="3" fill="${col}" opacity="${op}"/>`;
  }).join('');
  return `<svg class="stat-spark" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
}


/* ═══ STRIP ═══ */
function renderStrip(){
  const today=todayKey();
  const todayIdx = (new Date().getDay() + 6) % 7; // 0=Lundi
  // Dates réelles de la semaine courante (lundi → dimanche)
  const monday = (typeof getMondayOf==='function') ? getMondayOf(new Date()) : (function(){ const d=new Date(); const off=(d.getDay()+6)%7; d.setDate(d.getDate()-off); return d; })();
  function dk(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
  document.getElementById('strip').innerHTML=DAYS.map((d,i)=>{
    const s=S.week[i];
    const isToday = (i===todayIdx);
    // Date de CE jour dans la semaine courante
    const dayDate = new Date(monday); dayDate.setDate(monday.getDate()+i);
    const dayDateKey = dk(dayDate);
    // "Fait" = marqué done à la date réelle de ce jour (cette semaine) OU aujourd'hui
    const done = S.done && (S.done[i+'_'+dayDateKey] || (isToday && S.done[i+'_'+today]));
    // Statut :
    //  - séance faite → vert
    //  - repos → vert SEULEMENT le jour même (pas avant)
    //  - jour d'entraînement passé non fait → rouge
    let statusCls = '';
    if(done){ statusCls='st-ok'; }
    else if(s.type==='rest' && i <= todayIdx){ statusCls='st-ok'; } // repos = vert le jour même ET une fois passé
    else if(s.type!=='rest' && i < todayIdx){ statusCls='st-miss'; }
    return`<div class="dp tp-${s.type}${curDay===i?' on':''}${isToday?' today':''}${done?' done':''} ${statusCls}" onclick="selectDay(${i})">
      <div class="dp-d">${d.slice(0,3)}</div><div class="dp-dot"></div>
      <div class="dp-tag">${s.name||'—'}</div>
    </div>`;
  }).join('');
}
function selectDay(i){
  if(i!==curDay){
    // pause & reset stopwatch when switching days
    if(_swRunning) pauseStopwatch();
    _swElapsed=0; _swRunning=false;
  }
  curDay=i; expandP=-1; expandA=-1; renderStrip(); renderSession();
}

/* ═══ SESSION VIEW ═══ */
function renderSession(){
  const s=S.week[curDay], el=document.getElementById('sv');
  if(!s.name.trim()){
    const totalExos = S.week.reduce((a,d)=>a+(d.exercises||[]).length,0);
    const isFullyEmpty = S.week.every(d=>(!d.name||!d.name.trim())&&(!d.exercises||d.exercises.length===0));
    el.innerHTML = isFullyEmpty
      ? `<div class="empty-box">
          <div class="eb-ico">📂</div>
          <div class="eb-t">Aucun programme chargé</div>
          <div class="eb-s" style="margin-bottom:10px">Charge ton fichier JSON ou configure ton programme manuellement.</div>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap">
            <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer" class="btn btn-white">
              📂 Charger mon JSON
              <input type="file" accept=".json,application/json" style="display:none" onchange="wsFileLoad(this)"/>
            </label>
            <button class="btn" onclick="go('prog',document.querySelectorAll('.tab')[1])">Configurer manuellement →</button>
          </div>
        </div>`
      : `<div class="empty-box"><div class="eb-ico">📋</div><div class="eb-t">Aucune séance configurée</div><div class="eb-s">Va dans Programme pour configurer ce jour.</div><button class="btn btn-white" onclick="go('prog',document.querySelectorAll('.tab')[1])">Configurer →</button></div>`;
    return;
  }
  if(s.type==='rest'){
    el.innerHTML=`<div class="rest-box"><div class="ri">🛌</div><h3>${s.name}</h3><p>Repos — récupération, hydratation, sommeil.</p></div>`;
    return;
  }
  if(!s.exercises.length){
    el.innerHTML=`<div class="empty-box"><div class="eb-ico">💪</div><div class="eb-t">${s.name}</div><div class="eb-s">Aucun exercice — ajoutes-en depuis Programme.</div><button class="btn" onclick="go('prog',document.querySelectorAll('.tab')[1])">Modifier →</button></div>`;
    return;
  }
  const today=todayKey();
  // "Terminée" = marqué fait aujourd'hui OU à la date réelle de ce jour cette semaine
  const _mon = (typeof getMondayOf==='function') ? getMondayOf(new Date()) : (function(){ const d=new Date(); const o=(d.getDay()+6)%7; d.setDate(d.getDate()-o); return d; })();
  const _dd = new Date(_mon); _dd.setDate(_mon.getDate()+curDay);
  const _ddKey = _dd.getFullYear()+'-'+String(_dd.getMonth()+1).padStart(2,'0')+'-'+String(_dd.getDate()).padStart(2,'0');
  const isDone=S.done&&(S.done[curDay+'_'+today]||S.done[curDay+'_'+_ddKey]);
  const noteKey=curDay+'_'+today;
  const noteVal=S.notes&&S.notes[noteKey]?S.notes[noteKey]:'';
  const planRows=buildSessionPlanRows(s.exercises);
  const actRows=buildSessionActRows(s.exercises);

  // ── Estimated duration (adaptative : moyenne réelle par type, ou manuel) ──
  const estD = getEstDuration(s);
  const estMin = estD.mins;
  const estFmt = estMin >= 60 ? `${Math.floor(estMin/60)}h${String(estMin%60).padStart(2,'0')}` : `${estMin} min`;
  const estSrcLabel = estD.source==='moyenne' ? `moyenne sur ${estD.n} séance${estD.n>1?'s':''}`
                    : estD.source==='manuel' ? 'défini manuellement'
                    : 'estimation théorique';

  // ── Progress today (basé sur les séries faites AUJOURD'HUI uniquement) ──
  const _tdl = (typeof getTodayLogs==='function') ? getTodayLogs : getLogs;
  const doneCount = s.exercises.filter((_,ei) => _tdl(curDay,ei).filter(l=>(l.w||0)>0||(l.r||0)>0).length > 0).length;
  const totalExo = s.exercises.length;
  const pct = totalExo ? Math.round(doneCount/totalExo*100) : 0;

  // ── Stopwatch display ──
  const swFmt = formatStopwatch(_swElapsed + (_swRunning ? Date.now() - _swStartTs : 0));

  el.innerHTML=`
    <div class="sess-bar">
      <div class="sess-bar-item" onclick="setManualDuration('${s.type}')" style="cursor:pointer" title="Cliquer pour définir une durée manuelle">
        <div class="sess-bar-icon">⏱</div>
        <div class="sess-bar-body">
          <div class="sess-bar-lbl">Durée estimée ✎</div>
          <div class="sess-bar-val">${estFmt}</div>
          <div class="sess-bar-sub">${estSrcLabel} · ${s.exercises.length} exos · ${s.exercises.reduce((a,ex)=>a+ex.sets,0)} séries</div>
        </div>
      </div>
      <div class="sess-bar-item">
        <div class="sess-bar-icon">⚡</div>
        <div class="sess-bar-body">
          <div class="sess-bar-lbl">Avancement</div>
          <div class="sess-bar-val">${doneCount} / ${totalExo}</div>
          <div class="sess-bar-sub" style="display:flex;align-items:center;gap:6px">
            <div style="flex:1;height:3px;background:var(--s5);border-radius:2px;min-width:60px">
              <div style="height:100%;width:${pct}%;background:${pct===100?'var(--green)':'var(--t2)'};border-radius:2px;transition:width .3s"></div>
            </div>
            <span>${pct}%</span>
          </div>
        </div>
      </div>
      <div class="sess-bar-item">
        <div class="sess-bar-icon">🕐</div>
        <div class="sess-bar-body">
          <div class="sess-bar-lbl">Chrono séance</div>
          <div class="sess-bar-val${_swRunning?' sw-running':''}" id="sw-display">${swFmt}</div>
          <div class="sess-bar-sub">${_swRunning ? 'en cours' : (_swElapsed>0 ? 'en pause' : 'non démarré')}</div>
        </div>
        <button class="sw-btn${_swRunning?' running':''}" id="sw-btn" onclick="toggleStopwatch()" title="${_swRunning?'Pause':'Démarrer'}">
          ${_swRunning ? '⏸' : (_swElapsed>0 ? '▶' : '▶')}
        </button>
        ${_swElapsed>0&&!_swRunning?`<button class="sw-btn" onclick="resetStopwatch()" title="Réinitialiser" style="margin-left:4px">↺</button>`:''}
      </div>
    </div>
    <div class="pva-grid">
      <div class="pva-col">
        <div class="pva-head">
          <div class="pva-label"><div class="pva-dot planned"></div><div class="pva-title">Prévu</div></div>
          <div class="pva-meta">${s.name} &middot; <span class="badge">${s.type}</span></div>
        </div>
        <div>${planRows}</div>
      </div>
      <div class="pva-col">
        <div class="pva-head">
          <div class="pva-label"><div class="pva-dot actual"></div><div class="pva-title">Réalisé aujourd'hui</div></div>
          <div class="pva-meta">${todayFmt()}</div>
        </div>
        <div>${actRows}</div>
        <div class="done-row">
          <div style="flex:1;display:flex;flex-direction:column;gap:8px">
            <div class="wt-section" style="border-radius:8px;margin-bottom:0">
              <div class="wt-label">Ressenti du jour ${helpQ('ressenti')}</div>
              ${helpBubble('ressenti')}
              <div class="wt-row" id="wt-inline-row"></div>
            </div>
            <div class="sess-note-wrap" style="margin-top:0;padding-top:0;border-top:none">
              <textarea class="sess-note-inp" placeholder="Note de séance — ressenti, fatigue, blessure…"
                onchange="saveNote(${curDay},'${today}',this.value)">${noteVal}</textarea>
            </div>
          </div>
          <button class="btn ${isDone?'btn-white':''}" style="flex-shrink:0;align-self:flex-end" onclick="toggleDone()">
            ${isDone?'✓ Terminée':'Terminer'}
          </button>
        </div>
      </div>
    </div>`;
  // Render wellness inline pills after DOM is set
  requestAnimationFrame(() => renderWtInline());
}

/* ── GROUP BUILDER — produces superset wrappers for plan col ── */
function buildSessionPlanRows(exercises){
  const groups = groupExercises(exercises);
  return groups.map(g => {
    if(g.type === 'single'){
      return buildPlanRow(g.ex, g.ei);
    }
    // superset group
    const slots = g.items.map(({ex,ei})=>`
      <div class="ss-slot">
        ${buildPlanRow(ex,ei)}
      </div>`).join('');
    const names = g.items.map(({ex})=>ex.name.split('(')[0].trim()).join(' + ');
    return `<div class="ss-group" id="ssg-plan-${g.id}">
      <div class="ss-header">
        <span class="ss-badge">Superset</span>
        <span class="ss-label">${names}</span>
      </div>
      ${slots}
    </div>`;
  }).join('');
}

function buildSessionActRows(exercises){
  const groups = groupExercises(exercises);
  return groups.map(g => {
    if(g.type === 'single'){
      return buildActRow(g.ex, g.ei);
    }
    // superset group — render with timer
    const slots = g.items.map(({ex,ei},si)=>{
      const isActive = _ssActive && _ssActive.groupId===g.id && _ssActive.slotIdx===si;
      return `<div class="ss-slot${isActive?' ss-current':''}">
        ${buildActRow(ex,ei,isActive)}
      </div>`;
    }).join('');
    const tour = _ssTours[g.id]||0;
    const totalSets = g.items[0].ex.sets||3;
    const restSecs = g.items[0].ex.rest||60;
    // timer state
    const isTimerRunning = _ssTimer && _ssTimer.groupId===g.id;
    const timeLeft = isTimerRunning ? _ssTimer.left : 0;
    const timeFmt = isTimerRunning ? Math.floor(timeLeft/60)+':'+(String(timeLeft%60).padStart(2,'0')) : '';
    const fillPct = isTimerRunning ? Math.round(timeLeft/_ssTimer.total*100) : 0;
    const nextSlotName = isTimerRunning
      ? g.items[_ssTimer.nextSlot].ex.name.split('(')[0].trim()
      : '';

    return `<div class="ss-group${isTimerRunning?' ss-active':''}" id="ssg-${g.id}">
      <div class="ss-header">
        <span class="ss-badge">Superset</span>
        <span class="ss-label">${tour>0?`Tour ${tour}/${totalSets}`:'Prêt'}</span>
        <span class="ss-tour">${tour>0?`${g.items.filter(({ei})=>getLogs(curDay,ei).length>0).length}/${g.items.length*totalSets} séries`:''}</span>
      </div>
      ${isTimerRunning ? `
      <div class="ss-timer-wrap">
        <div class="ss-timer-display">${timeFmt}</div>
        <div style="flex:1;min-width:0">
          <div class="ss-timer-label"><b>Repos — puis : ${nextSlotName}</b></div>
          <div class="ss-timer-track"><div class="ss-timer-fill" style="width:${fillPct}%"></div></div>
        </div>
        <button class="ss-timer-btn" onclick="cancelSSTimer()">✕</button>
      </div>` : ''}
      ${slots}
      <div style="padding:8px 12px;border-top:1px solid rgba(251,191,36,.1);display:flex;align-items:center;gap:8px;flex-wrap:wrap">
        <span style="font-family:var(--mono);font-size:9px;color:var(--t3)">Repos entre exercices :</span>
        <select class="rest-sel" id="ss-rest-${g.id}" style="border-color:rgba(251,191,36,.2)">
          ${[30,45,60,90,120].map(v=>`<option value="${v}"${restSecs==v?' selected':''}>${v<60?v+'s':v/60+'m'}</option>`).join('')}
        </select>
        <button class="ss-timer-btn" onclick="startSSRest('${g.id}',${JSON.stringify(g.items.map(({ei})=>ei))})">
          ▶ Repos + prochain exercice
        </button>
      </div>
    </div>`;
  }).join('');
}

/* ── groupExercises: returns array of {type:'single'|'ss', ...} ── */
function groupExercises(exercises){
  const result = [];
  let i = 0;
  while(i < exercises.length){
    const ex = exercises[i];
    const gid = ex.supersetGroup;
    if(gid){
      // collect consecutive exercises with same group id
      const items = [];
      while(i < exercises.length && exercises[i].supersetGroup === gid){
        items.push({ex:exercises[i], ei:i});
        i++;
      }
      result.push({type:'ss', id:gid, items});
    } else {
      result.push({type:'single', ex, ei:i});
      i++;
    }
  }
  return result;
}

/* ── Superset timer state ── */
let _ssActive = null;   // {groupId, slotIdx}
let _ssTimer  = null;   // {groupId, left, total, nextSlot, iv}
let _ssTours  = {};     // groupId → tour number

function startSSRest(groupId, eis){
  // determine which slot just finished (active one, or first)
  const curSlot = _ssActive && _ssActive.groupId===groupId ? _ssActive.slotIdx : 0;
  const nextSlot = (curSlot + 1) % eis.length;
  // mark next as active
  _ssActive = {groupId, slotIdx: nextSlot};
  // update tour count when we wrap around
  if(nextSlot === 0){
    _ssTours[groupId] = (_ssTours[groupId]||0) + 1;
  }
  // get rest seconds from selector
  const selEl = document.getElementById('ss-rest-'+groupId);
  const restSecs = selEl ? parseInt(selEl.value)||60 : 60;
  // clear existing timer
  if(_ssTimer) clearInterval(_ssTimer.iv);
  _ssTimer = {groupId, left: restSecs, total: restSecs, nextSlot, iv:null};
  _ssTimer.iv = setInterval(()=>{
    _ssTimer.left--;
    // update timer display only (no full re-render)
    const grpEl = document.getElementById('ssg-'+groupId);
    if(grpEl){
      const disp = grpEl.querySelector('.ss-timer-display');
      const fill = grpEl.querySelector('.ss-timer-fill');
      if(disp) disp.textContent = Math.floor(_ssTimer.left/60)+':'+(String(_ssTimer.left%60).padStart(2,'0'));
      if(fill) fill.style.width = Math.round(_ssTimer.left/_ssTimer.total*100)+'%';
    }
    if(_ssTimer.left <= 0){
      clearInterval(_ssTimer.iv);
      _ssTimer = null;
      beep();
      renderSession(); // re-render to highlight next slot
    }
  }, 1000);
  renderSession();
}

function cancelSSTimer(){
  if(_ssTimer){ clearInterval(_ssTimer.iv); _ssTimer=null; }
  renderSession();
}

/* Retire la mention "RIR x-y" des notes (jargon que l'utilisateur ne veut pas voir). */
function cleanNote(note){
  if(!note) return '';
  return String(note).replace(/RIR\s*\d+(\s*[-–]\s*\d+)?\s*\.?\s*/gi,'').trim();
}

/* Donne le poids à vide de l'équipement d'un exercice + s'il s'agit de 2 haltères.
   Sert à convertir un poids de DISQUES saisi en POIDS TOTAL réel soulevé. */
function emptyWeightFor(ex){
  const inv = (typeof plateInv==='function') ? plateInv() : {barEZ:4.5,barStraight:10,barDumbbell:2.25};
  // Choix MANUEL prioritaire
  if(ex.equip){
    switch(ex.equip){
      case 'pc':       return { empty:0, two:false, kind:'pc' };
      case 'db1':      return { empty: inv.barDumbbell||2.25, two:false, kind:'db' };
      case 'db2':      return { empty: inv.barDumbbell||2.25, two:true,  kind:'db' };
      case 'ez':       return { empty: inv.barEZ||4.5, two:false, kind:'bar' };
      case 'straight': return { empty: inv.barStraight||10, two:false, kind:'bar' };
    }
  }
  // Sinon : déduction automatique depuis le nom
  const n = (ex.name||'').toLowerCase();
  const kind = (typeof plateGuessKind==='function') ? plateGuessKind(ex.name) : 'db';
  if(kind==='pc') return { empty:0, two:false, kind:'pc' };
  if(kind==='ez' || /barre/.test(n)){
    const isStraight = /olympique|droite|barre droite/.test(n);
    return { empty: isStraight ? (inv.barStraight||10) : (inv.barEZ||4.5), two:false, kind:'bar' };
  }
  const oneHand = /goblet|squat|hip thrust|soulevé|souleve|sdt|overhead|pull-?over|unilat|un bras|une main|concentr|gobelet/.test(n)
                  && !/haltères|halteres/.test(n);
  return { empty: inv.barDumbbell||2.25, two:!oneHand, kind:'db' };
}
/* Convertit un poids de disques (par main/barre) en total réel soulevé.
   Si le mode "par haltère" est activé, retourne le poids d'UN haltère (pas le total des 2). */
function discToTotal(ex, discKg){
  const e = emptyWeightFor(ex);
  if(e.kind==='pc') return discKg; // poids du corps : pas de barre
  const perSide = (discKg||0) + e.empty; // une main/barre = disques + à vide
  const perHandMode = localStorage.getItem('sbt-per-hand')==='1';
  if(e.two && !perHandMode) return Math.round(perSide*2*10)/10; // total des 2 haltères
  return Math.round(perSide*10)/10; // 1 haltère / barre / mode par-haltère
}

/* Convention : ex.weight = POIDS TOTAL à soulever (barre/haltère incluse).
   On calcule directement quels DISQUES mettre, par côté, sans parler de la
   barre à vide (l'app la connaît déjà). Affichage gros et clair. */
function realWeightInfo(ex){
  const w = ex.weight||0;
  if(w<=0) return null;
  const n = (ex.name||'').toLowerCase();
  const kind = plateGuessKind(ex.name);
  const inv = (typeof plateInv==='function') ? plateInv() : {discs:{},barEZ:4.5,barStraight:10,barDumbbell:2.25};

  // Résout les disques par côté pour un poids de disques donné, selon le stock dispo par côté
  function discsForSide(discKg, stockPerSide){
    if(typeof plateSolveStock==='function'){
      const sol = plateSolveStock(discKg, stockPerSide);
      return { list: sol.discs, leftover: sol.leftover };
    }
    return { list: [], leftover: discKg };
  }

  const eq = emptyWeightFor(ex);

  if(eq.kind==='pc'){ return { type:'pc', label:'Poids du corps' }; }

  if(eq.kind==='bar'){
    const barW = eq.empty;
    const lbl = (ex.equip==='straight' || /olympique|droite|barre droite/.test(n)) ? 'Barre droite' : 'Barre EZ';
    const discsTotal = Math.round((w - barW)*10)/10;
    if(discsTotal < 0) return { type:'bar', label:lbl, total:w, impossible:`${w}kg est en dessous du poids de la barre seule` };
    if(discsTotal < 0.01) return { type:'bar', label:lbl, total:w, none:true, real:barW };
    const perSide = discsTotal/2;
    const stockPerSide = {}; Object.keys(inv.discs).forEach(d=>{ stockPerSide[d]=Math.floor(inv.discs[d]/2); });
    const sol = discsForSide(perSide, stockPerSide);
    const sideKg = sol.list.reduce((a,b)=>a+b,0);
    const real = Math.round((barW + sideKg*2)*10)/10;
    return { type:'bar', label:lbl, total:w, side:sol.list, leftover:sol.leftover, real, adjusted: Math.abs(real-w)>0.01 };
  }

  // Haltères (1 ou 2 selon eq.two)
  const oneHand = !eq.two;
  const dbW = eq.empty;
  const discsTotal = Math.round((w - dbW)*10)/10; // disques sur UN haltère
  const lbl = oneHand ? '1 haltère' : '2 haltères';
  if(discsTotal < 0) return { type:'db', label:lbl, total:w, two:!oneHand, impossible:`${w}kg est en dessous du poids de l'haltère seul` };
  if(discsTotal < 0.01) return { type:'db', label:lbl, total:w, two:!oneHand, none:true, real:dbW, realTotal: oneHand?dbW:dbW*2 };
  const perSide = discsTotal/2; // 2 côtés du manche
  const stockPerSide = {}; Object.keys(inv.discs).forEach(d=>{ stockPerSide[d]=Math.floor(inv.discs[d]/2); });
  const sol = discsForSide(perSide, stockPerSide);
  const sideKg = sol.list.reduce((a,b)=>a+b,0);
  const realPerDB = Math.round((dbW + sideKg*2)*10)/10;
  const realTotal = oneHand ? realPerDB : Math.round(realPerDB*2*10)/10;
  return { type:'db', label:lbl, total:w, two:!oneHand, side:sol.list, leftover:sol.leftover, real:realPerDB, realTotal, adjusted: Math.abs(realPerDB-w)>0.01 };
}

function realWeightHTML(ex){
  const info = realWeightInfo(ex);
  if(!info) return '';
  const discChip = arr => (arr&&arr.length)
    ? arr.map(d=>`<span style="display:inline-block;background:var(--s3);border:1px solid var(--b2);border-radius:14px;padding:3px 10px;font-family:var(--mono);font-size:12px;font-weight:700;color:var(--t1);margin:2px">${d}kg</span>`).join('')
    : `<span style="font-family:var(--mono);font-size:12px;color:var(--t3)">à vide</span>`;
  const box = inner => `<div style="background:var(--s2);border:1px solid rgba(212,175,55,.3);border-radius:10px;padding:12px;margin-top:8px">${inner}</div>`;

  if(info.type==='pc'){
    return box(`<div style="font-size:12px;color:var(--t2)">🏋️ Au <b style="color:var(--t1)">poids du corps</b> — ajoute un lest si besoin.</div>`);
  }
  if(info.impossible){
    return box(`<div style="font-size:12px;color:var(--yellow)">⚠ ${info.impossible}.</div>`);
  }

  const head = `<div style="font-size:11px;font-weight:700;color:var(--gold);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px">🏋️ Quoi mettre pour ${info.total}kg</div>`;

  // Bandeau "poids réel soulevé" affiché en bas de l'encadré
  function realBanner(){
    const rt = (info.realTotal!=null ? info.realTotal : info.real);
    if(rt==null) return '';
    const adjustedTxt = info.adjusted
      ? `<div style="font-size:10px;color:var(--yellow);margin-top:3px">Ajusté au plus proche que tu peux charger (visé : ${info.total}kg)</div>`
      : '';
    const perHand = (info.type==='db' && info.two) ? ` <span style="font-size:10px;color:var(--t3)">(${info.real}kg par haltère)</span>` : '';
    return `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:10px;border-top:1px solid var(--b2)">
      <span style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Tu soulèves</span>
      <span style="font-family:var(--mono);font-size:20px;font-weight:700;color:var(--green)">${rt}kg</span>
    </div>${adjustedTxt}${perHand?`<div style="font-size:10px;color:var(--t3);text-align:right">${perHand}</div>`:''}`;
  }

  if(info.type==='bar'){
    if(info.none){
      return box(head + `<div style="font-size:13px;color:var(--t1)">La barre seule suffit — <b>aucun disque</b> à ajouter.</div>` + realBanner());
    }
    return box(head + `
      <div style="display:flex;align-items:center;gap:10px">
        <div style="font-size:11px;color:var(--t3);min-width:70px">Chaque<br>côté :</div>
        <div style="flex:1">${discChip(info.side)}</div>
      </div>
      <div style="font-size:11px;color:var(--t2);margin-top:8px">↑ Mets les <b>mêmes disques des deux côtés</b> de la barre.</div>
      ${realBanner()}`);
  }

  // Haltère(s)
  if(info.none){
    const txt = info.two
      ? `Tes <b>2 haltères à vide</b> suffisent — aucun disque.`
      : `L'<b>haltère à vide</b> suffit — aucun disque.`;
    return box(head + `<div style="font-size:13px;color:var(--t1)">${txt}</div>` + realBanner());
  }

  if(info.two){
    return box(head + `
      <div style="display:flex;gap:10px;margin-bottom:8px">
        <div style="flex:1;background:var(--s3);border:1px solid var(--b2);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:6px">Haltère A</div>
          <div style="font-size:10px;color:var(--t3);margin-bottom:3px">gauche</div>${discChip(info.side)}
          <div style="font-size:10px;color:var(--t3);margin:5px 0 3px">droite</div>${discChip(info.side)}
        </div>
        <div style="flex:1;background:var(--s3);border:1px solid var(--b2);border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:10px;color:var(--t3);text-transform:uppercase;margin-bottom:6px">Haltère B</div>
          <div style="font-size:10px;color:var(--t3);margin-bottom:3px">gauche</div>${discChip(info.side)}
          <div style="font-size:10px;color:var(--t3);margin:5px 0 3px">droite</div>${discChip(info.side)}
        </div>
      </div>
      <div style="font-size:11px;color:var(--t2)">↑ Les <b>2 haltères chargés pareil</b>, mêmes disques de chaque côté.</div>
      ${realBanner()}`);
  }
  // 1 haltère
  return box(head + `
    <div style="background:var(--s3);border:1px solid var(--b2);border-radius:8px;padding:10px;text-align:center">
      <div style="font-size:10px;color:var(--t3);margin-bottom:3px">côté gauche</div>${discChip(info.side)}
      <div style="font-size:10px;color:var(--t3);margin:5px 0 3px">côté droit</div>${discChip(info.side)}
    </div>
    <div style="font-size:11px;color:var(--t2);margin-top:8px">↑ Un seul haltère, <b>mêmes disques des deux côtés</b>.</div>
    ${realBanner()}`);
}

/* ── Visuel disques ÉDITABLE basé sur ce que l'utilisateur a mis sur chaque côté ──
   l.sides = { aL, aR, bL, bR } = poids de DISQUES par côté (en kg).
   Total soulevé = (somme disques d'un haltère + haltère à vide), ×2 si 2 haltères. */
function getSides(l){
  if(l && l.sides && typeof l.sides==='object') return l.sides;
  // Rétrocompat : si pas de détail, on répartit l.w (disques/côté) identiquement
  const d = (l && l.w) || 0;
  return { aL:d, aR:d, bL:d, bR:d };
}
function sidesToReal(ex, sides){
  const eq = emptyWeightFor(ex);
  if(eq.kind==='pc') return { real:0, perHand:0, two:false, kind:'pc' };
  const aDisc = (sides.aL||0) + (sides.aR||0);          // disques sur haltère A
  const perHandA = Math.round((aDisc + eq.empty)*10)/10; // A complet
  let real, two = eq.two;
  if(eq.kind==='bar'){
    // une barre : "2 côtés" = aL/aR, total = disques + barre
    real = Math.round((aDisc + eq.empty)*10)/10;
    return { real, perHand:real, two:false, kind:'bar' };
  }
  if(eq.two){
    const bDisc = (sides.bL||0) + (sides.bR||0);
    const perHandB = Math.round((bDisc + eq.empty)*10)/10;
    real = Math.round((perHandA + perHandB)*10)/10;
    return { real, perHand:perHandA, perHandB, two:true, kind:'db' };
  }
  return { real:perHandA, perHand:perHandA, two:false, kind:'db' };
}
function loggedDiscHTML(ex, l, di, ei, li){
  const eq = emptyWeightFor(ex);
  if(eq.kind==='pc') return '';
  const sides = getSides(l);
  // n'affiche rien si tout est à 0
  const anyW = (sides.aL||0)+(sides.aR||0)+(sides.bL||0)+(sides.bR||0) > 0;
  if(!anyW) return '';
  const r = sidesToReal(ex, sides);
  const perHandMode = localStorage.getItem('sbt-per-hand')==='1';
  const realShown = (eq.two && !perHandMode) ? r.real : r.perHand;
  const suffix = (eq.two && !perHandMode) ? 'kg total' : (eq.two ? 'kg/halt.' : 'kg');

  const sideInput = (hand, side, val) =>
    `<input type="number" inputmode="decimal" min="0" step="0.25" value="${val||''}" placeholder="0"
       onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}"
       onchange="setSide(${di},${ei},${li},'${hand}','${side}',this.value)"
       style="width:62px;text-align:center;background:var(--s4);border:1px solid var(--b2);border-radius:14px;padding:4px 6px;font-family:var(--mono);font-size:12px;font-weight:700;color:var(--t1)"/>`;

  const box = inner => `<div style="background:var(--s2);border:1px solid rgba(74,222,128,.28);border-radius:10px;padding:11px;margin:6px 0 2px">${inner}</div>`;
  const head = `<div style="font-size:10px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px">✓ Ce que tu as mis <span style="color:var(--t3);font-weight:400;text-transform:none">· modifie chaque côté</span></div>`;
  const banner = `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:9px;padding-top:9px;border-top:1px solid var(--b2)">
      <span style="font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.05em">Soulevé</span>
      <span style="font-family:var(--mono);font-size:17px;font-weight:700;color:var(--green)">${realShown}<span style="font-size:9px;font-weight:400;color:var(--t3)">${suffix}</span></span>
    </div>`;

  if(eq.kind==='bar'){
    return box(head + `
      <div style="display:flex;align-items:center;justify-content:center;gap:16px;margin-top:6px">
        <div style="text-align:center"><div style="font-size:9px;color:var(--t3);margin-bottom:3px">gauche</div>${sideInput('a','L',sides.aL)}</div>
        <div style="text-align:center"><div style="font-size:9px;color:var(--t3);margin-bottom:3px">droite</div>${sideInput('a','R',sides.aR)}</div>
      </div>
      <div style="font-size:10px;color:var(--t3);text-align:center;margin-top:6px">disques par côté de la barre</div>${banner}`);
  }
  if(eq.two){
    return box(head + `
      <div style="display:flex;gap:8px">
        <div style="flex:1;background:var(--s3);border:1px solid var(--b2);border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:9px;color:var(--t3);text-transform:uppercase;margin-bottom:6px">Haltère A</div>
          <div style="font-size:9px;color:var(--t3);margin-bottom:3px">gauche</div>${sideInput('a','L',sides.aL)}
          <div style="font-size:9px;color:var(--t3);margin:6px 0 3px">droite</div>${sideInput('a','R',sides.aR)}
        </div>
        <div style="flex:1;background:var(--s3);border:1px solid var(--b2);border-radius:8px;padding:8px;text-align:center">
          <div style="font-size:9px;color:var(--t3);text-transform:uppercase;margin-bottom:6px">Haltère B</div>
          <div style="font-size:9px;color:var(--t3);margin-bottom:3px">gauche</div>${sideInput('b','L',sides.bL)}
          <div style="font-size:9px;color:var(--t3);margin:6px 0 3px">droite</div>${sideInput('b','R',sides.bR)}
        </div>
      </div>${banner}`);
  }
  // 1 haltère
  return box(head + `
    <div style="background:var(--s3);border:1px solid var(--b2);border-radius:8px;padding:8px;text-align:center">
      <div style="font-size:9px;color:var(--t3);margin-bottom:3px">côté gauche</div>${sideInput('a','L',sides.aL)}
      <div style="font-size:9px;color:var(--t3);margin:6px 0 3px">côté droit</div>${sideInput('a','R',sides.aR)}
    </div>${banner}`);
}

/* Enregistre le poids de disques d'un côté précis (gauche/droite d'un haltère). */
function setSide(di,ei,li,hand,side,val){
  const k=dateLogKey(di,ei,todayKey());
  ensureTodayLogs(di,ei);
  if(!(S.logs[k] && S.logs[k][li])) return;
  const l = S.logs[k][li];
  if(!l.sides || typeof l.sides!=='object') l.sides = getSides(l);
  const key = hand + side.toUpperCase(); // ex: 'aL'
  l.sides[key] = parseFloat(val)||0;
  // Synchronise l.w = disques par côté (moyenne d'un côté de l'haltère A) pour la progression/PR
  const ex = S.week[di] && S.week[di].exercises[ei];
  const perSideAvg = ((l.sides.aL||0)+(l.sides.aR||0))/2;
  l.w = Math.round(perSideAvg*10)/10;
  saveState();
  expandA = ei;
  renderSession();
}

/* ── PLANNED ROW ── */
function buildPlanRow(ex,ei){
  const open=expandP===ei;
  const amrap=!!ex.amrap;
  const repsLabel=amrap?(ex.reps>0?ex.reps+'+ rép.':'AMRAP'):(ex.repRange?ex.repRange:ex.reps+' rép.');
  const rows=Array.from({length:ex.sets},(_,si)=>
    `<div class="plan-row"><span class="plan-si">${si+1}</span>
    <span class="plan-val">${ex.weight?ex.weight+'kg ':''} ${repsLabel}</span>${amrap?'<span class="amrap-badge" style="margin-left:6px">AMRAP</span>':''}</div>`
  ).join('');
  const det=open?`<div class="plan-det open">${rows}
    ${realWeightHTML(ex)}
    ${ex.notes?`<div class="plan-note">${cleanNote(ex.notes)}</div>`:''}
    ${ex.rest?`<div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-top:6px">Repos : ${ex.rest}s</div>`:''}
  </div>`:'';
  const metaReps=amrap?(ex.reps>0?ex.reps+'+':'AMRAP'):(ex.repRange?ex.repRange.replace(/ reps?.*/,'').replace('-','‑'):ex.reps);
  return`<div class="exo-item" draggable="true" data-ei="${ei}"
    ondragstart="onExoDragStart(event,${ei})"
    ondragover="onExoDragOver(event,${ei})"
    ondragleave="onExoDragLeave(event)"
    ondrop="onExoDrop(event,${ei})"
    ondragend="onExoDragEnd(event)">
    <div class="exo-hd${open?' open':''}" onclick="togP(${ei})" style="grid-template-columns:18px 22px 1fr auto 16px">
      <div class="drag-handle" onclick="event.stopPropagation()" draggable="false" title="Glisser pour réorganiser"
        ontouchstart="onExoTouchStart(event,${ei})" ontouchmove="onExoTouchMove(event)" ontouchend="onExoTouchEnd(event)">
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><circle cx="3" cy="2.5" r="1.2"/><circle cx="7" cy="2.5" r="1.2"/><circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/><circle cx="3" cy="11.5" r="1.2"/><circle cx="7" cy="11.5" r="1.2"/></svg>
      </div>
      <div class="exo-idx">${ei+1}</div><div class="exo-nm">${ex.name}</div>
      <div class="exo-meta">${ex.sets}×${metaReps}${ex.weight?' @ '+ex.weight+'kg':''}${amrap?' <span class="amrap-badge">AMRAP</span>':''}</div>
      <div class="exo-chev">▾</div>
    </div>${det}
  </div>`;
}

/* ── ACTUAL ROW ── */
function buildActRow(ex,ei,isActive=false){
  const open=expandA===ei;
  const logs=getLogs(curDay,ei);
  const diffs=computeDiff(ex,logs);
  const det=open?buildActDetail(ex,ei,logs,diffs):'';

  // Status : basé UNIQUEMENT sur les séries faites AUJOURD'HUI (pas l'historique affiché en repère).
  const todayLogs = (typeof getTodayLogs==='function') ? getTodayLogs(curDay,ei) : logs;
  const validLogs=todayLogs.filter(l=>(l.w||0)>0||(l.r||0)>0).length;
  const totalSets=ex.sets||0;
  let statusCls='', statusTxt='';
  if(validLogs>=totalSets && totalSets>0){ statusCls='done'; statusTxt='✓ Fait'; }
  else if(validLogs>0){ statusCls='partial'; statusTxt=`${validLogs}/${totalSets}`; }
  else { statusCls=''; statusTxt='Marquer fait'; }
  const statusBtn=`<button class="exo-status ${statusCls}" onclick="event.stopPropagation();quickDoneExo(${curDay},${ei})" title="${statusCls==='done'?'Annuler':'Valider toutes les séries au poids prévu'}"><span class="dot"></span>${statusTxt}</button>`;

  // ── Last session hint (toujours visible) ──
  const today=todayKey();
  const allEntries=getAllLogs(curDay,ei);
  const prevEntry=allEntries.filter(([k])=>!k.endsWith('_'+today)).slice(-1)[0];
  let hintHTML='';
  if(prevEntry){
    const [pk,pl]=prevEntry;
    const prevDate=pk.split('_').slice(2).join('_');
    const parts=prevDate.split('-');
    const dateFmt=parts[2]+'/'+parts[1];
    const maxW=pl.reduce((a,l)=>Math.max(a,l.w||0),0);
    const maxR=pl.reduce((a,l)=>Math.max(a,l.r||0),0);
    const valStr=maxW?`${maxW}kg \xd7 ${maxR}`:`${maxR} r\xe9p.`;
    hintHTML=`<div class="exo-last-hint"><span>\u21a9</span><span class="elh-val">${valStr}</span><span class="elh-date">${dateFmt}</span></div>`;
  }

  return`<div class="exo-item">
    <div class="exo-hd${open?' open':''}" onclick="togA(${ei})">
      <div class="exo-idx">${ei+1}</div>
      <div class="exo-nm" style="display:flex;flex-direction:column;justify-content:center;min-width:0;overflow:hidden">
        <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ex.name}</span>
        ${hintHTML}
      </div>
      <div class="exo-meta">${statusBtn}${isActive?'<span class="ss-current-badge">EN COURS</span>':''}</div><div class="exo-chev">▾</div>
    </div>${det}
  </div>`;
}

function buildActDetail(ex,ei,logs,diffs){
  const di=curDay;
  const best=getBest(di,ei);
  const today=todayKey();
  // Les séries ÉDITABLES = celles d'aujourd'hui uniquement (vides en début de séance).
  // L'historique reste affiché comme repère "dernière fois" plus bas.
  logs = (typeof getTodayLogs==='function') ? getTodayLogs(di,ei) : logs;

  // ── Previous session data ──
  const allEntries=getAllLogs(di,ei);
  const prevEntry=allEntries.filter(([k])=>!k.endsWith('_'+today)).slice(-1)[0];
  let lastSessHTML='';
  let prevLogs=[];
  if(prevEntry){
    const [pk,pl]=prevEntry;
    prevLogs=pl;
    const prevDate=pk.split('_').slice(2).join('_');
    const parts=prevDate.split('-');
    const dateFmt=parts[2]+'/'+parts[1];
    const maxW=pl.reduce((a,l)=>Math.max(a,l.w||0),0);
    const maxR=pl.reduce((a,l)=>Math.max(a,l.r||0),0);
    const curMaxW=logs.reduce((a,l)=>Math.max(a,l.w||0),0);
    let delta='';
    if(logs.length&&curMaxW&&maxW){
      const d=+(curMaxW-maxW).toFixed(1);
      delta=d>0?`<span class="lsd-up">↑ +${d}kg</span>`:d<0?`<span class="lsd-dn">↓ ${d}kg</span>`:`<span class="lsd-eq">= même poids</span>`;
    }
    lastSessHTML=`<div class="last-sess">
      <span style="color:var(--t4)">Dernière fois (${dateFmt}) :</span>
      <span class="lsd-val">${maxW?maxW+'kg':'—'} × ${maxR}</span>
      ${delta}
      <button class="btn btn-ghost btn-xs" style="margin-left:auto" onclick="autoFillLast(${di},${ei})">↩ Auto-fill</button>
    </div>`;
  }

  const amrap=!!ex.amrap;

  // ── Progressive overload suggestion ──
  let overloadHTML='';
  if(prevLogs.length&&!logs.length){
    const maxW=prevLogs.reduce((a,l)=>Math.max(a,l.w||0),0);
    const maxR=prevLogs.reduce((a,l)=>Math.max(a,l.r||0),0);
    const prevFmt=maxW?`${maxW}kg × ${maxR}`:`${maxR} rép.`;

    if(amrap){
      // AMRAP: show target reps to beat + optional weight increase
      const target=maxR>0?maxR+1:'max';
      const weightLine=maxW>0?`<span style="color:var(--t3)"> ou </span><span style="color:var(--blue)">${(maxW+2.5).toFixed(1)}kg × max</span>`:'';
      overloadHTML=`<div class="ob-amrap-wrap">
        <div style="font-size:18px">🎯</div>
        <div style="flex:1">
          <div style="font-family:var(--mono);font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px">Objectif AMRAP</div>
          <div class="ob-amrap-target">Vise ${target} rép.${weightLine}</div>
          <div class="ob-amrap-sub">PR à battre : ${prevFmt}</div>
        </div>
      </div>`;
    } else {
      const range = parseRepRange(ex);
      const inc = getIncrement(maxW);
      const ex_sets=ex.sets||3;
      const atTopOfRange = maxR >= range.max;       // haut de fourchette atteint la dernière fois
      const isBodyweight = !(maxW>0);

      let card1='', card2='';

      if(isBodyweight){
        // Poids du corps : on ne joue que sur les reps
        const sugR = maxR>0 ? maxR+1 : null;
        card1 = sugR!=null?`
          <div class="ob-card" onclick="applyOverload(${di},${ei},0,${sugR})" title="Fixe l'objectif à ${sugR} reps">
            <div class="ob-card-tag">${atTopOfRange?'🎯 Objectif':'+ Répétition'}</div>
            <div class="ob-card-main">× ${sugR}</div>
            <div class="ob-card-delta">↑ +1 rép. (vise ${range.min}-${range.max})</div>
            <div class="ob-card-prev">avant : ${prevFmt}</div>
            <div class="ob-card-arrow">→</div>
          </div>`:'';
      } else if(atTopOfRange){
        // ★ Haut de fourchette atteint → MONTER LE POIDS, redescendre en bas de fourchette
        const newW = +(maxW + inc).toFixed(2);
        card1 = `
          <div class="ob-card ob-card-hot" onclick="applyOverload(${di},${ei},${newW},${range.min})" title="Fixe l'objectif : ${newW}kg × ${range.min}">
            <div class="ob-card-tag">⭐ Monte le poids</div>
            <div class="ob-card-main">${newW}<span style="font-size:11px;font-weight:400;color:var(--t3)">kg</span> × ${range.min}</div>
            <div class="ob-card-delta">↑ +${inc} kg · redescends à ${range.min} rép.</div>
            <div class="ob-card-prev">tu as fini à ${prevFmt} (haut de fourchette ✓)</div>
            <div class="ob-card-arrow">→</div>
          </div>`;
        // alternative : rester au même poids et pousser encore les reps
        card2 = `
          <div class="ob-card" onclick="applyOverload(${di},${ei},${maxW},${maxR+1})" title="Fixe l'objectif : ${maxW}kg × ${maxR+1}">
            <div class="ob-card-tag">+ Répétition</div>
            <div class="ob-card-main">${maxW}<span style="font-size:11px;font-weight:400;color:var(--t3)">kg</span> × ${maxR+1}</div>
            <div class="ob-card-delta">↑ rester léger encore 1 séance</div>
            <div class="ob-card-prev">avant : ${prevFmt}</div>
            <div class="ob-card-arrow">→</div>
          </div>`;
      } else {
        // Pas encore en haut de fourchette → pousser les reps vers le haut
        const sugR = maxR+1;
        card1 = `
          <div class="ob-card" onclick="applyOverload(${di},${ei},${maxW},${sugR})" title="Fixe l'objectif : ${maxW}kg × ${sugR}">
            <div class="ob-card-tag">+ Répétition</div>
            <div class="ob-card-main">${maxW}<span style="font-size:11px;font-weight:400;color:var(--t3)">kg</span> × ${sugR}</div>
            <div class="ob-card-delta">↑ +1 rép. (vise ${range.max} avant de monter)</div>
            <div class="ob-card-prev">avant : ${prevFmt}</div>
            <div class="ob-card-arrow">→</div>
          </div>`;
        // alternative : garder le même et refaire (consolider)
        card2 = `
          <div class="ob-card" onclick="applyOverload(${di},${ei},${maxW},${maxR})" title="Fixe l'objectif : ${maxW}kg × ${maxR}">
            <div class="ob-card-tag">= Consolider</div>
            <div class="ob-card-main">${maxW}<span style="font-size:11px;font-weight:400;color:var(--t3)">kg</span> × ${maxR}</div>
            <div class="ob-card-delta">refais la même perf proprement</div>
            <div class="ob-card-prev">avant : ${prevFmt}</div>
            <div class="ob-card-arrow">→</div>
          </div>`;
      }

      if(card1||card2){
        const hint = isBodyweight
          ? `vise ${range.min}-${range.max} reps, puis ajoute du lest`
          : (atTopOfRange ? `tu as atteint ${range.max} reps → il est temps de charger` : `pousse jusqu'à ${range.max} reps avant de monter`);
        overloadHTML=`<div class="overload-wrap">
          <div class="overload-label">📈 Surcharge progressive</div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-bottom:7px">${hint}</div>
          <div class="overload-cards">${card1}${card2}</div>
        </div>`;
      }
    }
  }

  const eqInfo = emptyWeightFor(ex);
  const setRows=logs.map((l,li)=>{
    const vol=(l.w||0)*(l.r||0)||(l.r||0);
    const isPR=best&&(l.w||0)===(best.w||0)&&(l.r||0)===(best.r||0)&&vol>0;
    const beat=ex.weight&&(l.w||0)>ex.weight;
    const rpe=l.rpe||0;
    const rpeCls=rpe>=9?'rpe-high':rpe>=7?'rpe-mid':'rpe-low';
    // Poids réel = disques saisis + barre/haltère à vide. Mode "par haltère" ou "total des 2".
    const perHandMode = localStorage.getItem('sbt-per-hand')==='1';
    const totalReal = (l.w||0)>0 ? discToTotal(ex, l.w) : 0;
    const realSuffix = (eqInfo.two && !perHandMode) ? 'kg total' : (eqInfo.two ? 'kg/halt.' : 'kg');
    const totalTxt = totalReal>0 ? `<div class="act-total" title="Poids réel soulevé">→ ${totalReal}<span style="font-size:8px;font-weight:400">${realSuffix}</span></div>` : (eqInfo.kind!=='pc' && eqInfo.empty>0 ? `<div class="act-total" style="opacity:.4">+${eqInfo.empty}</div>` : '');
    const sidesSum = (function(){ const s=getSides(l); return (s.aL||0)+(s.aR||0)+(s.bL||0)+(s.bR||0); })();
    const discVisual = sidesSum>0 ? `<div class="logged-disc">${loggedDiscHTML(ex, l, di, ei, li)}</div>` : '';
    return`<div class="act-set-wrap">
      <div class="act-row">
      <div class="act-si">${li+1}${amrap?'<span class="amrap-badge" style="margin-left:2px;font-size:7px">MX</span>':''}</div>
      <input class="inp-sm${beat?' beat':''}" type="number" inputmode="decimal" value="${l.w||''}" min="0" step="0.5" placeholder="disq."
        onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}"
        onchange="logChange(${di},${ei},${li},'w',this.value)"/>
      <span style="font-family:var(--mono);font-size:10px;color:var(--t3)">×</span>
      <input class="inp-sm" type="number" inputmode="numeric" value="${l.r||''}" min="1" placeholder="${ex.reps?ex.reps:(amrap?'max':'rép')}"
        onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur();}"
        onchange="logChange(${di},${ei},${li},'r',this.value)"/>
      <select class="rpe-sel" onchange="logChange(${di},${ei},${li},'rpe',this.value)">
        <option value="0"${!rpe?' selected':''}>RPE</option>
        ${[6,6.5,7,7.5,8,8.5,9,9.5,10].map(v=>`<option value="${v}"${rpe==v?' selected':''}>${v}</option>`).join('')}
      </select>
      ${totalTxt}
      <div class="act-pr">${isPR?`<span class="act-pr-anim">PR</span>`:''}</div>
      <button class="btn btn-danger btn-xs" onclick="removeLog(${di},${ei},${li})">✕</button>
      </div>
      ${discVisual}
    </div>`;
  }).join('');

  // (Système 1RM retiré)
  let ormHTML='';

  // ── Video demo button ──
  const videoId=ex.videoUrl?extractYtId(ex.videoUrl):'';
  const videoBtn=videoId?`<button class="btn btn-ghost btn-sm" onclick="openVidModal('${videoId}')">▶ Voir le mouvement</button>`:'';

  const diffHTML=diffs.map(d=>{
    const cls=d.dir>0?'chip-up':d.dir<0?'chip-dn':'chip-eq';
    return`<span class="chip ${cls}">${d.icon} ${d.label}</span>`;
  }).join('');
  const media=(ex.media||[]).map(m=>
    `<div class="m-box" onclick="openMM('${m.url}','${m.type}')">${m.type==='video'?`<video src="${m.url}" muted></video>`:`<img src="${m.url}"/>`}</div>`
  ).join('');

  // ── Déload automatique ──
  let deloadHTML = '';
  const deloadInfo = checkDeload(di, ei);
  if(deloadInfo){
    deloadHTML = `<div style="margin:8px 0;padding:10px 12px;background:rgba(251,191,36,.07);border:1px solid rgba(251,191,36,.25);border-radius:var(--r);display:flex;align-items:center;gap:10px">
      <div style="font-size:20px">⚠️</div>
      <div style="flex:1">
        <div style="font-size:12px;font-weight:600;color:var(--yellow);margin-bottom:2px">Stagnation détectée — 3 semaines sans progrès</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--t2)">Déload suggéré : <b style="color:var(--t1)">${deloadInfo.deloadW}kg</b> (−10% de ${deloadInfo.currentW}kg)</div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-top:2px">1 semaine à −10% puis reprendre la progression</div>
      </div>
      <button onclick="applyOverload(${di},${ei},${deloadInfo.deloadW},null)" style="font-family:var(--mono);font-size:9px;background:rgba(251,191,36,.15);border:1px solid rgba(251,191,36,.3);color:var(--yellow);border-radius:var(--r);padding:5px 9px;cursor:pointer;white-space:nowrap">Appliquer</button>
    </div>`;
  }

  // (Mini graphe 1RM retiré)
  let miniChartHTML = '';

  return`<div class="act-det open">
    ${lastSessHTML}
    ${deloadHTML}
    ${miniChartHTML}
    ${overloadHTML}
    ${overloadHTML?helpBubble('overload'):''}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:6px;flex-wrap:wrap">
      <div style="flex:1"></div>
      <button class="btn btn-green btn-sm" onclick="copyPlanned(${di},${ei})">⬇ Copier le prévu</button>
    </div>
    ${realWeightHTML(ex)}
    ${helpBubble('series')}
    <div>${setRows}</div>
    ${setRows?helpBubble('rpe'):''}
    <button class="btn btn-ghost btn-sm" style="margin-top:6px" onclick="addLog(${di},${ei})">+ Série</button>
    ${diffs.length?`<div class="diff-row">${diffHTML}</div>`:''}
    ${ormHTML}
    <div style="margin-top:10px">
      <div class="lbl" style="margin-bottom:6px">Médias</div>
      <div class="media-strip">${media}<label class="m-add">+<input type="file" accept="image/*,video/*" class="file-in" onchange="addMedia(${di},${ei},this)"/></label></div>
    </div>
    <div class="rest-row">
      <div class="rest-lbl">Repos</div>
      <select class="rest-sel" id="rsel-${di}-${ei}">
        ${[60,90,120,150,180,300].map(v=>`<option value="${v}"${(ex.rest||120)==v?' selected':''}>${v<60?v+'s':Math.floor(v/60)+'m'+(v%60?'30':'')}</option>`).join('')}
      </select>
      <button class="btn btn-sm" onclick="startTimer(parseInt(document.getElementById('rsel-${di}-${ei}').value),'${ex.name.replace(/'/g,"\\'")}')">Démarrer</button>
    </div>
  </div>`;
}

function togP(ei){
  const wasOpen = expandP === ei;
  if(!wasOpen){
    // closing previous if any — animate out
    const prev = document.querySelector('#sv .plan-det.open');
    if(prev){ prev.style.animation='slideDown .15s reverse forwards'; setTimeout(()=>{ expandP=ei; renderSession(); }, 120); return; }
  }
  expandP=expandP===ei?-1:ei; renderSession();
}
function togA(ei){
  const wasOpen = expandA === ei;
  if(!wasOpen){
    const prev = document.querySelector('#sv .act-det.open');
    if(prev){ prev.style.animation='slideDown .15s reverse forwards'; setTimeout(()=>{ expandA=ei; renderSession(); }, 120); return; }
  }
  expandA=expandA===ei?-1:ei; renderSession();
}

/* ── DRAG & DROP — exercise reorder in session view ── */
let _dragSrcEi = null;
let _touchDragEi = null, _touchClone = null, _touchLastTarget = null;

function onExoDragStart(e, ei){
  _dragSrcEi = ei;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', ei);
  // slight delay so the ghost image renders before we add the class
  setTimeout(()=>{ const el=e.currentTarget; if(el) el.classList.add('dragging'); }, 0);
}

function onExoDragOver(e, ei){
  if(_dragSrcEi === null || _dragSrcEi === ei) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  // highlight drop target
  document.querySelectorAll('#sv .exo-item').forEach(el=>el.classList.remove('drag-over'));
  e.currentTarget.classList.add('drag-over');
}

function onExoDragLeave(e){
  // only clear if we're actually leaving the item (not a child)
  if(!e.currentTarget.contains(e.relatedTarget)){
    e.currentTarget.classList.remove('drag-over');
  }
}

function onExoDrop(e, targetEi){
  e.preventDefault();
  document.querySelectorAll('#sv .exo-item').forEach(el=>el.classList.remove('drag-over','dragging'));
  if(_dragSrcEi === null || _dragSrcEi === targetEi){ _dragSrcEi=null; return; }

  // Reorder exercises array
  const exos = S.week[curDay].exercises;
  const moved = exos.splice(_dragSrcEi, 1)[0];
  exos.splice(targetEi, 0, moved);

  // Reorder logs keys to match new indices
  // Collect all log keys for curDay, remap indices
  const today = todayKey();
  const logsToRemap = {};
  const allKeys = Object.keys(S.logs).filter(k => k.startsWith(curDay+'_'));
  allKeys.forEach(k => {
    const parts = k.split('_');
    const ei = parseInt(parts[1]);
    if(!logsToRemap[ei]) logsToRemap[ei] = {};
    const dateStr = parts.slice(2).join('_');
    logsToRemap[ei][dateStr] = S.logs[k];
    delete S.logs[k];
  });
  // Build a mapping: old index → new index
  const oldToNew = {};
  // We inserted `moved` (was at _dragSrcEi) at targetEi
  // Reconstruct the full permutation
  const n = exos.length;
  const original = Array.from({length:n},(_,i)=>i);
  // The new exercises array was: remove _dragSrcEi, insert at targetEi
  // So new[i] came from original position perm[i]
  const perm = [...original];
  const m = perm.splice(_dragSrcEi, 1)[0];
  perm.splice(targetEi, 0, m);
  // perm[newIdx] = oldIdx  →  we need oldIdx → newIdx
  perm.forEach((oldIdx, newIdx) => { oldToNew[oldIdx] = newIdx; });

  Object.entries(logsToRemap).forEach(([oldEi, dates]) => {
    const newEi = oldToNew[parseInt(oldEi)];
    if(newEi === undefined) return;
    Object.entries(dates).forEach(([dateStr, val]) => {
      S.logs[`${curDay}_${newEi}_${dateStr}`] = val;
    });
  });

  _dragSrcEi = null;
  expandP = -1; expandA = -1;
  saveState();
  renderSession();
  showToast('Exercice déplacé ✓');
}

function onExoDragEnd(e){
  document.querySelectorAll('#sv .exo-item').forEach(el=>el.classList.remove('dragging','drag-over'));
  _dragSrcEi = null;
}
/* ── TOUCH DRAG (mobile) ── */
function onExoTouchStart(e, ei){
  e.stopPropagation();
  _touchDragEi = ei;
  const item = e.currentTarget.closest('.exo-item');
  if(!item) return;
  // Create visual clone
  _touchClone = item.cloneNode(true);
  _touchClone.style.cssText = 'position:fixed;z-index:9999;opacity:.85;pointer-events:none;width:'+item.offsetWidth+'px;background:var(--s3);border:1px solid var(--b2);border-radius:8px;';
  document.body.appendChild(_touchClone);
  const t = e.touches[0];
  _touchClone.style.left = (t.clientX - item.offsetWidth/2) + 'px';
  _touchClone.style.top  = (t.clientY - 20) + 'px';
  item.style.opacity = '0.3';
  haptic && haptic(20);
}

function onExoTouchMove(e){
  if(_touchDragEi === null || !_touchClone) return;
  e.preventDefault();
  const t = e.touches[0];
  _touchClone.style.left = (t.clientX - parseInt(_touchClone.style.width)/2) + 'px';
  _touchClone.style.top  = (t.clientY - 20) + 'px';
  // Find target under finger
  _touchClone.style.display = 'none';
  const under = document.elementFromPoint(t.clientX, t.clientY);
  _touchClone.style.display = '';
  const targetItem = under ? under.closest('.exo-item') : null;
  document.querySelectorAll('#sv .exo-item').forEach(el=>el.classList.remove('drag-over'));
  if(targetItem){
    const targetEi = parseInt(targetItem.dataset.ei);
    if(!isNaN(targetEi) && targetEi !== _touchDragEi){
      targetItem.classList.add('drag-over');
      _touchLastTarget = targetEi;
    } else { _touchLastTarget = null; }
  }
}

function onExoTouchEnd(e){
  if(_touchDragEi === null) return;
  if(_touchClone){ _touchClone.remove(); _touchClone = null; }
  document.querySelectorAll('#sv .exo-item').forEach(el=>{
    el.classList.remove('drag-over');
    el.style.opacity = '';
  });
  if(_touchLastTarget !== null && _touchLastTarget !== _touchDragEi){
    const fakeE = { preventDefault:()=>{} };
    const src = _touchDragEi;
    _dragSrcEi = src;
    onExoDrop(fakeE, _touchLastTarget);
  }
  _touchDragEi = null; _touchLastTarget = null;
}



/* ── DÉLOAD AUTOMATIQUE ── */
function checkDeload(di, ei){
  // Récupère toutes les sessions loggées pour cet exercice
  const allEntries = getAllLogs(di, ei);
  if(allEntries.length < 3) return null; // pas assez d'historique

  // Grouper par semaine ISO
  function isoWeek(dateStr){
    const d = new Date(dateStr+'T00:00:00');
    const jan4 = new Date(d.getFullYear(),0,4);
    return d.getFullYear()+'-W'+String(Math.ceil(((d-jan4)/86400000+jan4.getDay()+1)/7)).padStart(2,'0');
  }

  const byWeek = {};
  allEntries.forEach(([k, logs]) => {
    const dateStr = k.split('_').slice(2).join('_');
    const wk = isoWeek(dateStr);
    if(!byWeek[wk]) byWeek[wk] = [];
    logs.forEach(l => byWeek[wk].push(l));
  });

  const weeks = Object.keys(byWeek).sort();
  if(weeks.length < 3) return null;

  const last3 = weeks.slice(-3);
  const maxWeights = last3.map(wk => byWeek[wk].reduce((a,l)=>Math.max(a,l.w||0),0));
  const maxVols    = last3.map(wk => byWeek[wk].reduce((a,l)=>Math.max(a,(l.w||0)*(l.r||0)||(l.r||0)),0));

  // Stagnation si ni le poids ni le volume n'ont progressé sur 3 semaines
  const weightStag = maxWeights[2] <= maxWeights[0] && maxWeights[2] <= maxWeights[1];
  const volStag    = maxVols[2]    <= maxVols[0]    && maxVols[2]    <= maxVols[1];

  if(weightStag && volStag && maxWeights[2] > 0){
    return {
      currentW: maxWeights[2],
      deloadW:  Math.round(maxWeights[2] * 0.9 * 2) / 2, // -10%, arrondi à 0.5
      weeks: last3
    };
  }
  return null;
}

/* ── COPY PLANNED → ACTUAL ── */
function copyPlanned(di,ei){
  const ex=S.week[di].exercises[ei];
  if(!ex) return;
  const k=dateLogKey(di,ei,todayKey());
  const sets=Array.from({length:ex.sets},()=>({w:ex.weight||0,r:ex.amrap?0:(ex.reps||0),date:todayKey()}));
  S.logs[k]=sets;
  saveState(); expandA=ei; renderSession();
  showToast('Prévu copié dans Réalisé');
}

/* ── AUTO-FILL FROM LAST SESSION ── */
function autoFillLast(di,ei){
  const today=todayKey();
  const allEntries=getAllLogs(di,ei);
  const prevEntry=allEntries.filter(([k])=>!k.endsWith('_'+today)).slice(-1)[0];
  if(!prevEntry){showToast('Aucune session précédente');return;}
  const [,prevLogs]=prevEntry;
  const k=dateLogKey(di,ei,today);
  S.logs[k]=prevLogs.map(l=>({...l,date:today}));
  saveState(); expandA=ei; renderSession();
  showToast('Dernière session copiée ✓');
}

/* ── PROGRESSIVE OVERLOAD APPLY ── */
/* ── Helpers surcharge progressive intelligente ── */
// Parse "8-12 reps", "10-12 reps/côté", "15-20 reps" → {min, max}
function parseRepRange(ex){
  const rr = ex && ex.repRange ? String(ex.repRange) : '';
  const m = rr.match(/(\d+)\s*[-–]\s*(\d+)/);
  if(m) return {min:+m[1], max:+m[2]};
  // fallback : autour des reps prévues
  const base = ex && ex.reps ? +ex.reps : 10;
  return {min:Math.max(1,base-2), max:base+2};
}
// Incrément de charge adapté au poids actuel (petits exos = petit pas)
function getIncrement(curW){
  if(!curW || curW <= 0) return 2.5;
  if(curW < 6)  return 1.25;   // isolations légères (élévations, écartés…)
  if(curW < 15) return 2.5;
  return 5;                     // gros compounds
}

/* ════════════════════════════════════════════════
   AIDE CONTEXTUELLE DÉBUTANT — bulles explicatives
   Apparaissent jusqu'à ce que l'utilisateur clique "Compris".
   ════════════════════════════════════════════════ */
const HELP_CONTENT = {
  rpe: {
    icon:'💪', title:'C\'est quoi le RPE ?',
    body:`Le <b>RPE</b> (effort perçu) mesure à quel point une série t'a coûté, de 6 à 10.<br><br>
      Pose-toi la question : <b>« j'aurais pu faire combien de reps de plus ? »</b><br>
      • <b>RPE 10</b> = échec, 0 rep en réserve<br>
      • <b>RPE 9</b> = 1 rep en réserve<br>
      • <b>RPE 8</b> = 2 reps en réserve<br>
      • <b>RPE 7</b> = 3 reps en réserve<br><br>
      Pour prendre du muscle, vise <b>RPE 7-9</b> (t'arrêter 1 à 3 reps avant l'échec). C'est optionnel : tu peux laisser vide.`
  },
  overload: {
    icon:'🎯', title:'C\'est quoi la surcharge progressive ?',
    body:`C'est <b>LE</b> principe pour progresser : faire un peu <b>plus</b> que la dernière fois.<br><br>
      L'app regarde ta dernière séance et te propose une cible : soit <b>+1 répétition</b>, soit <b>monter le poids</b> quand tu atteins le haut de ta fourchette de reps.<br><br>
      Clique sur une carte pour <b>fixer ton objectif</b> du jour. Ensuite tu remplis tes vraies séries toi-même. C'est ta progression qui se construit, séance après séance.`
  },
  disques: {
    icon:'🧮', title:'C\'est quoi le calculateur de disques ?',
    body:`Il te dit <b>quels disques mettre</b> pour soulever le poids voulu.<br><br>
      Tu entres le <b>poids total</b> que tu veux soulever, et il calcule combien mettre de chaque côté (en enlevant le poids de la barre/haltère à vide).<br><br>
      Configure d'abord <b>ton matériel</b> (tes disques + le poids de tes barres à vide) une seule fois, via le bouton ⚙. Ensuite c'est automatique pour tous les exercices.`
  },
  ressenti: {
    icon:'🌙', title:'C\'est quoi le ressenti du jour ?',
    body:`En fin de séance, note comment tu te sens : <b>fatigue, sommeil, motivation, douleur</b>.<br><br>
      Ça t'aide à repérer les tendances : si tu dors mal plusieurs jours et que tes perfs chutent, tu verras le lien. C'est un indicateur de <b>récupération</b>, essentiel pour progresser sans te blesser.<br><br>
      Optionnel, mais très utile sur la durée.`
  },
  series: {
    icon:'📝', title:'Comment remplir une série ?',
    body:`Pour chaque série, entre le <b>poids</b> (à gauche) et le <b>nombre de répétitions</b> (à droite), puis appuie sur <b>Entrée</b> pour valider.<br><br>
      Le « <b>×</b> » entre les deux se lit « fois » : <b>5kg × 11</b> = 11 répétitions à 5kg.<br><br>
      Clique sur <b>+ Série</b> pour en ajouter une. Les chiffres gris sont juste ton objectif en repère.`
  },
};
function helpDismissed(id){ try{ return localStorage.getItem('sbt-help-'+id)==='1'; }catch(e){ return false; } }
function dismissHelp(id){ try{ localStorage.setItem('sbt-help-'+id,'1'); }catch(e){} 
  const hb=document.getElementById('plate-help'); if(hb) hb.innerHTML='';
  try{ renderSession(); }catch(e){}
}
function resetAllHelp(){ Object.keys(HELP_CONTENT).forEach(id=>{ try{ localStorage.removeItem('sbt-help-'+id); }catch(e){} }); showToast('Aides réactivées ✓'); renderSession(); }
// Bulle complète (s'affiche tant que non "Compris")
function helpBubble(id){
  if(helpDismissed(id)) return '';
  const h=HELP_CONTENT[id]; if(!h) return '';
  return `<div class="help-bubble">
    <div class="help-bubble-head">${h.icon} ${h.title}</div>
    <div class="help-bubble-body">${h.body}</div>
    <button class="help-bubble-ok" onclick="event.stopPropagation();dismissHelp('${id}')">✓ Compris, ne plus afficher</button>
  </div>`;
}
// Petit "?" cliquable qui réaffiche l'aide d'un terme (toujours dispo)
function helpQ(id){
  return `<span class="help-q" onclick="event.stopPropagation();localStorage.removeItem('sbt-help-${id}');renderSession()" title="Qu'est-ce que c'est ?">?</span>`;
}

function applyOverload(di,ei,sugW,sugR){
  const ex=S.week[di].exercises[ei];
  if(!ex) return;
  // On met à jour l'OBJECTIF de l'exercice (le prévu), PAS les séries réalisées.
  // Les séries restent à remplir toi-même ; le nouvel objectif s'affiche en repère (placeholder gris).
  if(sugW!=null && +sugW>0) ex.weight = +sugW;
  if(sugR!=null && +sugR>0) ex.reps = +sugR;
  saveState(); expandA=ei; renderSession();
  const label = sugW ? `${sugW}kg × ${sugR} rép.` : `${sugR} rép.`;
  showToast(`🎯 Nouvel objectif : ${label} — à toi de jouer`);
}

/* ── YOUTUBE VIDEO HELPER ── */
function extractYtId(url){
  if(!url) return '';
  // already an ID (11 chars, no slash)
  if(/^[a-zA-Z0-9_-]{11}$/.test(url.trim())) return url.trim();
  const m=url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return m?m[1]:'';
}

function openVidModal(ytId){
  if(!ytId) return;
  document.getElementById('vid-frame-wrap').innerHTML=
    `<iframe src="https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0" allowfullscreen allow="autoplay"></iframe>`;
  document.getElementById('vid-modal').classList.add('on');
}

function closeVidModal(){
  document.getElementById('vid-modal').classList.remove('on');
  document.getElementById('vid-frame-wrap').innerHTML='';
}

