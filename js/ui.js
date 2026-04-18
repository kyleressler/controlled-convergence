// ============================================================
// ui.js — All render* and update* display functions
// Reads from state.js global variables; never mutates core state.
// Called by app.js event handlers after state changes.
// ============================================================


// ── Sidebar slides ───────────────────────────────────────────

  // Resolve the current slide array from SIDEBAR_CONTENT.
  // Falls back to an empty array if content not yet loaded.
  function _getCurrentSlides() {
    if (typeof SIDEBAR_CONTENT === 'undefined') return [];
    return SIDEBAR_CONTENT[_currentPage] || SIDEBAR_CONTENT.home || [];
  }

  // renderSlides(arr) — render the slide panel.
  // Pass an explicit array when switching pages; omit to re-render current page.
  function renderSlides(arr) {
    const slideArr = arr || _getCurrentSlides();
    if (!slideArr || !slideArr.length) return;

    const s = slideArr[currentSlide] || slideArr[0];
    let html = `<div class="slide-number">Slide ${currentSlide + 1} of ${slideArr.length}</div>`;
    html += `<div class="slide-card">`;
    html += `<div class="slide-title">${s.title}</div>`;
    if (s.body) html += `<div class="slide-body">${s.body}</div>`;
    if (s.bad) {
      html += `<div class="slide-example bad"><div class="slide-example-label">✗ ${s.bad.label}</div>${s.bad.text}</div>`;
    }
    if (s.good) {
      html += `<div class="slide-example good"><div class="slide-example-label">✓ ${s.good.label}</div>${s.good.text}</div>`;
    }
    html += `<div class="slide-nav">`;
    html += `<button class="slide-nav-btn" onclick="changeSlide(-1)" ${currentSlide === 0 ? 'disabled' : ''}>‹</button>`;
    html += `<div class="slide-dots">` + slideArr.map((_, i) =>
      `<div class="slide-dot ${i === currentSlide ? 'active' : ''}" onclick="goToSlide(${i})"></div>`
    ).join('') + `</div>`;
    html += `<button class="slide-nav-btn" onclick="changeSlide(1)" ${currentSlide === slideArr.length - 1 ? 'disabled' : ''}>›</button>`;
    html += `</div></div>`;
    document.getElementById('slideContainer').innerHTML = html;
  }

  function changeSlide(dir) {
    const arr = _getCurrentSlides();
    currentSlide = Math.max(0, Math.min(arr.length - 1, currentSlide + dir));
    renderSlides(arr);
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
    badge.textContent = userTier === 'free' ? 'Free' : userTier === 'account' ? 'Account' : 'Pro';

    // CTA button — changes based on signed-in state and tier
    if (!isSignedIn) {
      cta.textContent   = 'Create Free Account';
      cta.style.display = '';
    } else if (userTier === 'account') {
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
    } else if (userTier === 'account') {
      note.textContent = 'Account tier: ' + savedProjects.length + ' of 3 projects saved. Upgrade to Pro for up to 50 projects.';
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
      if (note) note.innerHTML = '<button class="btn btn-primary" style="margin-top:4px" onclick="handleAccountCTA()">Create a Free Account</button>';
      return;
    }
    if (note) note.innerHTML = '';
    if (savedProjects.length === 0) {
      list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text-light);font-size:13px">No saved projects yet. Create one above.</div>';
      return;
    }
    list.innerHTML = savedProjects.map(p => {
      const isActive = activeProject && activeProject.id === p.id;
      const activeBorder = isActive
        ? `border-color:var(--accent);background:rgba(${getThemeRgb('--accent-rgb')||'26,86,219'},0.06);`
        : '';
      const activeIndicator = isActive
        ? `<span style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:var(--accent);margin-right:6px">● Active</span>`
        : '';
      const activateBtn = isActive
        ? '' // already active — no Activate button needed
        : `<button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="event.stopPropagation();loadProject('${p.id}')" title="Activate this project">Activate</button>`;
      // Date display — handle both createdAt and created_at field names
      const dateStr = (p.createdAt || p.created_at)
        ? new Date(p.createdAt || p.created_at).toLocaleDateString()
        : '';
      return `
      <div class="proj-item" style="${activeBorder}" ondblclick="event.stopPropagation();activateProjectAndGo('${p.id}')" title="Double-click to activate · Drag not needed">
        <div style="flex:1;min-width:0">
          <div class="proj-item-name">${activeIndicator}${p.name}</div>
          ${p.description ? `<div style="font-size:12px;color:var(--text-light);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.description}</div>` : ''}
          <div class="proj-item-meta">${dateStr}${p.owner ? ' · ' + p.owner : ''}</div>
        </div>
        <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
          ${activateBtn}
          <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="event.stopPropagation();editProject('${p.id}')" title="Edit project name">Edit</button>
          <button class="proj-item-delete" onclick="event.stopPropagation();deleteProject('${p.id}')" title="Delete">×</button>
        </div>
      </div>`;
    }).join('');
  }

  function updateProjAdvisor() {
    const msg = document.getElementById('projTierMsg');
    if (!msg) return;
    if (userTier === 'free') {
      msg.innerHTML = '<strong>Free tier:</strong> Your work is not automatically saved. Use <em>Export Project Data</em> in the sidebar to download a JSON file you can re-upload in a future session. Creating a free account unlocks saving up to 3 projects — no credit card required.';
    } else if (userTier === 'account') {
      msg.innerHTML = '<strong>Account tier:</strong> You can save up to 3 projects. You\'re using ' + savedProjects.length + ' of 3. Upgrade to Pro for up to 50 projects and future collaboration features.';
    } else {
      msg.innerHTML = '<strong>Pro tier:</strong> Up to 50 saved projects. Collaboration features — inviting team members to review and contribute — are on the roadmap.';
    }
  }

  function checkContinue() {
    const to = document.getElementById('input-to').value.trim();
    const by = document.getElementById('input-by').value.trim();
    const wh = document.getElementById('input-while').value.trim();

    // USING is withheld (locked) until convergence — don't require it for Continue
    const allFilled = to && by && wh;
    const toCheck = checkTo(to);
    const toOk = !toCheck || toCheck.type !== 'danger';

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
    grid.innerHTML = all.map(s => {
      // Contact info — build inline display only if fields are set
      // Privacy: these are only visible in the user's own session (project data is RLS-isolated)
      const contactParts = [];
      if (s.contactName)  contactParts.push(escHtml(s.contactName));
      if (s.contactTitle) contactParts.push(escHtml(s.contactTitle));
      if (s.contactEmail) contactParts.push(`<a href="mailto:${escHtml(s.contactEmail)}" onclick="event.stopPropagation()" style="color:var(--accent)">${escHtml(s.contactEmail)}</a>`);
      const contactHtml = contactParts.length
        ? `<div class="stak-chip-contact" style="font-size:11px;color:var(--text-muted);margin-top:4px;line-height:1.5">${contactParts.join(' · ')}</div>`
        : '';
      return `
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
        <div class="stak-chip-name">${escHtml(s.name)}</div>
        <div class="stak-chip-desc">${escHtml(s.desc)}</div>
        ${contactHtml}
      </div>`;
    }).join('');
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

    function fillSelect(id, items, label) {
      const el = document.getElementById(id);
      if (!el) return;
      const cur = el.value;
      el.innerHTML = `<option value="">${label}</option>` + items.map(it => `<option value="${it.id}" ${cur === it.id ? 'selected' : ''}>${escHtml(it.name)}</option>`).join('');
    }

    // Always include "Other" as a catch-all primary ility — independent of ility selections
    const primaryIlities = [...allIlities, { id: 'other', name: 'Other' }];

    // INCOSE dropdowns
    fillSelect('reqPrimaryIlity',         primaryIlities,   '— select —');
    fillSelect('reqSecondaryIlity',       allIlities,       '(none)');
    fillSelect('reqPrimaryStakeholder',   allStakeholders,  '— select —');
    fillSelect('reqSecondaryStakeholder', allStakeholders,  '(none)');
    syncReqSecondary('ility');
    syncReqSecondary('stak');

    // AGILE dropdowns
    fillSelect('reqAgileStakeholder', allStakeholders,  '— select stakeholder —');
    fillSelect('reqAgileIlity',       primaryIlities,   '— select ility —');

    // Responsible Scorer — only stakeholders with a contact name entered
    const scorerEl = document.getElementById('reqScorer');
    if (scorerEl) {
      const curScorer = scorerEl.value;
      const scorerStakeholders = allStakeholders.filter(s => s.contactName && s.contactName.trim());
      scorerEl.innerHTML = '<option value="">— none —</option>' + scorerStakeholders.map(s => {
        let label = escHtml(s.name);
        if (s.contactTitle || s.contactName) {
          const parts = [s.name];
          if (s.contactTitle) parts.push(s.contactTitle);
          if (s.contactName)  parts.push(s.contactName);
          label = escHtml(parts.join(' — '));
        }
        return `<option value="${s.id}" ${curScorer === s.id ? 'selected' : ''}>${label}</option>`;
      }).join('');
    }
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
      list.innerHTML = requirements.map(r => {
        const typeLabel = r.type === 'willnot' ? 'WILL NOT' : r.type === 'mustnot' ? 'MUST NOT' : r.type.toUpperCase();

        // Build display text based on format
        let displayText;
        if (r.format === 'agile') {
          const sid = r.stakeholders && r.stakeholders[0];
          const stakName = getStakeholderName(sid);
          const stakDesc = [...(typeof STAKEHOLDERS !== 'undefined' ? STAKEHOLDERS : []), ...(typeof customStakeholders !== 'undefined' ? customStakeholders : [])].find(s => s.id === sid)?.desc || '';
          const stakTag = `<span class="req-tag req-tag-stakeholder" data-tooltip="${escHtml(stakName + (stakDesc ? ': ' + stakDesc : ''))}">${escHtml(stakName)}</span>`;
          const ilityName = getIlityName(r.primary);
          const ilityDesc = [...(typeof ILITIES !== 'undefined' ? ILITIES : []), ...(typeof customIlities !== 'undefined' ? customIlities : [])].find(i => i.id === r.primary)?.desc || '';
          const ilityTag = `<span class="req-tag req-tag-primary" data-tooltip="${escHtml(ilityName + (ilityDesc ? ': ' + ilityDesc : ''))}">${escHtml(ilityName)}</span>`;
          const want = escHtml(r.text || '');
          const soThat = r.agileSoThat ? ` <span style="color:var(--text-muted)">so that</span> ${escHtml(r.agileSoThat)}` : '';
          displayText = `<span style="color:var(--text-muted)">As a</span> ${stakTag} <span style="color:var(--text-muted)">I care about</span> ${ilityTag} <span style="color:var(--text-muted)">and I want</span> ${want}${soThat}`;
        } else {
          displayText = escHtml(r.text || '');
        }

        // Build ility tags with hover tooltip
        const primaryIlityName = getIlityName(r.primary);
        const primaryIlityDesc = [...(typeof ILITIES !== 'undefined' ? ILITIES : []), ...(typeof customIlities !== 'undefined' ? customIlities : [])].find(i => i.id === r.primary)?.desc || '';
        const ilityTag = r.format === 'agile'
          ? '' // already in sentence display; don't duplicate
          : `<span class="req-tag req-tag-primary" data-tooltip="${escHtml(primaryIlityName + (primaryIlityDesc ? ': ' + primaryIlityDesc : ''))}">${escHtml(primaryIlityName)}</span>`;
        const secondaryTags = (r.format !== 'agile' ? (r.secondaries || []) : []).map(sid => {
          const sn = getIlityName(sid);
          const sd = [...(typeof ILITIES !== 'undefined' ? ILITIES : []), ...(typeof customIlities !== 'undefined' ? customIlities : [])].find(i => i.id === sid)?.desc || '';
          return `<span class="req-tag req-tag-secondary" data-tooltip="${escHtml(sn + (sd ? ': ' + sd : ''))}">${escHtml(sn)}</span>`;
        }).join('');

        // Stakeholder tags with hover tooltip
        const stakeholderTags = (r.format !== 'agile' ? (r.stakeholders || []) : []).map(sid => {
          const sn = getStakeholderName(sid);
          const sd = [...(typeof STAKEHOLDERS !== 'undefined' ? STAKEHOLDERS : []), ...(typeof customStakeholders !== 'undefined' ? customStakeholders : [])].find(s => s.id === sid)?.desc || '';
          return `<span class="req-tag req-tag-stakeholder" data-tooltip="${escHtml(sn + (sd ? ': ' + sd : ''))}">${escHtml(sn)}</span>`;
        }).join('');

        const hasTags = ilityTag || secondaryTags || stakeholderTags;
        const tagsRow = hasTags ? `<div class="req-item-tags">${ilityTag}${secondaryTags}${stakeholderTags}</div>` : '';

        const _rId = typeof r.id === 'number' ? r.id : `'${r.id}'`;
        return `
        <div class="req-item" ondblclick="editRequirement(${_rId})" title="Double-click to edit" style="cursor:default">
          <div class="req-item-header">
            ${r.format !== 'agile' && r.type ? `<span class="req-type-badge badge-${r.type}">${typeLabel}</span>` : ''}
            <span class="req-item-text">${displayText}</span>
            <div style="display:flex;gap:4px;flex-shrink:0;align-items:center">
              <button class="req-item-edit" onclick="event.stopPropagation();editRequirement(${_rId})" title="Edit">Edit</button>
              <button class="req-item-delete" onclick="event.stopPropagation();deleteRequirement(${_rId})" title="Delete">×</button>
            </div>
          </div>
          ${tagsRow}
        </div>`;
      }).join('');
      list.appendChild(empty);
    }

    renderChart();
    updateReqAdvisor();
    document.getElementById('btnReqContinue').disabled = requirements.length < 1;
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

    // Append virtual 'Other' entry if any requirement uses it as primary
    if (requirements.some(r => r.primary === 'other')) all.push({ id: 'other', name: 'Other' });

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

  // Build the full display HTML for a requirement in pairwise/forced-rank contexts.
  // AGILE: "As a [stak] I care about [ility] and I want [text] so that [soThat]"
  // INCOSE / fallback: plain requirement text
  function buildReqSentenceHtml(r) {
    if (!r) return '';
    if (r.format === 'agile') {
      const stakName  = escHtml((typeof getStakeholderName === 'function') ? getStakeholderName(r.stakeholders && r.stakeholders[0]) : (r.stakeholders && r.stakeholders[0]) || '');
      const ilityName = escHtml((typeof getIlityName === 'function') ? getIlityName(r.primary) : r.primary || '');
      const want      = escHtml(r.text || '');
      const soThat    = r.agileSoThat ? ` <span style="color:var(--text-muted);font-weight:400">so that</span> ${escHtml(r.agileSoThat)}` : '';
      return `<span style="color:var(--text-muted);font-weight:400">As a</span> ${stakName} <span style="color:var(--text-muted);font-weight:400">I care about</span> ${ilityName} <span style="color:var(--text-muted);font-weight:400">and I want</span> ${want}${soThat}`;
    }
    return escHtml(r.text || r.id || '');
  }

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

    // Update question text based on subject
    const qEl = document.getElementById('pairQuestion');
    if (qEl) {
      const subj = (typeof pairSubject !== 'undefined') ? pairSubject : 'ilities';
      qEl.textContent = subj === 'requirements'
        ? 'Which of these two requirements is more important to the success of the design?'
        : 'Assume that your team has achieved a perfect minimum viable product where every shall requirement is being met and none of your desirable requirements are being met. In this situation, if you had additional resources (time, money, or people), which of these would you spend your resources on?';
    }

    const btnA = document.getElementById('pairBtnA');
    const btnB = document.getElementById('pairBtnB');
    const subj = (typeof pairSubject !== 'undefined') ? pairSubject : 'ilities';

    const buildBtnHtml = (id) => {
      if (subj === 'requirements') {
        const r = (typeof requirements !== 'undefined') ? requirements.find(req => req.id === id) : null;
        return `<div style="font-size:14px;font-weight:500;line-height:1.6;text-align:left">${buildReqSentenceHtml(r)}</div>`;
      }
      const name = (typeof getIlityNameById === 'function') ? getIlityNameById(id) : id;
      const desc = (typeof getIlityDescById === 'function') ? getIlityDescById(id) : '';
      return `<div style="font-size:15px;font-weight:700;margin-bottom:5px">${escHtml(name)}</div><div style="font-size:11px;font-weight:400;color:var(--text-muted);line-height:1.4">${escHtml(desc)}</div>`;
    };

    if (btnA) { btnA.innerHTML = buildBtnHtml(pair.a); btnA.dataset.id = pair.a; }
    if (btnB) { btnB.innerHTML = buildBtnHtml(pair.b); btnB.dataset.id = pair.b; }

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
      const resolve = (typeof getPairSubjectName === 'function') ? getPairSubjectName : getIlityNameById;
      return `<button class="btn btn-secondary" style="font-size:12px;margin-bottom:4px"
        onclick="resolveConflict('${key}','${flippedChoice}')">
        Flip: ${escHtml(resolve(currentLoser))} &gt; ${escHtml(resolve(currentWinner))}
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
    const nameOf = (typeof getPairSubjectName === 'function') ? getPairSubjectName : getIlityNameById;
    const sorted = Object.keys(winCount).sort((a, b) =>
      winCount[b] !== winCount[a]
        ? winCount[b] - winCount[a]
        : nameOf(a).localeCompare(nameOf(b))
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
      const name = nameOf(id);
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
    const subj = (typeof pairSubject !== 'undefined') ? pairSubject : 'ilities';
    const list  = document.getElementById('pairNonWeightedList');
    if (!list) return;

    let items;
    if (subj === 'requirements') {
      items = requirements.map(r => ({ id: r.id, name: r.text || r.id }));
      if (items.length === 0) {
        list.innerHTML = '<div style="font-size:13px;color:var(--text-light)">Add requirements on the REQS page first.</div>';
        return;
      }
    } else {
      items = [...selectedIlities].map(id => ({ id, name: getIlityNameById(id) })).sort((a, b) => a.name.localeCompare(b.name));
      // Include virtual 'Other' ility if any requirement uses it as primary
      if ((typeof requirements !== 'undefined') && requirements.some(r => r.primary === 'other') && !items.some(i => i.id === 'other')) {
        items.push({ id: 'other', name: 'Other' });
      }
      if (items.length === 0) {
        list.innerHTML = '<div style="font-size:13px;color:var(--text-light)">Select ilities on the ILTY page first.</div>';
        return;
      }
    }

    list.innerHTML = items.map(item => `
      <div class="pair-result-row" style="border:1px solid var(--border);border-radius:8px">
        <div class="pair-result-name">${escHtml(item.name)}</div>
        <div class="pair-result-dots">${[5,4,3,2,1].map(d => `<div class="pair-dot ${d <= 3 ? 'filled' : 'empty'}"></div>`).join('')}</div>
        <div class="pair-result-weight" style="color:var(--text-muted)">Equal</div>
      </div>`).join('');
    window._pairWeights = {};
    items.forEach(item => { window._pairWeights[item.id] = 1; });
    document.getElementById('btnPairContinue').disabled = false;
  }

  function renderForcedRank() {
    const listEl = document.getElementById('pairForcedRankList');
    if (!listEl) return;
    const subj = (typeof pairSubject !== 'undefined') ? pairSubject : 'ilities';
    const mode = (typeof pairMode    !== 'undefined') ? pairMode    : 'nonweighted';
    const n    = (typeof forcedRankOrder !== 'undefined') ? forcedRankOrder.length : 0;

    if (n < 2) {
      listEl.innerHTML = `<div style="font-size:13px;color:var(--text-light)">Add at least 2 ${subj === 'requirements' ? 'requirements on the REQS page' : 'ilities on the ILTY page'} to use Forced Rank.</div>`;
      document.getElementById('btnPairContinue').disabled = true;
      return;
    }

    // Issue 1: Non-weighted forced rank always shows W:1 for all items
    // Issue 1: Weighted forced rank assigns proportional weights (top=5, bottom=1)
    window._pairWeights = {};
    forcedRankOrder.forEach((id, i) => {
      window._pairWeights[id] = (mode === 'nonweighted')
        ? 1
        : (n === 1 ? 5 : Math.max(1, Math.round(5 - (i / (n - 1)) * 4)));
    });

    listEl.innerHTML = forcedRankOrder.map((id, i) => {
      const w       = window._pairWeights[id];
      const nameHtml = subj === 'requirements'
        // eslint-disable-next-line eqeqeq  — intentional: req.id may be int, id is always string from template
        ? buildReqSentenceHtml((typeof requirements !== 'undefined') ? requirements.find(req => req.id == id) : null)
        : escHtml((typeof getIlityNameById === 'function') ? getIlityNameById(id) : id);
      const isFirst = i === 0;
      const isLast  = i === n - 1;
      const dots    = [5,4,3,2,1].map(d => `<div class="pair-dot ${d <= w ? 'filled' : 'empty'}"></div>`).join('');
      // Issues 4 & 5: Use ondragover with targetId (avoids child-element dragleave bug).
      // Buttons use onmousedown stopPropagation + draggable=false to prevent drag hijacking clicks.
      return `<div class="pair-forced-card" draggable="true" data-fr-id="${id}"
          ondragstart="frDragStart(event,'${id}')"
          ondragover="frDragOver(event,'${id}')"
          ondrop="frDrop(event,'${id}')"
          ondragend="frDragEnd(event)">
        <div class="pair-rank-position">${i + 1}</div>
        <div class="pair-rank-arrows">
          <button draggable="false" onmousedown="event.stopPropagation()" onclick="event.stopPropagation();moveForcedRankCard('${id}',-1)" ${isFirst ? 'disabled' : ''} title="Move up">▲</button>
          <button draggable="false" onmousedown="event.stopPropagation()" onclick="event.stopPropagation();moveForcedRankCard('${id}',1)"  ${isLast  ? 'disabled' : ''} title="Move down">▼</button>
        </div>
        <div class="pair-rank-name">${nameHtml}</div>
        <div class="pair-rank-weight">
          <span class="pair-rank-dots">${dots}</span>
          <span class="pair-rank-wval">W:${w}</span>
        </div>
      </div>`;
    }).join('');

    document.getElementById('btnPairContinue').disabled = false;
  }

  function updatePairSubtitle() {
    const el = document.getElementById('pairSubtitle');
    if (!el) return;
    const subj  = (typeof pairSubject !== 'undefined') ? pairSubject : 'ilities';
    const meth  = (typeof pairMethod  !== 'undefined') ? pairMethod  : 'pairwise';
    const mode  = (typeof pairMode    !== 'undefined') ? pairMode    : 'nonweighted';
    const items = subj === 'requirements' ? 'requirements' : 'ilities';

    if (meth === 'forcedrank' && mode === 'weighted') {
      el.textContent = `Drag or use the ↑↓ arrows to rank your ${items} from most to least important. Weights (1–5) are assigned automatically based on rank position and fed into the Pugh Matrix.`;
    } else if (mode === 'nonweighted') {
      el.textContent = `All selected ${items} carry equal weight in the Pugh Matrix. Switch to Weighted if your team wants to prioritize some ${items} over others.`;
    } else {
      el.textContent = subj === 'requirements'
        ? 'Compare your requirements head-to-head to establish their relative importance in the Pugh Matrix.'
        : 'Compare your ilities head-to-head to establish their relative weight in the Pugh Matrix. Answer from the perspective of the MVP premise.';
    }
  }

  function updatePairAdvisor() {
    const el = document.getElementById('pairAdvisorBody');
    if (!el) return;
    const subj  = (typeof pairSubject !== 'undefined') ? pairSubject : 'ilities';
    const meth  = (typeof pairMethod  !== 'undefined') ? pairMethod  : 'pairwise';
    const mode  = (typeof pairMode    !== 'undefined') ? pairMode    : 'nonweighted';
    const item  = subj === 'requirements' ? 'requirement' : 'ility';
    const items = subj === 'requirements' ? 'requirements' : 'ilities';

    let html;
    if (meth === 'forcedrank') {
      html = `<p>In <strong>Forced Rank</strong> mode, place each ${item} in an explicit order from most to least important. The top-ranked ${item} receives weight 5; the bottom receives weight 1. Intermediate positions are distributed proportionally.</p>
              <p>Drag cards to reorder, or use the ↑↓ arrows on each card. Your rankings update in real time and are saved automatically.</p>`;
    } else if (mode === 'nonweighted') {
      html = `<p>In <strong>Non-Weighted</strong> mode, all ${items} carry equal weight of 1 in the Pugh Matrix. This is appropriate when your team agrees that all ${items} are equally important, or when there is insufficient information to prioritize.</p>`;
    } else {
      if (subj === 'ilities') {
        html = `<p>For each pair, answer from the perspective of the MVP premise:</p>
                <p style="font-style:italic;color:var(--text-muted);font-size:13px;border-left:3px solid var(--border);padding-left:10px;margin:10px 0">"Assume that your team has achieved a perfect minimum viable product where every shall requirement is being met and none of your desirable requirements are being met. In this situation, if you had additional resources (time, money, or people), which of these would you spend your resources on?"</p>
                <p>This framing ensures your weights reflect where <em>additional investment</em> would have the greatest impact — not just what is needed to meet minimum requirements.</p>`;
      } else {
        html = `<p>For each pair, consider which requirement is more important to the overall success of the design. Your answers establish relative importance weights for each requirement in the Pugh Matrix.</p>`;
      }
    }
    el.innerHTML = html;
  }



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
    document.getElementById('datumReqBadges').innerHTML = req.format !== 'agile'
      ? `<span style="background:${typeColors[req.type]||'var(--accent)'};color:#fff;font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;text-transform:uppercase;letter-spacing:0.06em">${typeLabels[req.type]||req.type}</span>`
      : '';
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

    const reqs  = (typeof getFilteredReqs === 'function') ? getFilteredReqs() : requirements;
    const total = reqs.length;
    if (total === 0) {
      const filterActive = (typeof scorerFilter !== 'undefined') && scorerFilter;
      document.getElementById('scorReqText').textContent = filterActive
        ? 'No requirements are assigned to this scorer. Adjust the filter in Concept Scoring Settings.'
        : 'No requirements found. Add requirements on the REQS page first.';
      return;
    }

    const req    = reqs[scoringReqIndex];
    const scored = reqs.filter(r => pughScores[concept.id + '_' + r.id] !== undefined).length;
    const pct    = total > 0 ? Math.round((scored / total) * 100) : 0;
    const filterLabel = (typeof scorerFilter !== 'undefined') && scorerFilter
      ? ` (filtered)` : '';

    document.getElementById('scorViewProgress').textContent   = `${scored} of ${total} requirements scored${filterLabel}`;
    document.getElementById('scorProgressFill').style.width   = pct + '%';
    document.getElementById('scorReqCounter').textContent     = `${scoringReqIndex + 1} of ${total}`;

    // Type badge
    const typeColors = { essential:'var(--accent)', desirable:'var(--success)', optional:'var(--text-muted)', willnot:'var(--warn)', mustnot:'var(--danger)' };
    const typeLabels = { essential:'Essential', desirable:'Desirable', optional:'Optional', willnot:'Will Not', mustnot:'Must Not' };
    document.getElementById('scorReqBadges').innerHTML = req.format !== 'agile'
      ? `<span style="background:${typeColors[req.type]||'var(--accent)'};color:#fff;font-size:10px;font-weight:700;padding:3px 9px;border-radius:20px;text-transform:uppercase;letter-spacing:0.06em">${typeLabels[req.type]||req.type}</span>`
      : '';

    // Show full requirement sentence for AGILE format; plain text otherwise
    const scorReqTextEl = document.getElementById('scorReqText');
    if (req.format === 'agile' && typeof buildReqSentenceHtml === 'function') {
      scorReqTextEl.innerHTML = buildReqSentenceHtml(req);
    } else {
      scorReqTextEl.textContent = req.text || req.id;
    }

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

    // Restore concept performance value and notes
    const perfKey = concept.id + '_' + req.id;
    const perfInput = document.getElementById('conceptPerfInput');
    if (perfInput) perfInput.value = conceptPerformance[perfKey] || '';
    const notesInput = document.getElementById('conceptNotesInput');
    if (notesInput) notesInput.value = (typeof conceptNotes !== 'undefined' ? conceptNotes[perfKey] : '') || '';

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

      // Background tint based on completion state — uses current-theme RGB variables
      const _sRgb = getThemeRgb('--success-rgb') || '5,122,85';
      const _wRgb = getThemeRgb('--warn-rgb')    || '194,120,3';
      let tintStyle = '';
      if (isBaseline && total > 0 && datumDefined === total) tintStyle = `background:rgba(${_sRgb},0.08);border-color:rgba(${_sRgb},0.30);`;
      else if (isBaseline && datumDefined > 0)               tintStyle = `background:rgba(${_wRgb},0.07);border-color:rgba(${_wRgb},0.30);`;
      else if (complete && !isBaseline) tintStyle = `background:rgba(${_sRgb},0.08);border-color:rgba(${_sRgb},0.30);`;
      else if (partial)                 tintStyle = `background:rgba(${_wRgb},0.07);border-color:rgba(${_wRgb},0.30);`;

      const badge = isBaseline
        ? `<span class="concept-datum-badge">Datum</span>`
        : `<span class="concept-num-badge">${i}</span>`;

      const _cId = typeof c.id === 'number' ? c.id : `'${c.id}'`;
      const deleteBtn = isBaseline ? '' :
        `<button class="btn btn-ghost" style="font-size:11px;padding:4px 8px;color:var(--danger)"
           onclick="event.stopPropagation();deletePughConcept(${_cId})">Delete</button>`;

      return `<div class="concept-card${isBaseline ? ' datum-card' : ''}" style="${tintStyle}" onclick="startScoringConcept(${_cId})">
        ${badge}
        <div class="concept-card-name">${c.name}</div>
        <div class="concept-card-meta">${meta}</div>
        <div class="concept-card-actions" onclick="event.stopPropagation()">
          <button class="btn btn-ghost" style="font-size:11px;padding:4px 8px"
            onclick="showConceptSummary(${_cId})">Summary</button>
          <button class="btn btn-ghost" style="font-size:11px;padding:4px 8px"
            onclick="renamePughConcept(${_cId})">Rename</button>
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

    // Always recompute weights from saved pair state (handles load without visiting PAIR)
    recomputePairWeights();

    // True only when the user has turned on weighted mode for ilities (Account/Pro only)
    const isWeightedMode = (typeof pairMode    !== 'undefined' ? pairMode    : 'nonweighted') === 'weighted'
                        && (typeof pairSubject !== 'undefined' ? pairSubject : 'ilities')     === 'ilities'
                        && userTier !== 'free';

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
      const wStr = isWeightedMode ? ` <span style="font-weight:400;opacity:0.7">· W:${w || 1}</span>` : '';
      html += `<tr class="pugh-ility-header-row"><td colspan="${totalCols}">${il.name}${wStr}</td></tr>`;
      reqs.forEach(req => html += pughReqRow(req, showMASCol));
    });

    if (ungroupedReqs.length > 0) {
      html += `<tr class="pugh-ility-header-row"><td colspan="${totalCols}">Other</td></tr>`;
      ungroupedReqs.forEach(req => html += pughReqRow(req, showMASCol));
    }

    // Summary rows
    html += pughSummaryRows(isWeightedMode);

    html += '</tbody>';
    table.innerHTML = html;

    const btn = document.getElementById('btnPughContinue');
    if (btn) btn.disabled = false;

    // Render the concept score chart
    renderPughConceptChart();
  }

  function pughReqRow(req, showMASCol) {
    const typeTag = req.format !== 'agile'
      ? ({ essential:'E', desirable:'D', optional:'O', willnot:'WN', mustnot:'MN' }[req.type] || '')
      : '';
    const typeColor = { essential:'var(--accent)', desirable:'var(--success)', optional:'var(--text-muted)', willnot:'var(--warn)', mustnot:'var(--danger)' }[req.type] || 'var(--text-muted)';
    const typeTagHtml = typeTag ? `<span class="pugh-req-type-tag" style="color:${typeColor}">${typeTag}</span>` : '';
    const reqCell = `<td class="pugh-req-col">${typeTagHtml}<span class="pugh-req-text">${req.text}</span></td>`;

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
    const _cId = typeof conceptId === 'number' ? conceptId : `'${conceptId}'`;
    const _rId = typeof reqId     === 'number' ? reqId     : `'${reqId}'`;
    if (score === undefined || score === null) {
      return `<td class="pugh-cell pugh-cell-empty" onclick="openScorePopup(event,${_cId},${_rId})" title="Click to score">·</td>`;
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
    return `<td class="pugh-cell ${cls}${boldCls}" onclick="openScorePopup(event,${_cId},${_rId})" title="Click to change score">${display}</td>`;
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

  function pughSummaryRows(isWeightedMode) {
    const nonDatum   = pughConcepts.slice(1);
    const summaries  = nonDatum.map(c => calcConceptSummary(c.id));
    const showMASCol = pughSettings.showMAS && userTier !== 'free';
    // Summary rows: datum and MAS columns are blank — no content, just a tinted background
    // Column order: [label] [MAS blank] [Datum blank] [concepts...] — must match header order
    const _aRgb = getThemeRgb('--accent-rgb') || '26,86,219';
    const datumBlank = `<td style="background:rgba(${_aRgb},0.07)"></td>`;
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
    if (isWeightedMode) {
      rows += `<tr class="pugh-summary-section">
        <td class="pugh-summary-label-cell">Utility Score Weighted <span style="font-weight:400;opacity:0.65">(${maxUtilW})</span></td>${datumCell}
        ${summaries.map(s => netCell(s.weightedNet)).join('')}
      </tr>`;
    }

    if (pughSettings.showMTHUS && userTier !== 'free') {
      const { mthus, mthuws } = calcMTHUS();
      rows += `<tr class="pugh-summary-section">
        <td class="pugh-summary-label-cell" style="color:var(--accent)">MTHUS Ratio <span style="font-weight:400;opacity:0.75">(${mthus})</span></td>${datumCell}
        ${summaries.map(s => {
          const ratio = mthus !== 0 ? (s.net / mthus * 100).toFixed(1) + '%' : '—';
          return `<td class="pugh-sum-mthus">${ratio}</td>`;
        }).join('')}
      </tr>`;
      if (isWeightedMode) {
        rows += `<tr class="pugh-summary-section">
          <td class="pugh-summary-label-cell" style="color:var(--accent)">MTHUWS Ratio <span style="font-weight:400;opacity:0.75">(${mthuws})</span></td>${datumCell}
          ${summaries.map(s => {
            const ratio = mthuws !== 0 ? (s.weightedNet / mthuws * 100).toFixed(1) + '%' : '—';
            return `<td class="pugh-sum-mthus">${ratio}</td>`;
          }).join('')}
        </tr>`;
      }
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


// ── Pugh weights helper ──────────────────────────────────────

  // Recomputes window._pairWeights from saved pair state so the PUGH matrix
  // always shows correct weights even when loaded without visiting the PAIR page.
  function recomputePairWeights() {
    const mode   = (typeof pairMode    !== 'undefined') ? pairMode    : 'nonweighted';
    const subj   = (typeof pairSubject !== 'undefined') ? pairSubject : 'ilities';
    const method = (typeof pairMethod  !== 'undefined') ? pairMethod  : 'pairwise';
    const ids    = [...(typeof selectedIlities !== 'undefined' ? selectedIlities : [])];
    const weights = {};

    if (mode === 'nonweighted' || subj !== 'ilities') {
      // Non-weighted or comparing requirements — ilities all carry equal weight 1
      ids.forEach(id => { weights[id] = 1; });
      window._pairWeights = weights;
      return;
    }

    if (method === 'forcedrank') {
      const order = (typeof forcedRankOrder !== 'undefined') ? forcedRankOrder : [];
      const n = order.length;
      order.forEach((id, i) => {
        weights[id] = n === 1 ? 5 : Math.max(1, Math.round(5 - (i / (n - 1)) * 4));
      });
      ids.forEach(id => { if (weights[id] === undefined) weights[id] = 1; });
      window._pairWeights = weights;
      return;
    }

    // Weighted pairwise — derive from win counts (reuses app.js helpers if loaded)
    if (typeof calcWinCounts === 'function' && typeof assignWeights === 'function') {
      const wc = calcWinCounts();
      if (Object.keys(wc).length > 0) {
        window._pairWeights = assignWeights(wc);
        return;
      }
    }

    // Fallback: equal weights
    ids.forEach(id => { weights[id] = 1; });
    window._pairWeights = weights;
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

    // Determine if we're in weighted mode (mirrors the same check in renderPughMatrix)
    const isWeightedMode = (typeof pairMode    !== 'undefined' ? pairMode    : 'nonweighted') === 'weighted'
                        && (typeof pairSubject !== 'undefined' ? pairSubject : 'ilities')     === 'ilities'
                        && userTier !== 'free';

    const chartData = nonDatum.map((concept) => {
      let plusCount = 0;
      let minusCount = 0; // stored as negative so bars extend below zero
      let utilityScore = 0;
      let utilityScoreWeighted = 0;

      requirements.forEach(req => {
        const score = pughScores[concept.id + '_' + req.id];
        if (score === undefined || score === null) return;
        const scoreNum = scoreToNum(score);
        if (scoreNum > 0) plusCount++;
        else if (scoreNum < 0) minusCount--; // negative = bar goes downward
        const weight = window._pairWeights?.[req.primary] || 1;
        utilityScore += scoreNum;
        utilityScoreWeighted += scoreNum * weight;
      });

      utilityScoreWeighted = Math.round(utilityScoreWeighted * 10) / 10;
      // Chart always shows the score appropriate for the current mode
      const finalUtility = isWeightedMode ? utilityScoreWeighted : utilityScore;

      return { label: concept.name, plusCount, minusCount, utilityScore: finalUtility };
    });

    const labels        = chartData.map(d => d.label);
    const plusCounts    = chartData.map(d => d.plusCount);
    const minusCounts   = chartData.map(d => d.minusCount);
    const utilityScores = chartData.map(d => d.utilityScore);

    // Single Y-axis range: covers counts and utility scores together
    const allValues  = [...plusCounts, ...minusCounts, ...utilityScores, 0];
    // Always include 0 so the baseline is always visible on the axis
    const combinedMin = Math.min(Math.floor(Math.min(...allValues) * 1.2), -1);
    const combinedMax = Math.max(Math.ceil(Math.max(...allValues) * 1.2),  1);

    const utilityLabel = isWeightedMode ? 'Utility Score (Weighted)' : 'Utility Score';

    // Read theme colors so chart bars match the Pugh Matrix cells exactly
    const _sRgb   = getThemeRgb('--success-rgb') || '5,122,85';
    const _dRgb   = getThemeRgb('--danger-rgb')  || '200,30,30';
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#1a1a18';

    const ctx = canvas.getContext('2d');
    window._pughChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          // Order left→right within each group: Utility (text color), + Count (success), − Count (danger)
          {
            label: utilityLabel,
            data: utilityScores,
            backgroundColor: textColor,
            borderWidth: 0,
            yAxisID: 'y',
            order: 1
          },
          {
            label: '+ Count',
            data: plusCounts,
            backgroundColor: `rgba(${_sRgb},0.80)`,
            borderWidth: 0,
            yAxisID: 'y',
            order: 2
          },
          {
            label: '− Count',
            data: minusCounts,
            backgroundColor: `rgba(${_dRgb},0.80)`,
            borderWidth: 0,
            yAxisID: 'y',
            order: 2
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
            labels: { font: { size: 12 }, color: textColor, padding: 12, usePointStyle: true }
          },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.82)',
            padding: 10,
            callbacks: {
              label: ctx2 => {
                const v = ctx2.parsed.y;
                // Counts are stored as negatives so bars go downward — show absolute value
                // Utility scores keep their sign so negative concepts display correctly
                const isCountBar = ctx2.dataset.label === '+ Count' || ctx2.dataset.label === '− Count';
                return ctx2.dataset.label + ': ' + (isCountBar ? Math.abs(v) : v);
              }
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Utility / Count', color: textColor, font: { size: 12, weight: 600 } },
            min: combinedMin,
            max: combinedMax,
            grid: { color: `rgba(${_sRgb},0.08)` },
            ticks: {
              color: textColor,
              font: { size: 11 },
              stepSize: 1,
              callback: v => Number.isInteger(v) ? Math.abs(v) : null
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: textColor,
              font: { size: 11, weight: 600 },
              maxRotation: 90,
              minRotation: 45    // rotate labels vertically to handle long concept names
            }
          }
        }
      }
    });
  }


// ── Utility ───────────────────────────────────────────────────

  /** Read a CSS custom-property RGB triplet (e.g. "5,122,85") from the current theme. */
  function getThemeRgb(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  }

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }


// ── Basic Mode renders ────────────────────────────────────────

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

    // Render the concept score chart below the matrix
    renderQSConceptChart();
  }

  function renderQSConceptChart() {
    const chartContainer = document.getElementById('qsChartContainer');
    const canvas         = document.getElementById('qsConceptChart');
    if (!chartContainer || !canvas) return;

    const nonDatum = pughConcepts.slice(1);

    if (pughConcepts.length < 2 || requirements.length === 0) {
      chartContainer.style.display = 'none';
      return;
    }
    chartContainer.style.display = '';

    if (window._qsChart) {
      window._qsChart.destroy();
      window._qsChart = null;
    }

    const chartData = nonDatum.map((concept) => {
      let plusCount  = 0;
      let minusCount = 0; // stored negative so bars extend downward
      let netScore   = 0;

      requirements.forEach(req => {
        const score = pughScores[concept.id + '_' + req.id];
        if (score === undefined || score === null || score === '') return;
        const n = scoreToNum(score);
        if (n > 0) plusCount++;
        else if (n < 0) minusCount--;
        netScore += n;
      });

      return { label: concept.name, plusCount, minusCount, netScore };
    });

    const labels      = chartData.map(d => d.label);
    const plusCounts  = chartData.map(d => d.plusCount);
    const minusCounts = chartData.map(d => d.minusCount);
    const netScores   = chartData.map(d => d.netScore);

    const allValues  = [...plusCounts, ...minusCounts, ...netScores, 0];
    const combinedMin = Math.min(Math.floor(Math.min(...allValues) * 1.2), -1);
    const combinedMax = Math.max(Math.ceil(Math.max(...allValues) * 1.2),  1);

    // Read theme colors so chart bars match the Pugh Matrix cells exactly
    const _sRgb    = getThemeRgb('--success-rgb') || '5,122,85';
    const _dRgb    = getThemeRgb('--danger-rgb')  || '200,30,30';
    const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#1a1a18';

    const ctx = canvas.getContext('2d');
    window._qsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Net Score',
            data: netScores,
            backgroundColor: textColor,
            borderWidth: 0,
            yAxisID: 'y',
            order: 1
          },
          {
            label: '+ Count',
            data: plusCounts,
            backgroundColor: `rgba(${_sRgb},0.80)`,
            borderWidth: 0,
            yAxisID: 'y',
            order: 2
          },
          {
            label: '− Count',
            data: minusCounts,
            backgroundColor: `rgba(${_dRgb},0.80)`,
            borderWidth: 0,
            yAxisID: 'y',
            order: 2
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
            labels: { font: { size: 12 }, color: textColor, padding: 12, usePointStyle: true }
          },
          tooltip: {
            backgroundColor: 'rgba(0,0,0,0.82)',
            padding: 10,
            callbacks: {
              label: ctx2 => {
                const v = ctx2.parsed.y;
                const isCountBar = ctx2.dataset.label === '+ Count' || ctx2.dataset.label === '− Count';
                return ctx2.dataset.label + ': ' + (isCountBar ? Math.abs(v) : v);
              }
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            position: 'left',
            title: { display: true, text: 'Score / Count', color: textColor, font: { size: 12, weight: 600 } },
            min: combinedMin,
            max: combinedMax,
            grid: { color: `rgba(${_sRgb},0.08)` },
            ticks: {
              color: textColor,
              font: { size: 11 },
              stepSize: 1,
              callback: v => Number.isInteger(v) ? Math.abs(v) : null
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: textColor,
              font: { size: 11, weight: 600 },
              maxRotation: 90,
              minRotation: 45
            }
          }
        }
      }
    });
  }

