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

// Per-theme concept color palette — 10 hue groups × 5 shades = 50 colors.
// Interleaved so concepts 1-10 get maximally distinct hues, then concepts
// 11-20 get a second shade of each hue, and so on.
function _tradeGetPalette() {
  const body = document.body;

  // Each inner array is [shade1, shade2, shade3, shade4, shade5] for one hue.
  let groups;

  if (body.classList.contains('theme-dark') || body.classList.contains('theme-red-black')) {
    groups = [
      ['#60a5fa','#93c5fd','#3b82f6','#7ab8fb','#bfdbfe'], // blue
      ['#f87171','#fca5a5','#ef4444','#f97b7b','#fecaca'], // red
      ['#34d399','#6ee7b7','#10b981','#3ddaa0','#a7f3d0'], // emerald
      ['#c084fc','#d8b4fe','#a855f7','#c994fc','#e9d5ff'], // violet
      ['#22d3ee','#67e8f9','#06b6d4','#2ddaf5','#a5f3fc'], // cyan
      ['#fb923c','#fdba74','#f97316','#fc9e4f','#fed7aa'], // orange
      ['#f472b6','#f9a8d4','#ec4899','#f57dc0','#fbcfe8'], // pink
      ['#2dd4bf','#5eead4','#14b8a6','#3ddcc8','#99f6e4'], // teal
      ['#a3e635','#bef264','#84cc16','#aee83e','#d9f99d'], // lime
      ['#818cf8','#a5b4fc','#6366f1','#8c97f9','#c7d2fe'], // indigo
    ];
  } else if (body.classList.contains('theme-green-yellow')) {
    groups = [
      ['#1d4ed8','#1e40af','#2563eb','#1e3a8a','#3b82f6'], // blue
      ['#b45309','#92400e','#d97706','#7c2d12','#ca6c0d'], // amber
      ['#15803d','#14532d','#16a34a','#052e16','#1a9449'], // green
      ['#7c3aed','#5b21b6','#8b5cf6','#4c1d95','#6d28d9'], // violet
      ['#0e7490','#164e63','#0891b2','#083344','#0a8ead'], // cyan
      ['#c2410c','#7c2d12','#9a3412','#431407','#b45309'], // rust
      ['#be123c','#881337','#e11d48','#9f1239','#dc2626'], // rose
      ['#0f766e','#134e4a','#0d9488','#042f2e','#147a71'], // teal
      ['#4d7c0f','#365314','#65a30d','#1a2e05','#578b0e'], // lime
      ['#4338ca','#312e81','#6366f1','#1e1b4b','#3730a3'], // indigo
    ];
  } else if (body.classList.contains('theme-engineering')) {
    groups = [
      ['#1e40af','#1e3a8a','#1d4ed8','#172554','#2563eb'], // navy
      ['#991b1b','#7f1d1d','#b91c1c','#450a0a','#a51c1c'], // maroon
      ['#065f46','#052e16','#047857','#022c22','#0a7055'], // forest
      ['#5b21b6','#3b0764','#6d28d9','#2e1065','#4c1d95'], // deep violet
      ['#0c4a6e','#082f49','#0e7490','#0a2540','#0d5c87'], // deep teal
      ['#78350f','#451a03','#92400e','#431407','#8a3c10'], // brown
      ['#881337','#500724','#9f1239','#4c0519','#7a1030'], // deep rose
      ['#1e3a5f','#0f172a','#263d63','#172040','#1a3558'], // slate navy
      ['#14532d','#052e16','#166534','#032014','#185c33'], // deep green
      ['#312e81','#1e1b4b','#3730a3','#16125a','#2a2870'], // deep indigo
    ];
  } else {
    // Light (default)
    groups = [
      ['#3b82f6','#1d4ed8','#2563eb','#60a5fa','#1e40af'], // blue
      ['#ef4444','#dc2626','#f87171','#b91c1c','#e53e3e'], // red
      ['#10b981','#059669','#34d399','#047857','#0a8c6a'], // emerald
      ['#8b5cf6','#7c3aed','#a78bfa','#6d28d9','#5b21b6'], // violet
      ['#06b6d4','#0891b2','#22d3ee','#0e7490','#0284c7'], // cyan
      ['#f97316','#ea580c','#fb923c','#c2410c','#d97706'], // orange
      ['#ec4899','#db2777','#f472b6','#be185d','#e879a0'], // pink
      ['#14b8a6','#0f766e','#2dd4bf','#0d9488','#0e9f8b'], // teal
      ['#84cc16','#65a30d','#a3e635','#4d7c0f','#77b80f'], // lime
      ['#6366f1','#4338ca','#818cf8','#3730a3','#5561ea'], // indigo
    ];
  }

  // Interleave: all shade[0]s first, then all shade[1]s, etc.
  // → concepts 1-10 get one color from each hue group (maximally distinct)
  // → concepts 11-20 get a second shade of each hue, and so on
  const palette = [];
  const numShades = groups[0].length; // 5
  for (let s = 0; s < numShades; s++) {
    for (const group of groups) palette.push(group[s]);
  }
  return palette; // 50 colors
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

  // Envelope plugin — draws the concept-space boundary polygon via canvas directly.
  // Chart.js 4.x borderDash on radar datasets is unreliable; afterDraw is the safe approach.
  const envelopePlugin = {
    id: 'radarEnvelope',
    afterDraw(chart) {
      const scale = chart.scales.r;
      if (!scale) return;
      // Max score across ALL concepts (including datum) on each axis
      const envValues = allIlities.map(il => {
        const s = _tradeCalcScoreForIlity(il.id);
        return Math.max(...pughConcepts.map(c => s[c.id] ?? 50));
      });
      const { ctx } = chart;
      const points = envValues.map((val, i) => scale.getPointPositionForValue(i, val));
      if (!points.length) return;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath();
      ctx.strokeStyle = 'rgba(155,155,148,0.75)';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([5, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    },
  };

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
              return item.text !== 'Datum (50%)';
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
    plugins: [envelopePlugin],
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

window._tradeToggleConcept = function(idStr, val) {
  // Template literals always produce strings; look up the real ID from pughConcepts
  // so the Set holds the same native type used everywhere else (avoids '1' !== 1 mismatches).
  const concept = pughConcepts.find(c => String(c.id) === String(idStr));
  const id = concept ? concept.id : idStr;
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
