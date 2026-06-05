/* ============================================================
   PHOTO PROGRESS MODULE — Suivi photo de progression
   Stockage : IndexedDB (persistant, gros volume, hors localStorage)
   Compression automatique des images avant stockage.
   Auto-injecté : ajoute un onglet "Photos" + sa page.
   ============================================================ */
(function(){
  'use strict';

  const DB_NAME = 'sbt-photos';
  const STORE   = 'photos';
  const POSES   = [
    {key:'face',     label:'Face (repos)'},
    {key:'profil',   label:'Profil (repos)'},
    {key:'dos',      label:'Dos (repos)'},
    {key:'faceFlex', label:'Face (flex)'},
    {key:'biceps',   label:'Biceps (flex)'},
    {key:'dosFlex',  label:'Dos (flex)'}
  ];
  const POSE_KEYS = POSES.map(p=>p.key);

  // ───────── IndexedDB helpers ─────────
  let _db = null;
  function openDB(){
    return new Promise((resolve,reject)=>{
      if(_db) return resolve(_db);
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = e=>{
        const db = e.target.result;
        if(!db.objectStoreNames.contains(STORE)){
          const os = db.createObjectStore(STORE, {keyPath:'id'});
          os.createIndex('date','date',{unique:false});
        }
      };
      req.onsuccess = e=>{ _db=e.target.result; resolve(_db); };
      req.onerror   = e=>reject(e.target.error);
    });
  }
  async function dbPut(rec){
    const db=await openDB();
    return new Promise((res,rej)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(rec);
      tx.oncomplete=()=>res(); tx.onerror=e=>rej(e.target.error);
    });
  }
  async function dbAll(){
    const db=await openDB();
    return new Promise((res,rej)=>{
      const tx=db.transaction(STORE,'readonly');
      const req=tx.objectStore(STORE).getAll();
      req.onsuccess=()=>res(req.result||[]); req.onerror=e=>rej(e.target.error);
    });
  }
  async function dbDel(id){
    const db=await openDB();
    return new Promise((res,rej)=>{
      const tx=db.transaction(STORE,'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete=()=>res(); tx.onerror=e=>rej(e.target.error);
    });
  }

  // ───────── Compression image ─────────
  function compressImage(file, maxDim=1280, quality=0.82){
    return new Promise((resolve,reject)=>{
      const img=new Image();
      const url=URL.createObjectURL(file);
      img.onload=()=>{
        let {width:w,height:h}=img;
        if(w>h && w>maxDim){ h=Math.round(h*maxDim/w); w=maxDim; }
        else if(h>=w && h>maxDim){ w=Math.round(w*maxDim/h); h=maxDim; }
        const c=document.createElement('canvas'); c.width=w; c.height=h;
        c.getContext('2d').drawImage(img,0,0,w,h);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror=e=>{ URL.revokeObjectURL(url); reject(e); };
      img.src=url;
    });
  }

  // ───────── CSS ─────────
  const css = `
    .pp-wrap{max-width:900px;margin:0 auto}
    .pp-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:6px}
    .pp-sub{font-family:var(--mono);font-size:10px;color:var(--t3);margin-bottom:18px;line-height:1.5}
    .pp-add-card{background:var(--s2);border:1px dashed var(--b3);border-radius:var(--r2,12px);padding:16px;margin-bottom:20px}
    .pp-add-title{font-family:var(--font);font-size:12px;font-weight:600;color:var(--t1);margin-bottom:4px}
    .pp-add-hint{font-family:var(--mono);font-size:9px;color:var(--t3);margin-bottom:12px}
    .pp-pose-row{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .pp-pose-slot{position:relative;aspect-ratio:3/4;border-radius:10px;overflow:hidden;background:var(--s3);border:1px solid var(--b1);cursor:pointer;display:flex;align-items:center;justify-content:center;transition:border-color .15s}
    .pp-pose-slot:hover{border-color:var(--b3)}
    .pp-pose-slot img{width:100%;height:100%;object-fit:cover}
    .pp-pose-slot .pp-plus{display:flex;flex-direction:column;align-items:center;gap:4px;color:var(--t3)}
    .pp-pose-slot .pp-plus span{font-size:22px;line-height:1}
    .pp-pose-slot .pp-plus small{font-family:var(--mono);font-size:9px;text-transform:uppercase;letter-spacing:.06em}
    .pp-pose-slot input{display:none}
    .pp-pose-lbl{position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,.6));color:#fff;font-family:var(--mono);font-size:9px;padding:8px 6px 4px;text-align:center;text-transform:uppercase;letter-spacing:.05em}
    .pp-save-row{display:flex;align-items:center;gap:10px;margin-top:12px;flex-wrap:wrap}
    .pp-save-btn{background:var(--t1);color:#000;border:none;border-radius:8px;font-family:var(--font);font-weight:600;font-size:12px;padding:9px 18px;cursor:pointer;transition:opacity .15s}
    .pp-save-btn:hover{opacity:.85}
    .pp-save-btn:disabled{opacity:.4;cursor:not-allowed}
    .pp-date-inp{background:var(--s3);border:1px solid var(--b2);color:var(--t1);font-family:var(--mono);font-size:11px;padding:8px 10px;border-radius:8px}
    .pp-weight-inp{background:var(--s3);border:1px solid var(--b2);color:var(--t1);font-family:var(--mono);font-size:11px;padding:8px 10px;border-radius:8px;width:92px}
    .pp-weight-inp:focus{border-color:var(--b3);outline:none}
    .pp-weight-wrap{position:relative;display:inline-flex;align-items:center}
    .pp-weight-wrap::after{content:'kg';position:absolute;right:10px;font-family:var(--mono);font-size:10px;color:var(--t3);pointer-events:none}
    .pp-weight-inp{padding-right:26px}
    .pp-entry-weight{font-family:var(--mono);font-size:11px;color:#c6a05a;font-weight:500}
    .pp-entry-wdelta{font-family:var(--mono);font-size:9px;margin-left:6px}
    .pp-wd-up{color:var(--green,#4ade80)}.pp-wd-dn{color:var(--red,#f87171)}.pp-wd-eq{color:var(--t3)}

    /* graphe poids */
    .pp-wgraph-card{background:var(--s2);border:1px solid var(--b1);border-radius:12px;padding:14px 16px;margin:18px 0}
    .pp-wgraph-hd{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:6px}
    .pp-wgraph-ttl{font-family:var(--font);font-size:12px;font-weight:600;color:var(--t1)}
    .pp-wgraph-now{font-family:var(--mono);font-size:9px;color:var(--t3)}
    .pp-wgraph-now b{color:#c6a05a;font-size:13px}
    .pp-wgraph-svg{width:100%;height:120px;display:block;overflow:visible}
    .pp-wgraph-empty{font-family:var(--mono);font-size:10px;color:var(--t3);text-align:center;padding:14px 0}

    .pp-timeline-title{font-family:var(--font);font-size:13px;font-weight:600;color:var(--t1);margin:22px 0 12px;display:flex;align-items:center;gap:8px}
    .pp-timeline-title::before{content:'';width:3px;height:14px;background:var(--t1);border-radius:2px}
    .pp-entry{background:var(--s2);border:1px solid var(--b1);border-radius:12px;padding:12px;margin-bottom:12px}
    .pp-entry-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
    .pp-entry-date{font-family:var(--font);font-size:12px;font-weight:600;color:var(--t1)}
    .pp-entry-meta{font-family:var(--mono);font-size:9px;color:var(--t3)}
    .pp-entry-imgs{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
    .pp-entry-img{aspect-ratio:3/4;border-radius:8px;overflow:hidden;background:var(--s3);cursor:pointer;position:relative}
    .pp-entry-img img{width:100%;height:100%;object-fit:cover}
    .pp-entry-img .pp-empty{display:flex;align-items:center;justify-content:center;height:100%;font-family:var(--mono);font-size:9px;color:var(--t3)}
    .pp-del-entry{background:none;border:1px solid var(--b2);color:var(--t3);font-size:11px;border-radius:6px;padding:3px 8px;cursor:pointer}
    .pp-del-entry:hover{color:var(--red,#f87171);border-color:var(--red,#f87171)}

    .pp-cmp-bar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:18px 0 10px}
    .pp-cmp-bar select{background:var(--s3);border:1px solid var(--b2);color:var(--t1);font-family:var(--mono);font-size:11px;padding:7px 9px;border-radius:8px}
    .pp-cmp-bar .pp-cmp-lbl{font-family:var(--mono);font-size:9px;color:var(--t3);text-transform:uppercase}
    .pp-cmp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .pp-cmp-col{background:var(--s2);border:1px solid var(--b1);border-radius:12px;padding:10px}
    .pp-cmp-col h4{font-family:var(--mono);font-size:10px;color:var(--t2);margin:0 0 8px;text-align:center}
    .pp-cmp-col .pp-cmp-img{aspect-ratio:3/4;border-radius:8px;overflow:hidden;background:var(--s3)}
    .pp-cmp-col .pp-cmp-img img{width:100%;height:100%;object-fit:cover}
    .pp-empty-state{text-align:center;padding:40px 20px;color:var(--t3);font-family:var(--mono);font-size:11px;line-height:1.7}

    .pp-light{position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,.9);display:none;align-items:center;justify-content:center;padding:20px}
    .pp-light img{max-width:100%;max-height:100%;object-fit:contain;border-radius:8px}
    .pp-light .pp-close{position:absolute;top:16px;right:16px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;width:34px;height:34px;border-radius:8px;cursor:pointer;font-size:16px}

    @media(max-width:560px){
      .pp-cmp-grid{grid-template-columns:1fr 1fr}
      .pp-pose-row{grid-template-columns:repeat(3,1fr)}
    }
  `;
  const st=document.createElement('style'); st.id='pp-styles'; st.textContent=css; document.head.appendChild(st);

  // ───────── État du formulaire d'ajout ─────────
  const draft = {}; POSE_KEYS.forEach(k=>draft[k]=null);

  // ───────── Injection onglet ─────────
  function injectTab(){
    const tabs=document.querySelector('.nav-tabs');
    if(!tabs || document.getElementById('tab-photos')) return;
    const btn=document.createElement('button');
    btn.className='tab'; btn.id='tab-photos';
    btn.setAttribute('onclick','goPhotos(this)');
    btn.innerHTML='<svg class="tab-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg><span class="tab-lbl">Photos</span>';
    tabs.appendChild(btn);
  }

  // ───────── Injection page ─────────
  function injectPage(){
    if(document.getElementById('page-photos')) return;
    const ref=document.getElementById('page-nutrition')||document.querySelector('.page');
    const page=document.createElement('div');
    page.className='page'; page.id='page-photos';
    page.innerHTML=`<div class="wrap"><div class="pp-wrap">
      <div class="pp-head"><div class="pg-title">📸 <b>Suivi photo</b></div>
        <div style="display:flex;gap:6px;align-items:center">
          <span style="font-family:var(--mono);font-size:9px;color:var(--t3)">Sauvegarde incluse dans</span>
          <button class="pp-save-btn" style="background:var(--s3);color:var(--t1);border:1px solid var(--b2);font-weight:500;font-size:11px;padding:7px 12px" onclick="openBackup()">⬇ Sauvegarde générale</button>
        </div>
      </div>
      <div class="pp-sub">Prends tes photos dans les mêmes conditions à chaque fois : même angle, même lumière, même heure (idéalement à jeun le matin). C'est la seule mesure honnête de tes progrès.</div>

      <div class="pp-add-card">
        <div class="pp-add-title">Nouvelle série</div>
        <div class="pp-add-hint">Ajoute une ou plusieurs poses, puis enregistre. Les images sont compressées et stockées sur ton appareil.</div>
        <div class="pp-pose-row" id="pp-draft-row"></div>
        <div class="pp-save-row">
          <input type="date" id="pp-date" class="pp-date-inp"/>
          <span class="pp-weight-wrap"><input type="number" inputmode="decimal" step="0.1" id="pp-weight" class="pp-weight-inp" placeholder="Poids"/></span>
          <button class="pp-save-btn" id="pp-save" disabled>Enregistrer cette série</button>
        </div>
      </div>

      <div id="pp-weight-graph"></div>

      <div id="pp-compare-zone"></div>

      <div class="pp-timeline-title">Historique</div>
      <div id="pp-timeline"></div>
    </div></div>

    <div class="pp-light" id="pp-light"><button class="pp-close" onclick="ppCloseLight()">✕</button><img id="pp-light-img"/></div>`;
    ref.parentNode.insertBefore(page, ref.nextSibling);
  }

  function renderDraft(){
    const row=document.getElementById('pp-draft-row'); if(!row) return;
    row.innerHTML=POSES.map(p=>`
      <label class="pp-pose-slot">
        ${draft[p.key]
          ? `<img src="${draft[p.key]}"/>`
          : `<div class="pp-plus"><span>+</span><small>${p.label}</small></div>`}
        <div class="pp-pose-lbl">${p.label}</div>
        <input type="file" accept="image/*" data-pose="${p.key}"/>
      </label>`).join('');
    row.querySelectorAll('input[type=file]').forEach(inp=>{
      inp.addEventListener('change', async e=>{
        const f=e.target.files[0]; if(!f) return;
        try{
          draft[e.target.dataset.pose]=await compressImage(f);
          renderDraft();
          document.getElementById('pp-save').disabled = !POSE_KEYS.some(k=>draft[k]);
        }catch(err){ alert("Erreur lors du chargement de l'image."); }
      });
    });
  }

  async function saveDraft(){
    if(!POSE_KEYS.some(k=>draft[k])) return;
    const dateInp=document.getElementById('pp-date');
    const date = dateInp.value || new Date().toISOString().slice(0,10);
    const wInp=document.getElementById('pp-weight');
    const weight = wInp && wInp.value ? parseFloat(wInp.value) : null;
    const rec={ id:'p_'+Date.now(), date, weight, created:Date.now() };
    POSE_KEYS.forEach(k=>{ rec[k]=draft[k]||null; });
    await dbPut(rec);
    // Synchronise avec le tracker de poids global (dashboard "Poids actuel")
    if(weight && !isNaN(weight)) syncWeightEntry(date, weight);
    POSE_KEYS.forEach(k=>draft[k]=null);
    if(wInp) wInp.value='';
    renderDraft();
    document.getElementById('pp-save').disabled=true;
    await renderTimeline();
    await renderCompare();
    renderWeightGraph();
  }

  // Écrit le poids dans wtEntries2 (partagé avec le dashboard), 1 entrée par date
  // IMPORTANT : le reste de l'app lit le poids via la clé `.w` → on écrit `.w` (et on
  // nettoie un éventuel ancien `.kg` pour rester cohérent).
  function syncWeightEntry(date, weight){
    try{
      let arr=JSON.parse(localStorage.getItem('wtEntries2')||'[]');
      if(!Array.isArray(arr)) arr=[];
      const i=arr.findIndex(e=>e && e.date===date);
      if(i>=0){ arr[i].w=weight; if('kg' in arr[i]) delete arr[i].kg; }
      else arr.push({date, w:weight});
      arr.sort((a,b)=>a.date.localeCompare(b.date));
      if(typeof safeSetItem==='function') safeSetItem('wtEntries2', JSON.stringify(arr));
      else localStorage.setItem('wtEntries2', JSON.stringify(arr));
    }catch(e){}
  }

  function fmtDate(d){
    try{ return new Date(d+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}); }
    catch(e){ return d; }
  }

  async function renderTimeline(){
    const el=document.getElementById('pp-timeline'); if(!el) return;
    const all=(await dbAll()).sort((a,b)=>b.date.localeCompare(a.date)||b.created-a.created);
    if(!all.length){
      el.innerHTML=`<div class="pp-empty-state">Aucune photo pour l'instant.<br>Ajoute ta première série ci-dessus pour démarrer ta référence.</div>`;
      return;
    }
    // pour le delta : on compare au poids de la série chronologiquement précédente
    const chrono=all.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.created-b.created);
    el.innerHTML=all.map(rec=>{
      let weightHTML='';
      if(rec.weight!=null && !isNaN(rec.weight)){
        // trouver la série précédente AYANT un poids
        const idx=chrono.findIndex(r=>r.id===rec.id);
        let prevW=null;
        for(let i=idx-1;i>=0;i--){ if(chrono[i].weight!=null && !isNaN(chrono[i].weight)){ prevW=chrono[i].weight; break; } }
        let delta='';
        if(prevW!=null){
          const d=+(rec.weight-prevW).toFixed(1);
          delta = d>0 ? `<span class="pp-entry-wdelta pp-wd-up">↑ +${d}kg</span>`
                : d<0 ? `<span class="pp-entry-wdelta pp-wd-dn">↓ ${d}kg</span>`
                : `<span class="pp-entry-wdelta pp-wd-eq">= stable</span>`;
        }
        weightHTML=`<span class="pp-entry-weight">${rec.weight}kg</span>${delta}`;
      }
      return `
      <div class="pp-entry">
        <div class="pp-entry-hd">
          <div><div class="pp-entry-date">${fmtDate(rec.date)}</div>${weightHTML?`<div style="margin-top:3px">${weightHTML}</div>`:''}</div>
          <button class="pp-del-entry" onclick="ppDelEntry('${rec.id}')">Supprimer</button>
        </div>
        <div class="pp-entry-imgs">
          ${POSES.map(p=>rec[p.key]
            ? `<div class="pp-entry-img" onclick="ppOpenLight('${rec.id}','${p.key}')"><img src="${rec[p.key]}"/></div>`
            : `<div class="pp-entry-img"><div class="pp-empty">${p.label}<br>—</div></div>`).join('')}
        </div>
      </div>`;
    }).join('');
  }

  // ───────── Graphe d'évolution du poids ─────────
  async function renderWeightGraph(){
    const host=document.getElementById('pp-weight-graph'); if(!host) return;
    const all=(await dbAll()).filter(r=>r.weight!=null && !isNaN(r.weight))
                .sort((a,b)=>a.date.localeCompare(b.date)||a.created-b.created);
    if(all.length<1){ host.innerHTML=''; return; }
    const cur=all[all.length-1].weight;
    if(all.length<2){
      host.innerHTML=`<div class="pp-wgraph-card"><div class="pp-wgraph-hd"><span class="pp-wgraph-ttl">Évolution du poids</span><span class="pp-wgraph-now">actuel <b>${cur}kg</b></span></div><div class="pp-wgraph-empty">Ajoute au moins 2 pesées pour voir la courbe.</div></div>`;
      return;
    }
    const W=600, H=120, pad=8;
    const ws=all.map(r=>r.weight);
    const min=Math.min(...ws), max=Math.max(...ws);
    const range=(max-min)||1;
    const n=all.length;
    const x=i=>pad+(i*(W-2*pad)/(n-1));
    const y=w=>H-pad-((w-min)/range)*(H-2*pad);
    const pts=all.map((r,i)=>[x(i),y(r.weight)]);
    const line=pts.map((p,i)=>(i?'L':'M')+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ');
    const area=`M${pts[0][0].toFixed(1)} ${H-pad} `+pts.map(p=>'L'+p[0].toFixed(1)+' '+p[1].toFixed(1)).join(' ')+` L${pts[n-1][0].toFixed(1)} ${H-pad} Z`;
    const dots=pts.map((p,i)=>`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="${i===n-1?3.5:2.4}" fill="${i===n-1?'#e7c787':'#c6a05a'}"/>`).join('');
    const first=all[0].weight, totDelta=+(cur-first).toFixed(1);
    const deltaTxt = totDelta>0?`+${totDelta}kg depuis le début`:totDelta<0?`${totDelta}kg depuis le début`:'stable depuis le début';
    host.innerHTML=`
      <div class="pp-wgraph-card">
        <div class="pp-wgraph-hd">
          <span class="pp-wgraph-ttl">Évolution du poids</span>
          <span class="pp-wgraph-now">${deltaTxt} · actuel <b>${cur}kg</b></span>
        </div>
        <svg class="pp-wgraph-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
          <defs><linearGradient id="ppwg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#c6a05a" stop-opacity=".22"/>
            <stop offset="100%" stop-color="#c6a05a" stop-opacity="0"/>
          </linearGradient></defs>
          <path d="${area}" fill="url(#ppwg)"/>
          <path d="${line}" fill="none" stroke="#c6a05a" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>
          ${dots}
        </svg>
      </div>`;
  }

  // Garde une réf en mémoire pour la lightbox (évite de re-fetch)
  let _cache=[];
  async function refreshCache(){ _cache=await dbAll(); }

  async function renderCompare(){
    const zone=document.getElementById('pp-compare-zone'); if(!zone) return;
    await refreshCache();
    const all=_cache.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.created-b.created);
    if(all.length<2){ zone.innerHTML=''; return; }
    const opts=all.map((r,i)=>`<option value="${r.id}">${fmtDate(r.date)}</option>`).join('');
    zone.innerHTML=`
      <div class="pp-timeline-title" style="margin-top:10px">Comparer</div>
      <div class="pp-cmp-bar">
        <span class="pp-cmp-lbl">Pose</span>
        <select id="pp-cmp-pose">${POSES.map(p=>`<option value="${p.key}">${p.label}</option>`).join('')}</select>
        <span class="pp-cmp-lbl">Avant</span>
        <select id="pp-cmp-a">${opts}</select>
        <span class="pp-cmp-lbl">Après</span>
        <select id="pp-cmp-b">${opts}</select>
      </div>
      <div class="pp-cmp-grid" id="pp-cmp-grid"></div>`;
    const selA=document.getElementById('pp-cmp-a');
    const selB=document.getElementById('pp-cmp-b');
    selA.value=all[0].id; selB.value=all[all.length-1].id;
    function draw(){
      const pose=document.getElementById('pp-cmp-pose').value;
      const a=_cache.find(r=>r.id===selA.value);
      const b=_cache.find(r=>r.id===selB.value);
      document.getElementById('pp-cmp-grid').innerHTML=`
        <div class="pp-cmp-col"><h4>${a?fmtDate(a.date):'—'}</h4><div class="pp-cmp-img">${a&&a[pose]?`<img src="${a[pose]}"/>`:'<div class="pp-empty" style="display:flex;align-items:center;justify-content:center;height:100%;font-family:var(--mono);font-size:9px;color:var(--t3)">pas de photo</div>'}</div></div>
        <div class="pp-cmp-col"><h4>${b?fmtDate(b.date):'—'}</h4><div class="pp-cmp-img">${b&&b[pose]?`<img src="${b[pose]}"/>`:'<div class="pp-empty" style="display:flex;align-items:center;justify-content:center;height:100%;font-family:var(--mono);font-size:9px;color:var(--t3)">pas de photo</div>'}</div></div>`;
    }
    ['pp-cmp-pose','pp-cmp-a','pp-cmp-b'].forEach(id=>document.getElementById(id).addEventListener('change',draw));
    draw();
  }

  // ───────── API globale ─────────
  window.goPhotos=function(btn){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('on'));
    document.getElementById('page-photos').classList.add('on');
    if(btn) btn.classList.add('on');
    if(!document.getElementById('pp-date').value)
      document.getElementById('pp-date').value=new Date().toISOString().slice(0,10);
    renderDraft(); renderTimeline(); renderCompare(); renderWeightGraph();
  };
  window.ppDelEntry=async function(id){
    if(!confirm('Supprimer cette série de photos ? Action définitive.')) return;
    await dbDel(id); await renderTimeline(); await renderCompare(); renderWeightGraph();
  };
  window.ppOpenLight=function(id,pose){
    const rec=_cache.find(r=>r.id===id)|| null;
    if(!rec){ dbAll().then(all=>{ _cache=all; const r=all.find(x=>x.id===id); if(r&&r[pose]) showLight(r[pose]); }); return; }
    if(rec[pose]) showLight(rec[pose]);
  };
  function showLight(src){
    document.getElementById('pp-light-img').src=src;
    document.getElementById('pp-light').style.display='flex';
  }
  window.ppCloseLight=function(){ document.getElementById('pp-light').style.display='none'; };

  // ───────── Export / Import des photos (fichier dédié, car volumineux) ─────────
  window.ppExport=async function(){
    const all=await dbAll();
    if(!all.length){ alert('Aucune photo à exporter.'); return; }
    const data={ _type:'sbt-photos', _exported:new Date().toISOString(), photos:all };
    const blob=new Blob([JSON.stringify(data)],{type:'application/json'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const d=new Date();
    const ds=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
    a.href=url; a.download='sbt-photos_'+ds+'.json'; a.click();
    URL.revokeObjectURL(url);
  };
  window.ppImport=function(inp){
    const f=inp.files[0]; if(!f) return;
    const reader=new FileReader();
    reader.onload=async e=>{
      try{
        const data=JSON.parse(e.target.result);
        if(data._type!=='sbt-photos'||!Array.isArray(data.photos)) throw new Error('format');
        if(!confirm('Importer '+data.photos.length+' série(s) de photos ? Elles s\u2019ajoutent à tes photos actuelles.')) return;
        for(const rec of data.photos){ await dbPut(rec); if(rec.weight!=null && !isNaN(rec.weight)) syncWeightEntry(rec.date, rec.weight); }
        await renderTimeline(); await renderCompare(); renderWeightGraph();
        alert('Photos importées ✓');
      }catch(err){ alert('Fichier photo invalide.'); }
      inp.value='';
    };
    reader.readAsText(f);
  };

  // ── Helpers exposés pour la sauvegarde UNIFIÉE (site + photos en 1 fichier) ──
  window.ppGetAllRecords = async function(){ try{ return await dbAll(); }catch(e){ return []; } };
  window.ppRestoreRecords = async function(photos){
    if(!Array.isArray(photos)) return 0;
    let n=0;
    for(const rec of photos){
      try{ await dbPut(rec); if(rec.weight!=null && !isNaN(rec.weight)) syncWeightEntry(rec.date, rec.weight); n++; }catch(e){}
    }
    try{ await renderTimeline(); await renderCompare(); renderWeightGraph(); }catch(e){}
    return n;
  };

  // ───────── Boot ─────────
  function boot(){
    if(!document.querySelector('.nav-tabs')){ return setTimeout(boot,200); }
    injectTab();
    injectPage();
    const saveBtn=document.getElementById('pp-save');
    if(saveBtn) saveBtn.addEventListener('click', saveDraft);
    refreshCache();
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();

