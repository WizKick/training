/* ============================================================
   BULK PLAN MODULE — dynamique
   Recalcule macros + quantités selon poids, objectif, surplus
   Sans laitiers animaux · Sans miel
   ============================================================ */
(function(){
  'use strict';

  // ── Lire les paramètres utilisateur ──────────────────────
  function getPoids(){  return parseFloat(document.getElementById('sc-poids')?.value) || parseFloat(localStorage.getItem('scPoids')) || 75; }
  function getGoalKg(){ return parseFloat(localStorage.getItem('wtGoal')) || 83; }
  function getSurplus(){ return parseInt(document.getElementById('sc-kcal')?.value) || 0; }
  // Taille (cm) & âge — paramétrables, persistés. Défaut : 183cm / 22 ans (profil Wayne).
  function getTaille(){ return parseFloat(document.getElementById('sc-taille')?.value) || parseFloat(localStorage.getItem('scTaille')) || 183; }
  function getAge(){    return parseInt(document.getElementById('sc-age')?.value)     || parseInt(localStorage.getItem('scAge'))      || 22; }
  // IMC = poids / taille²(m)
  function calcIMC(kg, cm){ const m = cm/100; return m>0 ? (kg/(m*m)) : 0; }
  function imcCat(imc){
    if(imc < 18.5) return {lbl:'Maigreur', col:'var(--blue)'};
    if(imc < 25)   return {lbl:'Normal',   col:'var(--green)'};
    if(imc < 30)   return {lbl:'Surpoids', col:'var(--yellow)'};
    return {lbl:'Obésité', col:'var(--red)'};
  }

  // ── Calcul TDEE + macros ──────────────────────────────────
  function calcMacros(){
    const poids   = getPoids();
    const taille  = getTaille();
    const age     = getAge();
    const surplus = getSurplus();

    // BMR Mifflin-St Jeor (homme) — utilise taille & âge réels
    const bmr  = 10 * poids + 6.25 * taille - 5 * age + 5;
    const tdee = Math.round(bmr * 1.55); // activité modérée (6j PPL)
    const kcal = tdee + surplus;

    // Macros : 2g prot/kg, lipides 25%, reste glucides
    const prot = Math.round(poids * 2);
    const lip  = Math.round(kcal * 0.25 / 9);
    const gluc = Math.round((kcal - prot * 4 - lip * 9) / 4);

    return { kcal, prot, gluc, lip, tdee };
  }

  // Nombre de repas par jour — choix utilisateur, persisté (défaut 4)
  function getMealCount(){
    const v = parseInt(localStorage.getItem('bulkMealCount'));
    return (v===3||v===4||v===5||v===6) ? v : 4;
  }

  // ── DIÈTES INTERCHANGEABLES ───────────────────────────────
  // Contraintes : AUCUN poisson, AUCUN produit laitier animal, AUCUN chocolat.
  // Chaque diète définit ses sources. coef = grammes de macro par gramme d'aliment.
  //  - prot[].coef = g protéines / g aliment (cru)
  //  - carb[].kpg  = kcal / g  (pour doser les glucides)
  //  - fat         = ligne lipides ajoutée aux repas "meal"
  // whey = protéine en poudre (végétale ou whey isolat — au choix de l'user, non laitier requis → on note "whey/protéine végétale")
  const DIETS = {
    classique: {
      label: 'Classique', emoji:'🍗',
      desc: 'Poulet · bœuf · riz · avoine · pain',
      protMeal: [ {n:'poulet', lbl:'poulet', coef:0.22}, {n:'boeuf', lbl:'bœuf haché 15%', coef:0.17} ],
      carbMeal: {n:'riz', lbl:'riz basmati CRU', gPerG:0.78},
      fatMeal:  '1 c.s. huile d\'olive',
      veg:      '200g légumes surgelés',
      oats:     {grain:'flocons avoine CRU', milk:'300ml lait d\'avoine', spread:'25g beurre de cacahuète'},
      shake:    {carb:'pain complet', kpg:2.5},
      snack:    ['1 banane', 'amandes'],
      milk:     '250ml lait d\'avoine',
    },
    mediterraneenne: {
      label: 'Méditerranéenne', emoji:'🫒',
      desc: 'Dinde · pois chiches · patate douce · semoule · olives',
      protMeal: [ {n:'dinde', lbl:'escalope de dinde', coef:0.23}, {n:'poischiche', lbl:'pois chiches (poids cru)', coef:0.19} ],
      carbMeal: {n:'semoule', lbl:'semoule complète CRUE', gPerG:0.72},
      fatMeal:  '1,5 c.s. huile d\'olive + 5 olives',
      veg:      '200g ratatouille / légumes méditerranéens',
      oats:     {grain:'flocons avoine CRU', milk:'300ml lait d\'amande', spread:'25g purée d\'amande'},
      shake:    {carb:'pain pita complet', kpg:2.6},
      snack:    ['1 orange', 'noix'],
      milk:     '250ml lait d\'amande',
    },
    asiatique: {
      label: 'Asiatique', emoji:'🍜',
      desc: 'Bœuf · poulet · riz · nouilles · edamame · sésame',
      protMeal: [ {n:'boeuf', lbl:'bœuf maigre émincé', coef:0.20}, {n:'poulet', lbl:'poulet émincé', coef:0.22} ],
      carbMeal: {n:'riz', lbl:'riz jasmin CRU', gPerG:0.78},
      fatMeal:  '1 c.s. huile de sésame + edamame',
      veg:      '200g wok de légumes (chou, carotte, poivron)',
      oats:     {grain:'flocons avoine CRU', milk:'300ml lait de soja', spread:'25g beurre de cacahuète'},
      shake:    {carb:'galettes de riz', kpg:3.8},
      snack:    ['1 banane', 'cacahuètes grillées'],
      milk:     '250ml lait de soja',
    },
    texane: {
      label: 'Texane / Grill', emoji:'🥩',
      desc: 'Steak · dinde · patate douce · maïs',
      protMeal: [ {n:'steak', lbl:'steak de bœuf maigre', coef:0.21}, {n:'dinde', lbl:'cuisse de dinde', coef:0.20} ],
      carbMeal: {n:'patate', lbl:'patate douce CRUE', gPerG:0.20},
      fatMeal:  '1 c.s. huile d\'olive + 1/2 avocat',
      veg:      '200g brocoli + maïs grillé',
      oats:     {grain:'flocons avoine CRU', milk:'300ml lait d\'amande', spread:'25g beurre de cacahuète'},
      shake:    {carb:'pain complet', kpg:2.5},
      snack:    ['1 banane', 'noix de cajou'],
      milk:     '250ml lait d\'amande',
    },
    mexicaine: {
      label: 'Mexicaine', emoji:'🌮',
      desc: 'Bœuf · haricots rouges · riz · maïs · avocat',
      protMeal: [ {n:'boeuf', lbl:'bœuf haché 15%', coef:0.17}, {n:'haricots', lbl:'haricots rouges (poids cru)', coef:0.21} ],
      carbMeal: {n:'riz', lbl:'riz long CRU', gPerG:0.78},
      fatMeal:  '1/2 avocat + 1 c.s. huile d\'olive',
      veg:      '200g poivrons + maïs + oignons',
      oats:     {grain:'flocons avoine CRU', milk:'300ml lait de soja', spread:'25g purée de cacahuète'},
      shake:    {carb:'tortillas de maïs', kpg:3.6},
      snack:    ['1 banane', 'cacahuètes'],
      milk:     '250ml lait de soja',
    },
    budget: {
      label: 'Petit budget', emoji:'💰',
      desc: 'Œufs · poulet · lentilles · pâtes · riz',
      protMeal: [ {n:'oeufs', lbl:'œufs entiers (≈6 œufs)', coef:0.13}, {n:'poulet', lbl:'pilon de poulet', coef:0.19} ],
      carbMeal: {n:'pates', lbl:'pâtes complètes CRUES', gPerG:0.74},
      fatMeal:  '1 c.s. huile de colza',
      veg:      '200g légumes surgelés (mélange)',
      oats:     {grain:'flocons avoine CRU', milk:'300ml lait de soja', spread:'25g purée de cacahuète'},
      shake:    {carb:'pain de mie complet', kpg:2.6},
      snack:    ['1 banane', 'lentilles / pois chiches'],
      milk:     '250ml lait de soja',
    },
  };
  const DIET_ORDER = ['classique','mediterraneenne','asiatique','texane','mexicaine','budget'];
  function getDiet(){
    const k = localStorage.getItem('bulkDiet');
    return DIETS[k] ? k : 'classique';
  }
  // Exposé global pour que la liste de courses (autre bloc) reflète la diète choisie
  window.DIETS = DIETS;
  window.getActiveDiet = getDiet;
  window.calcBulkMacros = calcMacros;
  window.getMealCount = getMealCount;

  // ── Calcul des quantités des aliments selon les macros ────
  function buildDayMeals(macros, dayType, mealCount, dietKey){
    const { kcal, prot, gluc, lip } = macros;
    const isTraining = dayType !== 'rest';
    const N = mealCount || getMealCount();
    const D = DIETS[dietKey || getDiet()] || DIETS.classique;

    // Répartition des macros (% du total) selon le nombre de repas.
    let plan;
    if(N === 3){
      plan = [
        { name:'Petit-déj costaud', t:'oats', p:.30 },
        { name:'Déjeuner',          t:'meal', p:.38 },
        { name:'Dîner',             t:'meal', p:.32 },
      ];
    } else if(N === 4){
      plan = [
        { name:'Réveil',                              t:'oats',  p:.23 },
        { name:'Déjeuner',                            t:'meal',  p:.32 },
        { name:(isTraining?'Pré-training':'Snack'),   t:'shake', p:.13 },
        { name:'Dîner',                               t:'meal',  p:.32 },
      ];
    } else if(N === 5){
      plan = [
        { name:'Réveil',                              t:'oats',  p:.20 },
        { name:'Déjeuner',                            t:'meal',  p:.28 },
        { name:(isTraining?'Pré-training':'Collation'),t:'shake', p:.12 },
        { name:'Dîner',                               t:'meal',  p:.28 },
        { name:'Avant coucher',                       t:'snack', p:.12 },
      ];
    } else { // 6
      plan = [
        { name:'Réveil',                              t:'oats',  p:.18 },
        { name:'Collation matin',                     t:'snack', p:.10 },
        { name:'Déjeuner',                            t:'meal',  p:.26 },
        { name:(isTraining?'Pré-training':'Collation'),t:'shake', p:.12 },
        { name:'Dîner',                               t:'meal',  p:.24 },
        { name:'Avant coucher',                       t:'snack', p:.10 },
      ];
    }

    let mealIdx = 0; // alterne les sources protéines des repas "meal"

    function buildMeal(type, mp, mprot){
      if(type === 'oats'){
        const whey = Math.max(20, Math.round(mprot * 0.5 / 0.83));
        const avoine = Math.max(60, Math.round(mp * 0.45 / 3.8));
        return [
          `${avoine}g ${D.oats.grain} + ${D.oats.milk}`,
          `${whey}g whey / protéine végétale dans le bol`,
          D.oats.spread
        ];
      }
      if(type === 'shake'){
        const whey = Math.max(25, Math.round(mprot * 0.6 / 0.83));
        const carb = Math.max(50, Math.round((mp - whey*3.8) / D.shake.kpg));
        return [
          `${carb}g ${D.shake.carb}`,
          `${whey}g whey / protéine végétale + ${D.milk}`
        ];
      }
      if(type === 'snack'){
        const whey = Math.max(20, Math.round(mprot / 0.83));
        const oleag = Math.max(15, Math.round(mp * 0.25 / 6));
        return [
          `${whey}g whey / protéine végétale + ${D.milk}`,
          D.snack[0],
          `${oleag}g ${D.snack[1]}`
        ];
      }
      // type 'meal'
      const src = D.protMeal[mealIdx++ % D.protMeal.length];
      const qProt = Math.max(120, Math.round(mprot / src.coef));
      const glucMeal = Math.round((mp * 0.42) / 4);
      const carbQ = Math.max(80, Math.round(glucMeal / D.carbMeal.gPerG));
      return [
        `${qProt}g ${src.lbl} CRU`,
        `${carbQ}g ${D.carbMeal.lbl}`,
        D.veg,
        D.fatMeal
      ];
    }

    const totalP = plan.reduce((a,m)=>a+m.p, 0);
    let usedKcal = 0, usedProt = 0;
    const meals = plan.map((m, i) => {
      const last = i === plan.length - 1;
      const mp    = last ? (kcal - usedKcal) : Math.round(kcal * m.p / totalP);
      const mprot = last ? (prot - usedProt) : Math.round(prot * m.p / totalP);
      usedKcal += mp; usedProt += mprot;
      return { name:m.name, kcal:mp, prot:mprot, items: buildMeal(m.t, mp, mprot) };
    });
    return meals;
  }

  // ── CSS ───────────────────────────────────────────────────
  const css = `
    .bulk-plan-wrap{ margin-top:24px;border-top:1px solid var(--b1);padding-top:24px; }
    .bulk-plan-head{ display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;flex-wrap:wrap;gap:10px; }
    .bulk-plan-title{ font-family:var(--font);font-size:13px;font-weight:600;color:var(--t1);letter-spacing:-.01em;display:flex;align-items:center;gap:8px; }
    .bulk-plan-title::before{ content:'';width:3px;height:14px;background:var(--t1);border-radius:2px; }
    .bulk-plan-sub{ font-family:var(--mono);font-size:9px;color:var(--t3);margin-top:3px; }
    .bulk-targets-row{ display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px; }
    .bulk-target{ background:var(--s2);border:1px solid var(--b1);border-radius:var(--r2);padding:10px 12px;text-align:center; }
    .bulk-target-lbl{ display:block;font-family:var(--mono);font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px; }
    .bulk-target-val{ font-family:var(--mono);font-size:14px;font-weight:700;color:var(--t1); }
    .bulk-day-tabs{ display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px; }
    .bulk-day-tab{ font-family:var(--mono);font-size:10px;color:var(--t2);background:var(--s2);border:1px solid var(--b1);border-radius:var(--r);padding:5px 10px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:2px; }
    .bulk-day-tab.on{ background:var(--t1);color:var(--bg);border-color:var(--t1); }
    .bulk-day-tab .tag{ font-size:8px;opacity:.7;text-transform:uppercase; }
    .bulk-meals{ display:flex;flex-direction:column;gap:8px;margin-bottom:12px; }
    .bulk-meal{ background:var(--s2);border:1px solid var(--b1);border-radius:var(--r2);padding:12px; }
    .bulk-meal-hd{ display:flex;align-items:center;justify-content:space-between;margin-bottom:8px; }
    .bulk-meal-name{ font-family:var(--font);font-size:12px;font-weight:600;color:var(--t1); }
    .bulk-meal-macros{ display:flex;gap:8px; }
    .bulk-meal-kcal{ font-family:var(--mono);font-size:10px;color:var(--yellow); }
    .bulk-meal-prot{ font-family:var(--mono);font-size:10px;color:var(--green); }
    .bulk-meal-items{ margin:0;padding:0 0 0 16px;list-style:disc; }
    .bulk-meal-items li{ font-family:var(--mono);font-size:11px;color:var(--t2);line-height:1.7; }
    .bulk-total-bar{ display:flex;align-items:center;justify-content:space-between;background:var(--s3);border:1px solid var(--b2);border-radius:var(--r);padding:10px 14px;margin-bottom:10px; }
    .bulk-total-lbl{ font-family:var(--mono);font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em; }
    .bulk-total-vals{ display:flex;gap:12px; }
    .bulk-apply-btn{ width:100%;padding:10px;font-family:var(--mono);font-size:11px;font-weight:600;background:var(--s2);color:var(--t1);border:1px solid var(--b2);border-radius:var(--r);cursor:pointer;letter-spacing:.05em; }
    .bulk-apply-btn.applied{ background:var(--green);color:#000; }
    .bulk-info-bar{ font-family:var(--mono);font-size:9px;color:var(--t3);margin-bottom:10px;padding:6px 10px;background:var(--s2);border:1px solid var(--b1);border-radius:var(--r); }
    @media(max-width:480px){ .bulk-targets-row{grid-template-columns:repeat(2,1fr)} }
  `;
  const style = document.createElement('style');
  style.id = 'bulk-plan-styles';
  style.textContent = css;
  document.head.appendChild(style);

  // ── Rendu ─────────────────────────────────────────────────
  const DAYS = [
    {day:'Lundi',   type:'push'},
    {day:'Mardi',   type:'pull'},
    {day:'Mercredi',type:'legs'},
    {day:'Jeudi',   type:'rest'},
    {day:'Vendredi',type:'push'},
    {day:'Samedi',  type:'pull'},
    {day:'Dimanche',type:'legs'}
  ];

  function render(){
    const macros     = calcMacros();
    const goalKg     = getGoalKg();
    const poids      = getPoids();
    const todayIdx   = (new Date().getDay() + 6) % 7;
    const stored     = parseInt(localStorage.getItem('bulkPlanDay') ?? todayIdx);
    const currentDay = isNaN(stored) ? todayIdx : Math.max(0, Math.min(6, stored));

    const html = `
      <div class="bulk-plan-wrap" id="bulk-plan-mod">
        <div class="bulk-plan-head">
          <div>
            <div class="bulk-plan-title">Plan Bulk</div>
            <div class="bulk-plan-sub" id="bulk-sub">${macros.kcal} kcal · cible ${goalKg} kg · sans laitiers animaux</div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <div style="display:flex;align-items:center;gap:7px">
              <label style="font-family:var(--mono);font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Diète</label>
              <select id="bulk-diet" class="inp-sm" style="font-family:var(--font)">
                ${DIET_ORDER.map(k=>`<option value="${k}">${DIETS[k].emoji} ${DIETS[k].label}</option>`).join('')}
              </select>
            </div>
            <div style="display:flex;align-items:center;gap:7px">
              <label style="font-family:var(--mono);font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Repas/jour</label>
              <select id="bulk-meal-count" class="inp-sm" style="font-family:var(--font)">
                <option value="3">3 repas</option>
                <option value="4">4 repas</option>
                <option value="5">5 repas</option>
                <option value="6">6 repas</option>
              </select>
            </div>
          </div>
        </div>
        <div class="bulk-info-bar" id="bulk-info-bar">
          📊 Calculé pour ${poids} kg → ${goalKg} kg · TDEE estimé ${macros.tdee} kcal · surplus ${getSurplus()} kcal
        </div>
        <div class="bulk-targets-row" id="bulk-targets-row">
          <div class="bulk-target"><span class="bulk-target-lbl">Calories</span><span class="bulk-target-val" id="bt-kcal">${macros.kcal}</span></div>
          <div class="bulk-target"><span class="bulk-target-lbl">Protéines</span><span class="bulk-target-val" id="bt-prot">${macros.prot}g</span></div>
          <div class="bulk-target"><span class="bulk-target-lbl">Glucides</span><span class="bulk-target-val" id="bt-gluc">${macros.gluc}g</span></div>
          <div class="bulk-target"><span class="bulk-target-lbl">Lipides</span><span class="bulk-target-val" id="bt-lip">${macros.lip}g</span></div>
        </div>
        <div class="bulk-day-tabs" id="bulk-day-tabs">
          ${DAYS.map((d,i)=>`
            <button class="bulk-day-tab ${d.type} ${i===currentDay?'on':''}" data-idx="${i}">
              <span>${d.day}</span><span class="tag">${d.type}</span>
            </button>
          `).join('')}
        </div>
        <div id="bulk-meals-container"></div>
        <button class="bulk-apply-btn" id="bulk-apply">⚡ Appliquer ces objectifs à mon tracker nutrition</button>
      </div>
    `;

    const nutritionPage = document.getElementById('page-nutrition');
    if(!nutritionPage) return;
    if(document.getElementById('bulk-plan-mod')) document.getElementById('bulk-plan-mod').remove();
    const wrap = nutritionPage.querySelector('.wrap');
    // On insère le Plan Bulk JUSTE AVANT la liste de courses, pour que les deux
    // blocs (repas optimisés + courses correspondantes) soient côte à côte.
    const shopMod = document.getElementById('shop-calc-mod');
    if(shopMod){
      shopMod.insertAdjacentHTML('beforebegin', html);
    } else {
      (wrap || nutritionPage).insertAdjacentHTML('beforeend', html);
    }

    const mcSel = document.getElementById('bulk-meal-count');
    if(mcSel) mcSel.value = String(getMealCount());
    const dSel = document.getElementById('bulk-diet');
    if(dSel) dSel.value = getDiet();

    renderMeals(currentDay);
    bindEvents();
  }

  function renderMeals(idx){
    const macros = calcMacros();
    const dayType = DAYS[idx].type;
    const meals = buildDayMeals(macros, dayType);
    const c = document.getElementById('bulk-meals-container');
    if(!c) return;

    let totalKcal = 0, totalProt = 0;
    const mealsHtml = meals.map(m=>{
      totalKcal += m.kcal;
      totalProt += m.prot;
      return `
        <div class="bulk-meal">
          <div class="bulk-meal-hd">
            <span class="bulk-meal-name">${m.name}</span>
            <div class="bulk-meal-macros">
              <span class="bulk-meal-kcal">${m.kcal} kcal</span>
              <span class="bulk-meal-prot">${m.prot}g prot</span>
            </div>
          </div>
          <ul class="bulk-meal-items">${m.items.map(it=>`<li>${it}</li>`).join('')}</ul>
        </div>
      `;
    }).join('');

    c.innerHTML = `
      <div class="bulk-meals">${mealsHtml}</div>
      <div class="bulk-total-bar">
        <span class="bulk-total-lbl">Total journée</span>
        <div class="bulk-total-vals">
          <span style="color:var(--yellow)">${totalKcal} kcal</span>
          <span style="color:var(--green)">${totalProt}g prot</span>
        </div>
      </div>
    `;
  }

  // Met à jour les targets affichés sans re-rendre tout
  function refreshTargets(){
    const m = calcMacros();
    const goalKg = getGoalKg();
    const poids  = getPoids();
    const sub  = document.getElementById('bulk-sub');
    const info = document.getElementById('bulk-info-bar');
    const bk   = document.getElementById('bt-kcal');
    const bp   = document.getElementById('bt-prot');
    const bg   = document.getElementById('bt-gluc');
    const bl   = document.getElementById('bt-lip');
    if(sub)  sub.textContent  = `${m.kcal} kcal · cible ${goalKg} kg · sans laitiers animaux`;
    if(info) info.textContent = `📊 Calculé pour ${poids} kg → ${goalKg} kg · TDEE estimé ${m.tdee} kcal · surplus ${getSurplus()} kcal`;
    if(bk) bk.textContent = m.kcal;
    if(bp) bp.textContent = m.prot+'g';
    if(bg) bg.textContent = m.gluc+'g';
    if(bl) bl.textContent = m.lip+'g';
    // Re-render meals for current day
    const active = document.querySelector('#bulk-day-tabs .bulk-day-tab.on');
    if(active) renderMeals(parseInt(active.dataset.idx));
  }

  function bindEvents(){
    document.querySelectorAll('#bulk-day-tabs .bulk-day-tab').forEach(btn=>{
      btn.addEventListener('click',()=>{
        const idx = parseInt(btn.dataset.idx);
        document.querySelectorAll('#bulk-day-tabs .bulk-day-tab').forEach(b=>b.classList.remove('on'));
        btn.classList.add('on');
        localStorage.setItem('bulkPlanDay', idx);
        renderMeals(idx);
      });
    });

    // Nombre de repas par jour
    const mcSel = document.getElementById('bulk-meal-count');
    if(mcSel){
      mcSel.addEventListener('change', function(){
        localStorage.setItem('bulkMealCount', this.value);
        const active = document.querySelector('#bulk-day-tabs .bulk-day-tab.on');
        renderMeals(active ? parseInt(active.dataset.idx) : 0);
      });
    }

    // Choix de la diète
    const dSel = document.getElementById('bulk-diet');
    if(dSel){
      dSel.addEventListener('change', function(){
        localStorage.setItem('bulkDiet', this.value);
        const sub = document.getElementById('bulk-sub');
        if(sub){ const m=calcMacros(); sub.textContent = `${m.kcal} kcal · ${DIETS[this.value].desc}`; }
        const active = document.querySelector('#bulk-day-tabs .bulk-day-tab.on');
        renderMeals(active ? parseInt(active.dataset.idx) : 0);
        // Rafraîchit aussi la liste de courses
        if(typeof window.scRefreshShopping === 'function') window.scRefreshShopping();
        if(typeof showToast==='function') showToast('Diète : '+DIETS[this.value].label+' ✓');
      });
    }

    // Re-calcule quand poids, taille, âge ou surplus changent
    ['sc-poids','sc-kcal','sc-poids-cible','sc-taille','sc-age'].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.addEventListener('change', refreshTargets);
    });

    const applyBtn = document.getElementById('bulk-apply');
    if(applyBtn){
      applyBtn.addEventListener('click',()=>{
        const m = calcMacros();
        const kcalInp = document.getElementById('nutr-goal-kcal');
        const protInp = document.getElementById('nutr-goal-prot');
        if(kcalInp){ kcalInp.value = m.kcal; kcalInp.dispatchEvent(new Event('input',{bubbles:true})); }
        if(protInp){ protInp.value = m.prot; protInp.dispatchEvent(new Event('input',{bubbles:true})); }
        if(typeof window.nutrSaveGoals==='function'){ try{ window.nutrSaveGoals(); }catch(e){} }
        applyBtn.textContent = '✓ Objectifs appliqués';
        applyBtn.classList.add('applied');
        setTimeout(()=>{ applyBtn.textContent = '⚡ Appliquer ces objectifs à mon tracker nutrition'; applyBtn.classList.remove('applied'); }, 2200);
      });
    }
  }

  function boot(){
    if(document.getElementById('page-nutrition')){
      render();
      // Maintenant que window.DIETS / getActiveDiet existent, on rafraîchit la liste de courses
      if(typeof window.scRefreshShopping === 'function') window.scRefreshShopping();
    }
    else { setTimeout(boot, 200); }
  }

  if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', boot); }
  else { boot(); }
})();
