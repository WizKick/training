/* ═══ WEIGHT TRACKER MODULE ═══ */
(function(){
  'use strict';

  const LS_KEY  = 'wtEntries2';
  const LS_GOAL = 'wtGoal';
  function getGoal(){ return parseFloat(localStorage.getItem(LS_GOAL)||'83')||83; }
  function getPaliers(g){
    // Départ = premier poids enregistré (arrondi), pas une valeur fixe.
    // Repli : poids actuel, sinon 5kg sous l'objectif pour avoir une échelle cohérente.
    let start = Math.round(getStart());
    const last = getLast();
    if(!start || isNaN(start)) start = last ? Math.round(last) : Math.round(g - 5);
    // Sécurité : le départ doit être strictement sous l'objectif
    if(start >= g) start = Math.round(g - 5);
    const steps = 6;
    const arr = [];
    for(let i=0;i<steps;i++) arr.push(Math.round(start + (g-start)*i/(steps-1)));
    arr[arr.length-1] = g;
    return arr;
  }

  function load(){
    try{
      let arr = JSON.parse(localStorage.getItem(LS_KEY)||'[]');
      if(!Array.isArray(arr)) return [];
      // Migration : anciennes entrées écrites avec `.kg` → on normalise vers `.w`
      let migrated = false;
      arr.forEach(function(e){
        if(e && e.w==null && e.kg!=null){ e.w = e.kg; delete e.kg; migrated = true; }
      });
      if(migrated){ try{ localStorage.setItem(LS_KEY, JSON.stringify(arr)); }catch(_){} }
      return arr;
    }catch(e){ return []; }
  }
  function save(d){ if(typeof safeSetItem==='function') safeSetItem(LS_KEY, JSON.stringify(d)); else localStorage.setItem(LS_KEY, JSON.stringify(d)); }

  function getStart(){ const d=load(); return d.length ? parseFloat(d[0].w) : 65; }
  function getLast(){  const d=load(); return d.length ? parseFloat(d[d.length-1].w) : null; }

  // Régression linéaire → kg/semaine
  function getWeeklyRate(){
    const d = load(); if(d.length < 2) return null;
    const pts = d.slice(-10);
    const t0  = new Date(pts[0].date).getTime();
    let sx=0,sy=0,sxy=0,sx2=0,n=pts.length;
    pts.forEach(function(e){
      const x = (new Date(e.date).getTime()-t0)/86400000/7;
      const y = parseFloat(e.w);
      sx+=x; sy+=y; sxy+=x*y; sx2+=x*x;
    });
    const denom = n*sx2 - sx*sx;
    if(!denom) return null;
    return (n*sxy - sx*sy)/denom; // kg/semaine
  }

  // ── Exposé global : la section nutrition lit le dernier poids + la vitesse ──
  window.wtGetLastWeight = function(){ const d=load(); return d.length ? parseFloat(d[d.length-1].w) : null; };
  window.wtGetWeeklyRate = getWeeklyRate;

  // Moyennes hebdomadaires groupées par semaine ISO
  function getWeeklyAvgs(){
    const d = load(); if(!d.length) return [];
    const weeks = {};
    d.forEach(function(e){
      const dt = new Date(e.date+'T00:00:00');
      const jan4 = new Date(dt.getFullYear(),0,4);
      const wk   = Math.ceil(((dt-jan4)/86400000 + jan4.getDay()+1)/7);
      const key  = dt.getFullYear()+'-W'+String(wk).padStart(2,'0');
      if(!weeks[key]) weeks[key]={sum:0,n:0,key};
      weeks[key].sum += parseFloat(e.w);
      weeks[key].n++;
    });
    return Object.values(weeks).sort(function(a,b){return a.key.localeCompare(b.key);}).map(function(w){
      return {key:w.key, avg:(w.sum/w.n).toFixed(2)};
    });
  }

  // Draw chart
  function drawChart(data){
    const canvas = document.getElementById('wt-chart');
    if(!canvas) return;
    const ctx    = canvas.getContext('2d');
    const W = canvas.offsetWidth||300;
    canvas.width  = W * window.devicePixelRatio;
    canvas.height = 90 * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const cW = W, cH = 90;
    ctx.clearRect(0,0,cW,cH);

    const now   = new Date();
    const from  = new Date(now); from.setDate(from.getDate()-29);
    const pts   = data.filter(function(e){ return new Date(e.date+'T00:00:00') >= from; });
    if(pts.length < 2){ ctx.fillStyle='rgba(255,255,255,.2)'; ctx.font='11px monospace'; ctx.fillText('Pas assez de données (besoin de 2+ entrées sur 30 jours)',10,50); return; }

    const weights = pts.map(function(e){ return parseFloat(e.w); });
    const minW = Math.min.apply(null,weights)-0.5;
    const maxW = Math.max.apply(null,weights)+0.5;
    const pad  = {t:8,r:8,b:20,l:32};

    function xFor(date){ return pad.l + ((new Date(date+'T00:00:00')-from)/((now-from)||1)) * (cW-pad.l-pad.r); }
    function yFor(w)   { return pad.t + (1-(w-minW)/(maxW-minW)) * (cH-pad.t-pad.b); }

    // Grid lines
    ctx.strokeStyle='rgba(255,255,255,.06)'; ctx.lineWidth=1;
    [0,.25,.5,.75,1].forEach(function(f){
      const y = pad.t + f*(cH-pad.t-pad.b);
      ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(cW-pad.r,y); ctx.stroke();
    });

    // Y labels
    ctx.fillStyle='rgba(255,255,255,.3)'; ctx.font='8px monospace'; ctx.textAlign='right';
    [0,.5,1].forEach(function(f){
      const w = minW + f*(maxW-minW);
      const y = pad.t + (1-f)*(cH-pad.t-pad.b);
      ctx.fillText(w.toFixed(1),pad.l-3,y+3);
    });

    // Goal line
    if(getGoal() >= minW && getGoal() <= maxW){
      ctx.strokeStyle='rgba(255,200,60,.25)'; ctx.lineWidth=1; ctx.setLineDash([3,4]);
      const gy = yFor(getGoal());
      ctx.beginPath(); ctx.moveTo(pad.l,gy); ctx.lineTo(cW-pad.r,gy); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Area fill
    const grad = ctx.createLinearGradient(0,pad.t,0,cH-pad.b);
    grad.addColorStop(0,'rgba(80,200,120,.25)');
    grad.addColorStop(1,'rgba(80,200,120,.02)');
    ctx.beginPath();
    pts.forEach(function(e,i){ i===0 ? ctx.moveTo(xFor(e.date),yFor(parseFloat(e.w))) : ctx.lineTo(xFor(e.date),yFor(parseFloat(e.w))); });
    ctx.lineTo(xFor(pts[pts.length-1].date), cH-pad.b);
    ctx.lineTo(xFor(pts[0].date), cH-pad.b);
    ctx.closePath(); ctx.fillStyle=grad; ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle='rgba(80,200,120,.9)'; ctx.lineWidth=1.5; ctx.setLineDash([]);
    pts.forEach(function(e,i){ i===0 ? ctx.moveTo(xFor(e.date),yFor(parseFloat(e.w))) : ctx.lineTo(xFor(e.date),yFor(parseFloat(e.w))); });
    ctx.stroke();

    // Dots
    pts.forEach(function(e){
      ctx.beginPath();
      ctx.arc(xFor(e.date),yFor(parseFloat(e.w)),2.5,0,Math.PI*2);
      ctx.fillStyle='#50c878'; ctx.fill();
    });

    // X axis labels (first + last)
    ctx.fillStyle='rgba(255,255,255,.3)'; ctx.font='8px monospace'; ctx.textAlign='center';
    const fmt = function(d){ return new Date(d+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'}); };
    ctx.fillText(fmt(pts[0].date), xFor(pts[0].date), cH-4);
    if(pts.length>1) ctx.fillText(fmt(pts[pts.length-1].date), xFor(pts[pts.length-1].date), cH-4);
  }

  window.wtAdd = function(){
    const dateEl = document.getElementById('wt-date');
    const wEl    = document.getElementById('wt-weight');
    const dateVal = dateEl.value;
    const wVal    = parseFloat(wEl.value);
    if(!dateVal || isNaN(wVal) || wVal<30 || wVal>200){
      if(typeof showToast==='function') showToast('Vérifie la date et le poids');
      return;
    }
    const prev = getLast();
    const d = load();
    const idx = d.findIndex(function(e){ return e.date===dateVal; });
    if(idx>=0){ d[idx].w=wVal; } else { d.push({date:dateVal,w:wVal}); }
    d.sort(function(a,b){ return a.date.localeCompare(b.date); });
    save(d);
    // Sync sc-poids + macros
    const sp = document.getElementById('sc-poids');
    if(sp){ sp.value=wVal; sp.dispatchEvent(new Event('change')); }
    // Check palier unlock
    if(prev !== null){
      getPaliers(getGoal()).forEach(function(p){
        if(prev < p && wVal >= p && typeof showToast==='function'){
          showToast('🏆 Palier '+p+'kg atteint !');
        }
      });
    }
    wEl.value='';
    render();
  };

  window.wtReset = function(){
    if(!confirm('Supprimer tout l\'historique de poids ?')) return;
    localStorage.removeItem(LS_KEY);
    render();
  };

  // ── Pesée rapide depuis le dashboard (1 geste, date = aujourd'hui) ──
  window.wtQuickAdd = function(val){
    const wVal = parseFloat(val);
    if(isNaN(wVal) || wVal<30 || wVal>200){
      if(typeof showToast==='function') showToast('Poids invalide');
      return false;
    }
    const now = new Date();
    const dateVal = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0');
    const prev = getLast();
    const d = load();
    const idx = d.findIndex(function(e){ return e.date===dateVal; });
    if(idx>=0){ d[idx].w=wVal; } else { d.push({date:dateVal,w:wVal}); }
    d.sort(function(a,b){ return a.date.localeCompare(b.date); });
    save(d);
    // Sync champ nutrition
    const sp = document.getElementById('sc-poids');
    if(sp){ sp.value=wVal; sp.dispatchEvent(new Event('change')); }
    // Paliers
    if(prev !== null){
      getPaliers(getGoal()).forEach(function(p){
        if(prev < p && wVal >= p && typeof showToast==='function') showToast('🏆 Palier '+p+'kg atteint !');
      });
    }
    if(typeof showToast==='function') showToast('Poids enregistré : '+wVal+' kg ✓');
    if(typeof render==='function') render();
    if(typeof renderDashHero==='function') renderDashHero();
    return true;
  };

  window.wtDeleteEntry = function(date){
    save(load().filter(function(e){ return e.date!==date; }));
    render();
  };

  window.wtExportCSV = function(){
    const d = load();
    if(!d.length){ if(typeof showToast==='function') showToast('Aucune donnée à exporter'); return; }
    let csv = 'date,poids_kg\n';
    d.forEach(function(e){ csv += e.date+','+e.w+'\n'; });
    const blob = new Blob([csv],{type:'text/csv'});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href=url; a.download='poids_'+new Date().toISOString().split('T')[0]+'.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  function render(){
    const data    = load();
    const last    = getLast();
    const start   = getStart();
    const current = last!==null ? last : start;
    const gained  = parseFloat((current-start).toFixed(2));
    const toGo    = Math.max(0, getGoal()-current);
    const range   = getGoal() - start;
    const pct     = range>0 ? Math.min(100,Math.max(0,(current-start)/range*100)) : 0;
    const rate    = getWeeklyRate();

    // Stats
    const stats = document.getElementById('wt-stats');
    if(stats){
      function sc(lbl,val,color,sub){
        return '<div style="background:var(--s2);border:1px solid var(--b1);border-radius:var(--r);padding:8px 12px">'
          +'<div style="font-family:var(--mono);font-size:8px;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px">'+lbl+'</div>'
          +'<div style="font-family:var(--mono);font-size:15px;font-weight:700;color:'+(color||'var(--t1)')+'">'+val+'</div>'
          +(sub?'<div style="font-family:var(--mono);font-size:8px;color:var(--t3);margin-top:2px">'+sub+'</div>':'')
          +'</div>';
      }
      const rateStr = rate!==null ? (rate>0?'+':'')+rate.toFixed(2)+'kg/sem' : '—';
      const rateColor = rate===null?'var(--t3)': rate>=0.2&&rate<=0.4?'var(--green)': rate>0.4?'var(--yellow)':'var(--red)';
      stats.innerHTML =
        sc('Poids actuel', current.toFixed(1)+' kg') +
        sc('Pris depuis début', (gained>=0?'+':'')+gained+' kg', gained>=0?'var(--green)':'var(--red)') +
        sc('Reste avant '+getGoal()+'kg', toGo.toFixed(1)+' kg', toGo<=0?'var(--green)':'var(--yellow)') +
        sc('Rythme', rateStr, rateColor, data.length<2?'besoin 2+ entrées':'');
    }

    // Bar
    const bar    = document.getElementById('wt-bar');
    const pctLbl = document.getElementById('wt-pct-lbl');
    const stLbl  = document.getElementById('wt-start-lbl');
    if(bar)    bar.style.width = pct.toFixed(1)+'%';
    if(pctLbl) pctLbl.textContent = pct.toFixed(0)+'%';
    if(stLbl)  stLbl.textContent  = start.toFixed(1)+' kg';

    // Paliers
    const palEl = document.getElementById('wt-paliers');
    if(palEl){
      palEl.innerHTML = getPaliers(getGoal()).map(function(p){
        const done    = current >= p;
        const active  = !done && current >= (getPaliers(getGoal())[getPaliers(getGoal()).indexOf(p)-1]||0);
        const bg      = done?'var(--green)': active?'var(--s4)':'var(--s2)';
        const color   = done?'#000': active?'var(--t1)':'var(--t3)';
        const border  = done?'var(--green)': active?'var(--b3)':'var(--b1)';
        return '<div style="background:'+bg+';color:'+color+';border:1px solid '+border+';border-radius:var(--r);padding:4px 10px;font-family:var(--mono);font-size:10px;font-weight:600">'
          +(done?'✓ ':active?'→ ':'')+p+'kg'
          +'</div>';
      }).join('');
    }

    // Speed indicator
    const speedEl = document.getElementById('wt-speed');
    if(speedEl && rate!==null){
      if(rate >= 0.2 && rate <= 0.4){
        speedEl.innerHTML = '<span style="color:var(--green)">✓ Rythme idéal (0.2–0.4 kg/sem)</span>';
      } else if(rate > 0.4){
        speedEl.innerHTML = '<span style="color:var(--yellow)">⚠ Trop rapide ('+rate.toFixed(2)+'kg/sem) — risque de prise de gras</span>';
      } else if(rate > 0 && rate < 0.2){
        speedEl.innerHTML = '<span style="color:var(--yellow)">↑ Trop lent ('+rate.toFixed(2)+'kg/sem) — augmente le surplus</span>';
      } else {
        speedEl.innerHTML = '<span style="color:var(--red)">⚠ Stagnation ou perte — vérifie ton plan</span>';
      }
    } else if(speedEl) {
      speedEl.innerHTML = '<span style="color:var(--t3)">Ajoute 2+ entrées pour l\'indicateur de vitesse</span>';
    }

    // Projection
    const proj = document.getElementById('wt-projection');
    if(proj){
      if(toGo<=0){
        proj.textContent='🏆 Objectif 83kg atteint !'; proj.style.color='var(--green)';
      } else if(rate!==null && rate>0){
        const weeksLeft = toGo/rate;
        const eta = new Date(); eta.setDate(eta.getDate()+Math.round(weeksLeft*7));
        const etaStr = eta.toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});
        proj.textContent = 'Projection → '+getGoal()+'kg vers le '+etaStr+' (~'+Math.round(weeksLeft)+' semaines)';
        proj.style.color='var(--yellow)';
      } else {
        proj.textContent=''; 
      }
    }

    // Last seen
    const lastSeen = document.getElementById('wt-last-seen');
    if(lastSeen){
      if(data.length){
        const lastDate = new Date(data[data.length-1].date+'T00:00:00');
        const diffD    = Math.floor((new Date()-lastDate)/86400000);
        if(diffD===0)       lastSeen.textContent='Pesé aujourd\'hui';
        else if(diffD===1)  lastSeen.textContent='Pesé hier';
        else                lastSeen.textContent='Dernier pesage il y a '+diffD+' jours';
        lastSeen.style.color = diffD > 5 ? 'var(--red)' : diffD > 2 ? 'var(--yellow)' : 'var(--green)';
      } else {
        lastSeen.textContent=''; 
      }
    }

    // Weekly avg
    const wkAvgEl = document.getElementById('wt-weekly-avg');
    if(wkAvgEl){
      const avgs = getWeeklyAvgs();
      if(avgs.length >= 2){
        const last2 = avgs.slice(-2);
        const diff  = (parseFloat(last2[1].avg)-parseFloat(last2[0].avg)).toFixed(2);
        const sign  = diff>=0?'+':'';
        wkAvgEl.textContent = last2[1].avg+'kg cette semaine ('+sign+diff+' vs semaine préc.)';
      } else if(avgs.length===1){
        wkAvgEl.textContent = avgs[0].avg+'kg (semaine en cours)';
      } else {
        wkAvgEl.textContent = '—';
      }
    }

    // Chart
    drawChart(data);

    // Log
    const logEl = document.getElementById('wt-log');
    if(logEl){
      if(!data.length){
        logEl.innerHTML='<div style="font-size:12px;color:var(--t3);text-align:center;padding:16px">Aucune entrée. Pèse-toi le matin à jeun et ajoute ton poids.</div>';
      } else {
        logEl.innerHTML = data.slice().reverse().map(function(e,i,arr){
          const prev = arr[i+1];
          let delta  = '';
          if(prev){
            const diff = (parseFloat(e.w)-parseFloat(prev.w)).toFixed(2);
            const col  = diff>=0?'var(--green)':'var(--red)';
            delta = '<span style="font-family:var(--mono);font-size:10px;color:'+col+'">'+(diff>=0?'+':'')+diff+'kg</span>';
          }
          const dStr = new Date(e.date+'T00:00:00').toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
          return '<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 10px;background:var(--s2);border:1px solid var(--b1);border-radius:var(--r)">'
            +'<span style="font-family:var(--mono);font-size:10px;color:var(--t3)">'+dStr+'</span>'
            +'<div style="display:flex;align-items:center;gap:12px">'
            +delta
            +'<span style="font-family:var(--mono);font-size:13px;font-weight:600;color:var(--t1)">'+parseFloat(e.w).toFixed(1)+' kg</span>'
            +'<button onclick="wtDeleteEntry(\''+e.date+'\')" style="font-size:10px;color:var(--t3);background:none;border:none;cursor:pointer;padding:2px 5px;line-height:1">✕</button>'
            +'</div>'
            +'</div>';
        }).join('');
      }
    }
  }

  function drawChart(data){
    const canvas = document.getElementById('wt-chart');
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const W   = canvas.offsetWidth || 300;
    canvas.width  = W * (window.devicePixelRatio||1);
    canvas.height = 90 * (window.devicePixelRatio||1);
    ctx.scale(window.devicePixelRatio||1, window.devicePixelRatio||1);
    const cW=W, cH=90;
    ctx.clearRect(0,0,cW,cH);
    const now  = new Date();
    const from = new Date(now); from.setDate(from.getDate()-29);
    const pts  = data.filter(function(e){ return new Date(e.date+'T00:00:00') >= from; });
    if(pts.length<2){
      ctx.fillStyle='rgba(255,255,255,.2)'; ctx.font='10px monospace';
      ctx.fillText('Besoin de 2+ entrées sur 30 jours',10,48); return;
    }
    const weights = pts.map(function(e){ return parseFloat(e.w); });
    const minW = Math.min.apply(null,weights)-0.3;
    const maxW = Math.max.apply(null,weights)+0.3;
    const pad  = {t:6,r:6,b:18,l:30};
    function xFor(d){ return pad.l+((new Date(d+'T00:00:00')-from)/((now-from)||1))*(cW-pad.l-pad.r); }
    function yFor(w){ return pad.t+(1-(w-minW)/(maxW-minW))*(cH-pad.t-pad.b); }
    // Grid
    ctx.strokeStyle='rgba(255,255,255,.05)'; ctx.lineWidth=1;
    [0,.5,1].forEach(function(f){
      const y=pad.t+f*(cH-pad.t-pad.b);
      ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(cW-pad.r,y); ctx.stroke();
    });
    // Y labels
    ctx.fillStyle='rgba(255,255,255,.25)'; ctx.font='7px monospace'; ctx.textAlign='right';
    [0,.5,1].forEach(function(f){
      const w=minW+f*(maxW-minW);
      ctx.fillText(w.toFixed(1),pad.l-2,pad.t+(1-f)*(cH-pad.t-pad.b)+3);
    });
    // Goal line
    if(getGoal()>=minW && getGoal()<=maxW){
      ctx.strokeStyle='rgba(255,200,60,.2)'; ctx.lineWidth=1;
      ctx.setLineDash([3,4]);
      const gy=yFor(getGoal());
      ctx.beginPath(); ctx.moveTo(pad.l,gy); ctx.lineTo(cW-pad.r,gy); ctx.stroke();
      ctx.setLineDash([]);
    }
    // Area
    const grad=ctx.createLinearGradient(0,pad.t,0,cH-pad.b);
    grad.addColorStop(0,'rgba(80,200,120,.2)'); grad.addColorStop(1,'rgba(80,200,120,.01)');
    ctx.beginPath();
    pts.forEach(function(e,i){ i===0?ctx.moveTo(xFor(e.date),yFor(parseFloat(e.w))):ctx.lineTo(xFor(e.date),yFor(parseFloat(e.w))); });
    ctx.lineTo(xFor(pts[pts.length-1].date),cH-pad.b);
    ctx.lineTo(xFor(pts[0].date),cH-pad.b);
    ctx.closePath(); ctx.fillStyle=grad; ctx.fill();
    // Line
    ctx.beginPath(); ctx.strokeStyle='#50c878'; ctx.lineWidth=1.5; ctx.setLineDash([]);
    pts.forEach(function(e,i){ i===0?ctx.moveTo(xFor(e.date),yFor(parseFloat(e.w))):ctx.lineTo(xFor(e.date),yFor(parseFloat(e.w))); });
    ctx.stroke();
    // Dots
    pts.forEach(function(e){
      ctx.beginPath(); ctx.arc(xFor(e.date),yFor(parseFloat(e.w)),2,0,Math.PI*2);
      ctx.fillStyle='#50c878'; ctx.fill();
    });
    // X labels
    ctx.fillStyle='rgba(255,255,255,.25)'; ctx.font='7px monospace'; ctx.textAlign='center';
    const fmt=function(d){ return new Date(d+'T00:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'short'}); };
    ctx.fillText(fmt(pts[0].date),xFor(pts[0].date),cH-3);
    if(pts.length>1) ctx.fillText(fmt(pts[pts.length-1].date),xFor(pts[pts.length-1].date),cH-3);
  }

  function init(){
    const el=document.getElementById('wt-mod');
    if(!el){ setTimeout(init,200); return; }
    const di=document.getElementById('wt-date');
    if(di) di.value=new Date().toISOString().split('T')[0];
    render();
    // Redraw chart on resize
    window.addEventListener('resize',function(){ drawChart(load()); });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();
