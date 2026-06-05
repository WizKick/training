/* ═══ PROGRAMME ═══ */
function renderProg(){
  // Update perio button badge
  const btn = document.getElementById('perio-prog-btn');
  if(btn){
    const p = S.periodization;
    if(p && p.enabled){
      const l = getCurrentWeekLabel();
      btn.innerHTML = `🔄 Périodisation <span style="font-family:var(--mono);font-size:9px;font-weight:700;background:${l==='A'?'rgba(96,165,250,.2)':l==='B'?'rgba(74,222,128,.2)':'rgba(251,191,36,.2)'};color:${l==='A'?'var(--blue)':l==='B'?'var(--green)':'var(--yellow)'};border-radius:3px;padding:1px 6px;margin-left:2px">${l}</span>`;
    } else { btn.innerHTML = '🔄 Périodisation'; }
  }
  document.getElementById('pgrid').innerHTML=DAYS.map((d,i)=>{
    const s=S.week[i],h=s.name.trim();
    return`<div class="pdc tp-${s.type}" onclick="openModal(${i})">
      <div class="pdc-head"><div class="pdc-day">${d.slice(0,3)}</div><div class="pdc-edit">✎</div></div>
      <div class="pdc-body">
        <div class="pdc-nm">${h||''}</div>
        ${h?`<div class="pdc-cnt">${s.exercises.length} exo${s.exercises.length!==1?'s':''}</div><div class="pdc-dot"></div>`
           :`<div style="font-size:10px;color:var(--t4)">Configurer →</div>`}
      </div>
    </div>`;
  }).join('');
}

/* ═══ MODAL ═══ */
function openModal(di){
  editDayIdx=di;
  const s=S.week[di];
  document.getElementById('mos-title').textContent=DAYS[di];
  document.getElementById('mos-nm').value=s.name;
  document.getElementById('mos-tp').value=s.type||'rest';
  _ee=s.exercises.map(e=>({...e,media:(e.media||[]).slice()}));
  renderModalExos();
  document.getElementById('mos').classList.add('on');
}

function renderModalExos(){
  document.getElementById('mos-cnt').textContent=_ee.length+' exercice'+(_ee.length!==1?'s':'');
  document.getElementById('mos-exos').innerHTML=_ee.map((e,i)=>`
    <div class="ee-item">
      <div class="ee-order">
        <button onclick="moveEE(${i},-1)" title="Monter">↑</button>
        <button onclick="moveEE(${i},1)"  title="Descendre">↓</button>
      </div>
      <button class="ee-del" onclick="deleteEE(${i})">✕</button>
      <div class="field" style="margin-bottom:10px;padding-right:60px">
        <label class="lbl">Exercice</label>
        <input class="inp" type="text" value="${esc(e.name)}" placeholder="Nom…" onchange="_ee[${i}].name=this.value"/>
      </div>
      <div class="g3">
        <div class="field"><label class="lbl">Séries</label><input class="inp" type="number" value="${e.sets||3}" min="1" onchange="_ee[${i}].sets=parseInt(this.value)||1"/></div>
        <div class="field"><label class="lbl">${e.amrap?'Min rép. (objectif)':'Rép.'}</label><input class="inp" type="number" value="${e.reps||10}" min="0" ${e.amrap?'placeholder="0 = libre"':''} onchange="_ee[${i}].reps=parseInt(this.value)||0"/></div>
        <div class="field"><label class="lbl">Poids objectif (kg total)</label><input class="inp" type="number" value="${e.weight||''}" min="0" step="0.5" placeholder="ex: 16.5" onchange="_ee[${i}].weight=parseFloat(this.value)||0"/></div>
      </div>
      <div style="margin-bottom:10px">
        <label class="amrap-toggle" onclick="_ee[${i}].amrap=!_ee[${i}].amrap;renderModalExos()">
          <input type="checkbox" ${e.amrap?'checked':''}/>
          <div class="amrap-pill"></div>
          <span class="amrap-lbl">AMRAP — Max reps / poids du corps</span>
        </label>
      </div>
      <div class="g2">
        <div class="field"><label class="lbl">Repos (s)</label><input class="inp" type="number" value="${e.rest||90}" min="0" step="10" onchange="_ee[${i}].rest=parseInt(this.value)||0"/></div>
        <div class="field"><label class="lbl">Équipement</label>
          <select class="inp" onchange="_ee[${i}].equip=this.value">
            <option value=""${!e.equip?' selected':''}>Auto (deviné)</option>
            <option value="db1"${e.equip==='db1'?' selected':''}>1 haltère</option>
            <option value="db2"${e.equip==='db2'?' selected':''}>2 haltères</option>
            <option value="ez"${e.equip==='ez'?' selected':''}>Barre EZ</option>
            <option value="straight"${e.equip==='straight'?' selected':''}>Barre droite</option>
            <option value="pc"${e.equip==='pc'?' selected':''}>Poids du corps</option>
          </select>
        </div>
      </div>
      <div class="field" style="margin-top:8px"><label class="lbl">Notes</label><input class="inp" type="text" value="${esc(e.notes||'')}" placeholder="technique…" onchange="_ee[${i}].notes=this.value"/></div>
    </div>`).join('');
}

function esc(s){ return String(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

function toggleSupersetLink(i){
  const a=_ee[i], b=_ee[i+1];
  if(!a||!b) return;
  if(a.supersetGroup && b.supersetGroup===a.supersetGroup){
    // Unlink
    a.supersetGroup=null; b.supersetGroup=null;
  } else {
    // Link: assign a new group id (or reuse a's existing one)
    const gid = a.supersetGroup || ('ss_'+Date.now());
    a.supersetGroup=gid; b.supersetGroup=gid;
  }
  renderModalExos();
}

function moveEE(i,dir){
  const j=i+dir;
  if(j<0||j>=_ee.length) return;
  [_ee[i],_ee[j]]=[_ee[j],_ee[i]];
  renderModalExos();
}

function deleteEE(i){ _ee.splice(i,1); renderModalExos(); }

function addExo(){
  const inp=document.getElementById('mos-new'), nm=inp.value.trim();
  if(!nm){inp.focus();return;}
  _ee.push({name:nm,sets:3,reps:10,weight:0,rest:90,notes:'',media:[],amrap:false,supersetGroup:null});
  inp.value='';
  renderModalExos();
  const mb=document.querySelector('#mos .mbody');
  if(mb) mb.scrollTop=mb.scrollHeight;
}

function saveModal(){
  const name=document.getElementById('mos-nm').value.trim();
  const type=document.getElementById('mos-tp').value;
  S.week[editDayIdx].name=name;
  S.week[editDayIdx].type=type;
  S.week[editDayIdx].exercises=_ee.map(e=>({...e}));
  // If periodization is active, persist the edit back into the active week template
  const p = S.periodization;
  if(p && p.enabled){
    const curLabel = getCurrentWeekLabel();
    if(curLabel && p.weeks[curLabel]){
      p.weeks[curLabel][editDayIdx] = {...S.week[editDayIdx], exercises:S.week[editDayIdx].exercises.map(e=>({...e,media:[]}))};
    }
  }
  saveState(); closeModal(); renderProg();
  if(editDayIdx===curDay){renderStrip();renderSession();}else renderStrip();
  // Notify onboarding (polling will auto-detect, but reposition card after modal closes)
  if(typeof _obVisible !== 'undefined' && window._obVisible) setTimeout(()=>{ if(window._positionCard) window._positionCard(); }, 350);
}

function clearDay(){
  if(!confirm(`Supprimer la séance de ${DAYS[editDayIdx]} ?`)) return;
  S.week[editDayIdx]={day:DAYS[editDayIdx],name:'',type:'rest',exercises:[]};
  saveState(); closeModal(); renderProg();
  if(editDayIdx===curDay){renderStrip();renderSession();}else renderStrip();
}

function closeModal(){ document.getElementById('mos').classList.remove('on'); closeCopyDay(); }

/* ── COPY DAY ── */
function toggleCopyDay(e){
  e.stopPropagation();
  const pop=document.getElementById('cpd-pop');
  if(pop.classList.contains('on')){ closeCopyDay(); return; }
  // Populate day checkboxes (exclude current day)
  document.getElementById('cpd-days').innerHTML=DAYS.map((d,i)=>{
    const disabled=i===editDayIdx;
    return`<label class="cpd-day${disabled?' disabled':''}">
      <input type="checkbox" value="${i}" ${disabled?'disabled':''}/>
      <span>${d}</span>
      ${S.week[i].name?`<span style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-left:auto">${S.week[i].name}</span>`:''}
    </label>`;
  }).join('');
  pop.classList.add('on');
  // Close on outside click
  setTimeout(()=>document.addEventListener('click', _closeCopyDayOutside, {once:true}), 0);
}
function _closeCopyDayOutside(e){
  if(!document.getElementById('cpd-wrap').contains(e.target)) closeCopyDay();
}
function closeCopyDay(){
  document.getElementById('cpd-pop').classList.remove('on');
  document.removeEventListener('click', _closeCopyDayOutside);
}
function confirmCopyDay(){
  const targets=[...document.querySelectorAll('#cpd-days input:checked')].map(cb=>parseInt(cb.value));
  if(!targets.length){ closeCopyDay(); return; }
  // Copy current _ee state (unsaved edits) + name + type to target days
  const nm=document.getElementById('mos-nm').value.trim();
  const tp=document.getElementById('mos-tp').value;
  targets.forEach(ti=>{
    S.week[ti].name=nm;
    S.week[ti].type=tp;
    S.week[ti].exercises=_ee.map(e=>({...e,media:[]}));
  });
  saveState(); closeCopyDay(); renderProg();
  showToast(`Copié vers ${targets.map(i=>DAYS[i]).join(', ')} ✓`);
}

document.getElementById('mos-new').addEventListener('keydown',function(e){
  if(e.key==='Enter'){e.preventDefault();addExo();}
});

/* ═══ GRAPHS ═══ */
let curView='date'; // 'date' | 'month'

function renderGraphs(){
  const el=document.getElementById('gv');

  // ── Muscle distribution data (all logged sessions) ──
  // Count sets logged per session type
  const muscleSets={push:0,pull:0,legs:0,full:0,cardio:0,custom:0};
  const muscleVol ={push:0,pull:0,legs:0,full:0,cardio:0,custom:0};
  Object.keys(S.logs).forEach(k=>{
    const logs=S.logs[k]; if(!logs||!logs.length) return;
    const parts=k.split('_'); // di_ei_date
    const di=parseInt(parts[0]);
    const day=S.week[di];
    if(!day||day.type==='rest') return;
    const type=day.type||'custom';
    const grp=muscleSets[type]!==undefined?type:'custom';
    muscleSets[grp]+=logs.length;
    logs.forEach(l=>{ muscleVol[grp]+=(l.w||0)*(l.r||0)||(l.r||0); });
  });

  const typeLabels={push:'Push',pull:'Pull',legs:'Legs',full:'Full Body',cardio:'Cardio',custom:'Autre'};
  const typeColors={
    push:'rgba(96,165,250,.85)',
    pull:'rgba(251,146,60,.85)',
    legs:'rgba(74,222,128,.85)',
    full:'rgba(167,139,250,.85)',
    cardio:'rgba(34,211,238,.85)',
    custom:'rgba(148,163,184,.85)',
  };

  const hasMuscleData=Object.values(muscleSets).some(v=>v>0);

  const items=[];
  S.week.forEach((s,di)=>{
    if(!s.name||s.type==='rest') return;
    s.exercises.forEach((ex,ei)=>{
      if(getAllLogs(di,ei).length) items.push({ex,di,ei,sname:s.name});
    });
  });

  if(!items.length && !hasMuscleData){
    el.innerHTML=`<div class="empty-box"><div class="eb-ico">📈</div><div class="eb-t">Aucune donnée</div><div class="eb-s">Logue tes séries dans Séance pour voir la progression.</div></div>`;
    return;
  }

  // Build the muscle card HTML
  let muscleCardHtml='';
  if(hasMuscleData){
    const activeTypes=Object.keys(muscleSets).filter(t=>muscleSets[t]>0);
    const totalSets=activeTypes.reduce((a,t)=>a+muscleSets[t],0);

    const legendItems=activeTypes.map(t=>{
      const pct=Math.round(muscleSets[t]/totalSets*100);
      return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--b1)">
        <div style="width:8px;height:8px;border-radius:50%;background:${typeColors[t]};flex-shrink:0"></div>
        <div style="flex:1;font-size:11px;color:var(--t2)">${typeLabels[t]}</div>
        <div style="font-family:var(--mono);font-size:10px;color:var(--t1);font-weight:500">${pct}%</div>
        <div style="font-family:var(--mono);font-size:9px;color:var(--t3);min-width:42px;text-align:right">${muscleSets[t]} série${muscleSets[t]>1?'s':''}</div>
      </div>`;
    }).join('');

    muscleCardHtml=`<div class="graph-card" style="margin-bottom:16px">
      <div class="graph-head">
        <div class="graph-ttl">Répartition musculaire</div>
        <div style="display:flex;gap:6px">
          <button class="mt on" id="mc-sets" onclick="setMuscleMetric('sets')" style="font-family:var(--mono);font-size:9px;padding:3px 9px;border-radius:3px;border:none;background:var(--s4);color:var(--t1);letter-spacing:.04em">SÉRIES</button>
          <button class="mt" id="mc-vol"  onclick="setMuscleMetric('vol')"  style="font-family:var(--mono);font-size:9px;padding:3px 9px;border-radius:3px;border:none;background:transparent;color:var(--t3);letter-spacing:.04em">VOLUME</button>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:180px 1fr;gap:20px;align-items:center">
        <div style="position:relative;height:180px"><canvas id="gc-muscle"></canvas></div>
        <div style="padding-right:4px">
          <div style="font-family:var(--mono);font-size:9px;color:var(--t3);letter-spacing:.07em;text-transform:uppercase;margin-bottom:6px">Détail</div>
          ${legendItems}
        </div>
      </div>
    </div>`;
  }

  // Build progression card HTML (only if there are logged exercises)
  let progCardHtml='';
  if(items.length){
    window._gItems=items;
    const opts=items.map((it,i)=>`<option value="${i}">${it.ex.name} (${it.sname})</option>`).join('');
    progCardHtml=`<div class="graph-card">
      <div class="graph-head">
        <div class="graph-ttl">Progression par exercice</div>
        <div class="graph-ctrls" style="flex-wrap:wrap;gap:6px">
          <select class="g-sel" id="g-sel" onchange="drawGraph()">${opts}</select>
          <div class="mtabs">
            <button class="mt on" id="mt-vol" onclick="setMetric('volume')">VOL</button>
            <button class="mt" id="mt-w" onclick="setMetric('poids')">POIDS</button>
            <button class="mt" id="mt-r" onclick="setMetric('reps')">REPS</button>
          </div>
          <div class="mtabs">
            <button class="mt on" id="mv-date" onclick="setView('date')">/ Date</button>
            <button class="mt" id="mv-month" onclick="setView('month')">/ Mois</button>
          </div>
        </div>
      </div>
      <div style="position:relative;height:220px"><canvas id="gc"></canvas></div>
      <div class="graph-legend">
        <div class="gl"><div class="gl-d" style="background:var(--t1)"></div>Réalisé</div>
        <div class="gl"><div class="gl-d" style="background:var(--t3)"></div>Prévu</div>
        <div class="gl"><div class="gl-d" style="background:var(--yellow)"></div>PR absolu</div>
        <div class="gl"><div style="width:14px;height:2px;background:var(--green);border-radius:1px;border-top:2px dashed var(--green)"></div>Tendance</div>
      </div>
      <div id="hist-tbl-wrap"></div>
    </div>`;
  }

  // ── 4 semaines Push/Pull/Legs ──
  const monday = getMondayOf(new Date());
  const last4Weeks = Array.from({length:4},(_,i)=>{
    const m = new Date(monday); m.setDate(m.getDate()-i*7);
    const dates = Array.from({length:7},(_,j)=>{ const d=new Date(m); d.setDate(m.getDate()+j); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); });
    return {label: i===0?'Cette sem':i===1?'S-1':i===2?'S-2':'S-3', dates: new Set(dates)};
  }).reverse();

  const pplData = ['push','pull','legs'].map(type => ({
    type,
    weeks: last4Weeks.map(wk => {
      let vol = 0;
      Object.entries(S.logs).forEach(([k,logs]) => {
        if(!logs||!logs.length) return;
        const parts=k.split('_'); if(parts.length<3) return;
        const di=parseInt(parts[0]); const dk=parts.slice(2).join('_');
        if(!wk.dates.has(dk)) return;
        const day=S.week[di]; if(!day||day.type!==type) return;
        logs.forEach(l=>{ vol+=(l.w||0)*(l.r||0)||(l.r||0); });
      });
      return vol;
    })
  }));

  const hasPPL = pplData.some(d=>d.weeks.some(v=>v>0));
  let pplCardHtml = '';
  if(hasPPL){
    const allVals = pplData.flatMap(d=>d.weeks);
    const maxV = Math.max(...allVals, 1);
    const colors = {push:'var(--push)',pull:'var(--pull)',legs:'var(--legs)'};
    const labels2 = {push:'Push',pull:'Pull',legs:'Legs'};
    const weeks4 = last4Weeks.map(w=>w.label);

    // SVG grouped bar chart
    const W=300,H=120,pad={t:8,r:8,b:20,l:32};
    const bW=(W-pad.l-pad.r)/4; // width per week group
    const barW=bW/4; // width per bar (3 bars + gap)
    const gap=2;
    function yFor(v){ return pad.t+(1-v/maxV)*(H-pad.t-pad.b); }
    function yH(v){ return (v/maxV)*(H-pad.t-pad.b); }

    let bars='', xLabels='', legend='';
    pplData.forEach((d,ti)=>{
      d.weeks.forEach((v,wi)=>{
        const x=pad.l + wi*bW + ti*(barW+gap);
        const h=yH(v);
        const y=H-pad.b-h;
        bars+=`<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(barW-1).toFixed(1)}" height="${h.toFixed(1)}" rx="2" fill="${colors[d.type]}" opacity="${v>0?'.8':'.15'}"/>`;
      });
    });
    weeks4.forEach((lbl,i)=>{
      const x=pad.l + i*bW + bW/2;
      xLabels+=`<text x="${x.toFixed(1)}" y="${H-4}" text-anchor="middle" font-size="7" fill="rgba(255,255,255,.3)">${lbl}</text>`;
    });
    // Y axis labels
    [0,.5,1].forEach(f=>{
      const v=Math.round(maxV*f);
      const y=pad.t+(1-f)*(H-pad.t-pad.b);
      bars+=`<line x1="${pad.l}" y1="${y.toFixed(1)}" x2="${W-pad.r}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,.05)" stroke-width="1"/>`;
      bars+=`<text x="${(pad.l-3).toFixed(1)}" y="${(y+3).toFixed(1)}" text-anchor="end" font-size="7" fill="rgba(255,255,255,.25)">${v>=1000?(v/1000).toFixed(0)+'t':v}</text>`;
    });

    ['push','pull','legs'].forEach((t,i)=>{
      legend+=`<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--t2)"><div style="width:8px;height:8px;background:${colors[t]};border-radius:2px"></div>${labels2[t]}</div>`;
    });

    // Detect neglected group
    const lastWeekVols = pplData.map(d=>d.weeks[3]);
    const minVol = Math.min(...lastWeekVols.filter(v=>v>0));
    const maxVol2 = Math.max(...lastWeekVols);
    const neglected = maxVol2>0 && minVol < maxVol2*0.3 ? pplData[lastWeekVols.indexOf(minVol)] : null;
    const alertHtml = neglected ? `<div style="margin-top:8px;font-family:var(--mono);font-size:9px;color:var(--yellow)">⚠ ${labels2[neglected.type]} sous-entraîné cette semaine vs les autres groupes</div>` : '';

    pplCardHtml = `<div class="graph-card" style="margin-bottom:16px">
      <div class="graph-head"><div class="graph-ttl">Push / Pull / Legs — 4 semaines</div></div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
        <svg viewBox="0 0 ${W} ${H}" style="flex:1;min-width:200px;height:${H}px" xmlns="http://www.w3.org/2000/svg">${bars}${xLabels}</svg>
        <div style="display:flex;flex-direction:column;gap:6px">${legend}</div>
      </div>
      ${alertHtml}
    </div>`;
  }

  // ── Courbe poids corporel + volume ──
  let bodyVolCardHtml = '';
  try {
    const wtData = JSON.parse(localStorage.getItem('wtEntries2')||'[]');
    if(wtData.length >= 2){
      // Volume par semaine
      const volByWeek = {};
      Object.entries(S.logs).forEach(([k,logs])=>{
        if(!logs||!logs.length) return;
        const parts=k.split('_'); if(parts.length<3) return;
        const dk=parts.slice(2).join('_');
        const d=new Date(dk+'T00:00:00'); if(isNaN(d)) return;
        const jan4=new Date(d.getFullYear(),0,4);
        const wk=d.getFullYear()+'-W'+String(Math.ceil(((d-jan4)/86400000+jan4.getDay()+1)/7)).padStart(2,'0');
        if(!volByWeek[wk]) volByWeek[wk]=0;
        logs.forEach(l=>{ volByWeek[wk]+=(l.w||0)*(l.r||0)||(l.r||0); });
      });

      // Merge weight entries with volume by finding closest week
      const merged = wtData.slice(-12).map(e => {
        const d=new Date(e.date+'T00:00:00');
        const jan4=new Date(d.getFullYear(),0,4);
        const wk=d.getFullYear()+'-W'+String(Math.ceil(((d-jan4)/86400000+jan4.getDay()+1)/7)).padStart(2,'0');
        return { date:e.date, w:parseFloat(e.w), vol:volByWeek[wk]||0 };
      });

      if(merged.length >= 2){
        const W2=300,H2=90,pad2={t:6,r:6,b:18,l:30};
        const dates=merged.map(p=>p.date);
        const xFor=(_,i)=>pad2.l+i/(merged.length-1)*(W2-pad2.l-pad2.r);
        const weights=merged.map(p=>p.w);
        const vols=merged.map(p=>p.vol);
        const minW=Math.min(...weights)-0.2, maxW=Math.max(...weights)+0.2;
        const maxVol3=Math.max(...vols,1);
        const yForW=v=>pad2.t+(1-(v-minW)/(maxW-minW))*(H2-pad2.t-pad2.b);
        const yForV=v=>pad2.t+(1-v/maxVol3)*(H2-pad2.t-pad2.b);

        const wPts=merged.map((p,i)=>`${xFor(0,i).toFixed(1)},${yForW(p.w).toFixed(1)}`).join(' ');
        const vPts=merged.filter(p=>p.vol>0).map((p,i)=>{
          const idx=merged.indexOf(p);
          return `${xFor(0,idx).toFixed(1)},${yForV(p.vol).toFixed(1)}`;
        }).join(' ');

        let gridLines='';
        [0,.5,1].forEach(f=>{
          const y=pad2.t+f*(H2-pad2.t-pad2.b);
          gridLines+=`<line x1="${pad2.l}" y1="${y.toFixed(1)}" x2="${W2-pad2.r}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,.05)" stroke-width="1"/>`;
        });
        const wLabel=`<text x="${(pad2.l-2).toFixed(1)}" y="${(pad2.t+4).toFixed(1)}" text-anchor="end" font-size="7" fill="rgba(80,200,120,.5)">${maxW.toFixed(0)}</text><text x="${(pad2.l-2).toFixed(1)}" y="${(H2-pad2.b).toFixed(1)}" text-anchor="end" font-size="7" fill="rgba(80,200,120,.5)">${minW.toFixed(0)}</text>`;

        bodyVolCardHtml = `<div class="graph-card" style="margin-bottom:16px">
          <div class="graph-head">
            <div class="graph-ttl">Poids corporel × Volume</div>
            <div style="display:flex;gap:10px;font-family:var(--mono);font-size:9px">
              <span style="color:#50c878">— Poids (kg)</span>
              <span style="color:var(--push)">— Volume</span>
            </div>
          </div>
          <svg viewBox="0 0 ${W2} ${H2}" style="width:100%;height:${H2}px" xmlns="http://www.w3.org/2000/svg">
            ${gridLines}${wLabel}
            ${vPts ? `<polyline points="${vPts}" fill="none" stroke="var(--push)" stroke-width="1.5" stroke-dasharray="3,3" opacity=".6"/>` : ''}
            <polyline points="${wPts}" fill="none" stroke="#50c878" stroke-width="2"/>
            ${merged.map((p,i)=>`<circle cx="${xFor(0,i).toFixed(1)}" cy="${yForW(p.w).toFixed(1)}" r="2" fill="#50c878"/>`).join('')}
          </svg>
          <div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-top:4px">Corrélation bulk → perfs sur les ${merged.length} dernières entrées</div>
        </div>`;
      }
    }
  } catch(e2){}

  el.innerHTML=pplCardHtml+bodyVolCardHtml+muscleCardHtml+progCardHtml+`<div id="wt-chart-section" style="margin-top:0"></div>`;

  if(hasMuscleData){ window._muscleMetric='sets'; window._muscleSets=muscleSets; window._muscleVol=muscleVol; window._muscleTypes=Object.keys(muscleSets).filter(t=>muscleSets[t]>0||muscleVol[t]>0); window._muscleColors=typeColors; window._muscleLabels=typeLabels; drawMuscleChart(); }
  if(items.length) drawGraph();
  renderWellnessChart();
}

let _muscleChartInst=null;

function setMuscleMetric(m){
  window._muscleMetric=m;
  // toggle button styles
  ['mc-sets','mc-vol'].forEach(id=>{
    const b=document.getElementById(id);
    if(!b) return;
    const active=(id==='mc-sets'&&m==='sets')||(id==='mc-vol'&&m==='vol');
    b.style.background=active?'var(--s4)':'transparent';
    b.style.color=active?'var(--t1)':'var(--t3)';
  });
  drawMuscleChart();
}

function drawMuscleChart(){
  const cv=document.getElementById('gc-muscle'); if(!cv) return;
  const metric=window._muscleMetric||'sets';
  const data=metric==='vol'?window._muscleVol:window._muscleSets;
  const types=window._muscleTypes||[];
  const colors=window._muscleColors||{};
  const labels=window._muscleLabels||{};

  if(_muscleChartInst){_muscleChartInst.destroy();_muscleChartInst=null;}

  const isLight=document.documentElement.classList.contains('light');
  const tooltipBg  =isLight?'#fff':'#1b1b1b';
  const tooltipTxt =isLight?'#111':'#f5f5f5';
  const borderColor=isLight?'rgba(244,244,245,.8)':'rgba(9,9,9,.8)';

  const vals=types.map(t=>data[t]||0);
  const unit=metric==='vol'?' kg':' série'+(1>1?'s':'');
  const total=vals.reduce((a,v)=>a+v,0);

  _muscleChartInst=new Chart(cv.getContext('2d'),{
    type:'doughnut',
    data:{
      labels:types.map(t=>labels[t]||t),
      datasets:[{
        data:vals,
        backgroundColor:types.map(t=>colors[t]||'#888'),
        borderColor,
        borderWidth:2,
        hoverOffset:8,
      }],
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      cutout:'68%',
      animation:{duration:500,easing:'easeOutQuart'},
      plugins:{
        legend:{display:false},
        tooltip:{
          backgroundColor:tooltipBg,
          titleColor:isLight?'#555':'#666',
          bodyColor:tooltipTxt,
          borderColor:isLight?'rgba(0,0,0,.12)':'rgba(255,255,255,.1)',
          borderWidth:1,
          padding:10,
          titleFont:{family:"'JetBrains Mono',monospace",size:10},
          bodyFont:{family:"'JetBrains Mono',monospace",size:12},
          callbacks:{
            label:(item)=>{
              const v=item.raw;
              const pct=Math.round(v/total*100);
              const suffix=metric==='vol'?'kg':'série'+(v>1?'s':'');
              return ` ${v} ${suffix} · ${pct}%`;
            },
          },
        },
      },
    },
  });
}

function setMetric(m){
  curMetric=m;
  document.querySelectorAll('.mt').forEach(b=>b.classList.remove('on'));
  const ids={volume:'mt-vol',poids:'mt-w',reps:'mt-r',orm:'mt-orm'};
  const el=document.getElementById(ids[m]);
  if(el) el.classList.add('on');
  drawGraph();
}

function setView(v){
  curView=v;
  document.querySelectorAll('#mv-date,#mv-month').forEach(b=>b.classList.remove('on'));
  const el=document.getElementById('mv-'+v);
  if(el) el.classList.add('on');
  drawGraph();
}

function calcVal(logs,metric){
  if(!logs||!logs.length) return 0;
  if(metric==='volume') return logs.reduce((a,l)=>a+((l.w||0)*(l.r||0)||(l.r||0)),0);
  if(metric==='poids')  return logs.reduce((a,l)=>Math.max(a,l.w||0),0);
  if(metric==='reps')   return logs.reduce((a,l)=>Math.max(a,l.r||0),0);
  if(metric==='orm'){
    const best=logs.reduce((a,l)=>((l.w||0)*(l.r||0)>(a.w||0)*(a.r||0)?l:a),logs[0]);
    const w=best.w||0, r=best.r||0;
    return w>0&&r>0?Math.round(w*(1+r/30)):0;
  }
  return 0;
}

let _chartInstance = null;

function drawGraph(){
  const cv=document.getElementById('gc'); if(!cv) return;
  const items=window._gItems||[]; if(!items.length) return;
  const selEl=document.getElementById('g-sel');
  const idx=parseInt(selEl?selEl.value:0)||0;
  const it=items[idx]; if(!it) return;

  const entries=getAllLogs(it.di,it.ei);

  // build data — by date or by month
  let wData=[];
  if(curView==='month'){
    const byMonth={};
    entries.forEach(([k,logs])=>{
      const dateStr=k.split('_').slice(2).join('_');
      const monthKey=dateStr.slice(0,7);
      if(!byMonth[monthKey]) byMonth[monthKey]=[];
      byMonth[monthKey].push(...logs);
    });
    wData=Object.entries(byMonth).sort(([a],[b])=>a.localeCompare(b)).map(([m,logs])=>{
      const val=calcVal(logs,curMetric);
      const [y,mo]=m.split('-');
      const months=['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];
      return{date:m,label:months[parseInt(mo)-1]+' '+y.slice(2),val,logs};
    }).filter(w=>w.val>0);
  } else {
    wData=entries.map(([k,logs])=>{
      const dateStr=k.split('_').slice(2).join('_');
      const val=calcVal(logs,curMetric);
      const parts=dateStr.split('-');
      return{date:dateStr,label:parts[2]+'/'+parts[1],val,logs};
    }).filter(w=>w.val>0);
  }

  // Destroy previous chart instance
  if(_chartInstance){ _chartInstance.destroy(); _chartInstance=null; }

  if(!wData.length){
    // Show empty state on canvas
    cv.height=190;
    const ctx=cv.getContext('2d');
    ctx.clearRect(0,0,cv.width,cv.height);
    ctx.fillStyle='rgba(100,100,100,.5)';
    ctx.font=`12px 'Inter',sans-serif`;
    ctx.textAlign='center';
    ctx.fillText('Pas encore de données',cv.width/2,95);
    return;
  }

  // planned ref
  let planVal=0;
  if(curMetric==='volume')      planVal=(it.ex.weight||0)*(it.ex.reps||0)*it.ex.sets||it.ex.reps*it.ex.sets;
  else if(curMetric==='poids')  planVal=it.ex.weight||0;
  else if(curMetric==='reps')   planVal=it.ex.reps||0;
  else if(curMetric==='orm')    planVal=it.ex.weight>0&&it.ex.reps>0?Math.round(it.ex.weight*(1+it.ex.reps/30)):0;

  const prVal=Math.max(...wData.map(w=>w.val));
  const unit=curMetric==='reps'?'':' kg';

  // Detect theme
  const isLight=document.documentElement.classList.contains('light');
  const lineColor   = isLight ? 'rgba(17,17,17,.85)'   : 'rgba(245,245,245,.85)';
  const areaColor   = isLight ? 'rgba(17,17,17,.07)'   : 'rgba(245,245,245,.07)';
  const gridColor   = isLight ? 'rgba(0,0,0,.06)'      : 'rgba(255,255,255,.05)';
  const tickColor   = isLight ? '#888'                 : '#666';
  const tooltipBg   = isLight ? '#fff'                 : '#1b1b1b';
  const tooltipTxt  = isLight ? '#111'                 : '#f5f5f5';

  // Point colors per data point
  const pointColors = wData.map(w => {
    if(w.val===prVal) return '#fbbf24';
    if(planVal>0 && w.val>planVal) return '#4ade80';
    return lineColor;
  });

  // Datasets
  const datasets = [{
    label: 'Réalisé',
    data: wData.map(w=>w.val),
    borderColor: lineColor,
    backgroundColor: areaColor,
    pointBackgroundColor: pointColors,
    pointBorderColor: pointColors,
    pointRadius: wData.map(w=>w.val===prVal?6:4),
    pointHoverRadius: 7,
    borderWidth: 2,
    fill: true,
    tension: 0.35,
    order: 1,
  }];

  // Planned reference line
  if(planVal>0){
    datasets.push({
      label: 'Prévu',
      data: wData.map(()=>planVal),
      borderColor: 'rgba(120,120,120,.45)',
      borderDash: [5,5],
      borderWidth: 1,
      pointRadius: 0,
      fill: false,
      tension: 0,
      order: 2,
    });
  }

  // PR reference line
  if(prVal>0 && wData.length>1){
    datasets.push({
      label: 'PR absolu',
      data: wData.map(()=>prVal),
      borderColor: 'rgba(251,191,36,.4)',
      borderDash: [3,5],
      borderWidth: 1,
      pointRadius: 0,
      fill: false,
      tension: 0,
      order: 3,
    });
  }

  // ── Linear trendline (least-squares) ──
  let trendSlope = 0, trendR2 = 0;
  if(wData.length >= 3){
    const n = wData.length;
    const xs = wData.map((_,i)=>i);
    const ys = wData.map(w=>w.val);
    const meanX = xs.reduce((a,b)=>a+b,0)/n;
    const meanY = ys.reduce((a,b)=>a+b,0)/n;
    const ssXX  = xs.reduce((a,x)=>a+(x-meanX)**2,0);
    const ssXY  = xs.reduce((a,x,i)=>a+(x-meanX)*(ys[i]-meanY),0);
    const ssYY  = ys.reduce((a,y)=>a+(y-meanY)**2,0);
    trendSlope  = ssXX>0 ? ssXY/ssXX : 0;
    trendR2     = ssXX>0&&ssYY>0 ? (ssXY**2)/(ssXX*ssYY) : 0;
    const intercept = meanY - trendSlope*meanX;
    const trendData = xs.map(x=>+(intercept + trendSlope*x).toFixed(2));
    const trendColor = trendSlope>0
      ? (isLight?'rgba(22,163,74,.7)':'rgba(74,222,128,.65)')
      : trendSlope<0
        ? (isLight?'rgba(220,38,38,.6)':'rgba(248,113,113,.6)')
        : 'rgba(150,150,150,.5)';
    datasets.push({
      label: 'Tendance',
      data: trendData,
      borderColor: trendColor,
      borderDash: [6,3],
      borderWidth: 2,
      pointRadius: 0,
      fill: false,
      tension: 0,
      order: 4,
    });
  }

  const ctx2=cv.getContext('2d');
  _chartInstance = new Chart(ctx2, {
    type: 'line',
    data: {
      labels: wData.map(w=>w.label),
      datasets,
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 350, easing: 'easeOutQuart' },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tickColor,
          bodyColor: tooltipTxt,
          borderColor: isLight?'rgba(0,0,0,.12)':'rgba(255,255,255,.1)',
          borderWidth: 1,
          padding: 10,
          titleFont: { family: "'JetBrains Mono',monospace", size: 10 },
          bodyFont: { family: "'JetBrains Mono',monospace", size: 11 },
          callbacks: {
            title: (items)=> items[0].label,
            label: (item)=>{
              if(item.dataset.label==='Tendance') return null;
              if(item.datasetIndex!==0) return null;
              const w=wData[item.dataIndex];
              const isPR=w.val===prVal;
              return ` ${item.formattedValue}${unit}${isPR?' ★ PR':''}`;
            },
            afterBody: (items)=>{
              const w=wData[items[0].dataIndex];
              const maxW=w.logs.reduce((a,l)=>Math.max(a,l.w||0),0);
              const maxR=w.logs.reduce((a,l)=>Math.max(a,l.r||0),0);
              const lines=[];
              if(maxW) lines.push(` Charge max: ${maxW}kg`);
              if(maxR) lines.push(` Rép. max: ${maxR}`);
              return lines;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor, drawBorder: false },
          ticks: {
            color: tickColor,
            font: { family: "'JetBrains Mono',monospace", size: 9 },
            maxRotation: 0,
          },
          border: { display: false },
        },
        y: {
          grid: { color: gridColor, drawBorder: false },
          ticks: {
            color: tickColor,
            font: { family: "'JetBrains Mono',monospace", size: 9 },
            callback: (v)=>v+unit,
            maxTicksLimit: 5,
          },
          border: { display: false },
        },
      },
    },
  });

  renderHistTable(wData,it,prVal,unit,trendSlope,trendR2);
}

function renderHistTable(wData,it,prVal,unit,trendSlope,trendR2){
  const wrap=document.getElementById('hist-tbl-wrap');
  if(!wrap||!wData.length) return;
  unit=unit||'';
  const last5=wData.slice(-5).reverse();
  const rows=last5.map(w=>{
    const isPR=w.val===prVal;
    const dateFmt=w.label||w.date;
    const maxW=w.logs.reduce((a,l)=>Math.max(a,l.w||0),0);
    const maxR=w.logs.reduce((a,l)=>Math.max(a,l.r||0),0);
    const vol=w.logs.reduce((a,l)=>a+((l.w||0)*(l.r||0)||(l.r||0)),0);
    const ormVal=maxW>0&&maxR>0?Math.round(maxW*(1+maxR/30)):0;
    return`<tr>
      <td class="mono">${dateFmt}</td>
      <td class="${isPR?'pr-row':'mono'}">${maxW?maxW+'kg':'—'}</td>
      <td class="mono">${maxR||'—'}</td>
      <td class="${isPR?'pr-row':'mono'}">${vol?vol+'kg':'—'}${isPR?' ★':''}</td>
    </tr>`;
  }).join('');
  // ── Trend summary chip ──
  let trendHtml = '';
  if(trendSlope !== undefined && wData.length >= 3){
    const slopeAbs = Math.abs(trendSlope).toFixed(2);
    const r2Pct = Math.round((trendR2||0)*100);
    const dir = trendSlope > 0.05 ? '↗' : trendSlope < -0.05 ? '↘' : '→';
    const col = trendSlope > 0.05
      ? 'color:var(--green);border-color:rgba(74,222,128,.25);background:rgba(74,222,128,.06)'
      : trendSlope < -0.05
        ? 'color:var(--red);border-color:rgba(248,113,113,.25);background:rgba(248,113,113,.06)'
        : 'color:var(--t3);border-color:var(--b1);background:var(--s2)';
    const label = trendSlope > 0.05
      ? `En progression (+${slopeAbs}${unit}/session)`
      : trendSlope < -0.05
        ? `En baisse (-${slopeAbs}${unit}/session)`
        : 'Stable';
    trendHtml = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap">
      <div style="font-family:var(--mono);font-size:9px;padding:4px 10px;border-radius:5px;border:1px solid;${col};display:inline-flex;align-items:center;gap:5px">
        <span style="font-size:12px">${dir}</span>
        <span>${label}</span>
      </div>
      <div style="font-family:var(--mono);font-size:9px;color:var(--t4)">R²=${r2Pct}%</div>
    </div>`;
  }

  wrap.innerHTML=`
    <div style="margin-top:16px;padding-top:14px;border-top:1px solid var(--b1)">
      ${trendHtml}
      <div style="font-family:var(--mono);font-size:9px;color:var(--t3);letter-spacing:.07em;text-transform:uppercase;margin-bottom:8px">5 dernières sessions</div>
      <table class="hist-table">
        <thead><tr><th>Date</th><th>Poids max</th><th>Rép. max</th><th>Volume</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

