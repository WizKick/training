/* ═══════════════════════════════════════════
   ONBOARDING — 3-step guided tour
   ═══════════════════════════════════════════ */
(function(){

const OB_KEY = 'sbt-onboarding-done';

// ── Step definitions ──
const STEPS = [
  {
    id: 'create-session',
    icon: '📅',
    label: 'Étape 1 / 3',
    title: 'Créer ta première séance',
    desc: 'Commence par configurer un jour d\'entraînement. Donne-lui un nom (ex. PUSH, LEGS…) et choisis son type.',
    btn: 'Ouvrir le programme →',
    target: () => document.querySelector('#pgrid .pdc') || document.querySelector('.nav-tabs .tab:nth-child(2)'),
    action: () => {
      go('prog', document.querySelectorAll('.tab')[1]);
    },
    isDone: () => S.week.some(d => d.name && d.name.trim() && d.type !== 'rest'),
  },
  {
    id: 'add-exercise',
    icon: '🏋️',
    label: 'Étape 2 / 3',
    title: 'Ajouter des exercices',
    desc: 'Tape le nom d\'un exercice dans le champ en bas du modal, règle séries / reps / poids, puis enregistre.',
    btn: 'Voir comment faire →',
    target: () => document.getElementById('mos-new') || document.querySelector('#pgrid .pdc'),
    action: () => {
      // Open first configured day's modal
      const di = S.week.findIndex(d => d.name && d.name.trim() && d.type !== 'rest');
      if(di >= 0){
        go('prog', document.querySelectorAll('.tab')[1]);
        setTimeout(() => openModal(di), 300);
      }
    },
    isDone: () => S.week.some(d => d.exercises && d.exercises.length > 0),
  },
  {
    id: 'log-set',
    icon: '✅',
    label: 'Étape 3 / 3',
    title: 'Logger ta première série',
    desc: 'Va dans Séance, ouvre l\'exercice dans la colonne Réalisé, clique "+ Série" et entre ton poids et tes reps.',
    btn: 'Aller à la séance →',
    target: () => document.querySelector('#sv .btn-ghost') || document.querySelector('#sv .exo-hd'),
    action: () => {
      // Navigate to dash, open first exercise with exercises
      const di = S.week.findIndex(d => d.exercises && d.exercises.length > 0);
      if(di >= 0){
        curDay = di;
        go('dash', document.querySelectorAll('.tab')[0]);
        setTimeout(() => {
          expandA = 0;
          renderSession();
          // scroll to the actual row
          const det = document.querySelector('#sv .act-det.open');
          if(det) det.scrollIntoView({behavior:'smooth', block:'center'});
        }, 350);
      } else {
        go('dash', document.querySelectorAll('.tab')[0]);
      }
    },
    isDone: () => Object.values(S.logs).some(l => l && l.length > 0),
  },
];

let _obStep = 0;
let _obVisible = false;
let _obPollTimer = null;
let _obResizeTimer = null;

// ── Public API ──
window.obStart = function(forceStep){
  if(forceStep !== undefined) _obStep = forceStep;
  _obVisible = true;
  document.getElementById('ob-overlay').classList.remove('hidden');
  _renderStep();
  _startPoll();
  window.addEventListener('resize', _onResize);
};

window.obSkip = function(){
  _obClose(true);
};

window.obAction = function(){
  const step = STEPS[_obStep];
  step.action();
  // reposition after navigation settles
  setTimeout(_positionCard, 400);
  setTimeout(_positionCard, 800);
};

window.obClose = function(){ _obClose(false); };

function _obClose(dismissed){
  _obVisible = false;
  document.getElementById('ob-overlay').classList.add('hidden');
  clearInterval(_obPollTimer);
  window.removeEventListener('resize', _onResize);
  if(dismissed) localStorage.setItem(OB_KEY, 'skipped');
}

function _obComplete(){
  localStorage.setItem(OB_KEY, 'done');
  _flashDone(() => {
    _obClose(false);
    showToast('🎉 Onboarding terminé — bon entraînement !');
    haptic([20, 40, 60]);
  });
}

// ── Render current step ──
function _renderStep(){
  const step = STEPS[_obStep];
  const el = id => document.getElementById('ob-' + id);

  // Pills
  el('pills').innerHTML = STEPS.map((_, i) => {
    const cls = i < _obStep ? 'done' : i === _obStep ? 'active' : '';
    return `<div class="ob-pill ${cls}"></div>`;
  }).join('');

  el('icon').textContent = step.icon;
  el('step-label').textContent = step.label;
  el('title').textContent = step.title;
  el('desc').textContent = step.desc;
  document.getElementById('ob-btn').textContent = step.btn;

  // Skip vs close label
  const isLast = _obStep === STEPS.length - 1;
  document.getElementById('ob-skip').textContent = isLast ? '' : 'Passer';

  _positionCard();

  // Spotlight pulse
  const spot = document.getElementById('ob-spot');
  spot.classList.remove('pulse');
  void spot.offsetWidth;
  setTimeout(() => spot.classList.add('pulse'), 50);
}

// ── Position spotlight + card around target ──
function _positionCard(){
  const step = STEPS[_obStep];
  const target = step.target ? step.target() : null;
  const card = document.getElementById('ob-card');
  const spot = document.getElementById('ob-spot');
  const arrow = document.getElementById('ob-arrow');
  const VW = window.innerWidth, VH = window.innerHeight;
  const CARD_W = Math.min(320, VW - 32);
  const PAD = 12;

  if(target){
    const r = target.getBoundingClientRect();
    // Spotlight
    const spad = 8;
    spot.style.left   = (r.left - spad) + 'px';
    spot.style.top    = (r.top - spad) + 'px';
    spot.style.width  = (r.width + spad*2) + 'px';
    spot.style.height = (r.height + spad*2) + 'px';
    spot.style.display = 'block';

    // Card position: prefer below target, fallback above
    const cardH = card.offsetHeight || 220;
    const spaceBelow = VH - r.bottom - PAD;
    const spaceAbove = r.top - PAD;
    let cardTop, arrowDir;

    if(spaceBelow >= cardH + 20 || spaceBelow >= spaceAbove){
      cardTop = r.bottom + PAD;
      arrowDir = 'up';
    } else {
      cardTop = r.top - cardH - PAD;
      arrowDir = 'down';
    }

    // Horizontal: align with target, clamp to viewport
    let cardLeft = r.left;
    cardLeft = Math.max(16, Math.min(VW - CARD_W - 16, cardLeft));

    card.style.left   = cardLeft + 'px';
    card.style.top    = Math.max(16, cardTop) + 'px';
    card.style.width  = CARD_W + 'px';
    card.style.transform = 'none';

    // Arrow
    arrow.className = 'ob-arrow ' + arrowDir;
    const arrowLeft = Math.max(16, r.left + r.width/2 - cardLeft - 9);
    arrow.style.left = arrowLeft + 'px';
  } else {
    // No target — center card
    spot.style.display = 'none';
    card.style.left   = '50%';
    card.style.top    = '50%';
    card.style.width  = CARD_W + 'px';
    card.style.transform = 'translate(-50%, -50%)';
    arrow.className = 'ob-arrow';
  }
}

// ── Poll for step completion ──
function _startPoll(){
  clearInterval(_obPollTimer);
  _obPollTimer = setInterval(() => {
    if(!_obVisible) { clearInterval(_obPollTimer); return; }
    const step = STEPS[_obStep];
    if(step.isDone()){
      clearInterval(_obPollTimer);
      haptic(18);
      _flashDone(() => {
        _obStep++;
        if(_obStep >= STEPS.length){
          _obComplete();
        } else {
          _renderStep();
          _startPoll();
        }
      });
    }
  }, 600);
}

function _flashDone(cb){
  const flash = document.getElementById('ob-done-flash');
  flash.innerHTML = '<span class="ob-check">✓</span>';
  flash.classList.add('show');
  setTimeout(() => {
    flash.classList.remove('show');
    setTimeout(cb, 200);
  }, 900);
}

function _onResize(){
  clearTimeout(_obResizeTimer);
  _obResizeTimer = setTimeout(_positionCard, 120);
}

// ── Auto-start on first visit ──
function _shouldShow(){
  const done = localStorage.getItem(OB_KEY);
  if(done) return false;
  // Show if week is totally empty
  const isEmpty = S.week.every(d => !d.name || !d.name.trim());
  const noLogs = Object.keys(S.logs).length === 0;
  return isEmpty && noLogs;
}

// Expose for manual restart (e.g. from a help button)
window.restartOnboarding = function(){
  localStorage.removeItem(OB_KEY);
  _obStep = 0;
  // Find first incomplete step
  for(let i = 0; i < STEPS.length; i++){
    if(!STEPS[i].isDone()){ _obStep = i; break; }
  }
  obStart(_obStep);
};

// Delay start so app renders first
// Don't launch if welcome screen is showing (user hasn't loaded their data yet)
setTimeout(() => {
  const ws = document.getElementById('welcome-screen');
  const wsVisible = ws && !ws.classList.contains('hidden');
  if(_shouldShow() && !wsVisible) obStart(0);
}, 600);

})(); // end IIFE
