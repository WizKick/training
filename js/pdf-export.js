/* ═══════════════════════════════════════════
   PDF EXPORT — Programme semaine
   ═══════════════════════════════════════════ */
function exportProgramPDF() {
  const TYPE_COLOR  = { push:'#3b82f6', pull:'#f97316', legs:'#22c55e', full:'#60a5fa', cardio:'#4ade80', rest:'#9ca3af', custom:'#a78bfa' };
  const TYPE_LABEL  = { push:'PUSH', pull:'PULL', legs:'LEGS', full:'FULL BODY', cardio:'CARDIO', rest:'REPOS', custom:'CUSTOM' };
  const DAY_NAMES   = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];

  /* ── helpers ── */
  function fmtRest(s) {
    if(!s) return '—';
    if(s < 60) return s + 's';
    const m = Math.floor(s / 60), rem = s % 60;
    return m + 'min' + (rem ? '30' : '');
  }
  function fmtVol(v) {
    if(!v) return '—';
    return v >= 1000 ? (v/1000).toFixed(1) + 't' : v + ' kg';
  }
  function fmtDate(d) { return d.getDate() + '/' + String(d.getMonth()+1).padStart(2,'0') + '/' + d.getFullYear(); }

  /* ── week range ── */
  const now    = new Date();
  const mon    = new Date(now); mon.setDate(now.getDate() - (now.getDay() === 0 ? 6 : now.getDay() - 1));
  const sun    = new Date(mon); sun.setDate(mon.getDate() + 6);
  const weekStr = fmtDate(mon) + ' – ' + fmtDate(sun);
  const exportedAt = now.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' });

  /* ── totals ── */
  const trainingDays = S.week.filter(d => d.type !== 'rest' && d.exercises && d.exercises.length).length;
  const totalExos    = S.week.reduce((a, d) => a + (d.exercises ? d.exercises.length : 0), 0);
  const totalSets    = S.week.reduce((a, d) => a + (d.exercises||[]).reduce((b, ex) => b + (ex.sets||0), 0), 0);
  const totalVol     = S.week.reduce((a, d) => a + (d.exercises||[]).reduce((b, ex) => b + ((ex.weight||0)*(ex.reps||0)*(ex.sets||0)), 0), 0);

  /* ── day blocks ── */
  const dayBlocksHTML = S.week.map((day, di) => {
    const color = TYPE_COLOR[day.type] || '#9ca3af';
    const label = TYPE_LABEL[day.type] || (day.type||'').toUpperCase();
    const isRest = !day.exercises || day.exercises.length === 0 || day.type === 'rest';

    if (isRest) {
      return `
      <div class="pdf-day">
        <div class="pdf-day-hd" style="border-left-color:${color}">
          <div class="pdf-day-left">
            <span class="pdf-day-name">${DAY_NAMES[di]}</span>
            <span class="pdf-session-name" style="color:#aaa">${day.name || 'Repos'}</span>
          </div>
          <span class="pdf-type-badge" style="background:${color}18;color:${color};border-color:${color}40">${label}</span>
        </div>
        <p class="pdf-rest-note">Récupération — pas d'entraînement prévu</p>
      </div>`;
    }

    const daySets = day.exercises.reduce((a, ex) => a + (ex.sets||0), 0);
    const dayVol  = day.exercises.reduce((a, ex) => a + ((ex.weight||0)*(ex.reps||0)*(ex.sets||0)), 0);

    const rows = day.exercises.map((ex, ei) => {
      const vol = (ex.weight||0) * (ex.reps||0) * (ex.sets||0);
      const repsStr = (ex.reps && ex.reps > 1) ? ex.reps : 'max';
      const wtStr   = ex.weight ? ex.weight + ' kg' : 'PC';
      return `
        <tr class="${ei % 2 === 0 ? '' : 'alt'}">
          <td class="n">${ei + 1}</td>
          <td class="nm">${ex.name || '—'}</td>
          <td class="v">${ex.sets || '—'}</td>
          <td class="v">${repsStr}</td>
          <td class="v">${wtStr}</td>
          <td class="v">${fmtRest(ex.rest)}</td>
          <td class="v dim">${fmtVol(vol)}</td>
        </tr>`;
    }).join('');

    return `
    <div class="pdf-day">
      <div class="pdf-day-hd" style="border-left-color:${color}">
        <div class="pdf-day-left">
          <span class="pdf-day-name">${DAY_NAMES[di]}</span>
          <span class="pdf-session-name">${day.name || ''}</span>
        </div>
        <div class="pdf-day-right">
          <span class="pdf-type-badge" style="background:${color}18;color:${color};border-color:${color}40">${label}</span>
          <span class="pdf-day-meta">${daySets} séries${dayVol ? ' · ' + fmtVol(dayVol) : ''}</span>
        </div>
      </div>
      <table class="pdf-tbl">
        <thead>
          <tr><th class="n">#</th><th class="nm">Exercice</th><th class="v">Séries</th><th class="v">Reps</th><th class="v">Poids</th><th class="v">Repos</th><th class="v dim">Volume</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }).join('');

  /* ── full HTML document ── */
  const doc = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8"/>
<title>Programme SAM — ${weekStr}</title>
<style>
/* ── Reset ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
@page { size: A4 portrait; margin: 16mm 14mm 14mm; }

body {
  font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
  font-size: 10.5pt;
  color: #111;
  background: #fff;
  line-height: 1.5;
}

/* ── Header ── */
.pdf-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 11px;
  border-bottom: 2.5px solid #111;
  margin-bottom: 16px;
}
.pdf-logo {
  display: flex;
  align-items: center;
  gap: 9px;
}
.pdf-logo-box {
  width: 32px; height: 32px;
  background: #111;
  border-radius: 7px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.pdf-logo-text { display: flex; flex-direction: column; line-height: 1.15; }
.pdf-logo-top { font-size: 13pt; font-weight: 800; letter-spacing: .04em; color: #111; }
.pdf-logo-bot { font-size: 6.5pt; letter-spacing: .16em; color: #999; text-transform: uppercase; }
.pdf-hd-right { text-align: right; }
.pdf-hd-title { font-size: 11pt; font-weight: 700; margin-bottom: 2px; }
.pdf-hd-sub   { font-size: 7.5pt; color: #999; letter-spacing: .03em; }

/* ── Summary strip ── */
.pdf-summary {
  display: flex;
  border: 1px solid #e0e0e0;
  border-radius: 7px;
  overflow: hidden;
  margin-bottom: 16px;
}
.pdf-sum-cell {
  flex: 1;
  text-align: center;
  padding: 8px 10px;
  border-right: 1px solid #e0e0e0;
}
.pdf-sum-cell:last-child { border-right: none; }
.pdf-sum-val { font-size: 18pt; font-weight: 300; letter-spacing: -.04em; color: #111; line-height: 1.1; }
.pdf-sum-lbl { font-size: 6.5pt; text-transform: uppercase; letter-spacing: .1em; color: #aaa; margin-top: 2px; }

/* ── Day card ── */
.pdf-day {
  border: 1px solid #e8e8e8;
  border-radius: 7px;
  overflow: hidden;
  margin-bottom: 11px;
  page-break-inside: avoid;
  break-inside: avoid;
}
.pdf-day-hd {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #f7f7f7;
  border-bottom: 1px solid #e8e8e8;
  border-left: 4px solid #ccc;
}
.pdf-day-left  { display: flex; align-items: baseline; gap: 9px; }
.pdf-day-right { display: flex; align-items: center; gap: 10px; }
.pdf-day-name  { font-size: 11pt; font-weight: 700; }
.pdf-session-name { font-size: 9pt; font-weight: 500; color: #555; }
.pdf-type-badge {
  font-size: 6.5pt; font-weight: 700; letter-spacing: .1em;
  padding: 2px 7px; border-radius: 3px;
  border: 1px solid transparent;
  text-transform: uppercase;
  flex-shrink: 0;
}
.pdf-day-meta { font-size: 8pt; color: #aaa; }
.pdf-rest-note { padding: 9px 12px; font-size: 9pt; color: #bbb; font-style: italic; }

/* ── Exercise table ── */
.pdf-tbl { width: 100%; border-collapse: collapse; }
.pdf-tbl thead tr { background: #f2f2f2; }
.pdf-tbl th {
  font-size: 7pt; font-weight: 600; text-transform: uppercase;
  letter-spacing: .08em; color: #999;
  padding: 5px 8px;
  text-align: left;
  border-bottom: 1px solid #e8e8e8;
  white-space: nowrap;
}
.pdf-tbl td {
  padding: 5.5px 8px;
  border-bottom: 1px solid #f2f2f2;
  vertical-align: middle;
}
.pdf-tbl tr:last-child td { border-bottom: none; }
.pdf-tbl tr.alt td { background: #fafafa; }

.n  { width: 22px; color: #ccc; font-size: 8pt; font-weight: 600; }
.nm { font-size: 10pt; font-weight: 500; color: #111; }
.v  { width: 60px; font-size: 9pt; color: #444; text-align: center; font-variant-numeric: tabular-nums; white-space: nowrap; }
.v.dim { color: #bbb; }

/* ── Footer ── */
.pdf-ft {
  margin-top: 18px;
  padding-top: 9px;
  border-top: 1px solid #e8e8e8;
  display: flex;
  justify-content: space-between;
  font-size: 7pt;
  color: #ccc;
  letter-spacing: .03em;
}

@media print {
  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
</style>
</head>
<body>

<!-- Header -->
<div class="pdf-hd">
  <div class="pdf-logo">
    <div class="pdf-logo-box">
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2"    y="10" width="3"   height="4" rx="1"   fill="white"/>
        <rect x="19"   y="10" width="3"   height="4" rx="1"   fill="white"/>
        <rect x="4"    y="9"  width="2.5" height="6" rx="0.8" fill="white"/>
        <rect x="17.5" y="9"  width="2.5" height="6" rx="0.8" fill="white"/>
        <rect x="6.5"  y="11" width="11"  height="2" rx="1"   fill="white"/>
      </svg>
    </div>
    <div class="pdf-logo-text">
      <span class="pdf-logo-top">SAM</span>
      <span class="pdf-logo-bot">The Best Trainer</span>
    </div>
  </div>
  <div class="pdf-hd-right">
    <div class="pdf-hd-title">Programme — Semaine du ${weekStr}</div>
    <div class="pdf-hd-sub">Exporté le ${exportedAt}</div>
  </div>
</div>

<!-- Summary strip -->
<div class="pdf-summary">
  <div class="pdf-sum-cell">
    <div class="pdf-sum-val">${trainingDays}</div>
    <div class="pdf-sum-lbl">Séances</div>
  </div>
  <div class="pdf-sum-cell">
    <div class="pdf-sum-val">${7 - trainingDays}</div>
    <div class="pdf-sum-lbl">Repos</div>
  </div>
  <div class="pdf-sum-cell">
    <div class="pdf-sum-val">${totalExos}</div>
    <div class="pdf-sum-lbl">Exercices</div>
  </div>
  <div class="pdf-sum-cell">
    <div class="pdf-sum-val">${totalSets}</div>
    <div class="pdf-sum-lbl">Séries totales</div>
  </div>
  <div class="pdf-sum-cell">
    <div class="pdf-sum-val">${fmtVol(totalVol)}</div>
    <div class="pdf-sum-lbl">Volume planifié</div>
  </div>
</div>

<!-- Day blocks -->
${dayBlocksHTML}

<!-- Footer -->
<div class="pdf-ft">
  <span>SamTheBestTrainer · Programme personnel · usage privé</span>
  <span>PC = Poids du corps &nbsp;·&nbsp; Volume = Séries × Reps × Poids</span>
</div>

<script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=860,height=720');
  if (!win) { showToast('⚠ Autorise les pop-ups pour générer le PDF'); return; }
  win.document.write(doc);
  win.document.close();
}

/* ═══════════════════════════════════════════
