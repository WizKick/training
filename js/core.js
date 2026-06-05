/* ═══ THEME — 3 états : dark → oled → light ═══ */
(function(){
  const saved = localStorage.getItem('sbt-theme');
  const html = document.documentElement;
  html.classList.remove('light','oled');
  if(saved === 'light') html.classList.add('light');
  else if(saved === 'oled') html.classList.add('oled');
})();

function _applyTheme(theme){
  const html = document.documentElement;
  html.classList.remove('light','oled');
  if(theme === 'light') html.classList.add('light');
  else if(theme === 'oled') html.classList.add('oled');
  localStorage.setItem('sbt-theme', theme);
  _syncThemeBtn(theme);
  // Redraw charts if visible
  if(document.getElementById('page-graphs').classList.contains('on')){drawGraph();drawMuscleChart();}
  if(document.getElementById('page-dash').classList.contains('on')){drawVolumeDayChart();}
}

function _syncThemeBtn(theme){
  const iconDark  = document.getElementById('theme-icon-dark');
  const iconLight = document.getElementById('theme-icon-light');
  if(!iconDark) return;
  if(theme === 'light'){
    iconDark.style.display  = 'none';
    iconLight.style.display = 'block';
  } else {
    iconDark.style.display  = 'block';
    iconLight.style.display = 'none';
  }
  // OLED badge handled purely by CSS class
  const btn = document.getElementById('theme-btn');
  if(btn) btn.title = theme==='dark'?'Thème : sombre → OLED → clair':theme==='oled'?'Thème : OLED → clair → sombre':'Thème : clair → sombre → OLED';
}

function toggleTheme(){
  const html = document.documentElement;
  const current = html.classList.contains('light') ? 'light' : html.classList.contains('oled') ? 'oled' : 'dark';
  const next = current === 'dark' ? 'oled' : current === 'oled' ? 'light' : 'dark';
  _applyTheme(next);
  haptic(12);
}

/* init icon state on load */
document.addEventListener('DOMContentLoaded', function(){
  const saved = localStorage.getItem('sbt-theme') || 'dark';
  _syncThemeBtn(saved);
});

/* ═══ STATE ═══ */
const DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

function defaultState() {
  return { week: DAYS.map(d=>({day:d,name:'',type:'rest',exercises:[]})), logs:{}, done:{}, notes:{}, savedWeeks:{}, wellness:{}, periodization:{enabled:false,anchor:null,weeks:{A:null,B:null,C:null}}, nutrition:{}, nutrGoals:{}, _version:9 };
}
function loadState() { try { return JSON.parse(localStorage.getItem('sbt6')) || defaultState(); } catch(e) { return defaultState(); } }
function saveState() { if(S && !S._version) S._version = 9; safeSetItem('sbt6', JSON.stringify(S)); if(typeof scheduleSyncPush==='function') scheduleSyncPush(); }

/* ═══ STOCKAGE SÉCURISÉ — alerte si quota plein ═══ */
let _storageWarned = false;
function safeSetItem(key, value){
  try {
    localStorage.setItem(key, value);
    _storageWarned = false;
    return true;
  } catch(e){
    // QuotaExceededError (ou équivalent Safari/iOS)
    const quota = e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014);
    if(quota && !_storageWarned){
      _storageWarned = true;
      if(typeof showToast === 'function'){
        showToast('⚠️ Stockage plein — exporte tes données puis allège (photos/médias) pour ne rien perdre.');
      } else {
        try{ alert('Stockage plein : exporte tes données pour ne rien perdre.'); }catch(_){}
      }
    }
    return false;
  }
}

/* ═══ CLAVIER NUMÉRIQUE MOBILE — applique inputmode à tous les champs number ═══ */
(function(){
  function tagNumberInputs(root){
    const scope = (root && root.querySelectorAll) ? root : document;
    scope.querySelectorAll('input[type="number"]:not([inputmode])').forEach(function(inp){
      // step contenant un décimal → clavier décimal, sinon numérique
      const step = inp.getAttribute('step') || '';
      inp.setAttribute('inputmode', /\.|0?\.\d|0\.5|0\.1|0\.25|1\.25/.test(step) ? 'decimal' : 'numeric');
    });
  }
  function boot(){
    tagNumberInputs(document);
    // Les vues sont rendues dynamiquement → on observe les ajouts au DOM
    try {
      const mo = new MutationObserver(function(muts){
        for(const m of muts){
          for(const n of m.addedNodes){
            if(n.nodeType === 1){
              if(n.matches && n.matches('input[type="number"]:not([inputmode])')){
                const step = n.getAttribute('step')||'';
                n.setAttribute('inputmode', /\.|0\.5|0\.1|0\.25|1\.25/.test(step) ? 'decimal' : 'numeric');
              }
              if(n.querySelectorAll) tagNumberInputs(n);
            }
          }
        }
      });
      mo.observe(document.body, {childList:true, subtree:true});
    } catch(e){}
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* ── Récupération cloud au démarrage (si sync activée) ── */
(function(){
  function tryCloudPull(){
    if(typeof syncEnabled !== 'function' || !syncEnabled()) return;
    // Laisse le temps à Supabase JS de se charger
    let tries = 0;
    const iv = setInterval(function(){
      tries++;
      if(window.supabase && typeof syncPull === 'function'){
        clearInterval(iv);
        // Pull silencieux : récupère la dernière version du cloud
        syncPull(true);
      } else if(tries > 20){ clearInterval(iv); }
    }, 250);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryCloudPull);
  else tryCloudPull();
})();

/* ═══ EXPORT REMINDER ═══ */
const EXPORT_REMINDER_KEY = 'sbt6-last-export';
const REMINDER_DAYS = 7; // show reminder after this many days without export

function getLastExportDate() {
  const ts = localStorage.getItem(EXPORT_REMINDER_KEY);
  return ts ? new Date(ts) : null;
}

function getDaysSinceExport() {
  const last = getLastExportDate();
  if (!last) return Infinity;
  return Math.floor((Date.now() - last.getTime()) / 86400000);
}

function updateExportBadge() {
  const days = getDaysSinceExport();
  const badge = document.getElementById('export-badge');
  if (badge) badge.classList.toggle('on', days >= REMINDER_DAYS);
}

function scheduleReminderToast() {
  // Show a gentle reminder toast after 30 min of session if no recent export
  setTimeout(() => {
    if (getDaysSinceExport() >= REMINDER_DAYS) {
      showToast('💾 Pense à exporter tes données — dernier export il y a ' + (getDaysSinceExport() === Infinity ? 'longtemps' : getDaysSinceExport() + 'j'));
    }
  }, 30 * 60 * 1000);
}

let S = (function(){
  var stored = null;
  try { stored = JSON.parse(localStorage.getItem('sbt6')); } catch(e){}
  var embedded = {"week": [{"day": "Lundi", "name": "PUSH 1", "type": "push", "exercises": [{"name": "Développé haltères (Pectoraux, Épaules avant)", "reps": 10, "rest": 150, "sets": 3, "media": [], "notes": "RIR 2-3. Pectoraux/épaules. Garde 2-3 reps en réserve, focus technique.", "weight": 6, "repRange": "8-12 reps"}, {"name": "Développé militaire haltères (Épaules globales)", "reps": 10, "rest": 150, "sets": 3, "media": [], "notes": "RIR 2-3. Épaules. Démarre léger, ne cambre pas le bas du dos.", "weight": 5, "repRange": "8-12 reps"}, {"name": "Dips (Pectoraux, Triceps)", "reps": 8, "rest": 120, "sets": 3, "media": [], "notes": "RIR 2-3. Si trop dur : dips assistés (élastique/pieds au sol). Si >12 facile : ajoute du lest.", "weight": 0, "repRange": "6-10 reps"}, {"name": "Élévations latérales (Épaules côté)", "reps": 14, "rest": 90, "sets": 3, "media": [], "notes": "RIR 2-3. Léger, monte coudes>poignets, pas d'élan.", "weight": 3, "repRange": "12-15 reps"}, {"name": "Écartés haltères couché (Pectoraux - Étirement)", "reps": 14, "rest": 90, "sets": 3, "media": [], "notes": "RIR 2-3. Étirement contrôlé, pas de charge lourde.", "weight": 4, "repRange": "12-15 reps"}, {"name": "Barre EZ serrée (Triceps)", "reps": 12, "rest": 90, "sets": 3, "media": [], "notes": "RIR 2-3. Triceps. Coudes serrés.", "weight": 5, "repRange": "10-12 reps"}]}, {"day": "Mardi", "name": "PULL 1", "type": "pull", "exercises": [{"name": "Tractions (Dos largeur, Biceps)", "reps": 6, "rest": 150, "sets": 3, "media": [], "notes": "RIR 2-3. Débutant : assisté élastique ou tirage si <5 reps. Priorité technique.", "weight": 0, "repRange": "5-8 reps (ou assisté)"}, {"name": "Rowing haltères penché (Dos épaisseur)", "reps": 12, "rest": 150, "sets": 3, "media": [], "notes": "RIR 2-3. Dos plat, tire vers les hanches. Démarre léger pour sentir le dos.", "weight": 8, "repRange": "10-12 reps"}, {"name": "Rowing barre EZ (Dos épaisseur globale)", "reps": 12, "rest": 150, "sets": 3, "media": [], "notes": "RIR 2-3. Dos neutre, contracte les omoplates.", "weight": 8, "repRange": "10-12 reps"}, {"name": "Facepull poulie haute (Épaules arrière)", "reps": 15, "rest": 90, "sets": 3, "media": [], "notes": "RIR 3. Posture. Léger, mouvement lent et propre.", "weight": 5, "repRange": "15-20 reps"}, {"name": "Curl EZ (Biceps)", "reps": 12, "rest": 90, "sets": 3, "media": [], "notes": "RIR 2-3. Coudes fixes, pas d'élan.", "weight": 5, "repRange": "10-12 reps"}, {"name": "Curl marteau haltères (Biceps, Avant-bras)", "reps": 12, "rest": 90, "sets": 3, "media": [], "notes": "RIR 2-3. Brachial + avant-bras.", "weight": 5, "repRange": "12-15 reps"}]}, {"day": "Mercredi", "name": "LEGS 1", "type": "legs", "exercises": [{"name": "Squat haltère (Cuisses avant, Fesses)", "reps": 10, "rest": 150, "sets": 3, "media": [], "notes": "RIR 2-3. Roi des jambes. Descends contrôlé, genoux dans l'axe. Démarre léger.", "weight": 8, "repRange": "8-12 reps"}, {"name": "Hip thrust haltère (Fesses)", "reps": 12, "rest": 120, "sets": 3, "media": [], "notes": "RIR 2-3. Dos calé sur le canapé/lit, haltère tenu sur les hanches (coussin). Pas de barre qui roule ni de banc qui glisse. Pousse sur les talons, contracte 1s en haut, menton rentré.", "weight": 10, "repRange": "10-12 reps"}, {"name": "Fente marchée (Cuisses avant, Fesses)", "reps": 20, "rest": 120, "sets": 3, "media": [], "notes": "RIR 2-3. Compte le NOMBRE TOTAL DE PAS (1 pas = 1 jambe). Ex : 20 pas = 10 par jambe. Note le total dans 'répétitions'. Stabilité d'abord.", "weight": 4, "repRange": "16-24 pas (total)"}, {"name": "Leg curl haltère couché (Ischios - Flexion)", "reps": 12, "rest": 90, "sets": 3, "media": [], "notes": "RIR 2-3. À PLAT VENTRE, un haltère léger serré entre les pieds (semelles). Fléchis les genoux pour ramener les talons vers les fesses, contrôle la descente. Démarre TRÈS léger (l'haltère peut glisser), pose une serviette/coussin sous les hanches.", "weight": 4, "repRange": "10-12 reps"}, {"name": "Leg extension haltère assis (Cuisses avant - Isolation)", "reps": 15, "rest": 90, "sets": 3, "media": [], "notes": "RIR 2-3. ASSIS sur une chaise/banc, un haltère léger serré entre les pieds. Tends les jambes à l'horizontale, contraction des quadris en haut 1s, descente contrôlée. Charge légère, focus sensation quadriceps.", "weight": 4, "repRange": "15-20 reps"}, {"name": "Mollets debout haltère (Mollets - Gastrocnémiens)", "reps": 15, "rest": 75, "sets": 4, "media": [], "notes": "RIR 2-3. AJOUT 1 série (4 au lieu de 3). Amplitude complète, pause en bas.", "weight": 8, "repRange": "15-20 reps"}]}, {"day": "Jeudi", "name": "REPOS", "type": "rest", "exercises": []}, {"day": "Vendredi", "name": "PUSH 2", "type": "push", "exercises": [{"name": "Développé incliné haltères (Haut des Pectoraux)", "reps": 10, "rest": 150, "sets": 3, "media": [], "notes": "RIR 2-3. Haut des pecs. Banc 30°, démarre léger.", "weight": 5, "repRange": "8-12 reps"}, {"name": "Développé militaire EZ (Épaules avant, Triceps)", "reps": 10, "rest": 150, "sets": 3, "media": [], "notes": "RIR 2-3. Épaules/triceps. Gainage serré.", "weight": 5, "repRange": "8-12 reps"}, {"name": "Dips (Pectoraux, Triceps)", "reps": 8, "rest": 120, "sets": 3, "media": [], "notes": "RIR 2-3. Si trop dur : dips assistés (élastique/pieds au sol). Si >12 facile : ajoute du lest.", "weight": 0, "repRange": "6-10 reps"}, {"name": "Écarté incliné (Haut des Pectoraux - Étirement)", "reps": 14, "rest": 90, "sets": 3, "media": [], "notes": "RIR 2-3. Étirement haut des pecs, léger.", "weight": 4, "repRange": "12-15 reps"}, {"name": "Élévations latérales (Épaules côté)", "reps": 14, "rest": 90, "sets": 3, "media": [], "notes": "RIR 2-3. Léger, monte coudes>poignets, pas d'élan.", "weight": 3, "repRange": "12-15 reps"}, {"name": "Overhead triceps haltère (Triceps - Longue portion)", "reps": 12, "rest": 90, "sets": 3, "media": [], "notes": "RIR 2-3. Longue portion triceps, étirement contrôlé.", "weight": 6, "repRange": "12-15 reps"}]}, {"day": "Samedi", "name": "PULL 2", "type": "pull", "exercises": [{"name": "Tirage poulie haute grip large (Dos largeur)", "reps": 12, "rest": 150, "sets": 3, "media": [], "notes": "RIR 2-3. Règle la pile. Tire vers la poitrine, omoplates serrées.", "weight": 0, "repRange": "10-12 reps"}, {"name": "Rowing unilatéral (Dos épaisseur par côté)", "reps": 12, "rest": 120, "sets": 3, "media": [], "notes": "RIR 2-3. 10-12 par côté, dos stable.", "weight": 6, "repRange": "10-12 reps/côté"}, {"name": "Shrugs (Trapèzes)", "reps": 15, "rest": 90, "sets": 4, "media": [], "notes": "RIR 2-3. AJOUT 1 série trapèzes (4 au lieu de 3). Contracte 1s en haut, pas de rotation.", "weight": 8, "repRange": "12-15 reps"}, {"name": "Facepull (Épaules arrière, Posture)", "reps": 15, "rest": 90, "sets": 3, "media": [], "notes": "RIR 3. Posture anti-enroulé, léger.", "weight": 5, "repRange": "15-20 reps"}, {"name": "Curl EZ prises différentes (Biceps globaux)", "reps": 12, "rest": 90, "sets": 3, "media": [], "notes": "RIR 2-3. Alterne prise large/serrée.", "weight": 5, "repRange": "10-12 reps"}, {"name": "Curl marteau lent (Biceps, Avant-bras)", "reps": 12, "rest": 90, "sets": 3, "media": [], "notes": "RIR 2-3. Tempo 2s descente.", "weight": 5, "repRange": "12-15 reps"}]}, {"day": "Dimanche", "name": "LEGS 2", "type": "legs", "exercises": [{"name": "Soulevé de terre jambes tendues (Ischios, Fessiers)", "reps": 10, "rest": 150, "sets": 3, "media": [], "notes": "RIR 2-3. Dos NEUTRE absolument. Gros mouvement ischios/fessiers. Étire bien, charge modérée.", "weight": 10, "repRange": "8-12 reps"}, {"name": "Squat haltères (Cuisses globales)", "reps": 10, "rest": 150, "sets": 3, "media": [], "notes": "RIR 2-3. Descends contrôlé, genoux dans l'axe.", "weight": 8, "repRange": "8-12 reps"}, {"name": "Hip thrust haltère (Fesses - Puissance)", "reps": 10, "rest": 120, "sets": 3, "media": [], "notes": "RIR 2-3. Dos calé canapé/lit, haltère sur les hanches (coussin pour le confort). Charge progressive vers le lourd. Pousse sur les talons, contraction 1s en haut.", "weight": 12, "repRange": "8-12 reps"}, {"name": "Leg curl haltère couché (Ischios - Flexion)", "reps": 12, "rest": 90, "sets": 3, "media": [], "notes": "RIR 2-3. À PLAT VENTRE, un haltère léger serré entre les pieds (semelles). Fléchis les genoux pour ramener les talons vers les fesses, contrôle la descente. Démarre TRÈS léger (l'haltère peut glisser), pose une serviette/coussin sous les hanches.", "weight": 4, "repRange": "10-12 reps"}, {"name": "Fente arrière (Cuisses avant, Fesses)", "reps": 20, "rest": 120, "sets": 3, "media": [], "notes": "RIR 2-3. Compte le NOMBRE TOTAL DE PAS (1 recul = 1 pas, 1 jambe). Ex : 20 pas = 10 par jambe. Note le total dans 'répétitions'.", "weight": 5, "repRange": "16-24 pas (total)"}, {"name": "Mollets assis/lent (Mollets - Soléaire)", "reps": 15, "rest": 75, "sets": 4, "media": [], "notes": "RIR 2-3. AJOUT 1 série. Tempo lent, contraction max. Assis cible le soléaire.", "weight": 8, "repRange": "15-20 reps"}]}], "logs": {}, "done": {}, "notes": {}, "savedWeeks": {}, "wellness": {}, "periodization": {"enabled": false, "anchor": null, "weeks": {"A": null, "B": null, "C": null}}, "nutrition": {}, "nutrGoals": {}, "_version": 10, "_notes": "Profil DÉBUTANT ECTOMORPHE 1m83/66->83kg, hypertrophie · 6j PPLx2 · RIR 2-3 · TOUT À LA MAISON sans machine : hip thrust haltère (dos canapé), leg curl haltère couché, leg extension haltère assis · Fentes comptées en PAS TOTAUX · Ischios équilibrés (leg curl x2/sem) · double progression · Convention poids = disques par côté/main hors barre (halt. vide 2.25kg, EZ 4.5kg, barre droite 10kg) · Repos : composé 150s, secondaire 120s, isolation 75-90s · pause entre exos = même temps qu'entre séries"};
  // ─── MIGRATION INTELLIGENTE ───
  // Si on a une sauvegarde valide, on garde l'HISTORIQUE (logs, done, wellness, notes…)
  // mais on met à jour le PROGRAMME (week) quand la version embarquée est plus récente.
  if(stored && stored.week && stored.week.length === 7){
    // Version locale : on NE touche JAMAIS au programme de l'utilisateur.
    // On répare juste _version s'il manque, puis on charge tel quel.
    if(!stored._version){ stored._version = embedded._version; }
    try { localStorage.setItem('sbt6', JSON.stringify(stored)); } catch(e){}
    return stored;
  }
  // Pas de sauvegarde exploitable → on nettoie et on charge le programme embarqué
  try { localStorage.removeItem('sbt6'); } catch(e){}
  try { localStorage.setItem('sbt6', JSON.stringify(embedded)); } catch(e){}
  return embedded;
})();
let curDay=0, expandP=-1, expandA=-1, editDayIdx=-1;
let timerIv=null, timerLeft=0, timerTotal=0;
let curMetric='volume';
let _ee=[];

/* ═══ GLOBAL STOPWATCH ═══ */
let _swStartTs = null;   // Date.now() when started
let _swElapsed = 0;      // ms accumulated before last pause
let _swRunning = false;
let _swIv = null;

/* ═══ INIT ═══ */
(function(){
  const d=new Date(), map=[6,0,1,2,3,4,5]; curDay=map[d.getDay()];
  const lbl=d.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  document.getElementById('dtxt').textContent=lbl.charAt(0).toUpperCase()+lbl.slice(1);
  if(!S.notes) S.notes={};
  if(!S.savedWeeks) S.savedWeeks={};
  if(!S.periodization) S.periodization={enabled:false,anchor:null,weeks:{A:null,B:null,C:null}};
  // On load, apply the current periodization week if enabled
  applyPeriodizationWeek();
  try{ localStorage.removeItem('sbt-prog-updated'); }catch(e){}
})();

/* ═══ BANNIÈRE 007 — citations originales esprit agent (sarcasme + humour + motivation) ═══ */
const BOND_QUOTES = [
  {q:"God created men. <span class='accent'>I created the difference between merely existing and having class.</span>", s:"007"},
  {q:"I don't brag. <span class='accent'>I simply describe reality with a slightly sexier accent than yours.</span>", s:"007"},
  {q:"If I got an apology every time I was right, <span class='accent'>I'd never have time to sleep.</span>", s:"007"},
  {q:"My greatest flaw? <span class='accent'>I'm physically incapable of imagining anyone doing it better than me.</span>", s:"007"},
  {q:"The mirror is my only reliable advisor. <span class='accent'>At least we agree on who's the boss.</span>", s:"007"},
  {q:"I don't love myself a little too much. <span class='accent'>You just don't love me enough for what I'm worth.</span>", s:"007"},
  {q:"Why should I be modest <span class='accent'>when I'm the best thing that ever happened to this service?</span>", s:"007"},
  {q:"Loving yourself <span class='accent'>is the guarantee of a romance that lasts a lifetime.</span>", s:"007"},
  {q:"Don't ask me to share the glory, <span class='accent'>there's barely enough for my ego as it is.</span>", s:"007"},
  {q:"My being here is already an act of charity. <span class='accent'>Don't waste my burst of generosity.</span>", s:"007"},
  {q:"I'm not trying to please. <span class='accent'>I'm just giving people the chance to have good taste.</span>", s:"007"},
  {q:"If perfection had a name, <span class='accent'>it would insist I call it by its first name.</span>", s:"007"},
  {q:"I'm not above the law. <span class='accent'>I'm just the reason they had to write new ones.</span>", s:"007"},
  {q:"My talent is inversely proportional <span class='accent'>to your ability to understand it.</span>", s:"007"},
  {q:"You think I'm full of myself? <span class='accent'>Wait until you see the size of my end-of-mission paycheck.</span>", s:"007"},
  {q:"Oh, you tried? How adorable. <span class='accent'>Now step aside and watch how it's done.</span>", s:"007"},
  {q:"I feel for your pain. <span class='accent'>But to be perfectly honest, I'm already bored.</span>", s:"007"},
  {q:"Crying won't bring your dignity back. <span class='accent'>It does, however, ruin the view.</span>", s:"007"},
  {q:"Your tears barely lubricate <span class='accent'>the gears of my indifference.</span>", s:"007"},
  {q:"If I'd wanted your opinion, <span class='accent'>I'd have handed you a script.</span>", s:"007"},
  {q:"It's fascinating to see <span class='accent'>how proud you are of such a mediocre result.</span>", s:"007"},
  {q:"You're entitled to an opinion. <span class='accent'>Just as I'm entitled to find it stupid.</span>", s:"007"},
  {q:"Apologizing is for people who intend not to do it again. <span class='accent'>That's not my case.</span>", s:"007"},
  {q:"Don't put yourself down, <span class='accent'>I'm already here for that.</span>", s:"007"},
  {q:"Your level of incompetence <span class='accent'>is almost an art form at this point.</span>", s:"007"},
  {q:"Training hard is for those without natural talent. <span class='accent'>Personally, I take naps.</span>", s:"007"},
  {q:"I tried to listen to you, <span class='accent'>but my brain triggered an emergency anti-boredom protocol.</span>", s:"007"},
  {q:"Please, keep talking. <span class='accent'>I love it when you give me good reasons to ignore you.</span>", s:"007"},
  {q:"Don't bother thinking, <span class='accent'>you don't have the tools for it.</span>", s:"007"},
  {q:"Your sacrifice will be deeply appreciated... <span class='accent'>especially by me, since it saves me from getting my hands dirty.</span>", s:"007"},
  {q:"Collateral damage? <span class='accent'>I call them spectators who stood a little too close to the action.</span>", s:"007"},
  {q:"The Geneva Convention <span class='accent'>is an excellent reading suggestion for long flights.</span>", s:"007"},
  {q:"Killing people is stressful work. <span class='accent'>Good thing I love my job.</span>", s:"007"},
  {q:"I don't break hearts, I break careers. <span class='accent'>It's far more profitable.</span>", s:"007"},
  {q:"Die for my country? What a stupid idea. <span class='accent'>I'd rather the man across from me die for his. It's more hygienic.</span>", s:"007"},
  {q:"Respect for human life is a very elastic notion <span class='accent'>when you hold a licence to kill.</span>", s:"007"},
  {q:"Don't lecture me about morality, <span class='accent'>I sold mine to fund my first suit.</span>", s:"007"},
  {q:"The end justifies the means. <span class='accent'>And if the means involve blowing up a city block, all the better.</span>", s:"007"},
  {q:"I have no remorse. <span class='accent'>It's useless weight in carry-on luggage.</span>", s:"007"},
  {q:"Human rights? I have two: <span class='accent'>the right to aim, and the right to fire.</span>", s:"007"},
  {q:"Ethics is an invention <span class='accent'>of people who can't afford a good lawyer.</span>", s:"007"},
  {q:"A bloodbath? <span class='accent'>No, just a slightly aggressive bit of interior redecorating.</span>", s:"007"},
  {q:"World peace <span class='accent'>is bad for my career plan.</span>", s:"007"},
  {q:"You can't make an omelette without breaking eggs. <span class='accent'>And today, I feel like making a very large omelette.</span>", s:"007"},
  {q:"Don't ask me to save everyone, <span class='accent'>I only pick from the top of the basket.</span>", s:"007"},
  {q:"M asked me to be more diplomatic. <span class='accent'>So I used a silencer.</span>", s:"007"},
  {q:"Your budgets interest me about as much as the weather in Siberia. <span class='accent'>Give me my toys.</span>", s:"007"},
  {q:"If I followed your orders to the letter, <span class='accent'>the world would be run by grieving bureaucrats.</span>", s:"007"},
  {q:"The mission report? I summed it up in three words: <span class='accent'>\"I came, I won, pay me.\"</span>", s:"007"},
  {q:"Do you want me discreet or effective? <span class='accent'>Because both costs too much in dry cleaning.</span>", s:"007"},
  {q:"Cute that you have rules. <span class='accent'>Gives me things to tick off my list of transgressions.</span>", s:"007"},
  {q:"Don't threaten to revoke my licence to kill, <span class='accent'>I do excellent work off the books.</span>", s:"007"},
  {q:"The disciplinary board? <span class='accent'>Great, I love when meetings are arranged just to talk about me.</span>", s:"007"},
  {q:"Your threats of dismissal quietly amuse me. <span class='accent'>Who's going to replace me? An intern with a Master's in geopolitics?</span>", s:"007"},
  {q:"I don't disobey. <span class='accent'>I simply anticipate the moment you'll realize I was right.</span>", s:"007"},
  {q:"If MI6 wanted obedience, <span class='accent'>they should've bought a Golden Retriever, not hired me.</span>", s:"007"},
  {q:"Q complains that I break his gear. <span class='accent'>He should thank me for testing the mediocrity of his plastics.</span>", s:"007"},
  {q:"Paperwork <span class='accent'>is an insult to my available brain capacity.</span>", s:"007"},
  {q:"Don't tell me what to do, <span class='accent'>you don't even have the level to understand what I just pulled off.</span>", s:"007"},
  {q:"You sign the cheques, <span class='accent'>I sign the death warrants. Let's leave it at that.</span>", s:"007"},
  {q:"Be the nightmare <span class='accent'>your enemies don't even dare to imagine.</span>", s:"007"},
  {q:"Modesty doesn't pay the bills. <span class='accent'>Justified arrogance does.</span>", s:"007"},
  {q:"Crush the competition. <span class='accent'>Apologize afterward. Or better: don't apologize at all.</span>", s:"007"},
  {q:"Don't aim for the moon. <span class='accent'>Aim at those who think they can reach it before you.</span>", s:"007"},
  {q:"The world belongs to those who help themselves first, <span class='accent'>while the others are still reading the menu.</span>", s:"007"},
  {q:"Leave pity to the weak, <span class='accent'>they need it more than you do.</span>", s:"007"},
  {q:"You don't reach the top <span class='accent'>by asking the elevator for permission.</span>", s:"007"},
  {q:"Be so strong <span class='accent'>that your mere presence becomes a threat to other people's egos.</span>", s:"007"},
  {q:"Second place is the first of the losers. <span class='accent'>Don't be polite, be first.</span>", s:"007"},
  {q:"If your dreams don't scare ordinary people, <span class='accent'>you're severely lacking in ambition.</span>", s:"007"},
  {q:"Kindness <span class='accent'>is a lack of strategy.</span>", s:"007"},
  {q:"Don't survive the competition. <span class='accent'>Disqualify it on a technicality.</span>", s:"007"},
  {q:"Your success should be insolent enough <span class='accent'>to give your critics ulcers.</span>", s:"007"},
  {q:"Teamwork means sharing the blame for failure. <span class='accent'>Win alone.</span>", s:"007"},
  {q:"Don't ask for directions, <span class='accent'>force them to build the road for you.</span>", s:"007"},
  {q:"My patience has very precise limits. <span class='accent'>They're exactly the calibre of my weapon.</span>", s:"007"},
  {q:"The champagne is warm, <span class='accent'>but my revenge will be ice cold.</span>", s:"007"},
  {q:"You think I have a heart of stone? <span class='accent'>Wrong: stone is far more fragile.</span>", s:"007"},
  {q:"I have a soft spot for hopeless situations, <span class='accent'>they give me an excuse to be insufferable.</span>", s:"007"},
  {q:"Don't talk to me about fate. <span class='accent'>Fate is what happens when I'm not in the room.</span>", s:"007"},
  {q:"The suit may be bloodstained, <span class='accent'>but the crease in the trousers stays impeccable.</span>", s:"007"},
  {q:"Fear is an interesting concept. <span class='accent'>I love seeing it on other people's faces.</span>", s:"007"},
  {q:"A bad day? <span class='accent'>No, just an opportunity to test my tolerance for idiots.</span>", s:"007"},
  {q:"I don't negotiate with terrorists. <span class='accent'>They're sorely lacking in conversation.</span>", s:"007"},
  {q:"Pain? <span class='accent'>It's just information arriving at my brain too late.</span>", s:"007"},
  {q:"I don't need luck, <span class='accent'>I have ammunition.</span>", s:"007"},
  {q:"Don't tell me I'm cynical. <span class='accent'>It's just realism with a touch of genius.</span>", s:"007"},
  {q:"Danger excites me. <span class='accent'>Ordinary people put me to sleep.</span>", s:"007"},
  {q:"You want to break me? <span class='accent'>Get comfortable, the queue is long.</span>", s:"007"},
  {q:"I don't stop when I'm tired. <span class='accent'>I stop when the job is cleaned up.</span>", s:"007"},
  {q:"Too perfect to be honest. <span class='accent'>Too good to be stopped.</span>", s:"007"},
  {q:"Smile. <span class='accent'>You're losing to someone better than you.</span>", s:"007"},
  {q:"Often imitated, never equalled, <span class='accent'>always hated.</span>", s:"007"},
  {q:"The elite <span class='accent'>doesn't wait for your validation.</span>", s:"007"},
  {q:"Step into legend, <span class='accent'>or get out of my way.</span>", s:"007"},
  {q:"The talent is me. <span class='accent'>The rest is just scenery.</span>", s:"007"},
  {q:"No regrets, <span class='accent'>just results.</span>", s:"007"},
  {q:"Arrogance is an art. <span class='accent'>I'm a masterpiece.</span>", s:"007"},
  {q:"Sorry in advance <span class='accent'>for what I'm about to put you through.</span>", s:"007"},
  {q:"007% mercy. <span class='accent'>100% efficiency.</span>", s:"007"}
];
let _bondIdx = -1;
function renderBondQuote(animate){
  const qEl = document.getElementById('bb-quote');
  const sEl = document.getElementById('bb-sign');
  if(!qEl || !sEl) return;
  let i = Math.floor(Math.random()*BOND_QUOTES.length);
  if(BOND_QUOTES.length > 1){ while(i === _bondIdx){ i = Math.floor(Math.random()*BOND_QUOTES.length); } }
  _bondIdx = i;
  const item = BOND_QUOTES[i];
  qEl.innerHTML = item.q;
  sEl.textContent = item.s === '007' ? 'Agent 007' : item.s;
  if(animate){ qEl.style.animation='none'; void qEl.offsetWidth; qEl.style.animation='bbFade .4s cubic-bezier(.22,1,.36,1)'; }
}
function newBondQuote(ev){
  if(ev){ ev.stopPropagation(); }
  renderBondQuote(true);
  if(typeof haptic==='function') haptic(12);
}
// Rendu initial dès que le DOM est prêt
if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>renderBondQuote(false));
else renderBondQuote(false);

// Returns 'A', 'B', or 'C' for a given monday date based on anchor
function getWeekLabel(monday){
  const p = S.periodization;
  if(!p || !p.enabled || !p.anchor) return null;
  const anchor = new Date(p.anchor+'T12:00:00'); // monday of week A
  const anchorMon = getMondayOf(anchor);
  const diff = Math.round((getMondayOf(monday) - anchorMon) / (7*86400000));
  const idx = ((diff % 3) + 3) % 3; // 0=A, 1=B, 2=C
  return ['A','B','C'][idx];
}

// Returns label for the CURRENT week
function getCurrentWeekLabel(){
  return getWeekLabel(new Date());
}

// Apply the right A/B/C week to S.week if periodization is enabled
function applyPeriodizationWeek(){
  const p = S.periodization;
  if(!p || !p.enabled) return;
  const label = getCurrentWeekLabel();
  if(!label) return;
  const weekData = p.weeks[label];
  if(weekData && Array.isArray(weekData)){
    S.week = weekData.map(d=>({...d, exercises:(d.exercises||[]).map(e=>({...e}))}));
  }
}

// Render the periodization bar (for dashboard & programme pages)
function renderPerioBar(containerId){
  const el = document.getElementById(containerId);
  if(!el) return;
  const p = S.periodization;
  if(!p || !p.enabled){
    el.innerHTML = '';
    return;
  }
  const curLabel = getCurrentWeekLabel() || '?';
  const colorClass = 'perio-badge-'+curLabel;
  const labels = ['A','B','C'];

  // Build next 4 weeks cycle preview
  const today = new Date();
  const cycles = [];
  for(let i=0; i<6; i++){
    const d = new Date(today);
    d.setDate(d.getDate() + i*7);
    const mon = getMondayOf(d);
    const lbl = getWeekLabel(mon)||'?';
    const monStr = mon.toLocaleDateString('fr-FR',{day:'numeric',month:'short'});
    cycles.push({lbl, monStr, isCur: i===0});
  }

  const cycleHTML = cycles.map(c=>`<div class="perio-cycle-item${c.isCur?' cur':''}">
    <span style="font-weight:${c.isCur?'700':'400'}">${c.lbl}</span>
    <span style="font-size:8px;margin-left:4px;opacity:.7">${c.monStr}</span>
  </div>`).join('→');

  el.innerHTML = `<div class="perio-bar">
    <span class="perio-badge ${colorClass}">${curLabel}</span>
    <div class="perio-label"><b>Semaine ${curLabel}</b> en cours — cycle A→B→C automatique</div>
    <div class="perio-week-tabs" id="${containerId}-tabs">
      ${labels.map(l=>`<button class="perio-tab${l===curLabel?' on-'+l:''}" onclick="previewPerioWeek('${l}','${containerId}')">${l}</button>`).join('')}
    </div>
    <div class="perio-cycle-row" style="margin-top:6px">${cycleHTML}</div>
  </div>`;
}

// Preview a specific A/B/C week from the bar (switch S.week temporarily to that label's data)
let _perioPrevievedLabel = null;
function previewPerioWeek(label, containerId){
  const p = S.periodization;
  if(!p || !p.enabled) return;
  _perioPrevievedLabel = label;
  // Update tab styles
  const tabs = document.querySelectorAll(`#${containerId}-tabs .perio-tab`);
  tabs.forEach(b=>{
    b.className = 'perio-tab';
    const l = b.textContent.trim();
    if(l===label) b.classList.add('on-'+label);
  });
  // Apply preview week
  const weekData = p.weeks[label];
  if(weekData && Array.isArray(weekData)){
    S.week = weekData.map(d=>({...d, exercises:(d.exercises||[]).map(e=>({...e}))}));
  }
  renderProg();
  renderStrip();
  renderSession();
}

/* ── Perio Modal state ── */
let _perioCurTab = 'A';
let _perioEditing = null; // deep copy of p.weeks being edited

function openPerioModal(){
  const p = S.periodization;
  if(!p.enabled){ _perioEditing = {A:null,B:null,C:null}; } 
  else { _perioEditing = {
    A: p.weeks.A ? JSON.parse(JSON.stringify(p.weeks.A)) : null,
    B: p.weeks.B ? JSON.parse(JSON.stringify(p.weeks.B)) : null,
    C: p.weeks.C ? JSON.parse(JSON.stringify(p.weeks.C)) : null,
  }; }
  _perioCurTab = getCurrentWeekLabel() || 'A';

  // Set checkbox
  document.getElementById('perio-enabled-chk').checked = !!p.enabled;
  // Anchor date
  const anchorInp = document.getElementById('perio-anchor-date');
  if(p.anchor){ anchorInp.value = p.anchor; } 
  else {
    // Default: monday of current week
    anchorInp.value = weekStorageKey(getMondayOf(new Date()));
  }

  _renderPerioModalUI();
  document.getElementById('m-perio').classList.add('on');
}

function closePerioModal(){ document.getElementById('m-perio').classList.remove('on'); }

function togglePeriodization(){
  const chk = document.getElementById('perio-enabled-chk');
  // The click on the label toggles the checkbox state after this runs, so read !current
  setTimeout(()=>{ _renderPerioModalUI(); }, 0);
}

function _renderPerioModalUI(){
  const enabled = document.getElementById('perio-enabled-chk').checked;
  document.getElementById('perio-anchor-wrap').style.display = enabled ? '' : 'none';
  document.getElementById('perio-editor-wrap').style.display = enabled ? '' : 'none';
  document.getElementById('perio-disable-btn').style.display = S.periodization.enabled ? '' : 'none';
  _updatePerioAnchorHint();
  if(enabled) { switchPerioTab(_perioCurTab); }
}

function setPerioAnchor(val){
  _updatePerioAnchorHint();
}

function _updatePerioAnchorHint(){
  const anchorVal = document.getElementById('perio-anchor-date').value;
  const hintEl = document.getElementById('perio-anchor-hint');
  if(!anchorVal){ hintEl.textContent = ''; return; }
  const d = new Date(anchorVal+'T12:00:00');
  const mon = getMondayOf(d);
  // compute label for today based on this anchor
  const anchor = getMondayOf(d);
  const todayMon = getMondayOf(new Date());
  const diff = Math.round((todayMon - anchor) / (7*86400000));
  const idx = ((diff%3)+3)%3;
  const curLbl = ['A','B','C'][idx];
  hintEl.textContent = `→ Cette semaine serait la semaine ${curLbl}`;
}

function switchPerioTab(label){
  _perioCurTab = label;
  ['A','B','C'].forEach(l=>{
    const b = document.getElementById('ptab-'+l);
    if(b){ b.className = 'perio-modal-tab'+(l===label?' on-'+l:''); }
  });
  _renderPerioTabBody(label);
}

function _renderPerioTabBody(label){
  const el = document.getElementById('perio-tab-body');
  const weekData = _perioEditing[label];
  const colorClass = {A:'perio-badge-A',B:'perio-badge-B',C:'perio-badge-C'}[label];
  const isEmpty = !weekData || !weekData.some(d=>d.name&&d.name.trim());

  if(isEmpty){
    el.innerHTML = `<div style="padding:28px;text-align:center;border:1px dashed var(--b2);border-radius:8px;background:var(--s2)">
      <div style="font-size:22px;margin-bottom:8px;opacity:.4">📋</div>
      <div style="font-size:12px;font-weight:500;color:var(--t2);margin-bottom:6px">Semaine ${label} vide</div>
      <div style="font-size:11px;color:var(--t3);margin-bottom:14px">Utilise le bouton ci-dessous pour copier le programme de la semaine active.</div>
    </div>`;
  } else {
    const rows = DAYS.map((d,i)=>{
      const s = weekData[i]||{name:'',type:'rest',exercises:[]};
      const tc = {push:'var(--push)',pull:'var(--pull)',legs:'var(--legs)',full:'var(--blue)',cardio:'var(--green)',rest:'var(--t4)',custom:'var(--t3)'}[s.type]||'var(--t3)';
      return `<div class="perio-day-row">
        <div class="perio-day-lbl">${d.slice(0,3)}</div>
        ${s.name?`<div class="perio-day-name">${s.name}</div><div class="perio-day-type" style="color:${tc}">${s.type}</div><div style="font-family:var(--mono);font-size:8px;color:var(--t3)">${s.exercises?s.exercises.length:0} exo</div>`
          :`<div class="perio-day-name" style="color:var(--t4)">Repos / vide</div>`}
      </div>`;
    }).join('');
    el.innerHTML = `<div class="perio-week-preview">${rows}</div>`;
  }
}

function perioCopyCurrentWeek(){
  // Copy S.week (the REAL stored one from the original state, not the preview)
  const p = S.periodization;
  // Get original week (if perio is active, S.week is already the A/B/C week; use it anyway — user knows what they're doing)
  _perioEditing[_perioCurTab] = DAYS.map((d,i)=>({
    day:d, 
    name:(S.week[i]||{}).name||'', 
    type:(S.week[i]||{}).type||'rest', 
    exercises:((S.week[i]||{}).exercises||[]).map(e=>({...e,media:[]}))
  }));
  _renderPerioTabBody(_perioCurTab);
  showToast(`Semaine ${_perioCurTab} : programme actif copié ✓`);
}

function perioClearWeek(){
  if(!confirm(`Vider la semaine ${_perioCurTab} ?`)) return;
  _perioEditing[_perioCurTab] = DAYS.map((d,i)=>({day:d,name:'',type:'rest',exercises:[]}));
  _renderPerioTabBody(_perioCurTab);
}

function savePerioModal(){
  const enabled = document.getElementById('perio-enabled-chk').checked;
  const anchorVal = document.getElementById('perio-anchor-date').value;

  if(!S.periodization) S.periodization = {enabled:false,anchor:null,weeks:{A:null,B:null,C:null}};
  S.periodization.enabled = enabled;
  S.periodization.anchor = anchorVal || weekStorageKey(getMondayOf(new Date()));
  S.periodization.weeks = {
    A: _perioEditing.A || DAYS.map((d,i)=>({day:d,name:'',type:'rest',exercises:[]})),
    B: _perioEditing.B || DAYS.map((d,i)=>({day:d,name:'',type:'rest',exercises:[]})),
    C: _perioEditing.C || DAYS.map((d,i)=>({day:d,name:'',type:'rest',exercises:[]})),
  };

  // Apply the current week
  applyPeriodizationWeek();
  saveState();
  closePerioModal();
  _perioPrevievedLabel = null;
  renderProg();
  renderPerioBar('perio-prog-bar');
  renderPerioBar('perio-dash-bar');
  renderStrip();
  renderSession();
  showToast(enabled ? '🔄 Périodisation activée ✓' : 'Périodisation désactivée ✓');
}

function disablePeriodization(){
  if(!confirm('Désactiver la périodisation et revenir au mode standard ?')) return;
  S.periodization.enabled = false;
  saveState();
  closePerioModal();
  renderProg();
  renderPerioBar('perio-prog-bar');
  renderPerioBar('perio-dash-bar');
  renderStrip();
  renderSession();
  showToast('Périodisation désactivée');
}

/* ═══ NAV ═══ */
function go(id,btn){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('on'));
  document.getElementById('page-'+id).classList.add('on');
  if(btn) btn.classList.add('on');
  if(id==='dash'){renderStats();renderStrip();renderSession();renderPerioBar('perio-dash-bar');renderDashHero();
    // Dashboard épuré : on vide les sections retirées (score semaine, graphique volume, comparatif semaines)
    ['dash-week-score','week-cmp'].forEach(cid=>{const c=document.getElementById(cid);if(c)c.innerHTML='';});
    const vdc=document.getElementById('vol-day-chart-wrap'); if(vdc) vdc.style.display='none';
  }
  if(id==='prog') {renderProg();renderPerioBar('perio-prog-bar');}
  if(id==='graphs') renderGraphs();
  if(id==='journal') renderJournal();
  if(id==='prs') renderPRs();
  if(id==='exos') renderExos();
  if(id==='materiel') renderMateriel();
  if(id==='nutrition') renderNutrition();
  if(id!=='graphs'&&_chartInstance){_chartInstance.destroy();_chartInstance=null;}
  if(id!=='graphs'&&_muscleChartInst){_muscleChartInst.destroy();_muscleChartInst=null;}
}

