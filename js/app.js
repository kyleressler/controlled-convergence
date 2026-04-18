// ============================================================
// app.js — Application logic, event handlers, and initialization
// Depends on: state.js, api.js, auth.js, analytics.js, projects.js, ui.js
// Load order: state → api → auth → analytics → projects → ui → app
// ============================================================

  // ── SLIDES DATA ──
  // Slide content now lives in sidebar-content.js (SIDEBAR_CONTENT).
  // The old hardcoded slides array has been replaced by the context-sensitive system.



  // ── SIDEBAR ──
  function toggleSidebar(side) {
    const leftEl  = document.getElementById('leftSidebar');
    const rightEl = document.getElementById('rightSidebar');

    if (side === 'right') {
      const willOpen = !rightEl.classList.contains('open');
      rightEl.classList.toggle('open');
      document.body.classList.toggle('right-sidebar-open', willOpen);
      if (willOpen) {
        leftEl.classList.remove('open');        // mutual exclusion
        loadSidebarContent(_currentPage, 0);    // populate for current page
      }
    } else {
      const willOpen = !leftEl.classList.contains('open');
      leftEl.classList.toggle('open');
      if (willOpen) {
        rightEl.classList.remove('open');       // mutual exclusion
        document.body.classList.remove('right-sidebar-open');
      }
    }
  }

  // Open the right sidebar and jump directly to a specific slide.
  // Called by ⓘ icons: openSidebarToSlide('tbus', 1)
  function openSidebarToSlide(pageId, slideIdx) {
    const rightEl = document.getElementById('rightSidebar');
    const leftEl  = document.getElementById('leftSidebar');
    rightEl.classList.add('open');
    leftEl.classList.remove('open');
    document.body.classList.add('right-sidebar-open');
    loadSidebarContent(pageId, slideIdx);
  }

  // Populate the sidebar with the slide set for the given page.
  function loadSidebarContent(pageId, slideIdx) {
    const content = (typeof SIDEBAR_CONTENT !== 'undefined' && SIDEBAR_CONTENT[pageId])
      ? SIDEBAR_CONTENT[pageId]
      : (typeof SIDEBAR_CONTENT !== 'undefined' ? SIDEBAR_CONTENT.home : []);
    currentSlide = Math.max(0, Math.min(content.length - 1, slideIdx || 0));
    renderSlides(content);
  }

  // ── (legacy stub — setMode() for app mode switching is defined in the Basic Mode section below) ──

  // ── VALIDATION LOGIC ──
  // Words that name a specific artifact or technology — instant danger
  const artifactWords = [
    'bridge', 'app', 'application', 'device', 'machine', 'vehicle', 'engine',
    'sensor', 'circuit', 'prototype', 'widget', 'component', 'apparatus',
    'software', 'hardware', 'platform', 'website', 'interface', 'dashboard',
    'database', 'algorithm', 'robot', 'drone', 'chatbot', 'blockchain',
    '3d print', 'iot sensor', 'vr headset', 'ar overlay', 'kiosk',
    'pipeline', 'pump', 'valve', 'turbine', 'reactor', 'module',
  ];

  // Verbs that name the act of building — instant danger
  const buildingVerbs = [
    'make a', 'make an', 'build a', 'build an', 'create a', 'create an',
    'design a', 'design an', 'develop a', 'develop an', 'construct a',
    'manufacture a', 'produce a', 'fabricate a', 'implement a', 'implement an',
    'engineer a', 'engineer an', 'deploy a', 'assemble a', 'install a',
    'code a', 'program a',
  ];

  // Human references — the TO should be about a person
  const humanWords = [
    'user', 'users', 'people', 'person', 'persons', 'human', 'humans',
    'commuter', 'commuters', 'patient', 'patients', 'student', 'students',
    'employee', 'employees', 'customer', 'customers', 'driver', 'drivers',
    'pedestrian', 'pedestrians', 'worker', 'workers', 'operator', 'operators',
    'team', 'community', 'resident', 'residents', 'citizen', 'citizens',
    'passenger', 'passengers', 'traveler', 'travelers', 'traveller',
    'surgeon', 'nurse', 'doctor', 'pilot', 'farmer', 'teacher', 'researcher',
    'individual', 'stakeholder', 'engineer', 'technician', 'caregiver',
    'family', 'parent', 'child', 'children', 'elderly',
  ];

  // Outcome language — the TO should describe what someone experiences or achieves
  const outcomeVerbs = [
    'help', 'enable', 'allow', 'ensure', 'reduce', 'increase', 'improve',
    'maintain', 'prevent', 'protect', 'provide', 'achieve', 'gain',
    'understand', 'learn', 'perform', 'complete', 'navigate', 'manage',
    'communicate', 'collaborate', 'experience', 'accomplish', 'access',
    'monitor', 'safely', 'reliably', 'effectively', 'efficiently',
    'cross', 'move', 'travel', 'receive', 'obtain', 'restore', 'recover',
  ];

  function checkTo(text) {
    if (!text.trim() || text.trim().length < 8) return null;
    const lower = text.toLowerCase();

    // 1. Building verbs — naming the act of making something
    for (const w of buildingVerbs) {
      if (lower.includes(w)) {
        return {
          type: 'danger',
          msg: `✗ "${w}" describes what you plan to build, not what someone needs. The TO must be solution-neutral. Try: "To help [who] [achieve/experience what]..." — no artifact, no technology.`
        };
      }
    }

    // 2. Artifact / technology words — naming the solution
    for (const w of artifactWords) {
      if (lower.includes(w)) {
        return {
          type: 'danger',
          msg: `✗ Your TO names a specific artifact or technology ("${w}"). Ask yourself: if you solved this with a completely different approach, would this TO still be true? If not, it's not solution-neutral.`
        };
      }
    }

    // 3. Positive check — needs both a human reference AND outcome language to pass
    const hasHuman = humanWords.some(w => lower.includes(w));
    const hasOutcome = outcomeVerbs.some(w => lower.includes(w));

    if (hasHuman && hasOutcome) {
      return {
        type: 'success',
        msg: '✓ Your TO describes a human outcome without naming a solution. Final test: could a completely different solution satisfy this same TO? If yes, you\'re good.'
      };
    }

    if (hasHuman && !hasOutcome) {
      return {
        type: 'warn',
        msg: '⚠ You\'ve identified who is affected — good. Now complete the picture: what outcome does this person experience? What becomes possible, safer, or more reliable for them?'
      };
    }

    if (!hasHuman && hasOutcome) {
      return {
        type: 'warn',
        msg: '⚠ Almost there — but who benefits? A strong TO anchors the outcome to a specific person or group. Adding "who" keeps the statement human-centered and testable.'
      };
    }

    // Has content but no human or outcome signal yet
    return {
      type: 'warn',
      msg: '⚠ A strong TO describes a human outcome without naming the solution. Try: "To help [who] [achieve/experience what]..." — no objects, no technologies, just the need.'
    };
  }

  function checkBy(text) {
    if (!text.trim() || text.trim().length < 8) return null;
    const lower = text.toLowerCase();

    // BY should be specific — warn if it sounds too vague or abstract
    const tooVague = ['doing', 'something', 'somehow', 'some way', 'various', 'different ways', 'a way'];
    for (const w of tooVague) {
      if (lower.includes(w)) {
        return { type: 'warn', msg: '⚠ Your BY sounds vague. Unlike the TO, the BY can and should be specific — describe the actual mechanism, function, or approach that will deliver the outcome.' };
      }
    }

    // Good BY typically has an action verb or mechanism language
    const goodIndicators = [
      'providing', 'delivering', 'enabling', 'connecting', 'transmitting',
      'filtering', 'distributing', 'controlling', 'monitoring', 'routing',
      'automating', 'structuring', 'guiding', 'detecting', 'converting',
      'storing', 'processing', 'transferring', 'generating', 'supporting',
    ];
    const hasGoodIndicator = goodIndicators.some(w => lower.includes(w));

    if (hasGoodIndicator) {
      return { type: 'success', msg: '✓ Your BY describes a specific function or mechanism — that\'s exactly right.' };
    }

    if (text.trim().length >= 20) {
      return { type: 'success', msg: '✓ Your BY is taking shape. Make sure it names a specific function, mechanism, or approach — not just a direction.' };
    }

    return { type: 'warn', msg: '⚠ The BY should describe a specific function or mechanism. How exactly will the outcome be achieved? Name the operative action.' };
  }

  function checkUsing(text) {
    if (!text.trim() || text.trim().length < 6) return null;
    const lower = text.toLowerCase();

    const tooVague = ['things', 'stuff', 'tools', 'technology', 'resources', 'means'];
    const onlyVague = tooVague.some(w => lower.trim() === w);
    if (onlyVague) {
      return { type: 'warn', msg: '⚠ Try to be more specific. Name the actual resource, material, infrastructure, or technology — not a general category.' };
    }

    if (text.trim().length >= 12) {
      return { type: 'success', msg: '✓ Your USING names the specific means or resources deployed. Good.' };
    }

    return null;
  }

  function checkWhile(text) {
    if (!text.trim() || text.trim().length < 8) return null;
    const lower = text.toLowerCase();

    // Strong WHILE uses constraint language
    const constraintWords = [
      'minimizing', 'not exceeding', 'within', 'without', 'avoiding',
      'maintaining', 'ensuring', 'preventing', 'limiting', 'keeping',
      'no more than', 'at least', 'less than', 'greater than', 'under',
      'budget', 'cost', 'weight', 'time', 'schedule', 'regulation',
      'complying', 'compliance', 'standard', 'requirement',
    ];
    const hasConstraintLang = constraintWords.some(w => lower.includes(w));

    if (hasConstraintLang) {
      return { type: 'success', msg: '✓ Your WHILE reads like a real constraint — something that could actually eliminate a solution if violated. That\'s the test.' };
    }

    return { type: 'warn', msg: '⚠ A strong WHILE must be a real constraint, not a vague wish. Ask: could this statement actually eliminate a concept? If not, sharpen it — add a specific limit, budget, regulation, or condition.' };
  }

  function onInput(field) {
    const text = document.getElementById('input-' + field).value;
    let result;
    if (field === 'to') result = checkTo(text);
    else if (field === 'by') result = checkBy(text);
    else if (field === 'using') result = checkUsing(text);
    else if (field === 'while') result = checkWhile(text);
    else result = null;

    // Auto-coaching is disabled on the GOAL page — no inline messages fire as you type
    if (_currentPage !== 'tbus') {
      const valEl = document.getElementById('val-' + field);
      const valTextEl = document.getElementById('val-' + field + '-text');
      const dotEl = document.getElementById('dot-' + field);

      valEl.className = 'validation-msg';
      dotEl.className = 'status-dot';

      if (result && text.trim().length > 3) {
        if (userTier === 'free' || userTier === 'account') {
          // Only show danger warnings; replace coaching with upgrade prompt
          if (result.type === 'danger') {
            valEl.classList.add('visible', 'danger');
            dotEl.classList.add('fail');
            valTextEl.textContent = result.msg;
          } else {
            valEl.classList.add('visible', 'warn');
            dotEl.classList.add('warn');
            valTextEl.textContent = '✨ Pro users get AI coaching on each section. Upgrade for personalized feedback.';
          }
        } else {
          valEl.classList.add('visible');
          if (result.type === 'warn') { valEl.classList.add('warn'); dotEl.classList.add('warn'); }
          if (result.type === 'danger') { valEl.classList.add('danger'); dotEl.classList.add('fail'); }
          if (result.type === 'success') { valEl.classList.add('success'); dotEl.classList.add('pass'); }
          valTextEl.textContent = result.msg;
        }
      }
    }

    updatePreview();
    checkContinue();
  }

  // ── LIVE PREVIEW ──

  function updateFeatures() { /* Feature toggle hooks — extend as needed */ }

  // ── ACCOUNT / TIER ──
  // DEV ONLY: switch tier for testing
  function setDevTier(tier) {
    userTier = tier;
    ['free','account','pro'].forEach(t => {
      const btn = document.getElementById('devTier' + t.charAt(0).toUpperCase() + t.slice(1));
      if (btn) btn.classList.toggle('active', t === tier);
    });
    updateAccountStatus();
    renderProjList();
    updatePairGate();
    renderIlityGrid();
    renderStakGrid();
    updatePughAccountToggles();
    renderPughMatrix();
  }

  // Update pairwise weighted gate visibility based on tier
  function updatePairGate() {
    const gate = document.getElementById('pairWeightedGate');
    if (!gate) return;
    gate.style.display = (userTier === 'free') ? '' : 'none';
  }

  function handleAccountCTA() {
    if (!appState.currentUser) {
      openAuthModal('signup');
    } else if (userTier === 'account') {
      alert('Pro upgrade coming soon! Export your project data to share or back up your work.');
    }
  }

  async function handleLogout() {
    if (!appState.currentUser) return;
    const { error } = await logout();
    if (error) { alert('Logout error: ' + error); return; }
    // Force a full page reload after logout. This is the most reliable
    // way to clear all in-memory and cached state across all browsers,
    // including Safari on iOS which can silently restore sessions otherwise.
    window.location.reload();
  }

  // ── Auth Modal ────────────────────────────────────────────────

  function openAuthModal(tab) {
    tab = tab || 'login';
    switchAuthTab(tab);
    document.getElementById('authModal').classList.add('open');
  }

  function closeAuthModal() {
    document.getElementById('authModal').classList.remove('open');
    ['authLoginEmail','authLoginPassword','authSignupName','authSignupEmail','authSignupPassword'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    // Reset terms checkbox and button state
    var termsCheck = document.getElementById('authTermsCheck');
    if (termsCheck) termsCheck.checked = false;
    updateSignupBtn();
    ['authLoginError','authSignupError','authSignupSuccess'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) { el.style.display = 'none'; el.textContent = ''; }
    });
  }

  function switchAuthTab(tab) {
    var isLogin = tab === 'login';
    document.getElementById('authFormLogin').style.display  = isLogin ? '' : 'none';
    document.getElementById('authFormSignup').style.display = isLogin ? 'none' : '';
    var loginTab  = document.getElementById('authTabLogin');
    var signupTab = document.getElementById('authTabSignup');
    if (loginTab) {
      loginTab.style.borderBottomColor = isLogin ? 'var(--accent)' : 'transparent';
      loginTab.style.color             = isLogin ? 'var(--accent)' : 'var(--text-muted)';
    }
    if (signupTab) {
      signupTab.style.borderBottomColor = !isLogin ? 'var(--accent)' : 'transparent';
      signupTab.style.color             = !isLogin ? 'var(--accent)' : 'var(--text-muted)';
    }
  }

  async function submitAuthLogin() {
    var email    = (document.getElementById('authLoginEmail')?.value    || '').trim();
    var password =  document.getElementById('authLoginPassword')?.value || '';
    var errEl    =  document.getElementById('authLoginError');
    var btn      =  document.getElementById('authLoginBtn');
    if (!email || !password) {
      if (errEl) { errEl.textContent = 'Please enter your email and password.'; errEl.style.display = ''; }
      return;
    }
    if (btn) { btn.textContent = 'Logging in…'; btn.disabled = true; }
    var result = await login(email, password);
    if (btn) { btn.textContent = 'Log In'; btn.disabled = false; }
    if (result.error) {
      if (errEl) { errEl.textContent = result.error; errEl.style.display = ''; }
      return;
    }
    await loadProjects(result.user.id);
    updateAccountStatus();
    updateTierBadges();
    updatePughAccountToggles();
    renderProjList();
    closeAuthModal();
  }

  async function submitAuthSignup() {
    var name     = (document.getElementById('authSignupName')?.value     || '').trim();
    var email    = (document.getElementById('authSignupEmail')?.value    || '').trim();
    var password =  document.getElementById('authSignupPassword')?.value || '';
    var errEl    =  document.getElementById('authSignupError');
    var succEl   =  document.getElementById('authSignupSuccess');
    var btn      =  document.getElementById('authSignupBtn');
    if (!email || !password) {
      if (errEl) { errEl.textContent = 'Please enter your email and a password.'; errEl.style.display = ''; }
      return;
    }
    if (password.length < 8) {
      if (errEl) { errEl.textContent = 'Password must be at least 8 characters.'; errEl.style.display = ''; }
      return;
    }
    if (errEl) errEl.style.display = 'none';
    if (btn) { btn.textContent = 'Creating account…'; btn.disabled = true; }
    var result = await register(email, password, name);
    if (btn) { btn.textContent = 'Create Account'; btn.disabled = false; }
    if (result.error) {
      if (errEl) { errEl.textContent = result.error; errEl.style.display = ''; }
      return;
    }
    if (result.requiresEmailConfirm) {
      if (succEl) { succEl.textContent = 'Account created! Check your email to confirm, then log in.'; succEl.style.display = ''; }
      return;
    }
    await loadProjects(result.user.id);
    updateAccountStatus();
    updateTierBadges();
    renderProjList();
    closeAuthModal();
  }


  // ── PROJECT DATA EXPORT / UPLOAD ──
  function exportProjectData() {
    const data = {
      exportedAt: new Date().toISOString(),
      version: '1.2',
      project: activeProject,
      goalMode: goalMode,
      goalStatement: {
        basic: document.getElementById('input-goal-basic')?.value || '',
        to: document.getElementById('input-to')?.value || '',
        by: document.getElementById('input-by')?.value || '',
        using: document.getElementById('input-using')?.value || '',
        while: document.getElementById('input-while')?.value || '',
      },
      ilities: { selected: [...selectedIlities], custom: customIlities },
      stakeholders: { selected: [...selectedStakeholders], custom: customStakeholders },
      requirements: requirements,
      reqIdCounter: reqIdCounter,
      pairComparisons: pairComparisons,
      pugh: {
        concepts: pughConcepts,
        scores: pughScores,
        advBackup: pughAdvBackup,
        settings: pughSettings,
        counter: pughConceptCounter,
        datumPerformance: datumPerformance,
        conceptPerformance: conceptPerformance,
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (activeProject?.name || 'cc-project').replace(/[^a-z0-9]/gi,'_') + '_' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function uploadProjectData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (!confirm('This will replace your current session data. Continue?')) return;
          if (data.goalStatement) {
            // Restore basic mode goal textarea
            if (data.goalStatement.basic) {
              const basicEl = document.getElementById('input-goal-basic');
              if (basicEl) basicEl.value = data.goalStatement.basic;
            }
            ['to','by','using','while'].forEach(f => {
              const el = document.getElementById('input-' + f);
              if (el && data.goalStatement[f]) { el.value = data.goalStatement[f]; onInput(f); }
            });
          }
          // Restore goal mode (basic textarea vs. structured TO/BY fields)
          if (data.goalMode) {
            goalMode = data.goalMode;
            if (typeof switchGoalMode === 'function') switchGoalMode(goalMode);
          }
          if (data.ilities) {
            if (data.ilities.custom) customIlities = data.ilities.custom;
            if (data.ilities.selected) selectedIlities = new Set(data.ilities.selected);
            renderIlityGrid();
          }
          if (data.stakeholders) {
            if (data.stakeholders.custom) customStakeholders = data.stakeholders.custom;
            if (data.stakeholders.selected) selectedStakeholders = new Set(data.stakeholders.selected);
            renderStakGrid();
          }
          if (data.requirements) {
            requirements = data.requirements;
            // Advance reqIdCounter past the highest existing req ID to prevent collisions.
            // Use the exported counter if available; also scan IDs as a safety net for old exports.
            const storedCounter = data.reqIdCounter || 0;
            const scannedMax = requirements.reduce((max, r) => {
              if (typeof r.id === 'number') return Math.max(max, r.id);
              if (typeof r.id === 'string' && r.id.startsWith('r')) {
                const n = parseInt(r.id.slice(1), 10);
                return isNaN(n) ? max : Math.max(max, n);
              }
              return max;
            }, 0);
            reqIdCounter = Math.max(storedCounter, scannedMax);
            renderRequirements();
          }
          if (data.pairComparisons) pairComparisons = data.pairComparisons;
          if (data.pugh) {
            if (data.pugh.concepts)          pughConcepts       = data.pugh.concepts;
            if (data.pugh.scores)            pughScores         = data.pugh.scores;
            if (data.pugh.advBackup)         pughAdvBackup      = data.pugh.advBackup;
            if (data.pugh.settings)          Object.assign(pughSettings, data.pugh.settings);
            if (data.pugh.counter)           pughConceptCounter = data.pugh.counter;
            if (data.pugh.datumPerformance)  datumPerformance   = data.pugh.datumPerformance;
            if (data.pugh.conceptPerformance) conceptPerformance = data.pugh.conceptPerformance;
            // Sync UI to restored settings
            if (typeof syncScoringModeButtons === 'function') syncScoringModeButtons();
            const mCb    = document.getElementById('toggleMTHUS');
            const masCb  = document.getElementById('toggleMAS');
            if (mCb)    mCb.checked    = pughSettings.showMTHUS;
            if (masCb)  masCb.checked  = pughSettings.showMAS;
            renderConceptCards();
            renderPughMatrix();
          }
          if (data.project) { activeProject = data.project; updateNavProjectName(); }
          if (typeof renderProjPage === 'function') renderProjPage();
          populateReqForms();
          // Refresh Basic Mode display so imported data appears immediately without toggling modes
          if (typeof syncGuidedToQS === 'function') syncGuidedToQS();
          alert('Project data loaded successfully!');
        } catch(err) {
          alert('Could not parse project file. Make sure it is a valid Controlled Convergence JSON export.');
        }
      };
      reader.readAsText(file);
    };
    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  }

  function clearAllWithWarning() {
    if (!confirm('Clear ALL project data? This will reset your goal statement, ilities, stakeholders, requirements, and pairwise comparisons. This cannot be undone.')) return;
    ['to','by','using','while'].forEach(f => {
      const el = document.getElementById('input-' + f);
      if (el) el.value = '';
      const dotEl = document.getElementById('dot-' + f);
      if (dotEl) dotEl.className = 'status-dot';
      const valEl = document.getElementById('val-' + f);
      if (valEl) valEl.className = 'validation-msg';
    });
    const pb = document.getElementById('previewBanner');
    if (pb) pb.classList.remove('visible');
    selectedIlities.clear(); customIlities = []; renderIlityGrid();
    selectedStakeholders.clear(); customStakeholders = []; renderStakGrid();
    requirements = []; reqIdCounter = 0; renderRequirements();
    pairComparisons = {}; pairIndex = 0;
    pughConcepts = []; pughScores = {}; pughAdvBackup = {}; pughConceptCounter = 0;
    datumPerformance = {}; conceptPerformance = {}; conceptNotes = {};
    conceptCustomFields = []; _cfIdCounter = 0; scorerFilter = '';
    pughSettings = { advancedScoring: false, showMTHUS: false, showMAS: false };
    exitScoringView();
    activeProject = null; updateNavProjectName();
    populateReqForms();
    const ab = document.getElementById('advisorBody');
    if (ab) ab.innerHTML = '<p>Start writing your goal statement above — I\'ll help you sharpen each part as you go.</p><p>The most important thing to get right first is your <strong>TO</strong>. It must describe an outcome for a person, not a product or technology.</p>';
    const cont = document.getElementById('btnContinue');
    if (cont) cont.disabled = true;
  }

  function exportReport() {
    if (userTier !== 'pro') {
      showUpgradePrompt('export-report');
      return;
    }
    // Pre-populate the filename field with the project name + date
    const fnField = document.getElementById('rptFileName');
    if (fnField) {
      const safeName = (activeProject?.name || 'CC_Report').replace(/[^a-zA-Z0-9\s_-]/g, '').trim().replace(/\s+/g, '_');
      const dateTag  = new Date().toISOString().slice(0,10).replace(/-/g,'');
      fnField.value  = `${safeName}_${dateTag}`;
    }
    document.getElementById('exportReportModal').classList.add('open');
  }

  function generateReport() {
    document.getElementById('exportReportModal').classList.remove('open');

    const inc = {
      tbuw: document.getElementById('rptTBUW').checked,
      ilty: document.getElementById('rptILTY').checked,
      stak: document.getElementById('rptSTAK').checked,
      reqs: document.getElementById('rptREQS').checked,
      pair: document.getElementById('rptPAIR').checked,
      scor: document.getElementById('rptSCOR').checked,
      pugh: document.getElementById('rptPUGH').checked,
    };

    // Use the user-supplied filename, falling back to project name + date
    const rawFileName  = (document.getElementById('rptFileName')?.value || '').trim();
    const projName     = activeProject?.name        || 'Untitled Project';
    const projOwner    = activeProject?.owner       || '';
    const projDesc     = activeProject?.description || '';
    const dateStr      = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
    const exportFileName = rawFileName
      ? rawFileName.replace(/\.pdf$/i, '')
      : (projName.replace(/[^a-zA-Z0-9\s_-]/g, '').trim().replace(/\s+/g, '_') + '_Report');

    let sections = '';

    // ── GOAL STATEMENT ──
    if (inc.tbuw) {
      if (goalMode === 'basic') {
        const basicGoal = document.getElementById('input-goal-basic')?.value || '';
        sections += rptSection('2', 'Goal Statement',
          basicGoal
            ? `<div class="rpt-callout">${escHtml(basicGoal)}</div>`
            : '<p><em>No goal statement entered.</em></p>');
      } else {
        const to    = document.getElementById('input-to')?.value    || '';
        const by    = document.getElementById('input-by')?.value    || '';
        const using = document.getElementById('input-using')?.value || '';
        const wh    = document.getElementById('input-while')?.value || '';
        const rows  = [
          ['TO',    to],
          ['BY',    by],
          ['USING', using],
          ['WHILE', wh],
        ].map(([label, val]) => `<tr><td class="rpt-label-cell">${label}</td><td>${escHtml(val) || '<em>—</em>'}</td></tr>`).join('');
        const preview = [to, by, using, wh].filter(Boolean).join(' ');
        sections += rptSection('2', 'Goal Statement (To · By · Using · While)',
          `<table class="rpt-table">${rows}</table>` +
          (preview ? `<div class="rpt-callout" style="margin-top:12px"><strong>Full Statement:</strong> To ${escHtml(to)} by ${escHtml(by)} using ${escHtml(using)}${wh ? ' while ' + escHtml(wh) : ''}.</div>` : ''));
      }
    }

    // ── ILITIES ──
    if (inc.ilty) {
      const all = [...ILITIES, ...customIlities];
      const sel = all.filter(i => selectedIlities.has(i.id));
      const rows = sel.map(i => `<tr><td>${escHtml(i.name)}</td><td>${escHtml(i.desc || '')}</td></tr>`).join('');
      sections += rptSection('3', `Selected Ilities (${sel.length})`,
        sel.length ? `<table class="rpt-table"><thead><tr><th>Ility</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table>` : '<p><em>No ilities selected.</em></p>');
    }

    // ── STAKEHOLDERS ──
    if (inc.stak) {
      const all = [...STAKEHOLDERS, ...customStakeholders];
      const sel = all.filter(s => selectedStakeholders.has(s.id));
      const rows = sel.map(s => `<tr><td>${escHtml(s.name)}</td><td>${escHtml(s.desc || '')}</td></tr>`).join('');
      sections += rptSection('4', `Stakeholders (${sel.length})`,
        sel.length ? `<table class="rpt-table"><thead><tr><th>Stakeholder</th><th>Description</th></tr></thead><tbody>${rows}</tbody></table>` : '<p><em>No stakeholders selected.</em></p>');
    }

    // ── REQUIREMENTS ──
    if (inc.reqs) {
      const rows = requirements.map((r, idx) => {
        const ilName = [...ILITIES,...customIlities].find(i => i.id === r.primary)?.name || r.primary || '—';
        const sk2    = r.secondary ? ([...STAKEHOLDERS,...customStakeholders].find(s => s.id === r.secondary)?.name || r.secondary) : '—';
        const typeLabel = r.type === 'objective' ? 'Objective' : r.type === 'constraint' ? 'Constraint' : r.type || '—';
        return `<tr><td>${idx+1}</td><td>${escHtml(r.text || '')}</td><td>${typeLabel}</td><td>${escHtml(ilName)}</td><td>${escHtml(sk2)}</td></tr>`;
      }).join('');
      sections += rptSection('5', `Requirements (${requirements.length})`,
        requirements.length
          ? `<table class="rpt-table"><thead><tr><th>#</th><th>Requirement</th><th>Type</th><th>Primary Ility</th><th>Stakeholder</th></tr></thead><tbody>${rows}</tbody></table>`
          : '<p><em>No requirements defined.</em></p>');
    }

    // ── PAIRWISE RANKINGS ──
    if (inc.pair) {
      // Recompute rankings from pairComparisons
      const allIl = [...ILITIES,...customIlities].filter(i => selectedIlities.has(i.id));
      const wins  = {};
      allIl.forEach(i => { wins[i.id] = 0; });
      Object.entries(pairComparisons).forEach(([key, winner]) => {
        if (wins[winner] !== undefined) wins[winner]++;
      });
      const ranked = allIl.map(i => ({ name:i.name, wins:wins[i.id]||0 })).sort((a,b)=>b.wins-a.wins);
      const rows = ranked.map((r,i) => `<tr><td>${i+1}</td><td>${escHtml(r.name)}</td><td>${r.wins}</td></tr>`).join('');
      sections += rptSection('6', 'Pairwise Ility Rankings',
        ranked.length
          ? `<table class="rpt-table"><thead><tr><th>Rank</th><th>Ility</th><th>Win Count</th></tr></thead><tbody>${rows}</tbody></table>`
          : '<p><em>No pairwise comparisons completed.</em></p>');
    }

    // ── CONCEPT SCORING (SCOR) ──
    if (inc.scor) {
      if (!pughConcepts.length) {
        sections += rptSection('7', 'Concept Scoring', '<p><em>No concepts defined.</em></p>');
      } else {
        const totalReqs = requirements.length;
        const rows = pughConcepts.map((c, idx) => {
          const scored = requirements.filter(r => pughScores[c.id + '_' + r.id] !== undefined).length;
          const isBaseline = idx === 0;
          const badge = isBaseline ? ' <span style="font-size:11px;background:#e2e8f0;padding:1px 6px;border-radius:4px">Datum</span>' : '';
          return `<tr><td>${escHtml(c.name)}${badge}</td><td>${scored} / ${totalReqs}</td></tr>`;
        }).join('');
        sections += rptSection('7', `Concept Scoring (${pughConcepts.length} concepts)`,
          `<table class="rpt-table"><thead><tr><th>Concept</th><th>Requirements Scored</th></tr></thead><tbody>${rows}</tbody></table>`);
      }
    }

    // ── PUGH MATRIX ──
    if (inc.pugh) {
      if (!pughConcepts.length || !requirements.length) {
        sections += rptSection('8', 'Pugh Matrix', '<p><em>No concepts or requirements to display.</em></p>');
      } else {
        const datum = pughConcepts[0];
        const others = pughConcepts.slice(1);
        const hdr = `<tr><th style="text-align:left">Requirement</th><th>Ility</th>${pughConcepts.map((c,i) => `<th>${escHtml(c.name)}${i===0?' (D)':''}</th>`).join('')}</tr>`;
        const dataRows = requirements.map(r => {
          const ilName = [...ILITIES,...customIlities].find(i => i.id === r.primary)?.name || '—';
          const cells = pughConcepts.map((c,i) => {
            if (i === 0) return '<td style="text-align:center;font-weight:600">D</td>';
            const score = pughScores[c.id + '_' + r.id];
            const disp = score === undefined ? '—' : (score > 0 ? '+' : score < 0 ? '−' : '0');
            return `<td style="text-align:center">${disp}</td>`;
          }).join('');
          return `<tr><td>${escHtml(r.text || '').substring(0,80)}${(r.text||'').length>80?'…':''}</td><td style="font-size:11px;color:#666">${escHtml(ilName)}</td>${cells}</tr>`;
        }).join('');

        // Summary rows
        const plusCounts  = pughConcepts.map((c,i) => i===0 ? 'D' : requirements.filter(r => (pughScores[c.id+'_'+r.id]||0) > 0).length);
        const minusCounts = pughConcepts.map((c,i) => i===0 ? '' : requirements.filter(r => (pughScores[c.id+'_'+r.id]||0) < 0).length);
        const netScores   = pughConcepts.map((c,i) => i===0 ? '' : requirements.reduce((s,r) => s + (pughScores[c.id+'_'+r.id]||0), 0));

        const sumRows = [
          `<tr style="background:#f7f8fa"><td><strong>+ Count</strong></td><td></td>${plusCounts.map(v=>`<td style="text-align:center;font-weight:600;color:#38a169">${v}</td>`).join('')}</tr>`,
          `<tr style="background:#f7f8fa"><td><strong>− Count</strong></td><td></td>${minusCounts.map(v=>`<td style="text-align:center;font-weight:600;color:#e53e3e">${v}</td>`).join('')}</tr>`,
          `<tr style="background:#f7f8fa"><td><strong>Utility Score</strong></td><td></td>${netScores.map((v,i)=>`<td style="text-align:center;font-weight:700">${i===0?'':''+v}</td>`).join('')}</tr>`,
        ].join('');

        sections += rptSection('8', 'Pugh Matrix',
          `<div style="overflow-x:auto"><table class="rpt-table"><thead>${hdr}</thead><tbody>${dataRows}${sumRows}</tbody></table></div>`);
      }
    }

    // ── BUILD DOCUMENT ──
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escHtml(exportFileName)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #1a202c; background: #fff; font-size: 13px; line-height: 1.65; }
  .cover { padding: 72px 64px; border-bottom: 3px solid #1a202c; margin-bottom: 0; page-break-after: always; }
  .cover-label { font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: #666; margin-bottom: 24px; }
  .cover-title { font-size: 32px; font-weight: 700; line-height: 1.2; margin-bottom: 16px; }
  .cover-meta { font-size: 13px; color: #555; line-height: 2; }
  .cover-meta span { display: block; }
  .section { padding: 40px 64px; border-bottom: 1px solid #e2e8f0; page-break-inside: avoid; }
  .section:last-child { border-bottom: none; }
  .section-header { display: flex; align-items: baseline; gap: 12px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #1a202c; }
  .section-num { font-family: 'Courier New', monospace; font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #666; }
  .section-title { font-size: 17px; font-weight: 700; color: #1a202c; }
  .rpt-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 4px; }
  .rpt-table th { background: #1a202c; color: #fff; padding: 7px 10px; text-align: left; font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; }
  .rpt-table td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
  .rpt-table tr:last-child td { border-bottom: none; }
  .rpt-table tr:nth-child(even) td { background: #f7f8fa; }
  .rpt-label-cell { font-weight: 700; font-family: 'Courier New', monospace; font-size: 11px; letter-spacing: 0.08em; color: #666; white-space: nowrap; width: 70px; }
  .rpt-callout { background: #f7f8fa; border-left: 3px solid #4a5568; padding: 12px 16px; font-size: 13px; border-radius: 0 4px 4px 0; }
  p { margin-bottom: 10px; }
  .footer { padding: 24px 64px; font-size: 11px; color: #999; font-family: 'Courier New', monospace; display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .section { page-break-inside: avoid; }
    .cover { page-break-after: always; }
  }
</style>
</head>
<body>

<div class="cover">
  <div class="cover-label">Controlled Convergence · Design Analysis Report</div>
  <div class="cover-title">${escHtml(projName)}</div>
  <div class="cover-meta">
    ${projOwner ? `<span>Owner: ${escHtml(projOwner)}</span>` : ''}
    ${projDesc ? `<span>Description: ${escHtml(projDesc)}</span>` : ''}
    <span>Generated: ${dateStr}</span>
    <span>Method: Stuart Pugh's Controlled Convergence</span>
  </div>
</div>

${sections}

<div class="footer">
  <span>Controlled Convergence · ${escHtml(projName)}</span>
  <span>${dateStr}</span>
</div>

<script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) { alert('Please allow pop-ups for this page to generate the report.'); return; }
    win.document.write(html);
    win.document.close();
  }




  function handleCoachingClick() {
    if (userTier !== 'pro') {
      showUpgradePrompt('coaching');
      return;
    }
    getCoaching();
  }

  function handlePairModeClick(mode, btn) {
    if (mode === 'weighted' && userTier === 'free') {
      showUpgradePrompt('weighted-pair');
      return;
    }
    setPairMode(mode, btn);
  }

  function handlePairSubjectClick(subject, btn) {
    if (subject === 'requirements' && userTier === 'free') {
      showUpgradePrompt('pair-subject-req');
      return;
    }
    pairSubject = subject;
    btn.closest('.pair-mode-toggle').querySelectorAll('.pair-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    initPairPairs();
    initForcedRankOrder();
    syncPairView();
  }

  function handlePairMethodClick(method, btn) {
    pairMethod = method;
    btn.closest('.pair-mode-toggle').querySelectorAll('.pair-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (method === 'forcedrank') initForcedRankOrder();
    syncPairView();
  }

  // Show/hide the correct content section based on all three toggle states.
  function syncPairView() {
    const ws  = document.getElementById('pairWeightedSection');
    const nws = document.getElementById('pairNonWeightedSection');
    const frs = document.getElementById('pairForcedRankSection');
    const pw  = document.getElementById('pairProgressWrap');
    const mrow = document.getElementById('pairMethodRow');
    const isForced   = pairMethod === 'forcedrank';
    const isWeighted = pairMode   === 'weighted';

    // Non-weighted: hide the Method row entirely (method is irrelevant)
    if (mrow) mrow.style.display = isWeighted ? '' : 'none';

    // In non-weighted mode, always show the non-weighted section regardless of method
    if (ws)  ws.style.display  = (isWeighted && !isForced) ? '' : 'none';
    if (nws) nws.style.display = (!isWeighted) ? '' : 'none';
    if (frs) frs.style.display = (isWeighted && isForced)  ? '' : 'none';
    if (pw)  pw.style.display  = (isWeighted && !isForced) ? '' : 'none';

    // Update non-weighted section title/desc for current subject
    const nwTitle = document.getElementById('pairNonWeightedTitle');
    const nwDesc  = document.getElementById('pairNonWeightedDesc');
    if (nwTitle) nwTitle.textContent = pairSubject === 'requirements' ? 'Non-Weighted Requirements Mode' : 'Non-Weighted Mode';
    if (nwDesc)  nwDesc.textContent  = pairSubject === 'requirements'
      ? 'All selected requirements will carry equal weight. This is appropriate when your team cannot yet prioritize or agrees that all requirements are equally important.'
      : 'All selected ilities will carry equal weight in the Pugh matrix. This is a valid choice when your team agrees that no single system property dominates the design space, or when there is insufficient information to prioritize.';

    if (isForced) {
      renderForcedRank();
    } else if (!isWeighted) {
      renderNonWeighted();
    } else {
      renderPairCard();
    }
    updatePairSubtitle();
    updatePairAdvisor();
  }

  // Build the initial forced rank order (or preserve existing valid order).
  function initForcedRankOrder() {
    const ids = pairSubject === 'requirements'
      ? requirements.map(r => String(r.id))   // always strings so inline handlers match
      : [...selectedIlities].sort();
    const existingValid = forcedRankOrder.map(String).filter(id => ids.includes(id));
    const incoming      = ids.filter(id => !existingValid.includes(id));
    forcedRankOrder = [...existingValid, ...incoming];
  }

  // Resolve the name for either an ility or requirement ID depending on pairSubject.
  function getPairSubjectName(id) {
    if (pairSubject === 'requirements') {
      const r = requirements.find(req => req.id === id);
      return r ? (r.text || r.id) : id;
    }
    return getIlityNameById(id);
  }

  // Resolve a short description for a pair subject item.
  function getPairSubjectDesc(id) {
    if (pairSubject === 'requirements') {
      const r = requirements.find(req => req.id === id);
      return r ? (r.agileSoThat || '') : '';
    }
    return getIlityDescById(id);
  }

  // Forced rank — move a card up or down by one position.
  function moveForcedRankCard(id, dir) {
    const idx = forcedRankOrder.indexOf(id);
    if (idx === -1) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= forcedRankOrder.length) return;
    forcedRankOrder.splice(idx, 1);
    forcedRankOrder.splice(newIdx, 0, id);
    renderForcedRank();
  }

  // Forced rank — drag-and-drop handlers.
  // Uses ondragover-with-ID approach to avoid the classic child-element dragleave bug.
  function frDragStart(event, id) {
    _frDragId = id;
    setTimeout(() => {
      const el = document.querySelector(`.pair-forced-card[data-fr-id="${id}"]`);
      if (el) el.classList.add('fr-dragging');
    }, 0);
  }
  function frDragOver(event, targetId) {
    event.preventDefault();
    if (!_frDragId || _frDragId === targetId) return;
    if (_frDragOverId !== targetId) {
      // Clear previous highlight
      if (_frDragOverId) {
        const old = document.querySelector(`.pair-forced-card[data-fr-id="${_frDragOverId}"]`);
        if (old) old.classList.remove('fr-drag-over');
      }
      _frDragOverId = targetId;
      event.currentTarget.classList.add('fr-drag-over');
    }
  }
  function frDrop(event, targetId) {
    event.preventDefault();
    _frDragOverId = null;
    document.querySelectorAll('.pair-forced-card').forEach(el => el.classList.remove('fr-drag-over'));
    if (!_frDragId || _frDragId === targetId) { _frDragId = null; return; }
    const fromIdx = forcedRankOrder.indexOf(_frDragId);
    const toIdx   = forcedRankOrder.indexOf(targetId);
    if (fromIdx !== -1 && toIdx !== -1) {
      forcedRankOrder.splice(fromIdx, 1);
      forcedRankOrder.splice(toIdx, 0, _frDragId);
    }
    _frDragId = null;
    renderForcedRank();
  }
  function frDragEnd(event) {
    _frDragId = null;
    _frDragOverId = null;
    document.querySelectorAll('.pair-forced-card').forEach(el => el.classList.remove('fr-dragging', 'fr-drag-over'));
  }

  const upgradeMessages = {
    'free-custom-ility': { title: 'Sign Up to Add Custom Ilities', body: 'Creating a free account lets you add up to 10 custom ilities and save your project. It\'s free — just an email and you\'re in.', cta: 'Create Free Account' },
    'free-custom-stak': { title: 'Sign Up to Add Custom Stakeholders', body: 'Creating a free account lets you add up to 10 custom stakeholders and save your project. It\'s free — just an email and you\'re in.', cta: 'Create Free Account' },
    'account-ility-limit': { title: 'Ility Limit Reached', body: 'Account users can add up to 10 custom ilities. Delete one to make room, or upgrade to Pro for unlimited ilities.', cta: 'Upgrade to Pro' },
    'account-stak-limit': { title: 'Stakeholder Limit Reached', body: 'Account users can add up to 10 custom stakeholders. Delete one to make room, or upgrade to Pro for unlimited stakeholders.', cta: 'Upgrade to Pro' },
    'coaching': { title: 'AI Coaching is a Pro Feature', body: 'Pro users get personalized AI coaching on each section of their goal statement, with contextual feedback as they write.', cta: 'Upgrade to Pro' },
    'weighted-pair': { title: 'Weighted Pairwise is an Account Feature', body: 'Sign up for a free account to unlock weighted pairwise comparison and assign relative importance to each ility.', cta: 'Create Free Account' },
    'export-report': { title: 'Report Export is a Pro Feature', body: 'Pro users can export their full Controlled Convergence analysis as a formatted PDF report.', cta: 'Upgrade to Pro' },
    'account-project-limit': { title: 'Project Limit Reached', body: 'Account users can save up to 3 projects. Delete a project to make room, or upgrade to Pro for up to 50 projects.', cta: 'Upgrade to Pro' },
    'templates': { title: 'Templates is a Pro Feature', body: 'Pro users can save reusable templates — a named snapshot of ilities, stakeholders, and requirements that can be loaded as the starting point for any future project.', cta: 'Upgrade to Pro' },
    'pugh-settings': { title: 'Matrix Settings require an Account', body: 'Account users can unlock Advanced Scoring (±3), MTHUS / MTHUWS ratios, and Minimum Acceptable Score (MAS) tracking by creating a free account. It\'s free — just an email and you\'re in.', cta: 'Create Free Account' },
    'account-contact-name': { title: 'Contact Name is an Account Feature', body: 'Create a free Account to attach a contact name to each stakeholder. Helps your team track who the key voice is for each stakeholder type.', cta: 'Create Free Account' },
    'pro-contact-fields': { title: 'Contact Title & Email require Pro', body: 'Pro users can add full contact details (name, title, email) to each stakeholder. These fields are private and feed the Responsible Scorer feature in REQS.', cta: 'Upgrade to Pro' },
    'pro-scorer': { title: 'Responsible Scorer requires Pro', body: 'Pro users can assign a responsible scorer to each requirement. That person\'s requirements are highlighted during concept scoring in SCOR, keeping large teams focused on their section.', cta: 'Upgrade to Pro' },
    'pair-subject-req': { title: 'Requirements Comparison is an Account Feature', body: 'Create a free Account to compare requirements head-to-head in the pairwise matrix. Ilities comparison is always free.', cta: 'Create Free Account' },
  };

  function showUpgradePrompt(type) {
    const msg = upgradeMessages[type] || { title: 'Upgrade Required', body: 'This feature requires a higher account tier.', cta: 'Learn More' };
    const overlay = document.getElementById('upgradeModal');
    if (overlay) {
      document.getElementById('upgradeModalTitle').textContent = msg.title;
      document.getElementById('upgradeModalBody').textContent = msg.body;
      document.getElementById('upgradeModalCta').textContent = msg.cta;
      overlay.classList.add('open');
    } else {
      alert(msg.title + '\n\n' + msg.body);
    }
  }

  // ── TERMS MODAL ──
  function openTermsModal() {
    const overlay = document.getElementById('termsModal');
    if (overlay) overlay.classList.add('open');
  }

  function closeTermsModal() {
    const overlay = document.getElementById('termsModal');
    if (overlay) overlay.classList.remove('open');
  }

  // Enable/disable the Create Account button based on terms checkbox state
  function updateSignupBtn() {
    const checked = document.getElementById('authTermsCheck')?.checked;
    const btn     = document.getElementById('authSignupBtn');
    if (!btn) return;
    btn.disabled         = !checked;
    btn.style.opacity    = checked ? '1'            : '0.45';
    btn.style.cursor     = checked ? 'pointer'      : 'not-allowed';
  }

  function closeUpgradeModal() {
    const overlay = document.getElementById('upgradeModal');
    if (overlay) overlay.classList.remove('open');
  }

  // ── PROJ PAGE FUNCTIONS ──


  function createProject() {
    const input = document.getElementById('projNameInput');
    const descInput = document.getElementById('projDescInput');
    const ownerInput = document.getElementById('projOwnerInput');
    const errEl = document.getElementById('projFormError');
    if (!input) return;
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    // Duplicate name check (case-insensitive)
    const isDup = savedProjects.some(p => p.name.toLowerCase() === name.toLowerCase());
    if (isDup) {
      if (errEl) { errEl.textContent = 'A project with this name already exists. Choose a different name.'; errEl.style.display = ''; }
      input.focus(); return;
    }
    if (errEl) errEl.style.display = 'none';
    if (userTier === 'account' && savedProjects.length >= 3) {
      showUpgradePrompt('account-project-limit');
      return;
    }
    const description = descInput ? descInput.value.trim() : '';
    const owner = ownerInput ? ownerInput.value.trim() : '';

    // Use the canonical project model
    const project = createProjectModel({
      name,
      description,
      owner,
      userId: appState.currentUser ? appState.currentUser.id : null
    });

    // Clear all tool state so the new project starts fresh
    selectedIlities.clear(); customIlities = [];  ilityOrder = [];
    selectedStakeholders.clear(); customStakeholders = []; stakOrder = [];
    requirements = []; reqIdCounter = 0; _editingReqId = null;
    pairComparisons = {}; pairPairs = []; pairIndex = 0; pairSubject = 'ilities'; pairMethod = 'pairwise'; forcedRankOrder = [];
    pughConcepts = []; pughScores = {}; pughAdvBackup = {};
    pughConceptCounter = 0; datumPerformance = {}; conceptPerformance = {}; conceptNotes = {};
    conceptCustomFields = []; _cfIdCounter = 0; scorerFilter = '';
    pughSettings = { advancedScoring: false, showMTHUS: false, showMAS: false };
    goalMode = 'basic';

    // Clear goal fields
    ['input-to','input-by','input-using','input-while','input-goal-basic'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    // Activate the new project
    activeProject = project;
    appState.currentProject = project;

    // Save the project (async, fire-and-forget)
    if (userTier !== 'free' || appState.currentUser) {
      savedProjects.push(project);
      appState.projects = savedProjects.slice();
      saveProject(project).catch(e => console.warn('save failed', e));
    }

    // Persist the active project ID so a refresh can restore it
    try { localStorage.setItem('cc_activeProjectId', project.id); } catch(e) {}

    input.value = '';
    if (descInput) descInput.value = '';
    if (ownerInput) ownerInput.value = '';
    updateNavProjectName();
    renderProjPage();

    // Navigate directly to the GOAL tool
    const goalNavBtn = document.querySelector('[data-page="tbus"]');
    switchPage('tbus', goalNavBtn);
  }

  function loadProject(id) {
    const proj = savedProjects.find(p => p.id === id);
    if (!proj) return;

    // Restore all state from the saved project
    restoreProjectState(proj);

    // Re-render all tool UIs with the restored data
    updateNavProjectName();
    renderIlityGrid();
    renderStakGrid();
    populateReqForms();
    renderRequirements();
    initPairPairs();
    renderConceptCards();
    renderPughMatrix();
    renderProjPage(); // updates active project banner + list

    // Sync goal mode UI
    if (typeof switchGoalMode === 'function') {
      switchGoalMode(proj.goalMode || 'basic');
    }

    // Sync PUGH settings panel checkboxes to restored state
    const mCb   = document.getElementById('toggleMTHUS');
    const masCb = document.getElementById('toggleMAS');
    if (mCb)   mCb.checked   = !!(pughSettings && pughSettings.showMTHUS);
    if (masCb) masCb.checked = !!(pughSettings && pughSettings.showMAS);

    // Sync PAIR mode toggle buttons to restored pairMode
    const syncBtn = (id, active) => { const el = document.getElementById(id); if (el) el.classList.toggle('active', active); };
    syncBtn('pairNonWeightedBtn', pairMode    === 'nonweighted');
    syncBtn('pairWeightedBtn',    pairMode    === 'weighted');
    syncBtn('pairIlitiesBtn',     pairSubject === 'ilities');
    syncBtn('pairReqsBtn',        pairSubject === 'requirements');
    syncBtn('pairPairwiseBtn',    pairMethod  === 'pairwise');
    syncBtn('pairForcedRankBtn',  pairMethod  === 'forcedrank');

    // Sync SCOR settings
    if (typeof syncScoringModeButtons === 'function') syncScoringModeButtons();
    if (typeof renderScorerFilterDropdown === 'function') renderScorerFilterDropdown();

    // Sync pairwise weights
    if (pairMode === 'nonweighted') renderNonWeighted();
    else { renderPairCard(); renderPairLiveChart(); }
    updatePairProgress();

    // Persist active project ID for refresh restore
    try { localStorage.setItem('cc_activeProjectId', id); } catch(e) {}
  }

  function deleteProject(id) {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    savedProjects = savedProjects.filter(p => p.id !== id);
    if (activeProject && activeProject.id === id) { activeProject = null; updateNavProjectName(); }
    // api.saveProject() — async persistence (replace when Supabase is live)
    saveProject(activeProject).catch(e => console.warn('save failed', e));
    renderProjPage();
  }

  // Double-click on a project card: activate it and navigate to GOAL
  function activateProjectAndGo(id) {
    loadProject(id);
    const goalNavBtn = document.querySelector('[data-page="tbus"]');
    switchPage('tbus', goalNavBtn);
  }

  function deactivateProject() {
    activeProject = null;
    try { localStorage.removeItem('cc_activeProjectId'); } catch(e) {}
    updateNavProjectName();
    renderProjPage();
  }

  function editActiveProject() {
    if (!activeProject) return;
    editProject(activeProject.id);
  }

  function editProject(id) {
    const proj = savedProjects.find(p => p.id === id) || (activeProject && activeProject.id === id ? activeProject : null);
    if (!proj) return;
    const nameVal = prompt('Project Name:', proj.name);
    if (nameVal === null) return; // cancelled
    const trimmed = nameVal.trim();
    if (!trimmed) { alert('Project name cannot be empty.'); return; }
    // Duplicate check (exclude self)
    const isDup = savedProjects.some(p => p.id !== id && p.name.toLowerCase() === trimmed.toLowerCase());
    if (isDup) { alert('A project with this name already exists.'); return; }
    const descVal = prompt('Description (optional):', proj.description || '');
    if (descVal === null) return;
    const ownerVal = prompt('Owner (optional):', proj.owner || '');
    if (ownerVal === null) return;
    proj.name = trimmed;
    proj.description = descVal.trim();
    proj.owner = ownerVal.trim();
    // Update savedProjects if it's in there
    const idx = savedProjects.findIndex(p => p.id === id);
    if (idx !== -1) {
      savedProjects[idx] = proj;
      // api.saveProject() — async persistence (replace when Supabase is live)
      saveProject(activeProject).catch(e => console.warn('save failed', e));
    }
    if (activeProject && activeProject.id === id) {
      activeProject = proj;
      updateNavProjectName();
    }
    renderProjPage();
  }



  // ── TEMPLATES ──
  // Stored in localStorage as CC_TEMPLATES (array of template objects)
  // Schema: { id, name, createdAt, isPublic, data: { ilities?, stakeholders?, requirements?, pairwiseState? } }
  const TMPL_KEY = 'cc_templates';

  function loadTemplates() {
    try { return JSON.parse(localStorage.getItem(TMPL_KEY) || '[]'); }
    catch(e) { return []; }
  }

  function persistTemplates(templates) {
    localStorage.setItem(TMPL_KEY, JSON.stringify(templates));
  }

  function openSaveTemplateModal() {
    if (userTier !== 'pro') { showUpgradePrompt('templates'); return; }
    document.getElementById('tmplNameInput').value = '';
    document.getElementById('tmplSaveError').style.display = 'none';
    document.getElementById('saveTemplateModal').classList.add('open');
  }

  function closeSaveTemplateModal() {
    document.getElementById('saveTemplateModal').classList.remove('open');
  }

  function saveTemplate() {
    const name = document.getElementById('tmplNameInput').value.trim();
    if (!name) {
      const err = document.getElementById('tmplSaveError');
      err.textContent = 'Please enter a template name.';
      err.style.display = '';
      return;
    }

    const incIlty = document.getElementById('tmplILTY').checked;
    const incStak = document.getElementById('tmplSTAK').checked;
    const incReqs = document.getElementById('tmplREQS').checked;
    const incPair = document.getElementById('tmplPAIR').checked;
    const isPublic = document.getElementById('tmplIsPublic').checked;

    const data = {};
    if (incIlty) data.ilities      = [...selectedIlities];
    if (incStak) data.stakeholders = [...selectedStakeholders];
    if (incReqs) data.requirements = requirements.map(r => ({...r}));
    if (incPair) data.pairwiseState = JSON.parse(JSON.stringify(pairComparisons || {}));

    const template = {
      id:        'tmpl_' + Date.now(),
      name,
      createdAt: new Date().toISOString(),
      isPublic,
      data,
    };

    const templates = loadTemplates();
    templates.unshift(template);
    persistTemplates(templates);
    closeSaveTemplateModal();
    renderTemplateList();

    // Flash confirmation
    const btn = document.querySelector('.action-btn-pro[onclick="openSaveTemplateModal()"]');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Saved!`;
      setTimeout(() => { btn.innerHTML = orig; }, 1800);
    }
  }

  function deleteTemplate(id) {
    if (!confirm('Delete this template? This cannot be undone.')) return;
    const templates = loadTemplates().filter(t => t.id !== id);
    persistTemplates(templates);
    renderTemplateList();
    renderTmplPickerList();
  }

  function openStartFromTemplateModal() {
    renderTmplPickerList();
    document.getElementById('startFromTemplateModal').classList.add('open');
  }

  function closeStartFromTemplateModal() {
    document.getElementById('startFromTemplateModal').classList.remove('open');
  }

  function renderTmplPickerList() {
    const templates = loadTemplates();
    const el = document.getElementById('tmplPickerList');
    if (!el) return;
    if (!templates.length) {
      el.innerHTML = '<p style="font-size:13px;color:var(--text-muted);padding:8px 0">No templates saved yet.</p>';
      return;
    }
    el.innerHTML = templates.map(t => {
      const date = new Date(t.createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
      const tags = [
        t.data.ilities      ? 'Ilities'      : null,
        t.data.stakeholders ? 'Stakeholders' : null,
        t.data.requirements ? `${t.data.requirements.length} Req${t.data.requirements.length !== 1 ? 's' : ''}` : null,
        t.data.pairwiseState ? 'Pairwise'   : null,
      ].filter(Boolean).join(' · ');
      return `<div class="tmpl-picker-item">
        <div class="tmpl-picker-info">
          <div class="tmpl-picker-name">${escHtml(t.name)}</div>
          <div class="tmpl-picker-meta">${tags ? tags + ' · ' : ''}Saved ${date}</div>
        </div>
        ${t.isPublic ? '<span class="tmpl-public-badge">Public</span>' : ''}
        <button class="btn btn-primary" style="font-size:12px;padding:5px 12px;flex-shrink:0" onclick="loadTemplate('${t.id}')">Load</button>
      </div>`;
    }).join('');
  }

  function loadTemplate(id) {
    const templates = loadTemplates();
    const t = templates.find(t => t.id === id);
    if (!t) return;
    if (!confirm(`Load template "${t.name}"? This will replace your current ilities, stakeholders, requirements, and pairwise state.`)) return;

    closeStartFromTemplateModal();

    if (t.data.ilities) {
      selectedIlities = new Set(t.data.ilities);
      renderIlityToggles && renderIlityToggles();
    }
    if (t.data.stakeholders) {
      selectedStakeholders = new Set(t.data.stakeholders);
      renderStakeholderToggles && renderStakeholderToggles();
    }
    if (t.data.requirements) {
      requirements = t.data.requirements.map(r => ({...r}));
      reqIdCounter = requirements.reduce((max, r) => Math.max(max, parseInt(String(r.id).replace('r','')) || 0), 0);
      renderRequirements && renderRequirements();
    }
    if (t.data.pairwiseState) {
      Object.assign(pairComparisons, t.data.pairwiseState);
      updatePairGate && updatePairGate();
    }

    // Navigate to PROJ to create a project for this template
    const projBtn = document.querySelector('[data-page="proj"]');
    if (projBtn) switchPage('proj', projBtn);

    alert(`Template "${t.name}" loaded. Enter a project name above to begin.`);
  }

  function renderTemplateList() {
    const templates = loadTemplates();
    const listEl   = document.getElementById('templateList');
    const emptyEl  = document.getElementById('templateEmptyState');
    const startBtn = document.getElementById('startFromTemplateBtn');
    if (!listEl) return;

    if (!templates.length) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.style.display = '';
      if (startBtn) startBtn.style.display = 'none';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';
    if (startBtn) startBtn.style.display = '';

    listEl.innerHTML = templates.map(t => {
      const date = new Date(t.createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
      const tags = [
        t.data.ilities      ? 'Ilities'      : null,
        t.data.stakeholders ? 'Stakeholders' : null,
        t.data.requirements ? `${t.data.requirements.length} Req${t.data.requirements.length !== 1 ? 's' : ''}` : null,
        t.data.pairwiseState ? 'Pairwise'   : null,
      ].filter(Boolean).join(' · ');
      return `<div class="proj-item">
        <div style="flex:1">
          <div class="proj-item-name">${escHtml(t.name)}</div>
          <div class="proj-item-meta">${tags ? tags + ' · ' : ''}${date}${t.isPublic ? ' · <span style="color:var(--accent)">Public</span>' : ''}</div>
        </div>
        <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px" onclick="loadTemplate('${t.id}')">Load</button>
        <button class="proj-item-delete" onclick="deleteTemplate('${t.id}')" title="Delete template">×</button>
      </div>`;
    }).join('');
  }

  // ── CHECK CONTINUE ──

  // ── COACHING (SIMULATED) ──
  const coachingResponses = [
    // Response based on TO issues
    (vals) => {
      const to = vals.to.toLowerCase();
      const toCheck = checkTo(vals.to);

      if (!vals.to) return `Your goal statement is blank right now — let's start with the TO. What's the human need at the center of this project? Try to describe the outcome someone experiences, not the thing you plan to build.`;

      if (toCheck && toCheck.type === 'danger') {
        return `Your TO is off to a tricky start — I can see some solution-specific language in there. The TO is the hardest part to get right because our instinct is to jump straight to the solution. Try this: imagine you solved this problem with a completely different approach — no technology, no artifact. Would your TO still be true? If not, step back one level. What does the person actually need?`;
      }

      if (toCheck && toCheck.type === 'warn') {
        return `Your TO is almost there. The word choice at the beginning suggests you might be thinking about a thing rather than an outcome. What changes if you start with the human: "To help [who] achieve [what]..." instead? That framing often unlocks the right level of abstraction.`;
      }

      if (!vals.by && !vals.using && !vals.wh) {
        return `Nice start on your TO — it reads as outcome-focused. Now let's add the BY. This is your method or approach. Early in the process, keep it open: "by providing a means to..." or "by enabling users to..." works well. Resist the urge to commit to a specific mechanism just yet.`;
      }

      if (!vals.wh) {
        return `You're building a solid statement. The WHILE is often the piece that gets rushed. A strong WHILE is a real constraint — something that could eliminate a concept if violated. It's not just a vague wish. What would actually make a solution unacceptable in your context?`;
      }

      return `Your statement is coming together well. The most important question to sit with: if you chose a completely different solution — one that looks nothing like what you currently have in mind — would your TO still be true? If yes, you're working at the right level of abstraction. If not, there's still some solution-thinking baked into your TO.`;
    }
  ];

  function getCoaching() {
    const body = document.getElementById('advisorBody');
    const thinking = document.getElementById('advisorThinking');
    const btn = document.getElementById('btnCoach');

    const vals = {
      to: document.getElementById('input-to').value.trim(),
      by: document.getElementById('input-by').value.trim(),
      using: document.getElementById('input-using').value.trim(),
      wh: document.getElementById('input-while').value.trim(),
    };

    body.style.display = 'none';
    thinking.classList.add('visible');
    btn.disabled = true;

    setTimeout(() => {
      const response = coachingResponses[0](vals);
      thinking.classList.remove('visible');
      body.style.display = '';

      // Animate text in
      body.innerHTML = '';
      const p = document.createElement('p');
      body.appendChild(p);
      let i = 0;
      const interval = setInterval(() => {
        p.textContent = response.slice(0, i);
        i += 3;
        if (i > response.length) {
          p.textContent = response;
          clearInterval(interval);
          btn.disabled = false;
        }
      }, 12);
    }, 1600);
  }

  // ── EXAMPLE ──
  function showExample() {
    document.getElementById('input-to').value = 'help commuters cross the river safely';
    document.getElementById('input-by').value = 'providing a controlled crossing mechanism that operates in all weather conditions';
    document.getElementById('input-using').value = 'existing right-of-way infrastructure on both banks';
    document.getElementById('input-while').value = 'minimizing disruption to river traffic and staying within a $4M capital budget';

    ['to','by','using','while'].forEach(f => onInput(f));

    document.getElementById('advisorBody').innerHTML = `<p>Here's a complete example. Notice how the <strong>TO</strong> says nothing about what physical thing will be built — a tunnel, a bridge, a ferry, or a drone service would all satisfy it.</p><p>The <strong>WHILE</strong> does real work here: the budget constraint and the river traffic condition could actually eliminate concepts. That's what makes it a constraint rather than a wish.</p>`;
    document.getElementById('advisorBody').style.display = '';
    document.getElementById('advisorThinking').classList.remove('visible');
  }

  // ── GOAL MODE (Basic vs. To·By) ──
  let goalMode = 'basic'; // 'basic' | 'structured'

  function switchGoalMode(mode) {
    goalMode = mode;
    const basicForm    = document.getElementById('goalBasicForm');
    const structuredForm = document.getElementById('statementCard');
    const basicBtn     = document.getElementById('goalModeBasicBtn');
    const structuredBtn = document.getElementById('goalModeStructuredBtn');

    if (mode === 'basic') {
      basicForm.style.display     = '';
      structuredForm.style.display = 'none';
      basicBtn.classList.add('active');
      structuredBtn.classList.remove('active');
      // Pre-fill basic field with the TO content if it has something
      const toVal = document.getElementById('input-to')?.value || '';
      const basicEl = document.getElementById('input-goal-basic');
      if (basicEl && toVal && !basicEl.value) basicEl.value = toVal;
      // Auto-focus so the user can start typing immediately
      setTimeout(() => { if (basicEl) basicEl.focus(); }, 50);
    } else {
      basicForm.style.display     = 'none';
      structuredForm.style.display = '';
      basicBtn.classList.remove('active');
      structuredBtn.classList.add('active');
      // If switching to structured and TO is empty, pre-fill from basic
      const basicVal = document.getElementById('input-goal-basic')?.value || '';
      const toEl = document.getElementById('input-to');
      if (toEl && basicVal && !toEl.value) {
        toEl.value = basicVal;
        onInput('to');
      }
      // Auto-focus the TO field
      setTimeout(() => { if (toEl) toEl.focus(); }, 50);
    }
  }

  function onGoalBasicInput() {
    const val = document.getElementById('input-goal-basic')?.value || '';
    // Enable continue button if there's any content
    const btn = document.getElementById('btnContinue');
    if (btn) btn.disabled = val.trim().length === 0;
  }

  // ── SAVE / CLEAR / EXPORT ──
  function saveStatement() {
    const data = {
      to: document.getElementById('input-to').value,
      by: document.getElementById('input-by').value,
      using: document.getElementById('input-using').value,
      while: document.getElementById('input-while').value,
      savedAt: new Date().toISOString(),
    };
    // Goal statement is held in activeProject.goal in-memory — no localStorage needed

    const btn = document.querySelector('.action-btn');
    const orig = btn.innerHTML;
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Saved!`;
    setTimeout(() => { btn.innerHTML = orig; }, 1800);
  }

  function clearAll() {
    if (!confirm('Clear your goal statement?')) return;
    ['to','by','using','while'].forEach(f => {
      document.getElementById('input-' + f).value = '';
      document.getElementById('dot-' + f).className = 'status-dot';
      document.getElementById('val-' + f).className = 'validation-msg';
    });
    document.getElementById('previewBanner').classList.remove('visible');
    document.getElementById('btnContinue').disabled = true;
    document.getElementById('advisorBody').innerHTML = `<p>AI Coaching Coming Soon...</p>`;
  }

  function exportStatement() {
    alert('Export is available in the Pro tier. Upgrade to export PDF and share a link to your goal statement.');
  }

  // ── CONTINUE ──
  function continueToNext() {
    alert('In the full app, this would advance to the Requirements Builder — where you select ilities, write requirements, and see live coverage charting.');
  }

  // ── BIBLIOGRAPHY ──
  function toggleBib(el) {
    el.parentElement.classList.toggle('bib-open');
  }

  // ── LOAD SAVED STATE ──
  function loadSaved() {
    try {
      const saved = activeProject && activeProject.goal ? JSON.stringify(activeProject.goal) : null;
      if (saved) {
        const data = JSON.parse(saved);
        ['to','by','using','while'].forEach(f => {
          if (data[f]) {
            document.getElementById('input-' + f).value = data[f];
            onInput(f);
          }
        });
      }
    } catch(e) {}
  }

  // ── ILITIES DATA ──
  const ILITIES = [
    { id: 'usability',         name: 'Usability',         desc: 'Ease of use for the intended user' },
    { id: 'reliability',       name: 'Reliability',       desc: 'Consistent performance over time' },
    { id: 'safety',            name: 'Safety',            desc: 'Freedom from unacceptable harm or risk' },
    { id: 'affordability',     name: 'Affordability',     desc: 'Total cost within acceptable limits' },
    { id: 'maintainability',   name: 'Maintainability',   desc: 'Ease of upkeep and repair' },
    { id: 'durability',        name: 'Durability',        desc: 'Resistance to wear and degradation' },
    { id: 'manufacturability', name: 'Manufacturability', desc: 'Ease and efficiency of production' },
    { id: 'scalability',       name: 'Scalability',       desc: 'Ability to grow with increased demand' },
    { id: 'sustainability',    name: 'Sustainability',    desc: 'Minimal long-term environmental impact' },
    { id: 'flexibility',       name: 'Flexibility',       desc: 'Adaptability to changing requirements' },
    { id: 'portability',       name: 'Portability',       desc: 'Ease of moving or transporting' },
    { id: 'modularity',        name: 'Modularity',        desc: 'Composed of interchangeable, separable units' },
    { id: 'interoperability',  name: 'Interoperability',  desc: 'Works with other systems and standards' },
    { id: 'aesthetics',        name: 'Aesthetics',        desc: 'Visual and sensory appeal to users' },
    { id: 'resilience',        name: 'Resilience',        desc: 'Recovery from disruption or failure' },
    { id: 'extensibility',     name: 'Extensibility',     desc: 'Easy to add new capabilities over time' },
    { id: 'accessibility',     name: 'Accessibility',     desc: 'Usable by people with a range of abilities and disabilities' },
    { id: 'security',          name: 'Security',          desc: 'Protection against unauthorized access or attack' },
    { id: 'testability',       name: 'Testability',       desc: 'Ease of verifying correct behavior through testing' },
    { id: 'repairability',     name: 'Repairability',     desc: 'Ease of diagnosing and fixing failures in the field' },
    { id: 'compatibility',     name: 'Compatibility',     desc: 'Ability to coexist with existing systems and environments' },
    { id: 'privacy',           name: 'Privacy',           desc: 'Control over personal or sensitive data collected and shared' },
    { id: 'adaptability',      name: 'Adaptability',      desc: 'Capacity to change function or form to meet new conditions' },
    { id: 'learnability',      name: 'Learnability',      desc: 'Speed and ease with which new users become proficient' },
    { id: 'observability',     name: 'Observability',     desc: 'Ability to monitor internal state through external outputs' },
    { id: 'deployability',     name: 'Deployability',     desc: 'Ease and reliability of releasing the system into production' },
  ];

  const STAKEHOLDERS = [
    { id: 'end-user',       name: 'End User',                   desc: 'The primary person who uses or operates the system' },
    { id: 'safety-officer', name: 'Safety Officer',             desc: 'Responsible for hazard identification and risk mitigation' },
    { id: 'mfg-engineer',   name: 'Manufacturing Engineer',     desc: 'Oversees production feasibility and process design' },
    { id: 'maintenance',    name: 'Maintenance Technician',     desc: 'Performs ongoing upkeep, repair, and inspection' },
    { id: 'management',     name: 'Business / Management',      desc: 'Sets strategic direction, approves budgets, owns outcomes' },
    { id: 'regulatory',     name: 'Regulatory Body',            desc: 'Enforces standards, codes, and compliance requirements' },
    { id: 'environmental',  name: 'Environmental / Community',  desc: 'Affected by environmental impact or community outcomes' },
    { id: 'procurement',    name: 'Procurement',                desc: 'Manages supplier relationships and cost of materials' },
    { id: 'design-team',    name: 'Design Team',                desc: 'Engineers and designers responsible for the system' },
    { id: 'customer',       name: 'Customer / Client',          desc: 'Commissions or purchases the system; defines success criteria' },
    { id: 'qa',             name: 'Quality Assurance',          desc: 'Verifies the system meets defined quality standards' },
    { id: 'legal',          name: 'Legal / Compliance',         desc: 'Ensures adherence to laws, contracts, and IP requirements' },
    { id: 'it-admin',       name: 'IT / System Administrator',  desc: 'Manages infrastructure, deployment, and system access' },
    { id: 'proj-manager',   name: 'Project Manager',            desc: 'Coordinates schedule, resources, and stakeholder communication' },
    { id: 'training',       name: 'Training & Support',         desc: 'Delivers user education and ongoing technical assistance' },
    { id: 'supply-chain',   name: 'Supply Chain / Vendor',      desc: 'Provides components, materials, or outsourced services' },
    { id: 'integrator',     name: 'Third-Party Integrator',     desc: 'Connects the system with external platforms or services' },
    { id: 'investor',       name: 'Investor / Board',           desc: 'Provides funding and holds accountability for ROI' },
    { id: 'public',         name: 'General Public / Society',   desc: 'Broadly affected communities and the wider public interest' },
  ];

  selectedIlities = new Set();
  customIlities = [];
  selectedStakeholders = new Set();
  customStakeholders = [];


  function toggleIlity(id) {
    if (selectedIlities.has(id)) selectedIlities.delete(id);
    else selectedIlities.add(id);
    renderIlityGrid();
    populateReqForms();
  }

  function selectAllIlities() {
    ILITIES.forEach(il => selectedIlities.add(il.id));
    customIlities.forEach(il => selectedIlities.add(il.id));
    renderIlityGrid();
    populateReqForms();
  }

  function addCustomIlity() {
    if (userTier === 'free') {
      showUpgradePrompt('free-custom-ility');
      return;
    }
    if (userTier === 'account' && customIlities.length >= 10) {
      showUpgradePrompt('account-ility-limit');
      return;
    }
    const nameInput = document.getElementById('customIlityName');
    const descInput = document.getElementById('customIlityDesc');
    const name = nameInput.value.trim();
    const desc = descInput.value.trim() || 'Custom ility';
    if (!name) { nameInput.focus(); return; }
    // Duplicate check against built-in and custom ilities
    const allIlityNames = [...ILITIES, ...customIlities].map(i => i.name.toLowerCase());
    if (allIlityNames.includes(name.toLowerCase())) {
      alert('An ility with this name already exists.');
      nameInput.focus(); return;
    }
    const id = 'custom-il-' + name.toLowerCase().replace(/\s+/g, '-');
    customIlities.push({ id, name, desc });
    selectedIlities.add(id);
    nameInput.value = '';
    descInput.value = '';
    renderIlityGrid();
    populateReqForms();
  }

  function deselectAllIlities() {
    selectedIlities.clear();
    renderIlityGrid();
    populateReqForms();
  }

  // ── STAKEHOLDERS ──

  function toggleStak(id) {
    if (selectedStakeholders.has(id)) selectedStakeholders.delete(id);
    else selectedStakeholders.add(id);
    renderStakGrid();
    populateReqForms();
  }

  function selectAllStakeholders() {
    STAKEHOLDERS.forEach(s => selectedStakeholders.add(s.id));
    customStakeholders.forEach(s => selectedStakeholders.add(s.id));
    renderStakGrid();
    populateReqForms();
  }

  function deselectAllStakeholders() {
    selectedStakeholders.clear();
    renderStakGrid();
    populateReqForms();
  }

  function addCustomStak() {
    if (userTier === 'free') {
      showUpgradePrompt('free-custom-stak');
      return;
    }
    if (userTier === 'account' && customStakeholders.length >= 10) {
      showUpgradePrompt('account-stak-limit');
      return;
    }
    const nameInput         = document.getElementById('customStakName');
    const descInput         = document.getElementById('customStakDesc');
    const contactNameInput  = document.getElementById('customStakContactName');
    const contactTitleInput = document.getElementById('customStakContactTitle');
    const contactEmailInput = document.getElementById('customStakContactEmail');
    const name = nameInput.value.trim();
    const desc = descInput.value.trim() || 'Custom stakeholder';
    if (!name) { nameInput.focus(); return; }
    // Duplicate check against built-in and custom stakeholders
    const allStakNames = [...STAKEHOLDERS, ...customStakeholders].map(s => s.name.toLowerCase());
    if (allStakNames.includes(name.toLowerCase())) {
      alert('A stakeholder with this name already exists.');
      nameInput.focus(); return;
    }
    const id = 'custom-sk-' + name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();

    // Contact fields — only stored if tier allows; never exposed in shared/community data
    const contactName  = (userTier === 'account' || userTier === 'pro') ? (contactNameInput?.value.trim()  || '') : '';
    const contactTitle = (userTier === 'pro')                          ? (contactTitleInput?.value.trim() || '') : '';
    const contactEmail = (userTier === 'pro')                          ? (contactEmailInput?.value.trim() || '') : '';

    customStakeholders.push({ id, name, desc, contactName, contactTitle, contactEmail });
    selectedStakeholders.add(id);
    nameInput.value = '';
    descInput.value = '';
    if (contactNameInput)  contactNameInput.value  = '';
    if (contactTitleInput) contactTitleInput.value = '';
    if (contactEmailInput) contactEmailInput.value = '';
    renderStakGrid();
    populateReqForms();
  }

  // ── CARD DRAG-TO-REORDER ──
  // Shared drag state (used by both mouse/HTML5 drag and touch drag)
  let _dragCardId      = null;
  let _dragCardType    = null; // 'ility' | 'stak'
  // Touch-specific state
  let _touchDragActive  = false;
  let _touchStartX      = 0;
  let _touchStartY      = 0;
  let _dragSourceEl     = null;
  let _touchMoveHandler = null;

  // ── Mouse / HTML5 Drag (desktop) ──

  function cardDragStart(e, id, type) {
    _dragCardId   = id;
    _dragCardType = type;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      const prefix = type === 'ility' ? 'chip-' : 'stak-chip-';
      const el = document.getElementById(prefix + id);
      if (el) el.classList.add('dragging');
    }, 0);
  }

  function cardDragOver(e, id, type) {
    if (type !== _dragCardType || id === _dragCardId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const selector = type === 'ility' ? '.ility-chip' : '.stak-chip';
    document.querySelectorAll(selector).forEach(c => c.classList.remove('drag-over'));
    const prefix = type === 'ility' ? 'chip-' : 'stak-chip-';
    const targetEl = document.getElementById(prefix + id);
    if (targetEl) targetEl.classList.add('drag-over');
  }

  function cardDrop(e, id, type) {
    e.preventDefault();
    if (type !== _dragCardType || id === _dragCardId || !_dragCardId) return;
    const all = type === 'ility'
      ? [...ILITIES, ...customIlities]
      : [...STAKEHOLDERS, ...customStakeholders];
    const orderArr = type === 'ility' ? ilityOrder : stakOrder;
    let ordered = all.map(x => x.id).sort((a, b) => {
      const ai = orderArr.indexOf(a);
      const bi = orderArr.indexOf(b);
      return (ai === -1 ? Infinity : ai) - (bi === -1 ? Infinity : bi);
    });
    ordered = ordered.filter(x => x !== _dragCardId);
    const targetIdx = ordered.indexOf(id);
    ordered.splice(targetIdx, 0, _dragCardId);
    if (type === 'ility') { ilityOrder = ordered; renderIlityGrid(); }
    else                   { stakOrder  = ordered; renderStakGrid(); }
    if (activeProject && (userTier === 'account' || userTier === 'pro')) {
      const snap = snapshotCurrentState(activeProject);
      saveProject(snap).catch(err => console.warn('order save failed', err));
    }
  }

  function cardDragEnd(e, type) {
    _dragCardId   = null;
    _dragCardType = null;
    const selector = type === 'ility' ? '.ility-chip' : '.stak-chip';
    document.querySelectorAll(selector).forEach(c => c.classList.remove('dragging', 'drag-over'));
  }

  // ── Touch drag (iOS / iPad) ──
  // Attached to the drag handle only, so tapping the rest of the card
  // still fires the normal click-to-select handler.

  function cardTouchStart(e, id, type) {
    _dragCardId      = id;
    _dragCardType    = type;
    _touchDragActive = false;
    const touch  = e.touches[0];
    _touchStartX = touch.clientX;
    _touchStartY = touch.clientY;
    const prefix = type === 'ility' ? 'chip-' : 'stak-chip-';
    _dragSourceEl = document.getElementById(prefix + id);
    // Register a non-passive touchmove on the document so we can
    // call preventDefault() and prevent page scrolling during drag.
    _touchMoveHandler = function(ev) { _handleTouchMove(ev); };
    document.addEventListener('touchmove', _touchMoveHandler, { passive: false });
  }

  function _handleTouchMove(e) {
    if (!_dragCardId) return;
    const touch = e.touches[0];
    // Require 8px of movement before activating drag (avoids accidental triggers)
    if (!_touchDragActive) {
      const dx = touch.clientX - _touchStartX;
      const dy = touch.clientY - _touchStartY;
      if (dx * dx + dy * dy < 64) return;
      _touchDragActive = true;
      if (_dragSourceEl) _dragSourceEl.classList.add('dragging');
    }
    e.preventDefault(); // lock page scroll for the duration of the drag
    // Highlight the card currently under the finger
    const under   = document.elementFromPoint(touch.clientX, touch.clientY);
    const chipEl  = under && (under.closest('.ility-chip') || under.closest('.stak-chip'));
    const selector = _dragCardType === 'ility' ? '.ility-chip' : '.stak-chip';
    document.querySelectorAll(selector).forEach(c => c.classList.remove('drag-over'));
    if (chipEl && chipEl !== _dragSourceEl) chipEl.classList.add('drag-over');
  }

  function cardTouchEnd(e, id, type) {
    // Always remove the touchmove listener first
    if (_touchMoveHandler) {
      document.removeEventListener('touchmove', _touchMoveHandler);
      _touchMoveHandler = null;
    }
    if (!_touchDragActive) {
      // Pure tap on the handle — ignore, no reorder
      _dragCardId = null; _dragCardType = null; _dragSourceEl = null;
      return;
    }
    // Find the card under the finger at release
    const touch  = e.changedTouches[0];
    const under  = document.elementFromPoint(touch.clientX, touch.clientY);
    const chipEl = under && (under.closest('.ility-chip') || under.closest('.stak-chip'));
    if (chipEl && chipEl !== _dragSourceEl) {
      const targetId = chipEl.dataset.id;
      if (targetId) cardDrop({ preventDefault: () => {} }, targetId, type);
    } else {
      // Dropped on nothing valid — just clear the visuals
      const selector = type === 'ility' ? '.ility-chip' : '.stak-chip';
      document.querySelectorAll(selector).forEach(c => c.classList.remove('dragging', 'drag-over'));
    }
    _dragCardId = null; _dragCardType = null; _dragSourceEl = null; _touchDragActive = false;
  }

  // ── REQUIREMENTS ──
  requirements = [];
  reqType = '';
  reqIdCounter = 0;
  _editingReqId = null;
  let reqFormat = 'agile'; // 'agile' | 'incose'

  // ── MODAL STATE ──
  _modalType = '';
  _modalId = '';

  // ── PAIRWISE STATE ──
  pairMode    = 'nonweighted';
  pairSubject = 'ilities';
  pairMethod  = 'pairwise';
  pairComparisons = {};
  pairPairs = [];
  pairIndex = 0;
  forcedRankOrder = [];

  const reqTypePlaceholders = {
    '':        'Write your requirement...',
    essential: 'The system shall...',
    desirable: 'The system should...',
    optional: 'The system may...',
    willnot: 'This system will not...',
    mustnot: 'The system must not...',
  };

  function setReqType(type, btn) {
    // Clicking the already-active chip deselects it (no type)
    if (reqType === type) {
      reqType = '';
      document.querySelectorAll('.req-type-chip').forEach(b => b.classList.remove('active'));
    } else {
      reqType = type;
      document.querySelectorAll('.req-type-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    }
    const ta = document.getElementById('reqText');
    if (ta) ta.placeholder = reqTypePlaceholders[reqType] || 'Write your requirement...';
  }


  function switchReqFormat(format) {
    reqFormat = format;
    const agileSection  = document.getElementById('reqAgileSection');
    const incoseSection = document.getElementById('reqIncoseSection');
    const agileBtn  = document.getElementById('reqFmtAgileBtn');
    const incoseBtn = document.getElementById('reqFmtIncoseBtn');
    const typeSelector  = document.getElementById('reqTypeSelector');
    if (agileSection)  agileSection.style.display  = format === 'agile'  ? '' : 'none';
    if (incoseSection) incoseSection.style.display = format === 'incose' ? '' : 'none';
    if (agileBtn)  agileBtn.classList.toggle('active',  format === 'agile');
    if (incoseBtn) incoseBtn.classList.toggle('active', format === 'incose');
    if (typeSelector)  typeSelector.style.display  = format === 'agile' ? 'none' : '';
    // INCOSE type defaults to none — clear any previously active chip
    if (format === 'incose' && !_editingReqId) {
      document.querySelectorAll('.req-type-chip').forEach(b => b.classList.remove('active'));
      reqType = '';
      const ta = document.getElementById('reqText');
      if (ta) ta.placeholder = 'Write your requirement...';
    }
    populateReqForms();
  }

  // Remove the selected primary option from the corresponding secondary select
  function syncReqSecondary(type) {
    const primaryId   = type === 'ility' ? 'reqPrimaryIlity'         : 'reqPrimaryStakeholder';
    const secondaryId = type === 'ility' ? 'reqSecondaryIlity'       : 'reqSecondaryStakeholder';
    const primary   = document.getElementById(primaryId);
    const secondary = document.getElementById(secondaryId);
    if (!primary || !secondary) return;
    const selectedVal = primary.value;
    const prevVal = secondary.value;
    // Rebuild secondary options — all options from primary except the selected one
    Array.from(secondary.options).forEach(opt => {
      opt.disabled = (opt.value !== '' && opt.value === selectedVal);
      opt.style.display = opt.disabled ? 'none' : '';
    });
    // If the secondary was set to the same value as primary, clear it
    if (secondary.value === selectedVal) secondary.value = '';
  }

  function addRequirement() {
    const scorer = document.getElementById('reqScorer')?.value || '';

    if (reqFormat === 'agile') {
      const stakeholder = document.getElementById('reqAgileStakeholder').value;
      const ility       = document.getElementById('reqAgileIlity').value;
      const want        = document.getElementById('reqAgileWant').value.trim();
      const soThat      = document.getElementById('reqAgileSoThat').value.trim();

      if (!stakeholder) { document.getElementById('reqAgileStakeholder').focus(); return; }
      if (!ility)       { document.getElementById('reqAgileIlity').focus(); return; }
      if (!want)        { document.getElementById('reqAgileWant').focus(); return; }

      const req = {
        id: _editingReqId !== null ? _editingReqId : ++reqIdCounter,
        format: 'agile',
        text: want,        // the "and I want" portion — primary display text
        agileSoThat: soThat,
        type: reqType,
        primary: ility,
        secondaries: [],
        stakeholders: [stakeholder],
        scorer,
      };

      if (_editingReqId !== null) {
        const idx = requirements.findIndex(r => r.id === _editingReqId);
        if (idx !== -1) requirements[idx] = req;
        cancelReqEdit();
      } else {
        requirements.push(req);
        document.getElementById('reqAgileStakeholder').value = '';
        document.getElementById('reqAgileIlity').value = '';
        document.getElementById('reqAgileWant').value = '';
        document.getElementById('reqAgileSoThat').value = '';
        if (document.getElementById('reqScorer')) document.getElementById('reqScorer').value = '';
      }

    } else {
      // SYSTEM / INCOSE format
      const text         = document.getElementById('reqText').value.trim();
      const primaryIlity = document.getElementById('reqPrimaryIlity').value;
      const secondaryIlity = document.getElementById('reqSecondaryIlity').value;
      const primaryStak  = document.getElementById('reqPrimaryStakeholder').value;
      const secondaryStak = document.getElementById('reqSecondaryStakeholder').value;

      if (!text) { document.getElementById('reqText').focus(); return; }
      if (!primaryIlity) { document.getElementById('reqPrimaryIlity').focus(); return; }

      const secondaries  = (secondaryIlity && secondaryIlity !== primaryIlity) ? [secondaryIlity] : [];
      const stakeholders = [primaryStak];
      if (secondaryStak && secondaryStak !== primaryStak) stakeholders.push(secondaryStak);

      const req = {
        id: _editingReqId !== null ? _editingReqId : ++reqIdCounter,
        format: 'incose',
        text, type: reqType, primary: primaryIlity, secondaries, stakeholders, scorer,
      };

      if (_editingReqId !== null) {
        const idx = requirements.findIndex(r => r.id === _editingReqId);
        if (idx !== -1) requirements[idx] = req;
        cancelReqEdit();
      } else {
        document.getElementById('reqText').value = '';
        document.getElementById('reqPrimaryIlity').value = '';
        document.getElementById('reqSecondaryIlity').value = '';
        document.getElementById('reqPrimaryStakeholder').value = '';
        document.getElementById('reqSecondaryStakeholder').value = '';
        if (document.getElementById('reqScorer')) document.getElementById('reqScorer').value = '';
        requirements.push(req);
      }
    }

    renderRequirements();
  }

  function deleteRequirement(id) {
    const req = requirements.find(r => r.id === id);
    if (!req) return;
    const preview = req.text.length > 70 ? req.text.substring(0, 70) + '…' : req.text;
    if (!confirm(`Delete this requirement?\n\n"${preview}"\n\nThis cannot be undone.`)) return;
    requirements = requirements.filter(r => r.id !== id);
    renderRequirements();
  }

  function getIlityName(id) {
    if (id === 'other') return 'Other';
    return [...ILITIES, ...customIlities].find(il => il.id === id)?.name || id;
  }

  function getStakeholderName(id) {
    return [...STAKEHOLDERS, ...customStakeholders].find(s => s.id === id)?.name || id;
  }





  // ── PAGE SWITCHING ──
  _currentPage = 'home';

  function switchPage(pageId, navBtn) {
    // Save current state before leaving (nav-save)
    if (activeProject && _currentPage && _currentPage !== pageId) {
      const snap = snapshotCurrentState(activeProject);
      saveProject(snap).catch(err => console.warn('[nav-save] failed', err));
      // Also persist active project ID
      try { localStorage.setItem('cc_activeProjectId', activeProject.id); } catch(e) {}
    }

    // Mark the page we're leaving as completed
    if (_currentPage && _currentPage !== pageId) {
      _completedPages.add(_currentPage);
    }
    _currentPage = pageId;

    // If the right sidebar is open, refresh its content for the new page
    if (document.getElementById('rightSidebar').classList.contains('open')) {
      loadSidebarContent(pageId, 0);
    }

    // Show/hide pages
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('active');
      p.style.display = 'none';
    });
    const target = document.getElementById('page-' + pageId);
    if (target) { target.classList.add('active'); target.style.display = 'block'; }

    // Nav active + completion underlines
    document.querySelectorAll('.nav-tool').forEach(b => b.classList.remove('active'));
    if (navBtn) navBtn.classList.add('active');
    updateNavCompletion();

    // Page-specific init
    if (pageId === 'basic') { syncGuidedToQS(); } // sync full-mode state → Basic Mode display when entering basic
    if (pageId === 'proj') { renderProjPage(); }
    if (pageId === 'tbus') {
      // Ensure the correct goal form (basic vs. structured) is visible, then focus it
      if (typeof switchGoalMode === 'function') switchGoalMode(goalMode);
      setTimeout(() => {
        const el = goalMode === 'basic'
          ? document.getElementById('input-goal-basic')
          : document.getElementById('input-to');
        if (el) el.focus();
      }, 50);
    }
    if (pageId === 'requirements') { renderRequirements(); populateReqForms(); switchReqFormat(reqFormat); }
    if (pageId === 'ilities') renderIlityGrid();
    if (pageId === 'stak') renderStakGrid();
    if (pageId === 'scor') { renderConceptCards(); syncScoringModeButtons(); renderScorerFilterDropdown(); }
    if (pageId === 'pugh') {
      renderPughMatrix();
      updatePughAccountToggles();
      // Sync settings panel checkboxes to loaded state
      const mCb   = document.getElementById('toggleMTHUS');
      const masCb = document.getElementById('toggleMAS');
      if (mCb)   mCb.checked   = !!(pughSettings && pughSettings.showMTHUS);
      if (masCb) masCb.checked = !!(pughSettings && pughSettings.showMAS);
    }
    if (pageId === 'pair') {
      // Free tier: force non-weighted ilities pairwise
      if (userTier === 'free') {
        pairMode    = 'nonweighted';
        pairSubject = 'ilities';
        pairMethod  = 'pairwise';
      }
      // Gate badges
      const wGate = document.getElementById('pairWeightedGate');
      const sGate = document.getElementById('pairSubjectGate');
      if (wGate) wGate.style.display = userTier === 'free' ? '' : 'none';
      if (sGate) sGate.style.display = userTier === 'free' ? '' : 'none';
      // Sync all three toggle button states from current state vars
      const syncBtn = (id, active) => {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active', active);
      };
      syncBtn('pairNonWeightedBtn', pairMode    === 'nonweighted');
      syncBtn('pairWeightedBtn',    pairMode    === 'weighted');
      syncBtn('pairIlitiesBtn',     pairSubject === 'ilities');
      syncBtn('pairReqsBtn',        pairSubject === 'requirements');
      syncBtn('pairPairwiseBtn',    pairMethod  === 'pairwise');
      syncBtn('pairForcedRankBtn',  pairMethod  === 'forcedrank');
      initPairPairs();
      initForcedRankOrder();
      syncPairView();
      updatePairProgress();
    }
  }



  // ── THEME ──
  function setTheme(theme, btn) {
    // Remove any existing theme class
    document.body.classList.remove('theme-dark', 'theme-engineering');
    if (theme !== 'light') document.body.classList.add('theme-' + theme);

    // Update active button state
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    // btn may be null when called from loadTheme
    const activeBtn = btn || document.querySelector(`.theme-btn[data-theme="${theme}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    saveThemePreference(theme); // api.js — persists when user is logged in
  }

  function loadTheme() {
    try {
      const t = (appState.currentUser && appState.currentUser.theme) || 'engineering';
      setTheme(t, null);
    } catch(e) {}
  }

  // ── EDIT MODAL ──

  function openEditModal(type, id) {
    _modalType = type;
    _modalId = id;
    const items = type === 'ility'
      ? [...ILITIES, ...customIlities]
      : [...STAKEHOLDERS, ...customStakeholders];
    const item = items.find(i => i.id === id);
    if (!item) return;
    document.getElementById('modalTitle').textContent = type === 'ility' ? 'Edit Ility' : 'Edit Stakeholder';
    document.getElementById('modalName').value = item.name;
    document.getElementById('modalDesc').value = item.desc || '';

    // Show/populate contact fields only for stakeholders
    const contactSection = document.getElementById('modalContactFields');
    if (contactSection) {
      if (type === 'stak') {
        contactSection.style.display = '';
        document.getElementById('modalContactName').value  = item.contactName  || '';
        document.getElementById('modalContactTitle').value = item.contactTitle || '';
        document.getElementById('modalContactEmail').value = item.contactEmail || '';
      } else {
        contactSection.style.display = 'none';
      }
    }

    document.getElementById('editModal').classList.add('open');
    setTimeout(() => document.getElementById('modalName').focus(), 50);
  }

  function closeEditModal() {
    document.getElementById('editModal').classList.remove('open');
    _modalType = ''; _modalId = '';
  }

  function saveEditModal() {
    const name = document.getElementById('modalName').value.trim();
    const desc = document.getElementById('modalDesc').value.trim();
    if (!name) { document.getElementById('modalName').focus(); return; }

    if (_modalType === 'ility') {
      const builtin = ILITIES.find(i => i.id === _modalId);
      const custom = customIlities.find(i => i.id === _modalId);
      if (builtin) { builtin.name = name; builtin.desc = desc; }
      else if (custom) { custom.name = name; custom.desc = desc; }
      renderIlityGrid(); populateReqForms();
    } else if (_modalType === 'stak') {
      // Contact fields — enforce tier before saving
      const contactName  = (userTier === 'account' || userTier === 'pro')
        ? (document.getElementById('modalContactName')?.value.trim()  || '') : '';
      const contactTitle = (userTier === 'pro')
        ? (document.getElementById('modalContactTitle')?.value.trim() || '') : '';
      const contactEmail = (userTier === 'pro')
        ? (document.getElementById('modalContactEmail')?.value.trim() || '') : '';
      const builtin = STAKEHOLDERS.find(s => s.id === _modalId);
      const custom = customStakeholders.find(s => s.id === _modalId);
      if (builtin) { builtin.name = name; builtin.desc = desc; builtin.contactName = contactName; builtin.contactTitle = contactTitle; builtin.contactEmail = contactEmail; }
      else if (custom) { custom.name = name; custom.desc = desc; custom.contactName = contactName; custom.contactTitle = contactTitle; custom.contactEmail = contactEmail; }
      renderStakGrid(); populateReqForms();
    }
    closeEditModal();
  }

  function deleteFromModal() {
    if (!confirm('Delete this item? Requirements referencing it will lose this association.')) return;
    if (_modalType === 'ility') {
      const idx = customIlities.findIndex(i => i.id === _modalId);
      if (idx !== -1) {
        customIlities.splice(idx, 1);
        selectedIlities.delete(_modalId);
      } else {
        // Deselect built-in but keep in list
        selectedIlities.delete(_modalId);
      }
      renderIlityGrid(); populateReqForms();
    } else if (_modalType === 'stak') {
      const idx = customStakeholders.findIndex(s => s.id === _modalId);
      if (idx !== -1) {
        customStakeholders.splice(idx, 1);
        selectedStakeholders.delete(_modalId);
      } else {
        selectedStakeholders.delete(_modalId);
      }
      renderStakGrid(); populateReqForms();
    }
    closeEditModal();
  }

  // ── REQUIREMENT EDIT IN PLACE ──
  function editRequirement(id) {
    const req = requirements.find(r => r.id === id);
    if (!req) return;
    _editingReqId = id;

    // Set type chip
    document.querySelectorAll('.req-type-chip').forEach(b => b.classList.remove('active'));
    const chip = document.querySelector(`.req-type-chip[data-type="${req.type}"]`);
    if (chip) { chip.classList.add('active'); reqType = req.type; }

    // Switch to the format this requirement was written in
    const fmt = req.format || 'incose';
    switchReqFormat(fmt);

    if (fmt === 'agile') {
      setTimeout(() => {
        document.getElementById('reqAgileStakeholder').value = req.stakeholders[0] || '';
        document.getElementById('reqAgileIlity').value       = req.primary || '';
        document.getElementById('reqAgileWant').value        = req.text || '';
        document.getElementById('reqAgileSoThat').value      = req.agileSoThat || '';
        if (document.getElementById('reqScorer')) document.getElementById('reqScorer').value = req.scorer || '';
      }, 15);
    } else {
      populateReqForms();
      setTimeout(() => {
        document.getElementById('reqText').value = req.text || '';
        document.getElementById('reqPrimaryIlity').value       = req.primary || '';
        document.getElementById('reqSecondaryIlity').value     = req.secondaries[0] || '';
        document.getElementById('reqPrimaryStakeholder').value = req.stakeholders[0] || '';
        document.getElementById('reqSecondaryStakeholder').value = req.stakeholders[1] || '';
        if (document.getElementById('reqScorer')) document.getElementById('reqScorer').value = req.scorer || '';
      }, 15);
    }

    document.getElementById('reqFormTitle') && (document.getElementById('reqFormTitle').textContent = 'Edit Requirement');
    document.getElementById('reqAddBtn').textContent = 'Save Changes';
    document.getElementById('reqCancelEdit').style.display = '';
    document.getElementById('reqFormCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function cancelReqEdit() {
    _editingReqId = null;
    // Clear INCOSE fields
    const reqTextEl = document.getElementById('reqText');
    if (reqTextEl) reqTextEl.value = '';
    const reqFormTitleEl = document.getElementById('reqFormTitle');
    if (reqFormTitleEl) reqFormTitleEl.textContent = 'Requirement Statement';
    document.getElementById('reqAddBtn').textContent = 'Add Requirement';
    document.getElementById('reqCancelEdit').style.display = 'none';
    // Clear AGILE fields
    ['reqAgileStakeholder','reqAgileIlity','reqAgileWant','reqAgileSoThat'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    // Clear Responsible Scorer
    const scorerEl = document.getElementById('reqScorer');
    if (scorerEl) scorerEl.value = '';
    // Reset type to none (no chip selected)
    document.querySelectorAll('.req-type-chip').forEach(b => b.classList.remove('active'));
    reqType = '';
    populateReqForms();
  }

  // ── PAIRWISE COMPARISON ──
  function setPairMode(mode, btn) {
    pairMode = mode;
    // Only clear active within the same toggle group, not across all three rows.
    btn.closest('.pair-mode-toggle').querySelectorAll('.pair-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    syncPairView();
  }

  function initPairPairs() {
    let ids;
    if (pairSubject === 'requirements') {
      ids = requirements.map(r => r.id);
    } else {
      ids = [...selectedIlities].sort();
      // Include virtual 'other' ility if any requirement uses it as primary
      if (requirements.some(r => r.primary === 'other') && !ids.includes('other')) {
        ids.push('other');
      }
    }
    const newPairs = [];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        newPairs.push({ a: ids[i], b: ids[j] });
      }
    }
    // Preserve comparisons for pairs that still exist — only new/removed ilities affect ranking
    const validKeys = new Set(newPairs.map(p => p.a + '|' + p.b));
    const kept = {};
    for (const [key, val] of Object.entries(pairComparisons)) {
      if (validKeys.has(key)) kept[key] = val;
    }
    pairPairs = newPairs;
    pairComparisons = kept;
    pairIndex = 0;
  }

  function resetPair() {
    if (!confirm('Reset all pairwise comparisons? This will clear all rankings and start over.')) return;
    pairComparisons = {};
    pairIndex = 0;
    forcedRankOrder = [];
    initPairPairs();
    initForcedRankOrder();
    ['pairConflictCard','pairResults','pairLog','pairLiveChartCard'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
    const titleEl = document.getElementById('pairLiveChartTitle');
    if (titleEl) titleEl.textContent = 'Running Rankings';
    const cont = document.getElementById('btnPairContinue');
    if (cont) cont.disabled = true;
    const card = document.getElementById('pairCompareCard');
    if (card) card.style.display = '';
    syncPairView();
    updatePairProgress();
  }

  function reopenComparison(key) {
    if (!confirm('Remove this ranking and re-compare this pair?')) return;
    delete pairComparisons[key];
    updatePairLog();
    updatePairProgress();
    renderPairLiveChart();
    const results = document.getElementById('pairResults');
    if (results) results.style.display = 'none';
    const card = document.getElementById('pairCompareCard');
    if (card) card.style.display = '';
    renderPairCard();
    updatePairAdvisor();
    const cont = document.getElementById('btnPairContinue');
    if (cont) cont.disabled = true;
  }

  function getIlityNameById(id) {
    if (id === 'other') return 'Other';
    return [...ILITIES, ...customIlities].find(il => il.id === id)?.name || id;
  }
  function getIlityDescById(id) {
    return [...ILITIES, ...customIlities].find(il => il.id === id)?.desc || '';
  }


  function choosePair(choice) {
    if (choice === 'equal') return; // forced ranking

    const remaining = pairPairs.filter(p => !pairComparisons[p.a + '|' + p.b]);
    if (remaining.length === 0) return;
    const pair = remaining[0];
    pairComparisons[pair.a + '|' + pair.b] = choice;

    updatePairLog();
    updatePairProgress();
    renderPairLiveChart();

    const conflict = findAnyCycle3();
    if (conflict) {
      showConflict(conflict);
    } else {
      const cc = document.getElementById('pairConflictCard');
      if (cc) cc.style.display = 'none';
      const stillRemaining = pairPairs.filter(p => !pairComparisons[p.a + '|' + p.b]);
      if (stillRemaining.length === 0) showPairResults();
      else renderPairCard();
    }
    updatePairAdvisor();
  }

  // Scans the ENTIRE current comparison graph for any 3-cycle.
  // In any tournament, every cycle contains a 3-cycle, so this is complete.
  function findAnyCycle3() {
    const wins = {};
    const allIds = [...new Set(pairPairs.flatMap(p => [p.a, p.b]))];
    allIds.forEach(id => { wins[id] = new Set(); });
    for (const [key, val] of Object.entries(pairComparisons)) {
      const [a, b] = key.split('|');
      if (val === 'A' && wins[a]) wins[a].add(b);
      else if (val === 'B' && wins[b]) wins[b].add(a);
    }
    // Check all ordered triples for a > b > c > a
    for (const a of allIds) {
      for (const b of wins[a]) {
        for (const c of wins[b]) {
          if (wins[c] && wins[c].has(a)) {
            // Resolve the actual stored key for each directed edge
            const edge = (x, y) => {
              if (pairComparisons[x + '|' + y] !== undefined) return { key: x + '|' + y };
              if (pairComparisons[y + '|' + x] !== undefined) return { key: y + '|' + x };
              return { key: x + '|' + y }; // fallback
            };
            return {
              cycle: [a, b, c],
              msg: `Circular ranking: <strong>${getPairSubjectName(a)}</strong> > <strong>${getPairSubjectName(b)}</strong> > <strong>${getPairSubjectName(c)}</strong> > <strong>${getPairSubjectName(a)}</strong>. Flip one edge to break the cycle.`,
              edges: [
                { winner: a, loser: b, ...edge(a, b) },
                { winner: b, loser: c, ...edge(b, c) },
                { winner: c, loser: a, ...edge(c, a) },
              ]
            };
          }
        }
      }
    }
    return null;
  }


  function resolveConflict(key, choice) {
    pairComparisons[key] = choice;
    updatePairLog();
    updatePairProgress();
    renderPairLiveChart();

    // Re-scan the whole graph — one flip can break a cycle or reveal another
    const stillConflict = findAnyCycle3();
    if (stillConflict) {
      showConflict(stillConflict); // stay on conflict card with updated edges
    } else {
      const cc = document.getElementById('pairConflictCard');
      if (cc) cc.style.display = 'none';
      const remaining = pairPairs.filter(p => !pairComparisons[p.a + '|' + p.b]);
      if (remaining.length === 0) showPairResults();
      else renderPairCard();
    }
    updatePairAdvisor();
  }

  function calcWinCounts() {
    const allIds = pairSubject === 'requirements'
      ? requirements.map(r => r.id)
      : [...selectedIlities];
    const winCount = {};
    allIds.forEach(id => { winCount[id] = 0; });
    for (const [key, val] of Object.entries(pairComparisons)) {
      const [a, b] = key.split('|');
      if (val === 'A' && winCount[a] !== undefined) winCount[a]++;
      else if (val === 'B' && winCount[b] !== undefined) winCount[b]++;
    }
    return winCount;
  }

  function assignWeights(winCount) {
    // Group ilities by win count so ties always get the same weight
    const uniqueWins = [...new Set(Object.values(winCount))].sort((a, b) => b - a);
    const numGroups = uniqueWins.length;
    const weights = {};
    Object.keys(winCount).forEach(id => {
      const rank = uniqueWins.indexOf(winCount[id]); // 0 = most wins
      // Map rank [0 … numGroups-1] → weight [5 … 1]
      const w = numGroups === 1
        ? 5
        : Math.max(1, Math.round(5 - (rank / (numGroups - 1)) * 4));
      weights[id] = w;
    });
    return weights;
  }






  // ── INIT ──
  // Wire modal overlay close-on-backdrop after DOM is ready
  window.addEventListener('DOMContentLoaded', function() {
    // Show DEV tier toggle only on localhost — never in production
    const isLocal = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
    const devSection = document.getElementById('devTierSection');
    if (devSection && isLocal) devSection.style.display = '';

    const overlay = document.getElementById('editModal');
    if (overlay) overlay.addEventListener('click', function(e) {
      if (e.target === this) closeEditModal();
    });

    // Close open sidebars when clicking outside them.
    // IMPORTANT: Use composedPath() rather than contains(e.target) for the right sidebar.
    // Slide nav buttons call renderSlides() which replaces innerHTML — by the time this
    // handler fires, e.target is already detached from the DOM, so contains() returns
    // false even for clicks that originated inside the sidebar. composedPath() captures
    // the full event path at dispatch time, before any DOM mutation.
    document.addEventListener('click', function(e) {
      const left  = document.getElementById('leftSidebar');
      const right = document.getElementById('rightSidebar');
      const path  = e.composedPath ? e.composedPath() : [];

      if (left && left.classList.contains('open') && !left.contains(e.target)) {
        left.classList.remove('open');
      }
      if (right && right.classList.contains('open')) {
        const clickedInsideRight = path.includes(right);
        const isInfoIcon = e.target && e.target.classList && e.target.classList.contains('info-icon');
        if (!clickedInsideRight && !isInfoIcon) {
          right.classList.remove('open');
          document.body.classList.remove('right-sidebar-open');
        }
      }
      // Close Pugh settings panel when clicking outside it
      const panel = document.getElementById('pughSettingsPanel');
      const btn   = document.getElementById('pughSettingsBtn');
      if (panel && panel.style.display !== 'none' && panel.style.display !== '') {
        if (!panel.contains(e.target) && (!btn || !btn.contains(e.target))) {
          closePughSettings();
        }
      }
      // Close score popup when clicking outside it
      const scorePopup = document.getElementById('pughScorePopup');
      if (scorePopup && scorePopup.classList.contains('open') && !scorePopup.contains(e.target)) {
        closeScorePopup();
      }
    });
  });

  loadSidebarContent('home', 0);
  initResizeHandle();
  loadSavedSidebarWidth();
  initSidebarNudge();
  loadSaved();
  loadTheme();
  renderTemplateList();
  updateTierBadges();
  updateAccountStatus();
  updatePairGate();
  updateNavProjectName();

  // ── AUTO-SAVE: every 60 seconds if there is an active project ──
  setInterval(function() {
    if (activeProject) {
      const snap = snapshotCurrentState(activeProject);
      // Update in-memory array so list reflects latest name/state
      const idx = savedProjects.findIndex(p => p.id === snap.id);
      if (idx >= 0) savedProjects[idx] = snap;
      saveProject(snap).catch(err => console.warn('[auto-save] failed', err));
    }
  }, 60000);

  // Bootstrap Supabase auth — restores session, sets up onAuthStateChange listener.
  // On success, _onAuthStateUpdated() in auth.js triggers renderProjList() automatically.
  initAuth().then(function() {
    // After auth is ready, load projects if user is signed in
    if (appState.currentUser) {
      loadProjects(appState.currentUser.id).then(function(result) {
        if (!result.error) {
          renderProjList();
          // Restore last active project from localStorage (refresh recovery)
          try {
            const lastId = localStorage.getItem('cc_activeProjectId');
            if (lastId) {
              const last = savedProjects.find(p => p.id === lastId);
              if (last) {
                loadProject(lastId);
              }
            }
          } catch(e) {}
        }
      });
    }
    updateAccountStatus();
    updateTierBadges();
  });

  const upgradeOverlay = document.getElementById('upgradeModal');
  if (upgradeOverlay) upgradeOverlay.addEventListener('click', function(e) {
    if (e.target === this) closeUpgradeModal();
  });

  const authOverlay = document.getElementById('authModal');
  if (authOverlay) authOverlay.addEventListener('click', function(e) {
    if (e.target === this) closeAuthModal();
  });

  const saveTmplOverlay = document.getElementById('saveTemplateModal');
  if (saveTmplOverlay) saveTmplOverlay.addEventListener('click', function(e) {
    if (e.target === this) closeSaveTemplateModal();
  });

  const startTmplOverlay = document.getElementById('startFromTemplateModal');
  if (startTmplOverlay) startTmplOverlay.addEventListener('click', function(e) {
    if (e.target === this) closeStartFromTemplateModal();
  });

  // ── PUGH / SCOR STATE ──
  pughConcepts = [];   // [{id, name, customFieldValues}] — index 0 is always the Datum
  pughScores   = {};   // key: `${conceptId}_${reqId}` → '+' | '0' | '-' | number
  pughSettings = { advancedScoring: false, showMTHUS: false, showMAS: false };
  pughConceptCounter = 0;
  scoringConceptId   = null;
  scoringReqIndex    = 0;
  datumDefIndex      = 0;
  datumPerformance   = {};
  conceptPerformance = {};
  conceptNotes       = {};
  conceptCustomFields = [];
  _cfIdCounter       = 0;
  scorerFilter       = '';

  // ── SCOR: SETTINGS PANEL ──

  function toggleScoringSettings() {
    const panel = document.getElementById('scorSettingsPanel');
    const btn   = document.getElementById('scorSettingsBtn');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none' && panel.style.display !== '';
    if (isOpen) {
      closeScoringSettings();
    } else {
      panel.style.display = '';
      if (btn) btn.classList.add('active');
      renderCustomFieldsList();
      renderScorerFilterDropdown();
      syncScoringModeButtons();
      // Close when clicking outside the panel or its trigger button
      setTimeout(() => {
        document.addEventListener('click', _scorSettingsOutsideHandler);
      }, 0);
    }
  }

  function closeScoringSettings() {
    const panel = document.getElementById('scorSettingsPanel');
    const btn   = document.getElementById('scorSettingsBtn');
    if (panel) panel.style.display = 'none';
    if (btn)   btn.classList.remove('active');
    document.removeEventListener('click', _scorSettingsOutsideHandler);
  }

  function _scorSettingsOutsideHandler(e) {
    const panel = document.getElementById('scorSettingsPanel');
    const btn   = document.getElementById('scorSettingsBtn');
    if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
      closeScoringSettings();
    }
  }

  function syncScoringModeButtons() {
    const mode = pughSettings.advancedScoring ? 'advanced' : 'basic';
    const basicBtn = document.getElementById('scorModeBasicBtn');
    const advBtn   = document.getElementById('scorModeAdvancedBtn');
    if (basicBtn) basicBtn.classList.toggle('active', mode === 'basic');
    if (advBtn)   advBtn.classList.toggle('active', mode === 'advanced');
    const desc = document.getElementById('scorModeDesc');
    if (desc) desc.textContent = mode === 'advanced'
      ? 'Score concepts from −3 (worst reasonable) to +3 (best reasonable), where 0 = Datum performance.'
      : 'Score concepts as better (+), same (0), or worse (−) than the Datum.';
  }

  function setScoringMode(mode, btn) {
    if (mode === 'advanced' && userTier === 'free') {
      showUpgradePrompt('weighted-pair');
      return;
    }
    if (mode === 'advanced') {
      // Turning ON: restore saved advanced scores where available
      Object.assign(pughScores, pughAdvBackup);
    } else {
      // Turning OFF: backup advanced scores, then convert to basic symbols
      Object.keys(pughScores).forEach(k => {
        const v = pughScores[k];
        if (typeof v === 'number') {
          pughAdvBackup[k] = v;
          if (v > 0)      pughScores[k] = '+';
          else if (v < 0) pughScores[k] = '-';
          else            pughScores[k] = '0';
        }
      });
    }
    pughSettings.advancedScoring = (mode === 'advanced');
    syncScoringModeButtons();
    renderPughMatrix();
    if (scoringConceptId) renderScoringView();
  }

  // ── SCOR: SCORER FILTER ──

  function setScorerFilter(val) {
    scorerFilter = val;
    scoringReqIndex = 0;
    if (scoringConceptId) renderScoringView();
  }

  function renderScorerFilterDropdown() {
    const sel = document.getElementById('scorerFilterSelect');
    if (!sel) return;
    const scorerIds = [...new Set(requirements.map(r => r.scorer).filter(s => s && s.trim()))];
    const allStakeholders = [...(typeof STAKEHOLDERS !== 'undefined' ? STAKEHOLDERS : []), ...(typeof customStakeholders !== 'undefined' ? customStakeholders : [])];
    sel.innerHTML = '<option value="">All Requirements</option>' +
      scorerIds.map(id => {
        const s = allStakeholders.find(st => st.id === id);
        const label = s ? (s.contactName ? s.name + ' — ' + s.contactName : s.name) : id;
        return `<option value="${escHtml(id)}" ${scorerFilter === id ? 'selected' : ''}>${escHtml(label)}</option>`;
      }).join('');
  }

  // ── SCOR: CUSTOM CONCEPT FIELDS ──

  function addConceptCustomField() {
    const nameEl = document.getElementById('scorCfNameInput');
    const typeEl = document.getElementById('scorCfTypeSelect');
    const name = nameEl ? nameEl.value.trim() : '';
    if (!name) { if (nameEl) nameEl.focus(); return; }
    conceptCustomFields.push({ id: 'cf' + (++_cfIdCounter), name, type: typeEl ? typeEl.value : 'text' });
    if (nameEl) nameEl.value = '';
    renderCustomFieldsList();
  }

  function removeConceptCustomField(id) {
    conceptCustomFields = conceptCustomFields.filter(f => f.id !== id);
    pughConcepts.forEach(c => { if (c.customFieldValues) delete c.customFieldValues[id]; });
    renderCustomFieldsList();
  }

  function renderCustomFieldsList() {
    const el = document.getElementById('scorCustomFieldsList');
    if (!el) return;
    if (conceptCustomFields.length === 0) {
      el.innerHTML = '<div style="font-size:12px;color:var(--text-light);margin-bottom:8px">No custom fields defined yet.</div>';
      return;
    }
    el.innerHTML = conceptCustomFields.map(f =>
      `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:12px;font-weight:600;color:var(--text);flex:1">${escHtml(f.name)}</span>
        <span style="font-size:11px;color:var(--text-muted);background:var(--bg);padding:2px 8px;border-radius:20px;border:1px solid var(--border)">${f.type}</span>
        <button class="btn btn-ghost" style="font-size:11px;padding:2px 8px;color:var(--danger)" onclick="removeConceptCustomField('${f.id}')">Remove</button>
      </div>`
    ).join('');
  }

  // ── SCOR: CONCEPT MANAGEMENT ──

  function addPughConcept() {
    const input = document.getElementById('scorConceptInput');
    const name  = input ? input.value.trim() : '';
    if (!name) { if (input) input.focus(); return; }
    if (pughConcepts.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      alert('A concept with this name already exists.');
      if (input) input.focus(); return;
    }
    if (conceptCustomFields.length > 0) {
      // Open the add concept modal to capture custom field values
      const nameInput = document.getElementById('addConceptNameInput');
      if (nameInput) nameInput.value = name;
      renderAddConceptFieldInputs();
      document.getElementById('addConceptModal').classList.add('open');
      if (input) input.value = '';
    } else {
      _doAddConcept(name, {});
      if (input) input.value = '';
    }
  }

  function renderAddConceptFieldInputs() {
    const container = document.getElementById('addConceptCustomFieldInputs');
    if (!container) return;
    container.innerHTML = conceptCustomFields.map(f =>
      `<div class="modal-field">
        <div class="modal-label">${escHtml(f.name)}</div>
        <input class="modal-input" type="${f.type === 'number' ? 'number' : 'text'}"
          id="cfInput_${f.id}" placeholder="${f.type === 'number' ? '0' : '—'}">
      </div>`
    ).join('');
  }

  function confirmAddConcept() {
    const nameInput = document.getElementById('addConceptNameInput');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) { if (nameInput) nameInput.focus(); return; }
    const customFieldValues = {};
    conceptCustomFields.forEach(f => {
      const inp = document.getElementById('cfInput_' + f.id);
      customFieldValues[f.id] = inp ? inp.value.trim() : '';
    });
    _doAddConcept(name, customFieldValues);
    document.getElementById('addConceptModal').classList.remove('open');
  }

  function cancelAddConcept() {
    document.getElementById('addConceptModal').classList.remove('open');
  }

  function _doAddConcept(name, customFieldValues) {
    pughConcepts.push({ id: ++pughConceptCounter, name, customFieldValues: customFieldValues || {} });
    renderConceptCards();
    renderPughMatrix();
  }

  function deletePughConcept(id) {
    if (!confirm('Delete this concept and all its scores? This cannot be undone.')) return;
    pughConcepts = pughConcepts.filter(c => c.id !== id);
    Object.keys(pughScores).forEach(k => { if (k.startsWith(id + '_')) delete pughScores[k]; });
    if (scoringConceptId === id) exitScoringView();
    renderConceptCards();
    renderPughMatrix();
  }

  function renamePughConcept(id) {
    const c = pughConcepts.find(c => c.id === id);
    if (!c) return;
    const n = prompt('Rename concept:', c.name);
    if (n && n.trim()) { c.name = n.trim(); renderConceptCards(); renderPughMatrix(); }
  }

  function startScoringConcept(id) {
    const isDatum = pughConcepts[0]?.id === id;
    if (isDatum) {
      startDatumDef();
      return;
    }
    scoringConceptId = id;
    scoringReqIndex  = 0;
    document.getElementById('scorEmptyState').style.display   = 'none';
    document.getElementById('scorScoringView').style.display  = '';
    renderScoringView();
  }

  function exitScoringView() {
    scoringConceptId = null;
    document.getElementById('scorScoringView').style.display = 'none';
    const datumDefView = document.getElementById('scorDatumDefView');
    const reqView      = document.getElementById('scorReqView');
    if (datumDefView) datumDefView.style.display = 'none';
    if (reqView)      reqView.style.display      = 'none';
    renderConceptCards();
  }

  // ── DATUM DEFINITION MODE ──

  function startDatumDef() {
    datumDefIndex = 0;
    document.getElementById('scorEmptyState').style.display   = 'none';
    document.getElementById('scorScoringView').style.display  = '';
    renderDatumDefView();
  }

  function exitDatumDef() {
    saveDatumField(); // persist any unsaved input before leaving
    document.getElementById('scorScoringView').style.display = 'none';
    const datumDefView = document.getElementById('scorDatumDefView');
    const reqView      = document.getElementById('scorReqView');
    if (datumDefView) datumDefView.style.display = 'none';
    if (reqView)      reqView.style.display      = 'none';
    renderConceptCards();
    renderPughMatrix();
  }

  function datumDefNav(dir) {
    // Save current field before navigating
    saveDatumField();
    const newIdx = datumDefIndex + dir;
    if (newIdx < 0) return;
    if (newIdx >= requirements.length) { exitDatumDef(); return; }
    datumDefIndex = newIdx;
    renderDatumDefView();
  }

  function saveDatumField() {
    const req = requirements[datumDefIndex];
    if (!req) return;
    const level       = document.getElementById('datumLevelInput')?.value     || '';
    const anchorHigh  = document.getElementById('datumAnchorHighInput')?.value || '';
    const anchorLow   = document.getElementById('datumAnchorLowInput')?.value  || '';
    if (!datumPerformance[req.id]) datumPerformance[req.id] = {};
    datumPerformance[req.id].level      = level;
    datumPerformance[req.id].anchorHigh = anchorHigh;
    datumPerformance[req.id].anchorLow  = anchorLow;
    // MAS is saved separately by setDatumMAS()
    // Update concept card progress in real time
    renderConceptCards();
  }

  function setDatumMAS(value) {
    const req = requirements[datumDefIndex];
    if (!req) return;
    if (!datumPerformance[req.id]) datumPerformance[req.id] = {};
    // Toggle off if clicking current
    if (datumPerformance[req.id].mas === value) {
      delete datumPerformance[req.id].mas;
    } else {
      datumPerformance[req.id].mas = value;
    }
    renderDatumDefView(); // re-render to highlight active button
    renderPughMatrix();
  }


  function scoringNav(dir) {
    saveConceptPerf();
    saveConceptNote();
    const reqs = getFilteredReqs();
    const newIdx = scoringReqIndex + dir;
    if (newIdx < 0) return;
    if (newIdx >= reqs.length) { saveConceptPerf(); saveConceptNote(); exitScoringView(); return; }
    scoringReqIndex = newIdx;
    renderScoringView();
  }

  function setScore(score) {
    if (!scoringConceptId) return;
    const req = getFilteredReqs()[scoringReqIndex];
    if (!req) return;
    saveConceptPerf();
    saveConceptNote();
    const key = scoringConceptId + '_' + req.id;
    if (pughScores[key] === score) {
      delete pughScores[key];
    } else {
      pughScores[key] = score;
    }
    renderScoringView();
    renderConceptCards();
    renderPughMatrix();
    // Auto-advance after a brief visual pause
    setTimeout(() => {
      const filtered = getFilteredReqs();
      if (scoringReqIndex < filtered.length - 1) { scoringReqIndex++; renderScoringView(); }
    }, 280);
  }

  function saveConceptPerf() {
    if (!scoringConceptId) return;
    const req = getFilteredReqs()[scoringReqIndex];
    if (!req) return;
    const val = document.getElementById('conceptPerfInput')?.value || '';
    const key = scoringConceptId + '_' + req.id;
    if (val.trim()) {
      conceptPerformance[key] = val;
    } else {
      delete conceptPerformance[key];
    }
  }

  function saveConceptNote() {
    if (!scoringConceptId) return;
    const req = getFilteredReqs()[scoringReqIndex];
    if (!req) return;
    const key = scoringConceptId + '_' + req.id;
    const val = document.getElementById('conceptNotesInput')?.value || '';
    if (val.trim()) {
      conceptNotes[key] = val;
    } else {
      delete conceptNotes[key];
    }
  }

  // Returns the requirements list filtered by the current scorerFilter.
  // The scorer filter only affects scoring view display — never Pugh calculations.
  function getFilteredReqs() {
    if (!scorerFilter) return requirements;
    return requirements.filter(r => r.scorer === scorerFilter);
  }

  // ── SCOR: CONCEPT SUMMARY ──

  function showConceptSummary(conceptId) {
    const concept = pughConcepts.find(c => c.id === conceptId);
    if (!concept) return;
    const isBaseline = pughConcepts[0]?.id === conceptId;
    const advanced   = pughSettings.advancedScoring && userTier !== 'free';
    const modeLabel  = advanced ? 'Advanced (−3 to +3)' : 'Basic (+/0/−)';

    let html = '';

    // Concept name + datum badge
    html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap">`;
    if (isBaseline) html += `<span class="concept-datum-badge">Datum</span>`;
    html += `<span style="font-size:15px;font-weight:700;color:var(--text)">${escHtml(concept.name)}</span>`;
    html += `</div>`;

    // Custom field values
    if (conceptCustomFields.length > 0) {
      html += `<div style="margin-bottom:16px;padding:12px 14px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">`;
      html += `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:8px">Custom Fields</div>`;
      conceptCustomFields.forEach(f => {
        const val = concept.customFieldValues?.[f.id] || '—';
        html += `<div style="display:flex;gap:8px;margin-bottom:4px;align-items:baseline">`;
        html += `<span style="font-size:12px;color:var(--text-muted);min-width:130px;flex-shrink:0">${escHtml(f.name)}</span>`;
        html += `<span style="font-size:12px;font-weight:600;color:var(--text)">${escHtml(val)}</span>`;
        html += `</div>`;
      });
      html += `</div>`;
    }

    // Scoring mode
    html += `<div style="font-size:12px;color:var(--text-muted);margin-bottom:16px">Scoring Mode: <strong>${modeLabel}</strong></div>`;

    // Requirements
    if (requirements.length > 0) {
      html += `<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:10px">Requirements</div>`;
      requirements.forEach(req => {
        const key = conceptId + '_' + req.id;
        const score = isBaseline ? null : pughScores[key];
        const perf  = conceptPerformance[key] || '';
        const note  = conceptNotes[key] || '';

        const scoreStr  = isBaseline ? 'Datum' : (score !== undefined && score !== null ? String(score) : '—');
        const scorePos  = !isBaseline && (score === '+' || (typeof score === 'number' && score > 0));
        const scoreNeg  = !isBaseline && (score === '-' || (typeof score === 'number' && score < 0));
        const scoreClr  = scorePos ? 'var(--success)' : scoreNeg ? 'var(--danger)' : 'var(--text-muted)';

        const reqDisplay = (typeof buildReqSentenceHtml === 'function')
          ? buildReqSentenceHtml(req)
          : escHtml(req.text || req.id);

        html += `<div style="padding:10px 0;border-bottom:1px solid var(--border)">`;
        html += `<div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:4px">`;
        html += `<div style="font-size:12px;color:var(--text);flex:1;line-height:1.5">${reqDisplay}</div>`;
        html += `<div style="font-size:14px;font-weight:700;color:${scoreClr};flex-shrink:0;padding-top:1px">${scoreStr}</div>`;
        html += `</div>`;
        if (perf) html += `<div style="font-size:11px;color:var(--text-muted);margin-bottom:2px">Performance: ${escHtml(perf)}</div>`;
        if (note) html += `<div style="font-size:11px;color:var(--text-muted);font-style:italic">"${escHtml(note)}"</div>`;
        html += `</div>`;
      });
    } else {
      html += `<div style="font-size:12px;color:var(--text-light)">No requirements added yet.</div>`;
    }

    document.getElementById('conceptSummaryTitle').textContent = concept.name + ' — Summary';
    document.getElementById('conceptSummaryBody').innerHTML = html;
    document.getElementById('conceptSummaryModal').classList.add('open');
  }

  function closeConceptSummary() {
    const el = document.getElementById('conceptSummaryModal');
    if (el) el.classList.remove('open');
  }


  // ── PUGH MATRIX ──


  // Convert a score value to a numeric for MAS comparison
  function scoreToNum(score) {
    if (score === '+')  return  1;
    if (score === '0')  return  0;
    if (score === '-')  return -1;
    if (typeof score === 'number') return score;
    return null;
  }



  // ── PUGH SCORE POPUP ──
  _scorePopupConcept = null;
  _scorePopupReq     = null;

  function openScorePopup(event, conceptId, reqId) {
    event.stopPropagation();
    const popup = document.getElementById('pughScorePopup');
    if (!popup) return;

    _scorePopupConcept = conceptId;
    _scorePopupReq     = reqId;
    const curScore = pughScores[conceptId + '_' + reqId];
    const advanced = pughSettings.advancedScoring && userTier !== 'free';

    // Build buttons
    let btns = '';
    if (advanced) {
      const opts = [
        { val: 3,  label: '+3', cls: 'popup-plus'  },
        { val: 2,  label: '+2', cls: 'popup-plus'  },
        { val: 1,  label: '+1', cls: 'popup-plus'  },
        { val: 0,  label: '0',  cls: 'popup-neu'   },
        { val: -1, label: '−1', cls: 'popup-minus' },
        { val: -2, label: '−2', cls: 'popup-minus' },
        { val: -3, label: '−3', cls: 'popup-minus' },
      ];
      opts.forEach(o => {
        const cur = o.val === curScore ? ' popup-current' : '';
        btns += `<button class="popup-score-btn ${o.cls}${cur}" onclick="applyScoreFromPopup(${o.val})">${o.label}</button>`;
      });
    } else {
      const opts = [
        { val: '+', label: '+', cls: 'popup-plus'  },
        { val: '0', label: '0', cls: 'popup-neu'   },
        { val: '-', label: '−', cls: 'popup-minus' },
      ];
      opts.forEach(o => {
        const cur = o.val === curScore ? ' popup-current' : '';
        btns += `<button class="popup-score-btn ${o.cls}${cur}" onclick="applyScoreFromPopup('${o.val}')">${o.label}</button>`;
      });
    }
    // Clear button — only if a score is already set
    if (curScore !== undefined && curScore !== null) {
      btns += `<button class="popup-score-btn popup-clear" onclick="applyScoreFromPopup(null)" title="Clear score">CLEAR</button>`;
    }

    popup.innerHTML = btns;
    popup.classList.add('open');

    // Position near the clicked cell — centered horizontally, below the cell
    const cell = event.currentTarget;
    const rect = cell.getBoundingClientRect();
    const pw = 72;
    // Estimate height: 36px per btn + 3px gap, plus 10px padding. basic=4 btns, adv=8 btns
    const btnCount = advanced ? 8 : 4;
    const ph = btnCount * 36 + (btnCount - 1) * 3 + 10;
    let left = rect.left + rect.width / 2 - pw / 2;
    let top  = rect.bottom + 6;
    left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
    if (top + ph > window.innerHeight) top = rect.top - ph - 6;
    popup.style.left = left + 'px';
    popup.style.top  = top  + 'px';
  }

  function applyScoreFromPopup(value) {
    const key = _scorePopupConcept + '_' + _scorePopupReq;
    if (value === null || value === undefined) {
      delete pughScores[key];
    } else {
      pughScores[key] = value;
    }
    closeScorePopup();
    renderPughMatrix();
    renderConceptCards();
  }

  function closeScorePopup() {
    const popup = document.getElementById('pughScorePopup');
    if (popup) popup.classList.remove('open');
    _scorePopupConcept = null;
    _scorePopupReq     = null;
  }


  // ── PUGH: SCORE STORAGE (dual: advanced numeric + basic symbolic) ──
  // pughScores      = currently displayed scores (symbols when basic, numbers when advanced)
  // pughAdvBackup   = preserved numeric scores even when advanced mode is off
  pughAdvBackup = {}; // {key: number}

  function togglePughMTHUS(cb) {
    if (userTier === 'free') { cb.checked = false; showUpgradePrompt('weighted-pair'); return; }
    pughSettings.showMTHUS = cb.checked; renderPughMatrix();
  }
  function togglePughMAS(cb) {
    if (userTier === 'free') { cb.checked = false; showUpgradePrompt('weighted-pair'); return; }
    pughSettings.showMAS = cb.checked; renderPughMatrix();
  }

  // ── PUGH: MTHUS / MTHUWS CALCULATION ──
  // MTHUS  = for each requirement, take the BEST score across all non-datum concepts; sum them
  // MTHUWS = same but each req's best score is multiplied by its ility weight
  // Ratio  = concept's utility score / MTHUS (or MTHUWS for weighted variant)
  function calcMTHUS() {
    const nonDatum = pughConcepts.slice(1);
    let mthus = 0, mthuws = 0;
    requirements.forEach(req => {
      const weight = window._pairWeights?.[req.primary] || 1;
      let best = -Infinity;
      nonDatum.forEach(c => {
        const s = pughScores[c.id + '_' + req.id];
        let val = 0;
        if (s === '+') val = 1;
        else if (s === '-') val = -1;
        else if (s === '0') val = 0;
        else if (typeof s === 'number') val = s;
        // datum contributes 0 (D = reference)
        if (val > best) best = val;
      });
      if (best === -Infinity) best = 0; // unscored reqs contribute 0
      mthus  += best;
      mthuws += best * weight;
    });
    return {
      mthus:  Math.round(mthus  * 10) / 10,
      mthuws: Math.round(mthuws * 10) / 10
    };
  }


  // ── PUGH: CONCEPT SCORE CHART ──

  // ── PUGH: SETTINGS PANEL ──
  function togglePughSettings() {
    // Free users see the button but get an upgrade prompt on click
    if (userTier === 'free') {
      showUpgradePrompt('pugh-settings');
      return;
    }
    const panel = document.getElementById('pughSettingsPanel');
    const btn   = document.getElementById('pughSettingsBtn');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none' && panel.style.display !== '';
    panel.style.display = isOpen ? 'none' : 'block';
    if (btn) btn.classList.toggle('active', !isOpen);
  }

  function closePughSettings() {
    const panel = document.getElementById('pughSettingsPanel');
    const btn   = document.getElementById('pughSettingsBtn');
    if (panel) panel.style.display = 'none';
    if (btn)   btn.classList.remove('active');
  }

  function updatePughAccountToggles() {
    const panel = document.getElementById('pughSettingsPanel');
    const btn   = document.getElementById('pughSettingsBtn');
    // Always show the settings button so free users can see what they're missing.
    // Style it locked (muted + cursor:default) for free; normal for account+.
    if (btn) {
      btn.style.display = '';
      if (userTier === 'free') {
        btn.style.opacity = '0.5';
        btn.style.cursor  = 'pointer'; // still clickable — triggers upgrade prompt
      } else {
        btn.style.opacity = '';
        btn.style.cursor  = '';
      }
    }
    // Keep panel hidden for free users even if they somehow trigger it
    if (panel && userTier === 'free') panel.style.display = 'none';
    // Sync all tier badges
    updateTierBadges();
  }

  function updateTierBadges() {
    // Coaching button: show PRO badge for free/account; hide when already pro+
    const coachBadge = document.getElementById('coachProBadge');
    if (coachBadge) coachBadge.style.display = userTier === 'pro' ? 'none' : '';

    // Pugh settings panel account+ badges: hide when already account or above
    const isAboveFree = userTier === 'account' || userTier === 'pro';
    document.querySelectorAll('.account-badge-inline').forEach(el => {
      el.style.display = isAboveFree ? 'none' : '';
    });
  }

  // ══════════════════════════════════════════════════════
  //  BASIC MODE
  //  Shared data: requirements[], pughConcepts[], pughScores, activeProject
  //  No separate state — both modes read/write the same arrays/objects.
  //  Future backend/auth integration point: replace sessionStorage with
  //  an API call in qsSync() and syncFullToBasic().
  // ══════════════════════════════════════════════════════

  // Current app mode: 'full' (default) | 'basic'
  appMode = 'full';
  // Remember last full-mode page so switching back lands in the right spot
  _lastFullPage = 'home';

  // Simple HTML-escape helper (no external dependency needed)

  // ── Ensure datum concept exists at index 0 (always present in Basic Mode) ──
  function ensureQSDatum() {
    if (pughConcepts.length === 0 || pughConcepts[0].id !== 'datum-qs') {
      pughConcepts.unshift({ id: 'datum-qs', name: '' });
    }
  }

  // ── Update the datum/baseline name from the text field ──
  function updateQSBaseline(name) {
    ensureQSDatum();
    pughConcepts[0].name = name;
    renderQSMatrix(); // column header updates live
  }

  // ── Add / Remove requirements from Basic Mode ──
  function addQSRequirement() {
    reqIdCounter++;
    const id = 'r' + reqIdCounter;
    // Basic Mode requirements map to SYSTEM/INCOSE format with no type and Primary Ility = Other
    requirements.push({ id, format: 'incose', text: '', type: '', primary: 'other', secondaries: [], stakeholders: [] });
    renderQSLists();
    renderQSMatrix();
    // Focus the new input
    setTimeout(() => {
      const inputs = document.querySelectorAll('#qsRequirementsList .qs-row-input');
      if (inputs.length) inputs[inputs.length - 1].focus();
    }, 30);
  }

  function removeQSRequirement(reqId) {
    const idx = requirements.findIndex(r => r.id === reqId);
    if (idx !== -1) requirements.splice(idx, 1);
    renderQSLists();
    renderQSMatrix();
  }

  function updateQSRequirement(reqId, text) {
    const r = requirements.find(r => r.id === reqId);
    if (r) { r.text = text; renderQSMatrix(); }
  }

  // ── Add / Remove concepts from Basic Mode ──
  function addQSConcept() {
    ensureQSDatum();
    const id = 'qsc-' + Date.now();
    pughConcepts.push({ id, name: '' });
    renderQSLists();
    renderQSMatrix();
    setTimeout(() => {
      const inputs = document.querySelectorAll('#qsConceptsList .qs-row-input');
      if (inputs.length) inputs[inputs.length - 1].focus();
    }, 30);
  }

  function removeQSConcept(conceptId) {
    const idx = pughConcepts.findIndex(c => c.id === conceptId);
    if (idx !== -1) pughConcepts.splice(idx, 1);
    // Clean up scores for this concept
    Object.keys(pughScores).forEach(k => {
      if (k.startsWith(conceptId + '_')) delete pughScores[k];
    });
    renderQSLists();
    renderQSMatrix();
  }

  function updateQSConcept(conceptId, name) {
    const c = pughConcepts.find(c => c.id === conceptId);
    if (c) { c.name = name; renderQSMatrix(); }
  }

  // ── Score a cell in the QS matrix ──
  function setQSScore(conceptId, reqId, score) {
    const key = conceptId + '_' + reqId;
    // Toggle: clicking the active score again clears it
    if (pughScores[key] === score) { delete pughScores[key]; } else { pughScores[key] = score; }
    renderQSMatrix();
  }

  // ── Render the requirements and concepts lists ──

  // ── Render the simple Pugh Matrix ──

  // ── Sync Basic Mode text fields → shared state (called on every input event) ──
  // This means data entered in Basic Mode is immediately visible if user switches to Full Mode.
  function qsSync() {
    // Project name → activeProject
    const pname = (document.getElementById('qsProjectName')?.value || '').trim();
    if (!activeProject) activeProject = { id: 'qs-' + Date.now(), name: '', createdAt: new Date().toISOString() };
    activeProject.name = pname;
    updateNavProjectName();

    // Goal → Basic Goal field in Full Mode (keeps Basic Mode → Full Mode mapping clean)
    const goal = document.getElementById('qsGoal')?.value || '';
    const basicGoalField = document.getElementById('input-goal-basic');
    if (basicGoalField) basicGoalField.value = goal;
    goalMode = 'basic'; // ensure Full Mode shows the basic goal input when the user arrives
  }

  // ── DRAG HANDLE (right sidebar resize) ──
  function initResizeHandle() {
    const handle  = document.getElementById('rightResizeHandle');
    const sidebar = document.getElementById('rightSidebar');
    if (!handle || !sidebar) return;

    let startX = 0;
    let startW = 0;

    handle.addEventListener('pointerdown', function(e) {
      startX = e.clientX;
      startW = sidebar.offsetWidth;
      handle.classList.add('dragging');
      document.addEventListener('pointermove', onDrag);
      document.addEventListener('pointerup', onDragEnd, { once: true });
      handle.setPointerCapture(e.pointerId);
      e.preventDefault();
    });

    function onDrag(e) {
      const delta = startX - e.clientX;          // drag left = wider sidebar
      const newW  = Math.min(520, Math.max(240, startW + delta));
      document.documentElement.style.setProperty('--right-sidebar-w', newW + 'px');
    }

    function onDragEnd() {
      handle.classList.remove('dragging');
      document.removeEventListener('pointermove', onDrag);
      const w = getComputedStyle(document.documentElement)
        .getPropertyValue('--right-sidebar-w').trim();
      try { localStorage.setItem('cc_rightSidebarW', w); } catch(e) {}
    }
  }

  function loadSavedSidebarWidth() {
    try {
      const saved = localStorage.getItem('cc_rightSidebarW');
      if (saved) document.documentElement.style.setProperty('--right-sidebar-w', saved);
    } catch(e) {}
  }

  // ── SIDEBAR NUDGE (periodic attention hint) ──
  function initSidebarNudge() {
    const nudge = document.getElementById('rightSidebarNudge');
    if (!nudge) return;

    try {
      let count = parseInt(localStorage.getItem('cc_sessionCount') || '0', 10) + 1;
      localStorage.setItem('cc_sessionCount', count);

      // Show on every 10th session
      if (count % 10 !== 0) return;

      setTimeout(function() {
        nudge.classList.add('visible');
        setTimeout(function() { nudge.classList.remove('visible'); }, 10000);
      }, 2500);
    } catch(e) {}

    nudge.addEventListener('click', function() {
      nudge.classList.remove('visible');
    });
  }

  // ── Sync Guided state → QS display (called when entering Quick mode) ──
  function syncGuidedToQS() {
    // Always ensure datum exists before rendering anything
    ensureQSDatum();

    // Project name
    const pnEl = document.getElementById('qsProjectName');
    if (pnEl) pnEl.value = activeProject?.name || '';

    // Goal: read from Basic Goal field if in basic mode; otherwise flatten TO/BY structured fields
    const goalEl = document.getElementById('qsGoal');
    if (goalEl) {
      if (goalMode === 'basic') {
        goalEl.value = document.getElementById('input-goal-basic')?.value || '';
      } else {
        const toVal = document.getElementById('input-to')?.value || '';
        const byVal = document.getElementById('input-by')?.value || '';
        goalEl.value = byVal ? `${toVal} BY ${byVal}` : toVal;
      }
    }

    renderQSLists(); // also populates qsBaselineName from pughConcepts[0]
    renderQSMatrix();
  }

  // ── Mode switching ──
  // setMode(mode) is the single point of truth for switching.
  // Full → Basic: syncs state into Basic Mode display fields.
  // Basic → Full: qsSync() was already called on each input, so state is current.
  function setMode(mode) {
    if (mode === appMode && mode === 'basic' && _currentPage === 'basic') return;
    appMode = mode;

    // Update body class (controls nav-tools visibility via CSS)
    document.body.classList.toggle('mode-basic', mode === 'basic');
    document.body.classList.toggle('mode-full',  mode === 'full');

    // Update toggle buttons
    document.getElementById('modeBtnBasic')?.classList.toggle('active', mode === 'basic');
    document.getElementById('modeBtnFull') ?.classList.toggle('active', mode === 'full');

    if (mode === 'basic') {
      // Save last full-mode page so we can return to it
      if (_currentPage !== 'basic') _lastFullPage = _currentPage;
      // Enforce Basic Mode defaults (non-weighted pair, basic scoring, no advanced pugh)
      pairMode = 'nonweighted';
      pughSettings = { ...pughSettings, advancedScoring: false, showMTHUS: false, showMAS: false };
      // Sync full-mode data into Basic Mode display
      syncGuidedToQS();
      switchPage('basic', null);
    } else {
      // Entering Full Mode: set defaults for data that came from Basic Mode
      reqFormat = 'incose'; // Basic Mode reqs are INCOSE; this takes effect on next REQS page visit
      goalMode = 'basic';   // Basic Mode goal maps to the Basic goal field
      // Return to last full-mode page (or HOME if first time)
      const returnPage = _lastFullPage || 'home';
      const navBtn = document.querySelector(`.nav-tool[data-page="${returnPage}"]`);
      switchPage(returnPage, navBtn);
    }
  }
