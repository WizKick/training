(function(){
  'use strict';

  const DAYS_FR = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];

  const WEEK_PLAN = [
    {poulet:400, boeuf:0,   oeufs:0, lardons:0},
    {poulet:0,   boeuf:400, oeufs:0, lardons:0},
    {poulet:400, boeuf:0,   oeufs:0, lardons:0},
    {poulet:0,   boeuf:0,   oeufs:4, lardons:100},
    {poulet:0,   boeuf:400, oeufs:0, lardons:0},
    {poulet:0,   boeuf:400, oeufs:0, lardons:0},
    {poulet:400, boeuf:0,   oeufs:0, lardons:0},
  ];

  function compute(){
    const shopDow  = parseInt(document.getElementById('sc-day').value);
    const h = parseInt(document.getElementById('sc-hour').value);
    const m = 0;
    const nextDays = parseInt(document.getElementById('sc-days').value);
    const poids = parseFloat(document.getElementById('sc-poids') ? document.getElementById('sc-poids').value : 65) || 65;
    const surplus = parseInt(document.getElementById('sc-kcal') ? document.getElementById('sc-kcal').value : 0) || 0;

    // ── Macros RÉELLES (cohérentes avec le Plan Bulk / calculateur TDEE) ──
    const macros = (typeof window.calcBulkMacros === 'function')
      ? window.calcBulkMacros()
      : (function(){
          // Fallback si le module bulk n'est pas encore chargé
          const taille = parseFloat(localStorage.getItem('scTaille'))||183;
          const age = parseInt(localStorage.getItem('scAge'))||22;
          const bmr = 10*poids + 6.25*taille - 5*age + 5;
          const tdee = Math.round(bmr*1.55);
          const kcal = tdee + surplus;
          const prot = Math.round(poids*2);
          const lip = Math.round(kcal*0.25/9);
          const gluc = Math.round((kcal - prot*4 - lip*9)/4);
          return { kcal, prot, gluc, lip, tdee };
        })();
    const protJour = macros.prot;   // g/jour
    const glucJour = macros.gluc;   // g/jour
    const lipJour  = macros.lip;    // g/jour
    const kcalJour = macros.kcal;

    // ── Diète active : densités des aliments ──
    const dietKey = (typeof window.getActiveDiet==='function') ? window.getActiveDiet() : 'classique';
    const D = (window.DIETS && window.DIETS[dietKey]) ? window.DIETS[dietKey] : null;

    // Coefficients (g de macro par g d'aliment cru) — alignés avec buildDayMeals
    const protMeatCoef = D ? ((D.protMeal[0].coef + D.protMeal[1].coef)/2) : 0.20; // moyenne des 2 sources
    const carbRizCoef  = D ? D.carbMeal.gPerG : 0.78;   // glucides/g du féculent principal
    const carbPainKpg  = D ? D.shake.kpg : 2.5;          // kcal/g du glucide du shake

    // ── Répartition journalière des macros en aliments (par jour) ──
    // Protéines : ~45% whey/poudre, ~55% source principale (viande/légumineuse/tofu)
    const protWheyJour  = Math.round(protJour * 0.45);
    const protMeatJour  = protJour - protWheyJour;
    const wheyGjour     = Math.round(protWheyJour / 0.83);          // 0.83g prot/g whey
    const meatGjour     = Math.round(protMeatJour / protMeatCoef);  // g de source principale

    // Glucides : ~50% féculent principal, ~25% avoine, ~25% glucide du shake
    const glucRizG    = Math.round((glucJour * 0.50) / carbRizCoef);
    const glucAvoineG = Math.round((glucJour * 0.25) / 0.60);       // avoine ~0.60g gluc/g
    const glucPainG   = Math.round((glucJour * 0.25 * 4) / carbPainKpg); // via kcal du shake

    // Lipides : ~55% huile, ~30% spread (beurre cacahuète/purée), reste via viande/aliments
    const huileGjour  = Math.round((lipJour * 0.55)); // huile ~1g lip/g → ml ≈ g
    const bcpGjour    = Math.round((lipJour * 0.30) / 0.50); // beurre cacahuète ~0.50g lip/g

    const laitJour    = 550;  // ml de lait végétal / jour (avoine, soja, amande selon diète)
    const legumJour   = 400;  // g de légumes / jour

    // Jeudi = repos → on retire le surplus (glucides) de cette journée
    const surplusGlucG = Math.round(surplus / 4); // g de glucides dus au surplus
    const rizSurplusPart = surplusGlucG > 0 ? Math.round(surplusGlucG / carbRizCoef) : 0;

    const now = new Date();
    const todayDow = now.getDay();

    let diff = shopDow - todayDow;
    if(diff < 0) diff += 7;
    if(diff === 0 && (now.getHours() > h || (now.getHours()===h && now.getMinutes()>=m))) diff = 7;

    const shopDate = new Date(now);
    shopDate.setDate(now.getDate() + diff);
    shopDate.setHours(h, m, 0, 0);

    const endDate = new Date(shopDate);
    endDate.setDate(shopDate.getDate() + nextDays);

    let skipped = 0;
    const includedDays = [];
    const tmp = new Date(now); tmp.setHours(0,0,0,0);
    const shopMidnight = new Date(shopDate); shopMidnight.setHours(0,0,0,0);
    const endMidnight  = new Date(endDate);  endMidnight.setHours(0,0,0,0);

    let cur = new Date(tmp);
    while(cur < shopMidnight){ skipped++; cur.setDate(cur.getDate()+1); }
    cur = new Date(shopMidnight);
    while(cur < endMidnight){ includedDays.push(new Date(cur)); cur.setDate(cur.getDate()+1); }

    const N = includedDays.length;

    let t = { flocons:0, lait:0, whey:0, bcp:0, pain:0, meat:0, oeufs:0, riz:0, legumes:0, huile:0 };
    const usesEggs = D && (D.protMeal[0].n==='oeufs' || D.protMeal[1].n==='oeufs');

    includedDays.forEach(function(date){
      const dow = date.getDay();
      const idx = dow === 0 ? 6 : dow - 1; // 0=Lundi
      // Jour de repos = lu depuis le VRAI programme de l'utilisateur (pas codé en dur)
      let isRest = false;
      try {
        const dayPlan = (typeof S!=='undefined' && S.week && S.week[idx]) ? S.week[idx] : null;
        isRest = dayPlan ? (dayPlan.type==='rest' || !dayPlan.name || !dayPlan.name.trim() || (dayPlan.exercises||[]).length===0) : false;
      } catch(e){ isRest = false; }

      t.flocons += glucAvoineG;
      t.lait    += laitJour;
      t.whey    += wheyGjour;
      t.bcp     += bcpGjour;
      t.pain    += glucPainG;
      t.riz     += glucRizG + (isRest ? 0 : rizSurplusPart); // surplus seulement les jours d'entraînement
      t.legumes += legumJour;
      t.huile   += huileGjour;
      if(usesEggs){ t.oeufs += Math.round(meatGjour * 0.13 / 6); } // ~6g prot/œuf
      else { t.meat += meatGjour; }
    });

    const badge = document.getElementById('sc-badge');
    const skip  = document.getElementById('sc-skip-note');
    const grid  = document.getElementById('sc-grid');
    if(!badge||!skip||!grid) return;

    badge.textContent = N + ' jours à couvrir — courses ' + DAYS_FR[shopDow] + ' à ' + h + 'h';
    skip.textContent  = skipped > 0 ? '↳ ' + skipped + ' jour(s) avant tes courses non inclus — gère avec ce que t\'as déjà.' : '';
    const macrosHint = document.getElementById('sc-macros-hint');
    if(macrosHint){
      macrosHint.textContent = kcalJour+' kcal/jour · '+protJour+'g prot · '+glucJour+'g gluc · '+lipJour+'g lip';
    }
    const hint = document.getElementById('sc-kcal-hint');
    if(hint){
      if(surplus > 0){
        hint.textContent = '+'+surplus+' kcal surplus les jours d\'entraînement (glucides en plus) · jours de repos : base';
      } else {
        hint.textContent = 'Maintenance · pas de surplus';
      }
    }
    const prog = document.getElementById('sc-poids-progress');
    if(prog){
      const _scGoal = parseFloat(localStorage.getItem('wtGoal')||'83')||83;
      const restant = Math.max(0, _scGoal - poids);
      if(restant <= 0){
        prog.textContent = 'Objectif atteint ✓';
      } else {
        prog.textContent = restant.toFixed(1)+'kg avant '+_scGoal+'kg';
      }
    }
    renderIMC();
    renderPaceAlert();

    function toKg(g){ return g >= 1000 ? (g/1000).toFixed(1)+'kg' : g+'g'; }
    function toLt(ml){ return ml >= 1000 ? (ml/1000).toFixed(1)+'L' : ml+'ml'; }
    function row(name, val){
      return '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:4px 0;border-bottom:1px solid var(--b1)">'
        + '<span style="font-size:11.5px;color:var(--t2)">'+name+'</span>'
        + '<span style="font-family:var(--mono);font-size:11px;font-weight:600;color:var(--t1)">'+val+'</span>'
        + '</div>';
    }
    function card(label, color, rows){
      return '<div style="background:var(--s2);border:1px solid var(--b1);border-radius:var(--r2);overflow:hidden">'
        + '<div style="padding:6px 12px;font-family:var(--mono);font-size:9px;font-weight:600;letter-spacing:.07em;text-transform:uppercase;color:'+color+';border-bottom:1px solid var(--b1)">'+label+'</div>'
        + '<div style="padding:4px 12px 8px">'+rows+'</div>'
        + '</div>';
    }

    let html = '';

    // En-tête diète
    if(D){
      html += '<div style="grid-column:1/-1;display:flex;align-items:center;gap:8px;margin-bottom:4px;font-family:var(--mono);font-size:10px;color:var(--t3)">'
        + '<span style="font-size:14px">'+D.emoji+'</span> Diète : <b style="color:var(--t1)">'+D.label+'</b> · '+D.desc+'</div>';
    }

    if(D){
      // ── Sources protéines de la diète (les 2 protMeal) ──
      const p1 = D.protMeal[0], p2 = D.protMeal[1];
      let meatRows = '';
      if(t.meat > 0){
        // Réparti entre les 2 sources de la diète
        meatRows += row(cleanLbl(p1.lbl), toKg(Math.round(t.meat*0.5)));
        meatRows += row(cleanLbl(p2.lbl), toKg(Math.round(t.meat*0.5)));
      }
      if(t.oeufs > 0) meatRows += row('Œufs', t.oeufs + ' unités');
      if(meatRows) html += card('Protéines principales', 'var(--pull)', meatRows);

      // ── Whey / protéine en poudre ──
      let protRows = row('Whey / protéine végétale', toKg(t.whey) + ' (~'+ Math.ceil(t.whey/30) +' doses)');
      html += card('Protéine en poudre', 'var(--green)', protRows);

      // ── Glucides de la diète ──
      let glucRows = row('Flocons d\'avoine CRU', toKg(t.flocons))
        + row(cleanLbl(D.carbMeal.lbl), toKg(t.riz))
        + row(cleanLbl(D.shake.carb), toKg(t.pain));
      html += card('Glucides', 'var(--push)', glucRows);

      // ── Divers / lipides / lait de la diète ──
      let divRows = row(cleanLbl(D.milk).replace(/^\d+\s*ml\s*/i,'').replace(/^./,c=>c.toUpperCase()), toLt(t.lait))
        + row(D.veg.replace(/^\d+g\s*/,''), toKg(t.legumes))
        + row(fatLabel(D.fatMeal), toLt(t.huile))
        + row(spreadLabel(D.oats.spread), toKg(t.bcp));
      // Collations : seulement si le plan en contient (5 repas = 1/j, 6 repas = 2/j)
      const mealCount = (typeof window.getMealCount==='function') ? window.getMealCount()
                      : (parseInt(localStorage.getItem('bulkMealCount'))||4);
      const snacksPerDay = mealCount>=6 ? 2 : mealCount>=5 ? 1 : 0;
      if(snacksPerDay > 0){
        const totalSnacks = snacksPerDay * N;          // nb de collations sur la période
        divRows += row(D.snack[0], totalSnacks + ' ×'); // ex : "1 banane" × nb collations
        divRows += row(D.snack[1], (snacksPerDay*30*N) + 'g'); // ~30g d'oléagineux par collation
      }
      html += card('Lipides & divers', 'var(--t2)', divRows);

    } else {
      // Fallback (module bulk non chargé)
      let viandeRows = t.meat > 0 ? row('Source protéinée', toKg(t.meat)) : '';
      if(t.oeufs > 0) viandeRows += row('Œufs', t.oeufs + ' unités');
      if(viandeRows) html += card('Protéines', 'var(--pull)', viandeRows);
      let protRows = row('Whey', toKg(t.whey));
      html += card('Protéine en poudre', 'var(--green)', protRows);
      let glucRows = row('Flocons avoine CRU', toKg(t.flocons)) + row('Riz CRU', toKg(t.riz)) + row('Pain complet', toKg(t.pain));
      html += card('Glucides', 'var(--push)', glucRows);
      let divRows = row('Lait végétal', toLt(t.lait)) + row('Légumes', toKg(t.legumes)) + row('Huile', toLt(t.huile)) + row('Beurre de cacahuète', toKg(t.bcp));
      html += card('Divers', 'var(--t2)', divRows);
    }

    grid.innerHTML = html;
  }

  // Nettoie un libellé d'aliment pour la liste de courses (retire "CRU", "(poids cru)", etc.)
  function cleanLbl(s){
    return String(s||'')
      .replace(/\s*\([^)]*\)/g,'')      // retire toute parenthèse : (poids cru), (≈6 œufs)…
      .replace(/\s*CRUE?\b/gi,'')        // retire "CRU"/"CRUE"
      .trim();
  }
  // Extrait l'aliment lipidique principal d'une ligne "fatMeal"
  function fatLabel(s){
    s = String(s||'');
    if(/sésame/i.test(s)) return 'Huile de sésame';
    if(/colza/i.test(s))  return 'Huile de colza';
    if(/avocat/i.test(s)) return 'Huile d\'olive + avocat';
    return 'Huile d\'olive';
  }
  // Extrait le "spread" (purée/beurre) du petit-déj
  function spreadLabel(s){
    return String(s||'').replace(/^\d+g\s*/,'').replace(/^./,c=>c.toUpperCase());
  }

  // ── Alerte vitesse de prise de masse (lit le tracker de poids) ──
  function renderPaceAlert(){
    const box = document.getElementById('sc-pace-alert');
    if(!box) return;
    const rate = (typeof window.wtGetWeeklyRate === 'function') ? window.wtGetWeeklyRate() : null;
    const poids  = parseFloat(document.getElementById('sc-poids')?.value) || 65;
    const goalKg = parseFloat(document.getElementById('sc-poids-cible')?.value) || 83;
    const gaining = goalKg > poids; // on veut prendre du poids

    if(rate === null){
      box.style.display = 'block';
      box.style.background = 'var(--s2)';
      box.style.border = '1px solid var(--b1)';
      box.style.color = 'var(--t3)';
      box.innerHTML = '📉 Pèse-toi 2 fois minimum (page Poids) pour estimer ta vitesse de progression.';
      return;
    }

    const r = +rate.toFixed(2);
    let bg, bd, col, icon, msg;
    if(gaining){
      // Fourchette saine de prise de masse : 0.2–0.45 kg/sem
      if(r < 0.1){
        bg='rgba(96,165,250,.08)'; bd='rgba(96,165,250,.25)'; col='var(--blue)'; icon='🐌';
        msg='<b>'+r+' kg/sem</b> — trop lent pour ta cible. Monte d\'un cran le surplus (ex. +500) ou ajoute du riz/flocons.';
      } else if(r <= 0.45){
        bg='rgba(74,222,128,.08)'; bd='rgba(74,222,128,.25)'; col='var(--green)'; icon='✅';
        msg='<b>'+r+' kg/sem</b> — rythme idéal de prise de masse propre. Continue exactement comme ça.';
      } else if(r <= 0.7){
        bg='rgba(251,191,36,.08)'; bd='rgba(251,191,36,.25)'; col='var(--yellow)'; icon='⚠️';
        msg='<b>'+r+' kg/sem</b> — un peu rapide, tu prends sûrement du gras. Réduis le surplus (ex. +200/+350).';
      } else {
        bg='rgba(248,113,113,.08)'; bd='rgba(248,113,113,.25)'; col='var(--red)'; icon='🛑';
        msg='<b>'+r+' kg/sem</b> — trop rapide, c\'est majoritairement du gras. Repasse à +200 ou maintenance.';
      }
    } else {
      // Objectif sous le poids actuel → sèche
      if(r > -0.1){
        bg='rgba(251,191,36,.08)'; bd='rgba(251,191,36,.25)'; col='var(--yellow)'; icon='⚠️';
        msg='<b>'+(r>=0?'+':'')+r+' kg/sem</b> — tu ne perds pas. Crée un déficit pour atteindre ta cible.';
      } else if(r >= -0.9){
        bg='rgba(74,222,128,.08)'; bd='rgba(74,222,128,.25)'; col='var(--green)'; icon='✅';
        msg='<b>'+r+' kg/sem</b> — bon rythme de sèche, tu préserves le muscle.';
      } else {
        bg='rgba(248,113,113,.08)'; bd='rgba(248,113,113,.25)'; col='var(--red)'; icon='🛑';
        msg='<b>'+r+' kg/sem</b> — trop rapide, risque de perdre du muscle. Remonte un peu les calories.';
      }
    }
    box.style.display = 'block';
    box.style.background = bg;
    box.style.border = '1px solid '+bd;
    box.style.color = 'var(--t2)';
    box.innerHTML = '<span style="margin-right:5px">'+icon+'</span><span style="color:'+col+'">'+msg+'</span>';
  }

  // ── Sync : récupère le dernier poids du tracker dans le champ nutrition ──
  function syncWeightFromTracker(silent){
    const last = (typeof window.wtGetLastWeight === 'function') ? window.wtGetLastWeight() : null;
    const inp = document.getElementById('sc-poids');
    if(!inp) return false;
    if(last !== null && !isNaN(last)){
      inp.value = last;
      localStorage.setItem('scPoids', String(last));
      compute();
      if(!silent && typeof showToast === 'function') showToast('Poids synchronisé : '+last+' kg ✓');
      return true;
    }
    if(!silent && typeof showToast === 'function') showToast('Aucun poids dans le tracker pour l\'instant');
    return false;
  }

  function renderIMC(){
    const row = document.getElementById('sc-imc-row');
    if(!row) return;
    const poids  = parseFloat(document.getElementById('sc-poids')?.value) || 65;
    const taille = parseFloat(document.getElementById('sc-taille')?.value) || 183;
    const goalKg = parseFloat(document.getElementById('sc-poids-cible')?.value) || 83;
    const mh = taille/100;
    const imcNow  = mh>0 ? poids/(mh*mh)  : 0;
    const imcGoal = mh>0 ? goalKg/(mh*mh) : 0;
    function cat(imc){
      if(imc < 18.5) return {lbl:'Maigreur', col:'var(--blue)'};
      if(imc < 25)   return {lbl:'Normal',   col:'var(--green)'};
      if(imc < 30)   return {lbl:'Surpoids', col:'var(--yellow)'};
      return {lbl:'Obésité', col:'var(--red)'};
    }
    const cNow = cat(imcNow), cGoal = cat(imcGoal);
    function chip(lbl, val, c){
      return '<div style="flex:1;min-width:140px;background:var(--s2);border:1px solid var(--b1);border-radius:var(--r2);padding:8px 12px">'
        + '<div style="font-family:var(--mono);font-size:8px;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:3px">'+lbl+'</div>'
        + '<div style="display:flex;align-items:baseline;gap:6px">'
        + '<span style="font-size:18px;font-weight:300;letter-spacing:-.03em;color:var(--t1)">'+val.toFixed(1)+'</span>'
        + '<span style="font-family:var(--mono);font-size:9px;font-weight:600;color:'+c.col+'">'+c.lbl+'</span>'
        + '</div></div>';
    }
    row.innerHTML = chip('IMC actuel', imcNow, cNow)
      + chip('IMC à l\'objectif ('+goalKg+'kg)', imcGoal, cGoal);
  }

  function init(){
    const el = document.getElementById('sc-day');
    if(!el){ setTimeout(init, 200); return; }
    const savedPoids = localStorage.getItem('scPoids');
    if(savedPoids){ const pi = document.getElementById('sc-poids'); if(pi) pi.value = savedPoids; }
    const spInp = document.getElementById('sc-poids');
    if(spInp) spInp.addEventListener('change', function(){ localStorage.setItem('scPoids', this.value); });

    // Bouton sync manuel + sync auto au 1er chargement si aucun poids saisi
    const syncBtn = document.getElementById('sc-poids-sync');
    if(syncBtn) syncBtn.addEventListener('click', function(){ syncWeightFromTracker(false); });
    if(!savedPoids){ syncWeightFromTracker(true); }

    // ── Taille & âge : persistance + recalcul ──
    const tSaved = localStorage.getItem('scTaille');
    const aSaved = localStorage.getItem('scAge');
    const tInp = document.getElementById('sc-taille');
    const aInp = document.getElementById('sc-age');
    if(tInp && tSaved) tInp.value = tSaved;
    if(aInp && aSaved) aInp.value = aSaved;
    if(tInp) tInp.addEventListener('change', function(){ localStorage.setItem('scTaille', this.value); compute(); });
    if(aInp) aInp.addEventListener('change', function(){ localStorage.setItem('scAge', this.value); compute(); });

    const scCible = document.getElementById('sc-poids-cible');
    if(scCible){
      const savedGoal = localStorage.getItem('wtGoal');
      if(savedGoal) scCible.value = savedGoal;
      scCible.addEventListener('change', function(){
        localStorage.setItem('wtGoal', this.value);
        const lbl = document.getElementById('wt-goal-lbl');
        if(lbl) lbl.textContent = this.value + ' kg';
        compute();
      });
    }
    ['sc-day','sc-hour','sc-days','sc-kcal','sc-poids'].forEach(function(id){
      const elx = document.getElementById(id);
      if(elx) elx.addEventListener('change', compute);
    });
    compute();
  }

  // Exposé global : permet au changement de diète (autre bloc) de rafraîchir la liste
  window.scRefreshShopping = compute;

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
