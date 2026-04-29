// ============================================================
// tradespace.js — Tradespace Analysis page logic
// Depends on: state.js, app.js (getIlityNameById)
// ============================================================

// ============================================================
// THEME-AWARE COLOR HELPERS
// Chart.js doesn't support CSS variables — resolve at render time.
// ============================================================
function _tradeThemeColors() {
  const body   = document.body;
  const isDark = body.classList.contains('theme-dark') ||
                 body.classList.contains('theme-red-black');
  const isEng  = body.classList.contains('theme-engineering');
  const isGrn  = body.classList.contains('theme-green-yellow');
  const text   = isDark ? '#e8e8e6' : isEng ? '#0e1e0e' : isGrn ? '#1a1a18' : '#1a1a18';
  const muted  = isDark ? '#9a9a94' : isEng ? '#2e5a2e' : isGrn ? '#4a5a48' : '#6b6b65';
  const grid   = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(136,135,128,0.12)';
  return { text, muted, grid };
}

// Per-theme concept color palette — vibrant on dark bg, rich on light bg
function _tradeGetPalette() {
  const body = document.body;
  if (body.classList.contains('theme-dark')) return [
    '#60a5fa','#f87171','#34d399','#c084fc','#22d3ee',
    '#fb923c','#f472b6','#2dd4bf','#a3e635','#818cf8',
    '#fbbf24','#86efac',
  ];
  if (body.classList.contains('theme-red-black')) return [
    '#f87171','#fb923c','#fbbf24','#4ade80','#22d3ee',
    '#60a5fa','#c084fc','#f472b6','#a3e635','#e2e8f0',
    '#86efac','#fda4af',
  ];
  if (body.classList.contains('theme-green-yellow')) return [
    '#15803d','#92400e','#1d4ed8','#7c3aed','#0e7490',
    '#b45309','#be123c','#166534','#0369a1','#6d28d9',
    '#065f46','#78350f',
  ];
  if (body.classList.contains('theme-engineering')) return [
    '#1e40af','#991b1b','#065f46','#5b21b6','#0c4a6e',
    '#78350f','#831843','#1e3a5f','#14532d','#312e81',
    '#7f1d1d','#134e4a',
  ];
  // Light (default)
  return [
    '#3b82f6','#ef4444','#10b981','#8b5cf6','#06b6d4',
    '#f97316','#ec4899','#14b8a6','#84cc16','#6366f1',
    '#e11d48','#0ea5e9',
  ];
}

const TRADE_DATUM_COLOR = '#f59e0b'; // amber — always datum

// ── Page state ──
let _tradeSelIlities    = [];          // array of ility IDs for scatter dropdowns (2–3)
let _tradeSelConcepts   = new Set();   // highlighted concept IDs — STARTS EMPTY
let _tradeShowPareto    = true;
let _tradeShowDatum     = true;
let _tradeExpandedKey   = null;        // 'xId_yId' or null
let _tradeCharts        = {};          // Chart.js instances keyed by canvas ID
let _tradeRadar         = null;        // radar Chart.js instance
let _tradeConceptColors = {};          // conceptId → hex (reassigned per theme per render)

// ============================================================
// UTILITY SCORE CALCULATION
// Returns { ilityId: { conceptId: score 0–100 } }
// Datum is always 50 on every axis.
// ============================================================
function _tradeCalcScores() {
  const adv    = pughSettings.advancedScoring && userTier !== 'free';
  const result = {};
  [...selectedIlities].forEach(ilId => {
    result[ilId] = {};
    const ilReqs = requirements.filter(r => r.primary === ilId);
    const N      = ilReqs.length;
    if (N === 0) return;
    pughConcepts.forEach((c, i) => {
      if (i === 0) { result[ilId][c.id] = 50; return; }
      let sum = 0;
      ilReqs.forEach(req => {
        const raw = pughScores[c.id + '_' + req.id];
        if (raw === undefined || raw === null) return;
        if (adv) { sum += typeof raw === 'number' ? raw : 0; }
        else { if (raw === '+') sum += 1; else if (raw === '-') sum -= 1; }
      });
      const score = adv
        ? ((sum + 3 * N) / (6 * N)) * 100
        : ((sum + N)     / (2 * N)) * 100;
      result[ilId][c.id] = Math.round(score * 10) / 10;
    });
  });
  return result;
}

// Calc scores for any ility, not just selected ones (used by radar)
function _tradeCalcScoreForIlity(ilId) {
  const adv    = pughSettings.advancedScoring && userTier !== 'free';
  const ilReqs = requirements.filter(r => r.primary === ilId);
  const N      = ilReqs.length;
  const out    = {};
  pughConcepts.forEach((c, i) => {
    if (i === 0) { out[c.id] = 50; return; }
    if (N === 0) { out[c.id] = 50; return; }
    let sum = 0;
    ilReqs.forEach(req => {
      const raw = pughScores[c.id + '_' + req.id];
      if (raw === undefined || raw === null) return;
      if (adv) { sum += typeof raw === 'number' ? raw : 0; }
      else { if (raw === '+') sum += 1; else if (raw === '-') sum -= 1; }
    });
    out[c.id] = Math.round((adv
      ? ((sum + 3*N) / (6*N))
      : ((sum + N)   / (2*N))) * 1000) / 10;
  });
  return out;
}

// ============================================================
// ILITIES WITH PUGH SCORES — used for both dropdown pool & radar
// ============================================================
function _tradeIlitiesWithScores() {
  return [...selectedIlities]
    .filter(ilId => {
      const reqs = requirements.filter(r => r.primary === ilId);
      if (!reqs.length) return false;
      return pughConcepts.slice(1).some(c =>
        reqs.some(req => {
          const v = pughScores[c.id + '_' + req.id];
          return v !== undefined && v !== null && v !== '';
        })
      );
    })
    .map(ilId => ({ id: ilId, name: _tradeGetIlityName(ilId) }));
}

// ============================================================
// AUTO-POPULATION
// Priority: (1) pair weight, (2) req count, (3) score range, (4) alpha
// ============================================================
function _tradeAutoPopulate(available) {
  const adv = pughSettings.advancedScoring && userTier !== 'free';
  const scored = available.map(il => {
    const reqs   = requirements.filter(r => r.primary === il.id);
    const weight = window._pairWeights?.[il.id] || 1;
    const vals   = pughConcepts.slice(1).map(c => {
      const N = reqs.length; if (!N) return 50;
      let sum = 0;
      reqs.forEach(req => {
        const raw = pughScores[c.id + '_' + req.id];
        if (raw === undefined || raw === null) return;
        if (adv) { sum += typeof raw === 'number' ? raw : 0; }
        else { if (raw === '+') sum += 1; else if (raw === '-') sum -= 1; }
      });
      return adv ? ((sum+3*N)/(6*N))*100 : ((sum+N)/(2*N))*100;
    });
    const range = vals.length ? Math.max(...vals) - Math.min(...vals) : 0;
    return { id: il.id, name: il.name, weight, reqs: reqs.length, range };
  });
  scored.sort((a, b) =>
    b.weight - a.weight || b.reqs - a.reqs ||
    b.range  - a.range  || a.name.localeCompare(b.name)
  );
  return scored.slice(0, 3).map(s => s.id);
}

// ============================================================
// PARETO FRONT
// ============================================================
function _tradeParetoFront(pts, xk, yk) {
  return pts.filter(p =>
    !pts.some(q =>
      q !== p && q[xk] >= p[xk] && q[yk] >= p[yk] &&
      (q[xk] > p[xk] || q[yk] > p[yk])
    )
  );
}

// ============================================================
// HELPERS
// ============================================================
function _tradeGetIlityName(id) {
  if (typeof getIlityNameById === 'function') return getIlityNameById(id);
  if (id === 'other') return 'Other';
  const all = [
    ...(typeof ILITIES       !== 'undefined' ? ILITIES       : []),
    ...(typeof customIlities !== 'undefined' ? customIlities : []),
  ];
  return all.find(il => il.id === id)?.name || id;
}

function _tradeEsc(str) {
  return String(str ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function _tradeHexToRgba(hex, a) {
  const r = parseInt(hex.slice(1,3),16);
  const g = parseInt(hex.slice(3,5),16);
  const b = parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${a})`;
}

function _tradeDestroyAllCharts() {
  Object.values(_tradeCharts).forEach(ch => { try { ch.destroy(); } catch(e){} });
  _tradeCharts = {};
  if (_tradeRadar) { try { _tradeRadar.destroy(); } catch(e){} _tradeRadar = null; }
}

function _tradeRedrawAll() {
  const scores = _tradeCalcScores();
  _tradePairs().forEach(([xId, yId]) => _tradeDrawScatter(xId, yId, scores));
  _tradeRenderRadar();
}

// ============================================================
// MAIN ENTRY POINT — called by switchPage('trade')
// ============================================================
function renderTradespace() {
  const emptyEl   = document.getElementById('tradeEmptyState');
  const contentEl = document.getElementById('tradeContent');
  if (!emptyEl || !contentEl) return;

  const available = _tradeIlitiesWithScores();
  if (available.length < 2 || pughConcepts.length < 2) {
    emptyEl.style.display   = '';
    contentEl.style.display = 'none';
    _tradeDestroyAllCharts();
    return;
  }

  emptyEl.style.display   = 'none';
  contentEl.style.display = '';

  // Assign stable colors from current theme palette
  const palette = _tradeGetPalette();
  _tradeConceptColors = {};
  pughConcepts.forEach((c, i) => {
    _tradeConceptColors[c.id] = (i === 0)
      ? TRADE_DATUM_COLOR
      : palette[(i - 1) % palette.length];
  });

  // Auto-populate ility dropdowns if empty or stale
  const validIds = available.map(il => il.id);
  const stale    = _tradeSelIlities.some(id => !validIds.includes(id));
  if (_tradeSelIlities.length === 0 || stale) {
    _tradeSelIlities = _tradeAutoPopulate(available);
  }

  // NOTE: _tradeSelConcepts intentionally NOT auto-populated —
  // user starts with all concepts as gray; they select to highlight.

  _tradeRenderIlityDropdowns(available);
  _tradeRenderConceptPanel();
  _tradeDestroyAllCharts();
  _tradeRenderScatterCharts();
  _tradeRenderRadar();
}

// ============================================================
// ILITY DROPDOWNS (scatter chart axes only)
// ============================================================
function _tradeRenderIlityDropdowns(available) {
  const container = document.getElementById('tradeIlityDropdowns');
  if (!container) return;
  container.innerHTML = '';

  ['X','Y','Z'].forEach((label, slot) => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:6px';

    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted)';
    lbl.textContent = label;

    const sel = document.createElement('select');
    sel.className = 'req-select';
    sel.style.cssText = 'min-width:150px;font-size:13px';
    sel.id = 'tradeIlitySel' + slot;

    if (slot >= 1) {
      const blank   = document.createElement('option');
      blank.value   = '';
      blank.textContent = slot === 2 ? '— 3rd (optional) —' : '— Select —';
      sel.appendChild(blank);
    }

    available.forEach(il => {
      const opt = document.createElement('option');
      opt.value = il.id;
      opt.textContent = il.name;
      if (_tradeSelIlities[slot] === il.id) opt.selected = true;
      sel.appendChild(opt);
    });

    sel.addEventListener('change', _tradeOnDropdownChange);
    wrap.appendChild(lbl);
    wrap.appendChild(sel);
    container.appendChild(wrap);
  });

  _tradeEnforceMutualExclusion();
}

function _tradeOnDropdownChange() {
  const sels = [0,1,2].map(i => document.getElementById('tradeIlitySel'+i)).filter(Boolean);
  _tradeSelIlities = sels.map(s => s.value).filter(Boolean);
  _tradeEnforceMutualExclusion();
  _tradeExpandedKey = null;
  _tradeDestroyAllCharts();
  _tradeRenderScatterCharts();
  _tradeRenderRadar();
}

function _tradeEnforceMutualExclusion() {
  const sels   = [0,1,2].map(i => document.getElementById('tradeIlitySel'+i)).filter(Boolean);
  const chosen = sels.map(s => s.value);
  sels.forEach((sel, i) => {
    Array.from(sel.options).forEach(opt => {
      if (!opt.value) return;
      opt.disabled = chosen.some((v, j) => j !== i && v === opt.value);
    });
  });
}

// ============================================================
// CONCEPT PANEL
// Single source of truth driving BOTH scatter charts AND radar.
// All concepts start unchecked (gray dots on charts by default).
// ============================================================
function _tradeRenderConceptPanel() {
  const list = document.getElementById('tradeConceptList');
  if (!list) return;

  let html = '';

  // Pareto + datum controls
  html += `
    <div style="border-bottom:1px solid var(--border);padding-bottom:8px;margin-bottom:8px;display:flex;flex-direction:column;gap:2px">
      <label style="display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;padding:3px 0">
        <input type="checkbox" id="tradeParetoChk" ${_tradeShowPareto ? 'checked' : ''}
               onchange="window._tradeTogglePareto(this.checked)" style="accent-color:var(--accent)">
        <span style="width:14px;height:2px;background:#1d9e75;display:inline-block;flex-shrink:0;border-radius:1px"></span>
        <span style="font-weight:600;color:#1d9e75;font-size:12px">Pareto Front</span>
      </label>
      <label style="display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;padding:3px 0">
        <input type="checkbox" id="tradeDatumChk" ${_tradeShowDatum ? 'checked' : ''}
               onchange="window._tradeToggleDatum(this.checked)" style="accent-color:var(--accent)">
        <span style="width:10px;height:10px;background:${TRADE_DATUM_COLOR};display:inline-block;flex-shrink:0;border-radius:2px;transform:rotate(45deg)"></span>
        <span style="font-weight:600;color:${TRADE_DATUM_COLOR};font-size:12px">Datum</span>
      </label>
    </div>
  `;

  // All non-datum concepts (unchecked by default)
  pughConcepts.forEach((c, i) => {
    if (i === 0) return;
    const color = _tradeConceptColors[c.id] || '#888';
    const sel   = _tradeSelConcepts.has(c.id);
    const name  = c.name || ('Concept ' + c.id);
    html += `
      <label style="display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;padding:3px 0;line-height:1.3">
        <input type="checkbox" ${sel ? 'checked' : ''}
               onchange="window._tradeToggleConcept('${c.id}', this.checked)"
               style="accent-color:${color}">
        <span style="width:10px;height:10px;border-radius:50%;background:${sel ? color : 'rgba(155,155,148,0.4)'};display:inline-block;flex-shrink:0;border:1.5px solid ${sel ? color : 'rgba(155,155,148,0.5)'}"></span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px" title="${_tradeEsc(name)}">${_tradeEsc(name)}</span>
      </label>
    `;
  });

  // Select All / Clear All (don't affect Pareto or Datum)
  html += `
    <div style="display:flex;gap:6px;margin-top:10px;padding-top:8px;border-top:1px solid var(--border)">
      <button onclick="window._tradeSelectAll()"
              style="flex:1;font-size:11px;padding:4px 6px;background:var(--accent-light,rgba(26,86,219,0.07));border:1px solid var(--accent-border,var(--border));border-radius:5px;color:var(--accent);cursor:pointer;font-weight:600">
        Select All
      </button>
      <button onclick="window._tradeClearAll()"
              style="flex:1;font-size:11px;padding:4px 6px;background:var(--surface);border:1px solid var(--border);border-radius:5px;color:var(--text-muted);cursor:pointer">
        Clear All
      </button>
    </div>
  `;

  list.innerHTML = html;
}

// ============================================================
// SCATTER CHARTS
// All non-datum concepts always drawn as gray dots.
// Selected concepts drawn as colored dots on top.
// ============================================================
function _tradePairs() {
  const ils = _tradeSelIlities;
  if (ils.length < 2) return [];
  const pairs = [];
  for (let i = 0; i < ils.length; i++)
    for (let j = i+1; j < ils.length; j++)
      pairs.push([ils[i], ils[j]]);
  return pairs;
}

function _tradeRenderScatterCharts() {
  const grid = document.getElementById('tradeScatterGrid');
  if (!grid) return;

  const pairs = _tradePairs();
  if (!pairs.length) { grid.innerHTML = ''; return; }

  // In normal (non-expanded) state: multi-column grid
  if (!_tradeExpandedKey) {
    grid.style.gridTemplateColumns = pairs.length === 1 ? '1fr' : '1fr 1fr';
  } else {
    grid.style.gridTemplateColumns = '1fr'; // single column when expanded
  }

  const scores = _tradeCalcScores();

  grid.innerHTML = pairs.map(([xId, yId]) => {
    const xName  = _tradeGetIlityName(xId);
    const yName  = _tradeGetIlityName(yId);
    const cardId = 'tradeCard_' + xId + '_' + yId;
    const isExp  = _tradeExpandedKey === xId + '_' + yId;
    const hPx    = isExp ? 'calc(65vh)' : '220px';
    return `
      <div class="trade-chart-card" id="${cardId}"
           style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px;position:relative">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--text-muted)">
            ${_tradeEsc(yName)} vs ${_tradeEsc(xName)}
          </div>
          <button id="tradeExpBtn_${xId}_${yId}"
                  onclick="window._tradeToggleExpand('${xId}','${yId}')"
                  title="${isExp ? 'Shrink chart' : 'Expand chart'}"
                  style="background:none;border:none;cursor:pointer;color:var(--text-light);padding:2px 4px;font-size:15px;line-height:1">
            ${isExp ? '⤡' : '⤢'}
          </button>
        </div>
        <div style="position:relative;height:${hPx}" id="tradeWrap_${xId}_${yId}">
          <canvas id="tradeChart_${xId}_${yId}"></canvas>
        </div>
      </div>`;
  }).join('');

  // Hide non-expanded cards + radar when one is expanded
  if (_tradeExpandedKey) {
    pairs.forEach(([xId, yId]) => {
      const card = document.getElementById('tradeCard_' + xId + '_' + yId);
      if (card) card.style.display =
        (xId + '_' + yId === _tradeExpandedKey) ? '' : 'none';
    });
    const rc = document.getElementById('tradeRadarCard');
    if (rc) rc.style.display = 'none';
  } else {
    const rc = document.getElementById('tradeRadarCard');
    if (rc) rc.style.display = '';
  }

  pairs.forEach(([xId, yId]) => _tradeDrawScatter(xId, yId, scores));
}

function _tradeDrawScatter(xId, yId, scores) {
  const canvasId = 'tradeChart_' + xId + '_' + yId;
  const canvas   = document.getElementById(canvasId);
  if (!canvas) return;

  if (_tradeCharts[canvasId]) {
    try { _tradeCharts[canvasId].destroy(); } catch(e){}
    delete _tradeCharts[canvasId];
  }

  const xName = _tradeGetIlityName(xId);
  const yName = _tradeGetIlityName(yId);

  // Build all concept points
  const allPts = pughConcepts.map((c, i) => ({
    id:      c.id,
    name:    c.name || ('Concept ' + c.id),
    x:       scores[xId]?.[c.id] ?? 50,
    y:       scores[yId]?.[c.id] ?? 50,
    isDatum: i === 0,
    color:   _tradeConceptColors[c.id] || '#888',
  }));

  const datumPt = allPts[0];
  const dx = datumPt.x; // always 50
  const dy = datumPt.y; // always 50

  const datasets = [];

  // Layer 1: ALL non-datum concepts as gray (always visible)
  const nonDatumPts = allPts.filter(p => !p.isDatum);
  datasets.push({
    label:           '__all_gray__',
    data:            nonDatumPts.map(p => ({ x: p.x, y: p.y, _name: p.name })),
    backgroundColor: 'rgba(155,155,148,0.35)',
    borderColor:     'rgba(155,155,148,0.55)',
    borderWidth:     1,
    pointRadius:     5,
    pointHoverRadius:7,
  });

  // Layer 2: Selected concepts as colored dots (on top of gray)
  allPts.filter(p => !p.isDatum && _tradeSelConcepts.has(p.id)).forEach(p => {
    datasets.push({
      label:           p.name,
      data:            [{ x: p.x, y: p.y, _name: p.name }],
      backgroundColor: p.color,
      borderColor:     p.color,
      borderWidth:     1.5,
      pointRadius:     7,
      pointHoverRadius:9,
    });
  });

  // Layer 3: Datum (amber diamond) — shown when _tradeShowDatum
  if (_tradeShowDatum) {
    datasets.push({
      label:           datumPt.name,
      data:            [{ x: datumPt.x, y: datumPt.y, _name: datumPt.name }],
      backgroundColor: TRADE_DATUM_COLOR,
      borderColor:     TRADE_DATUM_COLOR,
      borderWidth:     2,
      pointRadius:     8,
      pointHoverRadius:10,
      pointStyle:      'rectRot',
    });
  }

  // Quadrant plugin — shading always on; crosshairs only when datum shown
  const tc      = _tradeThemeColors();
  const qPlugin = {
    id: 'quad_' + xId + '_' + yId,
    afterDraw(ch) {
      const { ctx, scales: { x, y }, chartArea: a } = ch;
      const px = x.getPixelForValue(dx);
      const py = y.getPixelForValue(dy);
      ctx.save();
      ctx.fillStyle = 'rgba(29,158,117,0.055)';
      ctx.fillRect(px, a.top, a.right - px, py - a.top);
      if (_tradeShowDatum) {
        ctx.strokeStyle = 'rgba(136,135,128,0.28)';
        ctx.setLineDash([3,3]); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, a.top);  ctx.lineTo(px, a.bottom); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(a.left, py); ctx.lineTo(a.right, py);  ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    },
  };

  // Pareto plugin
  const pfPlugin = {
    id: 'pf_' + xId + '_' + yId,
    afterDraw(ch) {
      if (!_tradeShowPareto) return;
      const front = _tradeParetoFront(nonDatumPts, 'x', 'y');
      if (!front.length) return;
      const seen = new Set();
      const s    = [...front].sort((a,b) => a.x - b.x).filter(p => {
        const k = p.x+'|'+p.y;
        return seen.has(k) ? false : (seen.add(k), true);
      });
      const { ctx, scales: { x, y }, chartArea: a } = ch;
      ctx.save();
      ctx.strokeStyle = 'rgba(29,158,117,0.85)';
      ctx.lineWidth   = 2;
      ctx.setLineDash([5,4]);
      ctx.lineJoin    = 'round';
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(a.left, y.getPixelForValue(s[0].y));
      s.forEach(p => ctx.lineTo(x.getPixelForValue(p.x), y.getPixelForValue(p.y)));
      ctx.lineTo(x.getPixelForValue(s[s.length-1].x), a.bottom);
      ctx.stroke();
      ctx.restore();
    },
  };

  const chart = new Chart(canvas, {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 180 },
      scales: {
        x: {
          min: 0, max: 100,
          title: { display: true, text: xName + ' Utility (%)', font: { size: 11 }, color: tc.muted },
          ticks: { font: { size: 10 }, color: tc.muted },
          grid:  { color: tc.grid },
        },
        y: {
          min: 0, max: 100,
          title: { display: true, text: yName + ' Utility (%)', font: { size: 11 }, color: tc.muted },
          ticks: { font: { size: 10 }, color: tc.muted },
          grid:  { color: tc.grid },
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(ctx) {
              const raw  = ctx.raw;
              const name = raw._name || ctx.dataset.label || '';
              return ` ${name}: (${Math.round(raw.x)}%, ${Math.round(raw.y)}%)`;
            },
          },
        },
      },
    },
    plugins: [qPlugin, pfPlugin],
  });

  _tradeCharts[canvasId] = chart;
}

// ============================================================
// EXPAND / SHRINK
// Expanded chart fills the chartsCol width at 65vh height.
// ============================================================
window._tradeToggleExpand = function(xId, yId) {
  const key = xId + '_' + yId;

  if (_tradeExpandedKey === key) {
    // Shrink — restore normal view
    _tradeExpandedKey = null;
    _tradeDestroyAllCharts();
    _tradeRenderScatterCharts();
    _tradeRenderRadar();
  } else {
    // Expand — rebuild charts with this one expanded
    _tradeExpandedKey = key;
    _tradeDestroyAllCharts();
    _tradeRenderScatterCharts();
    // Radar is hidden inside _tradeRenderScatterCharts when expanded
    if (_tradeRadar) { try { _tradeRadar.destroy(); } catch(e){} _tradeRadar = null; }
  }
};

// ============================================================
// RADAR CHART
// Always shows ALL ilities that have Pugh scores (not just
// the ones selected in the scatter dropdowns).
// Single concept panel drives this — no separate selector.
// Requires ≥3 total scored ilities to render.
// ============================================================
function _tradeRenderRadar() {
  const msgEl  = document.getElementById('tradeRadarMsg');
  const wrapEl = document.getElementById('tradeRadarWrap');
  if (!msgEl || !wrapEl) return;

  // Hide radar when a scatter chart is expanded
  if (_tradeExpandedKey) {
    msgEl.style.display  = 'none';
    wrapEl.style.display = 'none';
    return;
  }

  // Radar uses ALL scored ilities, not just scatter dropdown selection
  const allIlities = _tradeIlitiesWithScores();

  if (allIlities.length < 3) {
    msgEl.style.display  = '';
    wrapEl.style.display = 'none';
    if (_tradeRadar) { try { _tradeRadar.destroy(); } catch(e){} _tradeRadar = null; }
    // Update message to reflect actual reason
    msgEl.textContent = allIlities.length < 2
      ? 'At least 3 Lifecycle Properties with Pugh Matrix scores are needed for the Radar Chart.'
      : 'A 3rd Lifecycle Property with Pugh Matrix scores is needed to enable the Radar Chart.';
    return;
  }

  msgEl.style.display  = 'none';
  wrapEl.style.display = '';

  if (_tradeRadar) { try { _tradeRadar.destroy(); } catch(e){} _tradeRadar = null; }

  const canvas = document.getElementById('tradeRadarCanvas');
  if (!canvas) return;

  const labels   = allIlities.map(il => il.name);
  const datasets = [];

  // Concept space envelope — dotted gray boundary (max per axis across ALL concepts)
  datasets.push({
    label:           '__envelope__',
    data:            allIlities.map(il => {
      const s = _tradeCalcScoreForIlity(il.id);
      return Math.max(...pughConcepts.map(c => s[c.id] ?? 50));
    }),
    borderColor:     'rgba(155,155,148,0.55)',
    backgroundColor: 'rgba(0,0,0,0)',
    borderWidth:     1.5,
    borderDash:      [4,3],
    pointRadius:     0,
    pointHitRadius:  0,
    order:           99,
  });

  // Datum ring at 50% on every spoke
  datasets.push({
    label:           'Datum (50%)',
    data:            allIlities.map(() => 50),
    borderColor:     TRADE_DATUM_COLOR,
    backgroundColor: _tradeHexToRgba(TRADE_DATUM_COLOR, 0.05),
    borderWidth:     1.5,
    borderDash:      [3,3],
    pointRadius:     0,
    pointHitRadius:  0,
    order:           98,
  });

  // Selected (highlighted) non-datum concepts
  pughConcepts
    .filter((c, i) => i > 0 && _tradeSelConcepts.has(c.id))
    .forEach((c, idx) => {
      const color = _tradeConceptColors[c.id] || '#888';
      const scores = allIlities.map(il => _tradeCalcScoreForIlity(il.id)[c.id] ?? 50);
      datasets.push({
        label:               c.name || ('Concept ' + c.id),
        data:                scores,
        borderColor:         color,
        backgroundColor:     _tradeHexToRgba(color, 0.1),
        borderWidth:         2,
        pointRadius:         3,
        pointBackgroundColor:color,
        order:               idx,
      });
    });

  const rtc = _tradeThemeColors();
  _tradeRadar = new Chart(canvas, {
    type: 'radar',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 180 },
      scales: {
        r: {
          min: 0, max: 100,
          ticks: {
            stepSize:     25,
            font:         { size: 9 },
            color:        rtc.muted,
            backdropColor:'transparent',
          },
          pointLabels: { font: { size: 12, weight: '600' }, color: rtc.text },
          grid:        { color: rtc.grid },
          angleLines:  { color: rtc.grid },
        },
      },
      plugins: {
        legend: {
          display:  true,
          position: 'bottom',
          labels: {
            font:    { size: 11 },
            color:   rtc.text,
            padding: 8,
            filter(item) {
              // Hide envelope and datum ring from legend — they're structural
              return item.text !== '__envelope__' && item.text !== 'Datum (50%)';
            },
          },
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              return ` ${ctx.dataset.label}: ${Math.round(ctx.raw)}%`;
            },
          },
        },
      },
    },
  });
}

// ============================================================
// TOGGLE HANDLERS (exposed on window for inline onclick)
// ============================================================
window._tradeTogglePareto = function(val) {
  _tradeShowPareto = val;
  Object.values(_tradeCharts).forEach(ch => { try { ch.update(); } catch(e){} });
};

window._tradeToggleDatum = function(val) {
  _tradeShowDatum = val;
  // Redraw scatter (datum dot + crosshairs both driven by this flag)
  const scores = _tradeCalcScores();
  _tradePairs().forEach(([xId, yId]) => _tradeDrawScatter(xId, yId, scores));
  // Radar datum ring: just update
  if (_tradeRadar) { try { _tradeRadar.update(); } catch(e){} }
};

window._tradeToggleConcept = function(id, val) {
  if (val) _tradeSelConcepts.add(id);
  else     _tradeSelConcepts.delete(id);
  // Redraw concept panel dot colors
  _tradeRenderConceptPanel();
  // Redraw scatter and radar
  const scores = _tradeCalcScores();
  _tradePairs().forEach(([xId, yId]) => _tradeDrawScatter(xId, yId, scores));
  _tradeRenderRadar();
};

window._tradeSelectAll = function() {
  pughConcepts.slice(1).forEach(c => _tradeSelConcepts.add(c.id));
  _tradeRenderConceptPanel();
  _tradeRedrawAll();
};

window._tradeClearAll = function() {
  _tradeSelConcepts.clear();
  _tradeRenderConceptPanel();
  _tradeRedrawAll();
};

// ============================================================
// RE-RENDER ON THEME CHANGE
// ============================================================
function _tradeOnThemeChange() {
  if (typeof _currentPage !== 'undefined' && _currentPage === 'trade') {
    // Reassign colors from new theme palette
    const palette = _tradeGetPalette();
    pughConcepts.forEach((c, i) => {
      _tradeConceptColors[c.id] = (i === 0) ? TRADE_DATUM_COLOR : palette[(i-1) % palette.length];
    });
    _tradeRenderConceptPanel();
    _tradeDestroyAllCharts();
    _tradeRenderScatterCharts();
    _tradeRenderRadar();
  }
}

// ============================================================
// REPORT EXPORT
// ============================================================
function getTradespaceReportData() {
  const out = [];
  _tradePairs().forEach(([xId, yId]) => {
    const ch = _tradeCharts['tradeChart_' + xId + '_' + yId];
    if (!ch) return;
    out.push({
      title:   _tradeGetIlityName(yId) + ' vs ' + _tradeGetIlityName(xId),
      dataUrl: ch.canvas.toDataURL('image/png'),
    });
  });
  if (_tradeRadar) {
    out.push({ title: 'Radar Chart', dataUrl: _tradeRadar.canvas.toDataURL('image/png') });
  }
  return out;
}
