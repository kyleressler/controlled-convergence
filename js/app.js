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
            valTextEl.textContent = 'Pro users get AI coaching on each section. Upgrade for personalized feedback.';
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

  // ── PRO UPGRADE ──────────────────────────────────────────────
  //
  // STRIPE_TODO: This is the single entry point for all "Upgrade to Pro" actions
  // in the app — the upgrade modal CTA and the sidebar button both call this.
  //
  // When Stripe is ready, implement the body of this function:
  //
  //   1. Guard: user must be signed in first.
  //      if (!appState.currentUser) { openAuthModal('signup'); return; }
  //
  //   2. Call the Netlify function to create a Stripe Checkout session:
  //      POST /.netlify/functions/create-checkout-session
  //      Headers: { 'Content-Type': 'application/json' }
  //      Body:    { userId: appState.currentUser.id, email: appState.currentUser.email }
  //        - userId is sent as client_reference_id so the webhook can find the
  //          right Supabase user to upgrade after payment completes.
  //        - email pre-fills the Stripe checkout form for a smoother experience.
  //
  //   3. Redirect to the Stripe-hosted checkout page:
  //      const { url } = await res.json();
  //      window.location.href = url;
  //
  //   4. After payment, Stripe fires to /.netlify/functions/stripe-webhook,
  //      which sets user_profiles.tier = 'pro' in Supabase using the service
  //      role key. No frontend success-page handling needed — the tier updates
  //      automatically on the next auth state refresh when the user returns.
  //
  //   5. Stripe needs two env vars in Netlify:
  //      STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
  //      Supabase webhook function needs: SUPABASE_SERVICE_ROLE_KEY
  //
  function handleProUpgrade() {
    // STRIPE_TODO: replace the modal below with the Stripe checkout implementation above.
    const overlay = document.getElementById('upgradeModal');
    if (overlay) {
      document.getElementById('upgradeModalTitle').textContent = 'Upgrade to Pro';
      document.getElementById('upgradeModalBody').textContent  =
        'Pro unlocks AI coaching, PDF export, unlimited projects, templates, and more. ' +
        'Paid upgrade is coming soon — stay tuned for the announcement.';
      const ctaBtn = document.getElementById('upgradeModalCta');
      ctaBtn.textContent = 'Got It';
      ctaBtn.onclick = closeUpgradeModal;
      overlay.classList.add('open');
    }
  }

  function handleAccountCTA() {
    if (!appState.currentUser) {
      openAuthModal('signup');
    } else if (userTier === 'account') {
      handleProUpgrade(); // STRIPE_TODO: wired — see handleProUpgrade() above for details
    }
    // Pro/admin users: button is hidden by updateAccountStatus(), this branch never runs
  }

  async function handleLogout() {
    if (!appState.currentUser) return;
    // Best-effort server-side sign-out. If the JWT has already expired Supabase
    // may return an error, but logout() still clears localStorage and wipes
    // appState.currentUser — so the user is logged out locally regardless.
    // Never block the reload on a signOut error.
    await logout();
    window.location.reload();
  }

  // ── Auth Modal ────────────────────────────────────────────────

  function openAuthModal(tab) {
    tab = tab || 'login';
    switchAuthTab(tab);
    // Switch password fields to type="password" now that the modal is opening.
    // They live as type="text" in the HTML so Safari doesn't show autofill on page load.
    var loginPw  = document.getElementById('authLoginPassword');
    var signupPw = document.getElementById('authSignupPassword');
    if (loginPw)  loginPw.type  = 'password';
    if (signupPw) signupPw.type = 'password';
    document.getElementById('authModal').classList.add('open');
  }

  function closeAuthModal() {
    document.getElementById('authModal').classList.remove('open');
    ['authLoginEmail','authLoginPassword','authSignupName','authSignupEmail','authSignupPassword'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    // Reset password fields back to type="text" so Safari won't trigger autofill on the next page load.
    var loginPw  = document.getElementById('authLoginPassword');
    var signupPw = document.getElementById('authSignupPassword');
    if (loginPw)  loginPw.type  = 'text';
    if (signupPw) signupPw.type = 'text';
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
    await _checkAndShowTasksOnAuth();
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
    await _checkAndShowTasksOnAuth();
  }


  // ── TASKS PANEL ──────────────────────────────────────────────
  // Tasks are stored in the `tasks` Supabase table.
  // The panel slides in from the right and shows two sections:
  //   1. Tasks assigned TO the current user   (they must act)
  //   2. Tasks assigned BY the current user   (they can track / revoke)

  var _tasksPanelOpen = false;

  function openTasksPanel() {
    document.getElementById('tasksPanel').classList.add('open');
    document.getElementById('tasksPanelOverlay').classList.add('open');
    _tasksPanelOpen = true;
    renderTasksPanel();
  }

  function closeTasksPanel() {
    document.getElementById('tasksPanel').classList.remove('open');
    document.getElementById('tasksPanelOverlay').classList.remove('open');
    _tasksPanelOpen = false;
  }

  // Fetch all tasks for the current user (both directions) and render the panel.
  async function renderTasksPanel() {
    if (!appState.currentUser) return;
    var uid = appState.currentUser.id;

    // Fetch active tasks assigned to me (pending or accepted only)
    // Resolved tasks (completed/declined/expired) live in Task History.
    var { data: toMe, error: errToMe } = await _supabase
      .from('tasks')
      .select('*')
      .eq('assignee_id', uid)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false });

    // Fetch active tasks I assigned — same filter so the panel stays clean
    var { data: byMe, error: errByMe } = await _supabase
      .from('tasks')
      .select('*')
      .eq('assigner_id', uid)
      .in('status', ['pending', 'accepted'])
      .order('created_at', { ascending: false });

    _renderTaskSection('tasksAssignedToMe', 'tasksAssignedToMeEmpty', toMe || [], 'assignee');
    _renderTaskSection('tasksAssignedByMe', 'tasksAssignedByMeEmpty', byMe || [], 'assigner');
    _updateTasksBadge(toMe || []);
  }

  // Update the nav badge with count of pending tasks assigned to me.
  function _updateTasksBadge(toMe) {
    var badge = document.getElementById('navTasksBadge');
    if (!badge) return;
    var pending = (toMe || []).filter(function(t) { return t.status === 'pending'; }).length;
    if (pending > 0) {
      badge.textContent = pending;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }

  // Render a list of task cards into a container element.
  // role: 'assignee' (tasks directed at me) | 'assigner' (tasks I created)
  function _renderTaskSection(containerId, emptyId, tasks, role) {
    var container = document.getElementById(containerId);
    var emptyEl   = document.getElementById(emptyId);
    if (!container) return;

    // Remove previously rendered cards (but leave the empty placeholder)
    Array.from(container.querySelectorAll('.task-card')).forEach(function(c) { c.remove(); });

    if (!tasks || tasks.length === 0) {
      if (emptyEl) emptyEl.style.display = '';
      return;
    }
    if (emptyEl) emptyEl.style.display = 'none';

    tasks.forEach(function(task) {
      var card = _buildTaskCard(task, role);
      container.appendChild(card);
    });
  }

  // Build a single task card DOM element.
  function _buildTaskCard(task, role) {
    var card = document.createElement('div');
    card.className = 'task-card';
    card.dataset.taskId = task.id;

    // Determine if task has expired client-side (expired_at past, still pending in DB)
    var isExpired = task.status === 'pending' && task.expires_at && new Date(task.expires_at) < new Date();
    var effectiveStatus = isExpired ? 'expired' : (task.status || 'pending');

    var statusClass = 'task-status-' + effectiveStatus;
    var statusLabel = effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1);
    var title       = task.title || _taskTypeLabel(task.task_type);
    var projName    = _resolveProjectName(task);
    var projectHint = task.project_id ? ('<span>' + _escHtml(projName) + '</span>') : '';
    var expiryHint  = task.expires_at ? ('<span>Expires ' + _relativeDate(task.expires_at) + '</span>') : '';
    var dateHint    = task.created_at ? ('<span>' + _relativeDate(task.created_at) + '</span>') : '';

    // Top row: title + status chip
    var top = document.createElement('div');
    top.className = 'task-card-top';
    top.innerHTML = '<span class="task-card-title">' + _escHtml(title) + '</span>'
                  + '<span class="task-status ' + statusClass + '">' + statusLabel + '</span>';
    card.appendChild(top);

    // Meta row: project name + expiry (if set) + date
    var meta = document.createElement('div');
    meta.className = 'task-card-meta';
    meta.innerHTML = projectHint + expiryHint + dateHint;
    card.appendChild(meta);

    // Action buttons
    var actions = document.createElement('div');
    actions.className = 'task-card-actions';

    // Preview details — always available
    var detailBtn = document.createElement('button');
    detailBtn.className = 'task-action-btn';
    detailBtn.textContent = 'Preview details';
    detailBtn.onclick = function() { openTaskDetailModal(task, role); };
    actions.appendChild(detailBtn);

    if (role === 'assigner') {
      // Send follow-up reminder (mailto) — only for active pending tasks
      if (task.status === 'pending' && !isExpired) {
        var reminderBtn = document.createElement('button');
        reminderBtn.className = 'task-action-btn';
        reminderBtn.textContent = 'Send reminder';
        reminderBtn.onclick = function() { _taskSendReminder(task); };
        actions.appendChild(reminderBtn);
      }
      // Revoke (pending) / Remove (finished/expired) — always available to assigner
      var revokeBtn = document.createElement('button');
      revokeBtn.className = 'task-action-btn danger';
      revokeBtn.textContent = (task.status === 'pending') ? 'Revoke' : 'Remove';
      revokeBtn.onclick = function() { _taskRevoke(task.id); };
      actions.appendChild(revokeBtn);
    }

    // Assignee actions — only show when task is active (not expired)
    if (role === 'assignee' && task.status === 'pending' && !isExpired) {
      if (task.task_type === 'req_review') {
        var approveBtn = document.createElement('button');
        approveBtn.className = 'task-action-btn';
        approveBtn.textContent = 'Approve';
        approveBtn.onclick = function() { openApprovalModal(task.id); };
        actions.appendChild(approveBtn);
      } else if (task.task_type === 'collab_invite') {
        var acceptInviteBtn = document.createElement('button');
        acceptInviteBtn.className = 'task-action-btn';
        acceptInviteBtn.textContent = 'Accept';
        acceptInviteBtn.onclick = function() { acceptCollabInvite(task.id); };
        actions.appendChild(acceptInviteBtn);
      } else {
        // Scoring task: "Complete" signals the work is done, not just acknowledged
        var completeBtn = document.createElement('button');
        completeBtn.className = 'task-action-btn';
        completeBtn.textContent = 'Complete';
        completeBtn.onclick = function() { _taskUpdateStatus(task.id, 'completed'); };
        actions.appendChild(completeBtn);
      }
      // Decline — opens modal requiring a reason (all task types)
      var declineBtn = document.createElement('button');
      declineBtn.className = 'task-action-btn danger';
      declineBtn.textContent = 'Decline';
      declineBtn.onclick = function() { openDeclineModal(task.id); };
      actions.appendChild(declineBtn);
    }

    // Accepted req_review tasks: Approve button persists until actually approved
    if (role === 'assignee' && task.status === 'accepted' && task.task_type === 'req_review') {
      var approveBtn2 = document.createElement('button');
      approveBtn2.className = 'task-action-btn';
      approveBtn2.textContent = 'Approve';
      approveBtn2.onclick = function() { openApprovalModal(task.id); };
      actions.appendChild(approveBtn2);
    }

    // Accepted scoring tasks: show Complete so the assignee can mark it done after scoring
    if (role === 'assignee' && task.status === 'accepted' && task.task_type === 'scoring' && !isExpired) {
      var completeBtn2 = document.createElement('button');
      completeBtn2.className = 'task-action-btn';
      completeBtn2.textContent = 'Complete';
      completeBtn2.onclick = function() { _taskUpdateStatus(task.id, 'completed'); };
      actions.appendChild(completeBtn2);
    }

    card.appendChild(actions);
    return card;
  }

  // Open the task detail modal.
  // role: 'assignee' | 'assigner' — controls whether "Load Project" button appears.
  function openTaskDetailModal(task, role) {
    var title      = task.title || _taskTypeLabel(task.task_type);
    var detail     = document.getElementById('taskDetailBody');
    var projName   = _resolveProjectName(task);
    var statusText = (task.status || 'pending').charAt(0).toUpperCase() + (task.status || 'pending').slice(1);

    var rows = [
      ['Type',    _taskTypeLabel(task.task_type)],
      ['Status',  statusText],
      ['Project', projName],
      ['Created', task.created_at ? new Date(task.created_at).toLocaleString() : '—'],
      ['Expires', task.expires_at ? new Date(task.expires_at).toLocaleString() : 'No expiry'],
    ];
    var html = '<table style="width:100%;border-collapse:collapse;font-size:13px">';
    rows.forEach(function(r) {
      html += '<tr><td style="padding:6px 12px 6px 0;color:var(--text-muted);white-space:nowrap;vertical-align:top;font-weight:600">'
            + _escHtml(r[0]) + '</td><td style="padding:6px 0;color:var(--text)">' + _escHtml(String(r[1])) + '</td></tr>';
    });
    html += '</table>';

    // Human-friendly payload section
    if (task.payload) {
      var p = task.payload;
      html += '<div style="margin-top:16px;display:flex;flex-direction:column;gap:12px">';

      if (task.task_type === 'req_review') {
        if (p.requirementText) {
          html += '<div>'
                + '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:5px">Requirement</div>'
                + '<div style="font-size:13px;color:var(--text);background:var(--bg,rgba(0,0,0,0.06));border:1px solid var(--border);border-radius:6px;padding:10px 12px;line-height:1.55">'
                + _escHtml(p.requirementText) + '</div></div>';
        }
        if (p.instructions) {
          html += '<div>'
                + '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);margin-bottom:5px">Instructions</div>'
                + '<div style="font-size:13px;color:var(--text);line-height:1.55">' + _escHtml(p.instructions) + '</div></div>';
        }
        if (p.approval) {
          html += '<div>'
                + '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--success,#22c55e);margin-bottom:5px">Approved</div>'
                + '<div style="font-size:13px;color:var(--text);line-height:1.55">By ' + _escHtml(p.approval.approverName || 'Unknown')
                + ' on ' + new Date(p.approval.approvedAt).toLocaleDateString() + '</div>'
                + (p.approval.comment ? '<div style="font-size:12px;color:var(--text-muted);margin-top:4px;font-style:italic">&ldquo;' + _escHtml(p.approval.comment) + '&rdquo;</div>' : '')
                + '</div>';
        }
      } else if (task.task_type === 'scoring') {
        var reqCount   = (p.requirementIds || []).length;
        var scopeLabel = p.conceptScope === 'all' ? 'all concepts' : ((p.conceptIds || []).length + ' concept' + ((p.conceptIds || []).length !== 1 ? 's' : ''));
        html += '<div style="font-size:13px;color:var(--text);line-height:1.7">'
              + 'Score <strong>' + reqCount + ' requirement' + (reqCount !== 1 ? 's' : '') + '</strong> against ' + _escHtml(scopeLabel) + '.'
              + '</div>';
      } else if (task.task_type === 'collab_invite') {
        var inviteRole = p.role ? (p.role.charAt(0).toUpperCase() + p.role.slice(1).replace(/_/g, ' ')) : 'Viewer';
        html += '<div style="font-size:13px;color:var(--text);line-height:1.7">'
              + 'You\'ve been invited to collaborate as <strong>' + _escHtml(inviteRole) + '</strong>.'
              + '</div>';
      }

      // Show decline reason if task was declined
      if (task.status === 'declined' && p.declineReason) {
        html += '<div>'
              + '<div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--danger,#ef4444);margin-bottom:5px">Decline reason</div>'
              + '<div style="font-size:13px;color:var(--text);line-height:1.55;font-style:italic">&ldquo;' + _escHtml(p.declineReason) + '&rdquo;</div>'
              + '</div>';
      }

      html += '</div>';
    }

    detail.innerHTML = html;
    document.getElementById('taskDetailTitle').textContent = title;

    // Show "Load Project and View Details" button only for assignees on active tasks
    var loadProjBtn = document.getElementById('taskDetailLoadProjBtn');
    if (loadProjBtn) {
      var canLoad = role === 'assignee'
        && (task.task_type === 'scoring' || task.task_type === 'req_review')
        && (task.status === 'pending' || task.status === 'accepted');
      loadProjBtn.style.display = canLoad ? '' : 'none';
      if (canLoad) {
        loadProjBtn.onclick = function() { loadProjectFromTask(task); };
      }
    }

    document.getElementById('taskDetailModal').classList.add('open');
  }

  function closeTaskDetailModal() {
    document.getElementById('taskDetailModal').classList.remove('open');
  }

  // Grant scoped_editor access via SECURITY DEFINER, then load the project
  // and navigate to the relevant page (requirements or scoring).
  async function loadProjectFromTask(task) {
    var loadProjBtn = document.getElementById('taskDetailLoadProjBtn');
    if (loadProjBtn) { loadProjBtn.textContent = 'Loading…'; loadProjBtn.disabled = true; }

    var { data: result, error: rpcErr } = await _supabase.rpc('grant_task_project_access', { p_task_id: task.id });
    if (loadProjBtn) { loadProjBtn.textContent = 'Load Project & View Details'; loadProjBtn.disabled = false; }

    if (rpcErr) { alert('Could not access project: ' + rpcErr.message); return; }
    if (result && result.error) { alert('Could not access project: ' + result.error); return; }

    closeTaskDetailModal();
    closeTasksPanel();

    // Reload the full project list — the new membership now makes this project visible
    await loadProjects(appState.currentUser.id);

    var projectId = task.project_id;
    var proj = savedProjects.find(function(p) { return p.id === projectId; });
    if (!proj) {
      alert('Access granted — find the project in Project Manager.');
      return;
    }

    loadProject(projectId);

    // Navigate to the relevant page
    if (task.task_type === 'req_review') {
      switchPage('requirements', document.querySelector('[data-page="requirements"]'));
    } else if (task.task_type === 'scoring') {
      switchPage('scor', document.querySelector('[data-page="scor"]'));
    }
  }

  // ── TASK HISTORY MODAL ───────────────────────────────────────

  async function openTaskHistoryModal() {
    if (!appState.currentUser) return;
    var uid  = appState.currentUser.id;
    var body = document.getElementById('taskHistoryBody');
    if (body) body.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:24px 0">Loading…</div>';
    document.getElementById('taskHistoryModal').classList.add('open');

    var results = await Promise.all([
      _supabase.from('tasks').select('*').eq('assignee_id', uid).order('created_at', { ascending: false }),
      _supabase.from('tasks').select('*').eq('assigner_id', uid).order('created_at', { ascending: false })
    ]);
    var toMe = results[0].data || [];
    var byMe = results[1].data || [];

    // Build flat timeline entries from both task sets
    var entries = [];
    var seen    = {};

    function _statusVerb(status) {
      return { accepted: 'accepted', declined: 'declined', completed: 'approved / completed', expired: 'expired' }[status] || status;
    }

    byMe.forEach(function(task) {
      if (seen[task.id]) return;
      seen[task.id] = true;
      var proj      = _resolveProjectName(task);
      var recipient = task.assignee_email || 'someone';
      entries.push({
        date: task.created_at,
        icon: 'assign',
        html: 'You assigned <strong>' + _escHtml(task.title || _taskTypeLabel(task.task_type)) + '</strong>'
            + ' to ' + _escHtml(recipient)
            + ' <span class="task-hist-proj">' + _escHtml(proj) + '</span>'
      });
      if (task.status !== 'pending') {
        entries.push({
          date: task.updated_at,
          icon: task.status === 'declined' ? 'decline' : 'check',
          html: _escHtml(recipient) + ' <strong>' + _statusVerb(task.status) + '</strong> your task'
              + ' <span class="task-hist-proj">' + _escHtml(proj) + '</span>'
        });
      }
    });

    toMe.forEach(function(task) {
      if (seen[task.id]) return; // already counted (e.g. self-assigned)
      seen[task.id] = true;
      var proj = _resolveProjectName(task);
      entries.push({
        date: task.created_at,
        icon: 'inbox',
        html: 'You received: <strong>' + _escHtml(task.title || _taskTypeLabel(task.task_type)) + '</strong>'
            + ' <span class="task-hist-proj">' + _escHtml(proj) + '</span>'
      });
      if (task.status !== 'pending') {
        entries.push({
          date: task.updated_at,
          icon: task.status === 'declined' ? 'decline' : 'check',
          html: 'You <strong>' + _statusVerb(task.status) + '</strong>: '
              + _escHtml(task.title || _taskTypeLabel(task.task_type))
        });
      }
    });

    // Sort newest first
    entries.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });

    if (!body) return;
    if (entries.length === 0) {
      body.innerHTML = '<div class="task-hist-empty">No task activity yet.</div>';
      return;
    }

    var svgAssign  = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    var svgCheck   = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>';
    var svgDecline = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
    var svgInbox   = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/></svg>';

    var html = '<div class="task-hist-timeline">';
    entries.forEach(function(e) {
      var iconSvg   = e.icon === 'decline' ? svgDecline : e.icon === 'assign' ? svgAssign : e.icon === 'inbox' ? svgInbox : svgCheck;
      var iconClass = 'task-hist-icon task-hist-icon-' + e.icon;
      html += '<div class="task-hist-entry">'
            + '<div class="' + iconClass + '">' + iconSvg + '</div>'
            + '<div class="task-hist-content">'
            + '<div class="task-hist-text">' + e.html + '</div>'
            + '<div class="task-hist-date">' + new Date(e.date).toLocaleString() + '</div>'
            + '</div>'
            + '</div>';
    });
    html += '</div>';
    body.innerHTML = html;
  }

  function closeTaskHistoryModal() {
    document.getElementById('taskHistoryModal').classList.remove('open');
  }

  // ── DECLINE MODAL ───────────────────────────────────────────
  var _declineTask = null;

  function openDeclineModal(taskId) {
    // Find the full task object from the currently rendered tasks so we can merge payload
    _declineTask = null;
    var allCards = document.querySelectorAll('.task-card');
    // We store taskId on the card dataset — find matching task from the rendered panel
    // Instead, we look it up after fetching in submitDecline. Store ID for now.
    _declineTask = { id: taskId, _payloadUnknown: true };
    var commentEl = document.getElementById('declineComment');
    if (commentEl) commentEl.value = '';
    var errEl = document.getElementById('declineError');
    if (errEl) errEl.style.display = 'none';
    document.getElementById('declineModal').classList.add('open');
    setTimeout(function() { if (commentEl) commentEl.focus(); }, 50);
  }

  function closeDeclineModal() {
    document.getElementById('declineModal').classList.remove('open');
    _declineTask = null;
  }

  async function submitDecline() {
    var errEl  = document.getElementById('declineError');
    var btn    = document.getElementById('declineSubmitBtn');
    var reason = (document.getElementById('declineComment')?.value || '').trim();
    if (errEl) errEl.style.display = 'none';

    if (!reason) {
      if (errEl) { errEl.textContent = 'Please provide a reason for declining.'; errEl.style.display = ''; }
      return;
    }
    if (!appState.currentUser || !_declineTask) return;

    if (btn) { btn.textContent = 'Declining…'; btn.disabled = true; }

    // Fetch current payload so we can merge (preserves projectName, requirementText, etc.)
    var currentPayload = {};
    var { data: taskRow } = await _supabase.from('tasks').select('payload').eq('id', _declineTask.id).single();
    if (taskRow && taskRow.payload) currentPayload = taskRow.payload;

    var mergedPayload = Object.assign({}, currentPayload, {
      declineReason: reason,
      declinedAt:    new Date().toISOString()
    });

    var { error } = await _supabase
      .from('tasks')
      .update({ status: 'declined', payload: mergedPayload })
      .eq('id', _declineTask.id);

    if (btn) { btn.textContent = 'Decline'; btn.disabled = false; }

    if (error) {
      if (errEl) { errEl.textContent = 'Error: ' + error.message; errEl.style.display = ''; }
      return;
    }

    closeDeclineModal();
    renderTasksPanel();
  }

  // Manual refresh button in tasks panel
  function refreshTasksPanel() {
    var btn = document.getElementById('tasksRefreshBtn');
    if (btn) { btn.style.opacity = '0.4'; btn.style.pointerEvents = 'none'; }
    renderTasksPanel().then(function() {
      if (btn) { btn.style.opacity = ''; btn.style.pointerEvents = ''; }
    });
  }

  // Update a task's status (accept / decline / complete).
  async function _taskUpdateStatus(taskId, newStatus) {
    var { error } = await _supabase
      .from('tasks')
      .update({ status: newStatus })
      .eq('id', taskId);
    if (error) { console.warn('[tasks] update error', error.message); return; }
    renderTasksPanel();
    // Refresh badge state on concept/req cards — completed/declined tasks
    // should immediately clear their notification dots.
    if (activeProject) {
      loadActiveScoringTasksForProject(activeProject.id);
      if (typeof loadReqReviewTasksForProject === 'function') {
        loadReqReviewTasksForProject(activeProject.id);
      }
    }
  }

  // Revoke (or delete) a task the current user assigned.
  async function _taskRevoke(taskId) {
    if (!confirm('Revoke this task? The assignee will no longer see it.')) return;
    var { error } = await _supabase.from('tasks').delete().eq('id', taskId);
    if (error) { console.warn('[tasks] delete error', error.message); return; }
    renderTasksPanel();
  }

  // Generate a mailto: reminder for a pending task.
  function _taskSendReminder(task) {
    var email   = task.assignee_email || '';
    var subject = encodeURIComponent('Reminder: action needed in Controlled Convergence');
    var body    = encodeURIComponent(
      'Hi,\n\nThis is a reminder that you have a pending task waiting for you in Controlled Convergence.\n\n'
      + 'Log in at https://controlledconvergence.com to view and act on your task.\n\n'
      + 'Task: ' + (task.title || _taskTypeLabel(task.task_type)) + '\n'
    );
    window.open('mailto:' + email + '?subject=' + subject + '&body=' + body);
  }

  // ── Tasks helpers ──

  function _taskTypeLabel(type) {
    var map = { scoring: 'Scoring request', req_review: 'Requirement review', collab_invite: 'Project invitation' };
    return map[type] || type || 'Task';
  }

  // Resolve a human-readable project name for a task.
  // Prefers the payload.projectName field (set since the May 2026 update),
  // then falls back to looking up the project in savedProjects (covers old tasks
  // created before projectName was added), then falls back to a short ID suffix.
  function _resolveProjectName(task) {
    if (task.payload && task.payload.projectName) return task.payload.projectName;
    if (task.project_id) {
      var found = savedProjects.find(function(p) { return p.id === task.project_id; });
      if (found && found.name) return found.name;
    }
    return task.project_id ? _shortId(task.project_id) : '—';
  }

  function _shortId(id) {
    return id ? id.slice(-8) : '—';
  }

  function _relativeDate(iso) {
    var d = new Date(iso);
    var now = new Date();
    var diff = Math.round((now - d) / 60000); // minutes
    if (diff < 1) return 'just now';
    if (diff < 60) return diff + 'm ago';
    diff = Math.round(diff / 60);
    if (diff < 24) return diff + 'h ago';
    diff = Math.round(diff / 24);
    return diff + 'd ago';
  }

  function _escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── MAILTO MODAL (Feature 8) ─────────────────────────────────
  // Shown after creating a task for someone who doesn't have an account yet.

  function _showMailtoModal(opts) {
    // opts: { toEmail, hasAccount, subject, body }
    var baseUrl  = window.location.origin + window.location.pathname;
    var route    = opts.hasAccount ? '#login' : '#signup';
    var appLink  = baseUrl + route;

    // Build the body, appending the app link
    var fullBody = opts.body
      + '\n\nGet started here:\n' + appLink
      + '\n\nOnce you\'re signed in, click the Tasks button in the top navigation to see your assignment.';

    var subject  = encodeURIComponent(opts.subject);
    var bodyEnc  = encodeURIComponent(fullBody);
    var mailto   = 'mailto:' + opts.toEmail + '?subject=' + subject + '&body=' + bodyEnc;

    // Populate modal
    var msgEl  = document.getElementById('mailtoModalMsg');
    var linkEl = document.getElementById('mailtoLink');
    if (msgEl) {
      msgEl.innerHTML = opts.hasAccount
        ? '<strong>' + _escHtml(opts.toEmail) + '</strong> already has an account. Send them a heads-up so they know to check their Tasks panel.'
        : '<strong>' + _escHtml(opts.toEmail) + '</strong> doesn\'t have an account yet. Send them an email so they know to sign up.';
    }
    if (linkEl) {
      linkEl.href = mailto;
    }
    document.getElementById('mailtoModal').classList.add('open');
  }

  function closeMailtoModal() {
    document.getElementById('mailtoModal').classList.remove('open');
  }

  // ── Show/hide the Tasks nav button based on auth state ──
  // Check for pending tasks after auth and auto-open the panel if any exist.
  // Called after login, signup, and session restore on page load.
  async function _checkAndShowTasksOnAuth() {
    if (!appState.currentUser) return;
    var { data } = await _supabase
      .from('tasks')
      .select('id')
      .eq('assignee_id', appState.currentUser.id)
      .eq('status', 'pending')
      .limit(1);
    if (data && data.length > 0) {
      openTasksPanel();
    }
  }

  function _refreshTasksNavBtn() {
    // The Tasks button is always visible. If the user is signed in,
    // fetch their pending count to update the badge.
    if (!appState.currentUser) return;
    _supabase
      .from('tasks')
      .select('id, status')
      .eq('assignee_id', appState.currentUser.id)
      .eq('status', 'pending')
      .then(function(res) {
        _updateTasksBadge(res.data || []);
      });
  }

  // ── PERMISSION LEVELS / ROLE MANAGEMENT ──────────────────────

  // Load the current user's role for the given project and apply UI restrictions.
  async function loadCurrentProjectRole(projectId) {
    currentProjectRole = null;
    myAssignedScoringTasks = [];
    _applyRoleClasses();

    if (!projectId || !appState.currentUser) return;

    // Default to owner — the RPC may not exist on older deploys
    currentProjectRole = 'owner';
    try {
      var { data: role } = await _supabase.rpc('get_my_project_role', { p_project_id: projectId });
      if (role) currentProjectRole = role;
    } catch(e) { /* function not yet deployed — default to owner */ }

    // Always load assigned scoring tasks for this user — needed to power the
    // "My Assigned Tasks" filter for any role (not just scoped_editor).
    var { data: assigned } = await _supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('task_type', 'scoring')
      .eq('assignee_id', appState.currentUser.id)
      .in('status', ['pending', 'accepted']);
    myAssignedScoringTasks = assigned || [];

    _applyRoleClasses();
    // Re-render key pages so role-based controls show/hide correctly
    if (typeof renderRequirements           === 'function') renderRequirements();
    if (typeof renderConceptCards           === 'function') renderConceptCards();
    if (typeof renderScorerFilterDropdown   === 'function') renderScorerFilterDropdown();
    if (typeof renderProjPage               === 'function') renderProjPage();
  }

  // Apply/remove CSS role classes on the body element.
  function _applyRoleClasses() {
    document.body.classList.remove('cc-role-owner', 'cc-role-viewer', 'cc-role-scoped-editor', 'cc-role-editor');
    var role = currentProjectRole;
    if (role === 'viewer')             document.body.classList.add('cc-role-viewer');
    else if (role === 'scoped_editor') document.body.classList.add('cc-role-scoped-editor');
    else if (role === 'editor')        document.body.classList.add('cc-role-editor');
    else if (role === 'owner')         document.body.classList.add('cc-role-owner');

    // Update role badge in nav
    var badge = document.getElementById('navRoleBadge');
    if (!badge) return;
    if (!role || role === 'owner') {
      badge.style.display = 'none';
    } else if (role === 'viewer') {
      badge.textContent = 'Viewer';
      badge.className   = 'nav-role-badge nav-role-badge-viewer';
      badge.style.display = '';
    } else if (role === 'editor') {
      badge.textContent = 'Editor';
      badge.className   = 'nav-role-badge nav-role-badge-editor';
      badge.style.display = '';
    } else if (role === 'scoped_editor') {
      badge.textContent = 'Editor';
      badge.className   = 'nav-role-badge nav-role-badge-editor';
      badge.style.display = '';
    }
  }

  // Clear role state when no project is active.
  function _clearProjectRole() {
    currentProjectRole = null;
    myAssignedScoringTasks = [];
    projectCollaborators = [];
    _applyRoleClasses();
  }

  // ── Role helpers (called throughout the app) ──

  function isViewOnly() {
    return currentProjectRole === 'viewer';
  }

  function isScopedEditor() {
    return currentProjectRole === 'scoped_editor';
  }

  // True for the implicit project owner only. Used to gate admin actions
  // (invite, assign tasks, delete project). Does NOT include 'editor'.
  function isOwner() {
    return !currentProjectRole || currentProjectRole === 'owner';
  }

  // True when the user can freely edit all project content (owner or full editor).
  function canEdit() {
    return isOwner() || currentProjectRole === 'editor';
  }

  // Returns true if the current user is allowed to edit the given Pugh cell.
  function canEditScoringCell(reqId, conceptId) {
    if (canEdit()) return true;
    if (isViewOnly()) return false;
    // Scoped editor: must have an assigned task that covers this req + concept
    return myAssignedScoringTasks.some(function(t) {
      if (!t.payload) return false;
      var reqOk = t.payload.requirementIds && t.payload.requirementIds.includes(String(reqId));
      if (!reqOk) return false;
      var scope = t.payload.conceptScope;
      if (scope === 'all') return true;
      return t.payload.conceptIds && t.payload.conceptIds.includes(String(conceptId));
    });
  }

  // ── PROJECT COLLABORATOR INVITE (Features 6 & 7) ─────────────

  var _inviteTargetProjectId = null; // project ID the invite modal is open for

  function openInviteModal(projectId) {
    // Inviting collaborators is a Pro-only feature (account tier sees the button but is gated here)
    if (!userTierMeets('pro') && userTier !== 'admin') {
      showUpgradePrompt('invite-collab');
      return;
    }
    _inviteTargetProjectId = projectId;
    // Show project name in the modal header
    var proj = savedProjects.find(function(p) { return p.id === projectId; });
    var titleEl = document.getElementById('inviteModalProjectName');
    if (titleEl) titleEl.textContent = proj ? proj.name : 'this project';
    // Reset form
    var emailEl = document.getElementById('inviteEmail');
    var roleEl  = document.getElementById('inviteRole');
    var errEl   = document.getElementById('inviteError');
    var btnEl   = document.getElementById('inviteSubmitBtn');
    if (emailEl) emailEl.value = '';
    if (roleEl)  roleEl.value  = 'viewer';
    if (errEl)   { errEl.textContent = ''; errEl.style.display = 'none'; }
    if (btnEl)   { btnEl.textContent = 'Send Invite'; btnEl.disabled = false; }
    document.getElementById('inviteModal').classList.add('open');
  }

  function closeInviteModal() {
    document.getElementById('inviteModal').classList.remove('open');
    _inviteTargetProjectId = null;
  }

  async function submitInvite() {
    var errEl = document.getElementById('inviteError');
    var btnEl = document.getElementById('inviteSubmitBtn');
    if (errEl) { errEl.textContent = ''; errEl.style.display = 'none'; }

    if (!appState.currentUser) {
      if (errEl) { errEl.textContent = 'Sign in to invite collaborators.'; errEl.style.display = ''; }
      return;
    }
    if (!_inviteTargetProjectId) {
      if (errEl) { errEl.textContent = 'No project selected.'; errEl.style.display = ''; }
      return;
    }

    var email = (document.getElementById('inviteEmail')?.value || '').trim().toLowerCase();
    var role  = document.getElementById('inviteRole')?.value || 'viewer';

    if (!email) {
      if (errEl) { errEl.textContent = 'Enter an email address.'; errEl.style.display = ''; }
      return;
    }
    if (email === appState.currentUser.email) {
      if (errEl) { errEl.textContent = 'You can\'t invite yourself.'; errEl.style.display = ''; }
      return;
    }

    if (btnEl) { btnEl.textContent = 'Sending…'; btnEl.disabled = true; }

    // Hoist these so they're accessible after the try/catch (needed for closeModal + mailto flow)
    var assigneeId = null;
    var proj = savedProjects.find(function(p) { return p.id === _inviteTargetProjectId; });

    try {
      // Resolve email → Supabase user ID (best-effort — null if user has no account)
      try {
        var { data: resolvedId, error: rpcErr } = await _supabase.rpc('get_user_id_by_email', { lookup_email: email });
        if (rpcErr) {
          console.warn('[submitInvite] get_user_id_by_email RPC error:', rpcErr.message, '| code:', rpcErr.code);
        } else {
          assigneeId = resolvedId || null;
        }
      } catch(e) {
        console.warn('[submitInvite] get_user_id_by_email threw:', e);
      }
      var roleLabel = role === 'editor' ? 'Editor' : role === 'scoped_editor' ? 'Scoped Editor' : 'Viewer';
      var title = 'Invitation to collaborate on "' + (proj ? proj.name : 'a project') + '" (' + roleLabel + ')';

      console.log('[submitInvite] inserting task | project_id:', _inviteTargetProjectId,
                  '| assigner_id:', appState.currentUser.id,
                  '| assignee_id:', assigneeId,
                  '| assignee_email:', email);

      var insertResult = await _supabase.from('tasks').insert({
        project_id:     _inviteTargetProjectId,
        assigner_id:    appState.currentUser.id,
        assignee_id:    assigneeId,
        assignee_email: email,
        task_type:      'collab_invite',
        status:         'pending',
        title:          title,
        payload: {
          project_id:       _inviteTargetProjectId,
          project_name:     proj ? proj.name : '',
          role:             role,
          invited_by_email: appState.currentUser.email
        }
      });

      var error = insertResult.error;

      if (error) {
        console.error('[submitInvite] tasks insert failed | message:', error.message,
                      '| code:', error.code,
                      '| hint:', error.hint,
                      '| details:', error.details,
                      '| status:', insertResult.status);
        if (btnEl) { btnEl.textContent = 'Send Invite'; btnEl.disabled = false; }
        if (errEl) {
          var msg = error.message || 'Unknown error';
          // Surface friendlier messages for common RLS/FK failures
          if (error.code === '42501' || msg.toLowerCase().includes('policy')) {
            msg = 'Permission denied — your session may have expired. Try signing out and back in.';
          } else if (error.code === '23503') {
            msg = 'Project not found in database. Save the project first and try again.';
          }
          errEl.textContent = 'Error sending invite: ' + msg;
          errEl.style.display = '';
        }
        return;
      }

      if (btnEl) { btnEl.textContent = 'Send Invite'; btnEl.disabled = false; }

    } catch(e) {
      // Network-level failure (fetch threw instead of returning { error })
      console.error('[submitInvite] unexpected exception:', e);
      if (btnEl) { btnEl.textContent = 'Send Invite'; btnEl.disabled = false; }
      if (errEl) {
        errEl.textContent = 'Network error sending invite. Check your connection and try again.';
        errEl.style.display = '';
      }
      return;
    }

    closeInviteModal();
    // Refresh the Tasks panel badge
    _refreshTasksNavBtn();
    // Show a brief confirmation inline on the project card
    renderProjList();
    // Feature 8: if invitee has no account, prompt the owner to email them
    if (!assigneeId) {
      _showMailtoModal({
        toEmail:    email,
        hasAccount: false,
        subject:    'You\'ve been invited to collaborate on "' + (proj ? proj.name : 'a project') + '"',
        body:       (appState.currentUser ? appState.currentUser.name || appState.currentUser.email : 'Someone') + ' has invited you to collaborate on a project in Controlled Convergence.'
      });
    }
  }

  // Load project_members for the given project so the owner can see collaborators.
  // Does a second pass against the tasks table to fetch the email address that was
  // used when each collaborator was invited — that's the identifier the owner knows them by.
  // Only works when signed in; owners only (RLS enforces this).
  async function loadProjectCollaborators(projectId) {
    projectCollaborators = [];
    if (!appState.currentUser || !projectId) { renderProjList(); return; }

    var { data, error } = await _supabase
      .from('project_members')
      .select('user_id, role, invited_by, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error || !data) { renderProjList(); return; }

    if (data.length > 0) {
      // Pull the invite email for each member from the tasks table.
      // assignee_email is stored at invite time and is the address the owner recognises.
      var userIds = data.map(function(m) { return m.user_id; });
      var { data: inviteTasks } = await _supabase
        .from('tasks')
        .select('assignee_id, assignee_email')
        .eq('project_id', projectId)
        .eq('task_type', 'collab_invite')
        .in('assignee_id', userIds);

      var emailMap = {};
      if (inviteTasks) {
        inviteTasks.forEach(function(t) {
          if (t.assignee_id && t.assignee_email) emailMap[t.assignee_id] = t.assignee_email;
        });
      }

      projectCollaborators = data.map(function(m) {
        return Object.assign({}, m, { display_name: emailMap[m.user_id] || '' });
      });
    } else {
      projectCollaborators = data;
    }

    renderProjList(); // Re-render so collaborator list updates
  }

  // ── TEAM ACCESS MODAL ─────────────────────────────────────────

  var _revokeTargetMemberId = null; // user_id of collaborator pending revoke

  function openTeamAccessModal() {
    if (!activeProject) return;
    const titleEl = document.getElementById('teamAccessProjectName');
    if (titleEl) titleEl.textContent = activeProject.name;
    renderTeamAccessList();
    var modal = document.getElementById('teamAccessModal');
    if (modal) modal.classList.add('open');
  }

  function closeTeamAccessModal() {
    var modal = document.getElementById('teamAccessModal');
    if (modal) modal.classList.remove('open');
  }

  // Renders collaborator rows into the teamAccessList div.
  // Pass editingMemberId to put that specific row into edit mode.
  function renderTeamAccessList(editingMemberId) {
    var listEl = document.getElementById('teamAccessList');
    if (!listEl) return;

    if (!projectCollaborators || projectCollaborators.length === 0) {
      listEl.innerHTML = '<div style="font-size:13px;color:var(--text-muted);padding:12px 0">No collaborators yet. Use the <strong>+ Invite</strong> button to add team members.</div>';
      return;
    }

    listEl.innerHTML = projectCollaborators.map(function(m) {
      var displayName = m.display_name || 'Unknown';
      var safeName = String(displayName).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
      var roleLabel = m.role === 'editor' ? 'Editor' : m.role === 'scoped_editor' ? 'Scoped Editor' : 'Viewer';
      var isEditing = editingMemberId && editingMemberId === m.user_id;

      if (isEditing) {
        return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--accent);border-radius:8px;background:rgba(var(--accent-rgb,26,86,219),0.04)">'
          + '<div style="flex:1;min-width:0;font-size:13px;font-weight:600;color:var(--text)">' + safeName + '</div>'
          + '<select class="add-custom-input" style="font-size:12px;padding:4px 8px;width:auto;min-width:130px" onchange="updateCollabRole(\'' + m.user_id + '\', this.value)">'
          +   '<option value="viewer"'        + (m.role === 'viewer'        ? ' selected' : '') + '>Viewer</option>'
          +   '<option value="editor"'        + (m.role === 'editor'        ? ' selected' : '') + '>Editor</option>'
          +   '<option value="scoped_editor"' + (m.role === 'scoped_editor' ? ' selected' : '') + '>Scoped Editor</option>'
          + '</select>'
          + '<button class="btn btn-ghost" style="font-size:11px;padding:4px 8px;white-space:nowrap" onclick="renderTeamAccessList()">Done</button>'
          + '<button class="btn btn-ghost" style="font-size:11px;padding:4px 8px;color:var(--danger,#e53e3e);white-space:nowrap" onclick="openRevokeConfirmModal(\'' + m.user_id + '\')">Revoke</button>'
          + '</div>';
      }

      return '<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:8px">'
        + '<div style="flex:1;min-width:0;font-size:13px;font-weight:600;color:var(--text)">' + safeName + '</div>'
        + '<span style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;color:var(--text-muted);padding:3px 9px;background:var(--bg-alt,rgba(0,0,0,0.06));border-radius:4px;white-space:nowrap">' + roleLabel + '</span>'
        + '<button class="btn btn-ghost" style="font-size:11px;padding:4px 8px" onclick="renderTeamAccessList(\'' + m.user_id + '\')">Edit</button>'
        + '</div>';
    }).join('');
  }

  // Update a collaborator's role in Supabase and reflect it locally.
  async function updateCollabRole(memberId, newRole) {
    if (!activeProject || !appState.currentUser) return;
    var { error } = await _supabase
      .from('project_members')
      .update({ role: newRole })
      .eq('user_id', memberId)
      .eq('project_id', activeProject.id);

    if (error) {
      alert('Could not update role: ' + error.message);
      return;
    }
    // Reflect locally
    var m = projectCollaborators.find(function(c) { return c.user_id === memberId; });
    if (m) m.role = newRole;
    renderTeamAccessList(memberId); // stay in edit mode so user can see the change
    renderProjList();
  }

  // Open the revoke confirmation modal for a given collaborator.
  function openRevokeConfirmModal(memberId) {
    var m = projectCollaborators.find(function(c) { return c.user_id === memberId; });
    var displayName = (m && m.display_name) ? m.display_name : 'this collaborator';
    _revokeTargetMemberId = memberId;
    var nameEl = document.getElementById('revokeCollabName');
    if (nameEl) nameEl.textContent = displayName;
    var modal = document.getElementById('revokeCollabModal');
    if (modal) modal.classList.add('open');
  }

  function closeRevokeConfirmModal() {
    _revokeTargetMemberId = null;
    var modal = document.getElementById('revokeCollabModal');
    if (modal) modal.classList.remove('open');
  }

  // Execute the revoke after confirmation.
  async function confirmRevokeCollaborator() {
    if (!_revokeTargetMemberId || !activeProject) return;
    var memberId = _revokeTargetMemberId;
    closeRevokeConfirmModal();

    var { error } = await _supabase
      .from('project_members')
      .delete()
      .eq('user_id', memberId)
      .eq('project_id', activeProject.id);

    if (error) {
      alert('Could not revoke access: ' + error.message);
      return;
    }
    // Remove from local state and refresh both views
    projectCollaborators = projectCollaborators.filter(function(c) { return c.user_id !== memberId; });
    renderTeamAccessList();
    renderProjList();
  }

  // Accept a collab_invite task by calling the SECURITY DEFINER function.
  async function acceptCollabInvite(taskId) {
    // Check collaboration limit before calling the server
    const collabCount = savedProjects.filter(p => p.is_owner === false).length;
    const check = canAcceptCollabInvite(appState.currentUser, collabCount);
    if (!check.allowed) {
      showUpgradePrompt('account-collab-limit');
      return;
    }

    var { data, error } = await _supabase.rpc('accept_project_invite', { p_task_id: taskId });
    if (error || (data && data.error)) {
      const errMsg = data && data.error === 'collab_limit_reached'
        ? 'You\'re at your collaborating limit. Remove a project from your collaborating list or upgrade to Pro.'
        : (error ? error.message : data.error);
      alert('Could not accept invite: ' + errMsg);
      return;
    }
    // Reload the user's project list so the shared project appears
    if (appState.currentUser) {
      await loadProjects(appState.currentUser.id);
      renderProjList();
    }
    // Refresh the Tasks panel
    renderTasksPanel();
  }

  // ── REQ REVIEW TASK ASSIGNER ─────────────────────────────────

  var _reviewTaskTargetReqId = null; // req ID currently being assigned
  var _approvalTaskId = null;        // task ID currently being approved

  // Load all req_review tasks for the current project.
  // Includes pending, accepted, and completed so we can show both badges
  // and permanent approval records.
  async function loadReqReviewTasksForProject(projectId) {
    if (!projectId || !appState.currentUser) { reqReviewTasks = []; return; }
    var uid = appState.currentUser.id;
    // Fetch tasks where user is assigner OR assignee
    var { data: asAssigner } = await _supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('task_type', 'req_review')
      .in('status', ['pending', 'accepted', 'completed'])
      .eq('assigner_id', uid);
    var { data: asAssignee } = await _supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('task_type', 'req_review')
      .in('status', ['pending', 'accepted', 'completed'])
      .eq('assignee_id', uid);
    // Merge, deduplicate by id
    var all = [...(asAssigner || []), ...(asAssignee || [])];
    var seen = new Set();
    reqReviewTasks = all.filter(function(t) {
      if (seen.has(t.id)) return false;
      seen.add(t.id); return true;
    });
    if (typeof renderRequirements === 'function') renderRequirements();
  }

  // Open the review task creation modal for a given requirement.
  function openReqReviewModal(reqId) {
    _reviewTaskTargetReqId = reqId;

    // Find requirement text to display
    var req = requirements.find(function(r) { return String(r.id) === String(reqId); });
    var reqText = req ? (req.text || String(req.id)) : String(reqId);
    var el = document.getElementById('reqReviewReqText');
    if (el) el.textContent = reqText;

    // Populate assignee dropdown
    var allStakeholders = [
      ...(typeof STAKEHOLDERS !== 'undefined' ? STAKEHOLDERS : []),
      ...customStakeholders
    ].filter(function(s) { return selectedStakeholders.has(s.id) && s.contactEmail && s.contactEmail.trim(); });

    var assigneeEl = document.getElementById('reqReviewAssignee');
    if (assigneeEl) {
      assigneeEl.innerHTML = '<option value="">— select a stakeholder —</option>'
        + allStakeholders.map(function(s) {
            var label = s.contactName ? (s.contactName + (s.contactTitle ? ' — ' + s.contactTitle : '')) : s.name;
            return '<option value="' + _escHtml(s.contactEmail) + '" data-name="' + _escHtml(label) + '">'
                 + _escHtml(label) + ' &lt;' + _escHtml(s.contactEmail) + '&gt;</option>';
          }).join('');
    }
    var noteEl = document.getElementById('reqReviewAssigneeNote');
    if (noteEl) {
      if (allStakeholders.length === 0) {
        noteEl.textContent = 'No stakeholders with email addresses found. Add contact emails on the Stakeholders page.';
        noteEl.style.display = '';
      } else { noteEl.style.display = 'none'; }
    }

    // Clear fields
    var instrEl = document.getElementById('reqReviewInstructions');
    if (instrEl) instrEl.value = '';
    var errEl = document.getElementById('reqReviewError');
    if (errEl) errEl.style.display = 'none';

    document.getElementById('reqReviewTaskModal').classList.add('open');
  }

  function closeReqReviewModal() {
    document.getElementById('reqReviewTaskModal').classList.remove('open');
    _reviewTaskTargetReqId = null;
  }

  // Create the req_review task in Supabase.
  async function submitReqReviewTask() {
    var errEl = document.getElementById('reqReviewError');
    var btn   = document.getElementById('reqReviewSubmitBtn');
    if (errEl) errEl.style.display = 'none';

    if (!appState.currentUser) {
      if (errEl) { errEl.textContent = 'Sign in to assign tasks.'; errEl.style.display = ''; }
      return;
    }
    var assigneeEmail = document.getElementById('reqReviewAssignee')?.value || '';
    if (!assigneeEmail) {
      if (errEl) { errEl.textContent = 'Please select an assignee.'; errEl.style.display = ''; }
      return;
    }

    var req = requirements.find(function(r) { return String(r.id) === String(_reviewTaskTargetReqId); });
    var reqText = req ? (req.text || String(req.id)) : String(_reviewTaskTargetReqId);
    var instructions = (document.getElementById('reqReviewInstructions')?.value || '').trim();
    var assigneeName = document.getElementById('reqReviewAssignee')?.selectedOptions[0]?.dataset.name || assigneeEmail;
    var title = 'Review: ' + (reqText.length > 60 ? reqText.slice(0, 60) + '…' : reqText) + ' — ' + assigneeName;

    if (btn) { btn.textContent = 'Assigning…'; btn.disabled = true; }

    // Resolve email to UUID
    var assigneeId = null;
    try {
      var { data: resolvedId } = await _supabase.rpc('get_user_id_by_email', { lookup_email: assigneeEmail });
      assigneeId = resolvedId || null;
    } catch(e) {}

    var expiresAtVal = document.getElementById('reqReviewExpiry')?.value || '';
    var expiresAt = expiresAtVal ? new Date(expiresAtVal).toISOString() : null;

    var payload = {
      projectName:     activeProject ? activeProject.name : '',
      requirementId:   String(_reviewTaskTargetReqId),
      requirementText: reqText,
      instructions:    instructions
    };

    try {
      // Ensure the project exists in Supabase before inserting the task (FK requirement)
      var { error: projSaveErr } = await saveProject(activeProject);
      if (projSaveErr) {
        if (errEl) { errEl.textContent = 'Could not save project: ' + projSaveErr; errEl.style.display = ''; }
        return;
      }

      var taskRow = {
        project_id:     activeProject.id,
        assigner_id:    appState.currentUser.id,
        assignee_id:    assigneeId,
        assignee_email: assigneeEmail,
        task_type:      'req_review',
        status:         'pending',
        title:          title,
        payload:        payload
      };
      if (expiresAt) taskRow.expires_at = expiresAt;

      var { error } = await _supabase.from('tasks').insert(taskRow);

      if (error) {
        if (errEl) { errEl.textContent = 'Error: ' + error.message; errEl.style.display = ''; }
        return;
      }

      closeReqReviewModal();
      await loadReqReviewTasksForProject(activeProject.id);
      if (!assigneeId) {
        _showMailtoModal({
          toEmail:    assigneeEmail,
          hasAccount: false,
          subject:    'Action needed: requirement review for "' + (activeProject ? activeProject.name : 'a project') + '"',
          body:       (appState.currentUser ? appState.currentUser.name || appState.currentUser.email : 'Someone') + ' has asked you to review a requirement in Controlled Convergence.'
        });
      }
    } catch(e) {
      console.error('[submitReqReviewTask] unexpected error:', e);
      if (errEl) { errEl.textContent = 'Unexpected error: ' + e.message; errEl.style.display = ''; }
    } finally {
      if (btn) { btn.textContent = 'Assign Task'; btn.disabled = false; }
    }
  }

  // ── Approval flow (assignee completes a req_review task) ──

  function openApprovalModal(taskId) {
    _approvalTaskId = taskId;
    var task = reqReviewTasks.find(function(t) { return t.id === taskId; });
    var reqText = task?.payload?.requirementText || task?.title || 'Requirement';
    var el = document.getElementById('approvalReqText');
    if (el) el.textContent = reqText;
    var commentEl = document.getElementById('approvalComment');
    if (commentEl) commentEl.value = '';
    var errEl = document.getElementById('approvalError');
    if (errEl) errEl.style.display = 'none';
    document.getElementById('approvalModal').classList.add('open');
  }

  function closeApprovalModal() {
    document.getElementById('approvalModal').classList.remove('open');
    _approvalTaskId = null;
  }

  async function submitApproval() {
    var errEl = document.getElementById('approvalError');
    var btn   = document.getElementById('approvalSubmitBtn');
    if (errEl) errEl.style.display = 'none';
    if (!appState.currentUser) {
      if (errEl) { errEl.textContent = 'Sign in to approve.'; errEl.style.display = ''; }
      return;
    }

    var comment = (document.getElementById('approvalComment')?.value || '').trim();
    var approval = {
      approverName: appState.currentUser.name || appState.currentUser.email,
      approvedAt:   new Date().toISOString(),
      comment:      comment,
      commentHidden: false
    };

    // Fetch current task to merge payload
    var task = reqReviewTasks.find(function(t) { return t.id === _approvalTaskId; });
    var updatedPayload = Object.assign({}, task?.payload || {}, { approval: approval });

    if (btn) { btn.textContent = 'Approving…'; btn.disabled = true; }

    var { error } = await _supabase
      .from('tasks')
      .update({ status: 'completed', payload: updatedPayload })
      .eq('id', _approvalTaskId);

    if (btn) { btn.textContent = 'Approve'; btn.disabled = false; }
    if (error) {
      if (errEl) { errEl.textContent = 'Error: ' + error.message; errEl.style.display = ''; }
      return;
    }

    closeApprovalModal();
    if (activeProject) await loadReqReviewTasksForProject(activeProject.id);
    // Also refresh Tasks panel if open
    if (_tasksPanelOpen) renderTasksPanel();
  }

  // Toggle visibility of the approval comment (project owner action).
  async function toggleApprovalCommentVisibility(taskId, hide) {
    var task = reqReviewTasks.find(function(t) { return t.id === taskId; });
    if (!task || !task.payload?.approval) return;
    var updatedPayload = Object.assign({}, task.payload, {
      approval: Object.assign({}, task.payload.approval, { commentHidden: hide })
    });
    await _supabase.from('tasks').update({ payload: updatedPayload }).eq('id', taskId);
    if (activeProject) await loadReqReviewTasksForProject(activeProject.id);
  }

  // ── Req review badge/approval helpers (used by ui.js) ──

  // Returns the active (pending/accepted) review task for a requirement, if any.
  function getActiveReqReviewTask(reqId) {
    return reqReviewTasks.find(function(t) {
      return String(t.payload?.requirementId) === String(reqId)
          && (t.status === 'pending' || t.status === 'accepted');
    }) || null;
  }

  // Returns the completed (approved) review task for a requirement, if any.
  function getCompletedReqReviewTask(reqId) {
    return reqReviewTasks.find(function(t) {
      return String(t.payload?.requirementId) === String(reqId)
          && t.status === 'completed';
    }) || null;
  }

  // ── SCORING TASK ASSIGNER ─────────────────────────────────────

  // Load all non-expired scoring tasks for the active project.
  // Stores results in activeScoringTasks (global from state.js).
  // Called when a project loads and after task creation/deletion.
  async function loadActiveScoringTasksForProject(projectId) {
    if (!projectId || !appState.currentUser) {
      activeScoringTasks = [];
      return;
    }
    // Fetch tasks this user assigned for this project that are still active
    var { data } = await _supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .eq('task_type', 'scoring')
      .in('status', ['pending', 'accepted'])
      .eq('assigner_id', appState.currentUser.id);
    activeScoringTasks = data || [];
    // Re-render cards so badges appear/disappear correctly
    if (typeof renderConceptCards === 'function') renderConceptCards();
    if (typeof renderRequirements === 'function') renderRequirements();
  }

  // Open the scoring task assignment modal and populate it.
  function openScoringTaskModal() {
    if (!activeProject) { alert('Load a project first.'); return; }

    // Populate assignee dropdown from stakeholders with contactEmail
    var allStakeholders = [
      ...(typeof STAKEHOLDERS !== 'undefined' ? STAKEHOLDERS : []),
      ...customStakeholders
    ].filter(function(s) { return selectedStakeholders.has(s.id) && s.contactEmail && s.contactEmail.trim(); });

    var assigneeEl = document.getElementById('scoringTaskAssignee');
    if (assigneeEl) {
      assigneeEl.innerHTML = '<option value="">— select a stakeholder —</option>'
        + allStakeholders.map(function(s) {
            var label = s.contactName ? (s.contactName + (s.contactTitle ? ' — ' + s.contactTitle : '')) : s.name;
            return '<option value="' + _escHtml(s.contactEmail) + '" data-name="' + _escHtml(label) + '">'
                 + _escHtml(label) + ' &lt;' + _escHtml(s.contactEmail) + '&gt;</option>';
          }).join('');
    }
    var noteEl = document.getElementById('scoringTaskAssigneeNote');
    if (noteEl) {
      if (allStakeholders.length === 0) {
        noteEl.textContent = 'No stakeholders with email addresses found. Add contact emails on the Stakeholders page.';
        noteEl.style.display = '';
      } else {
        noteEl.style.display = 'none';
      }
    }

    // Populate requirements list
    var reqListEl = document.getElementById('scoringTaskReqList');
    if (reqListEl) {
      if (requirements.length === 0) {
        reqListEl.innerHTML = '<div style="font-size:12px;color:var(--text-muted);font-style:italic">No requirements loaded.</div>';
      } else {
        reqListEl.innerHTML = requirements.map(function(r) {
          var text = r.text || r.id;
          var truncated = text.length > 80 ? text.slice(0, 80) + '…' : text;
          return '<label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;font-size:12px;color:var(--text);line-height:1.45">'
               + '<input type="checkbox" class="scoring-task-req-check" value="' + _escHtml(String(r.id)) + '" checked style="margin-top:2px;flex-shrink:0;accent-color:var(--accent)">'
               + '<span>' + _escHtml(truncated) + '</span></label>';
        }).join('');
      }
    }

    // Populate concept checklist (skip datum at index 0)
    var nonDatumConcepts = pughConcepts.slice(1);
    var checksEl = document.getElementById('scoringTaskConceptChecks');
    if (checksEl) {
      checksEl.innerHTML = nonDatumConcepts.length === 0
        ? '<div style="font-size:12px;color:var(--text-muted);font-style:italic">No concepts added yet.</div>'
        : nonDatumConcepts.map(function(c) {
            return '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:var(--text)">'
                 + '<input type="checkbox" class="scoring-task-concept-check" value="' + _escHtml(String(c.id)) + '" checked style="accent-color:var(--accent)">'
                 + '<span>' + _escHtml(c.name) + '</span></label>';
          }).join('');
    }

    // Clear error
    var errEl = document.getElementById('scoringTaskError');
    if (errEl) errEl.style.display = 'none';

    document.getElementById('scoringTaskModal').classList.add('open');
  }

  function closeScoringTaskModal() {
    document.getElementById('scoringTaskModal').classList.remove('open');
  }

  // Select or deselect all requirement checkboxes.
  function scoringTaskSelectAllReqs(checked) {
    document.querySelectorAll('.scoring-task-req-check').forEach(function(cb) { cb.checked = checked; });
  }

  // Select or deselect all concept checkboxes.
  function scoringTaskSelectAllConcepts(checked) {
    document.querySelectorAll('.scoring-task-concept-check').forEach(function(cb) { cb.checked = checked; });
  }

  // Build and save the scoring task to Supabase.
  async function submitScoringTask() {
    var errEl  = document.getElementById('scoringTaskError');
    var btn    = document.getElementById('scoringTaskSubmitBtn');
    if (errEl) errEl.style.display = 'none';

    if (!appState.currentUser) {
      if (errEl) { errEl.textContent = 'Sign in to assign tasks.'; errEl.style.display = ''; }
      return;
    }

    var assigneeEmail = document.getElementById('scoringTaskAssignee')?.value || '';
    if (!assigneeEmail) {
      if (errEl) { errEl.textContent = 'Please select an assignee.'; errEl.style.display = ''; }
      return;
    }

    // Gather selected requirements
    var reqIds = Array.from(document.querySelectorAll('.scoring-task-req-check:checked')).map(function(cb) { return cb.value; });
    if (reqIds.length === 0) {
      if (errEl) { errEl.textContent = 'Select at least one requirement.'; errEl.style.display = ''; }
      return;
    }

    // Gather selected concepts
    var conceptIds = Array.from(document.querySelectorAll('.scoring-task-concept-check:checked')).map(function(cb) { return cb.value; });
    if (conceptIds.length === 0) {
      if (errEl) { errEl.textContent = 'Select at least one concept.'; errEl.style.display = ''; }
      return;
    }
    var allConceptIds = pughConcepts.slice(1).map(function(c) { return String(c.id); });
    var scope = (conceptIds.length === allConceptIds.length) ? 'all' : 'selected';

    var assigneeName = document.getElementById('scoringTaskAssignee')?.selectedOptions[0]?.dataset.name || assigneeEmail;
    var title = 'Score ' + reqIds.length + ' requirement' + (reqIds.length > 1 ? 's' : '')
              + ' (' + (scope === 'all' ? 'all concepts' : conceptIds.length + ' concept' + (conceptIds.length > 1 ? 's' : '')) + ')'
              + ' — ' + assigneeName;

    // Optional expiry date
    var expiresAtVal = document.getElementById('scoringTaskExpiry')?.value || '';
    var expiresAt = expiresAtVal ? new Date(expiresAtVal).toISOString() : null;

    if (btn) { btn.textContent = 'Assigning…'; btn.disabled = true; }

    try {
      // Resolve email to Supabase user ID (if they have an account)
      var assigneeId = null;
      try {
        var { data: resolvedId } = await _supabase.rpc('get_user_id_by_email', { lookup_email: assigneeEmail });
        assigneeId = resolvedId || null;
      } catch(e) { /* RPC may not exist yet — safe to ignore */ }

      var payload = { projectName: activeProject ? activeProject.name : '', requirementIds: reqIds, conceptScope: scope, conceptIds: conceptIds };

      // Ensure project exists in Supabase (FK requirement)
      var { error: projSaveErr } = await saveProject(activeProject);
      if (projSaveErr) {
        if (errEl) { errEl.textContent = 'Could not save project: ' + projSaveErr; errEl.style.display = ''; }
        return;
      }

      var taskRow = {
        project_id:     activeProject.id,
        assigner_id:    appState.currentUser.id,
        assignee_id:    assigneeId,
        assignee_email: assigneeEmail,
        task_type:      'scoring',
        status:         'pending',
        title:          title,
        payload:        payload
      };
      if (expiresAt) taskRow.expires_at = expiresAt;

      var { error } = await _supabase.from('tasks').insert(taskRow);

      if (error) {
        if (errEl) { errEl.textContent = 'Error creating task: ' + error.message; errEl.style.display = ''; }
        return;
      }

      closeScoringTaskModal();
      await loadActiveScoringTasksForProject(activeProject.id);
      _refreshTasksNavBtn();
      if (!assigneeId) {
        _showMailtoModal({
          toEmail:    assigneeEmail,
          hasAccount: false,
          subject:    'Action needed: concept scoring task for "' + (activeProject ? activeProject.name : 'a project') + '"',
          body:       (appState.currentUser ? appState.currentUser.name || appState.currentUser.email : 'Someone') + ' has assigned you a concept scoring task in Controlled Convergence.'
        });
      }
    } catch(e) {
      console.error('[submitScoringTask] unexpected error:', e);
      if (errEl) { errEl.textContent = 'Unexpected error: ' + e.message; errEl.style.display = ''; }
    } finally {
      if (btn) { btn.textContent = 'Assign Task'; btn.disabled = false; }
    }
  }

  // ── Badge helpers (used by ui.js renderRequirements / renderConceptCards) ──

  // Returns true if any active scoring task covers the given requirement ID.
  function reqHasActiveScoringTask(reqId) {
    return activeScoringTasks.some(function(t) {
      return t.payload && t.payload.requirementIds && t.payload.requirementIds.includes(String(reqId));
    });
  }

  // Returns true if any active scoring task covers the given concept ID.
  function conceptHasActiveScoringTask(conceptId) {
    return activeScoringTasks.some(function(t) {
      if (!t.payload) return false;
      var scope = t.payload.conceptScope;
      if (scope === 'all') return true;
      return t.payload.conceptIds && t.payload.conceptIds.includes(String(conceptId));
    });
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
        conceptNotes: conceptNotes,
        conceptCustomFields: conceptCustomFields,
        cfIdCounter: _cfIdCounter,
      },
      convergence: {
        selectedConceptId: convSelectedConceptId,
        rationale:         convRationale,
        lessons:           Object.assign({}, convLessons),
        risks:             convRisks,
        nextSteps:         convNextSteps.slice(),
        closedAt:          convClosedAt
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

  function exportToXlsx() {
    if (typeof XLSX === 'undefined') {
      alert('Excel export library not loaded. Please refresh and try again.');
      return;
    }

    const wb       = XLSX.utils.book_new();
    const projName = activeProject?.name || 'Untitled Project';
    const setCols  = (ws, widths) => { ws['!cols'] = widths.map(w => ({ wch: w })); };

    // ── Goal text ──────────────────────────────────────────────
    let goalText = '';
    if (goalMode === 'basic') {
      goalText = document.getElementById('input-goal-basic')?.value || '';
    } else {
      const to    = document.getElementById('input-to')?.value    || '';
      const by    = document.getElementById('input-by')?.value    || '';
      const using = document.getElementById('input-using')?.value || '';
      const while_ = document.getElementById('input-while')?.value || '';
      goalText = [to && `TO: ${to}`, by && `BY: ${by}`, using && `USING: ${using}`, while_ && `WHILE: ${while_}`].filter(Boolean).join('\n');
    }

    const selectedConcept = pughConcepts.find(c => String(c.id) === String(convSelectedConceptId));
    const nonDatum        = pughConcepts.slice(1);

    // ── 1. SUMMARY ────────────────────────────────────────────
    const wsSummary = XLSX.utils.aoa_to_sheet([
      ['Controlled Convergence — Project Summary'],
      [],
      ['Project',                    projName],
      ['Goal Statement',             goalText],
      ['Goal Mode',                  goalMode === 'basic' ? 'Basic' : 'Structured (TO · BY · WHILE)'],
      [],
      ['Lifecycle Properties',       selectedIlities.size],
      ['Stakeholders',               selectedStakeholders.size],
      ['Requirements',               requirements.length],
      ['Concepts Evaluated',         Math.max(0, pughConcepts.length - 1)],
      [],
      ['Selected Concept',           selectedConcept ? selectedConcept.name : '—'],
      ['Convergence Date',           convClosedAt ? new Date(convClosedAt).toLocaleDateString() : '—'],
      ['Export Date',                new Date().toLocaleDateString()],
    ]);
    setCols(wsSummary, [26, 80]);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // ── 2. LIFECYCLE PROPERTIES ───────────────────────────────
    const ilityRows = [['Lifecycle Property', 'Type']];
    [...selectedIlities].forEach(id => {
      const isCustom = customIlities.some(i => (i.id || i.label) === id);
      ilityRows.push([id, isCustom ? 'Custom' : 'Standard']);
    });
    const wsIlities = XLSX.utils.aoa_to_sheet(ilityRows);
    setCols(wsIlities, [35, 12]);
    XLSX.utils.book_append_sheet(wb, wsIlities, 'Lifecycle Properties');

    // ── 3. STAKEHOLDERS ───────────────────────────────────────
    const stakRows = [['Stakeholder', 'Type']];
    [...selectedStakeholders].forEach(id => {
      const isCustom = customStakeholders.some(s => (s.id || s.label) === id);
      stakRows.push([id, isCustom ? 'Custom' : 'Standard']);
    });
    const wsStaks = XLSX.utils.aoa_to_sheet(stakRows);
    setCols(wsStaks, [35, 12]);
    XLSX.utils.book_append_sheet(wb, wsStaks, 'Stakeholders');

    // ── 4. REQUIREMENTS ───────────────────────────────────────
    const weights = window._pairWeights || {};
    const reqRows = [['ID', 'Type', 'Requirement', 'Lifecycle Property', 'Stakeholder(s)', 'Scorer', 'LC Weight']];
    requirements.forEach(r => {
      const w = weights[r.primary];
      reqRows.push([
        r.id,
        r.type || '—',
        r.text || '',
        r.primary || '—',
        (r.stakeholders || []).join(', '),
        r.scorer || r.stakeholders?.[0] || '—',
        typeof w === 'number' ? +w.toFixed(3) : 'Equal',
      ]);
    });
    const wsReqs = XLSX.utils.aoa_to_sheet(reqRows);
    setCols(wsReqs, [6, 8, 60, 22, 25, 18, 10]);
    XLSX.utils.book_append_sheet(wb, wsReqs, 'Requirements');

    // ── 5. PAIRWISE WEIGHTS ───────────────────────────────────
    const totalW    = Object.values(weights).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0) || 1;
    const pairRows  = [['Lifecycle Property', 'Weight', 'Relative Weight (%)']];
    if (Object.keys(weights).length === 0) {
      pairRows.push(['(Equal weighting applied — no pairwise comparisons recorded)', '', '']);
    } else {
      Object.entries(weights).forEach(([ility, w]) => {
        pairRows.push([ility, typeof w === 'number' ? +w.toFixed(3) : w, typeof w === 'number' ? +((w / totalW) * 100).toFixed(1) : '—']);
      });
    }
    const wsPair = XLSX.utils.aoa_to_sheet(pairRows);
    setCols(wsPair, [35, 10, 20]);
    XLSX.utils.book_append_sheet(wb, wsPair, 'Pairwise Weights');

    // ── 6. CONCEPT SCORING ────────────────────────────────────
    const scoringHeader = ['Req ID', 'Requirement', 'Lifecycle Property', ...nonDatum.map(c => c.name)];
    const scoringRows   = [scoringHeader];
    requirements.forEach(r => {
      const row = [r.id, r.text, r.primary];
      nonDatum.forEach(c => {
        const s = pughScores[c.id + '_' + r.id];
        row.push(s === '+' ? '+' : s === '-' ? '-' : 'S');
      });
      scoringRows.push(row);
    });
    // Totals
    const plusRow  = ['', '+ (Better than datum)', ''];
    const minusRow = ['', '- (Worse than datum)',  ''];
    const netRow   = ['', 'Utility Score',          ''];
    nonDatum.forEach(c => {
      let plus = 0, minus = 0;
      requirements.forEach(r => {
        const s = pughScores[c.id + '_' + r.id];
        if (s === '+') plus++;
        else if (s === '-') minus++;
      });
      plusRow.push(plus);
      minusRow.push(minus);
      netRow.push(plus - minus);
    });
    scoringRows.push([], plusRow, minusRow, netRow);
    const wsScoring = XLSX.utils.aoa_to_sheet(scoringRows);
    setCols(wsScoring, [6, 50, 22, ...nonDatum.map(() => 14)]);
    XLSX.utils.book_append_sheet(wb, wsScoring, 'Concept Scoring');

    // ── 7. CONVERGENCE ────────────────────────────────────────
    const convData = [
      ['Convergence Summary'],
      [],
      ['Selected Concept',  selectedConcept ? selectedConcept.name : '—'],
      ['Convergence Date',  convClosedAt ? new Date(convClosedAt).toLocaleDateString() : '—'],
      [],
      ['Rationale'],
      [convRationale || '—'],
      [],
      ['Lessons Learned — What requirements surprised you?'],
      [convLessons.req || '—'],
      [],
      ['Lessons Learned — What did you learn about your concepts?'],
      [convLessons.concepts || '—'],
      [],
      ['Lessons Learned — What assumption turned out to be wrong?'],
      [convLessons.assumption || '—'],
      [],
      ['Lessons Learned — What would you do differently?'],
      [convLessons.different || '—'],
      [],
      ['Open Risks & Mitigations'],
      [convRisks || '—'],
      [],
      ['Next Steps', 'Owner', 'Due Date'],
      ...convNextSteps.map(s => [s.what || '', s.who || '', s.when || '']),
    ];
    const wsConv = XLSX.utils.aoa_to_sheet(convData);
    setCols(wsConv, [55, 20, 15]);
    XLSX.utils.book_append_sheet(wb, wsConv, 'Convergence');

    // ── DOWNLOAD ─────────────────────────────────────────────
    const safeName = projName.replace(/[^a-z0-9]/gi, '_');
    const dateTag  = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    XLSX.writeFile(wb, `${safeName}_${dateTag}.xlsx`);
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
            if (data.pugh.conceptNotes)       conceptNotes       = data.pugh.conceptNotes;
            if (data.pugh.conceptCustomFields) {
              conceptCustomFields = data.pugh.conceptCustomFields;
              _cfIdCounter = data.pugh.cfIdCounter || conceptCustomFields.length;
            }
            // Sync UI to restored settings
            if (typeof syncScoringModeButtons === 'function') syncScoringModeButtons();
            const mCb    = document.getElementById('toggleMTHUS');
            const masCb  = document.getElementById('toggleMAS');
            if (mCb)    mCb.checked    = pughSettings.showMTHUS;
            if (masCb)  masCb.checked  = pughSettings.showMAS;
            renderConceptCards();
            renderPughMatrix();
          }
          if (data.convergence) {
            const cv = data.convergence;
            convSelectedConceptId = cv.selectedConceptId || '';
            convRationale         = cv.rationale         || '';
            convLessons           = Object.assign({ req: '', concepts: '', assumption: '', different: '' }, cv.lessons || {});
            convRisks             = cv.risks             || '';
            convNextSteps         = (cv.nextSteps        || []).slice();
            convClosedAt          = cv.closedAt          || null;
            _convNSCounter        = convNextSteps.reduce((max, s) => {
              const n = parseInt(String(s.id).replace('ns', ''), 10) || 0;
              return Math.max(max, n);
            }, 0);
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

  function loadExampleProject(autoLoad) {
    // Detect if the current session has any meaningful data
    const hasData = requirements.length > 0 ||
                    pughConcepts.length > 0 ||
                    selectedIlities.size > 0 ||
                    selectedStakeholders.size > 0;
    if (hasData && !autoLoad) {
      if (!confirm('Loading the example project will replace your current session data. Continue?')) return;
    }

    const data = CC_EXAMPLE_PROJECT;

    // Restore goal statement
    if (data.goalStatement) {
      if (data.goalStatement.basic) {
        const basicEl = document.getElementById('input-goal-basic');
        if (basicEl) basicEl.value = data.goalStatement.basic;
      }
      ['to','by','using','while'].forEach(f => {
        const el = document.getElementById('input-' + f);
        if (el && data.goalStatement[f]) { el.value = data.goalStatement[f]; onInput(f); }
      });
    }
    if (data.goalMode) {
      goalMode = data.goalMode;
      if (typeof switchGoalMode === 'function') switchGoalMode(goalMode);
    }
    if (data.ilities) {
      if (data.ilities.custom)   customIlities    = data.ilities.custom;
      if (data.ilities.selected) selectedIlities  = new Set(data.ilities.selected);
      renderIlityGrid();
    }
    if (data.stakeholders) {
      if (data.stakeholders.custom)    customStakeholders    = data.stakeholders.custom;
      if (data.stakeholders.selected)  selectedStakeholders  = new Set(data.stakeholders.selected);
      renderStakGrid();
    }
    if (data.requirements) {
      requirements = data.requirements;
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
      if (data.pugh.concepts)           pughConcepts        = data.pugh.concepts;
      if (data.pugh.scores)             pughScores          = data.pugh.scores;
      if (data.pugh.advBackup)          pughAdvBackup       = data.pugh.advBackup;
      if (data.pugh.settings)           Object.assign(pughSettings, data.pugh.settings);
      if (data.pugh.counter)            pughConceptCounter  = data.pugh.counter;
      if (data.pugh.datumPerformance)   datumPerformance    = data.pugh.datumPerformance;
      if (data.pugh.conceptPerformance) conceptPerformance  = data.pugh.conceptPerformance;
      if (data.pugh.conceptNotes)       conceptNotes        = data.pugh.conceptNotes;
      if (data.pugh.conceptCustomFields) {
        conceptCustomFields = data.pugh.conceptCustomFields;
        _cfIdCounter = data.pugh.cfIdCounter || conceptCustomFields.length;
      }
      if (typeof syncScoringModeButtons === 'function') syncScoringModeButtons();
      const mCb   = document.getElementById('toggleMTHUS');
      const masCb = document.getElementById('toggleMAS');
      if (mCb)   mCb.checked   = pughSettings.showMTHUS;
      if (masCb) masCb.checked = pughSettings.showMAS;
      renderConceptCards();
      renderPughMatrix();
    }
    if (data.convergence) {
      const cv = data.convergence;
      convSelectedConceptId = cv.selectedConceptId || '';
      convRationale         = cv.rationale         || '';
      convLessons           = Object.assign({ req: '', concepts: '', assumption: '', different: '' }, cv.lessons || {});
      convRisks             = cv.risks             || '';
      convNextSteps         = (cv.nextSteps        || []).slice();
      convClosedAt          = cv.closedAt          || null;
      _convNSCounter        = convNextSteps.reduce((max, s) => {
        const n = parseInt(String(s.id).replace('ns', ''), 10) || 0;
        return Math.max(max, n);
      }, 0);
    }
    // Enter example mode — banner on Project Manager lets the user decide
    // whether to save or discard. We deliberately skip the Supabase save and
    // localStorage write here so the project doesn't silently land in their
    // saved list. nav-save and auto-save are also gated on exampleMode below.
    exampleMode = true;
    if (data.project) {
      activeProject = data.project;
      if (appState.currentUser) activeProject.user_id = appState.currentUser.id;
      updateNavProjectName();
    }
    if (typeof renderProjPage === 'function') renderProjPage();
    populateReqForms();
    if (typeof syncGuidedToQS === 'function') syncGuidedToQS();

    // Activate Full Mode without going through setMode() — setMode() would trigger
    // the _anonHasBasicData "Save Your Work?" modal (because we just loaded data),
    // and that modal's "Continue" button navigates back to home, making it look like
    // nothing loaded. We bypass it entirely by applying the mode state directly.
    function _applyFullMode() {
      appMode  = 'full';
      goalMode = 'basic';
      document.body.classList.remove('mode-basic');
      document.body.classList.add('mode-full');
      var btnBasic = document.getElementById('modeBtnBasic');
      var btnFull  = document.getElementById('modeBtnFull');
      if (btnBasic) btnBasic.classList.remove('active');
      if (btnFull)  btnFull.classList.add('active');
    }

    // Always land on Project Manager — gives the user the full context and example mode banner.
    // When coming from the #demo hash, the outer setTimeout already deferred us past all sync init.
    _applyFullMode();
    switchPage('proj', document.querySelector('[data-page="proj"]'));

    // Trigger the guided product tour modal (tour.js — no-op if tour.js failed to load)
    if (window.ccTour && typeof window.ccTour.onExampleLoaded === 'function') {
      window.ccTour.onExampleLoaded();
    }
  }

  function clearAllWithWarning() {
    if (!confirm('Clear ALL project data? This will reset your goal statement, ilities, stakeholders, requirements, concepts, scores, and convergence. This cannot be undone.')) return;

    // ── Goal Statement ──
    ['input-to','input-by','input-using','input-while','input-goal-basic'].forEach(id => {
      const el = document.getElementById(id); if (el) el.value = '';
    });
    ['to','by','using','while'].forEach(f => {
      const dotEl = document.getElementById('dot-' + f);
      if (dotEl) dotEl.className = 'status-dot';
      const valEl = document.getElementById('val-' + f);
      if (valEl) valEl.className = 'validation-msg';
    });
    goalMode = 'basic';
    if (typeof switchGoalMode === 'function') switchGoalMode('basic');
    const pb = document.getElementById('previewBanner');
    if (pb) pb.classList.remove('visible');

    // ── Ilities / Stakeholders / Requirements ──
    selectedIlities.clear(); customIlities = []; ilityOrder = []; renderIlityGrid();
    selectedStakeholders.clear(); customStakeholders = []; stakOrder = []; renderStakGrid();
    requirements = []; reqIdCounter = 0; _editingReqId = null; renderRequirements();

    // ── Pairwise ──
    pairMode    = 'nonweighted';
    pairSubject = 'ilities';
    pairMethod  = 'pairwise';
    pairComparisons = {}; pairPairs = []; pairIndex = 0; forcedRankOrder = [];
    window._pairWeights = {};
    const syncBtn = (id, active) => { const el = document.getElementById(id); if (el) el.classList.toggle('active', active); };
    syncBtn('pairNonWeightedBtn', true);
    syncBtn('pairWeightedBtn',    false);
    syncBtn('pairIlitiesBtn',     true);
    syncBtn('pairReqsBtn',        false);
    syncBtn('pairPairwiseBtn',    true);
    syncBtn('pairForcedRankBtn',  false);
    renderNonWeighted();
    updatePairProgress();

    // ── Pugh Matrix / Concept Scoring ──
    pughConcepts = []; pughScores = {}; pughAdvBackup = {}; pughConceptCounter = 0;
    datumPerformance = {}; conceptPerformance = {}; conceptNotes = {};
    conceptCustomFields = []; _cfIdCounter = 0; scorerFilter = ''; datumDefActive = false;
    scorTagFilter = []; scorTagMatchMode = 'any';
    scorReqTagFilter = []; scorReqTagMatchMode = 'any';
    reqPageIlityFilter = []; reqPageIlityMatchMode = 'any';
    reqPageStakeholderFilter = []; reqPageStakeholderMatchMode = 'any';
    reqPageTagFilter = []; reqPageTagMatchMode = 'any';
    pughSettings = { advancedScoring: false, showMTHUS: false, showMAS: false, freezeTopRow: true };
    pughCollapsedIlities = new Set(); pughUserInteractedCollapse = false; pughChartSort = 'order';
    const mCb = document.getElementById('toggleMTHUS');
    const masCb = document.getElementById('toggleMAS');
    if (mCb)   mCb.checked   = false;
    if (masCb) masCb.checked = false;
    exitScoringView();
    renderConceptCards();
    renderPughMatrix();
    if (typeof syncScoringModeButtons === 'function') syncScoringModeButtons();

    // ── Convergence ──
    convSelectedConceptId = '';
    convRationale         = '';
    convLessons           = { req: '', concepts: '', assumption: '', different: '' };
    convRisks             = '';
    convNextSteps         = [];
    convClosedAt          = null;
    _convNSCounter        = 0;
    if (typeof renderConvPage === 'function') renderConvPage();

    // ── Nav completion indicators ──
    _completedPages.clear();
    if (typeof updateNavCompletion === 'function') updateNavCompletion();

    // ── Project / Nav ──
    exampleMode = false;
    activeProject = null; updateNavProjectName(); if (typeof _clearProjectRole === 'function') _clearProjectRole();
    populateReqForms();
    if (typeof syncGuidedToQS === 'function') syncGuidedToQS();
    if (typeof syncSidebarPrefs === 'function') syncSidebarPrefs();
    const ab = document.getElementById('advisorBody');
    if (ab) ab.innerHTML = '<p>Start writing your goal statement above — I\'ll help you sharpen each part as you go.</p><p>The most important thing to get right first is your <strong>TO</strong>. It must describe an outcome for a person, not a product or technology.</p>';
  }

  // ── EXPORT PROJECT MODAL ──────────────────────────────────────
  function openExportProjectModal() {
    document.getElementById('exportProjectModal')?.classList.add('open');
  }
  function closeExportProjectModal() {
    document.getElementById('exportProjectModal')?.classList.remove('open');
  }

  // ── BASIC PDF REPORT (free, simplified, print-based) ──────────
  // ── Concept Score Chart: build as inline SVG from raw data ──────────────────
  // Renders the same grouped bar chart shown on screen: three vertical bars per
  // concept (Utility Score / + Count / − Count), concepts along the x-axis.
  // Works regardless of whether the Chart.js canvas has been rendered.
  function buildConceptScoreChartSvg(themeColors) {
    const nonDatum = pughConcepts.slice(1);
    if (nonDatum.length === 0 || requirements.length === 0) return '';

    const T = themeColors || {};  // optional theme token object for Pro report colors
    const colUtil  = T.textPrimary  || '#1a1a18';
    const colPlus  = T.barPos1      || '#057a55';
    const colMinus = T.barNeg       || '#c81e1e';
    const colGrid  = T.secBorder    || '#e8e8e6';
    const colTick  = T.textTertiary || '#888888';
    const colLabel = T.textSecondary|| '#444444';
    const colBg    = T.bodyBg       || '#ffffff';
    const colZero  = T.accentLine   || '#aaaaaa';

    // Compute data for each non-datum concept
    const data = nonDatum.map(c => {
      let plus = 0, minus = 0;
      requirements.forEach(r => {
        const s = pughScores[c.id + '_' + r.id];
        if (s === '+' || (typeof s === 'number' && s > 0)) plus++;
        else if (s === '-' || (typeof s === 'number' && s < 0)) minus++;
      });
      return { name: c.name, plus, minusNeg: -minus, net: plus - minus };
    });

    // SVG layout constants
    const SVG_W    = 760;
    const ML = 44, MR = 16, MT = 36, MB = 110;
    const chartW   = SVG_W - ML - MR;
    const chartH   = 240;
    const SVG_H    = MT + chartH + MB;

    // Y scale
    const allVals  = [...data.flatMap(d => [d.plus, d.minusNeg, d.net]), 0];
    const yRawMax  = Math.max(...allVals, 1);
    const yRawMin  = Math.min(...allVals, -1);
    const yPad     = Math.max(Math.ceil((yRawMax - yRawMin) * 0.08), 1);
    const yMax     = yRawMax + yPad;
    const yMin     = yRawMin - yPad;
    const yRange   = yMax - yMin;
    const yScale   = v => MT + (1 - (v - yMin) / yRange) * chartH;
    const zeroY    = yScale(0);

    // Bar geometry: 3 bars per group, slim gaps between them
    const groupW   = chartW / data.length;
    const barW     = Math.max(Math.min(groupW * 0.22, 18), 3);
    const gap      = Math.max(barW * 0.15, 1);

    const _esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    let out = '';

    // Background
    out += `<rect x="0" y="0" width="${SVG_W}" height="${SVG_H}" fill="${colBg}"/>`;

    // Y-axis grid lines + tick labels
    const tickCount = 6;
    for (let i = 0; i <= tickCount; i++) {
      const v  = yMin + (yRange / tickCount) * i;
      const vy = yScale(v);
      out += `<line x1="${ML}" y1="${vy.toFixed(1)}" x2="${SVG_W - MR}" y2="${vy.toFixed(1)}" stroke="${colGrid}" stroke-width="1"/>`;
      out += `<text x="${(ML - 5).toFixed(1)}" y="${(vy + 3.5).toFixed(1)}" font-size="9" text-anchor="end" fill="${colTick}" font-family="Courier New,monospace">${Math.abs(Math.round(v))}</text>`;
    }

    // Zero baseline
    out += `<line x1="${ML}" y1="${zeroY.toFixed(1)}" x2="${SVG_W - MR}" y2="${zeroY.toFixed(1)}" stroke="${colZero}" stroke-width="1.5"/>`;

    // Bars + x-axis labels
    data.forEach((d, i) => {
      const cx = ML + (i + 0.5) * groupW;
      const b0 = cx - barW * 1.5 - gap;   // utility bar x
      const b1 = cx - barW * 0.5;          // plus bar x
      const b2 = cx + barW * 0.5 + gap;    // minus bar x

      const drawBar = (bx, val, color) => {
        const y1 = yScale(Math.max(val, 0));
        const y2 = yScale(Math.min(val, 0));
        const bh = Math.max(Math.abs(y2 - y1), 1);
        out += `<rect x="${bx.toFixed(1)}" y="${Math.min(y1,y2).toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" fill="${color}" opacity="0.88"/>`;
      };

      drawBar(b0, d.net,      colUtil);
      drawBar(b1, d.plus,     colPlus);
      drawBar(b2, d.minusNeg, colMinus);

      // Rotated concept name label
      const lx = cx.toFixed(1);
      const ly = (MT + chartH + 8).toFixed(1);
      const label = d.name.length > 24 ? d.name.substring(0, 24) + '…' : d.name;
      out += `<text x="${lx}" y="${ly}" font-size="9" text-anchor="end" fill="${colLabel}" font-family="Arial,sans-serif" transform="rotate(-45 ${lx} ${ly})">${_esc(label)}</text>`;
    });

    // Y-axis title
    const midY = (MT + chartH / 2).toFixed(1);
    out += `<text x="11" y="${midY}" font-size="10" text-anchor="middle" fill="${colTick}" font-family="Arial,sans-serif" transform="rotate(-90 11 ${midY})">Utility / Count</text>`;

    // Legend
    const lY = 18;
    out += `<circle cx="${ML + 8}"   cy="${lY}" r="5" fill="${colUtil}"/>`;
    out += `<text x="${ML + 16}"  y="${lY + 4}" font-size="10" fill="${colLabel}" font-family="Arial,sans-serif">Utility Score</text>`;
    out += `<circle cx="${ML + 102}" cy="${lY}" r="5" fill="${colPlus}"/>`;
    out += `<text x="${ML + 110}" y="${lY + 4}" font-size="10" fill="${colLabel}" font-family="Arial,sans-serif">+ Count</text>`;
    out += `<circle cx="${ML + 168}" cy="${lY}" r="5" fill="${colMinus}"/>`;
    out += `<text x="${ML + 176}" y="${lY + 4}" font-size="10" fill="${colLabel}" font-family="Arial,sans-serif">− Count</text>`;

    return `<svg viewBox="0 0 ${SVG_W} ${SVG_H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">${out}</svg>`;
  }

  function generateBasicPdfReport() {
    const projName  = document.getElementById('qsProjectName')?.value?.trim() || 'Untitled Project';
    const goalText  = document.getElementById('qsGoal')?.value?.trim() || '';
    const dateStr   = new Date().toLocaleDateString(undefined, { year:'numeric', month:'long', day:'numeric' });

    // Build requirements rows
    let reqRows = '';
    if (requirements.length === 0) {
      reqRows = '<tr><td colspan="2" style="color:#888;font-style:italic;padding:6px 8px">No requirements entered.</td></tr>';
    } else {
      requirements.forEach((r, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#f9f9f8';
        reqRows += `<tr style="background:${bg}"><td style="padding:6px 8px;border:1px solid #e2e2df;width:36px;text-align:center;color:#555">${i+1}</td><td style="padding:6px 8px;border:1px solid #e2e2df">${escHtml(r.text || '')}</td></tr>`;
      });
    }

    // Build Pugh matrix table
    let pughHtml = '';
    if (pughConcepts.length >= 2 && requirements.length > 0) {
      const headerCells = pughConcepts.map((c, i) =>
        `<th style="padding:6px 8px;border:1px solid #e2e2df;background:#f0f4ff;min-width:60px">${escHtml(c.name)}${i===0?' <span style="font-size:10px;color:#888">(Datum)</span>':''}</th>`
      ).join('');
      let pughRows = '';
      requirements.forEach((r, ri) => {
        const bg = ri % 2 === 0 ? '#fff' : '#f9f9f8';
        const cells = pughConcepts.map((c, ci) => {
          const key = c.id + '_' + r.id;
          const val = pughScores[key];
          const display = val === '+' ? '+' : val === '-' ? '−' : val === '0' ? '0' : (val !== undefined ? val : '');
          const color = val === '+' ? '#057a55' : val === '-' ? '#c81e1e' : '#555';
          return `<td style="padding:6px 8px;border:1px solid #e2e2df;text-align:center;font-weight:600;color:${color};background:${bg}">${display}</td>`;
        }).join('');
        pughRows += `<tr><td style="padding:6px 8px;border:1px solid #e2e2df;background:${bg}">${escHtml(r.text||'')}</td>${cells}</tr>`;
      });
      pughHtml = `
        <h2 style="font-size:15px;font-weight:700;color:#1a1a18;margin:28px 0 10px">Pugh Matrix</h2>
        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead><tr>
              <th style="padding:6px 8px;border:1px solid #e2e2df;background:#f0f4ff;text-align:left">Requirement</th>
              ${headerCells}
            </tr></thead>
            <tbody>${pughRows}</tbody>
          </table>
        </div>`;
    }

    // Build concept score summary
    let scoreHtml = '';
    if (pughConcepts.length >= 2 && requirements.length > 0) {
      const nonDatum = pughConcepts.slice(1);
      const rows = nonDatum.map(c => {
        const plus  = requirements.filter(r => pughScores[c.id+'_'+r.id] === '+').length;
        const minus = requirements.filter(r => pughScores[c.id+'_'+r.id] === '-').length;
        const zero  = requirements.filter(r => pughScores[c.id+'_'+r.id] === '0').length;
        const net   = plus - minus;
        return { name: c.name, plus, minus, zero, net };
      }).sort((a,b) => b.net - a.net);
      const scoreRows = rows.map((r, i) => {
        const bg = i % 2 === 0 ? '#fff' : '#f9f9f8';
        return `<tr style="background:${bg}">
          <td style="padding:6px 8px;border:1px solid #e2e2df">${escHtml(r.name)}</td>
          <td style="padding:6px 8px;border:1px solid #e2e2df;text-align:center;color:#057a55;font-weight:600">+${r.plus}</td>
          <td style="padding:6px 8px;border:1px solid #e2e2df;text-align:center;color:#555">${r.zero}</td>
          <td style="padding:6px 8px;border:1px solid #e2e2df;text-align:center;color:#c81e1e;font-weight:600">−${r.minus}</td>
          <td style="padding:6px 8px;border:1px solid #e2e2df;text-align:center;font-weight:700;color:${r.net>0?'#057a55':r.net<0?'#c81e1e':'#555'}">${r.net>0?'+':''}${r.net}</td>
        </tr>`;
      }).join('');
      scoreHtml = `
        <h2 style="font-size:15px;font-weight:700;color:#1a1a18;margin:28px 0 10px">Concept Score Summary</h2>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr>
            <th style="padding:6px 8px;border:1px solid #e2e2df;background:#f0f4ff;text-align:left">Concept</th>
            <th style="padding:6px 8px;border:1px solid #e2e2df;background:#f0f4ff;text-align:center">Better (+)</th>
            <th style="padding:6px 8px;border:1px solid #e2e2df;background:#f0f4ff;text-align:center">Same (0)</th>
            <th style="padding:6px 8px;border:1px solid #e2e2df;background:#f0f4ff;text-align:center">Worse (−)</th>
            <th style="padding:6px 8px;border:1px solid #e2e2df;background:#f0f4ff;text-align:center">Net Score</th>
          </tr></thead>
          <tbody>${scoreRows}</tbody>
        </table>`;
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escHtml(projName)} — Quick Report</title>
  <style>
    @page { size: portrait; margin: 18mm 16mm 22mm 16mm; }
    body { font-family: Georgia, serif; margin: 0; padding: 0; color: #1a1a18; background: #fff; }
    .content { padding: 40px; }
    h2 { page-break-after: avoid; break-after: avoid; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    table { page-break-inside: auto; border-collapse: collapse; }
    .section-break { page-break-before: always; break-before: page; padding: 40px; }
    .print-header, .print-footer { display: none; }
    @media print {
      body { padding: 0; margin: 0; }
      .content { padding: 0; }
      .section-break { padding: 0; }
      .cover-page { page-break-after: always; break-after: page; }
      .no-print { display: none !important; }
      .print-header {
        display: flex !important; position: fixed; top: 0; left: 0; right: 0;
        background: #fff; border-bottom: 1px solid #d4e0ff;
        padding: 5px 16mm; justify-content: space-between; align-items: center;
        font-size: 10px; z-index: 9999;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .print-footer {
        display: flex !important; position: fixed; bottom: 0; left: 0; right: 0;
        background: #fff; border-top: 1px solid #e2e2df;
        padding: 5px 16mm; justify-content: space-between; align-items: center;
        font-size: 10px; color: #9b9b94; font-family: Georgia, serif; z-index: 9999;
        -webkit-print-color-adjust: exact; print-color-adjust: exact;
      }
      .pf-page-num::before { content: "Page " counter(page); }
      .cover-page { min-height: 100vh; }
    }
  </style>
</head>
<body>
  <!-- Fixed print header (every page after cover) -->
  <div class="print-header">
    <span style="font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#1a56db">ControlledConvergence.com</span>
    <span style="color:#6b6b65">${escHtml(projName)}</span>
  </div>

  <!-- Fixed print footer (every page) -->
  <div class="print-footer">
    <span>ControlledConvergence.com &nbsp;·&nbsp; Quick Analysis Report</span>
    <span class="pf-page-num" style="color:#9b9b94">&nbsp;</span>
    <span>${dateStr}</span>
  </div>

  <!-- ── COVER PAGE ── -->
  <div class="cover-page" style="min-height:100vh;display:flex;flex-direction:column;justify-content:space-between;padding:60px 48px 32px;background:#fff;page-break-after:always;break-after:page;box-sizing:border-box">
    <div>
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.18em;color:#1a56db;margin-bottom:40px;font-family:Georgia,serif">Quick Analysis Report</div>
      <h1 style="font-size:38px;font-weight:700;color:#1a1a18;margin:0 0 16px;line-height:1.15;font-family:Georgia,serif">${escHtml(projName)}</h1>
      <div style="width:40px;height:3px;background:#1a56db;margin-bottom:28px"></div>
      ${goalText ? `<div style="font-size:14px;color:#4a4a44;line-height:1.65;max-width:520px;margin-bottom:20px;font-style:italic">${escHtml(goalText)}</div>` : ''}
      <div style="font-size:13px;color:#9b9b94;margin-top:8px">Generated ${dateStr}</div>
    </div>
    <div style="border-top:1px solid #e2e2df;padding-top:14px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#1a56db">ControlledConvergence.com</span>
      <span style="font-size:11px;color:#9b9b94">${requirements.length} requirement${requirements.length !== 1 ? 's' : ''} &nbsp;·&nbsp; ${pughConcepts.length > 1 ? pughConcepts.length - 1 + ' concept' + (pughConcepts.length - 1 !== 1 ? 's' : '') + ' evaluated' : 'No concepts yet'}</span>
    </div>
  </div>

  <!-- ── MAIN CONTENT ── -->
  <div class="content" style="padding:40px">

    <!-- Header / branding -->
    <div style="border-bottom:2px solid #1a56db;padding-bottom:14px;margin-bottom:24px">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.12em;color:#1a56db;margin-bottom:6px">ControlledConvergence.com</div>
      <h1 style="font-size:22px;font-weight:700;margin:0 0 4px">${escHtml(projName)}</h1>
      <div style="font-size:13px;color:#6b6b65">Quick Analysis Report &nbsp;·&nbsp; Generated ${dateStr}</div>
    </div>

    ${goalText ? `
    <h2 style="font-size:15px;font-weight:700;color:#1a1a18;margin:0 0 10px">Project Goal</h2>
    <div style="background:#f0f4ff;border:1px solid #c3d4f8;border-radius:6px;padding:12px 16px;font-size:14px;line-height:1.6;margin-bottom:24px">${escHtml(goalText)}</div>` : ''}

    ${(() => { const svg = buildConceptScoreChartSvg(); return svg ? `
    <h2 style="font-size:15px;font-weight:700;color:#1a1a18;margin:0 0 10px">Concept Score Summary</h2>
    <div style="border:1px solid #e2e2df;border-radius:6px;overflow:hidden;margin-bottom:24px;background:#fff">
      ${svg}
    </div>` : ''; })()}

    ${scoreHtml ? `${scoreHtml}<div style="margin-top:32px"></div>` : ''}

    <h2 style="font-size:15px;font-weight:700;color:#1a1a18;margin:0 0 10px">Requirements (${requirements.length})</h2>
    <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:4px">
      <tbody>${reqRows}</tbody>
    </table>

  </div>

  ${pughHtml ? `<div class="section-break">${pughHtml}</div>` : ''}

  <!-- Screen-only footer -->
  <div class="no-print" style="margin-top:40px;padding:12px 40px;border-top:1px solid #e2e2df;font-size:11px;color:#9b9b94;text-align:center">
    Report Generated with <strong>ControlledConvergence.com</strong>
  </div>
</body>
</html>`;

    // Open in a new window and trigger print dialog
    const win = window.open('', '_blank');
    if (!win) { alert('Please allow popups for this site to generate the report.'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 400);
  }

  function exportReport() {
    if (!userTierMeets('pro')) {
      showUpgradePrompt('export-report');
      return;
    }

    // Pre-populate filename
    const fnField = document.getElementById('rptFileName');
    if (fnField) {
      const safeName = (activeProject?.name || 'CC_Report').replace(/[^a-zA-Z0-9\s_-]/g, '').trim().replace(/\s+/g, '_');
      const dateTag  = new Date().toISOString().slice(0,10).replace(/-/g,'');
      fnField.value  = `${safeName}_${dateTag}`;
    }

    // Wire theme radio labels (idempotent — safe to call multiple times)
    ['Light','Dark','Bw'].forEach(t => {
      const radio = document.getElementById('rptTheme' + t);
      if (radio && !radio._rptWired) {
        radio.addEventListener('change', _rptSyncThemeLabels);
        radio._rptWired = true;
      }
    });
    _rptSyncThemeLabels();

    // Populate Focus Concepts list
    const focusSec  = document.getElementById('rptFocusSection');
    const focusList = document.getElementById('rptFocusList');
    const sortedCS  = pughConcepts.slice(1).map(c => {
      const plus  = requirements.filter(r => pughScores[c.id + '_' + r.id] === '+').length;
      const minus = requirements.filter(r => pughScores[c.id + '_' + r.id] === '-').length;
      return { c, net: plus - minus };
    }).sort((a, b) => b.net - a.net);

    if (focusSec && focusList) {
      if (sortedCS.length > 0) {
        focusSec.style.display = '';
        focusList.innerHTML = sortedCS.map((s, i) =>
          `<label style="display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer;overflow:hidden">
            <input type="checkbox" class="rptFocusConcept" data-cid="${s.c.id}">
            <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escHtml(s.c.name)}">#${i+1} ${escHtml(s.c.name)}</span>
          </label>`
        ).join('');
      } else {
        focusSec.style.display = 'none';
      }
    }

    document.getElementById('exportReportModal').classList.add('open');
  }

  function _rptSyncThemeLabels() {
    ['Light','Dark','Bw'].forEach(t => {
      const radio = document.getElementById('rptTheme' + t);
      const lbl   = document.getElementById('rptTheme' + t + 'Label');
      if (!radio || !lbl) return;
      if (radio.checked) {
        lbl.style.border     = '2px solid var(--accent)';
        lbl.style.background = 'var(--accent-subtle)';
        lbl.style.color      = 'var(--accent)';
        lbl.style.fontWeight = '600';
      } else {
        lbl.style.border     = '1px solid var(--border)';
        lbl.style.background = 'var(--surface)';
        lbl.style.color      = '';
        lbl.style.fontWeight = '';
      }
    });
  }

  function rptQuickSelect(n) {
    document.querySelectorAll('.rptFocusConcept').forEach((cb, i) => {
      cb.checked = n > 0 && i < n;
    });
  }

  function generateReport() {
    document.getElementById('exportReportModal').classList.remove('open');

    // ── Theme ──
    const themeVal = document.querySelector('input[name="rptTheme"]:checked')?.value || 'light';

    // Token objects — every color in the report goes through T
    const THEMES = {
      light: {
        pageBg:       '#ffffff',
        pageBorder:   '#e2e8f0',
        stripBg:      '#f8fafc',
        stripBorder:  '#e2e8f0',
        stripText:    '#64748b',
        stripBrand:   '#94a3b8',
        bodyBg:       '#ffffff',
        secBorder:    '#e2e8f0',
        textPrimary:  '#0d1b2a',
        textSecondary:'#475569',
        textTertiary: '#94a3b8',
        ghost:        '#e8ecf0',
        calloutBg:    '#f8fafc',
        calloutBorder:'#0d1b2a',
        cardBg:       '#f8fafc',
        cardBorder:   '#e2e8f0',
        tblHeadBg:    '#0d1b2a',
        tblHeadText:  '#f1f5f9',
        tblRowAlt:    '#f8fafc',
        tblBorder:    '#e2e8f0',
        winnerBg:     '#f0fff4',
        winnerBorder: '#9ae6b4',
        winnerText:   '#276749',
        winnerSub:    '#48bb78',
        barPosBg:     '#e2e8f0',
        barPosText:   '#276749',
        barPos1:      '#276749',
        barPos2:      '#38a169',
        barPos3:      '#68d391',
        barNeg:       '#fc8181',
        barNegText:   '#c53030',
        datumBg:      '#f8fafc',
        datumText:    '#94a3b8',
        covBarPos:    '#3182ce',
        covBarConc:   '#dd6b20',
        rtmDot:       '#3182ce',
        rtmFill:      '#ebf8ff',
        accentLine:   '#0d1b2a',
        subheadColor: '#94a3b8',
        footerBg:     '#f8fafc',
        footerText:   '#94a3b8',
        cardColors:   ['#0d1b2a','#276749','#3182ce','#dd6b20','#805ad5','#d53f8c','#b7791f','#2c7a7b','#c53030','#2b6cb0'],
        coverBg:      '#f0f4f8',
        coverText:    '#0d1b2a',
        coverSub:     '#475569',
        coverAccent:  '#0d1b2a',
        coverMeta:    '#64748b',
        coverUrl:     '#94a3b8',
        coverBadgeBg: '#e2e8f0',
        coverBadgeTx: '#475569',
        coverBadgeBd: '#cbd5e0',
        coverRule:    '#0d1b2a',
      },
      dark: {
        pageBg:       '#0f172a',
        pageBorder:   '#334155',
        stripBg:      '#1e293b',
        stripBorder:  '#334155',
        stripText:    '#94a3b8',
        stripBrand:   '#38bdf8',
        bodyBg:       '#0f172a',
        secBorder:    '#334155',
        textPrimary:  '#f1f5f9',
        textSecondary:'#cbd5e0',
        textTertiary: '#64748b',
        ghost:        '#1e293b',
        calloutBg:    '#1e293b',
        calloutBorder:'#38bdf8',
        cardBg:       '#1e293b',
        cardBorder:   '#334155',
        tblHeadBg:    '#1e293b',
        tblHeadText:  '#94a3b8',
        tblRowAlt:    '#172032',
        tblBorder:    '#334155',
        winnerBg:     '#14532d',
        winnerBorder: '#166534',
        winnerText:   '#86efac',
        winnerSub:    '#4ade80',
        barPosBg:     '#1e293b',
        barPosText:   '#4ade80',
        barPos1:      '#166534',
        barPos2:      '#15803d',
        barPos3:      '#16a34a',
        barNeg:       '#7f1d1d',
        barNegText:   '#fca5a5',
        datumBg:      '#1e293b',
        datumText:    '#475569',
        covBarPos:    '#38bdf8',
        covBarConc:   '#f97316',
        rtmDot:       '#38bdf8',
        rtmFill:      '#0c2a3f',
        accentLine:   '#38bdf8',
        subheadColor: '#475569',
        footerBg:     '#1e293b',
        footerText:   '#334155',
        cardColors:   ['#38bdf8','#4ade80','#fb923c','#e879f9','#facc15','#f472b6','#34d399','#a78bfa','#60a5fa','#f87171'],
        coverBg:      '#0f172a',
        coverText:    '#f1f5f9',
        coverSub:     '#94a3b8',
        coverAccent:  '#38bdf8',
        coverMeta:    '#475569',
        coverUrl:     '#334155',
        coverBadgeBg: '#172032',
        coverBadgeTx: '#38bdf8',
        coverBadgeBd: '#1e4976',
        coverRule:    '#38bdf8',
      },
      bw: {
        pageBg:       '#ffffff',
        pageBorder:   '#aaaaaa',
        stripBg:      '#f0f0f0',
        stripBorder:  '#cccccc',
        stripText:    '#444444',
        stripBrand:   '#888888',
        bodyBg:       '#ffffff',
        secBorder:    '#cccccc',
        textPrimary:  '#000000',
        textSecondary:'#333333',
        textTertiary: '#777777',
        ghost:        '#e8e8e8',
        calloutBg:    '#f5f5f5',
        calloutBorder:'#000000',
        cardBg:       '#f5f5f5',
        cardBorder:   '#cccccc',
        tblHeadBg:    '#222222',
        tblHeadText:  '#ffffff',
        tblRowAlt:    '#f5f5f5',
        tblBorder:    '#cccccc',
        winnerBg:     '#f0f0f0',
        winnerBorder: '#444444',
        winnerText:   '#000000',
        winnerSub:    '#555555',
        barPosBg:     '#e0e0e0',
        barPosText:   '#222222',
        barPos1:      '#222222',
        barPos2:      '#555555',
        barPos3:      '#888888',
        barNeg:       '#bbbbbb',
        barNegText:   '#444444',
        datumBg:      '#f5f5f5',
        datumText:    '#888888',
        covBarPos:    '#444444',
        covBarConc:   '#222222',
        rtmDot:       '#333333',
        rtmFill:      '#eeeeee',
        accentLine:   '#000000',
        subheadColor: '#888888',
        footerBg:     '#f0f0f0',
        footerText:   '#888888',
        cardColors:   ['#000000','#333333','#555555','#777777','#999999','#000000','#333333','#555555','#777777','#999999'],
        coverBg:      '#ffffff',
        coverText:    '#000000',
        coverSub:     '#444444',
        coverAccent:  '#000000',
        coverMeta:    '#666666',
        coverUrl:     '#888888',
        coverBadgeBg: '#eeeeee',
        coverBadgeTx: '#333333',
        coverBadgeBd: '#aaaaaa',
        coverRule:    '#000000',
      },
    };
    const T = THEMES[themeVal] || THEMES.light;

    // ── Sections to include ──
    const inc = {
      tbuw: document.getElementById('rptTBUW').checked,
      ilty: document.getElementById('rptILTY').checked,
      stak: document.getElementById('rptSTAK').checked,
      reqs: document.getElementById('rptREQS').checked,
      cov:  document.getElementById('rptCOV')  ? document.getElementById('rptCOV').checked  : true,
      rtm:  document.getElementById('rptRTM')  ? document.getElementById('rptRTM').checked  : true,
      pair: document.getElementById('rptPAIR').checked,
      scor: document.getElementById('rptSCOR').checked,
      pugh: document.getElementById('rptPUGH').checked,
      conv: document.getElementById('rptCONV') ? document.getElementById('rptCONV').checked : false,
    };

    // ── Focus Concepts ──
    const focusIds = new Set(
      [...document.querySelectorAll('.rptFocusConcept:checked')].map(cb => cb.dataset.cid)
    );
    const focusFilterCharts = document.getElementById('rptFocusFilterCharts')?.checked ?? true;

    const rawFileName  = (document.getElementById('rptFileName')?.value || '').trim();
    const projName     = activeProject?.name        || 'Untitled Project';
    const projOwner    = activeProject?.owner       || '';
    const projDesc     = activeProject?.description || '';
    const projStart    = activeProject?.created_at  || null;
    const dateStr      = new Date().toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
    const exportFileName = rawFileName
      ? rawFileName.replace(/\.pdf$/i, '')
      : (projName.replace(/[^a-zA-Z0-9\s_-]/g, '').trim().replace(/\s+/g, '_') + '_Report');

    const allIlities      = [...ILITIES, ...customIlities];
    const allStakeholders = [...STAKEHOLDERS, ...customStakeholders];
    const selIlities      = allIlities.filter(i => selectedIlities.has(i.id));
    const selStakeholders = allStakeholders.filter(s => selectedStakeholders.has(s.id));

    // Score helpers
    const isPlus  = v => v === '+';
    const isMinus = v => v === '-';

    // Pre-compute concept stats
    const conceptStats = pughConcepts.map((c, idx) => {
      const plus  = requirements.filter(r => isPlus(pughScores[c.id + '_' + r.id])).length;
      const minus = requirements.filter(r => isMinus(pughScores[c.id + '_' + r.id])).length;
      const zero  = requirements.filter(r => pughScores[c.id + '_' + r.id] === '0').length;
      const net   = plus - minus;
      return { c, plus, minus, zero, net, isDatum: idx === 0 };
    });
    const rankedConcepts = conceptStats.filter(s => !s.isDatum).slice().sort((a, b) => b.net - a.net);
    const rankMap = {};
    rankedConcepts.forEach((s, i) => { rankMap[s.c.id] = i + 1; });

    const selConcept = convSelectedConceptId
      ? pughConcepts.find(c => String(c.id) === String(convSelectedConceptId))
      : null;

    // Helper: page header/footer strips
    const pageStrip = () => `
      <div style="padding:7px 48px;border-bottom:1px solid ${T.stripBorder};display:flex;justify-content:space-between;align-items:center;background:${T.stripBg};-webkit-print-color-adjust:exact;print-color-adjust:exact">
        <span style="font-family:'Courier New',monospace;font-size:10px;color:${T.stripText};letter-spacing:0.04em">${escHtml(projName)}</span>
        <span style="font-family:'Courier New',monospace;font-size:10px;color:${T.stripBrand};letter-spacing:0.04em">www.controlledconvergence.com</span>
      </div>`;
    const pageFooter = () => `
      <div style="padding:8px 48px;border-top:1px solid ${T.stripBorder};display:flex;justify-content:space-between;align-items:center;background:${T.footerBg};-webkit-print-color-adjust:exact;print-color-adjust:exact">
        <span style="font-family:'Courier New',monospace;font-size:9px;color:${T.footerText};letter-spacing:0.05em">Controlled Convergence · www.controlledconvergence.com · Pro Report</span>
        <span style="font-family:'Courier New',monospace;font-size:9px;color:${T.footerText}">${dateStr}</span>
      </div>`;

    let sn = 1;
    let sections = '';

    // ── §1 EXECUTIVE SUMMARY (always included) ──
    {
      const startFmt = projStart
        ? new Date(projStart).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
        : '—';
      const convFmt = convClosedAt
        ? new Date(convClosedAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
        : null;

      const basicGoal = goalMode === 'basic'
        ? (document.getElementById('input-goal-basic')?.value || '')
        : (() => {
            const to = document.getElementById('input-to')?.value || '';
            const by = document.getElementById('input-by')?.value || '';
            const us = document.getElementById('input-using')?.value || '';
            const wh = document.getElementById('input-while')?.value || '';
            return [to && 'To ' + to, by && 'by ' + by, us && 'using ' + us, wh && 'while ' + wh].filter(Boolean).join(' ');
          })();

      const statItems = [
        ['Stakeholders',         selStakeholders.length || '—'],
        ['Lifecycle Properties', selIlities.length || '—'],
        ['Requirements',         requirements.length || '—'],
        ['Concepts Evaluated',   pughConcepts.length ? pughConcepts.length - 1 + ' + 1 datum' : '—'],
      ];
      const statsRow = statItems.map(([label, val]) => `
        <div style="flex:1;padding:14px 10px;text-align:center;border-right:1px solid ${T.tblBorder}">
          <div style="font-size:26px;font-weight:700;color:${T.textPrimary};line-height:1;margin-bottom:5px">${val}</div>
          <div style="font-family:'Courier New',monospace;font-size:9px;text-transform:uppercase;letter-spacing:0.08em;color:${T.textTertiary}">${label}</div>
        </div>`).join('');

      const numPad = String(sn).padStart(2,'0');
      sections += `
        ${pageStrip()}
        <div style="padding:32px 48px;background:${T.bodyBg}">
          <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:22px;padding-bottom:12px;border-bottom:1px solid ${T.secBorder}">
            <div>
              <div style="font-size:10px;font-family:'Courier New',monospace;letter-spacing:0.12em;color:${T.textTertiary};margin-bottom:4px;text-transform:uppercase">Section ${numPad}</div>
              <div style="font-size:18px;font-weight:700;color:${T.textPrimary}">Executive Summary</div>
            </div>
            <div style="font-size:60px;font-weight:700;color:${T.ghost};line-height:1;font-family:'Courier New',monospace;user-select:none">${numPad}</div>
          </div>
          ${basicGoal ? `<div style="border-left:3px solid ${T.calloutBorder};padding:11px 16px;background:${T.calloutBg};border-radius:0 5px 5px 0;margin-bottom:18px">
            <div style="font-size:10px;font-family:'Courier New',monospace;letter-spacing:0.1em;color:${T.textTertiary};margin-bottom:4px;text-transform:uppercase">Project Goal</div>
            <div style="font-size:13px;color:${T.textPrimary};line-height:1.55">${escHtml(basicGoal)}</div>
          </div>` : ''}
          <div style="display:flex;border:1px solid ${T.tblBorder};border-radius:6px;overflow:hidden;margin-bottom:18px;background:${T.cardBg}">
            ${statsRow.replace(/border-right:1px solid [^;]+;(?=.*<\/div><\/div>$)/, '')}
          </div>
          ${(() => {
            // ── Compact concept score summary in exec summary ──
            if (!rankedConcepts.length || !requirements.length) return '';
            const showConcepts = rankedConcepts.slice(0, 7);
            const miniRows = showConcepts.map((s, i) => {
              const isWin = selConcept && String(s.c.id) === String(convSelectedConceptId);
              const rowBg = isWin ? T.winnerBg : (i % 2 === 1 ? T.tblRowAlt : T.bodyBg);
              const netColor = s.net > 0 ? T.barPosText : s.net < 0 ? T.barNegText : T.textTertiary;
              const maxAbsLocal = Math.max(...showConcepts.map(x => Math.abs(x.net)), 1);
              const barPct = Math.max(Math.round((Math.abs(s.net) / maxAbsLocal) * 100), 2);
              const barColor = s.net < 0 ? T.barNeg : T.barPos1;
              return `<tr class="avoid-break" style="background:${rowBg}">
                <td style="padding:5px 8px;border-bottom:1px solid ${T.tblBorder};font-family:'Courier New',monospace;font-size:10px;font-weight:700;color:${T.textTertiary};width:28px;text-align:center">${i+1}</td>
                <td style="padding:5px 8px;border-bottom:1px solid ${T.tblBorder};font-size:12px;color:${isWin ? T.winnerText : T.textPrimary};font-weight:${isWin?'700':'400'}">${escHtml(s.c.name)}${isWin ? `&nbsp;<span style="font-size:9px;background:${T.winnerText};color:${T.winnerBg};padding:1px 5px;border-radius:3px">Selected</span>` : ''}</td>
                <td style="padding:5px 8px;border-bottom:1px solid ${T.tblBorder};text-align:center;font-size:11px;color:${T.barPosText};font-weight:700;width:28px">${s.plus}</td>
                <td style="padding:5px 8px;border-bottom:1px solid ${T.tblBorder};text-align:center;font-size:11px;color:${T.barNegText};font-weight:700;width:28px">${s.minus}</td>
                <td style="padding:5px 8px;border-bottom:1px solid ${T.tblBorder};width:80px">
                  <div style="background:${T.barPosBg};border-radius:2px;height:8px;overflow:hidden">
                    <div style="width:${barPct}%;height:100%;background:${barColor};border-radius:2px"></div>
                  </div>
                </td>
                <td style="padding:5px 8px;border-bottom:1px solid ${T.tblBorder};text-align:right;font-size:12px;font-weight:700;color:${netColor};width:48px">${s.net>=0?'+':''}${s.net}</td>
              </tr>`;
            }).join('');
            const caption = rankedConcepts.length > 7
              ? `Concept Score Summary — Top 7 of ${rankedConcepts.length} concepts`
              : `Concept Score Summary — ${rankedConcepts.length} concept${rankedConcepts.length!==1?'s':''} vs. datum`;
            return `<div style="margin-bottom:18px">
              <div style="font-family:'Courier New',monospace;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${T.subheadColor};margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid ${T.secBorder}">${caption}</div>
              <table style="width:100%;border-collapse:collapse">
                <thead><tr>
                  <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:5px 8px;font-size:9px;letter-spacing:0.06em;text-transform:uppercase;text-align:center;width:28px">#</th>
                  <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:5px 8px;font-size:9px;letter-spacing:0.06em;text-transform:uppercase;text-align:left">Concept</th>
                  <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:5px 8px;font-size:9px;letter-spacing:0.06em;text-transform:uppercase;text-align:center;width:28px">+</th>
                  <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:5px 8px;font-size:9px;letter-spacing:0.06em;text-transform:uppercase;text-align:center;width:28px">−</th>
                  <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:5px 8px;font-size:9px;letter-spacing:0.06em;text-transform:uppercase;text-align:left;width:80px">Score</th>
                  <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:5px 8px;font-size:9px;letter-spacing:0.06em;text-transform:uppercase;text-align:right;width:48px">Net</th>
                </tr></thead>
                <tbody>${miniRows}</tbody>
              </table>
            </div>`;
          })()}
          ${selConcept ? `<div style="border:1px solid ${T.winnerBorder};border-radius:6px;padding:15px 18px;background:${T.winnerBg};margin-bottom:16px">
            <div style="font-size:10px;font-family:'Courier New',monospace;letter-spacing:0.1em;color:${T.winnerText};margin-bottom:4px;text-transform:uppercase">Selected Concept</div>
            <div style="font-size:19px;font-weight:700;color:${T.winnerText};margin-bottom:3px">${escHtml(selConcept.name)}</div>
            ${rankedConcepts.length ? `<div style="font-size:11px;color:${T.winnerSub}">Ranked #1 of ${rankedConcepts.length} concepts evaluated against the datum${convClosedAt ? ' · Convergence closed ' + new Date(convClosedAt).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'}) : ''}</div>` : ''}
          </div>` : ''}
          <div style="font-size:12px;color:${T.textSecondary};display:flex;flex-direction:column;gap:5px">
            <div style="display:flex;gap:0"><span style="font-family:'Courier New',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:${T.textTertiary};width:120px;flex-shrink:0;padding-top:1px">Project started</span>${startFmt}</div>
            <div style="display:flex;gap:0"><span style="font-family:'Courier New',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:${T.textTertiary};width:120px;flex-shrink:0;padding-top:1px">Convergence</span>${convFmt || '<em>In progress</em>'}</div>
            ${projOwner ? `<div style="display:flex;gap:0"><span style="font-family:'Courier New',monospace;font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:${T.textTertiary};width:120px;flex-shrink:0;padding-top:1px">Owner</span>${escHtml(projOwner)}</div>` : ''}
          </div>
        </div>
        ${pageFooter()}`;
    }

    // ── GOAL STATEMENT ──
    if (inc.tbuw) {
      const rptCallout = (content) => `<div style="border-left:3px solid ${T.calloutBorder};padding:12px 16px;background:${T.calloutBg};border-radius:0 5px 5px 0;font-size:13px;color:${T.textPrimary};line-height:1.55">${content}</div>`;
      if (goalMode === 'basic') {
        const basicGoal = document.getElementById('input-goal-basic')?.value || '';
        sections += rptSection(++sn, 'Goal Statement',
          basicGoal ? rptCallout(escHtml(basicGoal)) : `<p style="color:${T.textTertiary}"><em>No goal statement entered.</em></p>`,
          true, T);
      } else {
        const to    = document.getElementById('input-to')?.value    || '';
        const by    = document.getElementById('input-by')?.value    || '';
        const using = document.getElementById('input-using')?.value || '';
        const wh    = document.getElementById('input-while')?.value || '';
        const rows  = [['TO', to],['BY', by],['USING', using],['WHILE', wh]]
          .map(([label, val]) => `<tr>
            <td style="font-family:'Courier New',monospace;font-size:11px;font-weight:700;color:${T.textTertiary};white-space:nowrap;width:60px;padding:7px 10px;border-bottom:1px solid ${T.tblBorder};vertical-align:top">${label}</td>
            <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};color:${T.textPrimary};font-size:13px">${escHtml(val) || `<em style="color:${T.textTertiary}">—</em>`}</td>
          </tr>`).join('');
        const preview = [to && 'To ' + to, by && 'by ' + by, using && 'using ' + using, wh && 'while ' + wh].filter(Boolean).join(' ');
        sections += rptSection(++sn, 'Goal Statement',
          `<table style="width:100%;border-collapse:collapse;margin-bottom:16px">${rows}</table>` +
          (preview ? rptCallout(`<strong>Full statement:</strong> ${escHtml(preview)}.`) : ''),
          true, T);
      }
    }

    // ── LIFECYCLE PROPERTIES ──
    if (inc.ilty) {
      const chips = selIlities.map((il, idx) => {
        const borderColor = T.cardColors[idx % T.cardColors.length];
        const desc = (il.desc || '').substring(0, 80) + ((il.desc||'').length > 80 ? '…' : '');
        return `<div class="avoid-break" style="border:1px solid ${T.cardBorder};border-left:3px solid ${borderColor};border-radius:0 6px 6px 0;padding:11px 14px;background:${T.cardBg}">
          <div style="font-size:12px;font-weight:700;color:${T.textPrimary};margin-bottom:3px">${escHtml(il.name)}</div>
          <div style="font-size:11px;color:${T.textSecondary};line-height:1.4">${escHtml(desc)}</div>
        </div>`;
      }).join('');
      sections += rptSection(++sn, `Lifecycle Properties (${selIlities.length})`,
        selIlities.length
          ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">${chips}</div>`
          : `<p style="color:${T.textTertiary}"><em>No lifecycle properties selected.</em></p>`,
        true, T);
    }

    // ── STAKEHOLDERS ──
    if (inc.stak) {
      const chips = selStakeholders.map((s, idx) => {
        const borderColor = T.cardColors[idx % T.cardColors.length];
        const desc = (s.desc || '').substring(0, 80) + ((s.desc||'').length > 80 ? '…' : '');
        return `<div class="avoid-break" style="border:1px solid ${T.cardBorder};border-left:3px solid ${borderColor};border-radius:0 6px 6px 0;padding:11px 14px;background:${T.cardBg}">
          <div style="font-size:12px;font-weight:700;color:${T.textPrimary};margin-bottom:3px">${escHtml(s.name)}</div>
          <div style="font-size:11px;color:${T.textSecondary};line-height:1.4">${escHtml(desc)}</div>
        </div>`;
      }).join('');
      sections += rptSection(++sn, `Stakeholders (${selStakeholders.length})`,
        selStakeholders.length
          ? `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px">${chips}</div>`
          : `<p style="color:${T.textTertiary}"><em>No stakeholders selected.</em></p>`,
        true, T);
    }

    // ── REQUIREMENTS ──
    if (inc.reqs) {
      const rows = requirements.map((r, idx) => {
        const ilName = allIlities.find(i => i.id === r.primary)?.name || r.primary || '—';
        const scorer = r.scorer
          ? (allStakeholders.find(s => s.id === r.scorer)?.name || r.scorer)
          : (r.stakeholders && r.stakeholders.length
              ? (allStakeholders.find(s => s.id === r.stakeholders[0])?.name || r.stakeholders[0])
              : '—');
        const rowBg = idx % 2 === 1 ? T.tblRowAlt : T.bodyBg;
        return `<tr style="background:${rowBg}">
          <td style="white-space:nowrap;color:${T.textTertiary};font-size:11px;padding:7px 10px;border-bottom:1px solid ${T.tblBorder}">${idx + 1}</td>
          <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};color:${T.textPrimary}">${escHtml(r.text || '')}</td>
          <td style="white-space:nowrap;font-size:11px;padding:7px 10px;border-bottom:1px solid ${T.tblBorder};color:${T.textSecondary}">${escHtml(ilName)}</td>
          <td style="white-space:nowrap;font-size:11px;padding:7px 10px;border-bottom:1px solid ${T.tblBorder};color:${T.textSecondary}">${escHtml(scorer)}</td>
        </tr>`;
      }).join('');

      // ── Coverage charts (conditional on inc.cov) ──
      let covCharts = '';
      if (inc.cov && requirements.length > 0) {
        const ilAll = [...selIlities];
        if (requirements.some(r => r.primary === 'other')) ilAll.push({ id: 'other', name: 'Other' });
        const ilCounts = {};
        ilAll.forEach(il => { ilCounts[il.id] = 0; });
        requirements.forEach(r => {
          if (ilCounts[r.primary] !== undefined) ilCounts[r.primary]++;
          (r.secondaries || []).forEach(s => { if (ilCounts[s] !== undefined) ilCounts[s]++; });
        });
        const ilMax   = Math.max(...Object.values(ilCounts), 1);
        const ilTotal = requirements.length;
        const ilRows  = ilAll.map(il => {
          const count = ilCounts[il.id] || 0;
          const pct   = Math.round((count / ilMax) * 100);
          const conc  = ilTotal > 0 && count / ilTotal > 0.45;
          const barColor = conc ? T.covBarConc : T.covBarPos;
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;font-size:11px">
            <div style="width:120px;flex-shrink:0;color:${T.textSecondary};white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${escHtml(il.name)}">${escHtml(il.name)}</div>
            <div style="flex:1;height:10px;background:${T.barPosBg};border-radius:3px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${barColor};border-radius:3px"></div></div>
            <div style="width:18px;text-align:right;font-weight:700;color:${T.textSecondary}">${count}</div>
          </div>`;
        }).join('');
        const skCounts = {};
        selStakeholders.forEach(s => { skCounts[s.id] = 0; });
        requirements.forEach(r => {
          (r.stakeholders || []).forEach(sid => { if (skCounts[sid] !== undefined) skCounts[sid]++; });
        });
        const skMax  = Math.max(...Object.values(skCounts), 1);
        const skRows = selStakeholders.map(s => {
          const count = skCounts[s.id] || 0;
          const pct   = Math.round((count / skMax) * 100);
          return `<div style="display:flex;align-items:center;gap:8px;margin-bottom:7px;font-size:11px">
            <div style="width:120px;flex-shrink:0;color:${T.textSecondary};white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${escHtml(s.name)}">${escHtml(s.name)}</div>
            <div style="flex:1;height:10px;background:${T.barPosBg};border-radius:3px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${T.covBarPos};border-radius:3px"></div></div>
            <div style="width:18px;text-align:right;font-weight:700;color:${T.textSecondary}">${count}</div>
          </div>`;
        }).join('');
        const covLabel = (txt) => `<div style="font-family:'Courier New',monospace;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${T.subheadColor};margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid ${T.secBorder}">${txt}</div>`;
        covCharts = `<div style="display:flex;gap:24px;margin-top:24px">
          ${ilAll.length  ? `<div style="flex:1;min-width:0">${covLabel('Coverage by Lifecycle Property')}${ilRows}</div>` : ''}
          ${selStakeholders.length ? `<div style="flex:1;min-width:0">${covLabel('Coverage by Stakeholder')}${skRows}</div>` : ''}
        </div>`;
      }

      // ── RTMs ──
      let covRtms = '';
      if (inc.rtm && requirements.length > 0) {
        const _re = s => String(s || '').replace(/[&<>"]/g, c =>
          ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

        const buildPdfRtm = (reqs, cols, hasRelation, title) => {
          if (!cols.length) return '';
          let h = `<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:${T.subheadColor};margin:28px 0 10px;padding-bottom:6px;border-bottom:1px solid ${T.secBorder};page-break-before:always">${title}</div>`;
          h += `<div style="overflow-x:auto"><table style="border-collapse:collapse;font-size:10px"><thead><tr>`;
          h += `<th style="padding:2px 6px 4px;min-width:24px;vertical-align:bottom;text-align:right;font-size:9px;color:${T.textTertiary}">#</th>`;
          h += `<th style="min-width:180px;max-width:280px;padding:2px 8px 4px;vertical-align:bottom;font-size:10px;color:${T.textTertiary}">Requirement</th>`;
          cols.forEach(col => {
            h += `<th style="padding:0;width:18px;vertical-align:bottom" title="${_re(col.name)}"><div style="writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-height:90px;font-size:9px;color:${T.textSecondary};padding:2px 3px;display:block">${_re(col.name)}</div></th>`;
          });
          h += '</tr></thead><tbody>';
          reqs.forEach((req, idx) => {
            const rowBg = idx % 2 === 1 ? T.tblRowAlt : T.bodyBg;
            h += `<tr style="background:${rowBg}">`;
            h += `<td style="text-align:right;color:${T.textTertiary};font-size:9px;padding:2px 6px;min-width:24px">${idx + 1}</td>`;
            const txt   = req.text || '';
            const short = txt.length > 80 ? txt.substring(0, 80) + '…' : txt;
            h += `<td style="font-size:10px;padding:2px 8px;max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${T.textPrimary}" title="${_re(txt)}">${_re(short)}</td>`;
            cols.forEach(col => {
              const filled = hasRelation(req, col);
              h += `<td style="width:18px;height:16px;padding:0;text-align:center;vertical-align:middle;border:1px solid ${T.tblBorder};background:${filled ? T.rtmFill : 'transparent'}">`;
              if (filled) h += `<span style="display:block;width:8px;height:8px;background:${T.rtmDot};border-radius:1px;margin:auto"></span>`;
              h += '</td>';
            });
            h += '</tr>';
          });
          h += '</tbody></table></div>';
          return h;
        };

        const ilCols  = [...selIlities].sort((a, b) => a.name.localeCompare(b.name));
        if (requirements.some(r => r.primary === 'other')) ilCols.push({ id: 'other', name: 'Other' });
        const skCols   = [...selStakeholders].sort((a, b) => a.name.localeCompare(b.name));
        const allTagArr = [...new Set(requirements.flatMap(r => r.tags || []))].sort();
        const tagCols   = allTagArr.map(t => ({ id: t, name: t }));

        covRtms += buildPdfRtm(requirements, ilCols,
          (req, col) => req.primary === col.id || (req.secondaries || []).includes(col.id),
          'Traceability — Lifecycle Properties');
        covRtms += buildPdfRtm(requirements, skCols,
          (req, col) => (req.stakeholders || []).includes(col.id),
          'Traceability — Stakeholders');
        if (tagCols.length) {
          covRtms += buildPdfRtm(requirements, tagCols,
            (req, col) => (req.tags || []).includes(col.id),
            'Traceability — Tags');
        }
      }

      const tblHead = `<thead><tr>
        <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:left;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700">#</th>
        <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:left;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700">Requirement</th>
        <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:left;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700">Lifecycle Property</th>
        <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:left;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700">Scorer</th>
      </tr></thead>`;
      sections += rptSection(++sn, `Requirements (${requirements.length})`,
        requirements.length
          ? `<table style="width:100%;border-collapse:collapse;font-size:12px">${tblHead}<tbody>${rows}</tbody></table>${covCharts}${covRtms}`
          : `<p style="color:${T.textTertiary}"><em>No requirements defined.</em></p>`,
        true, T);
    }

    // ── PAIRWISE RANKINGS ──
    if (inc.pair) {
      const wins = {};
      selIlities.forEach(i => { wins[i.id] = 0; });
      Object.entries(pairComparisons).forEach(([, winner]) => {
        if (wins[winner] !== undefined) wins[winner]++;
      });
      const allEqual = Object.keys(pairComparisons).length === 0;

      let pairContent;
      if (allEqual) {
        pairContent = `<div style="border-left:3px solid ${T.textTertiary};padding:12px 16px;background:${T.calloutBg};border-radius:0 5px 5px 0;font-size:13px;color:${T.textPrimary}">
          <strong>Equal weighting applied</strong> — No pairwise comparisons were recorded. All ${selIlities.length} lifecycle properties carry equal weight.
        </div>`;
      } else {
        const ranked = selIlities.map(i => ({ name: i.name, wins: wins[i.id] || 0 })).sort((a, b) => b.wins - a.wins);
        const pairRows = ranked.map((r, i) => {
          const bg = i % 2 === 1 ? T.tblRowAlt : T.bodyBg;
          return `<tr style="background:${bg}">
            <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};color:${T.textTertiary};font-size:11px">${i + 1}</td>
            <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};color:${T.textPrimary}">${escHtml(r.name)}</td>
            <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};color:${T.textPrimary};font-weight:700">${r.wins}</td>
          </tr>`;
        }).join('');
        const pairHead = `<thead><tr>
          <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:left;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700">Rank</th>
          <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:left;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700">Lifecycle Property</th>
          <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:left;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700">Win Count</th>
        </tr></thead>`;
        pairContent = `<table style="width:100%;border-collapse:collapse;font-size:12px">${pairHead}<tbody>${pairRows}</tbody></table>`;
      }
      sections += rptSection(++sn, 'Weightings', pairContent, true, T);
    }

    // ── CONCEPT SCORING SUMMARY ──
    const scoringTblHead = (extraCols='') => `<thead><tr>
      <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:left;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700">Concept</th>
      <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:center;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700;width:40px">+</th>
      <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:center;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700;width:40px">−</th>
      <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:center;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700;width:40px">0</th>
      <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:right;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700;width:80px">Net Score</th>
      ${extraCols}
    </tr></thead>`;

    const makeBarRows = (list, maxNet) => list.map((s, i) => {
      const pct       = Math.max(Math.round((Math.abs(s.net) / maxNet) * 100), 2);
      const barColors = [T.barPos1, T.barPos2, T.barPos3];
      const barColor  = s.net < 0 ? T.barNeg : (barColors[i] || T.barPos3);
      const scoreColor= s.net > 0 ? T.barPosText : s.net < 0 ? T.barNegText : T.textTertiary;
      const rankCircleBg = i === 0 ? T.barPos1 : i === 1 ? T.barPos2 : i === 2 ? T.barPos3 : T.cardBg;
      const rankCircleTx = i < 3 ? T.winnerBg : T.textTertiary;
      return `<div class="avoid-break" style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="width:26px;height:26px;border-radius:50%;background:${rankCircleBg};border:1px solid ${T.cardBorder};display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <span style="font-size:11px;font-weight:700;color:${rankCircleTx}">${i+1}</span>
        </div>
        <div style="width:180px;flex-shrink:0;font-size:11px;font-weight:${i===0?'700':'400'};color:${T.textPrimary};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(s.c.name)}</div>
        <div style="flex:1;background:${T.barPosBg};border-radius:3px;height:13px;overflow:hidden">
          <div style="width:${pct}%;height:100%;background:${barColor};border-radius:3px"></div>
        </div>
        <div style="font-size:12px;font-weight:700;color:${scoreColor};width:36px;text-align:right">${s.net >= 0 ? '+' : ''}${s.net}</div>
      </div>`;
    }).join('');

    if (inc.scor) {
      if (!pughConcepts.length) {
        sections += rptSection(++sn, 'Concept Score Summary', `<p style="color:${T.textTertiary}"><em>No concepts defined.</em></p>`, true, T);
      } else {
        // Which concepts to show in table (filter if focus + filter charts active)
        const tableList = (focusIds.size > 0 && focusFilterCharts)
          ? conceptStats.filter(s => s.isDatum || focusIds.has(String(s.c.id)))
          : conceptStats;

        const rows = tableList.map(({ c, plus, minus, zero, net, isDatum }, rowIdx) => {
          const isWin = selConcept && String(c.id) === String(convSelectedConceptId);
          const bg = isWin ? T.winnerBg : (rowIdx % 2 === 1 ? T.tblRowAlt : T.bodyBg);
          const netColor = isDatum ? T.textTertiary : (net > 0 ? T.barPosText : net < 0 ? T.barNegText : T.textTertiary);
          const rankDisp = isDatum ? '<span style="font-family:\'Courier New\',monospace;font-size:9px;padding:1px 5px;background:'+T.cardBg+';color:'+T.textTertiary+';border-radius:3px;border:1px solid '+T.cardBorder+'">Datum</span>'
            : `<span style="font-weight:700;color:${T.textPrimary}">#${rankMap[c.id]}</span>`;
          return `<tr style="background:${bg}">
            <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};color:${isWin ? T.winnerText : T.textPrimary};font-weight:${isWin?'700':'400'}">${escHtml(c.name)}</td>
            <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};text-align:center;color:${T.barPosText};font-weight:700">${isDatum ? '—' : plus}</td>
            <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};text-align:center;color:${T.barNegText};font-weight:700">${isDatum ? '—' : minus}</td>
            <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};text-align:center;color:${T.textTertiary}">${isDatum ? '—' : zero}</td>
            <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};text-align:right;font-weight:700;color:${netColor}">${isDatum ? '—' : (net >= 0 ? '+' : '') + net}</td>
            <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};text-align:center">${rankDisp}</td>
          </tr>`;
        }).join('');

        const chartList = (focusIds.size > 0 && focusFilterCharts)
          ? rankedConcepts.filter(s => focusIds.has(String(s.c.id)))
          : rankedConcepts;
        const top5 = chartList.slice(0, 5);
        const maxNet = Math.max(...top5.map(s => Math.abs(s.net)), 1);

        const subhead = (txt) => `<div style="font-size:10px;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:0.1em;color:${T.subheadColor};margin:24px 0 12px;padding-bottom:7px;border-bottom:1px solid ${T.secBorder}">${txt}</div>`;

        const _scoreSvg = buildConceptScoreChartSvg(T);
        const chartBlock = _scoreSvg ? `
          <div style="border:1px solid ${T.cardBorder};border-radius:6px;overflow:hidden;margin-bottom:20px;-webkit-print-color-adjust:exact;print-color-adjust:exact">
            ${_scoreSvg}
          </div>` : '';

        sections += rptSection(++sn, `Concept Score Summary (${pughConcepts.length - 1} concepts + datum)`,
          `${chartBlock}
          <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:4px">
            ${scoringTblHead(`<th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:center;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700;width:50px">Rank</th>`)}
            <tbody>${rows}</tbody>
          </table>
          ${top5.length ? subhead(`Top ${top5.length} concepts by net score${focusIds.size > 0 && focusFilterCharts ? ' (filtered to focus concepts)' : ''}`) + makeBarRows(top5, maxNet) : ''}`,
          true, T);
      }
    }

    // ── CONCEPT RANKINGS CHART ──
    if (inc.pugh) {
      if (!pughConcepts.length || !requirements.length) {
        sections += rptSection(++sn, 'Concept Rankings', `<p style="color:${T.textTertiary}"><em>No concepts or requirements to display.</em></p>`, true, T);
      } else {
        const displayList = (focusIds.size > 0 && focusFilterCharts)
          ? rankedConcepts.filter(s => focusIds.has(String(s.c.id)))
          : rankedConcepts;
        const maxAbsNet = Math.max(...displayList.map(s => Math.abs(s.net)), 1);
        const DATUM     = conceptStats[0];

        const bars = displayList.map((s, i) => {
          const pctPos  = s.net >= 0 ? Math.round((s.net  / maxAbsNet) * 50) : 0;
          const pctNeg  = s.net < 0  ? Math.round((-s.net / maxAbsNet) * 50) : 0;
          const isWinner= selConcept && String(s.c.id) === String(convSelectedConceptId);
          const rowBg   = isWinner ? T.winnerBg : (i % 2 === 1 ? T.tblRowAlt : T.bodyBg);
          const netColor= s.net > 0 ? T.barPosText : s.net < 0 ? T.barNegText : T.textTertiary;
          return `<div class="avoid-break" style="display:flex;align-items:center;gap:10px;padding:7px 12px;border-bottom:1px solid ${T.tblBorder};background:${rowBg};font-size:11px">
            <div style="width:22px;text-align:center;font-weight:700;color:${T.textTertiary};font-size:10px;flex-shrink:0">${i + 1}</div>
            <div style="width:200px;flex-shrink:0;font-weight:${isWinner?'700':'400'};color:${isWinner ? T.winnerText : T.textPrimary};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(s.c.name)}${isWinner ? ` <span style="font-size:9px;background:${T.winnerText};color:${T.winnerBg};padding:1px 5px;border-radius:3px;margin-left:4px">Selected</span>` : ''}</div>
            <div style="flex:1;display:flex;height:12px;background:${T.barPosBg};border-radius:3px;overflow:hidden">
              <div style="width:${pctNeg}%;background:${T.barNeg};border-radius:3px 0 0 3px"></div>
              <div style="width:${pctPos}%;background:${T.barPos1};border-radius:0 3px 3px 0"></div>
            </div>
            <div style="width:40px;text-align:right;font-weight:700;color:${netColor};flex-shrink:0">${s.net >= 0 ? '+' : ''}${s.net}</div>
          </div>`;
        }).join('');

        const datumRow = `<div style="display:flex;align-items:center;gap:10px;padding:7px 12px;border-bottom:2px solid ${T.accentLine};background:${T.datumBg};font-size:11px">
          <div style="width:22px;text-align:center;font-family:'Courier New',monospace;font-size:10px;color:${T.datumText};flex-shrink:0">D</div>
          <div style="width:200px;flex-shrink:0;color:${T.datumText};font-style:italic">${escHtml(DATUM.c.name)} <span style="font-size:9px;background:${T.cardBg};color:${T.textTertiary};padding:1px 5px;border-radius:3px;border:1px solid ${T.cardBorder}">Datum</span></div>
          <div style="flex:1;display:flex;height:12px;background:${T.barPosBg};border-radius:3px;overflow:hidden">
            <div style="width:50%;border-right:2px dashed ${T.datumText}"></div>
          </div>
          <div style="width:40px;text-align:right;color:${T.datumText};font-size:10px;flex-shrink:0">Baseline</div>
        </div>`;

        const top5b = displayList.slice(0, 5);
        const t5rows = top5b.map(s => {
          const isWinner = selConcept && String(s.c.id) === String(convSelectedConceptId);
          const bg = isWinner ? T.winnerBg : T.bodyBg;
          return `<tr style="background:${bg}">
            <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};font-weight:700;color:${T.textPrimary}">#${rankMap[s.c.id]}</td>
            <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};color:${isWinner ? T.winnerText : T.textPrimary};font-weight:${isWinner?'700':'400'}">${escHtml(s.c.name)}</td>
            <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};text-align:center;color:${T.barPosText};font-weight:700">${s.plus}</td>
            <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};text-align:center;color:${T.barNegText};font-weight:700">${s.minus}</td>
            <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};text-align:center;color:${T.textTertiary}">${s.zero}</td>
            <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};text-align:right;font-weight:700;color:${s.net>0?T.barPosText:s.net<0?T.barNegText:T.textTertiary}">${s.net>=0?'+':''}${s.net}</td>
          </tr>`;
        }).join('');
        const t5Head = `<thead><tr>
          <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:left;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700">Rank</th>
          <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:left;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700">Concept</th>
          <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:center;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700">+</th>
          <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:center;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700">−</th>
          <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:center;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700">0</th>
          <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:right;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700">Net Score</th>
        </tr></thead>`;

        const subhead2 = (txt) => `<div style="font-size:10px;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:0.1em;color:${T.subheadColor};margin:28px 0 10px;padding-bottom:7px;border-bottom:1px solid ${T.secBorder};page-break-before:always">${txt}</div>`;

        sections += rptSection(++sn, `Concept Rankings — ${displayList.length} Concepts vs. Datum`,
          `<div style="border:1px solid ${T.tblBorder};border-radius:6px;overflow:hidden;margin-bottom:28px">
            ${datumRow}${bars}
          </div>
          ${subhead2('Top ' + top5b.length + ' breakdown')}
          <table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:4px">
            ${t5Head}<tbody>${t5rows}</tbody>
          </table>`,
          true, T);
      }
    }

    // ── CONVERGENCE SUMMARY ──
    if (inc.conv) {
      const convSubhead = (txt) => `<div style="font-size:10px;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:0.1em;color:${T.subheadColor};margin:22px 0 10px;padding-bottom:6px;border-bottom:1px solid ${T.secBorder}">${txt}</div>`;
      let cHtml = '';

      if (convClosedAt) {
        const fmt = new Date(convClosedAt).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' });
        cHtml += `<div style="display:inline-block;background:${T.winnerBg};border:1px solid ${T.winnerBorder};border-radius:4px;padding:8px 14px;font-size:11px;font-weight:700;color:${T.winnerText};margin-bottom:18px;font-family:'Courier New',monospace;letter-spacing:0.05em">✓ Convergence logged: ${fmt}</div>`;
      }

      if (selConcept) {
        cHtml += `<div style="border:1px solid ${T.winnerBorder};border-radius:6px;padding:15px 18px;background:${T.winnerBg};margin-bottom:20px">
          <div style="font-size:10px;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:0.1em;color:${T.winnerText};margin-bottom:4px">Selected Concept</div>
          <div style="font-size:20px;font-weight:700;color:${T.winnerText}">${escHtml(selConcept.name)}</div>
        </div>`;
      }

      if (convRationale) {
        cHtml += convSubhead('Decision Rationale') + `<p style="color:${T.textPrimary};line-height:1.6">${escHtml(convRationale)}</p>`;
      }

      const lessonDefs = [
        ['req',        'Requirements — What did you learn?'],
        ['concepts',   'Concepts — What was surprising?'],
        ['assumption', 'Critical Assumptions'],
        ['different',  'What would you do differently?'],
      ];
      const hasLessons = lessonDefs.some(([key]) => convLessons[key]);
      if (hasLessons) {
        cHtml += convSubhead('Lessons Learned');
        cHtml += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">`;
        lessonDefs.forEach(([key, label]) => {
          if (convLessons[key]) {
            cHtml += `<div style="border:1px solid ${T.cardBorder};border-radius:6px;padding:12px 14px;background:${T.cardBg}">
              <div style="font-size:9px;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:0.1em;color:${T.textTertiary};margin-bottom:5px">${label}</div>
              <p style="margin:0;font-size:12px;color:${T.textPrimary};line-height:1.5">${escHtml(convLessons[key])}</p>
            </div>`;
          }
        });
        cHtml += `</div>`;
      }

      if (convRisks) {
        cHtml += convSubhead('Open Risks') + `<p style="white-space:pre-line;color:${T.textPrimary};font-size:12px;line-height:1.6">${escHtml(convRisks)}</p>`;
      }

      if (convNextSteps && convNextSteps.length) {
        const nsHead = `<thead><tr>
          <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:left;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700">Action</th>
          <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:left;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700;white-space:nowrap">Owner</th>
          <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:left;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700;white-space:nowrap">Due</th>
        </tr></thead>`;
        const nsRows = convNextSteps.map((s, i) => {
          const bg = i % 2 === 1 ? T.tblRowAlt : T.bodyBg;
          return `<tr style="background:${bg}">
            <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};color:${T.textPrimary}">${escHtml(s.what || '')}</td>
            <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};white-space:nowrap;color:${T.textSecondary}">${escHtml(s.who || '')}</td>
            <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};white-space:nowrap;color:${T.textSecondary}">${escHtml(s.when || '')}</td>
          </tr>`;
        }).join('');
        cHtml += convSubhead('Next Steps') + `<table style="width:100%;border-collapse:collapse;font-size:12px">${nsHead}<tbody>${nsRows}</tbody></table>`;
      }

      if (!cHtml) cHtml = `<p style="color:${T.textTertiary}"><em>Convergence section not yet completed.</em></p>`;

      sections += rptSection(++sn, 'Convergence Summary', cHtml, true, T);
    }

    // ── FOCUS CONCEPTS DEEP DIVE ──
    if (focusIds.size > 0) {
      const focusList = rankedConcepts.filter(s => focusIds.has(String(s.c.id)));

      // Head-to-head comparison when 2+ selected
      if (focusList.length >= 2) {
        const h2hHead = `<thead><tr>
          <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:left;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700">#</th>
          <th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:left;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700">Requirement</th>
          ${focusList.map(s => `<th style="background:${T.tblHeadBg};color:${T.tblHeadText};padding:8px 10px;text-align:center;font-size:10px;letter-spacing:0.06em;text-transform:uppercase;font-weight:700">${escHtml(s.c.name.substring(0,18))}${s.c.name.length>18?'…':''}</th>`).join('')}
        </tr></thead>`;
        const h2hRows = requirements.map((r, idx) => {
          const bg = idx % 2 === 1 ? T.tblRowAlt : T.bodyBg;
          const cells = focusList.map(s => {
            const v = pughScores[s.c.id + '_' + r.id];
            const col = v === '+' ? T.barPosText : v === '-' ? T.barNegText : T.textTertiary;
            return `<td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};text-align:center;font-weight:700;color:${col}">${v === '+' ? '+' : v === '-' ? '−' : '0'}</td>`;
          }).join('');
          return `<tr style="background:${bg}">
            <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};color:${T.textTertiary};font-size:11px">${idx+1}</td>
            <td style="padding:7px 10px;border-bottom:1px solid ${T.tblBorder};color:${T.textPrimary};font-size:12px">${escHtml(r.text||'')}</td>
            ${cells}
          </tr>`;
        }).join('');
        sections += rptSection(++sn, 'Head-to-Head Comparison',
          `<table style="width:100%;border-collapse:collapse;font-size:12px">${h2hHead}<tbody>${h2hRows}</tbody></table>`,
          true, T);
      }

      // Per-concept deep dive pages
      focusList.forEach(s => {
        const rank = rankMap[s.c.id];
        const isSelected = selConcept && String(s.c.id) === String(convSelectedConceptId);
        const winRate = requirements.length ? Math.round((s.plus / requirements.length) * 100) : 0;

        // Top wins and losses
        const wins  = requirements.filter(r => pughScores[s.c.id + '_' + r.id] === '+').slice(0, 5);
        const losses= requirements.filter(r => pughScores[s.c.id + '_' + r.id] === '-').slice(0, 5);

        const reqMiniRows = (list, color) => list.map((r, i) => {
          const ilName = allIlities.find(il => il.id === r.primary)?.name || '—';
          return `<tr><td style="padding:6px 8px;border-bottom:1px solid ${T.tblBorder};color:${color};font-size:10px;width:14px;font-weight:700">${pughScores[s.c.id + '_' + r.id] === '+' ? '+' : '−'}</td>
            <td style="padding:6px 8px;border-bottom:1px solid ${T.tblBorder};font-size:11px;color:${T.textPrimary}">${escHtml(r.text||'')}</td>
            <td style="padding:6px 8px;border-bottom:1px solid ${T.tblBorder};font-size:10px;color:${T.textTertiary};white-space:nowrap">${escHtml(ilName)}</td>
          </tr>`;
        }).join('');

        // Auto-generated "why" text
        const topIl = (() => {
          const ilWins = {};
          requirements.forEach(r => { if (pughScores[s.c.id+'_'+r.id]==='+') { ilWins[r.primary] = (ilWins[r.primary]||0)+1; } });
          const best = Object.entries(ilWins).sort((a,b)=>b[1]-a[1])[0];
          return best ? allIlities.find(il=>il.id===best[0])?.name : null;
        })();
        const whySummary = `Ranked <strong>#${rank}</strong> of ${rankedConcepts.length} concepts. Net score: <strong>${s.net>=0?'+':''}${s.net}</strong> (${s.plus} wins · ${s.minus} losses · ${s.zero} ties). Win rate vs. datum: <strong>${winRate}%</strong>.${topIl ? ` Strongest area: <strong>${escHtml(topIl)}</strong>.` : ''}${isSelected ? ` <span style="background:${T.winnerBg};color:${T.winnerText};padding:1px 6px;border-radius:3px;border:1px solid ${T.winnerBorder};font-size:11px">Selected concept</span>` : ''}`;

        sections += rptSection(++sn, `Deep Dive: ${escHtml(s.c.name)}`,
          `<div style="border-left:3px solid ${T.accentLine};padding:11px 16px;background:${T.calloutBg};border-radius:0 5px 5px 0;margin-bottom:18px;font-size:13px;color:${T.textPrimary};line-height:1.6">${whySummary}</div>
          <div style="display:flex;gap:24px;margin-bottom:20px">
            ${[['Net Score', (s.net>=0?'+':'')+s.net, T.barPosText],['Wins',s.plus,T.barPosText],['Losses',s.minus,T.barNegText],['Ties',s.zero,T.textTertiary],['Rank','#'+rank,T.textPrimary]].map(([label,val,color])=>`
              <div style="flex:1;background:${T.cardBg};border:1px solid ${T.cardBorder};border-radius:6px;padding:12px 8px;text-align:center">
                <div style="font-size:20px;font-weight:700;color:${color};line-height:1;margin-bottom:4px">${val}</div>
                <div style="font-size:9px;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:0.08em;color:${T.textTertiary}">${label}</div>
              </div>`).join('')}
          </div>
          ${wins.length ? `<div style="font-size:10px;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:0.1em;color:${T.subheadColor};margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid ${T.secBorder}">Top wins vs. datum</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:18px"><tbody>${reqMiniRows(wins,T.barPosText)}</tbody></table>` : ''}
          ${losses.length ? `<div style="font-size:10px;font-family:'Courier New',monospace;text-transform:uppercase;letter-spacing:0.1em;color:${T.subheadColor};margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid ${T.secBorder}">Top losses vs. datum</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px"><tbody>${reqMiniRows(losses,T.barNegText)}</tbody></table>` : ''}`,
          true, T);
      });
    }

    // ── BUILD DOCUMENT ──
    const coverBorderStyle = themeVal === 'bw' ? `border:2px solid ${T.coverAccent}` : '';
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>${escHtml(exportFileName)}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Playfair+Display:wght@700&display=swap');
  @page { size: portrait; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, 'Helvetica Neue', sans-serif; color: ${T.textPrimary}; background: ${T.bodyBg}; font-size: 13px; line-height: 1.65; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .section { padding: 32px 48px; border-bottom: 1px solid ${T.secBorder}; background: ${T.bodyBg}; }
  .section.page-break { page-break-before: always; break-before: page; }
  .section:last-of-type { border-bottom: none; }
  p { margin-bottom: 10px; color: ${T.textPrimary}; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  thead { display: table-header-group; }
  .avoid-break { page-break-inside: avoid; break-inside: avoid; }
  .rpt-fixed-footer { display: none; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page-break { page-break-before: always; break-before: page; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    thead { display: table-header-group; }
    .avoid-break { page-break-inside: avoid; break-inside: avoid; }
    .rpt-fixed-footer {
      display: flex !important; position: fixed; bottom: 0; left: 0; right: 0;
      background: ${T.footerBg}; border-top: 1px solid ${T.stripBorder};
      padding: 6px 48px; justify-content: space-between; align-items: center;
      font-family: 'Courier New', monospace; font-size: 9px; color: ${T.footerText};
      letter-spacing: 0.05em; z-index: 9999;
      -webkit-print-color-adjust: exact; print-color-adjust: exact;
    }
    .rpt-page-num::before { content: "p." counter(page); }
  }
</style>
</head>
<body>

<!-- Fixed print footer: appears on every printed page -->
<div class="rpt-fixed-footer">
  <span>Controlled Convergence &nbsp;·&nbsp; www.controlledconvergence.com &nbsp;·&nbsp; Pro Report</span>
  <span class="rpt-page-num"></span>
  <span>${dateStr}</span>
</div>

<!-- COVER -->
<div style="background:${T.coverBg};min-height:100vh;page-break-after:always;break-after:page;display:flex;flex-direction:column;${coverBorderStyle}">
  <div style="padding:56px 56px 0;flex:1">
    <div style="font-size:10px;letter-spacing:0.18em;color:${T.coverAccent};font-family:'Courier New',monospace;margin-bottom:36px;text-transform:uppercase">Design Analysis Report</div>
    <div style="font-size:34px;font-weight:700;color:${T.coverText};line-height:1.15;max-width:480px;margin-bottom:18px;font-family:'Playfair Display','Georgia',serif">${escHtml(projName)}</div>
    <div style="width:36px;height:2px;background:${T.coverRule};margin-bottom:28px"></div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:48px">
      ${projOwner ? `<div style="display:flex;gap:0"><span style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.1em;color:${T.coverMeta};width:100px;flex-shrink:0;padding-top:1px;text-transform:uppercase">Owner</span><span style="font-size:12px;color:${T.coverSub}">${escHtml(projOwner)}</span></div>` : ''}
      ${projDesc  ? `<div style="display:flex;gap:0"><span style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.1em;color:${T.coverMeta};width:100px;flex-shrink:0;padding-top:1px;text-transform:uppercase">Description</span><span style="font-size:12px;color:${T.coverSub};max-width:400px">${escHtml(projDesc)}</span></div>` : ''}
      <div style="display:flex;gap:0"><span style="font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.1em;color:${T.coverMeta};width:100px;flex-shrink:0;padding-top:1px;text-transform:uppercase">Generated</span><span style="font-size:12px;color:${T.coverSub}">${dateStr}</span></div>
    </div>
  </div>
  <div style="padding:14px 56px;border-top:1px solid ${T.stripBorder};display:flex;justify-content:space-between;align-items:center">
    <span style="font-family:'Courier New',monospace;font-size:12px;color:${T.coverUrl};letter-spacing:0.06em">www.controlledconvergence.com</span>
    <span style="font-family:'Courier New',monospace;font-size:10px;color:${T.coverBadgeTx};background:${T.coverBadgeBg};padding:3px 10px;border-radius:4px;border:1px solid ${T.coverBadgeBd};letter-spacing:0.08em">Pro Report</span>
  </div>
</div>

${sections}

<script>window.onload = function() { window.print(); };<\/script>
</body>
</html>`;

    const win = window.open('', '_blank');
    if (!win) { alert('Please allow pop-ups for this page to generate the report.'); return; }
    win.document.write(html);
    win.document.close();
  }




  function handleCoachingClick() {
    if (!userTierMeets('pro')) {
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
    if (method === 'forcedrank' && userTier === 'free') {
      showUpgradePrompt('forcedrank');
      return;
    }
    pairMethod = method;
    btn.closest('.pair-mode-toggle').querySelectorAll('.pair-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (method === 'forcedrank') initForcedRankOrder();
    syncPairView();
    // Keep Pugh matrix in sync when method changes (affects weight computation)
    if (typeof renderPughMatrix === 'function') renderPughMatrix();
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

  // action: 'signup' → opens the free account signup modal
  // action: 'pro'    → calls handleProUpgrade() — see that function for STRIPE_TODO details
  // action: 'none'   → closes the modal only (fallback)
  const upgradeMessages = {
    'free-custom-ility':    { title: 'Sign Up to Add Custom Ilities',           body: 'Creating a free account lets you add up to 10 custom ilities and save your project. It\'s free — just an email and you\'re in.',                                                                          cta: 'Create Free Account', action: 'signup' },
    'free-custom-stak':     { title: 'Sign Up to Add Custom Stakeholders',       body: 'Creating a free account lets you add up to 10 custom stakeholders and save your project. It\'s free — just an email and you\'re in.',                                                                      cta: 'Create Free Account', action: 'signup' },
    'weighted-pair':        { title: 'Weighted Pairwise is an Account Feature',  body: 'Sign up for a free account to unlock weighted pairwise comparison and assign relative importance to each ility.',                                                                                          cta: 'Create Free Account', action: 'signup' },
    'pugh-settings':        { title: 'Matrix Settings require an Account',       body: 'Account users can unlock Advanced Scoring (±3), MTHUS / MTHUWS ratios, and Minimum Acceptable Score (MAS) tracking by creating a free account. It\'s free — just an email and you\'re in.',              cta: 'Create Free Account', action: 'signup' },
    'account-contact-name': { title: 'Contact Name is an Account Feature',       body: 'Create a free Account to attach a contact name to each stakeholder. Helps your team track who the key voice is for each stakeholder type.',                                                               cta: 'Create Free Account', action: 'signup' },
    'pair-subject-req':     { title: 'Requirements Comparison is an Account Feature', body: 'Create a free Account to compare requirements head-to-head in the pairwise matrix. Ilities comparison is always free.',                                                                              cta: 'Create Free Account', action: 'signup' },
    'account-ility-limit':  { title: 'Ility Limit Reached',                     body: 'Account users can add up to 10 custom ilities. Delete one to make room, or upgrade to Pro for unlimited ilities.',                                                                                        cta: 'Upgrade to Pro',      action: 'pro'    },
    'account-stak-limit':   { title: 'Stakeholder Limit Reached',                body: 'Account users can add up to 10 custom stakeholders. Delete one to make room, or upgrade to Pro for unlimited stakeholders.',                                                                              cta: 'Upgrade to Pro',      action: 'pro'    },
    'coaching':             { title: 'AI Coaching is a Pro Feature',             body: 'Pro users get personalized AI coaching on each section of their goal statement, with contextual feedback as they write.',                                                                                  cta: 'Upgrade to Pro',      action: 'pro'    },
    'export-report':        { title: 'Report Export is a Pro Feature',           body: 'Pro users can export their full Controlled Convergence analysis as a formatted PDF report.',                                                                                                               cta: 'Upgrade to Pro',      action: 'pro'    },
    'account-project-limit':{ title: 'Project Limit Reached',                   body: 'Free Accounts can own 3 Quick Projects and 3 Full Projects. Delete a project of this type to make room, or upgrade to Pro for more.',                                                                cta: 'Upgrade to Pro',      action: 'pro'    },
    'account-collab-limit': { title: 'Collaborating Limit Reached',             body: 'Free Accounts can collaborate on up to 3 projects. Remove a project from your collaborating list to make room, or upgrade to Pro for unlimited.',                                                            cta: 'Upgrade to Pro',      action: 'pro'    },
    'invite-collab':        { title: 'Inviting Collaborators requires Pro',     body: 'Upgrade to Pro to invite collaborators to your projects. The people you invite do not need Pro — only the project owner does.',                                                                               cta: 'Upgrade to Pro',      action: 'pro'    },
    'templates':            { title: 'Templates is a Pro Feature',              body: 'Pro users can save reusable templates — a named snapshot of ilities, stakeholders, and requirements that can be loaded as the starting point for any future project.',                                      cta: 'Upgrade to Pro',      action: 'pro'    },
    'pro-contact-fields':   { title: 'Contact Title & Email require Pro',        body: 'Pro users can add full contact details (name, title, email) to each stakeholder. These fields are private and feed the Responsible Scorer feature in Requirements.',                                       cta: 'Upgrade to Pro',      action: 'pro'    },
    'pro-scorer':           { title: 'Responsible Scorer requires Pro',          body: 'Pro users can assign a responsible scorer to each requirement. That person\'s requirements are highlighted during Concept Scoring, keeping large teams focused on their section.',                          cta: 'Upgrade to Pro',      action: 'pro'    },
    'forcedrank':           { title: 'Forced Rank is an Account Feature',        body: 'Create a free Account to use Forced Rank — a structured method for ranking ilities or requirements from most to least important without head-to-head comparisons.',                                           cta: 'Create Free Account', action: 'signup' },
  };

  function showUpgradePrompt(type) {
    const msg = upgradeMessages[type] || { title: 'Upgrade Required', body: 'This feature requires a higher account tier.', cta: 'Learn More', action: 'none' };
    const overlay = document.getElementById('upgradeModal');
    if (overlay) {
      document.getElementById('upgradeModalTitle').textContent = msg.title;
      document.getElementById('upgradeModalBody').textContent  = msg.body;
      const ctaBtn = document.getElementById('upgradeModalCta');
      ctaBtn.textContent = msg.cta;
      // Wire the CTA onclick based on the action declared in upgradeMessages.
      // STRIPE_TODO: 'pro' action calls handleProUpgrade() — see that function for integration details.
      if (msg.action === 'signup') {
        ctaBtn.onclick = function() { closeUpgradeModal(); openAuthModal('signup'); };
      } else if (msg.action === 'pro') {
        ctaBtn.onclick = handleProUpgrade;
      } else {
        ctaBtn.onclick = closeUpgradeModal;
      }
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


  /**
   * Create a new project of the given type.
   * @param {string} [projectType='full'] — 'quick' | 'full'
   *
   * Anonymous users get an in-memory-only project (not saved to Supabase
   * and not pushed to savedProjects, so it never shows up in the owned list).
   * Signed-in users get the existing save flow, with per-type limits enforced.
   */
  function createProject(projectType) {
    projectType = (projectType === 'quick') ? 'quick' : 'full';
    const input = document.getElementById('projNameInput');
    const ownerInput = document.getElementById('projOwnerInput');
    const descInput  = document.getElementById('projDescInput');
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

    // Per-type limit check (account tier only — Pro is effectively unlimited;
    // anonymous users don't save, so no enforcement needed).
    const ownedSameType = savedProjects.filter(p => p.is_owner !== false && (p.projectType || 'full') === projectType).length;
    if (userTier === 'account' && ownedSameType >= getProjectLimit('account', projectType)) {
      showUpgradePrompt('account-project-limit');
      return;
    }

    const description = descInput ? descInput.value.trim() : '';
    // Owner: prefer the signed-in user's name; otherwise the typed value.
    const typedOwner = ownerInput ? ownerInput.value.trim() : '';
    const owner = (appState.currentUser && appState.currentUser.name)
      ? appState.currentUser.name
      : typedOwner;

    // Use the canonical project model
    const project = createProjectModel({
      name,
      description,
      owner,
      projectType,
      userId: appState.currentUser ? appState.currentUser.id : null
    });

    // Clear all tool state so the new project starts fresh
    selectedIlities.clear(); customIlities = [];  ilityOrder = [];
    selectedStakeholders.clear(); customStakeholders = []; stakOrder = [];
    requirements = []; reqIdCounter = 0; _editingReqId = null;
    pairComparisons = {}; pairPairs = []; pairIndex = 0; pairSubject = 'ilities'; pairMethod = 'pairwise'; forcedRankOrder = [];
    pughConcepts = []; pughScores = {}; pughAdvBackup = {};
    pughConceptCounter = 0; datumPerformance = {}; conceptPerformance = {}; conceptNotes = {};
    conceptCustomFields = []; _cfIdCounter = 0; scorerFilter = ''; datumDefActive = false;
    scorTagFilter = []; scorTagMatchMode = 'any';
    scorReqTagFilter = []; scorReqTagMatchMode = 'any';
    reqPageIlityFilter = []; reqPageIlityMatchMode = 'any';
    reqPageStakeholderFilter = []; reqPageStakeholderMatchMode = 'any';
    reqPageTagFilter = []; reqPageTagMatchMode = 'any';
    pughSettings = { advancedScoring: false, showMTHUS: false, showMAS: false, freezeTopRow: true };
    pughCollapsedIlities = new Set(); pughUserInteractedCollapse = false; pughChartSort = 'order';
    goalMode = 'basic';

    // Clear goal fields
    ['input-to','input-by','input-using','input-while','input-goal-basic'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    // Activate the new project
    activeProject = project;
    appState.currentProject = project;

    // Persist + save only for signed-in users. Anonymous users get an
    // in-memory-only project that never enters savedProjects (and so
    // never appears as an owned project in the Project Manager list).
    if (appState.currentUser) {
      savedProjects.push(project);
      appState.projects = savedProjects.slice();
      saveProject(project).catch(e => console.warn('save failed', e));
      try { localStorage.setItem('cc_activeProjectId', project.id); } catch(e) {}
    } else {
      // Anonymous: do not persist the active id — work is session-only.
      try { localStorage.removeItem('cc_activeProjectId'); } catch(e) {}
    }

    input.value = '';
    if (ownerInput) ownerInput.value = '';
    if (descInput)  descInput.value  = '';
    updateNavProjectName();
    renderProjPage();

    // Route based on project type. setMode handles its own page switch:
    //   'quick' → switchPage('basic') and applies Quick Project defaults
    //   'full'  → returns to the last full-mode page (or HOME)
    if (projectType === 'quick') {
      setMode('basic');
    } else {
      setMode('full');
      // Navigate directly to the GOAL tool for Full Projects.
      const goalNavBtn = document.querySelector('[data-page="tbus"]');
      switchPage('tbus', goalNavBtn);
    }
  }

  function loadProject(id) {
    const proj = savedProjects.find(p => p.id === id);
    if (!proj) return;

    // Leaving example mode when a real project is loaded
    exampleMode = false;

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
    if (typeof renderConvPage === 'function') renderConvPage();
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

    // Sync sidebar preference toggles to restored state
    if (typeof syncSidebarPrefs === 'function') syncSidebarPrefs();

    // Sync pairwise weights
    if (pairMode === 'nonweighted') renderNonWeighted();
    else { renderPairCard(); renderPairLiveChart(); }
    updatePairProgress();

    // Persist active project ID for refresh restore
    try { localStorage.setItem('cc_activeProjectId', id); } catch(e) {}

    // Apply the project's type to the app mode. Missing field → treat as 'full'.
    // setMode() also handles the body class and (for quick) navigates to the
    // basic page. For full, we leave the user wherever loadProject was called
    // from — switchPage decisions live in callers like activateProjectAndGo.
    const projType = (proj.projectType === 'quick') ? 'quick' : 'full';
    if (typeof setMode === 'function') {
      setMode(projType === 'quick' ? 'basic' : 'full');
    }

    // Load active scoring tasks for this project so badges appear on cards
    if (typeof loadActiveScoringTasksForProject === 'function') {
      loadActiveScoringTasksForProject(id);
    }
    // Load req review tasks (badges + approval records)
    if (typeof loadReqReviewTasksForProject === 'function') {
      loadReqReviewTasksForProject(id);
    }
    // Determine the current user's role and apply UI restrictions
    if (typeof loadCurrentProjectRole === 'function') {
      loadCurrentProjectRole(id);
    }
    // Load collaborators so the owner can see who has access in Project Manager
    if (typeof loadProjectCollaborators === 'function') {
      loadProjectCollaborators(id);
    }
  }

  // ── PROJECT EDIT MODAL STATE ─────────────────────────────────
  var _editingProjectId = null; // project id currently open in the edit modal

  // ── PROJECT DELETE / REMOVE MODAL STATE ──────────────────────
  var _pendingDeleteId      = null; // project id pending owner deletion
  var _pendingDeleteMethod  = null; // 'now' | '48h'
  var _pendingRemoveId      = null; // project id pending collab self-removal
  var _pendingCancelId      = null; // project id pending cancel-delete

  // Called when owner clicks × on an owned project card
  function deleteProject(id) {
    var proj = savedProjects.find(function(p) { return p.id === id; });
    if (!proj) return;

    // If the project is already scheduled for deletion, open the cancel modal instead
    if (proj.scheduled_delete_at) {
      openCancelDeleteModal(id);
      return;
    }

    _pendingDeleteId = id;
    var modal = document.getElementById('deleteProjectModal');
    if (modal) {
      modal.classList.add('open');
    } else {
      // Fallback if modal HTML missing
      if (!confirm('Delete this project? This cannot be undone.')) return;
      _executeOwnerDeleteNow(id);
    }
  }

  function closeOwnerDeleteModal() {
    var modal = document.getElementById('deleteProjectModal');
    if (modal) modal.classList.remove('open');
  }

  // Step 1 → Step 2: user clicked "Confirm Delete"
  function openDeleteMethodModal() {
    closeOwnerDeleteModal();
    // Show or hide the "Upgrade to Pro" button depending on tier
    var upgradeBtn = document.getElementById('deleteMethodUpgradeBtn');
    if (upgradeBtn) upgradeBtn.style.display = (userTier === 'account') ? '' : 'none';
    var modal = document.getElementById('deleteMethodModal');
    if (modal) modal.classList.add('open');
  }

  function closeDeleteMethodModal() {
    var modal = document.getElementById('deleteMethodModal');
    if (modal) modal.classList.remove('open');
  }

  // Step 2 → Step 3: user chose a delete method
  function selectDeleteMethod(method) {
    _pendingDeleteMethod = method; // 'now' | '48h'
    closeDeleteMethodModal();
    var label = document.getElementById('deleteConfirmMethodLabel');
    if (label) {
      label.textContent = method === '48h'
        ? 'Lock Project and Permanently Delete in 48 Hours'
        : 'Permanently Delete Now';
    }
    var modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.classList.add('open');
  }

  function closeDeleteConfirmModal() {
    var modal = document.getElementById('deleteConfirmModal');
    if (modal) modal.classList.remove('open');
    _pendingDeleteId     = null;
    _pendingDeleteMethod = null;
  }

  // Step 3: final "Yes" — execute the chosen delete method
  async function confirmFinalDelete() {
    // Capture IDs BEFORE closeDeleteConfirmModal() clears them
    var id = _pendingDeleteId;
    var method = _pendingDeleteMethod;
    closeDeleteConfirmModal();
    if (!id) return;

    if (method === '48h') {
      await _executeOwnerDelete48h(id);
    } else {
      await _executeOwnerDeleteNow(id);
    }
  }

  // Immediate permanent delete
  async function _executeOwnerDeleteNow(id) {
    var { error } = await deleteProjectAPI(id);
    if (error) { alert('Could not delete project: ' + error); return; }
    if (activeProject && activeProject.id === id) {
      activeProject = null;
      appState.currentProject = null;
      try { localStorage.removeItem('cc_activeProjectId'); } catch(e) {}
      updateNavProjectName();
      if (typeof _clearProjectRole === 'function') _clearProjectRole();
    }
    renderProjPage();
  }

  // Schedule deletion in 48 hours
  async function _executeOwnerDelete48h(id) {
    var { error } = await scheduleProjectDelete(id);
    if (error) { alert('Could not schedule deletion: ' + error); return; }
    renderProjPage();
  }

  // ── COLLABORATOR REMOVE MODAL ─────────────────────────────────
  // Called when collaborator clicks × on a collaborating project card
  function removeCollabProject(id) {
    _pendingRemoveId = id;
    var modal = document.getElementById('removeCollabModal');
    if (modal) {
      modal.classList.add('open');
    } else {
      if (!confirm('Remove this project from your collaborating list?')) return;
      _executeRemoveCollab(id);
    }
  }

  function closeRemoveCollabModal() {
    var modal = document.getElementById('removeCollabModal');
    if (modal) modal.classList.remove('open');
    _pendingRemoveId = null;
  }

  async function confirmRemoveCollab() {
    // Capture ID BEFORE closeRemoveCollabModal() clears it
    var id = _pendingRemoveId;
    closeRemoveCollabModal();
    if (!id) return;
    await _executeRemoveCollab(id);
  }

  async function _executeRemoveCollab(id) {
    var { error } = await removeCollabProjectAPI(id);
    if (error) { alert('Could not remove project: ' + error); return; }
    if (activeProject && activeProject.id === id) {
      activeProject = null;
      appState.currentProject = null;
      try { localStorage.removeItem('cc_activeProjectId'); } catch(e) {}
      updateNavProjectName();
      if (typeof _clearProjectRole === 'function') _clearProjectRole();
    }
    renderProjPage();
  }

  // ── LOCK MODAL ────────────────────────────────────────────────
  // Shown when a user tries to interact with a project in a locked list
  function openLockModal(listType) {
    var titleEl = document.getElementById('lockModalTitle');
    var bodyEl  = document.getElementById('lockModalBody');
    if (listType === 'owned') {
      if (titleEl) titleEl.textContent = 'Projects (Owned) List Locked';
      if (bodyEl)  bodyEl.textContent  = 'Your Projects (Owned) list is locked because your current tier (Account) only supports 5 projects. To unlock, upgrade to Pro or delete excess projects.';
    } else {
      if (titleEl) titleEl.textContent = 'Projects (Collaborating) List Locked';
      if (bodyEl)  bodyEl.textContent  = 'Your Projects (Collaborating) list is locked because your current tier (Account) only supports 5 projects. To unlock, upgrade to Pro or remove excess projects.';
    }
    var modal = document.getElementById('lockModal');
    if (modal) modal.classList.add('open');
  }

  function closeLockModal() {
    var modal = document.getElementById('lockModal');
    if (modal) modal.classList.remove('open');
  }

  // ── CANCEL SCHEDULED DELETE MODAL ────────────────────────────
  function openCancelDeleteModal(id) {
    _pendingCancelId = id;
    var modal = document.getElementById('cancelDeleteModal');
    if (modal) modal.classList.add('open');
  }

  function closeCancelDeleteModal() {
    var modal = document.getElementById('cancelDeleteModal');
    if (modal) modal.classList.remove('open');
    _pendingCancelId = null;
  }

  async function confirmCancelDelete() {
    // Capture ID BEFORE closeCancelDeleteModal() clears it
    var id = _pendingCancelId;
    closeCancelDeleteModal();
    if (!id) return;
    var { error } = await cancelScheduledDelete(id);
    if (error) { alert('Could not cancel deletion: ' + error); return; }
    renderProjPage();
  }

  // ── CONVERT QUICK → FULL ─────────────────────────────────────
  // One-way conversion. Quick and Full share the same JSON schema, so this
  // is just a projectType flip — no data is dropped or transformed. There is
  // intentionally no "convert Full to Quick" path.
  var _pendingConvertId = null;

  function convertQuickToFull(id) {
    var proj = savedProjects.find(function(p) { return p.id === id; });
    if (!proj) return;
    if ((proj.projectType || 'full') !== 'quick') return; // already Full
    _pendingConvertId = id;
    var modal = document.getElementById('convertProjectModal');
    if (modal) {
      modal.classList.add('open');
    } else {
      // Fallback if the modal HTML is missing
      if (!confirm('Are you sure? This will convert your Quick Project to a Full Project. This cannot be undone.')) return;
      _executeConvertQuickToFull(id);
    }
  }

  function closeConvertProjectModal() {
    var modal = document.getElementById('convertProjectModal');
    if (modal) modal.classList.remove('open');
    _pendingConvertId = null;
  }

  async function confirmConvertQuickToFull() {
    var id = _pendingConvertId;
    closeConvertProjectModal();
    if (!id) return;
    await _executeConvertQuickToFull(id);
  }

  async function _executeConvertQuickToFull(id) {
    var proj = savedProjects.find(function(p) { return p.id === id; });
    if (!proj) return;
    proj.projectType = 'full';
    proj.updated_at = new Date().toISOString();
    // If this is the active project, also flip activeProject so subsequent
    // saves snapshot it as 'full', and switch the app mode so the nav Tools
    // dropdown reappears (body.mode-basic is removed by setMode('full')).
    var wasActive = activeProject && activeProject.id === id;
    if (wasActive) {
      activeProject.projectType = 'full';
    }
    // Persist (signed-in users only — anonymous projects aren't in savedProjects).
    if (appState.currentUser) {
      try {
        await saveProject(proj);
      } catch (e) {
        console.warn('[convertQuickToFull] save failed', e);
      }
    }
    if (wasActive && typeof setMode === 'function') {
      setMode('full');
    }
    renderProjPage();
  }

  // Double-click on a project card: activate it and navigate to its first page.
  // Quick projects → stay on the basic page (setMode inside loadProject handles
  // the navigation). Full projects → jump to GOAL.
  function activateProjectAndGo(id) {
    loadProject(id);
    const proj = savedProjects.find(p => p.id === id);
    const projType = (proj && proj.projectType === 'quick') ? 'quick' : 'full';
    if (projType === 'full') {
      const goalNavBtn = document.querySelector('[data-page="tbus"]');
      switchPage('tbus', goalNavBtn);
    }
    // Quick: loadProject → setMode('basic') already navigated to the basic page.
  }

  // Single-click Activate button on a project card: activate without navigating away
  // from Project Manager. loadProject() calls setMode() which would normally redirect
  // to the home page, so we immediately bring the user back to the proj page.
  function activateProjectOnly(id) {
    loadProject(id);
    const projNavBtn = document.querySelector('[data-page="proj"]');
    switchPage('proj', projNavBtn);
  }

  function deactivateProject() {
    // Anonymous users: their project lives only in memory (createProject for
    // anon does NOT push to savedProjects or save to Supabase). Closing it
    // wipes the work permanently — show a warning + signup nudge first.
    var isAnon = !(appState && appState.currentUser);
    if (isAnon && activeProject) {
      var modal = document.getElementById('anonCloseProjectModal');
      if (modal) {
        modal.classList.add('open');
        return;
      }
      // Fallback if the modal HTML is missing
      if (!confirm('Closing this project will permanently delete the data you\'ve entered (you\'re not signed in). Continue?')) return;
    }
    _executeDeactivateProject();
  }

  function _executeDeactivateProject() {
    activeProject = null;
    try { localStorage.removeItem('cc_activeProjectId'); } catch(e) {}
    updateNavProjectName();
    renderProjPage();
  }

  // Modal handlers for the anonymous Close Project warning
  function closeAnonCloseProjectModal() {
    var modal = document.getElementById('anonCloseProjectModal');
    if (modal) modal.classList.remove('open');
  }
  function confirmAnonCloseProject() {
    closeAnonCloseProjectModal();
    _executeDeactivateProject();
  }

  // ── EXAMPLE MODE HANDLERS ─────────────────────────────────────

  function saveExampleToAccount() {
    if (!appState.currentUser) {
      // Not logged in — send them to sign up; project stays loaded in session
      openAuthModal('signup');
      return;
    }
    exampleMode = false;
    // Take a full snapshot so requirements, pugh, convergence etc. are embedded
    const snap = snapshotCurrentState(activeProject);
    const existing = savedProjects.findIndex(p => p.id === snap.id);
    if (existing < 0) savedProjects.push(snap);
    else savedProjects[existing] = snap;
    appState.projects = savedProjects.slice();
    try { localStorage.setItem('cc_activeProjectId', snap.id); } catch(e) {}
    saveProject(snap).catch(e => console.warn('[saveExample] failed', e));
    renderProjPage();
  }

  function discardExample() {
    exampleMode = false;
    activeProject = null;
    // Clear all working state so the app returns to a clean slate
    requirements = []; reqIdCounter = 0; _editingReqId = null;
    selectedIlities = new Set(); customIlities = []; ilityOrder = [];
    selectedStakeholders = new Set(); customStakeholders = []; stakOrder = [];
    pughConcepts = []; pughScores = {}; pughAdvBackup = {};
    pughSettings = { advancedScoring: false, showMTHUS: false, showMAS: false };
    datumPerformance = {}; conceptPerformance = {}; conceptNotes = {};
    conceptCustomFields = []; _cfIdCounter = 0;
    convSelectedConceptId = ''; convRationale = '';
    convLessons = { req: '', concepts: '', assumption: '', different: '' };
    convRisks = ''; convNextSteps = []; convClosedAt = null; _convNSCounter = 0;
    pairComparisons = {};
    ['to','by','using','while'].forEach(f => {
      const el = document.getElementById('input-' + f); if (el) el.value = '';
    });
    const basicEl = document.getElementById('input-goal-basic'); if (basicEl) basicEl.value = '';
    try { localStorage.removeItem('cc_activeProjectId'); } catch(e) {}
    updateNavProjectName();
    renderProjPage();
    switchPage('proj', document.querySelector('[data-page="proj"]'));
  }

  function editActiveProject() {
    if (!activeProject) return;
    editProject(activeProject.id);
  }

  function editProject(id) {
    const proj = savedProjects.find(p => p.id === id) || (activeProject && activeProject.id === id ? activeProject : null);
    if (!proj) return;
    _editingProjectId = id;

    const nameInput  = document.getElementById('editProjNameInput');
    const descInput  = document.getElementById('editProjDescInput');
    const ownerEl    = document.getElementById('editProjOwnerDisplay');
    const dateEl     = document.getElementById('editProjDateDisplay');
    const errEl      = document.getElementById('editProjNameError');

    if (nameInput)  nameInput.value  = proj.name;
    if (descInput)  descInput.value  = proj.description || '';
    if (ownerEl)    ownerEl.textContent  = proj.owner || (appState.currentUser ? appState.currentUser.name : '') || '—';
    if (dateEl)     dateEl.textContent   = proj.created_at ? new Date(proj.created_at).toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' }) : '—';
    if (errEl)      { errEl.textContent = ''; errEl.style.display = 'none'; }

    const modal = document.getElementById('editProjectModal');
    if (modal) modal.classList.add('open');
    if (nameInput) setTimeout(() => { nameInput.focus(); nameInput.select(); }, 60);
  }

  function saveEditProjectModal() {
    if (!_editingProjectId) return;
    const id   = _editingProjectId;
    const proj = savedProjects.find(p => p.id === id) || (activeProject && activeProject.id === id ? activeProject : null);
    if (!proj) { closeEditProjectModal(); return; }

    const nameInput = document.getElementById('editProjNameInput');
    const descInput = document.getElementById('editProjDescInput');
    const errEl     = document.getElementById('editProjNameError');

    const trimmed = nameInput ? nameInput.value.trim() : '';
    if (!trimmed) {
      if (errEl) { errEl.textContent = 'Project name cannot be empty.'; errEl.style.display = ''; }
      if (nameInput) nameInput.focus();
      return;
    }
    const isDup = savedProjects.some(p => p.id !== id && p.name.toLowerCase() === trimmed.toLowerCase());
    if (isDup) {
      if (errEl) { errEl.textContent = 'A project with this name already exists.'; errEl.style.display = ''; }
      if (nameInput) nameInput.focus();
      return;
    }

    proj.name        = trimmed;
    proj.description = descInput ? descInput.value.trim() : '';

    const idx = savedProjects.findIndex(p => p.id === id);
    if (idx !== -1) {
      savedProjects[idx] = proj;
      saveProject(proj).catch(e => console.warn('save failed', e));
    }
    if (activeProject && activeProject.id === id) {
      activeProject = proj;
      updateNavProjectName();
    }

    closeEditProjectModal();
    renderProjPage();
  }

  function closeEditProjectModal() {
    _editingProjectId = null;
    const modal = document.getElementById('editProjectModal');
    if (modal) modal.classList.remove('open');
  }



  // ── TEMPLATES ──
  // Stored in localStorage as CC_TEMPLATES (array of template objects)
  // Schema: { id, name, filename, keywords, createdAt, isPublic,
  //           data: { ilities?, stakeholders?, requirements?, pairwiseState?, preferences? } }
  // preferences: { goalMode, reqFormat, pairMode, pairSubject, pairMethod, pughSettings }
  // TODO: migrate to Supabase user_templates table for cross-device Pro sync
  const TMPL_KEY = 'cc_templates';

  function loadTemplates() {
    try { return JSON.parse(localStorage.getItem(TMPL_KEY) || '[]'); }
    catch(e) { return []; }
  }

  function persistTemplates(templates) {
    localStorage.setItem(TMPL_KEY, JSON.stringify(templates));
  }

  // Sanitize a raw name into a safe filename segment
  // Strips forbidden chars, collapses whitespace/underscores
  function sanitizeTmplName(raw) {
    return raw
      .trim()
      .replace(/[^a-zA-Z0-9\s_-]/g, '_')  // forbidden chars → _
      .replace(/[\s]+/g, '_')              // whitespace → _
      .replace(/_+/g, '_')                 // collapse consecutive _
      .replace(/^_|_$/g, '');              // trim leading/trailing _
  }

  function getTmplFilename(rawName) {
    const sanitized = sanitizeTmplName(rawName);
    if (!sanitized) return '';
    const now  = new Date();
    const dd   = String(now.getDate()).padStart(2, '0');
    const mm   = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    return `${sanitized}_CC_TEMPLATE_${dd}${mm}${yyyy}.json`;
  }

  function updateTmplFilenamePreview() {
    const name    = document.getElementById('tmplNameInput').value;
    const preview = document.getElementById('tmplFilenamePreview');
    if (!preview) return;
    const filename = getTmplFilename(name);
    preview.textContent = filename ? `File: ${filename}` : '';
  }

  function openSaveTemplateModal() {
    if (!userTierMeets('pro')) { showUpgradePrompt('templates'); return; }
    document.getElementById('tmplNameInput').value    = '';
    document.getElementById('tmplKeywordsInput').value = '';
    document.getElementById('tmplFilenamePreview').textContent = '';
    document.getElementById('tmplSaveError').style.display = 'none';
    document.getElementById('saveTemplateModal').classList.add('open');
  }

  function closeSaveTemplateModal() {
    document.getElementById('saveTemplateModal').classList.remove('open');
  }

  function saveTemplate() {
    const rawName = document.getElementById('tmplNameInput').value.trim();
    if (!rawName) {
      const err = document.getElementById('tmplSaveError');
      err.textContent = 'Please enter a template name.';
      err.style.display = '';
      return;
    }

    const incIlty  = document.getElementById('tmplILTY').checked;
    const incStak  = document.getElementById('tmplSTAK').checked;
    const incReqs  = document.getElementById('tmplREQS').checked;
    const incPair  = document.getElementById('tmplPAIR').checked;
    const isPublic = document.getElementById('tmplIsPublic').checked;

    // Parse comma-separated keywords
    const rawKeywords = (document.getElementById('tmplKeywordsInput').value || '');
    const keywords = rawKeywords.split(',').map(k => k.trim()).filter(Boolean);

    const data = {};
    if (incIlty) data.ilities       = [...selectedIlities];
    if (incStak) data.stakeholders  = [...selectedStakeholders];
    if (incReqs) data.requirements  = requirements.map(r => ({...r}));
    if (incPair) data.pairwiseState = JSON.parse(JSON.stringify(pairComparisons || {}));

    // Always capture project preferences
    data.preferences = {
      goalMode,
      reqFormat,
      pairMode,
      pairSubject,
      pairMethod,
      pughSettings: { ...pughSettings }
    };

    const template = {
      id:        'tmpl_' + Date.now(),
      name:      rawName,
      filename:  getTmplFilename(rawName),
      keywords,
      createdAt: new Date().toISOString(),
      isPublic,
      data,
    };

    const templates = loadTemplates();
    templates.unshift(template);
    persistTemplates(templates);
    closeSaveTemplateModal();
    renderTemplateList();

    // Flash confirmation on the sidebar button
    const btn = document.querySelector('.action-btn-pro[onclick="openSaveTemplateModal()"]');
    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Saved!`;
      setTimeout(() => { btn.innerHTML = orig; }, 1800);
    }
  }

  function downloadTemplate(id) {
    if (!userTierMeets('pro')) { showUpgradePrompt('templates'); return; }
    const templates = loadTemplates();
    const t = templates.find(t => t.id === id);
    if (!t) return;
    const filename = t.filename || getTmplFilename(t.name);
    const blob = new Blob([JSON.stringify(t, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function uploadTemplate() {
    if (!userTierMeets('pro')) { showUpgradePrompt('templates'); return; }
    document.getElementById('tmplUploadInput').value = '';
    document.getElementById('tmplUploadInput').click();
  }

  function handleTmplUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(evt) {
      let t;
      try {
        t = JSON.parse(evt.target.result);
      } catch(err) {
        alert('Invalid file. Please upload a valid CC_TEMPLATE JSON file.');
        return;
      }
      if (!t.name || !t.data) {
        alert('This file does not appear to be a valid Controlled Convergence template.');
        return;
      }
      // Assign a fresh ID + import timestamp to avoid collisions
      t.id         = 'tmpl_' + Date.now();
      t.importedAt = new Date().toISOString();
      t.filename   = getTmplFilename(t.name);
      const templates = loadTemplates();
      templates.unshift(t);
      persistTemplates(templates);
      renderTemplateList();
      alert(`Template "${escHtml(t.name)}" uploaded successfully.`);
    };
    reader.readAsText(file);
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
      el.innerHTML = '<p style="font-size:13px;color:var(--text-muted);padding:8px 0">No templates saved yet. Use <strong>Save Template</strong> in the sidebar.</p>';
      return;
    }
    el.innerHTML = templates.map(t => {
      const date     = new Date(t.createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
      const sections = [
        t.data.ilities       ? 'Lifecycle'     : null,
        t.data.stakeholders  ? 'Stakeholders'  : null,
        t.data.requirements  ? `${t.data.requirements.length} Req${t.data.requirements.length !== 1 ? 's' : ''}` : null,
        t.data.pairwiseState ? 'Pairwise'      : null,
        t.data.preferences   ? 'Preferences'   : null,
      ].filter(Boolean).join(' · ');
      return `<div class="tmpl-picker-item">
        <div class="tmpl-picker-info">
          <div class="tmpl-picker-name">${escHtml(t.name)}</div>
          <div class="tmpl-picker-meta">${sections ? sections + ' · ' : ''}Saved ${date}</div>
        </div>
        ${t.isPublic ? '<span class="tmpl-public-badge">Public</span>' : ''}
        <button class="btn btn-primary" style="font-size:12px;padding:5px 12px;flex-shrink:0" onclick="loadTemplate('${t.id}')">Apply</button>
      </div>`;
    }).join('');
  }

  // loadTemplate → opens the 2-step Apply Template modal
  let _applyingTemplateId = null;

  function loadTemplate(id) {
    const templates = loadTemplates();
    const t = templates.find(t => t.id === id);
    if (!t) return;
    _applyingTemplateId = id;

    // Build the section checkboxes from what's actually in the template
    const sectionDefs = [
      { key: 'ilities',       label: 'Lifecycle Properties' },
      { key: 'stakeholders',  label: 'Stakeholders' },
      { key: 'requirements',  label: t.data.requirements ? `Requirements (${t.data.requirements.length})` : 'Requirements' },
      { key: 'pairwiseState', label: 'Pairwise Weights' },
      { key: 'preferences',   label: 'Project Preferences' },
    ].filter(s => !!t.data[s.key]);

    const checkboxesEl = document.getElementById('applyTmplCheckboxes');
    checkboxesEl.innerHTML = sectionDefs.map(s => `
      <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer">
        <input type="checkbox" class="apply-tmpl-cb" data-key="${s.key}" checked> ${s.label}
      </label>`).join('');

    document.getElementById('applyTmplName').textContent = t.name;
    document.getElementById('applyTmplStep1').style.display = '';
    document.getElementById('applyTmplStep2').style.display = 'none';

    closeStartFromTemplateModal();
    document.getElementById('applyTmplModal').classList.add('open');
  }

  function applyTmplReviewImpact() {
    const checked = [...document.querySelectorAll('.apply-tmpl-cb:checked')];
    if (!checked.length) {
      alert('Please select at least one section to apply.');
      return;
    }
    const labelMap = {
      ilities:       'Lifecycle Properties',
      stakeholders:  'Stakeholders',
      requirements:  'Requirements',
      pairwiseState: 'Pairwise Weights',
      preferences:   'Project Preferences',
    };
    const warnEl = document.getElementById('applyTmplOverwriteList');
    warnEl.innerHTML = checked.map(cb => `<li>${labelMap[cb.dataset.key] || cb.dataset.key}</li>`).join('');
    document.getElementById('applyTmplStep1').style.display = 'none';
    document.getElementById('applyTmplStep2').style.display = '';
  }

  function applyTmplBack() {
    document.getElementById('applyTmplStep1').style.display = '';
    document.getElementById('applyTmplStep2').style.display = 'none';
  }

  function closeApplyTemplateModal() {
    document.getElementById('applyTmplModal').classList.remove('open');
    _applyingTemplateId = null;
  }

  function confirmApplyTemplate() {
    const id = _applyingTemplateId;
    const templates = loadTemplates();
    const t = templates.find(t => t.id === id);
    if (!t) return;

    const checked = new Set([...document.querySelectorAll('.apply-tmpl-cb:checked')].map(cb => cb.dataset.key));

    if (checked.has('ilities') && t.data.ilities) {
      selectedIlities = new Set(t.data.ilities);
      renderIlityGrid();
    }
    if (checked.has('stakeholders') && t.data.stakeholders) {
      selectedStakeholders = new Set(t.data.stakeholders);
      renderStakGrid();
    }
    if (checked.has('requirements') && t.data.requirements) {
      requirements  = t.data.requirements.map(r => ({...r}));
      reqIdCounter  = requirements.reduce((max, r) => Math.max(max, parseInt(String(r.id).replace('r', '')) || 0), 0);
      renderRequirements && renderRequirements();
    }
    if (checked.has('pairwiseState') && t.data.pairwiseState) {
      pairComparisons = JSON.parse(JSON.stringify(t.data.pairwiseState));
      updatePairGate && updatePairGate();
    }
    if (checked.has('preferences') && t.data.preferences) {
      const p = t.data.preferences;
      if (p.goalMode)     { goalMode    = p.goalMode;    if (typeof switchGoalMode  === 'function') switchGoalMode(goalMode); }
      if (p.reqFormat)    { reqFormat   = p.reqFormat;   if (typeof switchReqFormat === 'function') switchReqFormat(reqFormat); }
      if (p.pairMode)     pairMode    = p.pairMode;
      if (p.pairSubject)  pairSubject = p.pairSubject;
      if (p.pairMethod)   pairMethod  = p.pairMethod;
      if (p.pughSettings) Object.assign(pughSettings, p.pughSettings);
    }

    closeApplyTemplateModal();
    alert(`Template "${t.name}" applied successfully.`);
  }

  function renderTemplateList() {
    const templates = loadTemplates();
    const listEl    = document.getElementById('templateList');
    const emptyEl   = document.getElementById('templateEmptyState');
    const startBtn  = document.getElementById('startFromTemplateBtn');
    if (!listEl) return;

    if (!templates.length) {
      listEl.innerHTML = '';
      if (emptyEl)  emptyEl.style.display  = '';
      if (startBtn) startBtn.style.display = 'none';
      return;
    }
    if (emptyEl)  emptyEl.style.display  = 'none';
    if (startBtn) startBtn.style.display = '';

    listEl.innerHTML = templates.map(t => {
      const date     = new Date(t.createdAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
      const sections = [
        t.data.ilities       ? 'Lifecycle'    : null,
        t.data.stakeholders  ? 'Stakeholders' : null,
        t.data.requirements  ? `${t.data.requirements.length} Req${t.data.requirements.length !== 1 ? 's' : ''}` : null,
        t.data.pairwiseState ? 'Pairwise'     : null,
        t.data.preferences   ? 'Prefs'        : null,
      ].filter(Boolean).join(' · ');
      const kwds = t.keywords && t.keywords.length
        ? `<div style="font-size:11px;color:var(--text-muted);margin-top:2px">${t.keywords.map(k => escHtml(k)).join(', ')}</div>`
        : '';
      return `<div class="proj-item">
        <div style="flex:1;min-width:0">
          <div class="proj-item-name">${escHtml(t.name)}</div>
          <div class="proj-item-meta">${sections ? sections + ' · ' : ''}${date}${t.isPublic ? ' · <span style="color:var(--accent)">Public</span>' : ''}</div>
          ${kwds}
        </div>
        <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px;flex-shrink:0" onclick="loadTemplate('${t.id}')">Apply</button>
        <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px;flex-shrink:0" onclick="downloadTemplate('${t.id}')" title="Download template JSON">⬇</button>
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
      if (basicBtn)     basicBtn.classList.add('active');
      if (structuredBtn) structuredBtn.classList.remove('active');
      // Hide the live preview banner — it belongs to the structured form
      const _pb = document.getElementById('previewBanner');
      if (_pb) _pb.classList.remove('visible');
      // Pre-fill basic field with the TO content if it has something
      const toVal = document.getElementById('input-to')?.value || '';
      const basicEl = document.getElementById('input-goal-basic');
      if (basicEl && toVal && !basicEl.value) basicEl.value = toVal;
      // Auto-focus so the user can start typing immediately
      setTimeout(() => { if (basicEl) basicEl.focus(); }, 50);
    } else {
      basicForm.style.display     = 'none';
      structuredForm.style.display = '';
      if (basicBtn)     basicBtn.classList.remove('active');
      if (structuredBtn) structuredBtn.classList.add('active');
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

    // If the user is currently on the Convergence Summary page, re-render it
    // so the goal section switches live without requiring a page re-visit.
    if (_currentPage === 'conv') renderConvPage();
  }

  function onGoalBasicInput() {
    const val = document.getElementById('input-goal-basic')?.value || '';
    // Enable continue button if there's any content
    const btn = document.getElementById('btnContinue');
    // nav buttons always active — no disable
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
    // nav buttons always active — no disable
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
    { id: 'accessibility',     name: 'Accessibility',     desc: 'Usable by people with a range of abilities and disabilities' },
    { id: 'aesthetics',        name: 'Aesthetics',        desc: 'Visual and sensory appeal to users' },
    { id: 'affordability',     name: 'Affordability',     desc: 'Total cost within acceptable limits' },
    { id: 'availability',      name: 'Availability',      desc: 'Proportion of time the system is operational and accessible' },
    { id: 'compatibility',     name: 'Compatibility',     desc: 'Ability to coexist with existing systems and environments' },
    { id: 'deployability',     name: 'Deployability',     desc: 'Ease and reliability of releasing the system into production' },
    { id: 'durability',        name: 'Durability',        desc: 'Resistance to wear and degradation' },
    { id: 'extensibility',     name: 'Extensibility',     desc: 'Easy to add new capabilities over time' },
    { id: 'flexibility',       name: 'Flexibility',       desc: 'Adaptability to changing requirements' },
    { id: 'interoperability',  name: 'Interoperability',  desc: 'Works with other systems and standards' },
    { id: 'maintainability',   name: 'Maintainability',   desc: 'Ease of upkeep and repair' },
    { id: 'manufacturability', name: 'Manufacturability', desc: 'Ease and efficiency of production' },
    { id: 'modularity',        name: 'Modularity',        desc: 'Composed of interchangeable, separable units' },
    { id: 'observability',     name: 'Observability',     desc: 'Ability to monitor internal state through external outputs' },
    { id: 'performance',       name: 'Performance',       desc: 'Speed, throughput, and responsiveness under expected load' },
    { id: 'portability',       name: 'Portability',       desc: 'Ease of moving or transporting' },
    { id: 'privacy',           name: 'Privacy',           desc: 'Control over personal or sensitive data collected and shared' },
    { id: 'reliability',       name: 'Reliability',       desc: 'Consistent performance over time' },
    { id: 'resilience',        name: 'Resilience',        desc: 'Recovery from disruption or failure' },
    { id: 'safety',            name: 'Safety',            desc: 'Freedom from unacceptable harm or risk' },
    { id: 'scalability',       name: 'Scalability',       desc: 'Ability to grow with increased demand' },
    { id: 'security',          name: 'Security',          desc: 'Protection against unauthorized access or attack' },
    { id: 'sustainability',    name: 'Sustainability',    desc: 'Minimal long-term environmental impact' },
    { id: 'testability',       name: 'Testability',       desc: 'Ease of verifying correct behavior through testing' },
    { id: 'usability',         name: 'Usability',         desc: 'Ease of use for the intended user' },
  ];

  const STAKEHOLDERS = [
    { id: 'management',     name: 'Business / Management',      desc: 'Sets strategic direction, approves budgets, owns outcomes' },
    { id: 'customer',       name: 'Customer / Client',          desc: 'Commissions or purchases the system; defines success criteria' },
    { id: 'design-team',    name: 'Design Team',                desc: 'Engineers and designers responsible for the system' },
    { id: 'end-user',       name: 'End User',                   desc: 'The primary person who uses or operates the system' },
    { id: 'public',         name: 'General Public / Society',   desc: 'Broadly affected communities and the wider public interest' },
    { id: 'investor',       name: 'Investor / Board',           desc: 'Provides funding and holds accountability for ROI' },
    { id: 'it-admin',       name: 'IT / System Administrator',  desc: 'Manages infrastructure, deployment, and system access' },
    { id: 'legal',          name: 'Legal / Compliance',         desc: 'Ensures adherence to laws, contracts, and IP requirements' },
    { id: 'maintenance',    name: 'Maintenance Technician',     desc: 'Performs ongoing upkeep, repair, and inspection' },
    { id: 'mfg-engineer',   name: 'Manufacturing Engineer',     desc: 'Oversees production feasibility and process design' },
    { id: 'marketing',      name: 'Marketing / Sales',          desc: 'Defines market positioning, customer-facing features, and commercial requirements' },
    { id: 'operator',       name: 'Operator',                   desc: 'Directly runs or controls the system during normal operations' },
    { id: 'procurement',    name: 'Procurement',                desc: 'Manages supplier relationships and cost of materials' },
    { id: 'proj-manager',   name: 'Project Manager',            desc: 'Coordinates schedule, resources, and stakeholder communication' },
    { id: 'qa',             name: 'Quality Assurance',          desc: 'Verifies the system meets defined quality standards' },
    { id: 'regulatory',     name: 'Regulatory Body',            desc: 'Enforces standards, codes, and compliance requirements' },
    { id: 'safety-officer', name: 'Safety Officer',             desc: 'Responsible for hazard identification and risk mitigation' },
    { id: 'supply-chain',   name: 'Supply Chain / Vendor',      desc: 'Provides components, materials, or outsourced services' },
    { id: 'training',       name: 'Training & Support',         desc: 'Delivers user education and ongoing technical assistance' },
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
    _autoSaveNow();
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
    const contactName  = (userTier === 'account' || userTierMeets('pro')) ? (contactNameInput?.value.trim()  || '') : '';
    const contactTitle = (userTierMeets('pro'))                          ? (contactTitleInput?.value.trim() || '') : '';
    const contactEmail = (userTierMeets('pro'))                          ? (contactEmailInput?.value.trim() || '') : '';

    customStakeholders.push({ id, name, desc, contactName, contactTitle, contactEmail });
    selectedStakeholders.add(id);
    nameInput.value = '';
    descInput.value = '';
    if (contactNameInput)  contactNameInput.value  = '';
    if (contactTitleInput) contactTitleInput.value = '';
    if (contactEmailInput) contactEmailInput.value = '';
    // Invalidate tier cache for the new email so the badge resolves on next render
    if (typeof _stakEmailTierCache !== 'undefined' && contactEmail) {
      delete _stakEmailTierCache[contactEmail];
    }
    renderStakGrid();
    populateReqForms();
    _autoSaveNow();
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
    if (activeProject && (userTier === 'account' || userTierMeets('pro'))) {
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
    const tagsRaw = document.getElementById('reqTagsInput')?.value || '';
    const parsedTags = [...new Set(
      tagsRaw.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0)
    )].sort();

    if (reqFormat === 'agile') {
      const stakeholder = document.getElementById('reqAgileStakeholder').value;
      const ility       = document.getElementById('reqAgileIlity').value;
      const want        = document.getElementById('reqAgileWant').value.trim();
      const soThat      = document.getElementById('reqAgileSoThat').value.trim();
      const source      = document.getElementById('reqAgileSource').value.trim();

      if (!stakeholder) { document.getElementById('reqAgileStakeholder').focus(); return; }
      if (!ility)       { document.getElementById('reqAgileIlity').focus(); return; }
      if (!want)        { document.getElementById('reqAgileWant').focus(); return; }

      const req = {
        id: _editingReqId !== null ? _editingReqId : ++reqIdCounter,
        format: 'agile',
        text: want,        // the "and I want" portion — primary display text
        agileSoThat: soThat,
        source,
        type: reqType,
        primary: ility,
        secondaries: [],
        stakeholders: [stakeholder],
        scorer,
        tags: parsedTags,
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
        document.getElementById('reqAgileSource').value = '';
        if (document.getElementById('reqScorer')) document.getElementById('reqScorer').value = '';
        if (document.getElementById('reqTagsInput')) document.getElementById('reqTagsInput').value = '';
      }

    } else {
      // SYSTEM / INCOSE format
      const text         = document.getElementById('reqText').value.trim();
      const primaryIlity = document.getElementById('reqPrimaryIlity').value;
      const secondaryIlity = document.getElementById('reqSecondaryIlity').value;
      const primaryStak  = document.getElementById('reqPrimaryStakeholder').value;
      const secondaryStak = document.getElementById('reqSecondaryStakeholder').value;
      const source       = document.getElementById('reqIncoseSource').value.trim();

      if (!text) { document.getElementById('reqText').focus(); return; }
      if (!primaryIlity) { document.getElementById('reqPrimaryIlity').focus(); return; }

      const secondaries  = (secondaryIlity && secondaryIlity !== primaryIlity) ? [secondaryIlity] : [];
      const stakeholders = [primaryStak];
      if (secondaryStak && secondaryStak !== primaryStak) stakeholders.push(secondaryStak);

      const req = {
        id: _editingReqId !== null ? _editingReqId : ++reqIdCounter,
        format: 'incose',
        text, type: reqType, primary: primaryIlity, secondaries, stakeholders, scorer, source,
        tags: parsedTags,
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
        document.getElementById('reqIncoseSource').value = '';
        if (document.getElementById('reqScorer')) document.getElementById('reqScorer').value = '';
        if (document.getElementById('reqTagsInput')) document.getElementById('reqTagsInput').value = '';
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

  // ── Project list auto-refresh ─────────────────────────────────
  var _projPollInterval = null;

  // Pull fresh project data from Supabase then re-render. Safe to call any time.
  async function _refreshProjPageFromServer() {
    if (appState.currentUser) {
      await loadProjects(appState.currentUser.id);
    }
    if (typeof renderProjPage === 'function') renderProjPage();
  }

  // Start 60-second background poll — only while Projects page is visible.
  function _startProjPolling() {
    _stopProjPolling();
    if (!appState.currentUser) return;
    _projPollInterval = setInterval(function() {
      if (_currentPage !== 'proj') { _stopProjPolling(); return; }
      _refreshProjPageFromServer();
    }, 60000);
  }

  function _stopProjPolling() {
    if (_projPollInterval) { clearInterval(_projPollInterval); _projPollInterval = null; }
  }

  function switchPage(pageId, navBtn) {
    // Admin lives as a route inside the app shell (#admin) so it inherits
    // sidebars, theme, and top nav. Gate runs here at switch time — non-admins
    // bounce to home rather than ever seeing the admin chrome.
    if (pageId === 'admin') {
      if (typeof isAdmin !== 'function' || !isAdmin()) {
        window.location.hash = '#home';
        return;
      }
      // The renderer (admin-shell.js → renderAdminPage) reads the hash to
      // pick the active tab and dispatches to the matching pane renderer.
      if (typeof window.renderAdminPage === 'function') {
        // Defer the call so the page-show below runs first and the panes
        // are visible when the renderer fills them.
        setTimeout(window.renderAdminPage, 0);
      }
    }

    // Notify easter-eggs.js of page navigation (resets page-scoped Contra theme)
    if (typeof window._easterEggSwitchPage === 'function') window._easterEggSwitchPage();

    // Save current state before leaving (nav-save)
    // Skip while in example mode — the user hasn't chosen to keep the project yet.
    if (!exampleMode && activeProject && _currentPage && _currentPage !== pageId) {
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
    // Persist current page so a browser refresh can restore it
    try { localStorage.setItem('cc_lastPage', pageId); } catch(e) {}

    // Set a body class for the active page so CSS can target it (e.g. hide the
    // Tools dropdown on the basic page only, regardless of body.mode-basic).
    Array.from(document.body.classList).forEach(c => {
      if (c.indexOf('page-current-') === 0) document.body.classList.remove(c);
    });
    document.body.classList.add('page-current-' + pageId);

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


    // Stop any running project poll when leaving the Projects page
    if (pageId !== 'proj') { _stopProjPolling(); }

    // Page-specific init
    if (pageId === 'basic') { syncGuidedToQS(); } // sync full-mode state → Basic Mode display when entering basic
    if (pageId === 'proj') {
      // Pull fresh data from Supabase before rendering, then start background poll
      _refreshProjPageFromServer();
      _startProjPolling();
    }
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
    if (pageId === 'conv') { renderConvPage(); }
    if (pageId === 'pugh') {
      renderPughMatrix();
      updatePughAccountToggles();
      // Sync settings panel checkboxes to loaded state
      const mCb   = document.getElementById('toggleMTHUS');
      const masCb = document.getElementById('toggleMAS');
      if (mCb)   mCb.checked   = !!(pughSettings && pughSettings.showMTHUS);
      if (masCb) masCb.checked = !!(pughSettings && pughSettings.showMAS);
    }
    if (pageId === 'blog') {
      // In-app blog rendering. The renderer reads the current hash to decide
      // whether to show the index or a single post (#blog vs #blog/<slug>).
      if (typeof window.renderAppBlog === 'function') window.renderAppBlog();
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



  // ── NAV TOOLS DROPDOWN ──
  function toggleNavDropdown() {
    const menu    = document.getElementById('navToolsMenu');
    const trigger = document.getElementById('navToolsTrigger');
    if (!menu || !trigger) return;
    const open = menu.classList.toggle('open');
    trigger.classList.toggle('open', open);
  }

  function closeNavDropdown() {
    const menu    = document.getElementById('navToolsMenu');
    const trigger = document.getElementById('navToolsTrigger');
    if (menu)    menu.classList.remove('open');
    if (trigger) trigger.classList.remove('open');
  }

  // Close dropdown when clicking outside of it
  document.addEventListener('click', function(e) {
    if (!e.target.closest('#navToolsDropdown')) closeNavDropdown();
  });


  // ── NAV ADMIN DROPDOWN ──
  // Mirrors the Tools dropdown pattern. The dropdown's container is hidden by
  // default (style="display:none" in app.html) and revealed by updateTierBadges()
  // when isAdmin() is true.
  function toggleAdminDropdown() {
    const menu    = document.getElementById('navAdminMenu');
    const trigger = document.getElementById('navAdminTrigger');
    if (!menu || !trigger) return;
    const open = menu.classList.toggle('open');
    trigger.classList.toggle('open', open);
  }

  function closeAdminDropdown() {
    const menu    = document.getElementById('navAdminMenu');
    const trigger = document.getElementById('navAdminTrigger');
    if (menu)    menu.classList.remove('open');
    if (trigger) trigger.classList.remove('open');
  }

  // Close admin dropdown when clicking outside it
  document.addEventListener('click', function(e) {
    if (!e.target.closest('#navAdminDropdown')) closeAdminDropdown();
  });

  // Navigate to a specific admin tab inside the app shell. Sets the hash
  // and lets the hashchange listener route to switchPage('admin'), which
  // enforces the isAdmin() gate.
  function goToAdmin(tab) {
    if (typeof isAdmin === 'function' && !isAdmin()) {
      // Should never happen — the dropdown is hidden for non-admins — but
      // guard anyway so a stale DOM doesn't leak admin chrome.
      return;
    }
    window.location.hash = '#admin/' + (tab || 'insights');
  }


  // ── THEME ──
  function setTheme(theme, btn) {
    // Remove any existing theme class (include theme-contra so easter egg clears on manual switch)
    document.body.classList.remove('theme-dark', 'theme-engineering', 'theme-red-black', 'theme-green-yellow', 'theme-contra');
    if (theme !== 'light') document.body.classList.add('theme-' + theme);

    // Update active button state
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
    // btn may be null when called from loadTheme
    const activeBtn = btn || document.querySelector(`.theme-btn[data-theme="${theme}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    saveThemePreference(theme); // api.js — persists when user is logged in

    // Notify easter-eggs.js (no-op if file isn't loaded)
    if (typeof window._easterEggThemeChanged === 'function') window._easterEggThemeChanged(theme);
  }

  function loadTheme() {
    try {
      const t = (appState.currentUser && appState.currentUser.theme) || 'light';
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

        const cnInput  = document.getElementById('modalContactName');
        const ctInput  = document.getElementById('modalContactTitle');
        const ceInput  = document.getElementById('modalContactEmail');
        const roNote   = document.getElementById('modalContactReadonlyNote');

        // Always show existing data regardless of tier.
        // Set readOnly on fields the user's tier doesn't allow editing,
        // so they can read the value but can't change it.
        if (cnInput) {
          cnInput.value    = item.contactName  || '';
          const canEdit    = userTier === 'account' || userTierMeets('pro');
          cnInput.readOnly = !canEdit;
          cnInput.classList.toggle('modal-input-readonly', !canEdit);
        }
        if (ctInput) {
          ctInput.value    = item.contactTitle || '';
          const canEdit    = userTierMeets('pro');
          ctInput.readOnly = !canEdit;
          ctInput.classList.toggle('modal-input-readonly', !canEdit);
        }
        if (ceInput) {
          ceInput.value    = item.contactEmail || '';
          const canEdit    = userTierMeets('pro');
          ceInput.readOnly = !canEdit;
          ceInput.classList.toggle('modal-input-readonly', !canEdit);
        }

        // Show "view only" note if any field is restricted on this plan
        if (roNote) {
          roNote.style.display = userTierMeets('pro') ? 'none' : '';
        }
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
      // Locate existing item so we can preserve contact fields the user can't edit.
      // This prevents lower-tier users from accidentally wiping Pro-entered contact data
      // when they save an unrelated change (e.g. updating the stakeholder description).
      const existing = [...STAKEHOLDERS, ...customStakeholders].find(s => s.id === _modalId);
      const contactName  = (userTier === 'account' || userTierMeets('pro'))
        ? (document.getElementById('modalContactName')?.value.trim()  || '')
        : (existing?.contactName  || '');   // preserve — user can't edit this field
      const contactTitle = (userTierMeets('pro'))
        ? (document.getElementById('modalContactTitle')?.value.trim() || '')
        : (existing?.contactTitle || '');   // preserve — user can't edit this field
      const contactEmail = (userTierMeets('pro'))
        ? (document.getElementById('modalContactEmail')?.value.trim() || '')
        : (existing?.contactEmail || '');   // preserve — user can't edit this field
      const builtin = STAKEHOLDERS.find(s => s.id === _modalId);
      const custom = customStakeholders.find(s => s.id === _modalId);
      // Invalidate tier cache for both the old and new email so the badge
      // re-resolves on the next renderStakGrid call.
      if (typeof _stakEmailTierCache !== 'undefined') {
        if (existing?.contactEmail) delete _stakEmailTierCache[existing.contactEmail];
        if (contactEmail)           delete _stakEmailTierCache[contactEmail];
      }
      if (builtin) { builtin.name = name; builtin.desc = desc; builtin.contactName = contactName; builtin.contactTitle = contactTitle; builtin.contactEmail = contactEmail; }
      else if (custom) { custom.name = name; custom.desc = desc; custom.contactName = contactName; custom.contactTitle = contactTitle; custom.contactEmail = contactEmail; }
      renderStakGrid(); populateReqForms();
    }
    closeEditModal();
    _autoSaveNow();
  }

  function deleteFromModal() {
    if (!confirm('Delete this item? Requirements referencing it will lose this association. This cannot be undone.')) return;
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
    _autoSaveNow();
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

    const tagsStr = (req.tags || []).join(', ');
    if (fmt === 'agile') {
      setTimeout(() => {
        document.getElementById('reqAgileStakeholder').value = req.stakeholders[0] || '';
        document.getElementById('reqAgileIlity').value       = req.primary || '';
        document.getElementById('reqAgileWant').value        = req.text || '';
        document.getElementById('reqAgileSoThat').value      = req.agileSoThat || '';
        document.getElementById('reqAgileSource').value      = req.source || '';
        if (document.getElementById('reqScorer')) document.getElementById('reqScorer').value = req.scorer || '';
        if (document.getElementById('reqTagsInput')) document.getElementById('reqTagsInput').value = tagsStr;
        renderReqTagSuggestions();
      }, 15);
    } else {
      populateReqForms();
      setTimeout(() => {
        document.getElementById('reqText').value = req.text || '';
        document.getElementById('reqPrimaryIlity').value       = req.primary || '';
        document.getElementById('reqSecondaryIlity').value     = req.secondaries[0] || '';
        document.getElementById('reqPrimaryStakeholder').value = req.stakeholders[0] || '';
        document.getElementById('reqSecondaryStakeholder').value = req.stakeholders[1] || '';
        document.getElementById('reqIncoseSource').value       = req.source || '';
        if (document.getElementById('reqScorer')) document.getElementById('reqScorer').value = req.scorer || '';
        if (document.getElementById('reqTagsInput')) document.getElementById('reqTagsInput').value = tagsStr;
        renderReqTagSuggestions();
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
    ['reqAgileStakeholder','reqAgileIlity','reqAgileWant','reqAgileSoThat','reqAgileSource','reqTagsInput'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const agileSourceEl = document.getElementById('reqIncoseSource');
    if (agileSourceEl) agileSourceEl.value = '';
    // Clear Responsible Scorer
    const scorerEl = document.getElementById('reqScorer');
    if (scorerEl) scorerEl.value = '';
    // Reset type to none (no chip selected)
    document.querySelectorAll('.req-type-chip').forEach(b => b.classList.remove('active'));
    reqType = '';
    populateReqForms();
    renderReqTagSuggestions();
  }

  function clearReqForm() {
    // Clear all text inputs and selects in the form — does not affect saved requirements or edit state
    [
      'reqAgileStakeholder','reqAgileIlity','reqAgileWant','reqAgileSoThat','reqAgileSource',
      'reqText','reqPrimaryIlity','reqSecondaryIlity','reqPrimaryStakeholder','reqSecondaryStakeholder',
      'reqIncoseSource','reqScorer','reqTagsInput'
    ].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.querySelectorAll('.req-type-chip').forEach(b => b.classList.remove('active'));
    reqType = '';
    renderReqTagSuggestions();
  }

  // ── PAIRWISE COMPARISON ──
  function setPairMode(mode, btn) {
    pairMode = mode;
    // Only clear active within the same toggle group, not across all three rows.
    btn.closest('.pair-mode-toggle').querySelectorAll('.pair-mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    syncPairView();
    // Keep Pugh matrix in sync — weighted toggle changes summary rows and chart
    if (typeof renderPughMatrix === 'function') renderPughMatrix();
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
    // nav buttons always active — no disable
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
    // nav buttons always active — no disable
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
  // Warn anonymous users with data before they close or refresh the page
  window.addEventListener('beforeunload', function(e) {
    if (_anonHasBasicData()) {
      e.preventDefault();
      e.returnValue = ''; // required for Chrome; message is browser-defined
    }
  });

  window.addEventListener('DOMContentLoaded', function() {
    // Show DEV tier toggle only on localhost — never in production
    const isLocal = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
    const devSection = document.getElementById('devTierSection');
    if (devSection && isLocal) devSection.style.display = '';

    const overlay = document.getElementById('editModal');
    if (overlay) overlay.addEventListener('click', function(e) {
      if (e.target === this) closeEditModal();
    });

    const exportProjOverlay = document.getElementById('exportProjectModal');
    if (exportProjOverlay) exportProjOverlay.addEventListener('click', function(e) {
      if (e.target === this) closeExportProjectModal();
    });

    const dataWarnOverlay = document.getElementById('basicDataWarnModal');
    if (dataWarnOverlay) dataWarnOverlay.addEventListener('click', function(e) {
      if (e.target === this) closeBasicDataWarnModal(true); // clicking outside = stay in basic mode
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
      // Close inline scoring view when clicking outside the concept cards / scoring view area.
      // Use composedPath() instead of contains() — renderConceptCards() rebuilds innerHTML
      // which detaches the original target from the DOM before this handler runs, so
      // contains() would always return false and immediately close a view just opened.
      // composedPath() captures the traversal path at dispatch time (before DOM mutations).
      if ((scoringConceptId || datumDefActive) && _currentPage === 'scor') {
        const scorView  = document.getElementById('scorScoringView');
        const scorCards = document.getElementById('scorConceptCards');
        if (scorView && scorCards) {
          const path = e.composedPath ? e.composedPath() : [];
          const clickedInsideScor = path.includes(scorCards) || path.includes(scorView);
          if (!clickedInsideScor) {
            if (datumDefActive) exitDatumDef();
            else exitScoringView();
          }
        }
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

  // ── Hero page deep-links ─────────────────────────────────────
  // #login / #signup / #basic run synchronously — they only need DOM + functions.
  // #demo is deferred with setTimeout(fn,0) so it fires AFTER all synchronous
  // app.js initialization code has run (variable assignments, etc.), exactly
  // matching the environment the in-app "Load Example Project" button has.
  (function () {
    var h = window.location.hash;
    if (!h) return;
    history.replaceState(null, '', window.location.pathname); // clean URL bar
    if      (h === '#login')  { openAuthModal('login'); }
    else if (h === '#signup') { openAuthModal('signup'); }
    // #basic used to drop the visitor straight into Basic Mode. Quick Mode is now
    // tied to project creation (Project Manager → Start Quick Project), so this
    // hash now nudges the visitor to sign up instead.
    else if (h === '#basic')  { openAuthModal('signup'); }
    else if (h === '#demo')   { setTimeout(function() { loadExampleProject(true); }, 0); }
    // #admin or #admin/<tab> — gated route inside the app shell.
    // initAuth() runs async, so defer the gate check until the session has
    // a chance to restore. The switchPage handler also gates again.
    else if (h === '#admin' || h.indexOf('#admin/') === 0) {
      window.history.replaceState(null, '', window.location.pathname + h);
      setTimeout(function () { switchPage('admin', null); }, 250);
    }
    // #blog or #blog/<slug> — keep the hash so the route stays deep-linkable.
    // Don't replaceState; the blog renderer needs the hash to know what to show.
    else if (h === '#blog' || h.indexOf('#blog/') === 0) {
      window.history.replaceState(null, '', window.location.pathname + h);
      switchPage('blog', null);
    }
  })();

  // Hash listener: lets back/forward and link clicks within blog/admin
  // re-route without a full reload. Only intervenes for these hashes; other
  // navigation continues through the existing nav buttons + switchPage flow.
  window.addEventListener('hashchange', function () {
    const h = window.location.hash;
    if (h === '#blog' || h.indexOf('#blog/') === 0) {
      switchPage('blog', null);
    } else if (h === '#admin' || h.indexOf('#admin/') === 0) {
      switchPage('admin', null);
    }
  });

  // ── IMMEDIATE SAVE HELPER ──
  // Call after any state mutation that doesn't already trigger a nav-save.
  // No-op when there's no active project or the user isn't signed in.
  function _autoSaveNow() {
    if (!activeProject) return;
    if (!appState.currentUser && userTier === 'free') return;
    const snap = snapshotCurrentState(activeProject);
    const idx = savedProjects.findIndex(p => p.id === snap.id);
    if (idx >= 0) savedProjects[idx] = snap;
    saveProject(snap).catch(err => console.warn('[immediate-save] failed', err));
  }

  // ── NAV SYNC: bidirectional sync for active project ──
  // Pull if the server has newer changes (collaborator edited); push otherwise.
  // Does NOT navigate away from the current page.
  async function syncActiveProject() {
    if (!activeProject) return;
    const btn = document.getElementById('navSyncBtn');
    if (btn) { btn.classList.remove('sync-ok', 'sync-pull'); btn.classList.add('spinning'); }

    try {
      if (!appState.currentUser) {
        // Anonymous — nothing to sync; flash neutral OK
        _showSyncResult(btn, 'sync-ok', 'No account — changes are local only');
        return;
      }

      // ── Step 1: check server timestamp only (cheap HEAD-style query) ──
      const { data: meta, error: metaErr } = await _supabase
        .from('projects')
        .select('id, updated_at')
        .eq('id', activeProject.id)
        .single();

      if (metaErr || !meta) {
        console.warn('[syncActiveProject] metadata fetch error:', metaErr && metaErr.message);
        return;
      }

      // Use savedProjects entry for local timestamp — it's updated on every save,
      // whereas activeProject.updated_at only reflects the load time.
      const localEntry      = savedProjects.find(p => p.id === activeProject.id);
      const localUpdatedAt  = (localEntry && localEntry.updated_at) || activeProject.updated_at || '';
      const serverUpdatedAt = meta.updated_at || '';

      if (serverUpdatedAt > localUpdatedAt) {
        // ── Server is newer: a collaborator has changes — PULL ──
        const { data: full, error: fullErr } = await _supabase
          .from('projects')
          .select('*')
          .eq('id', activeProject.id)
          .single();

        if (fullErr || !full) {
          console.warn('[syncActiveProject] full fetch error:', fullErr && fullErr.message);
          return;
        }

        const fresh = {
          id:          full.id,
          user_id:     full.user_id,
          name:        full.name,
          owner:       full.owner || '',
          description: full.description || '',
          created_at:  full.created_at,
          updated_at:  full.updated_at,
          ...(full.data || {})
        };

        const idx = savedProjects.findIndex(p => p.id === fresh.id);
        if (idx >= 0) savedProjects[idx] = fresh; else savedProjects.push(fresh);
        appState.projects = savedProjects.slice();
        loadProject(fresh.id);         // re-renders all pages in place
        _showSyncResult(btn, 'sync-pull', 'Pulled latest from server');

      } else {
        // ── Local is same or newer: PUSH our current state ──
        const snap = snapshotCurrentState(activeProject);
        const { error: saveErr } = await saveProject(snap);
        if (saveErr) {
          console.warn('[syncActiveProject] push error:', saveErr);
        } else {
          // Keep savedProjects in sync with the snapshot we just pushed
          const idx = savedProjects.findIndex(p => p.id === snap.id);
          if (idx >= 0) savedProjects[idx] = snap;
        }
        _showSyncResult(btn, 'sync-ok', 'Saved to server');
      }

    } catch(e) {
      console.error('[syncActiveProject] unexpected error:', e);
    } finally {
      if (btn) btn.classList.remove('spinning');
    }
  }

  // Brief visual feedback on the sync button: adds a result class for 1.5 s then removes it.
  function _showSyncResult(btn, cls, tipText) {
    if (!btn) return;
    btn.classList.add(cls);
    const prev = btn.title;
    btn.title = tipText;
    setTimeout(() => { btn.classList.remove(cls); btn.title = prev; }, 1500);
  }

  // ── AUTO-SAVE: every 60 seconds if there is an active project ──
  setInterval(function() {
    if (activeProject && !exampleMode) {
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
          // Restore last active project + page from localStorage (refresh recovery).
          // Skip if we're already in example mode — the hash handler already loaded
          // the demo project and navigated; restoring a stale saved project here
          // would overwrite the demo data and land the user on the wrong page.
          if (!exampleMode) {
            try {
              const lastId   = localStorage.getItem('cc_activeProjectId');
              const lastPage = localStorage.getItem('cc_lastPage');
              if (lastId) {
                const last = savedProjects.find(p => p.id === lastId);
                if (last) {
                  loadProject(lastId);
                  // Restore the page the user was on before refresh
                  if (lastPage && lastPage !== 'home' && lastPage !== 'proj') {
                    const navBtn = document.querySelector('[data-page="' + lastPage + '"]');
                    switchPage(lastPage, navBtn || null);
                  }
                }
              }
            } catch(e) {}
          }
        }
      });
      // Auto-open Tasks panel on page load if pending tasks exist
      _checkAndShowTasksOnAuth();
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

  const applyTmplOverlay = document.getElementById('applyTmplModal');
  if (applyTmplOverlay) applyTmplOverlay.addEventListener('click', function(e) {
    if (e.target === this) closeApplyTemplateModal();
  });

  // ── PUGH / SCOR STATE ──
  pughConcepts = [];   // [{id, name, customFieldValues}] — index 0 is always the Datum
  pughScores   = {};   // key: `${conceptId}_${reqId}` → '+' | '0' | '-' | number
  pughSettings = { advancedScoring: false, showMTHUS: false, showMAS: false, freezeTopRow: true };
  pughCollapsedIlities = new Set(); pughUserInteractedCollapse = false; pughChartSort = 'order';
  pughConceptCounter = 0;
  scoringConceptId   = null;
  scoringReqIndex    = 0;
  datumDefIndex      = 0;
  datumDefActive     = false;
  datumPerformance   = {};
  conceptPerformance = {};
  conceptNotes       = {};
  conceptCustomFields = [];
  _cfIdCounter       = 0;
  scorerFilter            = '';
  scorTagFilter           = [];
  scorTagMatchMode        = 'any';
  scorReqTagFilter        = [];
  scorReqTagMatchMode     = 'any';
  reqPageIlityFilter      = [];
  reqPageIlityMatchMode   = 'any';
  reqPageStakeholderFilter     = [];
  reqPageStakeholderMatchMode  = 'any';
  reqPageTagFilter        = [];
  reqPageTagMatchMode     = 'any';

  // ── SCOR: SETTINGS PANEL ──

  function toggleScoringSettings() {
    const panel = document.getElementById('scorSettingsPanel');
    const btn   = document.getElementById('scorSettingsBtn');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none' && panel.style.display !== '';
    if (isOpen) {
      closeScoringSettings();
    } else {
      panel.style.display = 'block';
      if (btn) btn.classList.add('active');
      renderCustomFieldsList();
      renderScorerFilterDropdown();
      renderTagFilterSection();
      renderScoringReqTagFilterSection();
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
      showUpgradePrompt('pugh-settings');
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

    // "My Assigned Tasks" appears first if the current user has active scoring tasks
    const myTasksOption = (myAssignedScoringTasks && myAssignedScoringTasks.length > 0)
      ? `<option value="__my_tasks__" ${scorerFilter === '__my_tasks__' ? 'selected' : ''}>My Assigned Tasks</option>`
      : '';

    sel.innerHTML = '<option value="">All Requirements</option>' +
      myTasksOption +
      scorerIds.map(id => {
        const s = allStakeholders.find(st => st.id === id);
        const label = s ? (s.contactName ? s.name + ' — ' + s.contactName : s.name) : id;
        return `<option value="${escHtml(id)}" ${scorerFilter === id ? 'selected' : ''}>${escHtml(label)}</option>`;
      }).join('');
  }

  // ── REQUIREMENTS PAGE: SETTINGS PANEL & FILTERS ──

  function toggleReqSettings() {
    const panel = document.getElementById('reqSettingsPanel');
    const btn   = document.getElementById('reqSettingsBtn');
    if (!panel) return;
    const isOpen = panel.style.display !== 'none' && panel.style.display !== '';
    if (isOpen) {
      closeReqSettings();
    } else {
      panel.style.display = 'block';
      if (btn) btn.classList.add('active');
      renderReqSettingsPanel();
      setTimeout(() => {
        document.addEventListener('click', _reqSettingsOutsideHandler);
      }, 0);
    }
  }

  function closeReqSettings() {
    const panel = document.getElementById('reqSettingsPanel');
    const btn   = document.getElementById('reqSettingsBtn');
    if (panel) panel.style.display = 'none';
    if (btn)   btn.classList.remove('active');
    document.removeEventListener('click', _reqSettingsOutsideHandler);
  }

  function _reqSettingsOutsideHandler(e) {
    const panel = document.getElementById('reqSettingsPanel');
    const btn   = document.getElementById('reqSettingsBtn');
    if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
      closeReqSettings();
    }
  }

  function getAllReqTags() {
    const tagSet = new Set();
    requirements.forEach(r => { if (Array.isArray(r.tags)) r.tags.forEach(t => tagSet.add(t)); });
    return [...tagSet].sort();
  }

  function renderReqTagSuggestions() {
    const container = document.getElementById('reqTagSuggestions');
    if (!container) return;
    const allTags = getAllReqTags();
    if (allTags.length === 0) { container.innerHTML = ''; return; }
    const inputEl = document.getElementById('reqTagsInput');
    const currentTags = new Set(
      (inputEl?.value || '').split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0)
    );
    container.innerHTML = allTags.map(tag => {
      const active = currentTags.has(tag);
      return `<span class="req-tag req-tag-user" data-suggest-tag="${escHtml(tag)}"
        title="${active ? 'Click to remove tag' : 'Click to add tag'}"
        style="cursor:pointer;opacity:${active ? '0.4' : '1'}"
      >${escHtml(tag)}</span>`;
    }).join('');
    container.querySelectorAll('[data-suggest-tag]').forEach(el => {
      el.addEventListener('click', () => addTagSuggestion(el.dataset.suggestTag));
    });
  }

  function addTagSuggestion(tag) {
    const inputEl = document.getElementById('reqTagsInput');
    if (!inputEl) return;
    const existing = inputEl.value.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    const idx = existing.indexOf(tag);
    if (idx === -1) {
      existing.push(tag);
      existing.sort();
    } else {
      existing.splice(idx, 1);
    }
    inputEl.value = existing.join(', ');
    renderReqTagSuggestions();
  }

  function getReqPageFilteredReqs() {
    let filtered = requirements;
    if (reqPageIlityFilter.length > 0) {
      filtered = filtered.filter(r => {
        const ids = [r.primary, ...(r.secondaries || [])].filter(Boolean);
        return reqPageIlityMatchMode === 'all'
          ? reqPageIlityFilter.every(id => ids.includes(id))
          : reqPageIlityFilter.some(id => ids.includes(id));
      });
    }
    if (reqPageStakeholderFilter.length > 0) {
      filtered = filtered.filter(r => {
        const staks = r.stakeholders || [];
        return reqPageStakeholderMatchMode === 'all'
          ? reqPageStakeholderFilter.every(id => staks.includes(id))
          : reqPageStakeholderFilter.some(id => staks.includes(id));
      });
    }
    if (reqPageTagFilter.length > 0) {
      filtered = filtered.filter(r => {
        const tags = r.tags || [];
        return reqPageTagMatchMode === 'all'
          ? reqPageTagFilter.every(t => tags.includes(t))
          : reqPageTagFilter.some(t => tags.includes(t));
      });
    }
    return filtered;
  }

  function _buildFilterBlock(items, activeFilter, matchMode, onChangeFn, onModeFn, emptyMsg) {
    if (items.length === 0) {
      return `<div style="font-size:12px;color:var(--text-muted)">${emptyMsg}</div>`;
    }
    const radioDisabled = activeFilter.length < 2 ? 'opacity:0.4;pointer-events:none' : '';
    const uid = onChangeFn; // use fn name as unique key for radio name attr
    return `
      <div style="margin-bottom:10px">
        ${items.map(item => {
          const checked = activeFilter.includes(item.id) ? 'checked' : '';
          return `<label style="display:flex;align-items:center;gap:8px;margin-bottom:5px;cursor:pointer;font-size:12px">
            <input type="checkbox" ${checked} onchange="${onChangeFn}('${escHtml(item.id)}',this.checked)" style="flex-shrink:0">
            <span>${escHtml(item.label)}</span>
          </label>`;
        }).join('')}
      </div>
      <div style="${radioDisabled}">
        <label style="display:flex;align-items:baseline;gap:8px;margin-bottom:5px;cursor:pointer;font-size:12px">
          <input type="radio" name="${uid}" value="any" ${matchMode==='any'?'checked':''} onchange="${onModeFn}('any')" style="flex-shrink:0;margin-top:2px">
          <span><strong>Match Any</strong> — show requirements with at least one selected</span>
        </label>
        <label style="display:flex;align-items:baseline;gap:8px;cursor:pointer;font-size:12px">
          <input type="radio" name="${uid}" value="all" ${matchMode==='all'?'checked':''} onchange="${onModeFn}('all')" style="flex-shrink:0;margin-top:2px">
          <span><strong>Match All</strong> — show requirements with every selected</span>
        </label>
      </div>`;
  }

  function renderReqSettingsPanel() {
    const allIlities = [...(typeof ILITIES !== 'undefined' ? ILITIES : []), ...(typeof customIlities !== 'undefined' ? customIlities : [])];
    const usedIlityIds = new Set(requirements.flatMap(r => [r.primary, ...(r.secondaries||[])].filter(Boolean)));
    const ilityItems = allIlities.filter(i => usedIlityIds.has(i.id)).map(i => ({ id: i.id, label: i.name }));

    const allStakeholders = [...(typeof STAKEHOLDERS !== 'undefined' ? STAKEHOLDERS : []), ...(typeof customStakeholders !== 'undefined' ? customStakeholders : [])];
    const usedStakIds = new Set(requirements.flatMap(r => r.stakeholders || []).filter(Boolean));
    const stakItems = allStakeholders.filter(s => usedStakIds.has(s.id)).map(s => ({ id: s.id, label: s.name }));

    const allTags = getAllReqTags().map(t => ({ id: t, label: t }));

    const ilityBody = document.getElementById('reqIlityFilterBody');
    const stakBody  = document.getElementById('reqStakeholderFilterBody');
    const tagBody   = document.getElementById('reqTagFilterBody');
    const countEl   = document.getElementById('reqFilterCount');

    if (ilityBody) ilityBody.innerHTML = _buildFilterBlock(ilityItems, reqPageIlityFilter, reqPageIlityMatchMode,
      'setReqPageIlityFilter', 'setReqPageIlityMatchMode', 'No ilities assigned to requirements yet.');
    if (stakBody)  stakBody.innerHTML  = _buildFilterBlock(stakItems, reqPageStakeholderFilter, reqPageStakeholderMatchMode,
      'setReqPageStakeholderFilter', 'setReqPageStakeholderMatchMode', 'No stakeholders assigned to requirements yet.');
    if (tagBody)   tagBody.innerHTML   = _buildFilterBlock(allTags, reqPageTagFilter, reqPageTagMatchMode,
      'setReqPageTagFilter', 'setReqPageTagMatchMode', 'No tags defined on requirements yet.');

    const filtered = getReqPageFilteredReqs();
    if (countEl) countEl.textContent = `Showing ${filtered.length} of ${requirements.length} requirement${requirements.length !== 1 ? 's' : ''}`;
  }

  function setReqPageIlityFilter(id, checked) {
    if (checked) { if (!reqPageIlityFilter.includes(id)) reqPageIlityFilter.push(id); }
    else { reqPageIlityFilter = reqPageIlityFilter.filter(x => x !== id); }
    renderReqSettingsPanel(); renderRequirements();
  }
  function setReqPageIlityMatchMode(mode) { reqPageIlityMatchMode = mode; renderReqSettingsPanel(); renderRequirements(); }

  function setReqPageStakeholderFilter(id, checked) {
    if (checked) { if (!reqPageStakeholderFilter.includes(id)) reqPageStakeholderFilter.push(id); }
    else { reqPageStakeholderFilter = reqPageStakeholderFilter.filter(x => x !== id); }
    renderReqSettingsPanel(); renderRequirements();
  }
  function setReqPageStakeholderMatchMode(mode) { reqPageStakeholderMatchMode = mode; renderReqSettingsPanel(); renderRequirements(); }

  function setReqPageTagFilter(id, checked) {
    if (checked) { if (!reqPageTagFilter.includes(id)) reqPageTagFilter.push(id); }
    else { reqPageTagFilter = reqPageTagFilter.filter(x => x !== id); }
    renderReqSettingsPanel(); renderRequirements();
  }
  function setReqPageTagMatchMode(mode) { reqPageTagMatchMode = mode; renderReqSettingsPanel(); renderRequirements(); }

  function clearAllReqFilters() {
    reqPageIlityFilter = []; reqPageIlityMatchMode = 'any';
    reqPageStakeholderFilter = []; reqPageStakeholderMatchMode = 'any';
    reqPageTagFilter = []; reqPageTagMatchMode = 'any';
    renderReqSettingsPanel();
    renderRequirements();
  }

  function clearConceptTagFilter() {
    scorTagFilter = []; scorTagMatchMode = 'any';
    renderTagFilterSection();
    renderConceptCards();
  }

  function clearScoringReqTagFilter() {
    scorReqTagFilter = []; scorReqTagMatchMode = 'any';
    renderScoringReqTagFilterSection();
    scoringReqIndex = 0;
    if (scoringConceptId) renderScoringView();
  }

  // ── SCOR: REQUIREMENT TAG FILTER (Section D of Concept Settings) ──

  function renderScoringReqTagFilterSection() {
    const body = document.getElementById('scorReqTagFilterBody');
    if (!body) return;
    const allTags = getAllReqTags();
    if (allTags.length === 0) {
      body.innerHTML = `<div style="font-size:12px;color:var(--text-muted);line-height:1.5">No tags defined on requirements yet. Add tags when creating or editing requirements.</div>`;
      return;
    }
    const radioDisabled = scorReqTagFilter.length < 2 ? 'opacity:0.4;pointer-events:none' : '';
    body.innerHTML = `
      <div style="margin-bottom:10px">
        ${allTags.map(tag => {
          const checked = scorReqTagFilter.includes(tag) ? 'checked' : '';
          return `<label style="display:flex;align-items:center;gap:8px;margin-bottom:5px;cursor:pointer;font-size:12px">
            <input type="checkbox" ${checked} onchange="setScoringReqTagFilter('${escHtml(tag)}',this.checked)" style="flex-shrink:0">
            <span class="req-tag req-tag-user">${escHtml(tag)}</span>
          </label>`;
        }).join('')}
      </div>
      <div style="${radioDisabled}">
        <label style="display:flex;align-items:baseline;gap:8px;margin-bottom:5px;cursor:pointer;font-size:12px">
          <input type="radio" name="scorReqTagMode" value="any" ${scorReqTagMatchMode==='any'?'checked':''} onchange="setScoringReqTagMatchMode('any')" style="flex-shrink:0;margin-top:2px">
          <span><strong>Match Any</strong> — show requirements with at least one selected tag</span>
        </label>
        <label style="display:flex;align-items:baseline;gap:8px;cursor:pointer;font-size:12px">
          <input type="radio" name="scorReqTagMode" value="all" ${scorReqTagMatchMode==='all'?'checked':''} onchange="setScoringReqTagMatchMode('all')" style="flex-shrink:0;margin-top:2px">
          <span><strong>Match All</strong> — show requirements with every selected tag</span>
        </label>
      </div>`;
  }

  function setScoringReqTagFilter(tag, checked) {
    if (checked) { if (!scorReqTagFilter.includes(tag)) scorReqTagFilter.push(tag); }
    else { scorReqTagFilter = scorReqTagFilter.filter(t => t !== tag); }
    renderScoringReqTagFilterSection();
    scoringReqIndex = 0;
    if (scoringConceptId) renderScoringView();
  }

  function setScoringReqTagMatchMode(mode) {
    scorReqTagMatchMode = mode;
    renderScoringReqTagFilterSection();
    scoringReqIndex = 0;
    if (scoringConceptId) renderScoringView();
  }

  // ── SCOR: TAG FILTER ──

  function getAllConceptTags() {
    const tagSet = new Set();
    pughConcepts.forEach(c => {
      if (Array.isArray(c.tags)) c.tags.forEach(t => tagSet.add(t));
    });
    return [...tagSet].sort();
  }

  function renderConceptTagSuggestions() {
    const container = document.getElementById('editConceptTagSuggestions');
    if (!container) return;
    const allTags = getAllConceptTags();
    if (allTags.length === 0) { container.innerHTML = ''; return; }
    const inputEl = document.getElementById('editConceptTagsInput');
    const currentTags = new Set(
      (inputEl?.value || '').split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0)
    );
    container.innerHTML = allTags.map(tag => {
      const active = currentTags.has(tag);
      return `<span class="req-tag req-tag-user" data-suggest-concept-tag="${escHtml(tag)}"
        title="${active ? 'Click to remove tag' : 'Click to add tag'}"
        style="cursor:pointer;opacity:${active ? '0.4' : '1'}"
      >${escHtml(tag)}</span>`;
    }).join('');
    container.querySelectorAll('[data-suggest-concept-tag]').forEach(el => {
      el.addEventListener('click', () => addConceptTagSuggestion(el.dataset.suggestConceptTag));
    });
  }

  function addConceptTagSuggestion(tag) {
    const inputEl = document.getElementById('editConceptTagsInput');
    if (!inputEl) return;
    const existing = inputEl.value.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0);
    const idx = existing.indexOf(tag);
    if (idx === -1) {
      existing.push(tag);
      existing.sort();
    } else {
      existing.splice(idx, 1);
    }
    inputEl.value = existing.join(', ');
    renderConceptTagSuggestions();
  }

  function getVisibleConceptCount() {
    // Count non-datum concepts passing both the scorer filter and the tag filter.
    let filtered = pughConcepts.slice(1);

    // Scorer filter (my-tasks mode restricts by assigned concept IDs)
    if (scorerFilter === '__my_tasks__' && typeof _getAssignedConceptIds === 'function') {
      const { allConcepts, ids } = _getAssignedConceptIds();
      if (!allConcepts) filtered = filtered.filter(c => ids.has(String(c.id)));
    }

    // Tag filter
    if (scorTagFilter.length > 0) {
      filtered = filtered.filter(c => {
        const tags = c.tags || [];
        return scorTagMatchMode === 'all'
          ? scorTagFilter.every(t => tags.includes(t))
          : scorTagFilter.some(t => tags.includes(t));
      });
    }

    return { visible: filtered.length, total: pughConcepts.length > 0 ? pughConcepts.length - 1 : 0 };
  }

  function renderTagFilterSection() {
    const body = document.getElementById('scorTagFilterBody');
    if (!body) return;
    const allTags = getAllConceptTags();

    if (allTags.length === 0) {
      body.innerHTML = `<div style="font-size:12px;color:var(--text-muted);line-height:1.5">No tags defined yet. Add tags to concepts using the <strong>Edit</strong> button on each concept card.</div>`;
      return;
    }

    const { visible, total } = getVisibleConceptCount();
    const radioDisabledStyle = scorTagFilter.length < 2 ? 'opacity:0.4;pointer-events:none' : '';

    body.innerHTML = `
      <div style="margin-bottom:12px">
        ${allTags.map(tag => {
          const checked = scorTagFilter.includes(tag) ? 'checked' : '';
          return `<label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;cursor:pointer;font-size:12px">
            <input type="checkbox" ${checked} onchange="setTagFilter('${escHtml(tag)}', this.checked)" style="flex-shrink:0">
            <span class="concept-tag">${escHtml(tag)}</span>
          </label>`;
        }).join('')}
      </div>
      <div style="margin-bottom:10px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:8px">Match mode</div>
        <div style="${radioDisabledStyle}">
          <label style="display:flex;align-items:baseline;gap:8px;margin-bottom:6px;cursor:pointer;font-size:12px">
            <input type="radio" name="scorTagMatchMode" value="any" ${scorTagMatchMode === 'any' ? 'checked' : ''} onchange="setTagMatchMode('any')" style="flex-shrink:0;margin-top:2px">
            <span><strong>Match Any</strong> — show concepts with at least one selected tag</span>
          </label>
          <label style="display:flex;align-items:baseline;gap:8px;cursor:pointer;font-size:12px">
            <input type="radio" name="scorTagMatchMode" value="all" ${scorTagMatchMode === 'all' ? 'checked' : ''} onchange="setTagMatchMode('all')" style="flex-shrink:0;margin-top:2px">
            <span><strong>Match All</strong> — show concepts with every selected tag</span>
          </label>
        </div>
      </div>
      <div style="font-size:11px;color:var(--text-muted);margin-top:4px">
        Showing <strong>${visible}</strong> of <strong>${total}</strong> concept${total !== 1 ? 's' : ''}
      </div>`;
  }

  function setTagFilter(tag, checked) {
    if (checked) {
      if (!scorTagFilter.includes(tag)) scorTagFilter.push(tag);
    } else {
      scorTagFilter = scorTagFilter.filter(t => t !== tag);
    }
    renderTagFilterSection();
    renderConceptCards();
  }

  function setTagMatchMode(mode) {
    scorTagMatchMode = mode;
    renderTagFilterSection();
    renderConceptCards();
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
    _autoSaveNow();
  }

  function deletePughConcept(id) {
    if (!confirm('Delete this concept and all its scores? This cannot be undone.')) return;
    pughConcepts = pughConcepts.filter(c => c.id !== id);
    Object.keys(pughScores).forEach(k => { if (k.startsWith(id + '_')) delete pughScores[k]; });
    _autoSaveNow();
    if (scoringConceptId === id) exitScoringView();
    renderConceptCards();
    renderPughMatrix();
  }

  let _editingConceptId = null;

  function openEditConceptModal(id) {
    const c = pughConcepts.find(c => c.id === id);
    if (!c) return;
    _editingConceptId = id;

    const isDatum = pughConcepts[0]?.id === id;
    document.getElementById('editConceptModalTitle').textContent = isDatum ? 'Edit Datum' : 'Edit Concept';
    document.getElementById('editConceptNameInput').value = c.name;
    document.getElementById('editConceptWarning').style.display = 'none';
    document.getElementById('editConceptWarning').textContent = '';

    // Populate custom fields (empty container if none defined)
    const container = document.getElementById('editConceptCustomFields');
    const fields = (typeof conceptCustomFields !== 'undefined') ? conceptCustomFields : [];
    if (fields.length > 0) {
      const vals = c.customFieldValues || {};
      container.innerHTML = fields.map(f => `
        <div class="modal-field">
          <div class="modal-label">${f.name}</div>
          <input class="modal-input" id="editCf_${f.id}"
            type="${f.type === 'number' ? 'number' : 'text'}"
            value="${vals[f.id] !== undefined ? vals[f.id] : ''}"
            placeholder="${f.type === 'number' ? 'e.g. 42' : 'e.g. Steel'}">
        </div>
      `).join('');
    } else {
      container.innerHTML = '';
    }

    // Populate tags field
    const tagsInput = document.getElementById('editConceptTagsInput');
    if (tagsInput) tagsInput.value = (c.tags || []).join(', ');
    renderConceptTagSuggestions();

    document.getElementById('editConceptModal').classList.add('open');
    setTimeout(() => document.getElementById('editConceptNameInput').focus(), 50);
  }

  function closeEditConceptModal() {
    document.getElementById('editConceptModal').classList.remove('open');
    _editingConceptId = null;
  }

  function saveEditConcept() {
    const c = pughConcepts.find(c => c.id === _editingConceptId);
    if (!c) return;

    const nameInput = document.getElementById('editConceptNameInput');
    const warning   = document.getElementById('editConceptWarning');
    const newName   = nameInput.value.trim();

    // Validation: blank name
    if (!newName) {
      warning.textContent    = 'Name cannot be blank.';
      warning.style.display  = '';
      nameInput.focus();
      return;
    }

    // Validation: duplicate name (case-insensitive, excluding self)
    const duplicate = pughConcepts.find(
      x => x.id !== _editingConceptId &&
           x.name.trim().toLowerCase() === newName.toLowerCase()
    );
    if (duplicate) {
      warning.textContent    = `A concept named "${newName}" already exists. Please choose a different name.`;
      warning.style.display  = '';
      nameInput.focus();
      return;
    }

    // Save name
    c.name = newName;

    // Save custom field values
    const fields = (typeof conceptCustomFields !== 'undefined') ? conceptCustomFields : [];
    if (!c.customFieldValues) c.customFieldValues = {};
    fields.forEach(f => {
      const inp = document.getElementById(`editCf_${f.id}`);
      if (inp) c.customFieldValues[f.id] = inp.value.trim();
    });

    // Save tags (split by comma, lowercase, trim, deduplicate, sort alphabetically)
    const tagsInput = document.getElementById('editConceptTagsInput');
    if (tagsInput) {
      c.tags = [...new Set(
        tagsInput.value.split(',')
          .map(t => t.trim().toLowerCase())
          .filter(t => t.length > 0)
      )].sort();
    }

    closeEditConceptModal();
    renderConceptCards();
    if (typeof renderPughMatrix === 'function') renderPughMatrix();
  }

  function startScoringConcept(id) {
    // Viewers cannot score at all
    if (typeof isViewOnly === 'function' && isViewOnly()) return;
    const isDatum = pughConcepts[0]?.id === id;
    if (isDatum) {
      // Toggle datum def view
      if (datumDefActive) { exitDatumDef(); return; }
      startDatumDef();
      return;
    }
    // Toggle: clicking the already-open card closes the scoring view
    if (scoringConceptId === id) { exitScoringView(); return; }
    scoringConceptId = id;
    scoringReqIndex  = 0;
    document.getElementById('scorEmptyState').style.display = 'none';
    // renderConceptCards positions the scoring view inline after the clicked card
    renderConceptCards();
    renderScoringView();
    setTimeout(() => {
      const sv = document.getElementById('scorScoringView');
      if (sv) sv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }

  function exitScoringView() {
    scoringConceptId = null;
    const datumDefView = document.getElementById('scorDatumDefView');
    const reqView      = document.getElementById('scorReqView');
    if (datumDefView) datumDefView.style.display = 'none';
    if (reqView)      reqView.style.display      = 'none';
    // renderConceptCards moves the scoring view back to its parked (hidden) position
    renderConceptCards();
  }

  // ── DATUM DEFINITION MODE ──

  function startDatumDef() {
    datumDefActive   = true;
    scoringConceptId = null; // clear any previously open concept so the datum card gets the inline view
    datumDefIndex    = 0;
    document.getElementById('scorEmptyState').style.display = 'none';
    // renderConceptCards positions the scoring view inline after the datum card
    renderConceptCards();
    renderDatumDefView();
    setTimeout(() => {
      const sv = document.getElementById('scorScoringView');
      if (sv) sv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
  }

  function exitDatumDef() {
    saveDatumField(); // persist any unsaved input before leaving
    datumDefActive = false;
    const datumDefView = document.getElementById('scorDatumDefView');
    const reqView      = document.getElementById('scorReqView');
    if (datumDefView) datumDefView.style.display = 'none';
    if (reqView)      reqView.style.display      = 'none';
    // renderConceptCards moves the scoring view back to its parked (hidden) position
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

  // Jump to the next concept while staying on the same requirement index.
  // Respects scorerFilter — the filtered req list is the same set across all concepts.
  function scoringNavConcept() {
    if (!scoringConceptId) return;
    saveConceptPerf();
    saveConceptNote();
    const nonDatumConcepts = pughConcepts.slice(1);
    if (nonDatumConcepts.length < 2) return;
    const currentIdx  = nonDatumConcepts.findIndex(c => c.id === scoringConceptId);
    const nextIdx     = (currentIdx + 1) % nonDatumConcepts.length; // wraps around
    const nextConcept = nonDatumConcepts[nextIdx];
    if (!nextConcept) return;
    scoringConceptId = nextConcept.id;
    // Keep scoringReqIndex but clamp if filtered list is shorter for this concept
    const filteredReqs = getFilteredReqs();
    if (scoringReqIndex >= filteredReqs.length) {
      scoringReqIndex = Math.max(0, filteredReqs.length - 1);
    }
    renderConceptCards(); // repositions the inline scoring view to the new concept's card
    renderScoringView();
    setTimeout(() => {
      const sv = document.getElementById('scorScoringView');
      if (sv) sv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 50);
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
    let reqs;
    if (!scorerFilter) {
      reqs = requirements;
    } else if (scorerFilter === '__my_tasks__') {
      const assignedReqIds = new Set();
      (myAssignedScoringTasks || []).forEach(t => {
        if (t.payload && Array.isArray(t.payload.requirementIds)) {
          t.payload.requirementIds.forEach(id => assignedReqIds.add(String(id)));
        }
      });
      reqs = requirements.filter(r => assignedReqIds.has(String(r.id)));
    } else {
      reqs = requirements.filter(r => r.scorer === scorerFilter);
    }
    return _applyReqTagFilter(reqs);
  }

  // Apply scoring requirement tag filter (Section D) on top of scorer filter
  function _applyReqTagFilter(reqs) {
    if (!scorReqTagFilter || scorReqTagFilter.length === 0) return reqs;
    return reqs.filter(r => {
      const tags = r.tags || [];
      return scorReqTagMatchMode === 'all'
        ? scorReqTagFilter.every(t => tags.includes(t))
        : scorReqTagFilter.some(t => tags.includes(t));
    });
  }

  // Returns the set of concept IDs the current user is assigned to score.
  // Used by renderConceptCards when in "__my_tasks__" filter mode.
  function _getAssignedConceptIds() {
    const ids = new Set();
    let allConcepts = false;
    (myAssignedScoringTasks || []).forEach(t => {
      if (!t.payload) return;
      if (t.payload.conceptScope === 'all') { allConcepts = true; return; }
      if (Array.isArray(t.payload.conceptIds)) {
        t.payload.conceptIds.forEach(id => ids.add(String(id)));
      }
    });
    return { allConcepts, ids };
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

    // Tags
    if (concept.tags && concept.tags.length > 0) {
      html += `<div class="concept-tags-row" style="margin-bottom:14px">`;
      concept.tags.forEach(t => {
        html += `<span class="concept-tag">${escHtml(t)}</span>`;
      });
      html += `</div>`;
    }

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

    // Utility summary (non-datum only)
    if (!isBaseline && requirements.length > 0) {
      const isWeightedMode = (typeof pairMode !== 'undefined' ? pairMode : 'nonweighted') === 'weighted'
                          && userTier !== 'free';
      if (typeof calcConceptSummary === 'function') {
        const _summSubj = (typeof pairSubject !== 'undefined') ? pairSubject : 'ilities';
        const summ = calcConceptSummary(conceptId);
        const maxPerReq = (pughSettings.advancedScoring && userTier !== 'free') ? 3 : 1;
        const maxUtil   = requirements.length * maxPerReq;
        const maxUtilW  = Math.round(requirements.reduce((s, r) => {
          const wKey = _summSubj === 'requirements' ? String(r.id) : r.primary;
          return s + maxPerReq * (window._pairWeights?.[wKey] || 1);
        }, 0) * 10) / 10;
        html += `<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px;padding:12px 14px;background:var(--bg);border-radius:8px;border:1px solid var(--border)">`;
        html += `<div style="font-size:12px"><span style="color:var(--text-muted)">+ Count: </span><strong style="color:var(--success)">+${summ.plusCount}</strong></div>`;
        html += `<div style="font-size:12px"><span style="color:var(--text-muted)">− Count: </span><strong style="color:var(--danger)">−${summ.minusCount}</strong></div>`;
        const netClr = summ.net > 0 ? 'var(--success)' : summ.net < 0 ? 'var(--danger)' : 'var(--text-muted)';
        html += `<div style="font-size:12px"><span style="color:var(--text-muted)">Utility: </span><strong style="color:${netClr}">${summ.net > 0 ? '+' : ''}${summ.net} <span style="font-weight:400;opacity:0.65">(max ${maxUtil})</span></strong></div>`;
        if (isWeightedMode) {
          const wNetClr = summ.weightedNet > 0 ? 'var(--success)' : summ.weightedNet < 0 ? 'var(--danger)' : 'var(--text-muted)';
          html += `<div style="font-size:12px"><span style="color:var(--text-muted)">Weighted Utility: </span><strong style="color:${wNetClr}">${summ.weightedNet > 0 ? '+' : ''}${summ.weightedNet} <span style="font-weight:400;opacity:0.65">(max ${maxUtilW})</span></strong></div>`;
        }
        html += `</div>`;
      }
    }

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
    // Viewers cannot score; scoped editors only if this cell is assigned to them
    if (typeof isViewOnly === 'function' && isViewOnly()) return;
    if (typeof isScopedEditor === 'function' && isScopedEditor()) {
      if (typeof canEditScoringCell === 'function' && !canEditScoringCell(reqId, conceptId)) return;
    }
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
    if (userTier === 'free') { cb.checked = false; showUpgradePrompt('pugh-settings'); return; }
    pughSettings.showMTHUS = cb.checked; renderPughMatrix();
  }
  function togglePughMAS(cb) {
    if (userTier === 'free') { cb.checked = false; showUpgradePrompt('pugh-settings'); return; }
    pughSettings.showMAS = cb.checked; renderPughMatrix();
  }

  // ── PUGH: CHART SORT ──
  function setPughChartSort(mode) {
    pughChartSort = mode;
    renderPughMatrix(); // renders matrix with new column order AND re-renders chart
  }

  // ── PUGH: FREEZE TOP ROW ──
  function togglePughFreezeRow(cb) {
    pughSettings.freezeTopRow = cb.checked;
    renderPughMatrix();
  }

  // ── PUGH: COLLAPSIBLE ILITY CATEGORIES ──
  function togglePughIlityCollapse(ilityId) {
    pughUserInteractedCollapse = true; // user manually toggled — respect their choice
    if (pughCollapsedIlities.has(ilityId)) {
      pughCollapsedIlities.delete(ilityId);
    } else {
      pughCollapsedIlities.add(ilityId);
    }
    renderPughMatrix();
  }

  function togglePughAllCategories() {
    pughUserInteractedCollapse = true; // user manually toggled — respect their choice
    const ilityOrder = [...ILITIES, ...(typeof customIlities !== 'undefined' ? customIlities : [])]
      .filter(il => selectedIlities.has(il.id));
    const reqsByIlity = {};
    requirements.forEach(r => {
      if (!reqsByIlity[r.primary]) reqsByIlity[r.primary] = [];
      reqsByIlity[r.primary].push(r);
    });
    const activeIlities = ilityOrder.filter(il => reqsByIlity[il.id] && reqsByIlity[il.id].length > 0);
    const hasUngrouped = requirements.some(r => !selectedIlities.has(r.primary));
    const allIds = activeIlities.map(il => il.id);
    if (hasUngrouped) allIds.push('__ungrouped__');
    if (allIds.length === 0) return;
    const allCollapsed = allIds.every(id => pughCollapsedIlities.has(id));
    pughCollapsedIlities.clear();
    if (!allCollapsed) allIds.forEach(id => pughCollapsedIlities.add(id));
    renderPughMatrix();
  }

  // ── PUGH: MTHUS / MTHUWS CALCULATION ──
  // MTHUS  = Maximum Theoretical Hybrid Utility Score
  //          For each requirement, take the BEST score across ALL concepts (including datum).
  //          Datum always scores 0, so the floor per requirement is 0 — ratios stay in 0–1.
  // MTHUWS = Same but each req's best score is multiplied by the active weight
  //          (ility-based or requirement-based, matching the user's pair subject setting).
  // Ratio  = concept's utility score / MTHUS (or MTHUWS for weighted variant)
  function calcMTHUS() {
    const _subj = (typeof pairSubject !== 'undefined') ? pairSubject : 'ilities';
    let mthus = 0, mthuws = 0;
    requirements.forEach(req => {
      // Use same weight key as calcConceptSummary so numerator and denominator match
      const wKey   = _subj === 'requirements' ? String(req.id) : req.primary;
      const weight = window._pairWeights?.[wKey] || 1;
      // Datum scores 0 by definition — include it by starting best at 0
      let best = 0;
      pughConcepts.slice(1).forEach(c => {
        const s = pughScores[c.id + '_' + req.id];
        let val = 0;
        if (s === '+') val = 1;
        else if (s === '-') val = -1;
        else if (s === '0') val = 0;
        else if (typeof s === 'number') val = s;
        if (val > best) best = val;
      });
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

  // ── SIDEBAR PREFERENCES ──

  function prefSetPairMode(mode) {
    if (mode === 'weighted' && userTier === 'free') { showUpgradePrompt('weighted-pair'); return; }
    pairMode = mode;
    syncPairView();
    syncSidebarPrefs();
  }

  function prefSetPairSubject(subject) {
    if (subject === 'requirements' && userTier === 'free') { showUpgradePrompt('pair-subject-req'); return; }
    pairSubject = subject;
    initPairPairs();
    initForcedRankOrder();
    syncPairView();
    syncSidebarPrefs();
  }

  function prefSetPairMethod(method) {
    pairMethod = method;
    if (method === 'forcedrank') initForcedRankOrder();
    syncPairView();
    syncSidebarPrefs();
  }

  function prefSetScoringMode(mode) {
    setScoringMode(mode);
    syncSidebarPrefs();
  }

  function prefSetMAS(on) {
    if (on && userTier === 'free') { showUpgradePrompt('pugh-settings'); return; }
    pughSettings.showMAS = on;
    renderPughMatrix();
    syncSidebarPrefs();
  }

  function prefSetMTHUS(on) {
    if (on && userTier === 'free') { showUpgradePrompt('pugh-settings'); return; }
    pughSettings.showMTHUS = on;
    renderPughMatrix();
    syncSidebarPrefs();
  }

  function syncSidebarPrefs() {
    const sb = (id, active) => { const el = document.getElementById(id); if (el) el.classList.toggle('active', active); };
    sb('prefPairNonWeightedBtn', pairMode    === 'nonweighted');
    sb('prefPairWeightedBtn',    pairMode    === 'weighted');
    sb('prefPairIlitiesBtn',     pairSubject === 'ilities');
    sb('prefPairReqsBtn',        pairSubject === 'requirements');
    sb('prefPairPairwiseBtn',    pairMethod  === 'pairwise');
    sb('prefPairForcedRankBtn',  pairMethod  === 'forcedrank');
    sb('prefScorModeBasicBtn',   !pughSettings.advancedScoring);
    sb('prefScorModeAdvBtn',     !!pughSettings.advancedScoring);
    sb('prefMASOffBtn',          !pughSettings.showMAS);
    sb('prefMASOnBtn',           !!pughSettings.showMAS);
    sb('prefMTHUSOffBtn',        !pughSettings.showMTHUS);
    sb('prefMTHUSOnBtn',         !!pughSettings.showMTHUS);
  }

  function updatePughAccountToggles() {
    // Matrix Settings panel removed — preferences now live in the sidebar.
    // Still sync tier badges across the app.
    updateTierBadges();
  }

  function updateTierBadges() {
    // Coaching button: show PRO badge for free/account; hide when already pro+
    const coachBadge = document.getElementById('coachProBadge');
    if (coachBadge) coachBadge.style.display = userTierMeets('pro') ? 'none' : '';

    // Pugh settings panel account+ badges: hide when already account or above
    const isAboveFree = userTier === 'account' || userTierMeets('pro');
    document.querySelectorAll('.account-badge-inline').forEach(el => {
      el.style.display = isAboveFree ? 'none' : '';
    });

    // Admin Tools dropdown: only visible to admins. updateTierBadges() runs on
    // every auth state change (login, logout, session restore), so this stays
    // in sync without a separate observer.
    const adminDropdown = document.getElementById('navAdminDropdown');
    if (adminDropdown) {
      const showAdmin = (typeof isAdmin === 'function') && isAdmin();
      adminDropdown.style.display = showAdmin ? '' : 'none';
    }
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

  // ── CONVERGENCE SUMMARY ──────────────────────────────────────

  function renderConvPage() {
    const isStructured = goalMode === 'structured';
    const basicSection  = document.getElementById('convGoalBasicSection');
    const structSection = document.getElementById('convGoalStructuredSection');
    if (basicSection)  basicSection.style.display  = isStructured ? 'none' : '';
    if (structSection) structSection.style.display = isStructured ? ''     : 'none';

    if (isStructured) {
      // Populate read-only TO / BY / WHILE displays
      const toVal    = document.getElementById('input-to')?.value    || '';
      const byVal    = document.getElementById('input-by')?.value    || '';
      const whileVal = document.getElementById('input-while')?.value || '';
      const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setText('convToDisplay',    toVal);
      setText('convByDisplay',    byVal);
      setText('convWhileDisplay', whileVal);

      // Populate concept dropdown and restore saved values
      populateConvDropdown('convConceptDropdownStructured');
      const ratEl = document.getElementById('convRationaleStructured');
      if (ratEl) { ratEl.value = convRationale; autoResize(ratEl); }

    } else {
      // Populate basic goal display
      const basicVal  = document.getElementById('input-goal-basic')?.value || '';
      const displayEl = document.getElementById('convGoalBasicDisplay');
      if (displayEl) displayEl.textContent = basicVal;

      // Populate concept dropdown and restore saved values
      populateConvDropdown('convConceptDropdownBasic');
      const ratEl = document.getElementById('convRationaleBasic');
      if (ratEl) { ratEl.value = convRationale; autoResize(ratEl); }
    }

    // Lessons Learned
    const lf = (id, key) => { const el = document.getElementById(id); if (el) { el.value = convLessons[key] || ''; autoResize(el); } };
    lf('convLessonReq',        'req');
    lf('convLessonConcepts',   'concepts');
    lf('convLessonAssumption', 'assumption');
    lf('convLessonDifferent',  'different');

    // Open Risks
    const risksEl = document.getElementById('convRisksField');
    if (risksEl) { risksEl.value = convRisks; autoResize(risksEl); }

    // Next Steps
    renderConvNextSteps();

    // Closed status
    updateConvClosedStatus();
  }

  function populateConvDropdown(dropdownId) {
    const sel = document.getElementById(dropdownId);
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select chosen concept —</option>';
    if (!pughConcepts.length) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.disabled = true;
      opt.textContent = 'No concepts scored yet';
      sel.appendChild(opt);
      return;
    }
    pughConcepts.forEach((c, i) => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name + (i === 0 ? ' (Datum / Baseline)' : '');
      sel.appendChild(opt);
    });
    if (convSelectedConceptId) sel.value = convSelectedConceptId;
  }

  function onConvConceptChange() {
    const isStructured = goalMode === 'structured';
    const dropId  = isStructured ? 'convConceptDropdownStructured' : 'convConceptDropdownBasic';
    const otherId = isStructured ? 'convConceptDropdownBasic'      : 'convConceptDropdownStructured';
    const sel = document.getElementById(dropId);
    convSelectedConceptId = sel ? sel.value : '';
    // Keep both dropdowns in sync
    const other = document.getElementById(otherId);
    if (other) other.value = convSelectedConceptId;
    convAutoSave();
  }

  function autoResize(el) {
    if (!el) return;
    el.style.overflowY = 'hidden';
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  function onConvRationaleInput() {
    const isStructured = goalMode === 'structured';
    const ratId = isStructured ? 'convRationaleStructured' : 'convRationaleBasic';
    const el = document.getElementById(ratId);
    convRationale = el ? el.value : '';
    autoResize(el);
    convAutoSave();
  }

  function onConvSave() {
    const lv = (id) => { const el = document.getElementById(id); autoResize(el); return el?.value || ''; };
    convLessons.req        = lv('convLessonReq');
    convLessons.concepts   = lv('convLessonConcepts');
    convLessons.assumption = lv('convLessonAssumption');
    convLessons.different  = lv('convLessonDifferent');
    convRisks = lv('convRisksField');
    convAutoSave();
  }

  function convAutoSave() {
    if (!activeProject) return;
    const snap = snapshotCurrentState(activeProject);
    saveProject(snap).catch(err => console.warn('[conv-save] failed', err));
  }

  function renderConvNextSteps() {
    const container = document.getElementById('convNextStepsList');
    if (!container) return;

    if (!convNextSteps.length) {
      container.innerHTML = '<div style="font-size:13px;color:var(--text-light);padding:0 0 12px;font-style:italic">No next steps added yet.</div>';
      return;
    }

    const esc = (s) => escHtml(s || '');
    let html = `
      <div class="conv-ns-header">
        <div class="conv-ns-col-what">What</div>
        <div class="conv-ns-col-who">Who</div>
        <div class="conv-ns-col-when">By When</div>
        <div class="conv-ns-col-del"></div>
      </div>`;

    convNextSteps.forEach(step => {
      html += `
        <div class="conv-ns-row" id="conv-ns-row-${step.id}">
          <div class="conv-ns-col-what">
            <input type="text" class="modal-input" placeholder="Action item"
              value="${esc(step.what)}"
              oninput="updateConvNextStep('${step.id}','what',this.value)">
          </div>
          <div class="conv-ns-col-who">
            <input type="text" class="modal-input" placeholder="Owner"
              value="${esc(step.who)}"
              oninput="updateConvNextStep('${step.id}','who',this.value)">
          </div>
          <div class="conv-ns-col-when">
            <input type="text" class="modal-input" placeholder="Date or milestone"
              value="${esc(step.when)}"
              oninput="updateConvNextStep('${step.id}','when',this.value)">
          </div>
          <div class="conv-ns-col-del">
            <button class="btn btn-ghost" onclick="removeConvNextStep('${step.id}')"
              title="Remove" style="padding:4px 8px;color:var(--text-light)">✕</button>
          </div>
        </div>`;
    });

    container.innerHTML = html;
  }

  function addConvNextStep() {
    _convNSCounter++;
    convNextSteps.push({ id: 'ns' + _convNSCounter, what: '', who: '', when: '' });
    renderConvNextSteps();
    // Focus the What field in the new row
    const rows = document.querySelectorAll('.conv-ns-row');
    const lastRow = rows[rows.length - 1];
    if (lastRow) { const inp = lastRow.querySelector('input'); if (inp) inp.focus(); }
  }

  function removeConvNextStep(id) {
    convNextSteps = convNextSteps.filter(s => s.id !== id);
    renderConvNextSteps();
    convAutoSave();
  }

  function updateConvNextStep(id, field, value) {
    const step = convNextSteps.find(s => s.id === id);
    if (step) { step[field] = value; convAutoSave(); }
  }

  function closeConvProject() {
    convClosedAt = new Date().toISOString();
    updateConvClosedStatus();
    convAutoSave();
  }

  function updateConvClosedStatus() {
    const statusEl = document.getElementById('convClosedStatus');
    const btn      = document.getElementById('convCloseBtn');
    if (!statusEl) return;
    if (convClosedAt) {
      const d = new Date(convClosedAt);
      const fmt = d.toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
                + ' ' + d.toLocaleTimeString('en-US', { hour:'2-digit', minute:'2-digit' });
      statusEl.innerHTML = `<div class="conv-closed-badge">✓ Convergence logged: ${fmt}</div>`;
      if (btn) btn.textContent = '✎ Update Convergence Date';
    } else {
      statusEl.innerHTML = '';
      if (btn) btn.textContent = '✓ Log Convergence Date';
    }
  }

  // ── Mode switching ──
  // setMode(mode) is the single point of truth for switching.
  // Full → Basic: syncs state into Basic Mode display fields.
  // Basic → Full: qsSync() was already called on each input, so state is current.
  // ── BASIC MODE DATA-LOSS PROTECTION ───────────────────────────
  // Holds the pending mode the user wants to switch to, shown in the warn modal.
  let _pendingModeSwitch = null;

  function _anonHasBasicData() {
    const isAnonymous = !(appState && appState.currentUser);
    if (!isAnonymous) return false;
    const goalVal = document.getElementById('qsGoal')?.value?.trim() || '';
    const projVal = document.getElementById('qsProjectName')?.value?.trim() || '';
    return requirements.length > 0 || pughConcepts.length > 1 || goalVal || projVal;
  }

  function closeBasicDataWarnModal(stayInBasic) {
    document.getElementById('basicDataWarnModal')?.classList.remove('open');
    if (!stayInBasic && _pendingModeSwitch) {
      const m = _pendingModeSwitch;
      _pendingModeSwitch = null;
      _doSetMode(m);
    } else {
      _pendingModeSwitch = null;
    }
  }

  function setMode(mode) {
    if (mode === appMode && mode === 'basic' && _currentPage === 'basic') return;

    // If switching to Full Mode as anon user with data, show the nudge modal first
    if (mode === 'full' && _anonHasBasicData()) {
      _pendingModeSwitch = mode;
      document.getElementById('basicDataWarnModal')?.classList.add('open');
      return;
    }
    _doSetMode(mode);
  }

  function _doSetMode(mode) {
    appMode = mode;

    // Update body class (controls nav-tools visibility via CSS)
    document.body.classList.toggle('mode-basic', mode === 'basic');
    document.body.classList.toggle('mode-full',  mode === 'full');
    // The visible nav mode toggle was removed; setMode() is now only called
    // programmatically (project create/load), so no toggle-button class updates needed.

    if (mode === 'basic') {
      // Save last full-mode page so we can return to it
      if (_currentPage !== 'basic') _lastFullPage = _currentPage;
      // Sync full-mode data into Basic Mode display
      syncGuidedToQS();
      switchPage('basic', null);
    } else {
      // Entering Full Mode: set defaults for data that came from Basic Mode
      goalMode = 'basic';   // Basic Mode goal maps to the Basic goal field
      // Return to last full-mode page (or HOME if first time)
      const returnPage = _lastFullPage || 'home';
      const navBtn = document.querySelector(`.nav-tool[data-page="${returnPage}"]`);
      switchPage(returnPage, navBtn);
    }
  }
