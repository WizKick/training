/* ═══ HAPTIC FEEDBACK ═══ */
function haptic(pattern){
  if(navigator.vibrate) navigator.vibrate(pattern);
}

/* Quick-done : valide toutes les séries d'un exo avec le poids/reps prévus
   (ou annule si déjà fait à 100%) */
function quickDoneExo(di,ei){
  const ex=S.week[di].exercises[ei];
  if(!ex) return;
  const k=dateLogKey(di,ei,todayKey());
  const logs=S.logs[k]||[];
  const validCount=logs.filter(l=>(l.w||0)>0||(l.r||0)>0).length;
  const totalSets=ex.sets||0;

  // Si tout est déjà fait → on annule (efface les logs du jour)
  if(validCount>=totalSets && totalSets>0){
    delete S.logs[k];
    haptic(30);
    saveState();
    renderSession();
    renderStats();
    renderStrip();
    return;
  }

  // Sinon → on remplit avec le poids/reps prévus
  const w=ex.weight||0;
  const r=ex.reps||0;
  S.logs[k]=Array.from({length:totalSets},()=>({w,r,date:todayKey()}));
  haptic([20,30,40]);
  saveState();
  renderSession();
  renderStats();
  renderStrip();

  // Auto-rest si activé (pas en super-set)
  if(_autoRestEnabled() && !timerIv && ex.rest && ex.rest > 0 && !ex.supersetGroup){
    startTimer(ex.rest, ex.name, true /*auto*/);
  }

  // Effet visuel sur le badge
  requestAnimationFrame(()=>{
    const allBadges=document.querySelectorAll('.exo-status.done');
    allBadges.forEach(b=>{
      if(b.getAttribute('onclick')&&b.getAttribute('onclick').includes(`(${di},${ei})`)){
        b.classList.add('just-done');
        setTimeout(()=>b.classList.remove('just-done'),500);
      }
    });
  });
  showToast(`✓ ${ex.name.split('(')[0].trim()} — validé`);
}

// Garantit qu'une entrée existe pour AUJOURD'HUI sur cet exercice.
// Si on consultait une séance d'un jour précédent (affichée via fallback),
// on copie ces valeurs vers aujourd'hui pour que toute modif crée bien l'entrée du jour.
function ensureTodayLogs(di,ei){
  const k=dateLogKey(di,ei,todayKey());
  if(S.logs[k] && S.logs[k].length) return S.logs[k];
  // Entrée du jour VIDE — on ne copie PAS l'historique automatiquement.
  // L'ancienne séance reste visible en repère "dernière fois", et le bouton
  // "↩ Auto-fill" permet de la recopier volontairement si tu le souhaites.
  S.logs[k] = [];
  return S.logs[k];
}

function addLog(di,ei){
  const k=dateLogKey(di,ei,todayKey());
  ensureTodayLogs(di,ei); // crée l'entrée du jour si on venait d'un jour précédent
  if(!S.logs[k]) S.logs[k]=[];
  // Série VIDE : tu remplis kg + reps puis valides (Entrée ou en quittant le champ).
  // Les valeurs prévues de l'exercice s'affichent en "placeholder" (gris) comme indication.
  S.logs[k].push({w:0, r:0, date:todayKey()});
  saveState(); expandA=ei; renderSession();
  // Focus auto sur le champ poids de la nouvelle série
  requestAnimationFrame(()=>{
    const rows=document.querySelectorAll('#sv .act-det.open .act-row');
    if(rows.length){
      const last=rows[rows.length-1];
      last.style.animation='none'; void last.offsetWidth;
      last.style.animation='setAdded .28s cubic-bezier(.22,1,.36,1)';
      const firstInp=last.querySelector('input');
      if(firstInp) firstInp.focus();
    }
  });
  haptic(18);
  if(!_swRunning && _swElapsed===0) startStopwatch();
}

function logChange(di,ei,li,key,val){
  const k=dateLogKey(di,ei,todayKey());
  ensureTodayLogs(di,ei); // si on éditait une séance affichée depuis un jour précédent
  if(S.logs[k]&&S.logs[k][li]){
    // Capture old best BEFORE saving
    const prevBest = getBest(di,ei);
    const prevVol = prevBest ? (prevBest.w||0)*(prevBest.r||0)||(prevBest.r||0) : 0;

    // Track previous state to detect "set just became valid"
    const wasValid = ((S.logs[k][li].w||0)>0 || (S.logs[k][li].r||0)>0);

    S.logs[k][li][key]=parseFloat(val)||0;
    saveState();

    // Auto-rest: si la série vient de devenir valide ET autoRest activé ET pas de timer en cours
    // (pas en super-set : ils ont leur propre timer via startSSRest)
    const nowValid = ((S.logs[k][li].w||0)>0 || (S.logs[k][li].r||0)>0);
    if(!wasValid && nowValid && key!=='rpe' && _autoRestEnabled() && !timerIv){
      const ex = S.week[di] && S.week[di].exercises[ei];
      if(ex && ex.rest && ex.rest > 0 && !ex.supersetGroup){
        // Dernière série de l'exo ? → pause de transition vers l'exo suivant
        const validNow = (S.logs[k]||[]).filter(x=>(x.w||0)>0||(x.r||0)>0).length;
        const isLastSet = validNow >= (ex.sets||0);
        const label = isLastSet ? ('Pause avant exo suivant · '+ex.name) : ex.name;
        startTimer(ex.rest, label, true /*auto*/);
      }
    }

    // refresh vol/PR display only
    const rows=document.querySelectorAll('#sv .act-det.open .act-row');
    if(rows[li]){
      const logs=getLogs(di,ei), best=getBest(di,ei), l=logs[li];
      if(l){
        const vol=(l.w||0)*(l.r||0)||(l.r||0);
        const isPR=best&&(l.w||0)===(best.w||0)&&(l.r||0)===(best.r||0)&&vol>0;
        const volEl=rows[li].querySelector('.act-vol');
        const prEl=rows[li].querySelector('.act-pr');
        if(volEl) volEl.textContent=vol?vol+'kg':'';
        if(prEl){
          const wasShowing = prEl.innerHTML.includes('act-pr-anim');
          prEl.innerHTML = isPR ? '<span class="act-pr-anim">PR</span>' : '';

          // 🎉 Fire celebration only when this is a NEW PR (volume improved)
          if(isPR && best && vol > prevVol){
            const prKey = `${di}_${ei}_${l.w}_${l.r}`;
            if(prKey !== _lastPRKey){
              _lastPRKey = prKey;
              const ex = S.week[di] && S.week[di].exercises[ei];
              const exName = ex ? ex.name : '';
              // Flash the row
              const row = rows[li];
              row.classList.remove('pr-flash');
              void row.offsetWidth;
              row.classList.add('pr-flash');
              // Haptic: double pulse for PR 🏆
              haptic([30, 60, 60]);
              // Fire the big celebration
              firePRCelebration(exName, l.w||0, l.r||0, prevBest?.w||0, prevBest?.r||0);
            }
          } else if(vol > 0 && key !== 'rpe') {
            // Validate flash + subtle haptic on normal set completion
            const row = rows[li];
            row.style.animation = 'none';
            void row.offsetWidth;
            row.style.animation = 'setValidate .55s ease';
            haptic(10);
          }
        }
      }
    }

    // Quand on saisit le poids "par côté" dans le champ principal, on remplit les 4 côtés
    // identiquement, puis on régénère le visuel éditable.
    if(key === 'w'){
      const l = S.logs[k][li];
      const v = parseFloat(val)||0;
      if(l){
        l.sides = { aL:v, aR:v, bL:v, bR:v };
        saveState();
      }
      const wraps = document.querySelectorAll('#sv .act-det.open .act-set-wrap');
      const wrap = wraps[li];
      if(wrap){
        const ex = S.week[di] && S.week[di].exercises[ei];
        const old = wrap.querySelector('.logged-disc');
        if(old) old.remove();
        if(ex && l && v>0){
          const html = loggedDiscHTML(ex, l, di, ei, li);
          if(html){
            const node = document.createElement('div');
            node.className = 'logged-disc';
            node.innerHTML = html;
            wrap.appendChild(node);
          }
        }
      }
    }
  }
}

function removeLog(di,ei,li){
  const k=dateLogKey(di,ei,todayKey());
  if(S.logs[k]){S.logs[k].splice(li,1);saveState();expandA=ei;renderSession();haptic(8);}
}

/* ═══ MEDIA ═══ */
function addMedia(di,ei,inp){
  if(!inp.files[0]) return;
  const f=inp.files[0],url=URL.createObjectURL(f),type=f.type.startsWith('video')?'video':'image';
  if(!S.week[di].exercises[ei].media) S.week[di].exercises[ei].media=[];
  S.week[di].exercises[ei].media.push({url,type});
  expandA=ei; renderSession();
}
function openMM(url,type){
  const m=document.getElementById('mm'),img=document.getElementById('mm-img'),vid=document.getElementById('mm-vid');
  m.style.display='flex';
  if(type==='video'){img.style.display='none';vid.src=url;vid.style.display='block';}
  else{vid.style.display='none';img.src=url;img.style.display='block';}
}
function closeMM(){document.getElementById('mm').style.display='none';document.getElementById('mm-vid').pause();}

/* ═══ TIMER ═══ */
// Auto-rest preference (default: enabled)
function _autoRestEnabled(){
  return localStorage.getItem('sbt-autorest') !== '0';
}
function toggleAutoRest(){
  const next = !_autoRestEnabled();
  localStorage.setItem('sbt-autorest', next ? '1' : '0');
  showToast(next ? '⏱ Repos auto activé' : '⏱ Repos auto désactivé');
  // Update visible icon if timer is open
  const t = document.getElementById('tf-autorest');
  if(t) t.classList.toggle('off', !next);
}

let _timerWarned80 = false;
let _timerIsAuto = false;

function startTimer(secs,name,isAuto){
  if(timerIv) clearInterval(timerIv);
  timerTotal=secs; timerLeft=secs;
  _timerWarned80 = false;
  _timerIsAuto = !!isAuto;
  const tf = document.getElementById('tf');
  tf.classList.add('on');
  tf.classList.remove('warn','done');
  if(isAuto) tf.classList.add('auto'); else tf.classList.remove('auto');
  document.getElementById('tf-nm').textContent=name||'';
  // Sync auto-rest toggle icon visual
  const ar = document.getElementById('tf-autorest');
  if(ar) ar.classList.toggle('off', !_autoRestEnabled());
  updateTimer();
  timerIv=setInterval(()=>{
    timerLeft--;
    updateTimer();
    // Warning à 80% de progression (= il reste 20% du temps)
    const elapsedPct = (timerTotal - timerLeft) / timerTotal;
    if(!_timerWarned80 && elapsedPct >= 0.8 && timerLeft > 0){
      _timerWarned80 = true;
      tf.classList.add('warn');
      beepSoft();
      haptic(40);
    }
    if(timerLeft<=0){
      stopTimer();
      tf.classList.remove('warn');
      tf.classList.add('done');
      beep();
      haptic([80,60,80]);
      // Auto-hide après quelques secondes
      const hideDelay = _timerIsAuto ? 3000 : 5000;
      setTimeout(()=>{
        if(!timerIv){ tf.classList.remove('on','done','auto'); }
      }, hideDelay);
    }
  },1000);
}
function updateTimer(){
  const m=Math.floor(Math.max(0,timerLeft)/60),s=Math.max(0,timerLeft)%60;
  document.getElementById('tf-num').textContent=String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  const pct = Math.max(0, Math.round(timerLeft/timerTotal*100));
  document.getElementById('tf-fill').style.width=pct+'%';
}
function stopTimer(){
  clearInterval(timerIv);
  timerIv = null;
  const tf = document.getElementById('tf');
  // Si l'utilisateur skip manuellement (pas fin naturelle), on cache direct
  if(timerLeft > 0){ tf.classList.remove('on','warn','done','auto'); }
}
function skipTimer(){
  stopTimer();
  haptic(15);
}
function addTimerTime(secs){
  if(!timerIv) return;
  timerLeft = Math.max(0, timerLeft + secs);
  timerTotal = Math.max(timerTotal, timerLeft);
  _timerWarned80 = (timerTotal - timerLeft) / timerTotal >= 0.8;
  updateTimer();
  haptic(10);
}

// Beep doux pour le warning à 80%
function beepSoft(){
  try{
    const ac=new(window.AudioContext||window.webkitAudioContext)();
    const o=ac.createOscillator(),g=ac.createGain();
    o.connect(g);g.connect(ac.destination);
    o.frequency.value=660;
    g.gain.setValueAtTime(.18,ac.currentTime);
    g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+.18);
    o.start(ac.currentTime);o.stop(ac.currentTime+.2);
  }catch(e){}
}

/* ═══ STOPWATCH ═══ */
function formatStopwatch(ms){
  if(!ms||ms<0) ms=0;
  const totalSec=Math.floor(ms/1000);
  const h=Math.floor(totalSec/3600);
  const m=Math.floor((totalSec%3600)/60);
  const s=totalSec%60;
  if(h>0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function _updateSwFloat(){
  const tot=_swElapsed+(_swRunning&&_swStartTs?Date.now()-_swStartTs:0);
  const fmtd=formatStopwatch(tot);
  // in-session display
  const el=document.getElementById('sw-display');
  if(el){ el.textContent=fmtd; if(_swRunning) el.classList.add('sw-running'); else el.classList.remove('sw-running'); }
  // floating widget
  const fEl=document.getElementById('swf-num');
  if(fEl){ fEl.textContent=fmtd; fEl.classList.toggle('running',_swRunning); }
  const dot=document.getElementById('swf-dot');
  if(dot){ dot.classList.toggle('paused',!_swRunning); }
  const toggleBtn=document.getElementById('swf-toggle-btn');
  if(toggleBtn){ toggleBtn.textContent=_swRunning?'⏸':'▶'; toggleBtn.title=_swRunning?'Pause':'Reprendre'; }
  // show/hide float (show if elapsed > 0 and not hidden by user)
  const swFloat=document.getElementById('sw-float');
  if(swFloat && !swFloat.dataset.hidden){
    const visible=tot>0;
    swFloat.classList.toggle('on',visible);
    // session name
    const nameEl=document.getElementById('swf-name');
    if(nameEl){ const s=S.week[curDay]; nameEl.textContent=s&&s.name?s.name:''; }
  }
}

function _hideSwFloat(){
  const swFloat=document.getElementById('sw-float');
  if(swFloat){ swFloat.dataset.hidden='1'; swFloat.classList.remove('on'); }
}

function startStopwatch(){
  if(_swRunning) return;
  _swRunning=true;
  _swStartTs=Date.now();
  requestWakeLock(); // garde l'écran allumé pendant la séance
  // Clear user-hidden flag on explicit start
  const swFloat=document.getElementById('sw-float');
  if(swFloat) delete swFloat.dataset.hidden;
  _swIv=setInterval(()=>{ _updateSwFloat(); },1000);
  _updateSwFloat();
  // update button live without full re-render
  const btn=document.getElementById('sw-btn');
  if(btn){btn.textContent='⏸';btn.classList.add('running');btn.title='Pause';}
  // update sub label
  const subEls=document.querySelectorAll('#sv .sess-bar-sub');
  if(subEls[2]) subEls[2].textContent='en cours';
}

function pauseStopwatch(){
  if(!_swRunning) return;
  _swElapsed+=Date.now()-_swStartTs;
  _swRunning=false;
  clearInterval(_swIv);
  _updateSwFloat();
  const btn=document.getElementById('sw-btn');
  if(btn){btn.textContent='▶';btn.classList.remove('running');btn.title='Reprendre';}
  const subEls=document.querySelectorAll('#sv .sess-bar-sub');
  if(subEls[2]) subEls[2].textContent='en pause';
}

function toggleStopwatch(){
  if(_swRunning) pauseStopwatch();
  else startStopwatch();
}

function resetStopwatch(){
  pauseStopwatch();
  _swElapsed=0;
  _swRunning=false;
  releaseWakeLock();
  // re-render the bar section
  const el=document.getElementById('sw-display');
  if(el){el.textContent='00:00';el.classList.remove('sw-running');}
  // hide floating widget
  const swFloat=document.getElementById('sw-float');
  if(swFloat){ swFloat.dataset.hidden='1'; swFloat.classList.remove('on'); }
  renderSession();
}

/* ═══ WAKE LOCK — garde l'écran allumé pendant la séance ═══ */
let _wakeLock = null;
let _wakeLockWanted = false;

async function _acquireWakeLock(){
  if(!('wakeLock' in navigator)) return;
  try{
    _wakeLock = await navigator.wakeLock.request('screen');
    _wakeLock.addEventListener('release', ()=>{ _wakeLock = null; });
  }catch(e){ /* refus / batterie faible : on ignore silencieusement */ }
}

function requestWakeLock(){
  _wakeLockWanted = true;
  _acquireWakeLock();
}

function releaseWakeLock(){
  _wakeLockWanted = false;
  if(_wakeLock){ try{ _wakeLock.release(); }catch(e){} _wakeLock = null; }
}

// Réacquérir le verrou quand l'app revient au premier plan (le verrou saute en arrière-plan)
document.addEventListener('visibilitychange', ()=>{
  if(_wakeLockWanted && document.visibilityState === 'visible' && !_wakeLock){
    _acquireWakeLock();
  }
});

function beep(){
  // 3 tons montants percutants
  try{
    const ac=new(window.AudioContext||window.webkitAudioContext)();
    [[0,660,.25],[120,880,.3],[260,1100,.35]].forEach(([t,freq,vol])=>{
      const o=ac.createOscillator(),g=ac.createGain();
      o.connect(g); g.connect(ac.destination);
      o.type='sine'; o.frequency.value=freq;
      g.gain.setValueAtTime(0,ac.currentTime+t/1000);
      g.gain.linearRampToValueAtTime(vol,ac.currentTime+t/1000+.03);
      g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+t/1000+.28);
      o.start(ac.currentTime+t/1000); o.stop(ac.currentTime+t/1000+.32);
    });
  }catch(e){}
  // Notification navigateur
  try{
    if('Notification' in window){
      const send = () => new Notification('⏱ Repos terminé', {body: 'C\'est reparti !', silent: true, icon: ''});
      if(Notification.permission === 'granted'){ send(); }
      else if(Notification.permission !== 'denied'){ Notification.requestPermission().then(p=>{ if(p==='granted') send(); }); }
    }
  }catch(e){}
}

// Demande permission notif au chargement (UX : on demande dès le début)
(function(){
  if('Notification' in window && Notification.permission === 'default'){
    document.addEventListener('click', function askOnce(){
      Notification.requestPermission();
      document.removeEventListener('click', askOnce);
    }, {once: true});
  }
})();

