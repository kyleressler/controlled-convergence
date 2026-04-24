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
  var STEPS = [
    {
      page: 'proj',
      body: '<strong>This is your Project Manager.</strong><br><br>'
          + 'Any projects you own or are collaborating on will appear here. Right now, the UCI Road Bike Frame Design project is active — a real engineering study with 32 requirements and 18 competing frame designs.<br><br>'
          + '<em>Quick tip: at any point in the tour, click the <strong>ⓘ</strong> icon in the right sidebar to open help related to the current tool.</em><br><br>'
          + 'Click <strong>Continue to Goal Statement →</strong> to begin.',
      highlight: null,
      advance: 'navigate',
      nextPage: 'tbus',
      nextPageLabel: 'Goal Statement'
    },
    {
      page: 'tbus',
      body: '<strong>This is the Goal Statement.</strong><br><br>'
          + 'Every project starts here — a clear, single statement of what you\'re trying to achieve. For this project, the team defined their goal for the UCI road bike frame design before a single requirement was written.<br><br>'
          + 'Click inside the text box and try editing it. Don\'t worry — nothing in this example project is saved.<br><br>'
          + 'When you\'re done, click <strong>Continue to Stakeholders →</strong>',
      highlight: '#input-goal-basic',
      advance: 'navigate',
      nextPage: 'stak',
      nextPageLabel: 'Stakeholders'
    },
    {
      page: 'stak',
      body: '<strong>These are your project stakeholders.</strong><br><br>'
          + 'Stakeholders are the people your design needs to serve — riders, race officials, manufacturers, team mechanics, and more. Selecting them here tags your requirements later, so you always know whose needs are covered.<br><br>'
          + 'Try clicking a card to add or remove a stakeholder from the project.<br><br>'
          + 'Once you create an account, you can add fully custom stakeholder cards for your specific team or industry.<br><br>'
          + 'Click <strong>Continue to Lifecycle Properties →</strong> when you\'re ready.',
      highlight: '#stakGrid',
      advance: 'navigate',
      nextPage: 'ilities',
      nextPageLabel: 'Lifecycle Properties'
    },
    {
      page: 'ilities',
      body: '<strong>These are your project\'s Lifecycle Properties — sometimes called "ilities."</strong><br><br>'
          + 'They represent the qualities your design must have across its entire life: manufacturability, durability, repairability, and so on. Like stakeholders, selecting them here tags your requirements later for coverage and traceability analysis.<br><br>'
          + 'Try clicking a card to add or remove a lifecycle property from the project.<br><br>'
          + 'Custom ilities can be added once you create an account.<br><br>'
          + 'Click <strong>Continue to Requirements →</strong> when you\'re ready.',
      highlight: '#ilityGrid',
      advance: 'navigate',
      nextPage: 'requirements',
      nextPageLabel: 'Requirements'
    },
    {
      page: 'requirements',
      body: '<strong>This is the Requirements tool.</strong><br><br>'
          + 'Scroll down to see the 32 requirements already entered for this project. Notice the ility, stakeholder, and custom tags on each one — those come directly from your selections on the previous two pages.<br><br>'
          + 'Try expanding a <strong>Coverage Chart</strong> or <strong>Traceability Matrix</strong> to see a visual breakdown of how well your requirements cover the project\'s stakeholders and lifecycle properties.',
      highlight: null,
      advance: 'next'
    },
    {
      page: 'requirements',
      body: '<strong>Adding a new requirement is straightforward.</strong><br><br>'
          + 'Use the dropdowns to assign a stakeholder and lifecycle property (ility) — then fill in the requirement text and click <strong>Add Requirement</strong>. Every new requirement is automatically included in your coverage and traceability analysis.<br><br>'
          + 'When you\'re done exploring, click <strong>Continue to Weighting →</strong>',
      highlight: '#reqFormCard',
      advance: 'navigate',
      nextPage: 'pair',
      nextPageLabel: 'Weighting'
    },
    {
      page: 'pair',
      body: '<strong>Weighting determines how much each requirement or lifecycle property influences your final concept scores.</strong><br><br>'
          + 'In a real project, not all requirements carry equal importance — a UCI race frame might prioritize aerodynamic performance and weight savings over cost or repairability. Weighting lets your team encode those priorities so the analysis reflects what actually matters.<br><br>'
          + 'This example project is set to <strong>equal weighting</strong>, so every requirement counts the same. With a free account, you can switch to weighted mode and prioritize by lifecycle properties or individual requirements.<br><br>'
          + 'Click <strong>Continue to Concept Scoring →</strong> when you\'re ready.',
      highlight: null,
      advance: 'navigate',
      nextPage: 'scor',
      nextPageLabel: 'Concept Scoring'
    },
    {
      page: 'scor',
      body: '<strong>This is one of the most powerful tools in Controlled Convergence.</strong><br><br>'
          + 'Start by clicking the <strong>Datum</strong> card. The Datum is your reference concept — every other design will be scored against it. When the card expands, you\'ll see a requirement and the Datum\'s stated performance level for that requirement.<br><br>'
          + 'Use the <strong>Next</strong> button to page through a few of the 32 requirements and get familiar with how the Datum performs across the board.',
      highlight: '.datum-card',
      advance: 'next'
    },
    {
      page: 'scor',
      body: '<strong>Now let\'s score a concept. Click on the Aero Carbon Monocoque card.</strong><br><br>'
          + 'When it expands, you\'ll see — from top to bottom — a collapsible <strong>Concept Details</strong> panel, the current requirement, the Datum\'s performance for reference, <strong>scoring buttons</strong> (+ if this concept performs better, 0 if the same, − if worse), and two text boxes for notes.<br><br>'
          + 'Navigate by requirement or by concept using the buttons at the bottom. With an account, you can also assign scoring tasks to specific team members.<br><br>'
          + 'When you\'ve explored the tool, click <strong>Continue to Pugh Matrix →</strong>',
      highlight: null,
      advance: 'navigate',
      nextPage: 'pugh',
      nextPageLabel: 'Pugh Matrix'
    },
    {
      page: 'pugh',
      body: '<strong>The Pugh Matrix is where the scoring data comes together.</strong><br><br>'
          + 'Requirements are grouped by lifecycle property and collapsed by default. Click any <strong>▶</strong> toggle on the left to expand a group and see individual requirement scores across all 18 frame designs.<br><br>'
          + 'Scroll down to view each concept\'s <strong>+ Count</strong>, <strong>− Count</strong>, and <strong>Utility Score</strong> — and a Concept Score Summary chart that makes the winning and losing designs immediately visible.<br><br>'
          + 'Use the sort controls in the top right (<strong>Concept Order</strong>, <strong>Utility Rank</strong>, <strong>Fewest −</strong>) to reframe the analysis from different angles.<br><br>'
          + 'When you\'ve had a look, click <strong>Continue to Convergence Summary →</strong>',
      highlight: null,
      advance: 'navigate',
      nextPage: 'conv',
      nextPageLabel: 'Convergence Summary'
    },
    {
      page: 'conv',
      body: '<strong>This is where the project comes to a close.</strong><br><br>'
          + 'The Convergence Summary is where your team documents the chosen concept, lessons learned, open risks and assumptions, and next steps — everything needed to hand off to detailed design with confidence.<br><br>'
          + 'With a pro account, you can export the entire project — requirements, scores, matrix, and summary — to a PDF or Excel report.',
      highlight: null,
      advance: 'finish'
    }
  ];

  var TOTAL = STEPS.length; // 11

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
    +   '<p class="cc-tour-modal-body">Take an 11-step guided tour to see how Controlled Convergence works, or dive in on your own.</p>'
    +   '<div class="cc-tour-modal-footer">'
    +     '<button class="btn btn-primary" id="ccTourBtnStart">Start Guided Tour</button>'
    +     '<button class="btn btn-secondary" id="ccTourBtnSkip">Explore on My Own</button>'
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
    _createBackdrop();
    _goToStep(0);
  }

  function _exitTour() {
    _active = false;
    _disconnectObserver();
    _clearHighlight();
    _removeBackdrop();
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
    _clearHighlight();
    _step = idx;
    var step = STEPS[idx];

    // Apply highlight after a short rAF delay to let the page render
    if (step.highlight) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { _applyHighlight(step.highlight); });
      });
    }

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
    _clearHighlight();
    _removeBackdrop();
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

    var balloon = document.createElement('div');
    balloon.className = 'cc-tour-balloon';
    balloon.id = 'ccTourBalloon';
    balloon.innerHTML =
        '<div class="cc-tour-balloon-header">'
      +   '<span class="cc-tour-progress">Tour Complete ✓</span>'
      + '</div>'
      + '<div class="cc-tour-balloon-body">'
      +   '<div class="cc-tour-complete-title">You\'ve seen the full Controlled Convergence workflow.</div>'
      +   '<p style="margin:0 0 10px;font-size:13.5px;color:var(--text-muted);line-height:1.65">'
      +     'From goal statement to concept selection — the same structured process used worldwide by high performing teams, now available to any project and any team size.'
      +   '</p>'
      +   '<p style="margin:0 0 18px;font-size:14px;font-weight:600;color:var(--text)">Ready to run your own study?</p>'
      +   '<div style="display:flex;gap:10px">'
      +     '<button class="btn btn-primary" style="flex:1;justify-content:center" id="ccTourSignup">Create Free Account</button>'
      +     '<button class="btn btn-secondary" style="flex:1;justify-content:center" id="ccTourKeep">Keep Exploring</button>'
      +   '</div>'
      + '</div>';

    document.body.appendChild(balloon);

    document.getElementById('ccTourSignup').addEventListener('click', function () {
      _exitTour();
      if (typeof openAuthModal === 'function') openAuthModal('signup');
    });
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
