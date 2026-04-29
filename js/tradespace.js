// ============================================================
// tradespace.js — Tradespace Analysis page logic
// Depends on: state.js (pughConcepts, pughScores, requirements,
//             selectedIlities, pughSettings, window._pairWeights)
//             app.js (getIlityNameById)
// ============================================================

// ============================================================
// THEME-AWARE COLOR HELPER
// Mirrors the pattern from ui.js renderPughCharts().
// Chart.js doesn't support CSS variables; we resolve them here.
// ============================================================
function _tradeThemeColors() {
  const body    = document.body;
  const isDark  = body.classList.contains('theme-dark') || body.classList.contains('theme-red-black');
  const isEng   = body.classList.contains('theme-engineering');
  const isGreen = body.classList.contains('theme-green-yellow');
  // Text color
  const text  = isDark  ? '#e8e8e6'
               : isEng   ? '#0e1e0e'
               : isGreen ? '#1a1a18'
               :           '#1a1a18';
  // Muted text
  const muted = isDark  ? '#9a9a94'
               : isEng   ? '#2e5a2e'
               : isGreen ? '#4a5a48'
               :           '#6b6b65';
  const grid  = isDark  ? 'rgba(255,255,255,0.07)' : 'rgba(136,135,128,0.12)';
  return { text, muted, grid };
}

// ── Pre-assigned concept color palette (stable by concept index) ──
const TRADE_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // emerald
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#ec4899', // pink
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
  '#e11d48', // rose
  '#0ea5e9', // sky
];
const TRADE_DATUM_COLOR = '#f59e0b'; // amber — always datum

// ── Page state ──
let _tradeSelIlities    = [];          // array of ility IDs, 2–3
let _tradeSelConcepts   = new Set();   // highlighted concept IDs
let _tradeShowPareto    = true;
let _tradeShowDatum     = true;
let _tradeExpandedKey   = null;        // 'xId_yId' or null
let _tradeCharts        = {};          // Chart.js instances: 'tradeChart_xId_yId' → Chart
let _tradeRadar         = null;        // radar Chart.js instance
let _tradeConceptColors = {};          // conceptId → hex color

// ============================================================
// UTILITY SCORE CALCULATION
// Returns { ilityId: { conceptId: score 0–100 } }
// Datum is always 50 on every axis.
// ============================================================
function _tradeCalcScores() {
  const adv = pughSettings.advancedScoring && userTier !== 'free';
  const result = {};

  [...selectedIlities].forEach(ilId => {
    result[ilId] = {};
    const ilReqs = requirements.filter(r => r.primary === ilId);
    const N = ilReqs.length;
    if (N === 0) return;

    pughConcepts.forEach((c, i) => {
      if (i === 0) {
        // Datum is always 50% — it scores 0 relative to itself on every req
        result[ilId][c.id] = 50;
        return;
      }
      let sum = 0;
      ilReqs.forEach(req => {
        const raw = pughScores[c.id + '_' + req.id];
        if (raw === undefined || raw === null) return;
        if (adv) {
          sum += typeof raw === 'number' ? raw : 0;
        } else {
          if (raw === '+') sum += 1;
          else if (raw === '-') sum -= 1;
        }
      });
      const score = adv
        ? ((sum + 3 * N) / (6 * N)) * 100
        : ((sum + N) / (2 * N)) * 100;
      result[ilId][c.id] = Math.round(score * 10) / 10;
    });
  });

  return result;
}

// ============================================================
// ILITIES WITH SCORES
// Returns ilities that have ≥1 scored req in the pugh matrix.
// ============================================================
function _tradeIlitiesWithScores() {
  return [...selectedIlities]
    .filter(ilId => {
      const reqs = requirements.filter(r => r.primary === ilId);
      if (reqs.length === 0) return false;
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
// Priority: (1) highest pair weight, (2) most reqs,
//           (3) widest score range, (4) alphabetical
// ============================================================
function _tradeAutoPopulate(available) {
  const adv = pughSettings.advancedScoring && userTier !== 'free';
  const scored = available.map(il => {
    const reqs = requirements.filter(r => r.primary === il.id);
    const weight = window._pairWeights?.[il.id] || 1;
    const vals = pughConcepts.slice(1).map(c => {
      const N = reqs.length;
      if (N === 0) return 50;
      let sum = 0;
      reqs.forEach(req => {
        const raw = pughScores[c.id + '_' + req.id];
        if (raw === undefined || raw === null) return;
        if (adv) { sum += typeof raw === 'number' ? raw : 0; }
        else { if (raw === '+') sum += 1; else if (raw === '-') sum -= 1; }
      });
      return adv ? ((sum + 3*N)/(6*N))*100 : ((sum + N)/(2*N))*100;
    });
    const range = vals.length ? Math.max(...vals) - Math.min(...vals) : 0;
    return { id: il.id, name: il.name, weight, reqs: reqs.length, range };
  });

  scored.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    if (b.reqs   !== a.reqs  ) return b.reqs   - a.reqs;
    if (Math.abs(b.range - a.range) > 0.01) return b.range - a.range;
    return a.name.localeCompare(b.name);
  });

  return scored.slice(0, 3).map(s => s.id);
}

// ============================================================
// PARETO FRONT
// ============================================================
function _tradeParetoFront(pts, xk, yk) {
  return pts.filter(p =>
    !pts.some(q =>
      q !== p &&
      q[xk] >= p[xk] && q[yk] >= p[yk] &&
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
    ...(typeof ILITIES !== 'undefined' ? ILITIES : []),
    ...(typeof customIlities !== 'undefined' ? customIlities : []),
  ];
  return all.find(il => il.id === id)?.name || id;
}

function _tradeEsc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function _tradeHexToRgba(hex, a) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}

function _tradeDestroyAllCharts() {
  Object.values(_tradeCharts).forEach(ch => { try { ch.destroy(); } catch(e) {} });
  _tradeCharts = {};
  if (_tradeRadar) { try { _tradeRadar.destroy(); } catch(e) {} _tradeRadar = null; }
}

// ============================================================
// MAIN ENTRY POINT — called by switchPage('trade')
// ============================================================
function renderTradespace() {
  const emptyEl   = document.getElementById('tradeEmptyState');
  const contentEl = document.getElementById('tradeContent');
  if (!emptyEl || !contentEl) return;

  // Need ≥2 concepts (datum + 1) and ≥2 ilities with scores
  const available = _tradeIlitiesWithScores();
  if (available.length < 2 || pughConcepts.length < 2) {
    emptyEl.style.display   = '';
    contentEl.style.display = 'none';
    _tradeDestroyAllCharts();
    return;
  }

  emptyEl.style.display   = 'none';
  contentEl.style.display = '';

  // Assign stable colors by concept index (0 = datum = amber)
  _tradeConceptColors = {};
  pughConcepts.forEach((c, i) => {
    _tradeConceptColors[c.id] = (i === 0)
      ? TRADE_DATUM_COLOR
      : TRADE_COLORS[(i - 1) % TRADE_COLORS.length];
  });

  // Auto-populate ility dropdowns if empty or stale
  const validIds = available.map(il => il.id);
  const stale = _tradeSelIlities.some(id => !validIds.includes(id));
  if (_tradeSelIlities.length === 0 || stale) {
    _tradeSelIlities = _tradeAutoPopulate(available);
  }

  // Default: all concepts selected
  if (_tradeSelConcepts.size === 0) {
    pughConcepts.forEach(c => _tradeSelConcepts.add(c.id));
  }

  _tradeRenderIlityDropdowns(available);
  _tradeRenderConceptPanel();
  _tradeDestroyAllCharts();
  _tradeRenderScatterCharts();
  _tradeRenderRadar();
}

// ============================================================
// ILITY DROPDOWNS
// ============================================================
function _tradeRenderIlityDropdowns(available) {
  const container = document.getElementById('tradeIlityDropdowns');
  if (!container) return;

  container.innerHTML = '';
  const labels = ['X', 'Y', 'Z'];

  labels.forEach((label, slot) => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:6px';

    const lbl = document.createElement('span');
    lbl.style.cssText = 'font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted)';
    lbl.textContent = label;

    const sel = document.createElement('select');
    sel.className = 'req-select';
    sel.style.cssText = 'min-width:150px;font-size:13px';
    sel.id = 'tradeIlitySel' + slot;

    // Slot 1 and 2 get a blank/optional option
    if (slot >= 1) {
      const blank = document.createElement('option');
      blank.value = '';
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
  const sels = [0, 1, 2]
    .map(i => document.getElementById('tradeIlitySel' + i))
    .filter(Boolean);
  _tradeSelIlities = sels.map(s => s.value).filter(Boolean);
  _tradeEnforceMutualExclusion();
  _tradeExpandedKey = null; // reset any expanded chart
  _tradeDestroyAllCharts();
  _tradeRenderScatterCharts();
  _tradeRenderRadar();
}

function _tradeEnforceMutualExclusion() {
  const sels = [0, 1, 2]
    .map(i => document.getElementById('tradeIlitySel' + i))
    .filter(Boolean);
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
// ============================================================
function _tradeRenderConceptPanel() {
  const list = document.getElementById('tradeConceptList');
  if (!list) return;

  let html = '';

  // Pareto + datum controls at top
  html += `
    <div style="border-bottom:1px solid var(--border);padding-bottom:8px;margin-bottom:8px;display:flex;flex-direction:column;gap:3px">
      <label style="display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;padding:3px 0">
        <input type="checkbox" id="tradeParetoChk" ${_tradeShowPareto ? 'checked' : ''}
               onchange="window._tradeTogglePareto(this.checked)"
               style="accent-color:var(--accent)">
        <span style="width:10px;height:2px;background:#1d9e75;display:inline-block;flex-shrink:0;border-radius:1px"></span>
        <span style="font-weight:600;color:#1d9e75;font-size:12px">Pareto Front</span>
      </label>
      <label style="display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;padding:3px 0">
        <input type="checkbox" id="tradeDatumChk" ${_tradeShowDatum ? 'checked' : ''}
               onchange="window._tradeToggleDatum(this.checked)"
               style="accent-color:var(--accent)">
        <span style="width:10px;height:10px;background:${TRADE_DATUM_COLOR};display:inline-block;flex-shrink:0;border-radius:2px;transform:rotate(45deg)"></span>
        <span style="font-weight:600;color:${TRADE_DATUM_COLOR};font-size:12px">Datum</span>
      </label>
    </div>
  `;

  // All concepts (skip datum — handled above via datum toggle)
  pughConcepts.forEach((c, i) => {
    if (i === 0) return; // datum handled separately
    const color = _tradeConceptColors[c.id] || '#888';
    const sel   = _tradeSelConcepts.has(c.id);
    const name  = c.name || ('Concept ' + c.id);
    html += `
      <label style="display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;padding:3px 0;line-height:1.3">
        <input type="checkbox" ${sel ? 'checked' : ''}
               onchange="window._tradeToggleConcept('${c.id}', this.checked)"
               style="accent-color:${color}">
        <span style="width:10px;height:10px;border-radius:50%;background:${color};display:inline-block;flex-shrink:0"></span>
        <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:142px" title="${_tradeEsc(name)}">${_tradeEsc(name)}</span>
      </label>
    `;
  });

  list.innerHTML = html;
}

// ============================================================
// SCATTER CHARTS
// ============================================================
function _tradePairs() {
  const ils = _tradeSelIlities;
  if (ils.length < 2) return [];
  const pairs = [];
  for (let i = 0; i < ils.length; i++) {
    for (let j = i + 1; j < ils.length; j++) {
      pairs.push([ils[i], ils[j]]);
    }
  }
  return pairs;
}

function _tradeRenderScatterCharts() {
  const grid = document.getElementById('tradeScatterGrid');
  if (!grid) return;

  const pairs = _tradePairs();
  if (pairs.length === 0) { grid.innerHTML = ''; return; }

  // Grid layout: 1 pair → 1col; 3 pairs → 2col L-pattern
  grid.style.gridTemplateColumns = pairs.length === 1 ? '1fr' : '1fr 1fr';

  const scores = _tradeCalcScores();

  // Build card HTML
  grid.innerHTML = pairs.map(([xId, yId]) => {
    const xName  = _tradeGetIlityName(xId);
    const yName  = _tradeGetIlityName(yId);
    const cardId = 'tradeCard_' + xId + '_' + yId;
    const isExp  = _tradeExpandedKey === xId + '_' + yId;
    const expandIcon = isExp ? '⤡' : '⤢';
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
            ${expandIcon}
          </button>
        </div>
        <div style="position:relative;height:${isExp ? '400px' : '220px'}" id="tradeWrap_${xId}_${yId}">
          <canvas id="tradeChart_${xId}_${yId}"></canvas>
        </div>
      </div>
    `;
  }).join('');

  // Hide non-expanded cards if one is expanded
  if (_tradeExpandedKey) {
    pairs.forEach(([xId, yId]) => {
      const card = document.getElementById('tradeCard_' + xId + '_' + yId);
      if (card) card.style.display = (xId + '_' + yId === _tradeExpandedKey) ? '' : 'none';
    });
    const radarCard = document.getElementById('tradeRadarCard');
    if (radarCard) radarCard.style.display = 'none';
  }

  // Draw each chart
  pairs.forEach(([xId, yId]) => {
    _tradeDrawScatter(xId, yId, scores);
  });
}

function _tradeDrawScatter(xId, yId, scores) {
  const canvasId = 'tradeChart_' + xId + '_' + yId;
  const canvas   = document.getElementById(canvasId);
  if (!canvas) return;

  if (_tradeCharts[canvasId]) {
    try { _tradeCharts[canvasId].destroy(); } catch(e) {}
    delete _tradeCharts[canvasId];
  }

  const xName = _tradeGetIlityName(xId);
  const yName = _tradeGetIlityName(yId);

  // Build point array for all concepts
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

  // Unselected non-datum concepts → gray
  const unselected = allPts.filter(p => !p.isDatum && !_tradeSelConcepts.has(p.id));
  if (unselected.length) {
    datasets.push({
      label:           '__unselected__',
      data:            unselected.map(p => ({ x: p.x, y: p.y, _name: p.name })),
      backgroundColor: 'rgba(155,155,148,0.35)',
      borderColor:     'rgba(155,155,148,0.5)',
      borderWidth:     1,
      pointRadius:     5,
      pointHoverRadius:7,
    });
  }

  // Selected non-datum concepts → individual colors
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

  // Datum → amber diamond (only when _tradeShowDatum)
  if (_tradeShowDatum) {
    datasets.push({
      label:           datumPt.name,
      data:            [{ x: datumPt.x, y: datumPt.y, _name: datumPt.name }],
      backgroundColor: TRADE_DATUM_COLOR,
      borderColor:     TRADE_DATUM_COLOR,
      borderWidth:     2,
      pointRadius:     8,
      pointHoverRadius:10,
      pointStyle:      'rectRot', // diamond
    });
  }

  // ── Quadrant plugin ──
  // Upper-right shading always on (it's structural, anchored at datum position)
  // Quadrant crosshairs only when datum is shown
  const qPlugin = {
    id: 'quad_' + xId + '_' + yId,
    afterDraw(ch) {
      const { ctx, scales: { x, y }, chartArea: a } = ch;
      const px = x.getPixelForValue(dx);
      const py = y.getPixelForValue(dy);
      ctx.save();
      // Always: upper-right green tint
      ctx.fillStyle = 'rgba(29,158,117,0.055)';
      ctx.fillRect(px, a.top, a.right - px, py - a.top);
      // Only when datum visible: crosshair lines
      if (_tradeShowDatum) {
        ctx.strokeStyle = 'rgba(136,135,128,0.28)';
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(px, a.top); ctx.lineTo(px, a.bottom); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(a.left, py); ctx.lineTo(a.right, py); ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    },
  };

  // ── Pareto front plugin ──
  const pfPlugin = {
    id: 'pf_' + xId + '_' + yId,
    afterDraw(ch) {
      if (!_tradeShowPareto) return;
      const nonDatum = allPts.filter(p => !p.isDatum);
      const front    = _tradeParetoFront(nonDatum, 'x', 'y');
      if (!front.length) return;

      // Deduplicate identical coordinates
      const seen = new Set();
      const s = [...front]
        .sort((a, b) => a.x - b.x)
        .filter(p => {
          const k = p.x + '|' + p.y;
          return seen.has(k) ? false : (seen.add(k), true);
        });

      const { ctx, scales: { x, y }, chartArea: a } = ch;
      ctx.save();
      ctx.strokeStyle = 'rgba(29,158,117,0.85)';
      ctx.lineWidth   = 2;
      ctx.setLineDash([5, 4]);
      ctx.lineJoin    = 'round';
      ctx.lineCap     = 'round';
      ctx.beginPath();
      // Start: from Y axis at height of first (leftmost) Pareto point
      ctx.moveTo(a.left, y.getPixelForValue(s[0].y));
      // Draw through each unique Pareto point
      s.forEach(p => ctx.lineTo(x.getPixelForValue(p.x), y.getPixelForValue(p.y)));
      // End: drop down to X axis at x of last (rightmost) Pareto point
      ctx.lineTo(x.getPixelForValue(s[s.length - 1].x), a.bottom);
      ctx.stroke();
      ctx.restore();
    },
  };

  const tc = _tradeThemeColors();
  const chart = new Chart(canvas, {
    type: 'scatter',
    data: { datasets },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation:           { duration: 180 },
      scales: {
        x: {
          min: 0, max: 100,
          title: {
            display: true,
            text:    xName + ' Utility (%)',
            font:    { size: 11 },
            color:   tc.muted,
          },
          ticks: { font: { size: 10 }, color: tc.muted },
          grid:  { color: tc.grid },
        },
        y: {
          min: 0, max: 100,
          title: {
            display: true,
            text:    yName + ' Utility (%)',
            font:    { size: 11 },
            color:   tc.muted,
          },
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
// ============================================================
window._tradeToggleExpand = function(xId, yId) {
  const key       = xId + '_' + yId;
  const radarCard = document.getElementById('tradeRadarCard');

  if (_tradeExpandedKey === key) {
    // Shrink — restore all
    _tradeExpandedKey = null;
    document.querySelectorAll('.trade-chart-card').forEach(c => { c.style.display = ''; });
    if (radarCard) radarCard.style.display = '';
    // Restore chart wrap heights and resize
    const pairs = _tradePairs();
    pairs.forEach(([x, y]) => {
      const wrap = document.getElementById('tradeWrap_' + x + '_' + y);
      if (wrap) wrap.style.height = '220px';
      const btn  = document.getElementById('tradeExpBtn_' + x + '_' + y);
      if (btn) { btn.textContent = '⤢'; btn.title = 'Expand chart'; }
    });
    Object.values(_tradeCharts).forEach(ch => { try { ch.resize(); } catch(e) {} });
    if (_tradeRadar) { try { _tradeRadar.resize(); } catch(e) {} }
  } else {
    // Expand this chart
    _tradeExpandedKey = key;
    document.querySelectorAll('.trade-chart-card').forEach(c => {
      c.style.display = (c.id === 'tradeCard_' + key) ? '' : 'none';
    });
    if (radarCard) radarCard.style.display = 'none';
    const wrap = document.getElementById('tradeWrap_' + xId + '_' + yId);
    if (wrap) wrap.style.height = '420px';
    const btn = document.getElementById('tradeExpBtn_' + xId + '_' + yId);
    if (btn) { btn.textContent = '⤡'; btn.title = 'Shrink chart'; }
    const ch = _tradeCharts['tradeChart_' + xId + '_' + yId];
    if (ch) { try { ch.resize(); } catch(e) {} }
  }
};

// ============================================================
// RADAR CHART
// ============================================================
function _tradeRenderRadar() {
  const msgEl  = document.getElementById('tradeRadarMsg');
  const wrapEl = document.getElementById('tradeRadarWrap');
  if (!msgEl || !wrapEl) return;

  if (_tradeExpandedKey) {
    // Radar hidden when a scatter chart is expanded
    msgEl.style.display  = 'none';
    wrapEl.style.display = 'none';
    return;
  }

  if (_tradeSelIlities.length < 3) {
    msgEl.style.display  = '';
    wrapEl.style.display = 'none';
    if (_tradeRadar) { try { _tradeRadar.destroy(); } catch(e) {} _tradeRadar = null; }
    return;
  }

  msgEl.style.display  = 'none';
  wrapEl.style.display = '';

  if (_tradeRadar) { try { _tradeRadar.destroy(); } catch(e) {} _tradeRadar = null; }

  const canvas = document.getElementById('tradeRadarCanvas');
  if (!canvas) return;

  const scores  = _tradeCalcScores();
  const ils     = _tradeSelIlities;
  const labels  = ils.map(id => _tradeGetIlityName(id));

  const datasets = [];

  // Concept space envelope — dotted gray boundary at max score per axis
  datasets.push({
    label:           'Concept Space',
    data:            ils.map(ilId => Math.max(...pughConcepts.map(c => scores[ilId]?.[c.id] ?? 50))),
    borderColor:     'rgba(155,155,148,0.55)',
    backgroundColor: 'rgba(0,0,0,0)',
    borderWidth:     1.5,
    borderDash:      [4, 3],
    pointRadius:     0,
    pointHitRadius:  0,
    order:           99,
  });

  // Datum ring at 50% on every spoke (always shown regardless of datum toggle)
  datasets.push({
    label:           'Datum (50%)',
    data:            ils.map(() => 50),
    borderColor:     TRADE_DATUM_COLOR,
    backgroundColor: _tradeHexToRgba(TRADE_DATUM_COLOR, 0.05),
    borderWidth:     1.5,
    borderDash:      [3, 3],
    pointRadius:     0,
    pointHitRadius:  0,
    order:           98,
  });

  // Selected non-datum concepts
  pughConcepts
    .filter((c, i) => i > 0 && _tradeSelConcepts.has(c.id))
    .forEach((c, i) => {
      const color = _tradeConceptColors[c.id] || '#888';
      datasets.push({
        label:              c.name || ('Concept ' + c.id),
        data:               ils.map(ilId => scores[ilId]?.[c.id] ?? 50),
        borderColor:        color,
        backgroundColor:    _tradeHexToRgba(color, 0.1),
        borderWidth:        2,
        pointRadius:        3,
        pointBackgroundColor: color,
        order:              i,
      });
    });

  const rtc = _tradeThemeColors();
  _tradeRadar = new Chart(canvas, {
    type: 'radar',
    data: { labels, datasets },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      animation:           { duration: 180 },
      scales: {
        r: {
          min: 0, max: 100,
          ticks: {
            stepSize:        25,
            font:            { size: 9 },
            color:           rtc.muted,
            backdropColor:   'transparent',
          },
          pointLabels: {
            font:  { size: 12, weight: '600' },
            color: rtc.text,
          },
          grid:       { color: rtc.grid },
          angleLines: { color: rtc.grid },
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
              // Hide the envelope from the legend (it's structural, not a concept)
              return item.text !== 'Concept Space';
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
// RE-RENDER ON THEME CHANGE
// Called by setTheme() in app.js if tradespace is the active page.
// ============================================================
function _tradeOnThemeChange() {
  if (typeof _currentPage !== 'undefined' && _currentPage === 'trade') {
    _tradeDestroyAllCharts();
    _tradeRenderScatterCharts();
    _tradeRenderRadar();
  }
}

// ============================================================
// TOGGLE HANDLERS (exposed on window for inline onclick)
// ============================================================
window._tradeTogglePareto = function(val) {
  _tradeShowPareto = val;
  Object.values(_tradeCharts).forEach(ch => { try { ch.update(); } catch(e) {} });
};

window._tradeToggleDatum = function(val) {
  _tradeShowDatum = val;
  // Redraw scatter charts (datum dot + crosshairs both driven by this flag)
  const scores = _tradeCalcScores();
  const pairs  = _tradePairs();
  pairs.forEach(([xId, yId]) => _tradeDrawScatter(xId, yId, scores));
};

window._tradeToggleConcept = function(id, val) {
  if (val) _tradeSelConcepts.add(id);
  else     _tradeSelConcepts.delete(id);
  // Redraw scatter charts
  const scores = _tradeCalcScores();
  const pairs  = _tradePairs();
  pairs.forEach(([xId, yId]) => _tradeDrawScatter(xId, yId, scores));
  // Redraw radar
  _tradeRenderRadar();
};

// ============================================================
// REPORT EXPORT INTEGRATION
// getTradespaceReportData() is called by generateReport() in app.js
// when the rptTRADE checkbox is checked.
// Returns array of { title, dataUrl } for embedding in the PDF.
// ============================================================
function getTradespaceReportData() {
  const out = [];
  const pairs = _tradePairs();
  pairs.forEach(([xId, yId]) => {
    const ch = _tradeCharts['tradeChart_' + xId + '_' + yId];
    if (!ch) return;
    out.push({
      title:   _tradeGetIlityName(yId) + ' vs ' + _tradeGetIlityName(xId),
      dataUrl: ch.canvas.toDataURL('image/png'),
    });
  });
  if (_tradeRadar) {
    out.push({
      title:   'Radar Chart',
      dataUrl: _tradeRadar.canvas.toDataURL('image/png'),
    });
  }
  return out;
}
