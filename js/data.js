/* ═══ COPY WEEK ═══ */
function getMondayOf(date){
  const d=new Date(date), day=d.getDay(), diff=day===0?-6:1-day;
  d.setDate(d.getDate()+diff); d.setHours(0,0,0,0); return d;
}
function weekLabel(m){ return m.toLocaleDateString('fr-FR',{day:'numeric',month:'long'}); }
function weekStorageKey(m){
  return m.getFullYear()+'-'+String(m.getMonth()+1).padStart(2,'0')+'-'+String(m.getDate()).padStart(2,'0');
}

function openCopyWeek(){
  const today=new Date(), thisMon=getMondayOf(today);
  const opts=[];
  for(let i=1;i<=8;i++){const mon=new Date(thisMon);mon.setDate(mon.getDate()+i*7);opts.push({monday:mon,key:weekStorageKey(mon)});}

  // Also show already-saved weeks (including past ones) for deletion
  const allSaved=Object.keys(S.savedWeeks||{}).sort();
  let savedSectionHTML='';
  if(allSaved.length){
    savedSectionHTML=`<div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--b1)">
      <div class="lbl" style="margin-bottom:8px">Semaines programmées — supprimer</div>
      <div style="display:flex;flex-direction:column;gap:5px">
        ${allSaved.map(key=>{
          // parse date from key YYYY-MM-DD
          const [y,m,d]=key.split('-');
          const mon=new Date(parseInt(y),parseInt(m)-1,parseInt(d));
          const lbl=weekLabel(mon);
          const sess=S.savedWeeks[key].week.filter(s=>s.name&&s.type!=='rest').length;
          return`<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;background:var(--s2);border:1px solid var(--b1);border-radius:6px">
            <span style="flex:1;font-size:12px;font-weight:500">Semaine du ${lbl}</span>
            <span style="font-family:var(--mono);font-size:9px;color:var(--t3)">${sess} séance${sess!==1?'s':''}</span>
            <button class="btn btn-danger btn-xs" onclick="deleteSavedWeek('${key}')">Annuler</button>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  document.getElementById('cw-options').innerHTML=opts.map((o,i)=>{
    const saved=S.savedWeeks&&S.savedWeeks[o.key];
    return`<label style="display:flex;align-items:center;gap:9px;cursor:pointer;padding:7px 10px;background:var(--s2);border:1px solid var(--b1);border-radius:6px">
      <input type="checkbox" id="cw-${i}" value="${o.key}" style="accent-color:var(--t1);width:14px;height:14px"/>
      <span style="flex:1;font-size:12px;font-weight:500">Semaine du ${weekLabel(o.monday)}</span>
      ${saved?`<button class="btn btn-danger btn-xs" style="pointer-events:auto" onclick="event.preventDefault();deleteSavedWeek('${o.key}')">Annuler</button>`:''}
    </label>`;
  }).join('');

  document.getElementById('cw-preview').innerHTML=S.week.map((s,i)=>`
    <div style="display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid var(--b1)">
      <span style="font-family:var(--mono);font-size:9px;color:var(--t3);width:28px">${DAYS[i].slice(0,3)}</span>
      ${s.name?`<span style="font-size:11px;font-weight:500;flex:1">${s.name}</span><span class="badge">${s.type}</span>`
              :`<span style="font-size:11px;color:var(--t3)">—</span>`}
    </div>`).join('') + savedSectionHTML;

  document.getElementById('mcw').classList.add('on');
}

function deleteSavedWeek(key){
  if(!S.savedWeeks||!S.savedWeeks[key]) return;
  const [y,m,d]=key.split('-');
  const mon=new Date(parseInt(y),parseInt(m)-1,parseInt(d));
  const lbl=weekLabel(mon);
  if(!confirm('Annuler le programme de la semaine du '+lbl+' ?')) return;
  delete S.savedWeeks[key];
  saveState();
  showToast('Programme annulé ✓');
  openCopyWeek(); // refresh modal
}

function closeCopyWeek(){ document.getElementById('mcw').classList.remove('on'); }

function confirmCopy(){
  if(!S.savedWeeks) S.savedWeeks={};
  let copied=0;
  document.querySelectorAll('#cw-options input[type=checkbox]').forEach(cb=>{
    if(cb.checked){
      S.savedWeeks[cb.value]={week:S.week.map(day=>({...day,exercises:day.exercises.map(ex=>({...ex,media:[]}))}))};
      copied++;
    }
  });
  saveState(); closeCopyWeek();
  if(copied>0) showToast(`Copié vers ${copied} semaine${copied>1?'s':''} ✓`);
}

/* ═══ TOAST ═══ */
function showToast(msg){
  let t=document.getElementById('toast');
  if(!t){
    t=document.createElement('div'); t.id='toast';
    t.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(12px);background:var(--t1);color:#000;font-family:var(--mono);font-size:11px;font-weight:500;padding:8px 16px;border-radius:6px;z-index:600;opacity:0;transition:all .25s ease;pointer-events:none;white-space:nowrap';
    document.body.appendChild(t);
  }
  t.textContent=msg;
  requestAnimationFrame(()=>{t.style.opacity='1';t.style.transform='translateX(-50%) translateY(0)';});
  clearTimeout(t._to);
  t._to=setTimeout(()=>{t.style.opacity='0';t.style.transform='translateX(-50%) translateY(12px)';},2800);
}

/* ═══ EXPORT / IMPORT JSON ═══ */

let _importData = null;

function openBackup() {
  // Summary
  const logs   = Object.keys(S.logs).filter(k => S.logs[k] && S.logs[k].length > 0);
  const weeks  = Object.keys(S.savedWeeks || {}).length;
  const notes  = Object.keys(S.notes || {}).filter(k => S.notes[k].trim()).length;
  const exos   = S.week.reduce((a, d) => a + d.exercises.length, 0);
  const days   = S.week.filter(d => d.name.trim()).length;
  const sizeKb = (JSON.stringify(S).length / 1024).toFixed(1);

  document.getElementById('backup-summary').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
      ${[
        ['Jours configurés', days],
        ['Exercices', exos],
        ['Sessions loguées', logs.length],
        ['Notes', notes],
        ['Semaines prog.', weeks],
        ['Taille', sizeKb+' KB'],
      ].map(([l,v]) => `
        <div style="text-align:center">
          <div style="font-family:var(--mono);font-size:16px;font-weight:500;color:var(--t1)">${v}</div>
          <div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-top:2px">${l}</div>
        </div>`).join('')}
    </div>`;

  // Reminder banner & last export info
  const daysSince = getDaysSinceExport();
  const lastDate  = getLastExportDate();
  const bannerEl  = document.getElementById('export-reminder-banner');
  const infoEl    = document.getElementById('last-export-info');

  if (daysSince >= REMINDER_DAYS) {
    const msg = daysSince === Infinity
      ? 'Aucun export détecté — tes données ne sont sauvegardées qu\'en local.'
      : `Dernier export il y a <b>${daysSince} jours</b> — un export régulier évite toute perte en cas de cache vidé.`;
    bannerEl.innerHTML = `<div class="reminder-banner"><div class="rb-icon">⚠️</div><div class="rb-text">${msg}</div></div>`;
  } else {
    bannerEl.innerHTML = '';
  }

  if (lastDate) {
    const fmt = lastDate.toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'});
    const col  = daysSince < REMINDER_DAYS ? 'var(--green)' : 'var(--yellow)';
    infoEl.innerHTML = `Dernier export&nbsp;: <span style="color:${col}">${fmt}</span>`;
  } else {
    infoEl.innerHTML = `<span style="color:var(--red)">Aucun export enregistré</span>`;
  }

  // Reset import UI
  _importData = null;
  document.getElementById('import-lbl').textContent = 'Choisir un fichier .json…';
  document.getElementById('import-preview').style.display = 'none';
  document.getElementById('import-btn').style.display = 'none';
  document.getElementById('import-file').value = '';

  if(typeof renderSyncUI === 'function') renderSyncUI();

  document.getElementById('m-backup').classList.add('on');
}

function closeBackup() {
  document.getElementById('m-backup').classList.remove('on');
}


/* ── BACKUP AUTO ── */
const AUTO_BACKUP_KEY  = 'autoBackupCount';
const AUTO_BACKUP_FREQ = 5; // toutes les 5 sessions terminées


function setAutoBackupFreq(val){
  const n = parseInt(val);
  localStorage.setItem('autoBackupFreqCustom', n);
  // Update the constant-like behavior via global override
  window._autoBackupFreqOverride = n;
}

function checkAutoBackup(){
  const freq = window._autoBackupFreqOverride !== undefined ? window._autoBackupFreqOverride : AUTO_BACKUP_FREQ;
  if(freq === 0) return; // désactivé
  const count = parseInt(localStorage.getItem(AUTO_BACKUP_KEY)||'0') + 1;
  localStorage.setItem(AUTO_BACKUP_KEY, count);
  if(count >= freq){
    localStorage.setItem(AUTO_BACKUP_KEY, '0');
    // Délai 2s pour laisser le résumé s'afficher d'abord
    setTimeout(()=>{
      exportJSON();
      showToast('💾 Backup auto — '+AUTO_BACKUP_FREQ+' séances atteintes');
    }, 2000);
  }
}

async function exportJSON() {
  const data = JSON.parse(JSON.stringify(S)); // deep copy
  // strip blob URLs from media (they don't persist anyway)
  data.week.forEach(day => {
    day.exercises.forEach(ex => { ex.media = []; });
  });
  data._exported  = new Date().toISOString();
  if (!data._version || data._version < 9) data._version = 9;
  // ── Inclure le journal personnel dans l'export ──
  try {
    const diary = JSON.parse(localStorage.getItem('sbt-diary') || '{}');
    data.diary = diary;
  } catch(e) { data.diary = {}; }
  // ── Inclure le tracker de poids + réglages divers ──
  try { data._wtEntries = JSON.parse(localStorage.getItem('wtEntries2') || '[]'); } catch(e){ data._wtEntries = []; }
  try {
    data._settings = {
      wtGoal: localStorage.getItem('wtGoal'),
      scPoids: localStorage.getItem('scPoids'),
      scTaille: localStorage.getItem('scTaille'),
      scAge: localStorage.getItem('scAge'),
      bulkDiet: localStorage.getItem('bulkDiet'),
      bulkMealCount: localStorage.getItem('bulkMealCount'),
      'sbt-plates': localStorage.getItem('sbt-plates'),
      'sbt-plate-imbalance': localStorage.getItem('sbt-plate-imbalance'),
      'sbt-per-hand': localStorage.getItem('sbt-per-hand'),
    };
  } catch(e){}
  // ── Inclure les PHOTOS (sauvegarde unifiée) ──
  let photoCount = 0;
  try {
    if (typeof window.ppGetAllRecords === 'function') {
      const photos = await window.ppGetAllRecords();
      data._photos = photos || [];
      photoCount = data._photos.length;
    }
  } catch(e) { data._photos = []; }
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  const d    = new Date();
  const dateStr = d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
  a.download = 'samthebesttrainer_'+dateStr+'.json';
  a.click();
  URL.revokeObjectURL(url);
  // Record export timestamp & update badge
  localStorage.setItem(EXPORT_REMINDER_KEY, new Date().toISOString());
  updateExportBadge();
  // Refresh banner inside open modal if still open
  const infoEl = document.getElementById('last-export-info');
  if (infoEl) {
    const fmt = new Date().toLocaleDateString('fr-FR', {day:'numeric', month:'long', year:'numeric'});
    infoEl.innerHTML = `Dernier export&nbsp;: <span style="color:var(--green)">${fmt}</span>`;
  }
  const bannerEl = document.getElementById('export-reminder-banner');
  if (bannerEl) bannerEl.innerHTML = '';
  showToast('Sauvegarde complète ✓ (programme + nutrition' + (photoCount?' + '+photoCount+' photos':'') + ')');
}

function previewImport(inp) {
  if (!inp.files[0]) return;
  const file = inp.files[0];
  document.getElementById('import-lbl').textContent = file.name;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      // basic validation
      if (!data.week || !Array.isArray(data.week) || data.week.length !== 7) {
        throw new Error('Format invalide');
      }
      _importData = data;
      const logs  = Object.keys(data.logs || {}).filter(k => data.logs[k] && data.logs[k].length > 0);
      const weeks = Object.keys(data.savedWeeks || {}).length;
      const notes = Object.keys(data.notes || {}).filter(k => data.notes[k].trim()).length;
      const exos  = data.week.reduce((a, d) => a + (d.exercises||[]).length, 0);
      const days  = data.week.filter(d => d.name && d.name.trim()).length;
      const exported = data._exported ? new Date(data._exported).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'}) : 'Date inconnue';
      document.getElementById('import-preview').style.display = 'block';
      document.getElementById('import-preview').innerHTML = `
        <div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-bottom:8px">Exporté le ${exported}</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
          ${[
            ['Jours', days],
            ['Exercices', exos],
            ['Sessions', logs.length],
            ['Notes', notes],
            ['Sem. prog.', weeks],
            ['Journal', Object.keys(data.diary||{}).length],
            ['Photos', Array.isArray(data._photos)?data._photos.length:0],
            ['Version', data._version||'?'],
          ].map(([l,v]) => `
            <div style="text-align:center;background:var(--s3);border-radius:4px;padding:6px">
              <div style="font-family:var(--mono);font-size:14px;font-weight:500;color:var(--t1)">${v}</div>
              <div style="font-family:var(--mono);font-size:8px;color:var(--t3);margin-top:1px">${l}</div>
            </div>`).join('')}
        </div>`;
      document.getElementById('import-btn').style.display = 'flex';
    } catch(err) {
      _importData = null;
      document.getElementById('import-preview').style.display = 'block';
      document.getElementById('import-preview').innerHTML = `<div style="font-size:12px;color:var(--red)">❌ Fichier invalide — ${err.message}</div>`;
      document.getElementById('import-btn').style.display = 'none';
    }
  };
  reader.readAsText(file);
}

async function importJSON() {
  if (!_importData) return;
  if (!confirm('Restaurer ces données ? Tes données actuelles seront remplacées définitivement.')) return;
  // merge: keep required fields, strip _meta
  S = {
    week:           _importData.week          || defaultState().week,
    logs:           _importData.logs          || {},
    done:           _importData.done          || {},
    notes:          _importData.notes         || {},
    savedWeeks:     _importData.savedWeeks    || {},
    wellness:       _importData.wellness      || {},
    periodization:  _importData.periodization || {enabled:false,anchor:null,weeks:{A:null,B:null,C:null}},
    nutrition:      _importData.nutrition     || {},
    nutrGoals:      _importData.nutrGoals     || {},
    sessionDurations: _importData.sessionDurations || {},
    sessionDurManual: _importData.sessionDurManual || {},
    // ── CRUCIAL : on conserve la version pour que le boot ne réinitialise PAS au refresh ──
    _version:       _importData._version      || 9,
    _notes:         _importData._notes        || '',
  };
  // Apply periodization if enabled
  applyPeriodizationWeek();
  saveState();
  // ── Restaurer le journal personnel s'il est présent dans le fichier ──
  if (_importData && _importData.diary && typeof _importData.diary === 'object') {
    try { localStorage.setItem('sbt-diary', JSON.stringify(_importData.diary)); } catch(e){}
  }
  // ── Restaurer le tracker de poids ──
  if (Array.isArray(_importData._wtEntries)) {
    try { localStorage.setItem('wtEntries2', JSON.stringify(_importData._wtEntries)); } catch(e){}
  }
  // ── Restaurer les réglages (objectif, poids, taille, âge, diète…) ──
  if (_importData._settings && typeof _importData._settings === 'object') {
    const st = _importData._settings;
    try {
      Object.keys(st).forEach(k=>{ if(st[k]!=null) localStorage.setItem(k, st[k]); });
    } catch(e){}
  }
  // ── Restaurer les PHOTOS (sauvegarde unifiée) ──
  let photoMsg = '';
  if (Array.isArray(_importData._photos) && _importData._photos.length && typeof window.ppRestoreRecords === 'function') {
    try { const n = await window.ppRestoreRecords(_importData._photos); photoMsg = ' + '+n+' photos'; } catch(e){}
  }
  _importData = null;
  closeBackup();
  renderStats();
  renderVolumeDayChart();
  renderStrip();
  renderSession();
  renderPerioBar('perio-dash-bar');
  showToast('Données restaurées ✓'+photoMsg);
}

/* ═══════════════════════════════════════════════════════
   SYNCHRONISATION CLOUD (Supabase) — usage perso multi-appareils
   ═══════════════════════════════════════════════════════ */

// ⚙️ SYNC CLOUD DÉSACTIVÉE — version 100% locale (aucune donnée en ligne)
const SUPA_URL  = '';
const SUPA_KEY  = '';

let _supa = null;
let _syncTimer = null;
let _syncing = false;

function syncConfigured(){ return false; }   // sync désactivée
function syncCode(){ return ''; }
function syncEnabled(){ return false; }
function getSupa(){ return null; }
function scheduleSyncPush(){ /* no-op : version locale */ }
function syncPush(silent){ if(!silent && typeof showToast==='function') showToast('Version locale — pas de cloud'); return false; }
function syncPull(silent){ return false; }
function setSyncCode(){ if(typeof showToast==='function') showToast('Version locale — synchro désactivée'); }
function updateSyncBadge(){}
function renderSyncUI(){
  const wrap = document.getElementById('sync-ui');
  if(wrap) wrap.innerHTML = '<div style="font-family:var(--mono);font-size:10px;color:var(--t3);line-height:1.5">Version 100% locale — tes données restent sur cet appareil. Utilise Export/Import pour les transférer.</div>';
}

// Construit l'objet de sauvegarde complet (même contenu que l'export fichier)
async function buildBackupObject(){
  const data = JSON.parse(JSON.stringify(S));
  data.week.forEach(day => { day.exercises.forEach(ex => { ex.media = []; }); });
  data._exported = new Date().toISOString();
  if(!data._version || data._version < 9) data._version = 9;
  try { data.diary = JSON.parse(localStorage.getItem('sbt-diary')||'{}'); } catch(e){ data.diary={}; }
  try { data._wtEntries = JSON.parse(localStorage.getItem('wtEntries2')||'[]'); } catch(e){ data._wtEntries=[]; }
  data._settings = {
    wtGoal: localStorage.getItem('wtGoal'),
    scPoids: localStorage.getItem('scPoids'),
    scTaille: localStorage.getItem('scTaille'),
    scAge: localStorage.getItem('scAge'),
    bulkDiet: localStorage.getItem('bulkDiet'),
    bulkMealCount: localStorage.getItem('bulkMealCount'),
    'sbt-plates': localStorage.getItem('sbt-plates'),
    'sbt-plate-imbalance': localStorage.getItem('sbt-plate-imbalance'),
      'sbt-per-hand': localStorage.getItem('sbt-per-hand'),
  };
  try {
    if(typeof window.ppGetAllRecords === 'function'){ data._photos = await window.ppGetAllRecords() || []; }
  } catch(e){ data._photos = []; }
  return data;
}

// Applique un objet de sauvegarde reçu du cloud (restauration silencieuse)
async function applyBackupObject(d){
  if(!d || !d.week) return false;
  S = {
    week: d.week || defaultState().week,
    logs: d.logs || {}, done: d.done || {}, notes: d.notes || {},
    savedWeeks: d.savedWeeks || {}, wellness: d.wellness || {},
    periodization: d.periodization || {enabled:false,anchor:null,weeks:{A:null,B:null,C:null}},
    nutrition: d.nutrition || {}, nutrGoals: d.nutrGoals || {},
    sessionDurations: d.sessionDurations || {}, sessionDurManual: d.sessionDurManual || {},
    _version: d._version || 9, _notes: d._notes || '',
  };
  applyPeriodizationWeek();
  saveState();
  if(d.diary && typeof d.diary==='object'){ try{ localStorage.setItem('sbt-diary', JSON.stringify(d.diary)); }catch(e){} }
  if(Array.isArray(d._wtEntries)){ try{ localStorage.setItem('wtEntries2', JSON.stringify(d._wtEntries)); }catch(e){} }
  if(d._settings && typeof d._settings==='object'){
    try { Object.keys(d._settings).forEach(k=>{ if(d._settings[k]!=null) localStorage.setItem(k, d._settings[k]); }); } catch(e){}
  }
  if(Array.isArray(d._photos) && d._photos.length && typeof window.ppRestoreRecords==='function'){
    try { await window.ppRestoreRecords(d._photos); } catch(e){}
  }
  return true;
}


function nutrImportJSON(inp) {
  if (!inp.files[0]) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const data = JSON.parse(e.target.result);
      // Accepte 2 formats :
      //  1) fichier nutrition dédié  → { _type:'nutrition', nutrition:{...}, nutrGoals:{...} }
      //  2) sauvegarde complète app  → { week:[...], nutrition:{...}, nutrGoals:{...}, ... }
      const hasNutrition = data.nutrition && typeof data.nutrition === 'object';
      const isFullBackup = Array.isArray(data.week);
      if (!hasNutrition && !isFullBackup) throw new Error('Fichier nutrition invalide');
      if (!confirm('Remplacer les données nutrition actuelles ?')) { inp.value=''; return; }
      S.nutrition = (hasNutrition ? data.nutrition : {}) || {};
      if (data.nutrGoals && typeof data.nutrGoals === 'object') S.nutrGoals = data.nutrGoals;
      saveState();
      renderNutrition();
      if (typeof renderDashboard === 'function') { try{ renderDashboard(); }catch(_){} }
      showToast('Nutrition importée ✓');
    } catch(err) {
      showToast('❌ ' + err.message);
    }
    inp.value = '';
  };
  reader.readAsText(inp.files[0]);
}


/* ── GLOBAL JSON DROP (anywhere on page) ── */
(function(){
  document.addEventListener('dragover', function(e){
    if(e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')){
      e.preventDefault();
    }
  });
  document.addEventListener('drop', function(e){
    const files = e.dataTransfer && e.dataTransfer.files;
    if(!files || !files[0]) return;
    const file = files[0];
    if(!file.name.endsWith('.json') && file.type !== 'application/json') return;
    e.preventDefault();
    // If backup modal is open, route to previewImport
    const modal = document.getElementById('m-backup');
    if(modal && modal.classList.contains('on')){
      previewImport({files: e.dataTransfer.files});
      return;
    }
    // Otherwise open backup modal and load
    openBackup();
    setTimeout(()=>{ previewImport({files: e.dataTransfer.files}); }, 150);
  });
})();

/* ═══ LAUNCH ═══ */
(function(){
  if(!S.savedWeeks){S.savedWeeks={};saveState();return;}
  const thisMon=getMondayOf(new Date());
  const key=weekStorageKey(thisMon);
  const saved=S.savedWeeks[key];
  const isEmpty=S.week.every(d=>!d.name.trim());
  if(saved&&isEmpty){S.week=saved.week.map(d=>({...d}));saveState();showToast('Programme chargé automatiquement ✓');}
})();

renderStats();
renderVolumeDayChart();
renderWeekCmp();
renderStrip();
renderSession();
renderPerioBar('perio-dash-bar');
updateExportBadge();
scheduleReminderToast();

