/* ============================================================
   BULK PLAN MODULE — 3000 kcal / 145g protéines
   Version SIMPLE : mêmes bases toute la semaine, 0 prise de tête
   Sans laitiers animaux · Sans miel
   ============================================================ */
(function(){
  'use strict';

  // ───────────────────────────────────────────────────────────
  // LOGIQUE : 4 repas fixes. On tourne sur 3 sources de protéines.
  // Tout se pèse CRU sauf indication contraire.
  // ───────────────────────────────────────────────────────────
  const BULK_PLAN = {
    targets: { kcal: 3000, prot: 145, gluc: 400, lip: 95 },
    days: [
      {
        day: 'Lundi',
        type: 'push',
        meals: [
          { name: 'Réveil', kcal: 700, prot: 35, items: [
            '100g flocons avoine CRU + 350ml lait d\'avoine',
            '30g whey dans le bol',
            '30g beurre de cacahuète'
          ]},
          { name: 'Déjeuner', kcal: 950, prot: 50, items: [
            '200g poulet CRU',
            '130g riz basmati CRU',
            '200g légumes surgelés'
          ]},
          { name: 'Pré-training', kcal: 400, prot: 15, items: [
            '100g pain complet',
            '30g whey + 250ml lait d\'avoine'
          ]},
          { name: 'Dîner', kcal: 950, prot: 45, items: [
            '200g bœuf haché 15% CRU',
            '130g riz basmati CRU',
            '2 c.s. huile d\'olive',
            '200g légumes surgelés'
          ]}
        ]
      },
      {
        day: 'Mardi',
        type: 'pull',
        meals: [
          { name: 'Réveil', kcal: 700, prot: 35, items: [
            '100g flocons avoine CRU + 350ml lait d\'avoine',
            '30g whey dans le bol',
            '30g beurre de cacahuète'
          ]},
          { name: 'Déjeuner', kcal: 950, prot: 50, items: [
            '200g bœuf haché 15% CRU',
            '130g riz basmati CRU',
            '200g légumes surgelés',
            '1 c.s. huile d\'olive'
          ]},
          { name: 'Pré-training', kcal: 400, prot: 15, items: [
            '100g pain complet',
            '30g whey + 250ml lait d\'avoine'
          ]},
          { name: 'Dîner', kcal: 950, prot: 45, items: [
            '200g poulet CRU',
            '130g riz basmati CRU',
            '2 c.s. huile d\'olive',
            '200g légumes surgelés'
          ]}
        ]
      },
      {
        day: 'Mercredi',
        type: 'legs',
        meals: [
          { name: 'Réveil', kcal: 700, prot: 35, items: [
            '100g flocons avoine CRU + 350ml lait d\'avoine',
            '30g whey dans le bol',
            '30g beurre de cacahuète'
          ]},
          { name: 'Déjeuner', kcal: 950, prot: 50, items: [
            '200g bœuf haché 15% CRU',
            '130g riz basmati CRU',
            '200g légumes surgelés'
          ]},
          { name: 'Pré-training', kcal: 400, prot: 15, items: [
            '100g pain complet',
            '30g whey + 250ml lait d\'avoine'
          ]},
          { name: 'Dîner', kcal: 950, prot: 45, items: [
            '200g bœuf haché 15% CRU',
            '130g riz basmati CRU',
            '2 c.s. huile d\'olive',
            '200g légumes surgelés'
          ]}
        ]
      },
      {
        day: 'Jeudi',
        type: 'rest',
        meals: [
          { name: 'Réveil', kcal: 700, prot: 35, items: [
            '100g flocons avoine CRU + 350ml lait d\'avoine',
            '30g whey dans le bol',
            '30g beurre de cacahuète'
          ]},
          { name: 'Déjeuner', kcal: 950, prot: 50, items: [
            '200g poulet CRU',
            '130g riz basmati CRU',
            '200g légumes surgelés',
            '1 c.s. huile d\'olive'
          ]},
          { name: 'Snack', kcal: 400, prot: 15, items: [
            '100g pain complet',
            '30g whey + 250ml lait d\'avoine'
          ]},
          { name: 'Dîner', kcal: 950, prot: 45, items: [
            '4 œufs entiers + 100g lardons',
            '130g riz basmati CRU',
            '2 c.s. huile d\'olive',
            '200g légumes surgelés'
          ]}
        ]
      },
      {
        day: 'Vendredi',
        type: 'push',
        meals: [
          { name: 'Réveil', kcal: 700, prot: 35, items: [
            '100g flocons avoine CRU + 350ml lait d\'avoine',
            '30g whey dans le bol',
            '30g beurre de cacahuète'
          ]},
          { name: 'Déjeuner', kcal: 950, prot: 50, items: [
            '200g bœuf haché 15% CRU',
            '130g riz basmati CRU',
            '200g légumes surgelés'
          ]},
          { name: 'Pré-training', kcal: 400, prot: 15, items: [
            '100g pain complet',
            '30g whey + 250ml lait d\'avoine'
          ]},
          { name: 'Dîner', kcal: 950, prot: 45, items: [
            '200g poulet CRU',
            '130g riz basmati CRU',
            '2 c.s. huile d\'olive',
            '200g légumes surgelés'
          ]}
        ]
      },
      {
        day: 'Samedi',
        type: 'pull',
        meals: [
          { name: 'Réveil', kcal: 700, prot: 35, items: [
            '100g flocons avoine CRU + 350ml lait d\'avoine',
            '30g whey dans le bol',
            '30g beurre de cacahuète'
          ]},
          { name: 'Déjeuner', kcal: 950, prot: 50, items: [
            '200g bœuf haché 15% CRU',
            '130g riz basmati CRU',
            '200g légumes surgelés',
            '1 c.s. huile d\'olive'
          ]},
          { name: 'Pré-training', kcal: 400, prot: 15, items: [
            '100g pain complet',
            '30g whey + 250ml lait d\'avoine'
          ]},
          { name: 'Dîner', kcal: 950, prot: 45, items: [
            '200g bœuf haché 15% CRU',
            '130g riz basmati CRU',
            '2 c.s. huile d\'olive',
            '200g légumes surgelés'
          ]}
        ]
      },
      {
        day: 'Dimanche',
        type: 'legs',
        meals: [
          { name: 'Réveil', kcal: 700, prot: 35, items: [
            '100g flocons avoine CRU + 350ml lait d\'avoine',
            '30g whey dans le bol',
            '30g beurre de cacahuète'
          ]},
          { name: 'Déjeuner', kcal: 950, prot: 50, items: [
            '200g poulet CRU',
            '130g riz basmati CRU',
            '200g légumes surgelés',
            '1 c.s. huile d\'olive'
          ]},
          { name: 'Pré-training', kcal: 400, prot: 15, items: [
            '100g pain complet',
            '30g whey + 250ml lait d\'avoine'
          ]},
          { name: 'Dîner', kcal: 950, prot: 45, items: [
            '200g bœuf haché 15% CRU',
            '130g riz basmati CRU',
            '2 c.s. huile d\'olive',
            '200g légumes surgelés'
          ]}
        ]
      }
    ]
  };

  // ───────────────────────────────────────────────────────────
  // INJECTION CSS
  // ───────────────────────────────────────────────────────────
  const css = `
    .bulk-plan-wrap{
      margin-top:24px;border-top:1px solid var(--b1);padding-top:24px;
    }
    .bulk-plan-head{
      display:flex;align-items:center;justify-content:space-between;
      margin-bottom:14px;flex-wrap:wrap;gap:10px;
    }
    .bulk-plan-title{
      font-family:var(--font);font-size:13px;font-weight:600;
      color:var(--t1);letter-spacing:-.01em;
      display:flex;align-items:center;gap:8px;
    }
    .bulk-plan-title::before{
      content:'';width:3px;height:14px;background:var(--t1);border-radius:2px;
    }
    .bulk-plan-sub{
      font-family:var(--mono);font-size:10px;color:var(--t3);
      letter-spacing:.04em;text-transform:uppercase;
    }
    .bulk-targets-row{
      display:grid;grid-template-columns:repeat(4,1fr);gap:6px;
      margin-bottom:14px;
    }
    .bulk-target{
      background:var(--s2);border:1px solid var(--b1);border-radius:var(--r);
      padding:8px 10px;display:flex;flex-direction:column;gap:2px;
    }
    .bulk-target-lbl{
      font-family:var(--mono);font-size:8px;color:var(--t3);
      letter-spacing:.08em;text-transform:uppercase;
    }
    .bulk-target-val{
      font-family:var(--mono);font-size:14px;font-weight:600;color:var(--t1);
    }
    .bulk-day-tabs{
      display:flex;gap:3px;margin-bottom:12px;overflow-x:auto;
      padding-bottom:4px;-webkit-overflow-scrolling:touch;
    }
    .bulk-day-tabs::-webkit-scrollbar{height:2px}
    .bulk-day-tabs::-webkit-scrollbar-thumb{background:var(--s5);border-radius:1px}
    .bulk-day-tab{
      flex-shrink:0;padding:6px 12px;border-radius:6px;
      background:var(--s2);border:1px solid var(--b1);
      color:var(--t2);font-size:11px;font-weight:500;
      cursor:pointer;transition:all .15s;
      font-family:var(--font);white-space:nowrap;
      display:flex;flex-direction:column;align-items:center;gap:1px;
    }
    .bulk-day-tab:hover{border-color:var(--b3);color:var(--t1)}
    .bulk-day-tab.on{
      background:var(--s4);color:var(--t1);
      border-color:var(--b3);
    }
    .bulk-day-tab .tag{
      font-family:var(--mono);font-size:7px;letter-spacing:.1em;
      text-transform:uppercase;opacity:.7;
    }
    .bulk-day-tab.push .tag{color:var(--push)}
    .bulk-day-tab.pull .tag{color:var(--pull)}
    .bulk-day-tab.legs .tag{color:var(--legs)}
    .bulk-day-tab.rest .tag{color:var(--t3)}

    .bulk-meals{
      display:flex;flex-direction:column;gap:8px;
    }
    .bulk-meal{
      background:var(--s2);border:1px solid var(--b1);border-radius:var(--r2);
      padding:12px 14px;transition:border-color .15s;
    }
    .bulk-meal:hover{border-color:var(--b2)}
    .bulk-meal-hd{
      display:flex;align-items:center;justify-content:space-between;
      margin-bottom:8px;gap:8px;flex-wrap:wrap;
    }
    .bulk-meal-name{
      font-size:12px;font-weight:600;color:var(--t1);
    }
    .bulk-meal-macros{
      display:flex;gap:8px;font-family:var(--mono);font-size:10px;
    }
    .bulk-meal-kcal{color:var(--yellow)}
    .bulk-meal-prot{color:var(--green)}
    .bulk-meal-items{
      list-style:none;padding:0;margin:0;
      display:flex;flex-direction:column;gap:4px;
    }
    .bulk-meal-items li{
      font-size:11.5px;color:var(--t2);line-height:1.5;
      padding-left:14px;position:relative;
    }
    .bulk-meal-items li::before{
      content:'—';position:absolute;left:0;color:var(--t3);
    }
    .bulk-total-bar{
      margin-top:10px;padding:10px 12px;border-radius:var(--r);
      background:var(--s3);border:1px solid var(--b2);
      display:flex;align-items:center;justify-content:space-between;
      flex-wrap:wrap;gap:10px;
    }
    .bulk-total-lbl{
      font-family:var(--mono);font-size:9px;color:var(--t3);
      letter-spacing:.08em;text-transform:uppercase;
    }
    .bulk-total-vals{
      display:flex;gap:14px;font-family:var(--mono);font-size:11px;font-weight:600;
    }
    .bulk-apply-btn{
      width:100%;margin-top:12px;padding:10px;
      background:var(--t1);color:#000;border:none;border-radius:var(--r);
      font-family:var(--font);font-weight:600;font-size:12px;
      cursor:pointer;transition:opacity .15s;
    }
    .bulk-apply-btn:hover{opacity:.85}
    .bulk-apply-btn.applied{background:var(--green);color:#000}

    @media(max-width:480px){
      .bulk-targets-row{grid-template-columns:repeat(2,1fr)}
    }
  `;
  const style = document.createElement('style');
  style.id = 'bulk-plan-styles';
  style.textContent = css;
  document.head.appendChild(style);

  // ───────────────────────────────────────────────────────────
  // RENDU HTML
  // ───────────────────────────────────────────────────────────
  function render(){
    const t = BULK_PLAN.targets;
    const todayIdx = (new Date().getDay() + 6) % 7;
    const stored = parseInt(localStorage.getItem('bulkPlanDay') ?? todayIdx);
    const currentDay = isNaN(stored) ? todayIdx : Math.max(0, Math.min(6, stored));

    const html = `
      <div class="bulk-plan-wrap" id="bulk-plan-mod">
        <div class="bulk-plan-head">
          <div>
            <div class="bulk-plan-title">Plan Bulk</div>
            <div class="bulk-plan-sub">3 000 kcal · cible 83-85 kg · sans laitiers animaux</div>
          </div>
        </div>

        <div class="bulk-targets-row">
          <div class="bulk-target">
            <span class="bulk-target-lbl">Calories</span>
            <span class="bulk-target-val">${t.kcal}</span>
          </div>
          <div class="bulk-target">
            <span class="bulk-target-lbl">Protéines</span>
            <span class="bulk-target-val">${t.prot}g</span>
          </div>
          <div class="bulk-target">
            <span class="bulk-target-lbl">Glucides</span>
            <span class="bulk-target-val">${t.gluc}g</span>
          </div>
          <div class="bulk-target">
            <span class="bulk-target-lbl">Lipides</span>
            <span class="bulk-target-val">${t.lip}g</span>
          </div>
        </div>

        <div class="bulk-day-tabs" id="bulk-day-tabs">
          ${BULK_PLAN.days.map((d,i)=>`
            <button class="bulk-day-tab ${d.type} ${i===currentDay?'on':''}" data-idx="${i}">
              <span>${d.day}</span>
              <span class="tag">${d.type}</span>
            </button>
          `).join('')}
        </div>

        <div id="bulk-meals-container"></div>

        <button class="bulk-apply-btn" id="bulk-apply">
          ⚡ Appliquer ces objectifs à mon tracker nutrition
        </button>
      </div>
    `;

    const nutritionPage = document.getElementById('page-nutrition');
    if(!nutritionPage){ console.warn('[BulkPlan] page-nutrition introuvable'); return; }
    if(document.getElementById('bulk-plan-mod')) document.getElementById('bulk-plan-mod').remove();
    const wrap = nutritionPage.querySelector('.wrap');
    (wrap || nutritionPage).insertAdjacentHTML('beforeend', html);

    renderMeals(currentDay);
    bindEvents();
  }

  function renderMeals(idx){
    const day = BULK_PLAN.days[idx];
    const c = document.getElementById('bulk-meals-container');
    if(!c) return;

    let totalKcal = 0, totalProt = 0;
    const mealsHtml = day.meals.map(m=>{
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
          <ul class="bulk-meal-items">
            ${m.items.map(it=>`<li>${it}</li>`).join('')}
          </ul>
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

    const applyBtn = document.getElementById('bulk-apply');
    if(applyBtn){
      applyBtn.addEventListener('click',()=>{
        const kcalInp = document.getElementById('nutr-goal-kcal');
        const protInp = document.getElementById('nutr-goal-prot');
        if(kcalInp){ kcalInp.value = BULK_PLAN.targets.kcal; kcalInp.dispatchEvent(new Event('input',{bubbles:true})); }
        if(protInp){ protInp.value = BULK_PLAN.targets.prot; protInp.dispatchEvent(new Event('input',{bubbles:true})); }
        if(typeof window.nutrSaveGoals === 'function'){ try{ window.nutrSaveGoals(); }catch(e){} }
        applyBtn.textContent = '✓ Objectifs appliqués';
        applyBtn.classList.add('applied');
        setTimeout(()=>{ applyBtn.textContent = '⚡ Appliquer ces objectifs à mon tracker nutrition'; applyBtn.classList.remove('applied'); }, 2200);
      });
    }
  }

  function boot(){
    if(document.getElementById('page-nutrition')){ render(); }
    else { setTimeout(boot, 200); }
  }

  if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', boot); }
  else { boot(); }
})();
