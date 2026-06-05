/* ============================================================
   DIARY MODULE — Journal personnel
   Une entrée par jour (complétable), texte libre + humeur.
   Stockage : localStorage clé 'sbt-diary' (isolé de sbt6).
   Récap chronologique de toutes les entrées.
   Auto-injecté : ajoute un onglet "Journal+" + sa page.
   ============================================================ */
(function(){
  'use strict';

  const LS_KEY = 'sbt-diary';
  const MOODS = [
    {key:'top',    label:'Au top',   emoji:'🔥'},
    {key:'bien',   label:'Bien',     emoji:'🙂'},
    {key:'neutre', label:'Neutre',   emoji:'😐'},
    {key:'fatigue',label:'Fatigué',  emoji:'😮‍💨'},
    {key:'bas',    label:'Bas',      emoji:'😔'}
  ];

  function load(){
    try{ return JSON.parse(localStorage.getItem(LS_KEY)) || {}; }catch(e){ return {}; }
  }
  function save(obj){
    try{ localStorage.setItem(LS_KEY, JSON.stringify(obj)); }catch(e){}
  }
  function todayKey(){
    const d=new Date();
    return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  }
  function fmtDate(k){
    try{ return new Date(k+'T12:00:00').toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}); }
    catch(e){ return k; }
  }
  function fmtTime(ts){
    try{ return new Date(ts).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}); }
    catch(e){ return ''; }
  }
  function moodOf(k){ return MOODS.find(m=>m.key===k)||null; }

  // ───────── CSS ─────────
  const css = `
    .dy-wrap{max-width:760px;margin:0 auto}
    .dy-head{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:6px}
    .dy-sub{font-family:var(--mono);font-size:10px;color:var(--t3);margin-bottom:18px;line-height:1.5}
    .dy-editor{background:var(--s2);border:1px solid var(--b2);border-radius:var(--r2,12px);padding:16px;margin-bottom:24px}
    .dy-editor-date{font-family:var(--font);font-size:13px;font-weight:600;color:var(--t1);margin-bottom:12px;text-transform:capitalize}
    .dy-mood-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
    .dy-mood{display:flex;align-items:center;gap:6px;padding:7px 12px;border-radius:20px;background:var(--s3);border:1px solid var(--b1);color:var(--t2);font-family:var(--font);font-size:12px;cursor:pointer;transition:all .15s}
    .dy-mood:hover{border-color:var(--b3)}
    .dy-mood.on{background:var(--t1);color:#000;border-color:var(--t1);font-weight:600}
    .dy-mood .dy-em{font-size:15px;line-height:1}
    .dy-textarea{width:100%;min-height:120px;background:var(--s3);border:1px solid var(--b2);color:var(--t1);font-family:var(--font);font-size:14px;line-height:1.6;padding:12px;border-radius:10px;resize:vertical;box-sizing:border-box}
    .dy-textarea::placeholder{color:var(--t3)}
    .dy-save-row{display:flex;align-items:center;gap:12px;margin-top:12px;flex-wrap:wrap}
    .dy-save{background:var(--t1);color:#000;border:none;border-radius:8px;font-family:var(--font);font-weight:600;font-size:12px;padding:9px 20px;cursor:pointer;transition:opacity .15s}
    .dy-save:hover{opacity:.85}
    .dy-save:disabled{opacity:.4;cursor:not-allowed}
    .dy-saved-flag{font-family:var(--mono);font-size:10px;color:var(--green);opacity:0;transition:opacity .3s}
    .dy-saved-flag.on{opacity:1}
    .dy-count{font-family:var(--mono);font-size:9px;color:var(--t3);margin-left:auto}

    .dy-tl-title{font-family:var(--font);font-size:13px;font-weight:600;color:var(--t1);margin:0 0 14px;display:flex;align-items:center;gap:8px}
    .dy-tl-title::before{content:'';width:3px;height:14px;background:var(--t1);border-radius:2px}
    .dy-search{width:100%;background:var(--s3);border:1px solid var(--b2);color:var(--t1);font-family:var(--font);font-size:13px;padding:9px 12px;border-radius:8px;margin-bottom:16px;box-sizing:border-box}
    .dy-entry{position:relative;padding:0 0 18px 22px;border-left:2px solid var(--b2);margin-left:6px}
    .dy-entry:last-child{border-left-color:transparent}
    .dy-entry::before{content:'';position:absolute;left:-7px;top:2px;width:12px;height:12px;border-radius:50%;background:var(--s1);border:2px solid var(--b3)}
    .dy-entry.mood-top::before{border-color:#fb923c}
    .dy-entry.mood-bien::before{border-color:var(--green,#4ade80)}
    .dy-entry.mood-bas::before,.dy-entry.mood-fatigue::before{border-color:#60a5fa}
    .dy-entry-hd{display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap}
    .dy-entry-date{font-family:var(--font);font-size:12px;font-weight:600;color:var(--t1);text-transform:capitalize}
    .dy-entry-mood{font-family:var(--mono);font-size:10px;color:var(--t2);display:inline-flex;align-items:center;gap:4px}
    .dy-entry-time{font-family:var(--mono);font-size:9px;color:var(--t3)}
    .dy-entry-body{font-family:var(--font);font-size:13px;color:var(--t2);line-height:1.6;white-space:pre-wrap;word-break:break-word}
    .dy-entry-actions{margin-top:6px;display:flex;gap:8px}
    .dy-mini-btn{background:none;border:1px solid var(--b2);color:var(--t3);font-size:10px;font-family:var(--mono);border-radius:6px;padding:2px 8px;cursor:pointer}
    .dy-mini-btn:hover{color:var(--t1);border-color:var(--b3)}
    .dy-mini-btn.del:hover{color:var(--red,#f87171);border-color:var(--red,#f87171)}
    .dy-empty{text-align:center;padding:36px 20px;color:var(--t3);font-family:var(--mono);font-size:11px;line-height:1.7}
  `;
  const st=document.createElement('style'); st.id='dy-styles'; st.textContent=css; document.head.appendChild(st);

  // ───────── État éditeur ─────────
  let draftMood = null;

  // ───────── Onglet ─────────
  function injectTab(){
    const tabs=document.querySelector('.nav-tabs');
    if(!tabs || document.getElementById('tab-diary')) return;
    const btn=document.createElement('button');
    btn.className='tab'; btn.id='tab-diary';
    btn.setAttribute('onclick','goDiary(this)');
    btn.innerHTML='<svg class="tab-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg><span class="tab-lbl">Journal</span>';
    tabs.appendChild(btn);
  }

  // ───────── Page ─────────
  function injectPage(){
    if(document.getElementById('page-diary')) return;
    const ref=document.getElementById('page-photos')||document.getElementById('page-nutrition')||document.querySelector('.page');
    const page=document.createElement('div');
    page.className='page'; page.id='page-diary';
    page.innerHTML=`<div class="wrap"><div class="dy-wrap">
      <div class="dy-head"><div class="pg-title">📔 <b>Journal</b></div></div>
      <div class="dy-sub">Une entrée par jour. Écris ce que tu veux — ton état, tes pensées, tes victoires. Tu peux compléter l'entrée du jour à tout moment.</div>

      <div class="dy-editor">
        <div class="dy-editor-date" id="dy-ed-date"></div>
        <div class="dy-mood-row" id="dy-mood-row"></div>
        <textarea class="dy-textarea" id="dy-text" placeholder="Aujourd'hui..."></textarea>
        <div class="dy-save-row">
          <button class="dy-save" id="dy-save">Enregistrer</button>
          <span class="dy-saved-flag" id="dy-flag">✓ Enregistré</span>
          <span class="dy-count" id="dy-count"></span>
        </div>
      </div>

      <div class="dy-tl-title">Toutes mes entrées</div>
      <input class="dy-search" id="dy-search" placeholder="Rechercher dans le journal..."/>
      <div id="dy-timeline"></div>
    </div></div>`;
    ref.parentNode.insertBefore(page, ref.nextSibling);
  }

  function renderMoodRow(selected){
    const row=document.getElementById('dy-mood-row'); if(!row) return;
    row.innerHTML=MOODS.map(m=>`
      <button class="dy-mood ${selected===m.key?'on':''}" data-mood="${m.key}">
        <span class="dy-em">${m.emoji}</span>${m.label}
      </button>`).join('');
    row.querySelectorAll('.dy-mood').forEach(b=>{
      b.addEventListener('click',()=>{
        draftMood = (draftMood===b.dataset.mood) ? null : b.dataset.mood;
        renderMoodRow(draftMood);
      });
    });
  }

  function loadEditorForToday(){
    const data=load();
    const k=todayKey();
    const entry=data[k];
    draftMood = entry ? (entry.mood||null) : null;
    document.getElementById('dy-ed-date').textContent = fmtDate(k);
    document.getElementById('dy-text').value = entry ? (entry.text||'') : '';
    renderMoodRow(draftMood);
  }

  function saveToday(){
    const data=load();
    const k=todayKey();
    const text=document.getElementById('dy-text').value.trim();
    if(!text && !draftMood){
      // rien à sauver ; si une entrée existait et qu'on a tout vidé, on la supprime
      if(data[k]){ delete data[k]; save(data); renderTimeline(); }
      return;
    }
    const now=Date.now();
    const existing=data[k];
    data[k]={
      text,
      mood:draftMood,
      created: existing && existing.created ? existing.created : now,
      updated: now
    };
    save(data);
    const flag=document.getElementById('dy-flag');
    flag.classList.add('on'); setTimeout(()=>flag.classList.remove('on'),1800);
    renderTimeline();
  }

  function renderTimeline(filter){
    const el=document.getElementById('dy-timeline'); if(!el) return;
    const data=load();
    let keys=Object.keys(data).sort((a,b)=>b.localeCompare(a)); // récent → ancien
    document.getElementById('dy-count').textContent = keys.length ? keys.length+' entrée'+(keys.length>1?'s':'') : '';
    if(filter){
      const f=filter.toLowerCase();
      keys=keys.filter(k=>(data[k].text||'').toLowerCase().includes(f) || fmtDate(k).toLowerCase().includes(f));
    }
    if(!keys.length){
      el.innerHTML=`<div class="dy-empty">${filter?'Aucune entrée ne correspond.':'Pas encore d entrée.<br>Écris ta première ci-dessus.'}</div>`;
      return;
    }
    el.innerHTML=keys.map(k=>{
      const e=data[k];
      const m=moodOf(e.mood);
      const edited = e.updated && e.created && (e.updated-e.created>60000);
      return `
        <div class="dy-entry mood-${e.mood||'none'}">
          <div class="dy-entry-hd">
            <span class="dy-entry-date">${fmtDate(k)}</span>
            ${m?`<span class="dy-entry-mood">${m.emoji} ${m.label}</span>`:''}
            <span class="dy-entry-time">${e.updated?(edited?'modifié ':'')+fmtTime(e.updated):''}</span>
          </div>
          ${e.text?`<div class="dy-entry-body">${escapeHtml(e.text)}</div>`:''}
          <div class="dy-entry-actions">
            <button class="dy-mini-btn del" onclick="dyDelete('${k}')">Supprimer</button>
          </div>
        </div>`;
    }).join('');
  }

  function escapeHtml(s){
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ───────── API globale ─────────
  window.goDiary=function(btn){
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
    document.querySelectorAll('.tab').forEach(b=>b.classList.remove('on'));
    document.getElementById('page-diary').classList.add('on');
    if(btn) btn.classList.add('on');
    loadEditorForToday();
    renderTimeline(document.getElementById('dy-search').value.trim());
  };
  window.dyDelete=function(k){
    if(!confirm('Supprimer cette entrée ? Action définitive.')) return;
    const data=load(); delete data[k]; save(data);
    renderTimeline(document.getElementById('dy-search').value.trim());
    if(k===todayKey()) loadEditorForToday();
  };

  // ───────── Boot ─────────
  function boot(){
    if(!document.querySelector('.nav-tabs')){ return setTimeout(boot,200); }
    injectTab();
    injectPage();
    const saveBtn=document.getElementById('dy-save');
    if(saveBtn) saveBtn.addEventListener('click', saveToday);
    const search=document.getElementById('dy-search');
    if(search) search.addEventListener('input', e=>renderTimeline(e.target.value.trim()));
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();

/* Réordonnancement des onglets de navigation */
(function(){
  // Ordre voulu : Séance, Nutrition, Photos, Mon Journal, PRs, Suivi, Programme, Matériel
  function tabMatches(btn, sel){
    const oc = btn.getAttribute('onclick') || '';
    if(sel.id && btn.id === sel.id) return true;
    if(sel.oc && oc.indexOf(sel.oc) !== -1) return true;
    return false;
  }
  const ORDER = [
    {oc:"go('dash'"},        // Séance
    {id:'tab-nutrition'},    // Nutrition
    {id:'tab-photos'},       // Photos
    {id:'tab-diary'},        // Mon Journal
    {oc:"go('prs'"},         // PRs
    {oc:"go('journal'"},     // Suivi
    {oc:"go('prog'"},        // Programme
    {oc:"go('materiel'"},    // Matériel
  ];
  function reorderTabs(){
    const tabs = document.querySelector('.nav-tabs');
    if(!tabs) return;
    const btns = Array.from(tabs.querySelectorAll('.tab'));
    // Place dans l'ordre voulu ; les onglets non listés restent à la fin
    ORDER.forEach(sel=>{
      const btn = btns.find(b=>tabMatches(b, sel));
      if(btn) tabs.appendChild(btn); // appendChild déplace l'élément à la fin, dans l'ordre d'itération
    });
  }
  // Réordonne au chargement, et quelques fois après (Photos/Mon Journal sont injectés en différé)
  function scheduleReorder(){
    reorderTabs();
    let n=0;
    const iv=setInterval(()=>{ reorderTabs(); if(++n>=6) clearInterval(iv); }, 250);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', scheduleReorder);
  else scheduleReorder();
})();

