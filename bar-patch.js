/* ═══════════════════════════════════════════════════════════════
   SAMTHEBESTTRAINER — BARRE PATCH v2
   À injecter AVANT </body> dans index.html
   
   Corrections :
   ✓ Affichage poids total + décomposition (barre + disques)
   ✓ Repos standardisés dans le programme embarqué
   ✓ Halères vide (paire) = 4.5kg · Barre EZ vide = 4.5kg
   ═══════════════════════════════════════════════════════════════ */
(function(){
'use strict';

/* ── 1. Constantes barre ──────────────────────────────────────── */
const HALTER_BAR = 4.5;
const EZ_BAR     = 4.5;
const EZ_KEYS    = ['ez','barre ez','curl ez','rowing barre','développé militaire ez','overhead'];

function _isEZ(name){ const n=(name||'').toLowerCase(); return EZ_KEYS.some(k=>n.includes(k)); }
function _barFor(name){ return _isEZ(name)?EZ_BAR:HALTER_BAR; }

function getBarInfo(exName, weight){
  if(!weight||weight===0) return {total:0,bar:0,discs:0,isPC:true};
  const bar=_barFor(exName);
  const discs=Math.max(0,Math.round((weight-bar)*100)/100);
  return {total:weight,bar,discs,isPC:false};
}

/* ── 2. CSS des bar-hints ──────────────────────────────────────── */
const style = document.createElement('style');
style.textContent=`
  .bar-hint{font-family:var(--mono);font-size:8px;color:var(--t3);margin-top:2px;
            line-height:1.3;min-height:11px;transition:opacity .15s}
  .bar-breakdown{display:block;font-family:var(--mono);font-size:7.5px;
                 color:var(--t4);margin-top:1px;line-height:1.2}
  .weight-detail{display:inline-flex;flex-direction:column;gap:1px}
  .weight-total{font-family:var(--mono);font-size:11px;font-weight:600;
                color:var(--t1);line-height:1}
`;
document.head.appendChild(style);

/* ── 3. Patch des inputs poids en temps réel ──────────────────── */
function attachHint(inputEl, exName){
  if(inputEl.dataset.barHint) return;
  inputEl.dataset.barHint = '1';
  let hintEl = inputEl.nextElementSibling;
  if(!hintEl||!hintEl.classList.contains('bar-hint')){
    hintEl = document.createElement('div');
    hintEl.className = 'bar-hint';
    inputEl.parentNode.insertBefore(hintEl, inputEl.nextSibling);
  }
  function update(){
    const val=parseFloat(inputEl.value);
    if(!val||val<=0){hintEl.textContent='';return;}
    const bar=_barFor(exName);
    const discs=Math.max(0,Math.round((val-bar)*100)/100);
    hintEl.innerHTML=`<span style="color:var(--t3)">${bar}kg barre</span>`
      +(discs>0?` <span style="color:var(--t2)">+ ${discs}kg disques</span>`
               :' <span style="color:var(--yellow)">seule</span>');
  }
  inputEl.addEventListener('input', update);
  inputEl.addEventListener('change', update);
  inputEl.addEventListener('focus', update);
  update();
}

/* ── 4. MutationObserver pour patcher les détails d'exercice ──── */
const obs = new MutationObserver(function(){
  // Patcher les inputs de log dans les détails ouverts
  document.querySelectorAll('.act-det.open').forEach(det=>{
    const item = det.closest('.exo-item');
    const nmEl = item && (item.querySelector('.exo-nm span')||item.querySelector('.exo-nm'));
    const name = nmEl ? nmEl.textContent.trim() : '';
    if(!name) return;
    det.querySelectorAll('.act-row').forEach(row=>{
      const inputs = row.querySelectorAll('.inp-sm');
      if(inputs[0]) attachHint(inputs[0], name);
    });
  });
  // Patcher les inputs poids dans la modal programme
  document.querySelectorAll('.ee-item').forEach(item=>{
    const nameInp = item.querySelector('input[placeholder="Nom\u2026"]');
    if(!nameInp) return;
    // 3ème input = poids (dans la .g3)
    const poidInps = item.querySelectorAll('.g3 .inp');
    const wInp = poidInps[2];
    if(!wInp||wInp.dataset.barHint) return;
    attachHint(wInp, nameInp.value||'');
    nameInp.addEventListener('change',()=>{
      delete wInp.dataset.barHint;
      attachHint(wInp, nameInp.value||'');
    });
  });
});
obs.observe(document.body, {childList:true, subtree:true});

/* ── 5. Patch exo-meta dans la colonne Prévu ──────────────────── */
// Ajoute la décomposition sous le poids affiché dans .exo-meta
function patchPlanMeta(){
  document.querySelectorAll('#sv .pva-col:first-child .exo-item').forEach(item=>{
    if(item.dataset.barMetaPatched) return;
    const meta = item.querySelector('.exo-meta');
    const nmEl = item.querySelector('.exo-nm span')||item.querySelector('.exo-nm');
    if(!meta||!nmEl) return;
    const name = nmEl.textContent.trim();
    const match = meta.textContent.match(/@ ([\d.]+)kg/);
    if(!match) return;
    const total = parseFloat(match[1]);
    if(!total) return;
    if(item.querySelector('.bar-meta-hint')) return;
    const bar = _barFor(name);
    const discs = Math.max(0,Math.round((total-bar)*100)/100);
    const hint = document.createElement('div');
    hint.className = 'bar-meta-hint';
    hint.style.cssText = 'font-family:var(--mono);font-size:7px;color:var(--t4);line-height:1.2;margin-top:1px';
    hint.textContent = `${bar}kg barre + ${discs}kg disques`;
    meta.appendChild(hint);
    item.dataset.barMetaPatched = '1';
  });
}
const obs2 = new MutationObserver(patchPlanMeta);
obs2.observe(document.body, {childList:true, subtree:true});

/* ── 6. Patch du JSON embarqué (repos + barWeight) ────────────── */
// Au démarrage : si S existe et _version < 7, upgrade les repos
function upgradeRestTimes(){
  if(typeof S === 'undefined') return;
  if(S._version >= 7) return; // déjà mis à jour

  const HEAVY   = ['développé haltères','développé incliné','développé militaire','squat',
                   'hip thrust','soulevé de terre','tractions','rowing haltères','rowing barre',
                   'tirage poulie'];
  const SECOND  = ['dips','fente','step-up','rowing unilatéral'];

  function classifyRest(name){
    const n=name.toLowerCase();
    for(const kw of HEAVY) if(n.includes(kw)) return 150;
    for(const kw of SECOND) if(n.includes(kw)) return 120;
    return 90;
  }

  let changed = false;
  (S.week||[]).forEach(day=>{
    (day.exercises||[]).forEach(ex=>{
      // Standardiser repos
      const newRest = classifyRest(ex.name);
      if(ex.rest !== newRest){ ex.rest = newRest; changed = true; }
      // Ajouter barWeight/discsWeight
      if(ex.weight > 0 && !ex.barWeight){
        ex.barWeight  = _barFor(ex.name);
        ex.discsWeight = Math.max(0, Math.round((ex.weight - ex.barWeight)*100)/100);
        changed = true;
      }
    });
  });

  if(changed){
    S._version = 7;
    S._notes = 'Haltères vide (paire)=4.5kg · EZ vide=4.5kg · Repos standardisés';
    if(typeof saveState === 'function') saveState();
    console.log('[BarPatch] Programme mis à jour — repos standardisés + barWeight ajouté');
  }
}

// Attendre que S et saveState soient définis
function waitAndUpgrade(){
  if(typeof S !== 'undefined' && typeof saveState === 'function'){
    upgradeRestTimes();
  } else {
    setTimeout(waitAndUpgrade, 200);
  }
}
waitAndUpgrade();

console.log('[SamTheBestTrainer] Bar patch chargé · Haltères 4.5kg · EZ 4.5kg');
})();
