/*    CALCULATEUR DE DISQUES
   Haltère à vide (chacun) = 2.25 kg
   Barre EZ à vide          = 4.5 kg
   Disques dispo : 1.25 / 2.5 / 5 kg
   Convention : le "poids" du programme = disques par côté/main,
   hors barre. Le calculateur affiche aussi le poids RÉEL total.
   ════════════════════════════════════════════════ */
/* ════════════════════════════════════════════════
   CALCULATEUR DE DISQUES — inventaire paramétrable
   Tu définis : poids des barres à vide + tes disques (poids × quantité).
   Le calcul respecte ton STOCK réel et peut autoriser un léger
   déséquilibre gauche/droite (ok pour rowing, exos unilatéraux).
   ════════════════════════════════════════════════ */

// Inventaire par défaut (modifiable par l'utilisateur, persisté)
const PLATE_DEFAULTS = {
  barDumbbell: 2.25,   // un haltère à vide (kg)
  barEZ: 4.5,          // barre EZ à vide (kg)
  barStraight: 10,     // barre droite à vide (kg)
  // disques : { poids: nombre TOTAL possédé (paire = 2) }
  discs: { 5:4, 2.5:4, 1.25:4, 1:2 }
};
function plateInv(){
  try { const v = JSON.parse(localStorage.getItem('sbt-plates')||'null'); if(v && v.discs) return v; } catch(e){}
  return JSON.parse(JSON.stringify(PLATE_DEFAULTS));
}
function plateInvSave(inv){ try{ localStorage.setItem('sbt-plates', JSON.stringify(inv)); }catch(e){} if(typeof scheduleSyncPush==='function') scheduleSyncPush(); }
// Liste des poids de disques dispo, triés décroissant
function plateDiscList(){
  const inv = plateInv();
  return Object.keys(inv.discs).map(Number).filter(w=>w>0 && inv.discs[w]>0).sort((a,b)=>b-a);
}
// Compat : anciennes constantes pointent vers l'inventaire
function plateBar(kind){ const inv=plateInv(); return kind==='ez'?inv.barEZ:kind==='straight'?inv.barStraight:inv.barDumbbell; }

// Devine le type d'équipement depuis le nom de l'exo
function plateGuessKind(name){
  const n = (name||'').toLowerCase();
  if(/poids du corps|traction|dips|pull|step|fente|facepull|poulie|tirage|élévation|elevation|shrug/.test(n)
     && !/haltère|haltere|barre|ez|curl/.test(n)) return 'pc';
  if(/\bez\b|barre ez|curl ez|rowing barre/.test(n)) return 'ez';
  if(/haltère|haltere|halteres/.test(n)) return 'db';
  if(/barre/.test(n)) return 'ez';
  return 'db';
}

// Résout les disques pour une charge cible PAR CÔTÉ, en respectant le STOCK.
// stock = objet {poids: nb dispo POUR CE CÔTÉ}. Glouton du plus lourd au plus léger.
function plateSolveStock(perSide, stockPerSide){
  const out = [];
  let rem = Math.round(perSide*100)/100;
  const list = Object.keys(stockPerSide).map(Number).filter(w=>w>0 && stockPerSide[w]>0).sort((a,b)=>b-a);
  const used = {};
  for(const d of list){
    let avail = stockPerSide[d];
    while(rem >= d - 0.001 && avail > 0){ out.push(d); used[d]=(used[d]||0)+1; avail--; rem = Math.round((rem-d)*100)/100; }
  }
  return { discs: out, leftover: rem, used };
}

let _plateName='', _plateKind='db';
function openPlateCalc(plannedW, name){
  _plateName = name||'';
  _platekindAuto = plateGuessKind(name);
  _plateKind = _platekindAuto;
  let m = document.getElementById('plate-modal');
  if(!m){
    m = document.createElement('div');
    m.id = 'plate-modal';
    m.className = 'vid-modal';
    m.style.cssText='position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);padding:16px';
    m.innerHTML = `
      <div style="background:var(--s1);border:1px solid var(--b2);border-radius:14px;max-width:380px;width:100%;padding:20px;position:relative;box-shadow:0 20px 60px rgba(0,0,0,.4)">
        <button onclick="closePlateCalc()" style="position:absolute;top:12px;right:12px;background:var(--s3);border:1px solid var(--b1);color:var(--t2);width:28px;height:28px;border-radius:8px;cursor:pointer;font-size:14px">✕</button>
        <div style="font-family:var(--font);font-weight:600;font-size:14px;color:var(--t1);margin-bottom:2px">🧮 Calculateur de disques</div>
        <div id="plate-exo" style="font-family:var(--mono);font-size:10px;color:var(--t3);margin-bottom:14px"></div>

        <div style="display:flex;gap:4px;margin-bottom:14px" id="plate-kind-tabs">
          <button data-k="db" class="plate-kind" style="flex:1">Haltère</button>
          <button data-k="ez" class="plate-kind" style="flex:1">Barre EZ</button>
          <button data-k="straight" class="plate-kind" style="flex:1">Barre droite</button>
          <button data-k="pc" class="plate-kind" style="flex:1">Poids corps</button>
        </div>

        <div id="plate-help"></div>
        <div id="plate-body"></div>
      </div>`;
    document.body.appendChild(m);
    // styles boutons type
    const st=document.createElement('style');
    st.textContent=`
      #plate-modal .plate-kind{padding:7px 6px;border-radius:8px;background:var(--s2);border:1px solid var(--b1);color:var(--t2);font-family:var(--font);font-size:11px;font-weight:500;cursor:pointer;transition:all .15s}
      #plate-modal .plate-kind:hover{border-color:var(--b3);color:var(--t1)}
      #plate-modal .plate-kind.on{background:var(--t1);color:#000;border-color:var(--t1)}
      #plate-modal .plate-in{width:100%;padding:10px 12px;border-radius:8px;background:var(--s2);border:1px solid var(--b2);color:var(--t1);font-family:var(--mono);font-size:16px;font-weight:600;text-align:center}
      #plate-modal .plate-disc{display:inline-flex;align-items:center;gap:4px;padding:5px 10px;border-radius:20px;background:var(--s3);border:1px solid var(--b2);font-family:var(--mono);font-size:12px;font-weight:600;color:var(--t1);margin:3px}
    `;
    document.head.appendChild(st);
    m.querySelectorAll('.plate-kind').forEach(b=>{
      b.addEventListener('click',()=>{ _plateKind=b.dataset.k; plateRenderBody(); });
    });
  }
  document.getElementById('plate-exo').textContent = _plateName;
  m.style.display='flex';
  plateRenderBody(plannedW);
  const hb=document.getElementById('plate-help'); if(hb) hb.innerHTML=helpBubble('disques');
}
function closePlateCalc(){ const m=document.getElementById('plate-modal'); if(m) m.style.display='none'; }

function _plateOnMateriel(){ const p=document.getElementById('page-materiel'); return p && p.classList.contains('on'); }
function _plateBodyEl(){ return _plateOnMateriel() ? document.getElementById('mat-calc-body') : document.getElementById('plate-body'); }

// Rendu de l'onglet Matériel : calculateur (inline) + config équipement
let _matTabsBound = false;
function renderMateriel(){
  if(_plateKind==='settings' || _plateKind==='pc'){ /* garde le choix courant sauf settings */ }
  if(_plateKind==='settings') _plateKind='db';
  // Bind onglets une seule fois
  if(!_matTabsBound){
    document.querySelectorAll('#mat-kind-tabs .mat-kind').forEach(b=>{
      b.addEventListener('click',()=>{ _plateKind=b.dataset.k; plateRenderBody(); });
    });
    _matTabsBound = true;
  }
  plateRenderBody();           // remplit #mat-calc-body
  plateRenderSettings('mat-config-body'); // remplit la config
}

function plateRenderBody(prefill){
  const onMat = _plateOnMateriel();
  document.querySelectorAll('#plate-modal .plate-kind').forEach(b=>b.classList.toggle('on', b.dataset.k===_plateKind));
  document.querySelectorAll('#mat-kind-tabs .mat-kind').forEach(b=>b.classList.toggle('on', b.dataset.k===_plateKind));
  const body=_plateBodyEl();
  if(!body) return;
  if(_plateKind==='settings'){ plateRenderSettings(); return; }
  if(_plateKind==='pc'){
    body.innerHTML=`<div style="text-align:center;padding:16px 0;font-size:13px;color:var(--t2);line-height:1.6">
      Exercice au <b style="color:var(--t1)">poids du corps</b>.<br>
      <span style="font-family:var(--mono);font-size:11px;color:var(--t3)">Saisis le lest éventuel directement dans tes séries.</span>
    </div>`;
    return;
  }
  const isEZ = _plateKind==='ez';
  const barW = plateBar(_plateKind);
  const barLbl = isEZ ? 'Barre EZ à vide' : (_plateKind==='straight' ? 'Barre droite à vide' : 'Haltère à vide (chacun)');
  const totalLbl = (_plateKind==='db') ? 'Poids total par haltère (kg)' : 'Poids total à soulever (kg)';
  const cur = (typeof prefill==='number' && prefill>0) ? prefill : (parseFloat(document.getElementById('plate-target')?.value)||0);
  const discListStr = plateDiscList().join(' · ') || 'aucun disque configuré';
  const allowImbal = localStorage.getItem('sbt-plate-imbalance')==='1';

  body.innerHTML=`
    <div style="margin-bottom:6px;font-family:var(--mono);font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">${totalLbl}</div>
    <input id="plate-target" class="plate-in" type="number" inputmode="decimal" min="0" step="0.5" value="${cur||''}" placeholder="ex: 12" oninput="plateCompute()"/>
    <div style="display:flex;justify-content:space-between;margin-top:6px;font-family:var(--mono);font-size:10px;color:var(--t3)">
      <span>${barLbl} : <b style="color:var(--t2)">${barW} kg</b></span>
      <span>Mes disques : ${discListStr}</span>
    </div>
    <label style="display:flex;align-items:center;gap:7px;margin-top:10px;font-family:var(--mono);font-size:10px;color:var(--t2);cursor:pointer">
      <input type="checkbox" id="plate-imbal" ${allowImbal?'checked':''} onchange="localStorage.setItem('sbt-plate-imbalance', this.checked?'1':'0'); plateCompute();"/>
      Autoriser un léger déséquilibre gauche/droite (rowing, unilatéral…)
    </label>
    <div id="plate-result" style="margin-top:16px"></div>
    ${onMat ? '' : `<button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;margin-top:14px" onclick="_plateKind='settings';plateRenderBody()">⚙ Configurer mon matériel</button>`}`;
  plateCompute();
}

function plateRenderSettings(targetId){
  const inv = plateInv();
  const onMat = _plateOnMateriel();
  const body = targetId ? document.getElementById(targetId) : (onMat ? document.getElementById('mat-config-body') : document.getElementById('plate-body'));
  if(!body) return;
  const discRows = Object.keys(inv.discs).map(Number).sort((a,b)=>b-a).map(w=>`
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <input type="number" inputmode="decimal" value="${w}" step="0.25" min="0" class="plate-in" style="font-size:13px;padding:6px 8px;width:80px"
        onchange="plateEditDiscWeight(${w}, this.value)"/>
      <span style="font-family:var(--mono);font-size:10px;color:var(--t3)">kg ×</span>
      <input type="number" inputmode="numeric" value="${inv.discs[w]}" step="1" min="0" class="plate-in" style="font-size:13px;padding:6px 8px;width:64px"
        onchange="plateEditDiscQty(${w}, this.value)"/>
      <span style="font-family:var(--mono);font-size:10px;color:var(--t3)">dispo</span>
      <button onclick="plateRemoveDisc(${w})" style="margin-left:auto;background:var(--s3);border:1px solid var(--b1);color:var(--red);width:26px;height:26px;border-radius:7px;cursor:pointer">✕</button>
    </div>`).join('');

  body.innerHTML=`
    <div style="font-family:var(--mono);font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Barres à vide (kg)</div>
    <div style="display:flex;gap:8px;margin-bottom:16px">
      <div style="flex:1"><div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-bottom:3px">Haltère</div>
        <input type="number" inputmode="decimal" value="${inv.barDumbbell}" step="0.25" class="plate-in" style="font-size:13px;padding:6px" onchange="plateEditBar('barDumbbell',this.value)"/></div>
      <div style="flex:1"><div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-bottom:3px">Barre EZ</div>
        <input type="number" inputmode="decimal" value="${inv.barEZ}" step="0.25" class="plate-in" style="font-size:13px;padding:6px" onchange="plateEditBar('barEZ',this.value)"/></div>
      <div style="flex:1"><div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-bottom:3px">Barre droite</div>
        <input type="number" inputmode="decimal" value="${inv.barStraight}" step="0.5" class="plate-in" style="font-size:13px;padding:6px" onchange="plateEditBar('barStraight',this.value)"/></div>
    </div>
    <div style="font-family:var(--mono);font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Mes disques (poids × quantité totale)</div>
    ${discRows}
    <button class="btn btn-ghost btn-sm" style="width:100%;justify-content:center;margin-top:6px" onclick="plateAddDisc()">+ Ajouter un disque</button>
    <div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-top:10px;line-height:1.5">Quantité = nombre TOTAL de disques de ce poids (une paire = 2).</div>
    <label style="display:flex;align-items:center;gap:9px;margin-top:16px;padding:11px;background:var(--s2);border:1px solid var(--b1);border-radius:8px;cursor:pointer">
      <input type="checkbox" ${localStorage.getItem('sbt-per-hand')==='1'?'checked':''} onchange="localStorage.setItem('sbt-per-hand', this.checked?'1':'0'); if(typeof renderSession==='function') renderSession();"/>
      <div>
        <div style="font-size:12px;font-weight:600;color:var(--t1)">Mode « poids par haltère »</div>
        <div style="font-size:10px;color:var(--t3);line-height:1.4;margin-top:2px">Pour les exercices à 2 haltères, affiche le poids d'UN haltère au lieu du total des deux. Plus simple à suivre.</div>
      </div>
    </label>
    ${onMat ? '' : `<button class="btn btn-white" style="width:100%;justify-content:center;margin-top:14px" onclick="_plateKind=_platekindAuto||'db';plateRenderBody()">← Retour au calcul</button>`}`;
}

function plateEditBar(key,val){ const inv=plateInv(); inv[key]=parseFloat(val)||0; plateInvSave(inv); }
function plateEditDiscQty(w,val){ const inv=plateInv(); inv.discs[w]=parseInt(val)||0; plateInvSave(inv); }
function plateEditDiscWeight(oldW,val){
  const nw=parseFloat(val); if(!nw||nw<=0) return;
  const inv=plateInv(); const qty=inv.discs[oldW]||0; delete inv.discs[oldW]; inv.discs[nw]=qty; plateInvSave(inv); plateRenderSettings();
}
function plateRemoveDisc(w){ const inv=plateInv(); delete inv.discs[w]; plateInvSave(inv); plateRenderSettings(); }
function plateAddDisc(){
  const v=prompt('Poids du disque (kg) ? ex: 0.5, 1, 1.25, 5, 10');
  if(v===null) return; const w=parseFloat(v); if(!w||w<=0) return;
  const inv=plateInv(); if(!inv.discs[w]) inv.discs[w]=2; plateInvSave(inv); plateRenderSettings();
}

function plateCompute(){
  const res = document.getElementById('plate-result');
  if(!res) return;
  const target = parseFloat((document.getElementById('plate-target')||{}).value)||0;
  if(target<=0){ res.innerHTML=''; return; }
  const inv = plateInv();
  const allowImbal = localStorage.getItem('sbt-plate-imbalance')==='1';
  const barW = plateBar(_plateKind);
  const isEZ = _plateKind==='ez';
  const isStraight = _plateKind==='straight';
  const isBar = isEZ || isStraight;

  function chips(arr){
    return arr.length ? arr.map(d=>`<span class="plate-disc">${d}<span style="font-size:9px;opacity:.6">kg</span></span>`).join('')
      : `<span style="font-family:var(--mono);font-size:11px;color:var(--t3)">aucun disque (barre seule)</span>`;
  }

  if(isBar){
    // ── BARRE : target = POIDS TOTAL à soulever (barre incluse). ──
    const barLbl = isEZ?'Barre EZ':'Barre droite';
    // Disques nécessaires = total voulu - barre à vide
    const discsNeeded = Math.round((target - barW)*100)/100;
    if(discsNeeded < 0){
      res.innerHTML = `<div style="padding:12px;background:var(--s3);border:1px solid var(--b2);border-radius:10px;font-family:var(--mono);font-size:11px;color:var(--yellow)">
        La ${barLbl} à vide pèse déjà ${barW}kg, soit plus que les ${target}kg visés. Impossible de descendre plus bas avec cette barre.</div>`;
      return;
    }
    if(discsNeeded < 0.01){
      res.innerHTML = `<div style="text-align:center;margin-bottom:6px">${chips([])}</div>
        <div style="text-align:center;font-family:var(--mono);font-size:10px;color:var(--gold);margin-bottom:10px">La ${barLbl} seule pèse ${barW}kg = ton objectif. Aucun disque à ajouter.</div>`;
      return;
    }
    const perSide = discsNeeded/2;
    const stockPerSide = {}; Object.keys(inv.discs).forEach(w=>{ stockPerSide[w]=Math.floor(inv.discs[w]/2); });
    const sol = plateSolveStock(perSide, stockPerSide);
    const sideKg = sol.discs.reduce((a,b)=>a+b,0);
    const realTotal = Math.round((barW + sideKg*2)*10)/10;
    let warn='';
    if(sol.leftover>0.01) warn=`<div style="margin-top:8px;font-family:var(--mono);font-size:10px;color:var(--yellow)">⚠ Impossible pile : ${realTotal}kg au plus proche (manque ${sol.leftover}kg/côté en stock).</div>`;
    res.innerHTML = `
      <div style="font-family:var(--mono);font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Pour soulever ${target}kg avec la ${barLbl} :</div>
      <div style="font-family:var(--mono);font-size:10px;color:var(--t3);text-align:center;margin-bottom:4px">Mets sur CHAQUE côté (identique) :</div>
      <div style="text-align:center;margin-bottom:6px">${chips(sol.discs)}</div>
      <div style="text-align:center;font-family:var(--mono);font-size:10px;color:var(--gold);margin-bottom:10px">↑ ${sideKg}kg à gauche ET ${sideKg}kg à droite</div>
      ${warn}
      <div style="padding:12px;background:var(--s3);border:1px solid var(--b2);border-radius:10px">
        <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:11px;color:var(--t2);padding:2px 0"><span>${barLbl} à vide</span><span style="color:var(--t1);font-weight:600">${barW} kg</span></div>
        <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:11px;color:var(--t2);padding:2px 0"><span>+ disques (${sideKg}×2)</span><span style="color:var(--t1);font-weight:600">${sideKg*2} kg</span></div>
        <div style="height:1px;background:var(--b2);margin:8px 0"></div>
        <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-family:var(--mono);font-size:10px;color:var(--t3);text-transform:uppercase">Total soulevé</span><span style="font-family:var(--mono);font-size:18px;font-weight:700;color:var(--green)">${realTotal} kg</span></div>
      </div>`;
    return;
  }

  // ── HALTÈRE : target = POIDS TOTAL d'UN haltère (barre à vide incluse). ──
  const discsNeeded = Math.round((target - barW)*100)/100;
  if(discsNeeded < 0){
    res.innerHTML = `<div style="padding:12px;background:var(--s3);border:1px solid var(--b2);border-radius:10px;font-family:var(--mono);font-size:11px;color:var(--yellow)">
      L'haltère à vide pèse déjà ${barW}kg, soit plus que les ${target}kg visés. Impossible de descendre plus bas.</div>`;
    return;
  }
  if(discsNeeded < 0.01){
    res.innerHTML = `<div style="text-align:center;margin-bottom:6px">${chips([])}</div>
      <div style="text-align:center;font-family:var(--mono);font-size:10px;color:var(--gold);margin-bottom:10px">L'haltère seul pèse ${barW}kg = ton objectif. Aucun disque à ajouter.</div>`;
    return;
  }
  const perSideTarget = discsNeeded/2; // disques répartis sur les 2 côtés du manche
  const stockPerSideOneDB = {}; Object.keys(inv.discs).forEach(w=>{ stockPerSideOneDB[w]=Math.floor(inv.discs[w]/2); });
  const sol = plateSolveStock(perSideTarget, stockPerSideOneDB);
  let leftSide=[...sol.discs], rightSide=[...sol.discs];
  let imbalNote='';
  if(sol.leftover>0.01 && allowImbal){
    const remaining={}; Object.keys(inv.discs).forEach(w=>{ const used=(sol.used&&sol.used[w])?sol.used[w]:0; remaining[w]=Math.floor(inv.discs[w]/2)-used; });
    const small=Object.keys(remaining).map(Number).filter(w=>remaining[w]>0).sort((a,b)=>a-b);
    let best=null,bestDiff=sol.leftover*2;
    for(const w of small){ const nt=sol.discs.reduce((a,b)=>a+b,0)*2+w; const diff=Math.abs(discsNeeded-nt); if(diff<bestDiff){bestDiff=diff;best=w;} }
    if(best!=null){ rightSide=[...sol.discs,best]; imbalNote=`Léger déséquilibre : un côté du manche a +${best}kg (ok rowing/unilatéral).`; }
  }
  const lKg=leftSide.reduce((a,b)=>a+b,0), rKg=rightSide.reduce((a,b)=>a+b,0);
  const oneDBdisc = lKg+rKg;
  const realPerDB = Math.round((barW+oneDBdisc)*10)/10;

  let stockWarn='';
  const need2={}; [...leftSide,...rightSide].forEach(w=>{ need2[w]=(need2[w]||0)+2; });
  for(const w in need2){ if(need2[w] > (inv.discs[w]||0)){ stockWarn=`<div style="margin-top:8px;font-family:var(--mono);font-size:10px;color:var(--yellow)">⚠ Pas assez de disques de ${w}kg pour 2 haltères identiques (il en faut ${need2[w]}, tu en as ${inv.discs[w]||0}).</div>`; break; } }
  let warn='';
  if(sol.leftover>0.01 && !imbalNote) warn=`<div style="margin-top:8px;font-family:var(--mono);font-size:10px;color:var(--yellow)">⚠ Impossible pile : ${realPerDB}kg/haltère au plus proche. Coche « déséquilibre » si l'exo le permet.</div>`;

  res.innerHTML = `
    <div style="font-family:var(--mono);font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Pour ${target}kg par haltère — mets sur CHAQUE haltère :</div>
    <div style="display:flex;gap:10px;margin-bottom:10px">
      <div style="flex:1;text-align:center;padding:8px;background:var(--s3);border:1px solid var(--b2);border-radius:8px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-bottom:4px">Côté gauche</div>
        ${chips(leftSide)}
        <div style="font-family:var(--mono);font-size:9px;color:var(--t2);margin-top:4px">${lKg}kg</div>
      </div>
      <div style="flex:1;text-align:center;padding:8px;background:var(--s3);border:1px solid var(--b2);border-radius:8px">
        <div style="font-family:var(--mono);font-size:9px;color:var(--t3);margin-bottom:4px">Côté droit</div>
        ${chips(rightSide)}
        <div style="font-family:var(--mono);font-size:9px;color:var(--t2);margin-top:4px">${rKg}kg</div>
      </div>
    </div>
    <div style="text-align:center;font-family:var(--mono);font-size:10px;color:var(--gold);margin-bottom:10px">↑ Charge tes 2 haltères de la même façon</div>
    ${imbalNote?`<div style="margin-bottom:8px;font-family:var(--mono);font-size:10px;color:var(--blue)">⚖ ${imbalNote}</div>`:''}
    ${warn}${stockWarn}
    <div style="padding:12px;background:var(--s3);border:1px solid var(--b2);border-radius:10px">
      <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:11px;color:var(--t2);padding:2px 0"><span>Haltère à vide</span><span style="color:var(--t1);font-weight:600">${barW} kg</span></div>
      <div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:11px;color:var(--t2);padding:2px 0"><span>+ disques (${lKg}+${rKg})</span><span style="color:var(--t1);font-weight:600">${oneDBdisc} kg</span></div>
      <div style="height:1px;background:var(--b2);margin:8px 0"></div>
      <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-family:var(--mono);font-size:10px;color:var(--t3);text-transform:uppercase">Total par haltère</span><span style="font-family:var(--mono);font-size:18px;font-weight:700;color:var(--green)">${realPerDB} kg</span></div>
      <div style="font-family:var(--mono);font-size:10px;color:var(--t3);margin-top:6px;line-height:1.5">2 haltères = ${Math.round(realPerDB*2*10)/10}kg au total</div>
    </div>`;
}

function plateResultHTML(o){
  const discChips = o.discs.length
    ? o.discs.map(d=>`<span class="plate-disc">${d}<span style="font-size:9px;opacity:.6">kg</span></span>`).join('')
    : `<span style="font-family:var(--mono);font-size:11px;color:var(--t3)">aucun disque</span>`;
  let warn = '';
  if(o.imbalNote){
    warn = `<div style="margin-top:8px;font-family:var(--mono);font-size:10px;color:var(--blue)">⚖ ${o.imbalNote}</div>`;
  } else if(o.leftover>0.01){
    warn = o.allowImbal
      ? `<div style="margin-top:8px;font-family:var(--mono);font-size:10px;color:var(--yellow)">⚠ ${o.leftover}kg non atteignables, même en déséquilibrant (stock insuffisant). Au plus proche.</div>`
      : `<div style="margin-top:8px;font-family:var(--mono);font-size:10px;color:var(--yellow)">⚠ ${o.leftover}kg non atteignables pile. Coche « déséquilibre » si l'exo le permet, ou ajuste.</div>`;
  }
  const linesHTML = o.lines.map(l=>`<div style="display:flex;justify-content:space-between;font-family:var(--mono);font-size:11px;color:var(--t2);padding:2px 0"><span>${l[0]}</span><span style="color:var(--t1);font-weight:600">${l[1]}</span></div>`).join('');
  return `
    <div style="font-family:var(--mono);font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">${o.title}</div>
    <div style="text-align:center;margin-bottom:12px">${discChips}</div>
    ${warn}
    <div style="margin-top:12px;padding:12px;background:var(--s3);border:1px solid var(--b2);border-radius:10px">
      ${linesHTML}
      <div style="height:1px;background:var(--b2);margin:8px 0"></div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-family:var(--mono);font-size:10px;color:var(--t3);text-transform:uppercase">${o.realLbl}</span>
        <span style="font-family:var(--mono);font-size:18px;font-weight:700;color:var(--green)">${o.real} kg</span>
      </div>
      ${o.extra?`<div style="font-family:var(--mono);font-size:10px;color:var(--t3);margin-top:6px;line-height:1.5">${o.extra}</div>`:''}
    </div>`;
}
let _platekindAuto='db';

/* ── WEEK COMPARISON ── */
function renderWeekCmp(){
  // Comparatif "Cette semaine / Semaine dernière" retiré (dashboard épuré).
  const el=document.getElementById('week-cmp');
  if(el) el.innerHTML='';
  return;
}
function _renderWeekCmp_disabled(){
  const el=document.getElementById('week-cmp');
  if(!el) return;

  const today=new Date();
  const thisMon=getMondayOf(today);
  const lastMon=new Date(thisMon); lastMon.setDate(lastMon.getDate()-7);
  const lastSun=new Date(thisMon); lastSun.setDate(lastSun.getDate()-1);

  // Get dates for this week and last week
  function weekDates(mon){
    const dates=[];
    for(let d=new Date(mon);dates.length<7;d.setDate(d.getDate()+1))
      dates.push(weekStorageKey(new Date(d)));
    return dates;
  }
  const thisDates=new Set(weekDates(thisMon));
  const lastDates=new Set(weekDates(lastMon));

  // Aggregate logs by week
  function weekStats(dateSet){
    let sessions=0, vol=0, prs=0;
    const seenDates=new Set();
    Object.entries(S.logs).forEach(([k,logs])=>{
      if(!logs||!logs.length) return;
      const parts=k.split('_');
      const dateStr=parts.slice(2).join('_');
      if(!dateSet.has(dateStr)) return;
      vol+=logs.reduce((a,l)=>a+((l.w||0)*(l.r||0)||(l.r||0)),0);
      if(!seenDates.has(dateStr)){seenDates.add(dateStr);sessions++;}
    });
    return{sessions,vol,prs};
  }

  const tw=weekStats(thisDates);
  const lw=weekStats(lastDates);

  function delta(a,b,unit){
    if(!b) return '';
    const d=a-b;
    const pct=Math.round((d/b)*100);
    if(d>0) return`<span class="lsd-up">↑ +${pct}%</span>`;
    if(d<0) return`<span class="lsd-dn">↓ ${pct}%</span>`;
    return`<span class="lsd-eq">= </span>`;
  }

  const volFmt=v=>v>=1000?(v/1000).toFixed(1)+'t':v+'kg';
  const overall=tw.vol>lw.vol?'up':tw.vol<lw.vol?'dn':'eq';
  const overallTxt=tw.vol>lw.vol?`↑ +${Math.round(((tw.vol-lw.vol)/Math.max(lw.vol,1))*100)}%`:tw.vol<lw.vol?`↓ ${Math.round(((tw.vol-lw.vol)/Math.max(lw.vol,1))*100)}%`:'= égal';

  el.innerHTML=`
    <div class="wc-col">
      <div class="wc-head">
        <div class="wc-title">Cette semaine</div>
        <span class="wc-badge ${overall}">${overallTxt}</span>
      </div>
      <div class="wc-row"><div class="wc-lbl">Séances</div><div class="wc-val">${tw.sessions}</div></div>
      <div class="wc-row"><div class="wc-lbl">Volume total</div><div class="wc-val">${volFmt(tw.vol)}</div></div>
    </div>
    <div class="wc-col">
      <div class="wc-head">
        <div class="wc-title">Semaine dernière</div>
        <span class="wc-badge eq" style="opacity:.6">référence</span>
      </div>
      <div class="wc-row"><div class="wc-lbl">Séances</div><div class="wc-val">${lw.sessions}</div></div>
      <div class="wc-row"><div class="wc-lbl">Volume total</div><div class="wc-val">${volFmt(lw.vol)}</div></div>
    </div>`;
}

/* ═══ VOLUME PAR JOUR (DASHBOARD CHART) ═══ */
let _volDayChartInst = null;
let _volDayMode = 'planned'; // 'planned' | 'logged'

function setVolDayMode(m){
  _volDayMode = m;
  ['vdc-planned','vdc-logged'].forEach(id=>{
    const b = document.getElementById(id);
    if(b) b.classList.toggle('on', id==='vdc-'+m);
  });
  drawVolumeDayChart();
}

function renderVolumeDayChart(){
  // Graphique "Volume par jour de la semaine" retiré (dashboard épuré).
  const w=document.getElementById('vol-day-chart-wrap');
  if(w) w.style.display='none';
  return;
}
function _renderVolumeDayChart_disabled(){
  const wrap = document.getElementById('vol-day-chart-wrap');
  if(!wrap) return;

  // Compute planned volume per day
  const hasAnyDay = S.week.some(d => d.name && d.type !== 'rest' && d.exercises.length > 0);
  wrap.style.display = hasAnyDay ? '' : 'none';
  if(!hasAnyDay) return;

  drawVolumeDayChart();
}

function drawVolumeDayChart(){
  const cv = document.getElementById('gc-vol-day');
  if(!cv) return;

  const isLight = document.documentElement.classList.contains('light');
  const gridColor = isLight ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.05)';
  const tickColor = isLight ? '#888' : '#666';
  const tooltipBg = isLight ? '#fff' : '#1b1b1b';
  const tooltipTxt = isLight ? '#111' : '#f5f5f5';

  const typeColors = {
    push: isLight ? '#2563eb' : '#60a5fa',
    pull: isLight ? '#ea580c' : '#fb923c',
    legs: isLight ? '#16a34a' : '#4ade80',
    full: isLight ? '#2563eb' : '#60a5fa',
    cardio: isLight ? '#16a34a' : '#4ade80',
    rest: isLight ? 'rgba(0,0,0,.1)' : 'rgba(255,255,255,.08)',
    custom: isLight ? '#555' : '#999',
  };

  const dayLabels = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

  let values = [];
  let colors = [];

  if(_volDayMode === 'planned'){
    // Planned volume = sum of sets × reps × weight for each exercise
    S.week.forEach((day, di) => {
      if(!day.name || day.type === 'rest' || !day.exercises.length){
        values.push(0);
        colors.push(typeColors.rest);
        return;
      }
      const vol = day.exercises.reduce((a, ex) => {
        return a + (ex.weight > 0 ? ex.sets * ex.reps * ex.weight : ex.sets * ex.reps);
      }, 0);
      values.push(vol);
      colors.push(typeColors[day.type] || typeColors.custom);
    });
  } else {
    // Logged volume: all logs ever, grouped by day index
    const today = new Date();
    // Map each log key's date to its weekday index (Mon=0) via S.week day assignment
    // Use the di from key directly
    const volByDi = [0,0,0,0,0,0,0];
    Object.entries(S.logs).forEach(([k, logs]) => {
      if(!logs || !logs.length) return;
      const parts = k.split('_');
      if(parts.length < 3) return;
      const di = parseInt(parts[0]);
      if(di < 0 || di > 6) return;
      logs.forEach(l => { volByDi[di] += ((l.w||0)*(l.r||0)) || (l.r||0); });
    });
    S.week.forEach((day, di) => {
      values.push(volByDi[di]);
      colors.push(
        !day.name || day.type === 'rest' ? typeColors.rest : (typeColors[day.type] || typeColors.custom)
      );
    });
  }

  const maxVal = Math.max(...values, 1);

  // Border colors: slightly more opaque
  const borderColors = colors.map(c => c);

  if(_volDayChartInst){ _volDayChartInst.destroy(); _volDayChartInst = null; }

  _volDayChartInst = new Chart(cv.getContext('2d'), {
    type: 'bar',
    data: {
      labels: dayLabels,
      datasets: [{
        data: values,
        backgroundColor: colors.map(c => c + (c.startsWith('rgba') ? '' : 'cc')),
        borderColor: borderColors,
        borderWidth: 0,
        borderRadius: 4,
        borderSkipped: 'bottom',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 400, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: tooltipBg,
          titleColor: tickColor,
          bodyColor: tooltipTxt,
          borderColor: isLight ? 'rgba(0,0,0,.12)' : 'rgba(255,255,255,.1)',
          borderWidth: 1,
          padding: 9,
          callbacks: {
            title: ctx => {
              const di = ctx[0].dataIndex;
              const s = S.week[di];
              return s && s.name ? s.name : dayLabels[di];
            },
            label: ctx => {
              const v = ctx.raw;
              if(!v) return 'Repos';
              return v >= 1000 ? (v/1000).toFixed(1)+'t' : v+'kg';
            },
          },
        },
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: tickColor, font: { family: "'JetBrains Mono',monospace", size: 10 } },
        },
        y: {
          grid: { color: gridColor },
          border: { display: false },
          ticks: {
            color: tickColor,
            font: { family: "'JetBrains Mono',monospace", size: 9 },
            maxTicksLimit: 4,
            callback: v => v >= 1000 ? (v/1000).toFixed(1)+'t' : v+'kg',
          },
          beginAtZero: true,
        },
      },
    },
  });
}

/* ═══════════════════════════════════════════════════
   WELLNESS TAGS SYSTEM
   Storage key: S.wellness = { "di_YYYY-MM-DD": { fatigue, sommeil, motivation, douleur } }
   Each category is a value 1–3 (low/mid/high) or 0 = not set
   ═══════════════════════════════════════════════════ */

const WT_CATS = {
  fatigue:    { label:'Fatigue',    icon:'🔥', vals:['Légère','Modérée','Élevée'],   colors:['rgba(248,113,113,.15)','rgba(248,113,113,.35)','rgba(248,113,113,.6)'],  cls:'cat-fatigue' },
  sommeil:    { label:'Sommeil',    icon:'🌙', vals:['Mauvais','Correct','Excellent'], colors:['rgba(96,165,250,.15)','rgba(96,165,250,.35)','rgba(96,165,250,.6)'],    cls:'cat-sommeil' },
  motivation: { label:'Motivation', icon:'⚡', vals:['Basse','Normale','Haute'],      colors:['rgba(74,222,128,.15)','rgba(74,222,128,.35)','rgba(74,222,128,.6)'],    cls:'cat-motivation' },
  douleur:    { label:'Douleur',    icon:'⚠️', vals:['Aucune','Légère','Forte'],      colors:['rgba(251,191,36,.15)','rgba(251,191,36,.35)','rgba(251,191,36,.6)'],   cls:'cat-douleur' },
};

function wtKey(di, dateStr){ return di+'_'+dateStr; }

function getWellness(di, dateStr){
  if(!S.wellness) return {};
  return S.wellness[wtKey(di,dateStr)] || {};
}

function setWellnessTag(di, dateStr, cat, val){
  if(!S.wellness) S.wellness = {};
  const k = wtKey(di,dateStr);
  if(!S.wellness[k]) S.wellness[k] = {};
  // Toggle: clicking same value again removes it
  S.wellness[k][cat] = S.wellness[k][cat]===val ? 0 : val;
  saveState();
}

/* ── Build pills HTML for a category ── */
function buildWtPills(cat, currentVal, di, dateStr, context){
  const cfg = WT_CATS[cat];
  return cfg.vals.map((lbl, i) => {
    const v = i+1;
    const isOn = currentVal===v;
    const onclick = context==='inline'
      ? `wtInlineToggle('${cat}',${v})`
      : `wtModalToggle('${cat}',${v})`;
    return `<button class="wt-pill ${cfg.cls}${isOn?' on':''}" onclick="${onclick}" data-cat="${cat}" data-val="${v}">
      ${lbl}
    </button>`;
  }).join('');
}

/* ── Inline widget : résumé lisible du ressenti (pas de pills nues) ── */
function renderWtInline(){
  const el = document.getElementById('wt-inline-row');
  if(!el) return;
  const dateStr = todayKey();
  const w = getWellness(curDay, dateStr);
  const filled = Object.keys(WT_CATS).filter(cat => (w[cat]||0) > 0);
  if(filled.length === 0){
    el.innerHTML = `<span style="font-family:var(--mono);font-size:10px;color:var(--t3)">À remplir au moment de terminer la séance ↓</span>`;
    return;
  }
  // Résumé : "🔥 Fatigue : Modérée · ⚡ Motivation : Haute …"
  el.innerHTML = filled.map(cat => {
    const cfg = WT_CATS[cat];
    const lbl = cfg.vals[(w[cat]||1)-1];
    return `<span style="font-family:var(--mono);font-size:10px;color:var(--t2);background:var(--s3);border:1px solid var(--b2);border-radius:var(--r);padding:3px 8px;margin:2px 3px 2px 0;display:inline-block">${cfg.icon} ${cfg.label} : <b style="color:var(--t1)">${lbl}</b></span>`;
  }).join('');
}

function wtInlineToggle(cat, val){
  const dateStr = todayKey();
  setWellnessTag(curDay, dateStr, cat, val);
  renderWtInline(); // refresh just the pills
}

/* ── Modal (popup fin de séance) ── */
let _wtPendingCallback = null; // called after saving or skipping

function openWtModal(onComplete){
  _wtPendingCallback = onComplete || null;
  const dateStr = todayKey();
  const w = getWellness(curDay, dateStr);
  const el = document.getElementById('wt-modal-body');
  if(!el) { if(onComplete) onComplete(); return; }

  let html = '';
  Object.keys(WT_CATS).forEach(cat => {
    const cfg = WT_CATS[cat];
    html += `<div class="wt-cat-block">
      <div class="wt-cat-title">${cfg.icon} ${cfg.label}</div>
      <div class="wt-row" id="wt-modal-row-${cat}">
        ${buildWtPills(cat, w[cat]||0, curDay, dateStr, 'modal')}
      </div>
    </div>`;
  });
  el.innerHTML = html;
  document.getElementById('wt-modal-overlay').classList.add('on');
  document.body.style.overflow = 'hidden';
}

function wtModalToggle(cat, val){
  const dateStr = todayKey();
  setWellnessTag(curDay, dateStr, cat, val);
  // Refresh only the affected row
  const row = document.getElementById('wt-modal-row-'+cat);
  const w = getWellness(curDay, dateStr);
  if(row) row.innerHTML = buildWtPills(cat, w[cat]||0, curDay, dateStr, 'modal');
  // Also refresh inline if visible
  renderWtInline();
}

function saveWtModalAndContinue(){
  closeWtModal();
}

function closeWtModal(){
  document.getElementById('wt-modal-overlay').classList.remove('on');
  document.body.style.overflow = '';
  if(_wtPendingCallback){ _wtPendingCallback(); _wtPendingCallback=null; }
}

function wtModalClickOut(e){
  if(e.target===document.getElementById('wt-modal-overlay')) closeWtModal();
}

/* ── Tag chips HTML helper (for journal / summary display) ── */
function buildWtChips(di, dateStr){
  const w = getWellness(di, dateStr);
  const chips = [];
  Object.keys(WT_CATS).forEach(cat => {
    const v = w[cat];
    if(!v) return;
    const cfg = WT_CATS[cat];
    chips.push(`<span class="wt-tag-chip ${cfg.cls}">${cfg.icon} ${cfg.vals[v-1]}</span>`);
  });
  return chips.length ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:6px">${chips.join('')}</div>` : '';
}

/* ── Wellness × Progression chart ── */
let _wtChartInst = null;
let _wtChartMetric = 'volume'; // 'volume' | 'orm'
let _wtChartCat = 'fatigue';

function renderWellnessChart(){
  const el = document.getElementById('wt-chart-section');
  if(!el) return;

  // Gather all sessions that have both logs AND wellness data
  if(!S.wellness || !Object.keys(S.wellness).length){
    el.innerHTML = `<div class="wt-chart-empty">
      <div style="font-size:24px;margin-bottom:8px">🧠</div>
      <div style="font-size:12px;font-weight:500;color:var(--t2);margin-bottom:4px">Aucune donnée de bien-être</div>
      <div style="font-size:11px">Tague tes séances depuis la colonne <b>Réalisé</b> pour voir l'analyse ici.</div>
    </div>`;
    return;
  }

  // Build dataset: for each wellness key (di_date), compute session metrics
  const points = []; // {date, di, fatigue, sommeil, motivation, douleur, volume, maxW, orm}
  Object.entries(S.wellness).forEach(([wk, tags]) => {
    const parts = wk.split('_');
    if(parts.length < 2) return;
    const di = parseInt(parts[0]);
    const dateStr = parts.slice(1).join('_');
    if(isNaN(di) || di<0 || di>6) return;
    const day = S.week[di];
    if(!day || day.type==='rest') return;

    // Compute volume & force for this session/date
    let vol=0, maxW=0, maxR=0;
    day.exercises.forEach((ex,ei) => {
      const k = `${di}_${ei}_${dateStr}`;
      const logs = S.logs[k] || [];
      logs.forEach(l => {
        vol += (l.w||0)*(l.r||0) || (l.r||0);
        if((l.w||0) > maxW){ maxW=l.w||0; maxR=l.r||0; }
      });
    });
    if(!vol) return; // skip sessions with no logs

    const orm = maxW>0&&maxR>0 ? Math.round(maxW*(1+maxR/30)) : 0;
    points.push({ date:dateStr, di, vol, maxW, orm, ...tags });
  });

  if(!points.length){
    el.innerHTML = `<div class="wt-chart-empty">
      <div style="font-size:24px;margin-bottom:8px">📊</div>
      <div style="font-size:12px;font-weight:500;color:var(--t2);margin-bottom:4px">Pas encore de croisement possible</div>
      <div style="font-size:11px">Il faut au moins une séance avec des logs <b>et</b> des tags bien-être.</div>
    </div>`;
    return;
  }

  points.sort((a,b)=>a.date.localeCompare(b.date));

  // Insight stats: average metric per tag level
  const cat = _wtChartCat;
  const metric = _wtChartMetric;
  const metricKey = metric==='orm' ? 'orm' : 'vol';
  const metricLabel = 'Volume (kg)';
  const cfg = WT_CATS[cat];

  // Group points by tag value (1,2,3)
  const byLevel = {1:[],2:[],3:[]};
  points.forEach(p => {
    const v = p[cat]||0;
    if(v>=1&&v<=3) byLevel[v].push(p[metricKey]||0);
  });
  const avgByLevel = v => byLevel[v].length ? Math.round(byLevel[v].reduce((a,x)=>a+x,0)/byLevel[v].length) : null;
  const avg1=avgByLevel(1), avg2=avgByLevel(2), avg3=avgByLevel(3);
  const volFmt = v => v==null ? '—' : v>=1000?(v/1000).toFixed(1)+'t':v+'kg';

  // Scatter-style: x = date index, y = metric, color = tag level, size = level
  const tagColors = {
    1: cfg.colors[0].replace('.15',',.9').replace('.15',',.9'),
    2: cfg.colors[1].replace('.35',',.9'),
    3: cfg.colors[2].replace('.6',',.9'),
  };

  const isLight = document.documentElement.classList.contains('light');
  const tooltipBg  = isLight?'#fff':'#1b1b1b';
  const tooltipTxt = isLight?'#111':'#f5f5f5';
  const tickColor  = isLight?'#888':'#666';
  const gridColor  = isLight?'rgba(0,0,0,.06)':'rgba(255,255,255,.05)';

  // Build bar chart: dates on X, metric on Y, bars colored by tag level
  const labels = points.map(p => { const pt=p.date.split('-'); return pt[2]+'/'+pt[1]; });
  const values = points.map(p => p[metricKey]||0);
  const barColors = points.map(p => {
    const v = p[cat]||0;
    if(!v) return isLight?'rgba(0,0,0,.1)':'rgba(255,255,255,.1)';
    return cfg.colors[v-1];
  });
  const borderColors = points.map(p => {
    const v = p[cat]||0;
    if(!v) return isLight?'rgba(0,0,0,.15)':'rgba(255,255,255,.15)';
    // Make border slightly more opaque
    return cfg.colors[v-1].replace('.15','.45').replace('.35','.6').replace('.6','.85');
  });

  // Insight HTML
  const insightHTML = `<div class="wt-insight-grid">
    ${[1,2,3].map(v => {
      const avg = avgByLevel(v);
      return `<div class="wt-insight-card">
        <div class="wt-insight-lbl">${cfg.icon} ${cfg.label} — ${cfg.vals[v-1]}</div>
        <div class="wt-insight-val" style="color:${avg!=null?'var(--t1)':'var(--t3)'}">${volFmt(avg)}</div>
        <div class="wt-insight-sub">${byLevel[v].length} session${byLevel[v].length!==1?'s':''} · moy. ${metricLabel}</div>
      </div>`;
    }).join('')}
    <div class="wt-insight-card" style="grid-column:${[1,2,3].filter(v=>avgByLevel(v)!=null).length<3?'span 1':'auto'}">
      <div class="wt-insight-lbl">📊 Total analysé</div>
      <div class="wt-insight-val">${points.filter(p=>(p[cat]||0)>0).length}</div>
      <div class="wt-insight-sub">sessions taguées / ${points.length} avec logs</div>
    </div>
  </div>`;

  // Controls HTML
  const metricTabHtml = `<div class="mtabs">
    <button class="mt${metric==='volume'?' on':''}" id="wtm-vol" onclick="setWtMetric('volume')">Volume</button>
  </div>`;
  const catTabHtml = `<div style="display:flex;gap:4px;flex-wrap:wrap">
    ${Object.keys(WT_CATS).map(c => `<button class="mt${c===cat?' on':''}" onclick="setWtCat('${c}')" style="font-family:var(--mono);font-size:9px;padding:3px 9px;border-radius:3px;border:none;background:${c===cat?'var(--s4)':'transparent'};color:${c===cat?'var(--t1)':'var(--t3)'};cursor:pointer;letter-spacing:.04em">${WT_CATS[c].icon} ${WT_CATS[c].label}</button>`).join('')}
  </div>`;

  el.innerHTML = `<div class="wt-chart-card">
    <div class="graph-head" style="flex-direction:column;align-items:flex-start;gap:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;width:100%;gap:8px;flex-wrap:wrap">
        <div class="graph-ttl">Bien-être × Progression</div>
        ${metricTabHtml}
      </div>
      ${catTabHtml}
    </div>
    <div style="position:relative;height:200px;margin-top:4px"><canvas id="gc-wellness"></canvas></div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px">
      ${[1,2,3].map(v=>`<div class="gl"><div style="width:10px;height:10px;border-radius:2px;background:${cfg.colors[v-1]}"></div><span style="font-family:var(--mono);font-size:9px;color:var(--t3)">${cfg.label} ${cfg.vals[v-1]}</span></div>`).join('')}
    </div>
    <div style="margin-top:14px">
      <div style="font-family:var(--mono);font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.07em;margin-bottom:10px">Moyennes par niveau</div>
      ${insightHTML}
    </div>
  </div>`;

  if(_wtChartInst){ _wtChartInst.destroy(); _wtChartInst=null; }
  const cv = document.getElementById('gc-wellness');
  if(!cv) return;

  _wtChartInst = new Chart(cv.getContext('2d'), {
    type:'bar',
    data:{
      labels,
      datasets:[{
        data: values,
        backgroundColor: barColors,
        borderColor: borderColors,
        borderWidth:1,
        borderRadius:4,
        borderSkipped:'bottom',
      }],
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      animation:{duration:350,easing:'easeOutQuart'},
      plugins:{
        legend:{display:false},
        tooltip:{
          backgroundColor:tooltipBg,
          titleColor:tickColor,
          bodyColor:tooltipTxt,
          borderColor:isLight?'rgba(0,0,0,.12)':'rgba(255,255,255,.1)',
          borderWidth:1,
          padding:9,
          callbacks:{
            title: ctx => {
              const p = points[ctx[0].dataIndex];
              if(!p) return '';
              const day = S.week[p.di];
              return (day?day.name:'—')+' · '+labels[ctx[0].dataIndex];
            },
            label: ctx => {
              const p = points[ctx[0].dataIndex];
              const v = p[metricKey]||0;
              const tagV = p[cat]||0;
              const lines = [metricLabel+': '+(v>=1000?(v/1000).toFixed(1)+'t':v?v+'kg':'—')];
              if(tagV) lines.push(cfg.label+': '+cfg.vals[tagV-1]);
              return lines;
            },
          },
        },
      },
      scales:{
        x:{
          grid:{display:false},
          border:{display:false},
          ticks:{color:tickColor,font:{family:"'JetBrains Mono',monospace",size:9},maxTicksLimit:12},
        },
        y:{
          grid:{color:gridColor},
          border:{display:false},
          ticks:{color:tickColor,font:{family:"'JetBrains Mono',monospace",size:9},maxTicksLimit:5,
            callback:v=>v>=1000?(v/1000).toFixed(1)+'t':v?v+'kg':'0'},
          beginAtZero:true,
        },
      },
    },
  });
}

function setWtMetric(m){
  _wtChartMetric=m;
  renderWellnessChart();
}

function setWtCat(c){
  _wtChartCat=c;
  renderWellnessChart();
}

/* ── NOTE ── */
function saveNote(di,dateKey,val){
  if(!S.notes) S.notes={};
  S.notes[di+'_'+dateKey]=val;
  saveState();
}

/* ── DIFF ── */
function computeDiff(ex,logs){
  if(!logs.length) return[];
  const res=[];
  const maxW=logs.reduce((a,l)=>Math.max(a,l.w||0),0);
  const maxR=logs.reduce((a,l)=>Math.max(a,l.r||0),0);
  const totVol=logs.reduce((a,l)=>a+((l.w||0)*(l.r||0)||(l.r||0)),0);
  const pW=ex.weight||0, pR=ex.reps||0, pV=pW*pR*ex.sets||pR*ex.sets;
  if(pW&&maxW){const d=maxW-pW;res.push({icon:d>0?'↑':d<0?'↓':'=',label:`Poids ${d>0?'+':''}${d}kg`,dir:d});}
  if(pR&&maxR){const d=maxR-pR;res.push({icon:d>0?'↑':d<0?'↓':'=',label:`Rép ${d>0?'+':''}${d}`,dir:d});}
  if(pV&&totVol){const d=Math.round(totVol-pV);res.push({icon:d>0?'↑':d<0?'↓':'=',label:`Vol ${d>0?'+':''}${d}kg`,dir:d});}
  return res;
}

/* ── DONE ── */
function toggleDone(){
  const k=curDay+'_'+todayKey();
  if(!S.done) S.done={};
  const wasAlreadyDone = !!S.done[k];
  S.done[k]=!S.done[k];
  // Auto-pause stopwatch when marking done
  if(S.done[k] && _swRunning) pauseStopwatch();
  if(S.done[k]) releaseWakeLock(); // séance finie → on relâche l'écran
  // Enregistre la durée réelle du chrono pour ce TYPE de séance (moyenne adaptative)
  if(S.done[k] && !wasAlreadyDone){
    const s = S.week[curDay];
    const totalMs = _swElapsed + (_swRunning ? Date.now()-_swStartTs : 0);
    const mins = Math.round(totalMs/60000);
    if(s && s.type && mins >= 5){ // ignore les durées absurdes (<5 min)
      if(!S.sessionDurations) S.sessionDurations = {};
      if(!S.sessionDurations[s.type]) S.sessionDurations[s.type] = [];
      S.sessionDurations[s.type].push(mins);
      // Garde les 10 dernières séances de ce type
      if(S.sessionDurations[s.type].length > 10) S.sessionDurations[s.type] = S.sessionDurations[s.type].slice(-10);
    }
  }
  saveState(); renderStrip(); renderSession();
  // Show wellness modal first, then session summary
  if(S.done[k] && !wasAlreadyDone){
    checkAutoBackup();
    openWtModal(() => showSessionSummary());
  }
}

/* ── Durée estimée adaptative : moyenne réelle par type, ou override manuel ── */
function getEstDuration(s){
  // 1) Override manuel pour ce type ?
  if(S.sessionDurManual && s.type && S.sessionDurManual[s.type]){
    return { mins: S.sessionDurManual[s.type], source:'manuel' };
  }
  // 2) Moyenne des durées réelles enregistrées pour ce type ?
  if(S.sessionDurations && s.type && S.sessionDurations[s.type] && S.sessionDurations[s.type].length){
    const arr = S.sessionDurations[s.type];
    const avg = Math.round(arr.reduce((a,b)=>a+b,0)/arr.length);
    return { mins: avg, source:'moyenne', n: arr.length };
  }
  // 3) Estimation théorique (fallback)
  const n = s.exercises.length;
  let total = n > 0 ? 5*60 : 0;
  s.exercises.forEach((ex,i)=>{
    total += ex.sets*50 + (ex.sets-1)*(ex.rest||90);
    if(i<n-1) total += 60;
  });
  return { mins: Math.round(total/60), source:'estimé' };
}

function setManualDuration(type){
  const cur = (S.sessionDurManual && S.sessionDurManual[type]) || '';
  const val = prompt('Durée estimée manuelle pour ce type de séance (en minutes, vide = auto) :', cur);
  if(val===null) return;
  if(!S.sessionDurManual) S.sessionDurManual = {};
  const n = parseInt(val);
  if(val.trim()==='' || isNaN(n) || n<=0){ delete S.sessionDurManual[type]; }
  else { S.sessionDurManual[type] = n; }
  saveState(); renderSession();
}

/* ── SESSION SUMMARY ── */
function showSessionSummary(){
  const s = S.week[curDay];
  if(!s || !s.exercises.length) return;
  const today = todayKey();
  const typeColors = {push:'var(--push)',pull:'var(--pull)',legs:'var(--legs)',full:'var(--blue)',cardio:'var(--green)',custom:'var(--t3)'};
  const tc = typeColors[s.type]||'var(--t3)';

  // ── Compute today's stats ──
  let todayVol = 0, todaySets = 0, todayExoLogged = 0;
  const exoData = s.exercises.map((ex, ei) => {
    const logs = getLogs(curDay, ei);
    const vol = logs.reduce((a,l)=>a+((l.w||0)*(l.r||0)||(l.r||0)),0);
    const maxW = logs.reduce((a,l)=>Math.max(a,l.w||0),0);
    const maxR = logs.reduce((a,l)=>Math.max(a,l.r||0),0);
    todayVol += vol;
    todaySets += logs.length;
    if(logs.length) todayExoLogged++;

    // best single set this session (for PR detection)
    const bestToday = logs.length ? logs.reduce((a,b)=>((b.w||0)*(b.r||0)>(a.w||0)*(a.r||0)?b:a)) : null;

    // previous sessions (exclude today)
    const allEntries = getAllLogs(curDay, ei);
    const prevEntries = allEntries.filter(([k])=>!k.endsWith('_'+today));
    const prevSets = prevEntries.flatMap(([,v])=>v);
    const prevMaxVol = prevSets.reduce((a,l)=>Math.max(a,(l.w||0)*(l.r||0)||(l.r||0)),0);
    const prevMaxW = prevSets.reduce((a,l)=>Math.max(a,l.w||0),0);

    // last session specifically
    const lastEntry = prevEntries.slice(-1)[0];
    const lastLogs = lastEntry ? lastEntry[1] : [];
    const lastVol = lastLogs.reduce((a,l)=>Math.max(a,(l.w||0)*(l.r||0)||(l.r||0)),0);
    const lastMaxW = lastLogs.reduce((a,l)=>Math.max(a,l.w||0),0);
    const lastMaxR = lastLogs.reduce((a,l)=>Math.max(a,l.r||0),0);
    const lastDate = lastEntry ? lastEntry[0].split('_').slice(2).join('_') : null;

    // Is it a PR? (beats ALL previous)
    const todayBestVol = logs.reduce((a,l)=>Math.max(a,(l.w||0)*(l.r||0)||(l.r||0)),0);
    const isPR = logs.length>0 && todayBestVol>0 && todayBestVol > prevMaxVol;
    const isPRWeight = maxW > 0 && maxW > prevMaxW;

    // Volume delta vs last session
    const lastTotVol = lastLogs.reduce((a,l)=>a+((l.w||0)*(l.r||0)||(l.r||0)),0);
    const todayTotVol = logs.reduce((a,l)=>a+((l.w||0)*(l.r||0)||(l.r||0)),0);
    const volDelta = lastLogs.length>0 ? todayTotVol - lastTotVol : null;

    return { ex, ei, logs, vol: todayTotVol, maxW, maxR, isPR, isPRWeight,
      lastMaxW, lastMaxR, lastDate, volDelta, lastTotVol, isNew: prevEntries.length===0 };
  });

  // ── Previous session total vol ──
  // find the most recent day where this session was logged (before today)
  let prevSessionVol = 0;
  const allDayLogs = Object.entries(S.logs).filter(([k,v])=>{
    const parts = k.split('_');
    if(parts.length < 3) return false;
    const di = parseInt(parts[0]);
    const dateStr = parts.slice(2).join('_');
    return di===curDay && dateStr!==today && v && v.length;
  });
  // group by date
  const prevDates = {};
  allDayLogs.forEach(([k,v])=>{
    const dateStr = k.split('_').slice(2).join('_');
    if(!prevDates[dateStr]) prevDates[dateStr]=0;
    prevDates[dateStr]+=v.reduce((a,l)=>a+((l.w||0)*(l.r||0)||(l.r||0)),0);
  });
  const prevDatesSorted = Object.entries(prevDates).sort(([a],[b])=>b.localeCompare(a));
  if(prevDatesSorted.length) prevSessionVol = prevDatesSorted[0][1];
  const lastSessionDateStr = prevDatesSorted.length ? prevDatesSorted[0][0] : null;
  const lastSessionFmt = lastSessionDateStr ? (()=>{const p=lastSessionDateStr.split('-');return p[2]+'/'+p[1]+'/'+p[0];})() : null;

  const prs = exoData.filter(d=>d.isPR||d.isPRWeight);
  const volDeltaTotal = prevSessionVol>0 ? todayVol - prevSessionVol : null;

  // ── Duration ──
  const elapsed = _swElapsed;
  const elMin = Math.floor(elapsed/60000);
  const elSec = Math.floor((elapsed%60000)/1000);
  const durationStr = elapsed>0 ? (elMin>=60?`${Math.floor(elMin/60)}h${String(elMin%60).padStart(2,'0')}`:`${elMin}m${String(elSec).padStart(2,'0')}s`) : null;

  // ── Confetti emoji & title ──
  const emojis = {push:'💪',pull:'🏋️',legs:'🦵',full:'⚡',cardio:'🏃',custom:'🎯'};
  const emoji = emojis[s.type]||'💪';
  const titles = ['Séance bouclée !','Excellent travail !','Mission accomplie !','Bien joué !'];
  const title = prs.length>=3 ? '🔥 Session de feu !' : prs.length>=1 ? '⭐ PRs battus !' : titles[Math.floor(Math.random()*titles.length)];

  const volFmt = v => v>=1000?(v/1000).toFixed(1)+'t':v?v+'kg':'—';

  // ── Render hero ──
  document.getElementById('sum-hero').innerHTML = `
    <span class="sum-confetti">${emoji}</span>
    <div class="sum-title">${title}</div>
    <div class="sum-subtitle">${s.name} &middot; ${new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}</div>
    ${durationStr?`<div class="sum-duration">⏱ ${durationStr}</div>`:''}`;

  // ── Stats bar ──
  const volDeltaHtml = volDeltaTotal!==null
    ? `<span style="font-size:10px;margin-left:4px;color:${volDeltaTotal>=0?'var(--green)':'var(--red)'}">${volDeltaTotal>=0?'+':''}${volFmt(Math.abs(volDeltaTotal))}</span>` : '';
  document.getElementById('sum-stats').innerHTML = `
    <div class="sum-stat">
      <div class="sum-stat-val">${volFmt(todayVol)}${volDeltaHtml}</div>
      <div class="sum-stat-lbl">Volume total</div>
    </div>
    <div class="sum-stat">
      <div class="sum-stat-val">${todaySets}</div>
      <div class="sum-stat-lbl">Séries</div>
    </div>
    <div class="sum-stat">
      <div class="sum-stat-val" style="color:${prs.length>0?'var(--green)':'var(--t1)'}">${prs.length}</div>
      <div class="sum-stat-lbl">PRs battus</div>
    </div>`;

  // ── Body ──
  let bodyHtml = '';

  // PRs section
  if(prs.length){
    const prItems = prs.map(d=>{
      const detail = d.isPR && d.maxW
        ? `${d.maxW}kg × ${d.maxR}`
        : d.maxR ? `${d.maxR} rép.` : '—';
      return `<div class="sum-pr-item">
        <span class="sum-pr-icon">🏆</span>
        <span class="sum-pr-name">${d.ex.name}</span>
        <span class="sum-pr-detail">${detail}</span>
      </div>`;
    }).join('');
    bodyHtml += `<div class="sum-section">
      <div class="sum-section-title">Nouveaux records</div>
      <div class="sum-pr-list">${prItems}</div>
    </div>`;
  }

  // Volume comparison vs last session
  if(prevSessionVol>0){
    const maxVol = Math.max(todayVol, prevSessionVol);
    const todayPct = maxVol>0 ? Math.round(todayVol/maxVol*100) : 0;
    const prevPct  = maxVol>0 ? Math.round(prevSessionVol/maxVol*100) : 0;
    bodyHtml += `<div class="sum-section">
      <div class="sum-section-title">Volume vs session précédente${lastSessionFmt?' ('+lastSessionFmt+')':''}</div>
      <div class="sum-vol-bar">
        <div class="sum-vol-labels"><span>Aujourd'hui</span><span style="color:${todayVol>=prevSessionVol?'var(--green)':'var(--red)'}">${volFmt(todayVol)}</span></div>
        <div class="sum-vol-bar-track"><div class="sum-vol-bar-fill" style="width:${todayPct}%;background:${todayVol>=prevSessionVol?'var(--green)':'var(--red)'}"></div></div>
        <div class="sum-vol-labels"><span style="color:var(--t3)">Dernière fois</span><span style="color:var(--t3)">${volFmt(prevSessionVol)}</span></div>
        <div class="sum-vol-bar-track"><div class="sum-vol-bar-fill" style="width:${prevPct}%;background:var(--t3)"></div></div>
      </div>
    </div>`;
  }

  // Exercise comparison table
  const loggedExos = exoData.filter(d=>d.logs.length>0);
  if(loggedExos.length){
    const rows = loggedExos.map(d=>{
      const todayStr = d.maxW ? `${d.maxW}kg×${d.maxR}` : d.maxR ? `${d.maxR} rép.` : '—';
      let lastStr = '—', deltaHtml = '';
      if(d.isNew){
        lastStr = '—'; deltaHtml = `<span class="sum-delta-new">NOUVEAU</span>`;
      } else if(d.lastMaxW||d.lastMaxR){
        lastStr = d.lastMaxW ? `${d.lastMaxW}kg×${d.lastMaxR}` : `${d.lastMaxR} rép.`;
        if(d.volDelta!==null){
          if(d.volDelta>0)      deltaHtml=`<span class="sum-delta-up">↑ +${d.volDelta}kg</span>`;
          else if(d.volDelta<0) deltaHtml=`<span class="sum-delta-dn">↓ ${d.volDelta}kg</span>`;
          else                  deltaHtml=`<span class="sum-delta-eq">= stable</span>`;
        }
      }
      return `<tr>
        <td style="max-width:120px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--t1)">${d.ex.name.split('(')[0].trim()}</td>
        <td class="mono">${todayStr}${d.isPR?` <span style="font-family:var(--mono);font-size:8px;color:var(--green);border:1px solid rgba(74,222,128,.3);border-radius:2px;padding:1px 4px">PR</span>`:''}</td>
        <td class="mono" style="color:var(--t3)">${lastStr}</td>
        <td>${deltaHtml}</td>
      </tr>`;
    }).join('');
    bodyHtml += `<div class="sum-section">
      <div class="sum-section-title">Comparaison exercice par exercice</div>
      <table class="sum-cmp-table">
        <thead><tr><th>Exercice</th><th>Aujourd'hui</th><th>Dernière fois</th><th>Δ</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  if(!bodyHtml){
    bodyHtml = `<div class="sum-nopr" style="padding:24px">Aucun log enregistré pour cette séance.<br><span style="font-size:10px;margin-top:4px;display:block">Logue tes séries depuis la colonne Réalisé pour voir le résumé.</span></div>`;
  }

  // Append wellness tags if any were set
  const wtChips = buildWtChips(curDay, today);
  if(wtChips){
    bodyHtml += `<div class="sum-section">
      <div class="sum-section-title">Ressenti de la séance</div>
      ${wtChips}
    </div>`;
  }

  document.getElementById('sum-body').innerHTML = bodyHtml;
  document.getElementById('sum-overlay').classList.add('on');
  document.body.style.overflow = 'hidden';
}

function closeSummaryModal(){
  document.getElementById('sum-overlay').classList.remove('on');
  document.body.style.overflow = '';
}
function closeSummary(e){
  if(e.target===document.getElementById('sum-overlay')) closeSummaryModal();
}



/* ═══ LOGS — stored by exact date ═══ */
function todayKey(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function todayFmt(){ return new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'short'}); }

// Key: di_ei_YYYY-MM-DD  (one entry per day, not per week)
function dateLogKey(di,ei,dateStr){ return`${di}_${ei}_${dateStr}`; }

function getLogs(di,ei){
  const k=dateLogKey(di,ei,todayKey());
  if(S.logs[k] && S.logs[k].length) return S.logs[k];
  // Aujourd'hui vide → on affiche la séance la plus récente enregistrée pour ce jour
  // (sinon, en revenant un autre jour, l'onglet paraissait vide alors que les données existent).
  const prefix=`${di}_${ei}_`;
  const past=Object.entries(S.logs)
    .filter(([kk,v])=>kk.startsWith(prefix) && Array.isArray(v) && v.length>0)
    .sort(([a],[b])=>b.localeCompare(a)); // plus récent d'abord
  return past.length ? past[0][1] : (S.logs[k]||[]);
}

// Logs strictement d'aujourd'hui (pour distinguer saisie du jour vs historique)
function getTodayLogs(di,ei){
  const k=dateLogKey(di,ei,todayKey());
  return S.logs[k]||[];
}

// Get ALL historical logs for an exercise across all dates, sorted
function getAllLogs(di,ei){
  const prefix=`${di}_${ei}_`;
  const entries=Object.entries(S.logs)
    .filter(([k])=>k.startsWith(prefix)&&S.logs[k].length>0)
    .sort(([a],[b])=>a.localeCompare(b));
  return entries; // [[key, logsArr], ...]
}

function getBest(di,ei){
  const all=getAllLogs(di,ei).flatMap(([,v])=>v);
  if(!all.length) return null;
  return all.reduce((a,b)=>((b.w||0)*(b.r||0)>(a.w||0)*(a.r||0)?b:a));
}

