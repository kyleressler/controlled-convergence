// ============================================================
// ui.js — All render* and update* display functions
// Reads from state.js global variables; never mutates core state.
// Called by app.js event handlers after state changes.
// ============================================================


// ── Sidebar slides ───────────────────────────────────────────

  function renderSlides() {
    const s = slides[currentSlide];
    let html = `<div class="slide-number">Slide ${currentSlide + 1} of ${slides.length}</div>`;
    html += `<div class="slide-card">`;
    html += `<div class="slide-title">${s.title}</div>`;
    html += `<div class="slide-body">${s.body}</div>`;
    if (s.bad) {
      html += `<div class="slide-example bad"><div class="slide-example-label">✗ ${s.bad.label}</div>${s.bad.text}</div>`;
    }
    if (s.good) {
      html += `<div class="slide-example good"><div class="slide-example-label">✓ ${s.good.label}</div>${s.good.text}</div>`;
    }
    html += `<div class="slide-nav">`;
    html += `<button class="slide-nav-btn" onclick="changeSlide(-1)" ${currentSlide === 0 ? 'disabled' : ''}>‹</button>`;
    html += `<div class="slide-dots">` + slides.map((_, i) =>
      `<div class="slide-dot ${i === currentSlide ? 'active' : ''}" onclick="goToSlide(${i})"></div>`
    ).join('') + `</div>`;
    html += `<button class="slide-nav-btn" onclick="changeSlide(1)" ${currentSlide === slides.length - 1 ? 'disabled' : ''}>›</button>`;
    html += `</div></div>`;
    document.getElementById('slideContainer').innerHTML = html;
  }

  function changeSlide(dir) {
    currentSlide = Math.max(0, Math.min(slides.length - 1, currentSlide + dir));
    renderSlides();
  }

  function goToSlide(i) { currentSlide = i; renderSlides(); }



// ── Goal statement preview / Account status ──────────────────

  function updatePreview() {
    const showPreview = true;
    const banner = document.getElementById('previewBanner');

    if (!showPreview) { banner.classList.remove('visible'); return; }

    const to = document.getElementById('input-to').value.trim();
    const by = document.getElementById('input-by').value.trim();
    const using = document.getElementById('input-using').value.trim();
    const wh = document.getElementById('input-while').value.trim();

    if (!to && !by && !using && !wh) { banner.classList.remove('visible'); return; }

    let html = '';
    if (to) html += `<span class="preview-kw pkw-to">TO</span>${to} `;
    if (by) html += `<span class="preview-kw pkw-by">BY</span>${by} `;
    if (using) html += `<span class="preview-kw pkw-using">USING</span>${using} `;
    if (wh) html += `<span class="preview-kw pkw-while">WHILE</span>${wh}`;

    banner.innerHTML = html;
    banner.classList.add('visible');
  }

  function updateAccountStatus() {
    const badge     = document.getElementById('accountTierBadge');
    const cta       = document.getElementById('accountCtaBtn');
    const nameEl    = document.getElementById('sidebarProfileName');
    const logoutBtn = document.getElementById('logoutBtn');
    if (!badge || !cta) return;

    const isSignedIn = !!(appState && appState.currentUser);

    // Tier badge
    badge.className   = 'account-tier-badge tier-' + userTier;
    badge.textContent = userTier === 'free' ? 'Free' : userTier === 'member' ? 'Member' : 'Pro';

    // CTA button — changes based on signed-in state and tier
    if (!isSignedIn) {
      cta.textContent   = 'Create Free Member Account';
      cta.style.display = '';
    } else if (userTier === 'member') {
      cta.textContent   = 'Upgrade to Pro';
      cta.style.display = '';
    } else {
      cta.style.display = 'none';
    }

    // Sidebar profile name
    if (nameEl) {
      nameEl.textContent = isSignedIn
        ? (appState.currentUser.name || appState.currentUser.email)
        : 'Not signed in';
    }

    // Logout button — enabled only when signed in
    if (logoutBtn) {
      if (isSignedIn) {
        logoutBtn.style.opacity = '1';
        logoutBtn.style.cursor  = 'pointer';
        logoutBtn.title = '';
      } else {
        logoutBtn.style.opacity = '0.5';
        logoutBtn.style.cursor  = 'not-allowed';
        logoutBtn.title = 'Sign in first';
      }
    }

    // Floating login button — visible only when signed out
    const floatingBtn = document.getElementById('floatingLoginBtn');
    if (floatingBtn) {
      floatingBtn.style.display = isSignedIn ? 'none' : 'flex';
    }
  }


// ── Report helpers / Nav project name ────────────────────────

  function rptSection(num, title, content) {
    return `<div class="section">
      <div class="section-header">
        <span class="section-num">SECTION ${num}</span>
        <span class="section-title">${title}</span>
      </div>
      ${content}
    </div>`;
  }

  function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function updateNavProjectName() {
    const wrap = document.getElementById('navProjectName');
    const text = document.getElementById('navProjectNameText');
    if (!wrap || !text) return;
    if (activeProject && activeProject.name) {
      text.textContent = activeProject.name;
      wrap.style.display = 'flex';
    } else {
      wrap.style.display = 'none';
    }
  }


// ── Project page renders ──────────────────────────────────────

  function renderProjPage() {
    updateProjTierNote();
    renderProjList();
    renderTemplateList && renderTemplateList();
    updateProjAdvisor();
    const banner = document.getElementById('projActiveBanner');
    const activeNameEl = document.getElementById('projActiveName');
    const activeMetaEl = document.getElementById('projActiveMeta');
    const activeDescEl = document.getElementById('projActiveDesc');
    if (activeProject && banner) {
      banner.style.display = '';
      if (activeNameEl) activeNameEl.textContent = activeProject.name;
      const ownerPart = activeProject.owner ? ' · ' + activeProject.owner : '';
      if (activeMetaEl) activeMetaEl.textContent = 'Started ' + new Date(activeProject.createdAt).toLocaleDateString() + ownerPart;
      if (activeDescEl) activeDescEl.textContent = activeProject.description || '';
    } else if (banner) {
      banner.style.display = 'none';
    }
  }

  function updateProjTierNote() {
    const note = document.getElementById('projTierNote');
    if (!note) return;
    if (userTier === 'free') {
      note.textContent = 'Free tier: Your project runs in-session only. Use Export Project Data to save your work. Sign up for a free account to save up to 3 projects.';
    } else if (userTier === 'member') {
      note.textContent = 'Member tier: ' + savedProjects.length + ' of 3 projects saved. Upgrade to Pro for up to 50 projects.';
    } else {
      note.textContent = 'Pro tier: Up to 50 projects. Collaboration features coming soon.';
    }
  }

  function renderProjList() {
    const list = document.getElementById('projList');
    const note = document.getElementById('projSaveNote');
    if (!list) return;
    if (userTier === 'free') {
      list.innerHTML = '';
      if (note) note.innerHTML = '<button class="btn btn-primary" style="margin-top:4px" onclick="handleAccountCTA()">Create a Free Member Account</button>';
      return;
    }
    if (note) note.innerHTML = '';
    if (savedProjects.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-light);font-size:13px">No saved projects yet. Create one above.</div>';
      return;
    }
    list.innerHTML = savedProjects.map(p => `
      <div class="proj-item" onclick="loadProject('${p.id}')" ondblclick="event.stopPropagation();editProject('${p.id}')" title="Click to activate · Double-click to edit">
        <div style="flex:1;min-width:0">
          <div class="proj-item-name">${p.name}</div>
          ${p.description ? `<div style="font-size:12px;color:var(--text-light);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.description}</div>` : ''}
          <div class="proj-item-meta">${new Date(p.createdAt).toLocaleDateString()}${p.owner ? ' · ' + p.owner : ''}</div>
        </div>
        <button class="proj-item-delete" onclick="event.stopPropagation();deleteProject('${p.id}')" title="Delete">×</button>
      </div>`).join('');
  }

  function updateProjAdvisor() {
    const msg = document.getElementById('projTierMsg');
    if (!msg) return;
    if (userTier === 'free') {
      msg.innerHTML = '<strong>Free tier:</strong> Your work is not automatically saved. Use <em>Export Project Data</em> in the sidebar to download a JSON file you can re-upload in a future session. Creating a free account unlocks saving up to 3 projects — no credit card required.';
    } else if (userTier === 'member') {
      msg.innerHTML = '<strong>Member tier:</strong> You can save up to 3 projects. You\'re using ' + savedProjects.length + ' of 3. Upgrade to Pro for up to 50 projects and future collaboration features.';
    } else {
      msg.innerHTML = '<strong>Pro tier:</strong> Up to 50 saved projects. Collaboration features — inviting team members to review and contribute — are on the roadmap.';
    }
  }

  function checkContinue() {
    const to = document.getElementById('input-to').value.trim();
    const by = document.getElementById('input-by').value.trim();
    const using = document.getElementById('input-using').value.trim();
    const wh = document.getElementById('input-while').value.trim();

    const allFilled = to && by && using && wh;
    const toCheck = checkTo(to);
    const toOk = !toCheck || toCheck.type === 'success';

    document.getElementById('btnContinue').disabled = !(allFilled && toOk);
  }


// ── Ility page renders ────────────────────────────────────────

  function renderIlityGrid() {
    const grid = document.getElementById('ilityGrid');
    const all = [...ILITIES, ...customIlities];
    // Sort by user-defined order; unordered items go at the end
    all.sort((a, b) => {
      const ai = ilityOrder.indexOf(a.id);
      const bi = ilityOrder.indexOf(b.id);
      return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
    });
    grid.innerHTML = all.map(il => `
      <div class="ility-chip ${selectedIlities.has(il.id) ? 'selected' : ''}"
           draggable="true"
           id="chip-${il.id}"
           data-id="${il.id}"
           onclick="toggleIlity('${il.id}')"
           ondblclick="event.stopPropagation();openEditModal('ility','${il.id}')"
           ondragstart="cardDragStart(event,'${il.id}','ility')"
           ondragover="cardDragOver(event,'${il.id}','ility')"
           ondrop="cardDrop(event,'${il.id}','ility')"
           ondragend="cardDragEnd(event,'ility')"
           title="Drag to reorder · Double-click to edit">
        <div class="chip-drag-handle" aria-hidden="true"
             ontouchstart="cardTouchStart(event,'${il.id}','ility')"
             ontouchend="cardTouchEnd(event,'${il.id}','ility')">⠿</div>
        <div class="ility-chip-name">${il.name}</div>
        <div class="ility-chip-desc">${il.desc}</div>
      </div>`).join('');
    document.getElementById('ilityCount').textContent = selectedIlities.size;
    document.getElementById('btnIlityContinue').disabled = selectedIlities.size < 3;
    updateIlityAdvisor();
  }

  function updateIlityAdvisor() { /* AI coaching reserved */ }



// ── Stakeholder page renders ──────────────────────────────────

  function renderStakGrid() {
    const grid = document.getElementById('stakGrid');
    if (!grid) return;
    const all = [...STAKEHOLDERS, ...customStakeholders];
    // Sort by user-defined order; unordered items go at the end
    all.sort((a, b) => {
      const ai = stakOrder.indexOf(a.id);
      const bi = stakOrder.indexOf(b.id);
      return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
    });
    grid.innerHTML = all.map(s => `
      <div class="stak-chip ${selectedStakeholders.has(s.id) ? 'selected' : ''}"
           draggable="true"
           id="stak-chip-${s.id}"
           data-id="${s.id}"
           onclick="toggleStak('${s.id}')"
           ondblclick="event.stopPropagation();openEditModal('stak','${s.id}')"
           ondragstart="cardDragStart(event,'${s.id}','stak')"
           ondragover="cardDragOver(event,'${s.id}','stak')"
           ondrop="cardDrop(event,'${s.id}','stak')"
           ondragend="cardDragEnd(event,'stak')"
           title="Drag to reorder · Double-click to edit">
        <div class="chip-drag-handle" aria-hidden="true"
             ontouchstart="cardTouchStart(event,'${s.id}','stak')"
             ontouchend="cardTouchEnd(event,'${s.id}','stak')">⠿</div>
        <div class="stak-chip-name">${s.name}</div>
        <div class="stak-chip-desc">${s.desc}</div>
      </div>`).join('');
    const count = document.getElementById('stakCount');
    if (count) count.textContent = selectedStakeholders.size;
    const cont = document.getElementById('btnStakContinue');
    if (cont) cont.disabled = selectedStakeholders.size < 1;
    updateStakAdvisor();
  }

  function updateStakAdvisor() { /* AI coaching reserved */ }



// ── Requirements page renders ─────────────────────────────────

  function populateReqForms() {
    const allIlities = [...ILITIES, ...customIlities]
      .filter(il => selectedIlities.has(il.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    const allStakeholders = [...STAKEHOLDERS, ...customStakeholders]
      .filter(s => selectedStakeholders.has(s.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    function fillSelect(id, items, label, addBlank) {
      const el = document.getElementById(id);
      if (!el) return;
      const cur = el.value;
      const blank = addBlank ? `<option value="">${label}</option>` : `<option value="">${label}</option>`;
      el.innerHTML = blank + items.map(it => `<option value="${it.id}" ${cur === it.id ? 'selected' : ''}>${it.name}</option>`).join('');
    }

    fillSelect('reqPrimaryIlity',       allIlities,       '— select —', false);
    fillSelect('reqSecondaryIlity',     allIlities,       '(none)',      true);
    fillSelect('reqPrimaryStakeholder', allStakeholders,  '— select —',  false);
    fillSelect('reqSecondaryStakeholder', allStakeholders, '(none)',    true);
    // Sync secondaries in case a primary is already set (e.g. when editing)
    syncReqSecondary('ility');
    syncReqSecondary('stak');
  }

  function renderRequirements() {
    const list = document.getElementById('reqList');
    const empty = document.getElementById('reqEmpty');
    if (requirements.length === 0) {
      list.innerHTML = '';
      list.appendChild(empty);
      empty.style.display = '';
    } else {
      empty.style.display = 'none';
      list.innerHTML = requirements.map(r => `
        <div class="req-item" ondblclick="editRequirement(${r.id})" title="Double-click to edit" style="cursor:default">
          <div class="req-item-header">
            <span class="req-type-badge badge-${r.type}">${r.type === 'willnot' ? 'WILL NOT' : r.type === 'mustnot' ? 'MUST NOT' : r.type.toUpperCase()}</span>
            <span class="req-item-text">${r.text}</span>
            <button class="req-item-delete" onclick="event.stopPropagation();deleteRequirement(${r.id})" title="Delete">×</button>
          </div>
          <div class="req-item-tags">
            <span class="req-tag req-tag-primary">${getIlityName(r.primary)}</span>
            ${r.secondaries.map(s => `<span class="req-tag req-tag-secondary">${getIlityName(s)}</span>`).join('')}
            ${r.stakeholders.map(s => `<span class="req-tag req-tag-stakeholder">${getStakeholderName(s)}</span>`).join('')}
          </div>
        </div>`).join('');
      list.appendChild(empty);
    }

    renderChart();
    updateReqAdvisor();
    document.getElementById('btnReqContinue').disabled = requirements.length < 3;
  }

  function renderChart() {
    renderIlityChart();
    renderStakChart();
  }

  function renderIlityChart() {
    const chart = document.getElementById('reqChartIlity');
    if (!chart) return;
    const all = [...ILITIES, ...customIlities]
      .filter(il => selectedIlities.has(il.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (all.length === 0) {
      chart.innerHTML = '<div style="font-size:12px;color:var(--text-light)">Select ilities first.</div>';
      return;
    }

    const counts = {};
    all.forEach(il => { counts[il.id] = 0; });
    requirements.forEach(r => {
      if (counts[r.primary] !== undefined) counts[r.primary]++;
      r.secondaries.forEach(s => { if (counts[s] !== undefined) counts[s]++; });
    });

    const max = Math.max(...Object.values(counts), 1);
    const total = requirements.length;

    chart.innerHTML = all.map(il => {
      const count = counts[il.id] || 0;
      const pct = Math.round((count / max) * 100);
      const concentrated = total > 0 && count / total > 0.45;
      return `
        <div class="req-bar-row">
          <div class="req-bar-label" title="${il.name}">${il.name}</div>
          <div class="req-bar-track">
            <div class="req-bar-fill ${concentrated ? 'concentrated' : ''}" style="width:${pct}%"></div>
          </div>
          <div class="req-bar-count">${count}</div>
        </div>`;
    }).join('');
  }

  function renderStakChart() {
    const chart = document.getElementById('reqChartStak');
    if (!chart) return;
    const all = [...STAKEHOLDERS, ...customStakeholders]
      .filter(s => selectedStakeholders.has(s.id))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (all.length === 0) {
      chart.innerHTML = '<div style="font-size:12px;color:var(--text-light)">Select stakeholders first.</div>';
      return;
    }

    const counts = {};
    all.forEach(s => { counts[s.id] = 0; });
    requirements.forEach(r => {
      r.stakeholders.forEach(sid => { if (counts[sid] !== undefined) counts[sid]++; });
    });

    const max = Math.max(...Object.values(counts), 1);

    chart.innerHTML = all.map(s => {
      const count = counts[s.id] || 0;
      const pct = Math.round((count / max) * 100);
      return `
        <div class="req-bar-row">
          <div class="req-bar-label" title="${s.name}">${s.name}</div>
          <div class="req-bar-track">
            <div class="req-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="req-bar-count">${count}</div>
        </div>`;
    }).join('');
  }

  function updateReqAdvisor() { /* AI coaching reserved */ }



// ── Nav completion ────────────────────────────────────────────

  function updateNavCompletion() {
    document.querySelectorAll('.nav-tool[data-page]').forEach(btn => {
      if (_completedPages.has(btn.dataset.page)) {
        btn.classList.add('completed');
      } else {
        btn.classList.remove('completed');
      }
    });
  }


// ── Pairwise page renders ─────────────────────────────────────

  function renderPairCard() {
    const emptyMsg    = document.getElementById('pairEmptyMsg');
    const compareCard = document.getElementById('pairCompareCard');

    if (pairPairs.length === 0) {
      // Show the empty-state message; hide the button card — never destroy its innerHTML
      if (emptyMsg)    emptyMsg.style.display    = '';
      if (compareCard) compareCard.style.display = 'none';
      return;
    }

    if (emptyMsg) emptyMsg.style.display = 'none';

    // Find next unresolved pair
    const remaining = pairPairs.filter(p => !pairComparisons[p.a + '|' + p.b]);
    if (remaining.length === 0) {
      if (compareCard) compareCard.style.display = 'none';
      // Full cycle check before declaring done — catches cycles that slipped in
      const latentConflict = findAnyCycle3();
      if (latentConflict) { showConflict(latentConflict); return; }
      showPairResults();
      return;
    }

    const pair = remaining[0];
    if (compareCard) compareCard.style.display = '';

    const btnA = document.getElementById('pairBtnA');
    const btnB = document.getElementById('pairBtnB');
    if (btnA) { 
      btnA.innerHTML = `<div style="font-size:15px;font-weight:700;margin-bottom:5px">${getIlityNameById(pair.a)}</div><div style="font-size:11px;font-weight:400;color:var(--text-muted);line-height:1.4">${getIlityDescById(pair.a)}</div>`;
      btnA.dataset.id = pair.a; 
    }
    if (btnB) { 
      btnB.innerHTML = `<div style="font-size:15px;font-weight:700;margin-bottom:5px">${getIlityNameById(pair.b)}</div><div style="font-size:11px;font-weight:400;color:var(--text-muted);line-height:1.4">${getIlityDescById(pair.b)}</div>`;
      btnB.dataset.id = pair.b; 
    }

    const results = document.getElementById('pairResults');
    if (results) results.style.display = 'none';
  }

  function showConflict(conflict) {
    const card = document.getElementById('pairConflictCard');
    card.style.display = '';
    document.getElementById('pairConflictBody').innerHTML = conflict.msg;
    const choices = document.getElementById('pairConflictChoices');
    // Each edge: { winner, loser, key } — offer to flip it (reverse it)
    choices.innerHTML = conflict.edges.map(e => {
      const { key } = e;
      const [ka, kb] = key.split('|');
      const stored = pairComparisons[key]; // 'A' means ka wins, 'B' means kb wins
      const currentWinner = stored === 'A' ? ka : kb;
      const currentLoser  = stored === 'A' ? kb : ka;
      const flippedChoice = stored === 'A' ? 'B' : 'A';
      return `<button class="btn btn-secondary" style="font-size:12px;margin-bottom:4px"
        onclick="resolveConflict('${key}','${flippedChoice}')">
        Flip: ${getIlityNameById(currentLoser)} &gt; ${getIlityNameById(currentWinner)}
      </button>`;
    }).join('');
  }

  function renderPairLiveChart() {
    const liveCard = document.getElementById('pairLiveChartCard');
    const container = document.getElementById('pairLiveChart');
    if (!liveCard || !container) return;

    const winCount = calcWinCounts();
    const total = Object.keys(winCount).length;
    if (total === 0) { liveCard.style.display = 'none'; return; }

    // Only show if at least one comparison has been made
    const done = Object.keys(pairComparisons).length;
    if (done === 0) { liveCard.style.display = 'none'; return; }

    // Reset title to "Running" if there are still pairs remaining
    const remaining = pairPairs.filter(p => !pairComparisons[p.a + '|' + p.b]);
    const titleEl = document.getElementById('pairLiveChartTitle');
    if (titleEl && remaining.length > 0) titleEl.textContent = 'Running Rankings';

    liveCard.style.display = '';

    const maxPossibleWins = total - 1; // max wins any ility can have
    const weights = assignWeights(winCount);
    const sorted = Object.keys(winCount).sort((a, b) =>
      winCount[b] !== winCount[a]
        ? winCount[b] - winCount[a]
        : getIlityNameById(a).localeCompare(getIlityNameById(b))
    );

    const header = `<div class="req-bar-row" style="margin-bottom:6px;border-bottom:1px solid var(--border);padding-bottom:4px">
      <div class="req-bar-label" style="font-size:10px;font-weight:700;color:var(--text-light);text-transform:uppercase;letter-spacing:0.06em"></div>
      <div class="req-bar-track" style="background:transparent"></div>
      <div class="req-bar-count" style="font-size:10px;font-weight:700;color:var(--text-light);text-transform:uppercase;letter-spacing:0.06em">#</div>
      <div class="pair-weight-col" style="font-size:10px;font-weight:700;color:var(--text-light);text-transform:uppercase;letter-spacing:0.06em">W</div>
    </div>`;

    container.innerHTML = header + sorted.map(id => {
      const wins = winCount[id];
      const w = weights[id] ?? 1;
      const pct = maxPossibleWins > 0 ? Math.round((wins / maxPossibleWins) * 100) : 0;
      const name = getIlityNameById(id);
      return `<div class="req-bar-row">
        <div class="req-bar-label">${name}</div>
        <div class="req-bar-track">
          <div class="req-bar-fill" style="width:${pct}%"></div>
        </div>
        <div class="req-bar-count">${wins}</div>
        <div class="pair-weight-col">${w}</div>
      </div>`;
    }).join('');
  }

  function showPairResults() {
    // Hide the comparison card — all pairs done
    const card = document.getElementById('pairCompareCard');
    if (card) card.style.display = 'none';

    // Compute weights silently (used downstream by PUGH)
    const winCount = calcWinCounts();
    const weights  = assignWeights(winCount);
    window._pairWeights = weights;

    // Update the live chart title to reflect completion
    const title = document.getElementById('pairLiveChartTitle');
    if (title) title.textContent = 'Final Rankings ✓';

    // Re-render so the chart reflects the final state
    renderPairLiveChart();

    // Enable the Continue button
    const cont = document.getElementById('btnPairContinue');
    if (cont) cont.disabled = false;
    updatePairAdvisor();
  }

  function updatePairLog() {
    const log = document.getElementById('pairLog');
    const entries = document.getElementById('pairLogEntries');
    const done = Object.entries(pairComparisons);
    if (done.length === 0) { log.style.display = 'none'; return; }
    log.style.display = '';
    entries.innerHTML = done.map(([key, val]) => {
      const [a, b] = key.split('|');
      const aName = getIlityNameById(a);
      const bName = getIlityNameById(b);
      const text = val === 'A' ? `${aName} > ${bName}` : `${bName} > ${aName}`;
      return `<div class="pair-log-entry" ondblclick="reopenComparison('${key}')" title="Double-click to change this ranking" style="cursor:pointer">
      <span class="pair-log-check">✓</span>${text}
      <span style="margin-left:auto;font-size:10px;color:var(--text-light);opacity:0.6">dbl-click to revise</span>
    </div>`;
    }).join('');
  }

  function updatePairProgress() {
    const total = pairPairs.length;
    const done = Object.keys(pairComparisons).length;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    const lbl = document.getElementById('pairProgressLabel');
    const fill = document.getElementById('pairProgressFill');
    if (lbl)  lbl.textContent     = `${done} of ${total} pairs`;
    if (fill) fill.style.width    = pct + '%';
  }

  function renderNonWeighted() {
    const all = [...selectedIlities].map(id => {
      return { id, name: getIlityNameById(id) };
    }).sort((a, b) => a.name.localeCompare(b.name));
    const list = document.getElementById('pairNonWeightedList');
    if (all.length === 0) {
      list.innerHTML = '<div style="font-size:13px;color:var(--text-light)">Select ilities on the ILTY page first.</div>';
      return;
    }
    list.innerHTML = all.map(il => `
      <div class="pair-result-row" style="border:1px solid var(--border);border-radius:8px">
        <div class="pair-result-name">${il.name}</div>
        <div class="pair-result-dots">${[5,4,3,2,1].map(d => `<div class="pair-dot ${d <= 3 ? 'filled' : 'empty'}"></div>`).join('')}</div>
        <div class="pair-result-weight" style="color:var(--text-muted)">Equal</div>
      </div>`).join('');
    window._pairWeights = {};
    all.forEach(il => { window._pairWeights[il.id] = 1; });
    document.getElementById('btnPairContinue').disabled = false;
  }

  function updatePairAdvisor() { /* AI coaching reserved */ }



// ── SCOR page renders ─────────────────────────────────────────

  function renderDatumDefView() {
    const datum = pughConcepts[0];
    if (!datum) return;

    const total  = requirements.length;
    const defined = Object.values(datumPerformance).filter(d => d.level && d.level.trim()).length;
    const pct    = total > 0 ? Math.round((defined / total) * 100) : 0;

    document.getElementById('scorViewName').textContent     = datum.name + '  —  Datum Definition';
    document.getElementById('scorViewProgress').textContent = total > 0 ? `${defined} of ${total} requirements defined` : 'Add requirements first';
    document.getElementById('scorProgressFill').style.width = pct + '%';
    document.getElementById('scorViewHeader') && (document.getElementById('scorViewHeader').querySelector('button').onclick = exitDatumDef);

    // Hide/show the correct sub-views
    document.getElementById('scorDatumDefView').style.display = '';
    document.getElementById('scorReqView').style.display      = 'none';

    // Update back button
    const backBtn = document.querySelector('#scorScoringView .scor-view-header button');
    if (backBtn) { backBtn.textContent = '← All Concepts'; backBtn.onclick = exitDatumDef; }

    if (total === 0) {
      document.getElementById('datumReqText').textContent = 'Add requirements on the REQS page first.';
      return;
    }

    const req  = requirements[datumDefIndex];
    const data = datumPerformance[req.id] || {};
    const advanced = pughSettings.advancedScoring && userTier !== 'free';

    // Type badge
    const typeColors = { essential:'var(--accent)', desirable:'var(--success)', optional:'var(--text-muted)', willnot:'var(--warn)', mustnot:'var(--danger)' };
    const typeLabels = { essential:'Essential', desirable:'Desirable', optional:'Optional', willnot:'Will Not', mustnot:'Must Not' };
    document.getElementById('datumReqBadges').innerHTML =
      `<span style="background:${typeColors[req.type]||'var(--accent)'};color:#fff;font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;text-transform:uppercase;letter-spacing:0.06em">${typeLabels[req.type]||req.type}</span>`;
    document.getElementById('datumReqText').textContent = req.text;
    const ilityName = [...ILITIES, ...customIlities].find(il => il.id === req.primary)?.name || req.primary || '';
    document.getElementById('datumReqMeta').innerHTML = ilityName ? `<span>Ility: <strong>${ilityName}</strong></span>` : '';

    // Restore field values
    document.getElementById('datumLevelInput').value = data.level || '';

    // Advanced anchors
    const anchorSec = document.getElementById('datumAnchorSection');
    anchorSec.style.display = advanced ? '' : 'none';
    if (advanced) {
      document.getElementById('datumAnchorHighInput').value = data.anchorHigh || '';
      document.getElementById('datumAnchorLowInput').value  = data.anchorLow  || '';
    }

    // MAS selector
    const masSec  = document.getElementById('datumMasSection');
    const showMAS = pughSettings.showMAS && userTier !== 'free';
    masSec.style.display = showMAS ? '' : 'none';
    if (showMAS) {
      const curMas = data.mas;
      const masContainer = document.getElementById('datumMasBtns');
      if (!advanced) {
        // Basic: +, 0, -
        const opts = [
          { val: '+',  label: '+',  cls: 'mas-set-plus'  },
          { val: '0',  label: '0',  cls: 'mas-set-neu'   },
          { val: '-',  label: '−',  cls: 'mas-set-minus' },
        ];
        masContainer.innerHTML = opts.map(o => {
          const active = curMas === o.val ? ' ' + o.cls : '';
          return `<button class="datum-mas-btn${active}" onclick="setDatumMAS('${o.val}')">${o.label}</button>`;
        }).join('');
      } else {
        // Advanced: +3 to -3
        const nums = [3, 2, 1, 0, -1, -2, -3];
        masContainer.innerHTML = nums.map(n => {
          const active = curMas === n ? ' mas-set-num' : '';
          const lbl = n > 0 ? `+${n}` : `${n}`;
          return `<button class="datum-mas-btn${active}" onclick="setDatumMAS(${n})">${lbl}</button>`;
        }).join('');
      }
    }

    // Nav
    document.getElementById('datumReqCounter').textContent = `${datumDefIndex + 1} of ${total}`;
    document.getElementById('datumPrevBtn').disabled = datumDefIndex === 0;
    const isLast = datumDefIndex >= total - 1;
    const nextBtn = document.getElementById('datumNextBtn');
    nextBtn.textContent = isLast ? 'Done ✓' : 'Next →';
    nextBtn.onclick = isLast ? exitDatumDef : () => datumDefNav(1);
  }

  function renderScoringView() {
    const concept   = pughConcepts.find(c => c.id === scoringConceptId);
    if (!concept) return;
    const isBaseline = pughConcepts[0]?.id === concept.id;

    document.getElementById('scorViewName').textContent = concept.name;

    // Datum routing is handled by startScoringConcept → startDatumDef, so
    // renderScoringView is only ever called for non-datum concepts.
    // Always hide the datum definition view and show the req scoring view.
    const datumDefView = document.getElementById('scorDatumDefView');
    const reqView      = document.getElementById('scorReqView');
    if (datumDefView) datumDefView.style.display = 'none';
    if (reqView)      reqView.style.display      = '';

    const reqs   = requirements;
    const total  = reqs.length;
    if (total === 0) {
      document.getElementById('scorReqText').textContent = 'No requirements found. Add requirements on the REQS page first.';
      return;
    }

    const req    = reqs[scoringReqIndex];
    const scored = reqs.filter(r => pughScores[concept.id + '_' + r.id] !== undefined).length;
    const pct    = total > 0 ? Math.round((scored / total) * 100) : 0;

    document.getElementById('scorViewProgress').textContent   = `${scored} of ${total} requirements scored`;
    document.getElementById('scorProgressFill').style.width   = pct + '%';
    document.getElementById('scorReqCounter').textContent     = `${scoringReqIndex + 1} of ${total}`;

    // Type badge
    const typeColors = { essential:'var(--accent)', desirable:'var(--success)', optional:'var(--text-muted)', willnot:'var(--warn)', mustnot:'var(--danger)' };
    const typeLabels = { essential:'Essential', desirable:'Desirable', optional:'Optional', willnot:'Will Not', mustnot:'Must Not' };
    document.getElementById('scorReqBadges').innerHTML =
      `<span style="background:${typeColors[req.type]||'var(--accent)'};color:#fff;font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;text-transform:uppercase;letter-spacing:0.06em">${typeLabels[req.type]||req.type}</span>`;

    document.getElementById('scorReqText').textContent = req.text;

    // Ility meta (weight removed per design — not relevant in scoring view)
    const ilityName = [...ILITIES, ...customIlities].find(il => il.id === req.primary)?.name || req.primary;
    document.getElementById('scorReqMeta').innerHTML =
      `<span>Ility: <strong>${ilityName}</strong></span>`;

    // Datum reference panel
    const datumRef  = document.getElementById('scorDatumRefPanel');
    const dData     = datumPerformance[req.id] || {};
    const advanced  = pughSettings.advancedScoring && userTier !== 'free';
    if (dData.level || dData.anchorHigh || dData.anchorLow) {
      let rows = '';
      if (advanced && dData.anchorHigh) {
        rows += `<div class="datum-ref-row">
          <span class="datum-ref-icon" style="color:var(--success)">▲</span>
          <span class="datum-ref-key" style="color:var(--success)">Best (+3)</span>
          <span class="datum-ref-val">${dData.anchorHigh}</span>
        </div>`;
      }
      if (dData.level) {
        rows += `<div class="datum-ref-row">
          <span class="datum-ref-icon" style="color:var(--accent)">●</span>
          <span class="datum-ref-key" style="color:var(--accent)">Datum (${advanced ? '0' : 'ref'})</span>
          <span class="datum-ref-val">${dData.level}</span>
        </div>`;
      }
      if (advanced && dData.anchorLow) {
        rows += `<div class="datum-ref-row">
          <span class="datum-ref-icon" style="color:var(--danger)">▼</span>
          <span class="datum-ref-key" style="color:var(--danger)">Worst (−3)</span>
          <span class="datum-ref-val">${dData.anchorLow}</span>
        </div>`;
      }
      datumRef.innerHTML = rows;
      datumRef.style.display = '';
    } else {
      datumRef.style.display = 'none';
    }

    // Restore concept performance value
    const perfKey = concept.id + '_' + req.id;
    const perfInput = document.getElementById('conceptPerfInput');
    if (perfInput) perfInput.value = conceptPerformance[perfKey] || '';

    // Score buttons
    const curScore = pughScores[concept.id + '_' + req.id];
    if (!pughSettings.advancedScoring || userTier === 'free') {
      document.getElementById('scorBasicBtns').style.display = '';
      document.getElementById('scorAdvBtns').style.display   = 'none';
      document.getElementById('scorBtnPlus').className  = 'scor-btn' + (curScore === '+' ? ' active-plus'  : '');
      document.getElementById('scorBtnNeu').className   = 'scor-btn' + (curScore === '0' ? ' active-neu'   : '');
      document.getElementById('scorBtnMinus').className = 'scor-btn' + (curScore === '-' ? ' active-minus' : '');
    } else {
      document.getElementById('scorBasicBtns').style.display = 'none';
      document.getElementById('scorAdvBtns').style.display   = '';
      const nums = [3, 2, 1, 0, -1, -2, -3];
      document.getElementById('scorAdvBtns').innerHTML = nums.map(n => {
        const sCls = n > 0 ? 's-pos' : n < 0 ? 's-neg' : 's-neu';
        const act  = curScore === n ? ' s-active' : '';
        const lbl  = n > 0 ? `+${n}` : `${n}`;
        return `<button class="scor-num-btn ${sCls}${act}" onclick="setScore(${n})">${lbl}</button>`;
      }).join('');
    }

    // Nav buttons
    document.getElementById('scorPrevBtn').disabled = scoringReqIndex === 0;
    const isLast = scoringReqIndex >= reqs.length - 1;
    const nextBtn = document.getElementById('scorNextBtn');
    nextBtn.textContent = isLast ? 'Done ✓' : 'Next →';
    nextBtn.onclick     = isLast ? exitScoringView : () => scoringNav(1);

    updateScorContinue();
  }

  function renderConceptCards() {
    const wrap  = document.getElementById('scorConceptCards');
    const empty = document.getElementById('scorEmptyState');
    if (!wrap) return;

    if (pughConcepts.length === 0) {
      wrap.innerHTML = '';
      if (empty) empty.style.display = '';
      updateScorContinue();
      return;
    }
    if (empty) empty.style.display = 'none';

    wrap.innerHTML = pughConcepts.map((c, i) => {
      const isBaseline = i === 0;
      const reqs   = requirements;
      const total  = reqs.length;
      const scored = reqs.filter(r => pughScores[c.id + '_' + r.id] !== undefined).length;
      const complete = isBaseline || (total > 0 && scored === total);
      const partial  = !isBaseline && total > 0 && scored > 0 && scored < total;
      // Datum progress: count requirements with a defined performance level
      const datumDefined = isBaseline
        ? Object.values(datumPerformance).filter(d => d.level && d.level.trim()).length
        : 0;
      const meta = isBaseline
        ? (total > 0 ? `Requirements Defined ${datumDefined} / ${total}` : 'Add requirements first')
        : total > 0 ? `${scored} / ${total} scored` : 'Add requirements first';

      // Background tint based on completion state
      let tintStyle = '';
      if (isBaseline && total > 0 && datumDefined === total) tintStyle = 'background:rgba(52,199,89,0.08);border-color:rgba(52,199,89,0.3);';
      else if (isBaseline && datumDefined > 0)               tintStyle = 'background:rgba(255,159,10,0.07);border-color:rgba(255,159,10,0.3);';
      else if (complete && !isBaseline) tintStyle = 'background:rgba(52,199,89,0.08);border-color:rgba(52,199,89,0.3);';
      else if (partial)                 tintStyle = 'background:rgba(255,159,10,0.07);border-color:rgba(255,159,10,0.3);';

      const badge = isBaseline
        ? `<span class="concept-datum-badge">Datum</span>`
        : `<span class="concept-num-badge">${i}</span>`;

      const deleteBtn = isBaseline ? '' :
        `<button class="btn btn-ghost" style="font-size:11px;padding:4px 8px;color:var(--danger)"
           onclick="event.stopPropagation();deletePughConcept(${c.id})">Delete</button>`;

      return `<div class="concept-card${isBaseline ? ' datum-card' : ''}" style="${tintStyle}" onclick="startScoringConcept(${c.id})">
        ${badge}
        <div class="concept-card-name">${c.name}</div>
        <div class="concept-card-meta">${meta}</div>
        <div class="concept-card-actions" onclick="event.stopPropagation()">
          <button class="btn btn-ghost" style="font-size:11px;padding:4px 8px"
            onclick="renamePughConcept(${c.id})">Rename</button>
          ${deleteBtn}
        </div>
      </div>`;
    }).join('');

    updateScorContinue();
  }

  function updateScorContinue() {
    const btn = document.getElementById('btnScorContinue');
    if (btn) btn.disabled = pughConcepts.length < 2;
  }


// ── Pugh Matrix renders ───────────────────────────────────────

  function renderPughMatrix() {
    const tableWrap  = document.getElementById('pughTableWrap');
    const emptyState = document.getElementById('pughEmptyState');
    const table      = document.getElementById('pughTable');
    if (!table) return;

    if (pughConcepts.length < 2) {
      if (tableWrap)  tableWrap.style.display  = 'none';
      if (emptyState) emptyState.style.display = '';
      const btn = document.getElementById('btnPughContinue');
      if (btn) btn.disabled = true;
      return;
    }

    if (tableWrap)  tableWrap.style.display  = '';
    if (emptyState) emptyState.style.display = 'none';

    // Ordered ility groups (only those with selected ilities that have reqs)
    const ilityOrder = [...ILITIES, ...customIlities].filter(il => selectedIlities.has(il.id));
    const reqsByIlity = {};
    requirements.forEach(r => {
      if (!reqsByIlity[r.primary]) reqsByIlity[r.primary] = [];
      reqsByIlity[r.primary].push(r);
    });
    const ungroupedReqs = requirements.filter(r => !selectedIlities.has(r.primary));

    // Header row — req column + optional MAS column + concept columns
    const conceptCount = pughConcepts.length;
    const showMASCol   = pughSettings.showMAS && userTier !== 'free';
    const reqColPct    = showMASCol ? 30 : 35;
    const masColPct    = showMASCol ? 6  : 0;
    const conColPct    = conceptCount > 0 ? ((100 - reqColPct - masColPct) / conceptCount).toFixed(1) : 10;
    const masColEl     = showMASCol ? `<col style="width:${masColPct}%">` : '';
    const colGroup     = `<colgroup><col style="width:${reqColPct}%">${masColEl}${pughConcepts.map(() => `<col style="width:${conColPct}%">`).join('')}</colgroup>`;

    const masHeader = showMASCol
      ? `<th class="pugh-mas-cell pugh-mas-header">MAS</th>`
      : '';
    const thCols = pughConcepts.map((c, i) => {
      const isDatum = i === 0;
      return `<th class="pugh-concept-th${isDatum ? ' datum-th' : ''}">${c.name}${isDatum ? '<span class="pugh-datum-tag">Datum</span>' : ''}</th>`;
    }).join('');
    let html = colGroup + `<thead><tr>
      <th class="pugh-req-col" style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted)">Requirement</th>
      ${masHeader}${thCols}
    </tr></thead><tbody>`;

    // Rows by ility
    const totalCols = pughConcepts.length + 1 + (showMASCol ? 1 : 0);
    ilityOrder.forEach(il => {
      const reqs = reqsByIlity[il.id];
      if (!reqs || reqs.length === 0) return;
      const w = window._pairWeights?.[il.id];
      const wStr = w ? ` <span style="font-weight:400;opacity:0.7">· W:${w}</span>` : '';
      html += `<tr class="pugh-ility-header-row"><td colspan="${totalCols}">${il.name}${wStr}</td></tr>`;
      reqs.forEach(req => html += pughReqRow(req, showMASCol));
    });

    if (ungroupedReqs.length > 0) {
      html += `<tr class="pugh-ility-header-row"><td colspan="${totalCols}">Other</td></tr>`;
      ungroupedReqs.forEach(req => html += pughReqRow(req, showMASCol));
    }

    // Summary rows
    html += pughSummaryRows();

    html += '</tbody>';
    table.innerHTML = html;

    const btn = document.getElementById('btnPughContinue');
    if (btn) btn.disabled = false;

    // Render the concept score chart
    renderPughConceptChart();
  }

  function pughReqRow(req, showMASCol) {
    const typeTag = { essential:'E', desirable:'D', optional:'O', willnot:'WN', mustnot:'MN' }[req.type] || '';
    const typeColor = { essential:'var(--accent)', desirable:'var(--success)', optional:'var(--text-muted)', willnot:'var(--warn)', mustnot:'var(--danger)' }[req.type] || 'var(--text-muted)';
    const reqCell = `<td class="pugh-req-col"><span class="pugh-req-type-tag" style="color:${typeColor}">${typeTag}</span><span class="pugh-req-text">${req.text}</span></td>`;

    // MAS cell
    const masData = datumPerformance[req.id];
    const masVal  = masData?.mas;
    let masCell = '';
    if (showMASCol) {
      const masDisplay = masVal !== undefined && masVal !== null
        ? (masVal === '+' ? '+' : masVal === '-' ? '−' : masVal === '0' ? '0' : (masVal > 0 ? `+${masVal}` : `${masVal}`))
        : '—';
      masCell = `<td class="pugh-mas-cell">${masDisplay}</td>`;
    }

    const scoreCells = pughConcepts.map((c, i) => {
      if (i === 0) return `<td class="pugh-cell pugh-cell-D">D</td>`;
      const score = pughScores[c.id + '_' + req.id];
      return pughScoreCell(c.id, req.id, score, masVal);
    }).join('');

    return `<tr>${reqCell}${masCell}${scoreCells}</tr>`;
  }

  function pughScoreCell(conceptId, reqId, score, masVal) {
    if (score === undefined || score === null) {
      return `<td class="pugh-cell pugh-cell-empty" onclick="openScorePopup(event,${conceptId},${reqId})" title="Click to score">·</td>`;
    }
    let cls, display;
    if (score === '+')          { cls = 'pugh-cell-plus';  display = '+'; }
    else if (score === '-')     { cls = 'pugh-cell-minus'; display = '−'; }
    else if (score === '0')     { cls = 'pugh-cell-neu';   display = '0'; }
    else if (score ===  3)      { cls = 'pugh-cell-p3';    display = '+3'; }
    else if (score ===  2)      { cls = 'pugh-cell-p2';    display = '+2'; }
    else if (score ===  1)      { cls = 'pugh-cell-p1';    display = '+1'; }
    else if (score ===  0)      { cls = 'pugh-cell-neu';   display = '0'; }
    else if (score === -1)      { cls = 'pugh-cell-n1';    display = '−1'; }
    else if (score === -2)      { cls = 'pugh-cell-n2';    display = '−2'; }
    else if (score === -3)      { cls = 'pugh-cell-n3';    display = '−3'; }
    else                        { cls = 'pugh-cell-neu';   display = score; }
    // Bold if score >= MAS
    let boldCls = '';
    if (masVal !== undefined && masVal !== null) {
      const sNum = scoreToNum(score);
      const mNum = scoreToNum(masVal);
      if (sNum !== null && mNum !== null && sNum >= mNum) boldCls = ' pugh-cell-bold';
    }
    return `<td class="pugh-cell ${cls}${boldCls}" onclick="openScorePopup(event,${conceptId},${reqId})" title="Click to change score">${display}</td>`;
  }

  function calcConceptSummary(conceptId) {
    let plusCount = 0, minusCount = 0, neuCount = 0, net = 0, weightedNet = 0;
    requirements.forEach(req => {
      const score  = pughScores[conceptId + '_' + req.id];
      const weight = window._pairWeights?.[req.primary] || 1;
      if (score === undefined || score === null) return;
      if (score === '+' || (typeof score === 'number' && score > 0)) {
        plusCount++;
        const val = score === '+' ? 1 : score;
        net += val; weightedNet += val * weight;
      } else if (score === '-' || (typeof score === 'number' && score < 0)) {
        minusCount++;
        const val = score === '-' ? -1 : score;
        net += val; weightedNet += val * weight;
      } else {
        neuCount++;
      }
    });
    return { plusCount, minusCount, neuCount, net, weightedNet: Math.round(weightedNet * 10) / 10 };
  }

  function pughSummaryRows() {
    const nonDatum   = pughConcepts.slice(1);
    const summaries  = nonDatum.map(c => calcConceptSummary(c.id));
    const showMASCol = pughSettings.showMAS && userTier !== 'free';
    // Summary rows: datum and MAS columns are blank — no content, just a tinted background
    // Column order: [label] [MAS blank] [Datum blank] [concepts...] — must match header order
    const datumBlank = `<td style="background:rgba(0,122,255,0.07)"></td>`;
    const masBlank   = `<td style="background:var(--surface)"></td>`;
    const datumCell  = showMASCol ? masBlank + datumBlank : datumBlank;
    // Summary divider spans all cols including MAS col
    const totalCols  = pughConcepts.length + 1 + (showMASCol ? 1 : 0);

    function netCell(val) {
      const cls = val > 0 ? 'pugh-sum-net-pos' : val < 0 ? 'pugh-sum-net-neg' : 'pugh-sum-net-neu';
      return `<td class="${cls}">${val > 0 ? '+' : ''}${val}</td>`;
    }

    // Max possible utility score: basic = 1 per req; advanced = 3 per req
    const maxPerReq = (pughSettings.advancedScoring && userTier !== 'free') ? 3 : 1;
    const maxUtil   = requirements.length * maxPerReq;
    const maxUtilW  = Math.round(requirements.reduce((sum, r) => {
      const w = window._pairWeights?.[r.primary] || 1;
      return sum + maxPerReq * w;
    }, 0) * 10) / 10;

    let rows = `<tr class="pugh-summary-divider"><td colspan="${totalCols}"></td></tr>`;

    rows += `<tr class="pugh-summary-section">
      <td class="pugh-summary-label-cell">+ Count</td>${datumCell}
      ${summaries.map(s => `<td class="pugh-sum-plus">+${s.plusCount}</td>`).join('')}
    </tr>`;
    rows += `<tr class="pugh-summary-section">
      <td class="pugh-summary-label-cell">− Count</td>${datumCell}
      ${summaries.map(s => `<td class="pugh-sum-minus">−${s.minusCount}</td>`).join('')}
    </tr>`;
    rows += `<tr class="pugh-summary-section">
      <td class="pugh-summary-label-cell">Utility Score <span style="font-weight:400;opacity:0.65">(${maxUtil})</span></td>${datumCell}
      ${summaries.map(s => netCell(s.net)).join('')}
    </tr>`;
    rows += `<tr class="pugh-summary-section">
      <td class="pugh-summary-label-cell">Utility Score Weighted <span style="font-weight:400;opacity:0.65">(${maxUtilW})</span></td>${datumCell}
      ${summaries.map(s => netCell(s.weightedNet)).join('')}
    </tr>`;

    if (pughSettings.showMTHUS && userTier !== 'free') {
      const { mthus, mthuws } = calcMTHUS();
      rows += `<tr class="pugh-summary-section">
        <td class="pugh-summary-label-cell" style="color:var(--accent)">MTHUS Ratio <span style="font-weight:400;opacity:0.75">(${mthus})</span></td>${datumCell}
        ${summaries.map(s => {
          const ratio = mthus !== 0 ? (s.net / mthus * 100).toFixed(1) + '%' : '—';
          return `<td class="pugh-sum-mthus">${ratio}</td>`;
        }).join('')}
      </tr>`;
      rows += `<tr class="pugh-summary-section">
        <td class="pugh-summary-label-cell" style="color:var(--accent)">MTHUWS Ratio <span style="font-weight:400;opacity:0.75">(${mthuws})</span></td>${datumCell}
        ${summaries.map(s => {
          const ratio = mthuws !== 0 ? (s.weightedNet / mthuws * 100).toFixed(1) + '%' : '—';
          return `<td class="pugh-sum-mthus">${ratio}</td>`;
        }).join('')}
      </tr>`;
    }

    // MAS % row — replaces old "50% MTHUS" row
    // Shows what % of requirements (that have MAS set) each concept meets at or above MAS
    if (pughSettings.showMAS && userTier !== 'free') {
      const reqsWithMAS = requirements.filter(r => {
        const d = datumPerformance[r.id];
        return d && d.mas !== undefined && d.mas !== null;
      });
      const masCount = reqsWithMAS.length;
      rows += `<tr class="pugh-summary-section">
        <td class="pugh-summary-label-cell" style="color:var(--warn)">MAS Met <span style="font-weight:400;opacity:0.75">(${masCount} req${masCount !== 1 ? 's' : ''})</span></td>${datumCell}
        ${nonDatum.map(c => {
          if (masCount === 0) return `<td class="pugh-sum-mas-fail">—</td>`;
          const metCount = reqsWithMAS.filter(r => {
            const score  = pughScores[c.id + '_' + r.id];
            const sNum   = scoreToNum(score);
            const mNum   = scoreToNum(datumPerformance[r.id].mas);
            return sNum !== null && mNum !== null && sNum >= mNum;
          }).length;
          const pct    = Math.round(metCount / masCount * 100);
          const passes = pct === 100;
          return `<td class="${passes ? 'pugh-sum-mas-pass' : 'pugh-sum-mas-fail'}">${pct}%</td>`;
        }).join('')}
      </tr>`;
    }

    return rows;
  }


// ── Pugh concept chart ────────────────────────────────────────

  function renderPughConceptChart() {
    const chartContainer = document.getElementById('pughChartContainer');
    const canvas = document.getElementById('pughConceptChart');
    if (!chartContainer || !canvas) return;

    if (pughConcepts.length < 2) {
      chartContainer.style.display = 'none';
      return;
    }
    chartContainer.style.display = '';

    // Destroy existing chart instance to prevent expansion bug
    if (window._pughChart) {
      window._pughChart.destroy();
      window._pughChart = null;
    }

    const nonDatum = pughConcepts.slice(1);

    // Check if all pairwise weights are 1 (unweighted)
    const allWeightsAreOne = requirements.every(r => (window._pairWeights?.[r.primary] || 1) === 1);

    const chartData = nonDatum.map((concept, idx) => {
      let plusCount = 0;
      let minusCount = 0; // stored as negative so bars go below zero
      let utilityScore = 0;
      let utilityScoreWeighted = 0;

      requirements.forEach(req => {
        const score = pughScores[concept.id + '_' + req.id];
        if (score === undefined || score === null) return;
        const scoreNum = scoreToNum(score);
        if (scoreNum > 0) plusCount++;
        else if (scoreNum < 0) minusCount--; // negative so chart bar goes down
        const weight = window._pairWeights?.[req.primary] || 1;
        utilityScore += scoreNum;
        utilityScoreWeighted += scoreNum * weight;
      });

      utilityScoreWeighted = Math.round(utilityScoreWeighted * 10) / 10;
      const finalUtility = allWeightsAreOne ? utilityScore : utilityScoreWeighted;

      return { label: 'C' + (idx + 1), plusCount, minusCount, utilityScore: finalUtility };
    });

    const labels       = chartData.map(d => d.label);
    const plusCounts   = chartData.map(d => d.plusCount);
    const minusCounts  = chartData.map(d => d.minusCount); // negative values
    const utilityScores = chartData.map(d => d.utilityScore);

    // Y-axis range for counts: symmetric around 0
    const maxPos = Math.max(...plusCounts, 0);
    const maxNeg = Math.min(...minusCounts, 0); // most negative value
    const countMax = Math.ceil(maxPos * 1.15) || 1;
    const countMin = Math.floor(maxNeg * 1.15) || -1;

    // Y-axis range for utility score
    const minU = Math.min(...utilityScores);
    const maxU = Math.max(...utilityScores);
    const uRange = Math.abs(maxU - minU);
    const uPad = uRange === 0 ? 1 : uRange * 0.15;

    const utilityLabel = allWeightsAreOne ? 'Utility Score' : 'Utility Score Weighted';

    const ctx = canvas.getContext('2d');
    window._pughChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '+ Count',
            data: plusCounts,
            backgroundColor: 'rgba(34,197,94,0.8)',
            borderWidth: 0,
            yAxisID: 'y',
            order: 2
          },
          {
            label: '− Count',
            data: minusCounts,
            backgroundColor: 'rgba(239,68,68,0.8)',
            borderWidth: 0,
            yAxisID: 'y',
            order: 2
          },
          {
            label: utilityLabel,
            data: utilityScores,
            borderColor: '#111',
            borderWidth: 2,
            backgroundColor: 'transparent',
            type: 'line',
            yAxisID: 'y1',
            fill: false,
            tension: 0.1,
            pointRadius: 4,
            pointBackgroundColor: '#111',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            order: 1
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { size: 12 }, padding: 12, usePointStyle: true }
          },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.8)',
            padding: 10,
            callbacks: {
              label: ctx2 => ctx2.dataset.label + ': ' + Math.abs(ctx2.parsed.y)
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Count', font: { size: 12, weight: 600 } },
            min: countMin,
            max: countMax,
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { font: { size: 11 }, stepSize: 1,
              callback: v => Math.abs(v) // show absolute values on axis labels
            }
          },
          y1: {
            type: 'linear',
            position: 'right',
            title: { display: true, text: 'Utility Score', font: { size: 12, weight: 600 } },
            min: minU - uPad,
            max: maxU + uPad,
            grid: { drawOnChartArea: false },
            ticks: { font: { size: 11 } }
          },
          x: {
            title: { display: true, text: 'Concept', font: { size: 12, weight: 600 } },
            grid: { display: false },
            ticks: { font: { size: 12, weight: 600 } }
          }
        }
      }
    });
  }


// ── Utility ───────────────────────────────────────────────────

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }


// ── Quick Start renders ───────────────────────────────────────

  function renderQSLists() {
    // Always ensure datum exists before rendering
    ensureQSDatum();

    // Populate the baseline concept input field (reflects pughConcepts[0].name)
    const baselineEl = document.getElementById('qsBaselineName');
    if (baselineEl) baselineEl.value = pughConcepts[0].name || '';

    const rList = document.getElementById('qsRequirementsList');
    if (rList) {
      if (requirements.length === 0) {
        rList.innerHTML = '<p class="qs-empty-hint">No requirements yet. Click + Add.</p>';
      } else {
        rList.innerHTML = requirements.map((r, i) => `
          <div class="qs-list-row">
            <span class="qs-row-num">${i + 1}</span>
            <input class="qs-row-input" value="${esc(r.text)}" placeholder="Requirement ${i + 1}..."
                   oninput="updateQSRequirement('${r.id}', this.value)">
            <button class="qs-row-remove" onclick="removeQSRequirement('${r.id}')" title="Remove">×</button>
          </div>`).join('');
      }
    }

    const nonDatum = pughConcepts.slice(1);
    const cList = document.getElementById('qsConceptsList');
    if (cList) {
      if (nonDatum.length === 0) {
        cList.innerHTML = '<p class="qs-empty-hint">No additional concepts yet. Click + Add.</p>';
      } else {
        cList.innerHTML = nonDatum.map((c, i) => `
          <div class="qs-list-row">
            <span class="qs-row-num">C${i + 1}</span>
            <input class="qs-row-input" value="${esc(c.name)}" placeholder="Concept ${i + 1}..."
                   oninput="updateQSConcept('${c.id}', this.value)">
            <button class="qs-row-remove" onclick="removeQSConcept('${c.id}')" title="Remove">×</button>
          </div>`).join('');
      }
    }
  }

  function renderQSMatrix() {
    const wrap = document.getElementById('qsMatrixWrap');
    if (!wrap) return;

    ensureQSDatum();
    const datum    = pughConcepts[0];
    const nonDatum = pughConcepts.slice(1);

    if (requirements.length === 0) {
      wrap.innerHTML = '<p class="qs-matrix-empty">Add requirements above to see the matrix.</p>';
      return;
    }

    // ── Header row ──
    // Datum column is always first, styled distinctly; concept columns follow
    const datumLabel = esc(datum.name) || 'Datum';
    let html = '<div class="qs-matrix-scroll"><table class="qs-matrix-table"><thead><tr>';
    html += '<th class="qs-th-req">Requirement</th>';
    // Baseline / datum column header
    html += `<th class="qs-th-datum">Baseline<div class="qs-datum-label">${datumLabel}</div></th>`;
    nonDatum.forEach((c, i) => {
      html += `<th class="qs-th-concept">C${i + 1}<div class="qs-concept-label">${esc(c.name) || '—'}</div></th>`;
    });
    html += '</tr></thead><tbody>';

    // ── Body rows ──
    requirements.forEach(r => {
      html += `<tr><td class="qs-td-req" title="${esc(r.text)}">${esc(r.text) || '<em style="color:var(--text-light)">unnamed</em>'}</td>`;
      // Datum cell: static "0", no buttons, grayed background
      html += `<td class="qs-td-datum">0</td>`;
      // Scoreable concept cells
      nonDatum.forEach(c => {
        const key = c.id + '_' + r.id;
        const s = pughScores[key] || '';
        html += `<td style="padding:6px">
          <div class="qs-score-btns">
            <button class="qs-score-btn plus  ${s==='+' ? 'active':''}" onclick="setQSScore('${c.id}','${r.id}','+')">+</button>
            <button class="qs-score-btn zero  ${s==='0' ? 'active':''}" onclick="setQSScore('${c.id}','${r.id}','0')">0</button>
            <button class="qs-score-btn minus ${s==='-' ? 'active':''}" onclick="setQSScore('${c.id}','${r.id}','-')">−</button>
          </div></td>`;
      });
      html += '</tr>';
    });
    html += '</tbody><tfoot>';

    // ── Summary rows (datum column always shows "—" since it's the reference) ──

    // + Count
    html += '<tr><td class="qs-td-sum-label">+ Count</td>';
    html += `<td class="qs-td-datum" style="font-size:11px;color:var(--text-light)">ref</td>`;
    nonDatum.forEach(c => {
      const n = requirements.filter(r => pughScores[c.id + '_' + r.id] === '+').length;
      html += `<td class="qs-td-sum plus">${n || '—'}</td>`;
    });
    html += '</tr>';

    // − Count
    html += '<tr><td class="qs-td-sum-label">− Count</td>';
    html += `<td class="qs-td-datum" style="font-size:11px;color:var(--text-light)">ref</td>`;
    nonDatum.forEach(c => {
      const n = requirements.filter(r => pughScores[c.id + '_' + r.id] === '-').length;
      html += `<td class="qs-td-sum minus">${n || '—'}</td>`;
    });
    html += '</tr>';

    // Net Score
    html += '<tr><td class="qs-td-sum-label">Score</td>';
    html += `<td class="qs-td-datum" style="font-weight:700">0</td>`;
    nonDatum.forEach(c => {
      let net = 0;
      requirements.forEach(r => {
        const s = pughScores[c.id + '_' + r.id];
        if (s === '+') net++; else if (s === '-') net--;
      });
      const cls = net > 0 ? 'pos' : net < 0 ? 'neg' : '';
      html += `<td class="qs-td-sum score ${cls}">${net > 0 ? '+' + net : net === 0 ? '0' : net}</td>`;
    });
    html += '</tr></tfoot></table></div>';

    wrap.innerHTML = html;
  }

