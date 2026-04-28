// ============================================================
// tour.js — Guided product tour for the example project
// Triggered by: loadExampleProject() calling window.ccTour.onExampleLoaded()
// No dependencies on other CC modules except the global switchPage() and openAuthModal()
// ============================================================

(function () {
  'use strict';

  // ─────────────────────────────────────────────────────────────
  // TOUR STEPS
  // Each step: page, body (HTML), highlight (CSS selector|null),
  //            advance ('next'|'navigate'|'finish'),
  //            nextPage + nextPageLabel (when advance === 'navigate')
  // ─────────────────────────────────────────────────────────────
  // Phase 8: refreshed for view-only example mode and the current feature
  // set. No interactive prompts ("try clicking…") — the example project is
  // strictly view-only; the user saves it to their projects to interact.
  // Highlights and dimming are gone (Phase 8) — prose carries the tour.
  var STEPS = [
    {
      page: 'proj',
      body: '<strong>This is your Project Manager — your home base.</strong><br><br>'
          + 'Any projects you own or collaborate on appear here. Right now the active project is the <strong>UCI Road Bike Frame Design</strong> — a real engineering study with 32 requirements and 18 competing concepts.<br><br>'
          + '<em>Heads up: this example is view-only. Use the <strong>Save to My Projects</strong> button at the top right anytime if you want to interact with these tools yourself.</em><br><br>'
          + 'Click <strong>Continue to Goal Statement →</strong>',
      advance: 'navigate', nextPage: 'tbus', nextPageLabel: 'Goal Statement'
    },
    {
      page: 'tbus',
      body: '<strong>Every project starts with a Goal Statement.</strong><br><br>'
          + 'A clear, single sentence about what the team is trying to achieve — no requirements yet, no concepts. Just the destination. The team defined this goal before writing any of their 32 requirements.<br><br>'
          + 'Click <strong>Continue to Stakeholders →</strong>',
      advance: 'navigate', nextPage: 'stak', nextPageLabel: 'Stakeholders'
    },
    {
      page: 'stak',
      body: '<strong>Stakeholders are the people your design needs to serve.</strong><br><br>'
          + 'Selecting them tags every requirement so you can spot whose needs are covered and where the gaps are. Riders, race officials, manufacturers, team mechanics — the bike team selected these. Custom stakeholders for your industry are available with a free account.<br><br>'
          + 'Click <strong>Continue to Lifecycle Properties →</strong>',
      advance: 'navigate', nextPage: 'ilities', nextPageLabel: 'Lifecycle Properties'
    },
    {
      page: 'ilities',
      body: '<strong>Lifecycle Properties — sometimes called "ilities" — are the qualities your design must have across its full life.</strong><br><br>'
          + 'Durability, manufacturability, cost, performance, and so on. Like stakeholders, they tag requirements for coverage analysis. Custom ilities are available with a free account.<br><br>'
          + 'Click <strong>Continue to Requirements →</strong>',
      advance: 'navigate', nextPage: 'requirements', nextPageLabel: 'Requirements'
    },
    {
      page: 'requirements',
      body: '<strong>This is the Requirements tool.</strong><br><br>'
          + 'Scroll to see the 32 requirements. Notice the tags on each — they come from the stakeholders and ilities you saw on the previous pages, and they power the <strong>Coverage Charts</strong> and <strong>Traceability Matrix</strong> on the right. New requirements would be added via the <strong>+ Requirement</strong> button in the top right.',
      advance: 'next'
    },
    {
      page: 'pair',
      body: '<strong>Weighting encodes which requirements (or ilities) matter most.</strong><br><br>'
          + 'A race frame might prioritize aerodynamic performance over cost — weighting lets the team encode that so the analysis reflects what actually matters. This example uses <strong>equal weighting</strong>; with a free account you can switch to weighted mode and prioritize by lifecycle properties or individual requirements.<br><br>'
          + 'Click <strong>Continue to Concept Scoring →</strong>',
      advance: 'navigate', nextPage: 'scor', nextPageLabel: 'Concept Scoring'
    },
    {
      page: 'scor',
      body: '<strong>The Datum is your reference concept.</strong><br><br>'
          + 'Every other design is scored against it. The Datum card (left) expands to show one requirement and the Datum\'s stated performance for that requirement. Page through a few requirements with the navigation buttons to get a feel for the Datum\'s profile.',
      advance: 'next'
    },
    {
      page: 'scor',
      body: '<strong>Each concept is scored against the Datum, requirement by requirement.</strong><br><br>'
          + 'For every requirement, a concept gets <strong>+</strong> (better than the Datum), <strong>0</strong> (equal), or <strong>−</strong> (worse). The team did this for all 18 concepts × 32 requirements. Notes can be attached to each cell to capture the reasoning.<br><br>'
          + 'Click <strong>Continue to Pugh Matrix →</strong>',
      advance: 'navigate', nextPage: 'pugh', nextPageLabel: 'Pugh Matrix'
    },
    {
      page: 'pugh',
      body: '<strong>The Pugh Matrix brings all the scoring data together.</strong><br><br>'
          + 'Requirements are grouped by ility and collapsed by default — click any <strong>▶</strong> to expand. Scroll down for <strong>+ Count</strong>, <strong>− Count</strong>, and <strong>Utility Score</strong> per concept, plus a Concept Score Summary chart that makes winning and losing designs immediately visible. Sort controls reframe the analysis from different angles.<br><br>'
          + 'Click <strong>Continue to Convergence Summary →</strong>',
      advance: 'navigate', nextPage: 'conv', nextPageLabel: 'Convergence Summary'
    },
    {
      page: 'conv',
      body: '<strong>This is where the project closes out.</strong><br><br>'
          + 'The Convergence Summary documents the chosen concept, lessons learned, open risks and assumptions, and next steps — everything needed to hand off to detailed design with confidence. Pro accounts can export the entire project as a PDF or Excel report.',
      advance: 'finish'
    }
  ];

  var TOTAL = STEPS.length; // 10 (was 11; merged the requirements form step into Requirements since the form is collapsed by default now)

  // ─────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────
  var _active       = false;
  var _step         = 0;
  var _pageObserver = null;

  // ─────────────────────────────────────────────────────────────
  // CSS INJECTION
  // ─────────────────────────────────────────────────────────────
  function _injectStyles() {
    if (document.getElementById('cc-tour-styles')) return;
    var s = document.createElement('style');
    s.id = 'cc-tour-styles';
    s.textContent = [
      '/* ── CC TOUR: ENTRY MODAL ── */',
      '.cc-tour-modal-overlay {',
      '  position:fixed; inset:0;',
      '  background:rgba(0,0,0,0.5);',
      '  display:flex; align-items:center; justify-content:center;',
      '  z-index:10000;',
      '  opacity:0; pointer-events:none;',
      '  transition:opacity 0.2s;',
      '}',
      '.cc-tour-modal-overlay.open { opacity:1; pointer-events:all; }',
      '.cc-tour-modal-box {',
      '  background:var(--surface);',
      '  border:1px solid var(--border);',
      '  border-radius:14px;',
      '  padding:32px 28px 24px;',
      '  max-width:460px;',
      '  width:calc(100vw - 32px);',
      '  box-shadow:0 16px 48px rgba(0,0,0,0.22);',
      '}',
      '.cc-tour-modal-title {',
      '  font-size:18px; font-weight:700;',
      '  color:var(--text); margin:0 0 14px; line-height:1.3;',
      '}',
      '.cc-tour-modal-body {',
      '  font-size:14px; color:var(--text-muted);',
      '  line-height:1.65; margin:0 0 10px;',
      '}',
      '.cc-tour-modal-footer {',
      '  display:flex; gap:10px; margin-top:22px;',
      '}',
      '.cc-tour-modal-footer .btn { flex:1; justify-content:center; }',

      '/* ── CC TOUR: BACKDROP ── */',
      '.cc-tour-backdrop {',
      '  position:fixed; inset:0;',
      '  background:rgba(0,0,0,0.35);',
      '  z-index:10001;',
      '  pointer-events:none;',
      '}',

      '/* ── CC TOUR: HIGHLIGHT RING ── */',
      '.cc-tour-ring {',
      '  position:fixed;',
      '  border:2.5px solid var(--accent);',
      '  border-radius:10px;',
      '  box-shadow:0 0 0 4px rgba(var(--accent-rgb),0.18);',
      '  z-index:10002;',
      '  pointer-events:none;',
      '  animation:cc-tour-pulse 2.2s ease-in-out infinite;',
      '}',
      '@keyframes cc-tour-pulse {',
      '  0%,100% { box-shadow:0 0 0 4px rgba(var(--accent-rgb),0.18); }',
      '  50%      { box-shadow:0 0 0 8px rgba(var(--accent-rgb),0.07); }',
      '}',

      '/* ── CC TOUR: BALLOON ── */',
      '.cc-tour-balloon {',
      '  position:fixed;',
      '  bottom:24px;',
      '  left:50%;',
      '  transform:translateX(-50%);',
      '  width:min(540px, calc(100vw - 24px));',
      '  background:var(--surface);',
      '  border:1px solid var(--border);',
      '  border-radius:14px;',
      '  box-shadow:0 8px 36px rgba(0,0,0,0.22);',
      '  z-index:10003;',
      '  padding:18px 22px 16px;',
      '  pointer-events:all;',
      '  animation:cc-tour-balloon-in 0.2s ease-out;',
      '}',
      '@keyframes cc-tour-balloon-in {',
      '  from { opacity:0; transform:translateX(-50%) translateY(10px); }',
      '  to   { opacity:1; transform:translateX(-50%) translateY(0);    }',
      '}',
      '.cc-tour-balloon-header {',
      '  display:flex; align-items:center;',
      '  justify-content:space-between;',
      '  margin-bottom:12px;',
      '}',
      '.cc-tour-progress {',
      '  font-size:11px; font-weight:600;',
      '  color:var(--text-muted); letter-spacing:0.05em;',
      '  text-transform:uppercase;',
      '}',
      '.cc-tour-exit-btn {',
      '  background:none; border:none; padding:0;',
      '  font-size:12px; color:var(--text-muted);',
      '  cursor:pointer; text-decoration:underline;',
      '  text-underline-offset:2px; font-family:inherit;',
      '}',
      '.cc-tour-exit-btn:hover { color:var(--text); }',
      '.cc-tour-balloon-body {',
      '  font-size:13.5px; color:var(--text);',
      '  line-height:1.65; margin-bottom:14px;',
      '}',
      '.cc-tour-balloon-footer {',
      '  display:flex; align-items:center;',
      '  justify-content:space-between; gap:10px;',
      '}',
      '.cc-tour-hint {',
      '  font-size:12px; color:var(--text-muted);',
      '  font-style:italic;',
      '}',
      '.cc-tour-btn-group { display:flex; gap:8px; }',

      '/* ── CC TOUR: COMPLETE CARD ── */',
      '.cc-tour-complete-title {',
      '  font-size:17px; font-weight:700;',
      '  color:var(--text); margin:0 0 12px;',
      '}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ─────────────────────────────────────────────────────────────
  // ENTRY MODAL
  // ─────────────────────────────────────────────────────────────
  function _showEntryModal() {
    _injectStyles();
    if (document.getElementById('ccTourModal')) return;

    var el = document.createElement('div');
    el.className = 'cc-tour-modal-overlay';
    el.id = 'ccTourModal';
    el.innerHTML =
      '<div class="cc-tour-modal-box">'
    +   '<div class="cc-tour-modal-title">Welcome to the UCI Road Bike Frame Design Project</div>'
    +   '<p class="cc-tour-modal-body">You\'re about to explore a real concept selection study — 32 engineering requirements, 18 competing frame designs, and a structured path to the winning concept.</p>'
    +   '<p class="cc-tour-modal-body">Take a quick 10-step guided tour to see how Controlled Convergence works, or look around on your own. The example is view-only — when you\'re ready to interact with the tools, click <strong>Save to My Projects</strong> at the top right to get an editable copy.</p>'
    +   '<div class="cc-tour-modal-footer">'
    +     '<button class="btn btn-primary" id="ccTourBtnStart">Start Guided Tour</button>'
    +     '<button class="btn btn-secondary" id="ccTourBtnSkip">Look Around on My Own</button>'
    +   '</div>'
    + '</div>';

    document.body.appendChild(el);

    // Animate in after paint
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { el.classList.add('open'); });
    });

    document.getElementById('ccTourBtnStart').addEventListener('click', function () {
      _closeModal();
      _startTour();
    });
    document.getElementById('ccTourBtnSkip').addEventListener('click', _closeModal);
  }

  function _closeModal() {
    var el = document.getElementById('ccTourModal');
    if (!el) return;
    el.classList.remove('open');
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 250);
  }

  // ─────────────────────────────────────────────────────────────
  // TOUR START / EXIT
  // ─────────────────────────────────────────────────────────────
  function _startTour() {
    _active = true;
    _step   = 0;
    // Phase 8: backdrop dim + highlight rings removed. The balloon at the
    // bottom carries the prose; the user looks at the actual UI in its
    // natural visual context.
    _goToStep(0);
  }

  function _exitTour() {
    _active = false;
    _disconnectObserver();
    _removeBalloon();
  }

  // ─────────────────────────────────────────────────────────────
  // BACKDROP
  // ─────────────────────────────────────────────────────────────
  function _createBackdrop() {
    if (document.getElementById('ccTourBackdrop')) return;
    var bd = document.createElement('div');
    bd.className = 'cc-tour-backdrop';
    bd.id = 'ccTourBackdrop';
    document.body.appendChild(bd);
  }

  function _removeBackdrop() {
    var bd = document.getElementById('ccTourBackdrop');
    if (bd && bd.parentNode) bd.parentNode.removeChild(bd);
  }

  // ─────────────────────────────────────────────────────────────
  // STEP NAVIGATION
  // ─────────────────────────────────────────────────────────────
  function _goToStep(idx) {
    _disconnectObserver(); // always disconnect before setting up new state
    _step = idx;
    var step = STEPS[idx];
    _renderBalloon(idx);
    // For cross-page advance: watch for the target page becoming active
    if (step.advance === 'navigate') {
      _watchForPage(step.nextPage, function () {
        _goToStep(idx + 1);
      });
    }
  }

  function _nextStep() {
    if (_step >= TOTAL - 1) return;
    _goToStep(_step + 1);
  }

  function _prevStep() {
    if (_step <= 0) return;
    _disconnectObserver(); // disconnect before any navigation to prevent race

    var prevIdx  = _step - 1;
    var fromPage = STEPS[_step].page;
    var toPage   = STEPS[prevIdx].page;

    // Navigate the app back to the previous page if it changed
    if (toPage !== fromPage) {
      var navBtn = document.querySelector('[data-page="' + toPage + '"]');
      switchPage(toPage, navBtn || null);
    }

    _goToStep(prevIdx);
  }

  function _finishTour() {
    _disconnectObserver();
    _showCompleteCard();
  }

  // ─────────────────────────────────────────────────────────────
  // BALLOON RENDERING
  // ─────────────────────────────────────────────────────────────
  function _removeBalloon() {
    var b = document.getElementById('ccTourBalloon');
    if (b && b.parentNode) b.parentNode.removeChild(b);
  }

  function _renderBalloon(idx) {
    _removeBalloon();
    var step    = STEPS[idx];
    var isFirst = (idx === 0);

    var backHtml = isFirst
      ? '<span></span>' // spacer to keep footer alignment
      : '<button class="btn btn-secondary" id="ccTourBack">← Back</button>';

    var advanceHtml;
    if (step.advance === 'navigate') {
      advanceHtml = '<span class="cc-tour-hint">↑ Click <strong>Continue to '
                  + step.nextPageLabel + ' →</strong> to proceed</span>';
    } else if (step.advance === 'finish') {
      advanceHtml = '<button class="btn btn-continue" id="ccTourFinish">Finish Tour →</button>';
    } else {
      // advance === 'next'
      advanceHtml = '<button class="btn btn-primary" id="ccTourNext">Next →</button>';
    }

    var balloon = document.createElement('div');
    balloon.className = 'cc-tour-balloon';
    balloon.id = 'ccTourBalloon';
    balloon.innerHTML =
        '<div class="cc-tour-balloon-header">'
      +   '<span class="cc-tour-progress">Step ' + (idx + 1) + ' of ' + TOTAL + '</span>'
      +   '<button class="cc-tour-exit-btn" id="ccTourExit">Exit Tour</button>'
      + '</div>'
      + '<div class="cc-tour-balloon-body">' + step.body + '</div>'
      + '<div class="cc-tour-balloon-footer">'
      +   '<div class="cc-tour-btn-group">' + backHtml    + '</div>'
      +   '<div class="cc-tour-btn-group">' + advanceHtml + '</div>'
      + '</div>';

    document.body.appendChild(balloon);

    // Wire buttons
    document.getElementById('ccTourExit').addEventListener('click', _exitTour);

    if (!isFirst) {
      var backBtn = document.getElementById('ccTourBack');
      if (backBtn) backBtn.addEventListener('click', _prevStep);
    }
    if (step.advance === 'next') {
      var nextBtn = document.getElementById('ccTourNext');
      if (nextBtn) nextBtn.addEventListener('click', _nextStep);
    }
    if (step.advance === 'finish') {
      var finBtn = document.getElementById('ccTourFinish');
      if (finBtn) finBtn.addEventListener('click', _finishTour);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // TOUR COMPLETE CARD
  // ─────────────────────────────────────────────────────────────
  function _showCompleteCard() {
    _removeBalloon();

    // Phase 8: wrap-up card. Two CTAs depending on auth state:
    // - Logged in: "Save This Example to My Projects" calls saveExampleToAccount
    //   which preserves the example data into a real owned project.
    // - Anonymous: "Sign up & save this example" opens the signup modal;
    //   after they sign up they're invited to save.
    // Plus a neutral "Skip and look around" that just exits the tour.
    var loggedIn = !!(typeof appState !== 'undefined' && appState.currentUser);
    var primaryLabel = loggedIn ? 'Save This Example to My Projects' : 'Sign up & save this example';
    var primaryId    = loggedIn ? 'ccTourSaveExample' : 'ccTourSignup';

    var balloon = document.createElement('div');
    balloon.className = 'cc-tour-balloon';
    balloon.id = 'ccTourBalloon';
    balloon.innerHTML =
        '<div class="cc-tour-balloon-header">'
      +   '<span class="cc-tour-progress">Tour Complete ✓</span>'
      + '</div>'
      + '<div class="cc-tour-balloon-body">'
      +   '<div class="cc-tour-complete-title">That\'s the full Controlled Convergence workflow.</div>'
      +   '<p style="margin:0 0 14px;font-size:13.5px;color:var(--text-muted);line-height:1.65">'
      +     'To play with these tools using your own data, save this example as your project — you\'ll get an editable copy of everything you just saw — or start a fresh project from scratch.'
      +   '</p>'
      +   '<div style="display:flex;gap:10px;flex-wrap:wrap">'
      +     '<button class="btn btn-primary" style="flex:1;min-width:200px;justify-content:center" id="' + primaryId + '">' + primaryLabel + '</button>'
      +     '<button class="btn btn-secondary" style="flex:1;min-width:140px;justify-content:center" id="ccTourKeep">Skip and look around</button>'
      +   '</div>'
      + '</div>';

    document.body.appendChild(balloon);

    if (loggedIn) {
      document.getElementById('ccTourSaveExample').addEventListener('click', function () {
        _exitTour();
        if (typeof saveExampleToAccount === 'function') saveExampleToAccount();
      });
    } else {
      document.getElementById('ccTourSignup').addEventListener('click', function () {
        _exitTour();
        if (typeof openAuthModal === 'function') openAuthModal('signup');
      });
    }
    document.getElementById('ccTourKeep').addEventListener('click', _exitTour);
  }

  // ─────────────────────────────────────────────────────────────
  // PAGE CHANGE DETECTION (MutationObserver on target page element)
  // ─────────────────────────────────────────────────────────────
  function _disconnectObserver() {
    if (_pageObserver) {
      _pageObserver.disconnect();
      _pageObserver = null;
    }
  }

  function _watchForPage(pageId, callback) {
    var el = document.getElementById('page-' + pageId);
    if (!el) return;
    var obs = new MutationObserver(function () {
      if (el.style.display === 'block') {
        obs.disconnect();
        _pageObserver = null;
        // Short delay to let the page finish rendering before showing next balloon
        setTimeout(callback, 80);
      }
    });
    obs.observe(el, { attributes: true, attributeFilter: ['style'] });
    _pageObserver = obs;
  }

  // ─────────────────────────────────────────────────────────────
  // HIGHLIGHT RING (fixed-position overlay, pointer-events: none)
  // ─────────────────────────────────────────────────────────────
  function _clearHighlight() {
    var ring = document.getElementById('ccTourRing');
    if (ring && ring.parentNode) ring.parentNode.removeChild(ring);
  }

  function _applyHighlight(selector) {
    _clearHighlight();
    var target = document.querySelector(selector);
    if (!target) return;

    var rect = target.getBoundingClientRect();
    // Skip if the element has no size or is off-screen
    if (!rect.width || !rect.height) return;

    var PAD  = 5;
    var ring = document.createElement('div');
    ring.className = 'cc-tour-ring';
    ring.id = 'ccTourRing';
    ring.style.top    = (rect.top    - PAD) + 'px';
    ring.style.left   = (rect.left   - PAD) + 'px';
    ring.style.width  = (rect.width  + PAD * 2) + 'px';
    ring.style.height = (rect.height + PAD * 2) + 'px';
    document.body.appendChild(ring);
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC API — called by app.js after loadExampleProject()
  // ─────────────────────────────────────────────────────────────
  window.ccTour = {
    onExampleLoaded: function () {
      // Brief delay so the page settles before the modal appears
      setTimeout(_showEntryModal, 450);
    }
  };

}());
