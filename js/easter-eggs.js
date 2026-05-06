// ============================================================
// easter-eggs.js — Hidden delights for the curious
//
// Easter eggs implemented:
//   #1  Konami code (↑↑↓↓←→←→BA) → Contra theme (localStorage-persisted)
//   #7  Type P-U-G-H (outside inputs) → Stuart Pugh photo overlay (5 s)
//   #9  Cycle all 5 themes in order within 20 s → Contra (page-scoped)
//
// Depends on: app.js calling window._easterEggThemeChanged(theme)
//             and window._easterEggSwitchPage() — both are no-ops if
//             this file isn't loaded, so the hooks are backwards-safe.
// ============================================================

(function () {
  'use strict';

  // ── SHARED STATE ────────────────────────────────────────────
  // Tracks which mechanism activated Contra so we know how to clean it up.
  //   'konami' → persisted in localStorage; cleared when user switches theme
  //   'cycle'  → page-scoped; cleared when switchPage fires
  //   null     → Contra not active via easter egg
  var _contraSource   = null;
  var _contraPreTheme = 'light'; // the theme to restore after a page-scoped Contra

  // Tracks whether the Springfield easter egg is active.
  //   'bart' → persisted in localStorage; cleared when user switches theme
  //   null   → Springfield not active
  var _bartSource = null;

  // ── UTIL: read the currently-active theme name ───────────────
  function _currentTheme() {
    var btn = document.querySelector('.theme-btn.active');
    return btn ? (btn.dataset.theme || 'light') : 'light';
  }


  // ════════════════════════════════════════════════════════════
  // #1 — KONAMI CODE → CONTRA THEME
  // Sequence: ↑ ↑ ↓ ↓ ← → ← → B A
  // Persists across reloads via localStorage key 'cc_easter_theme'
  // Cleared when the user manually switches to any normal theme
  // ════════════════════════════════════════════════════════════

  var KONAMI_SEQ = [
    'ArrowUp','ArrowUp','ArrowDown','ArrowDown',
    'ArrowLeft','ArrowRight','ArrowLeft','ArrowRight',
    'b','a'
  ];
  var _konamiBuf = [];

  function _applyContraTheme(source) {
    _contraPreTheme = _currentTheme();
    _contraSource   = source;
    _bartSource     = null; // Springfield yields to Contra

    document.body.classList.remove(
      'theme-dark','theme-engineering','theme-red-black','theme-green-yellow','theme-springfield'
    );
    document.body.classList.add('theme-contra');
    document.querySelectorAll('.theme-btn').forEach(function (b) {
      b.classList.remove('active');
    });

    if (source === 'konami') {
      try { localStorage.setItem('cc_easter_theme', 'contra'); } catch (e) {}
    }

    _showContraOverlay();
  }

  function _showContraOverlay() {
    var overlay = document.getElementById('ee-contra-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'ee-contra-overlay';
      overlay.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;' +
        'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'z-index:99999;pointer-events:none;' +
        'background:rgba(1,12,1,0.96);' +
        "font-family:'Courier New',monospace;color:#33ff33;" +
        'opacity:0;transition:opacity 0.35s;';
      overlay.innerHTML =
        '<div style="font-size:60px;font-weight:900;letter-spacing:12px;' +
        'text-shadow:0 0 24px #33ff33,0 0 60px rgba(51,255,51,0.4);">CONTRA</div>' +
        '<div style="font-size:12px;margin-top:14px;letter-spacing:5px;color:#1a8a1a;">THEME UNLOCKED</div>' +
        '<div style="font-size:10px;margin-top:7px;letter-spacing:3px;color:#0f5a0f;">↑↑↓↓←→←→BA</div>';
      document.body.appendChild(overlay);
    }
    overlay.style.display = 'flex';
    setTimeout(function () { overlay.style.opacity = '1'; }, 10);
    setTimeout(function () { overlay.style.opacity = '0'; }, 1800);
    setTimeout(function () { overlay.style.display = 'none'; }, 2200);
  }

  // Restore Konami Contra on page load (runs synchronously after app.js + loadTheme)
  (function () {
    try {
      if (localStorage.getItem('cc_easter_theme') === 'contra') {
        document.body.classList.remove(
          'theme-dark','theme-engineering','theme-red-black','theme-green-yellow'
        );
        document.body.classList.add('theme-contra');
        document.querySelectorAll('.theme-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        _contraSource = 'konami';
      }
    } catch (e) {}
  }());

  // Konami keydown listener
  document.addEventListener('keydown', function (e) {
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    // Normalise: arrow keys keep their e.key value, letters go lowercase
    var ARROWS = ['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'];
    var key = (ARROWS.indexOf(e.key) !== -1) ? e.key : e.key.toLowerCase();

    var expected = KONAMI_SEQ[_konamiBuf.length];
    if (key === expected) {
      _konamiBuf.push(key);
      if (_konamiBuf.length === KONAMI_SEQ.length) {
        _konamiBuf = [];
        _applyContraTheme('konami');
      }
    } else {
      // Reset; re-check if this key starts a fresh sequence
      _konamiBuf = (key === 'ArrowUp') ? ['ArrowUp'] : [];
    }
  });


  // ════════════════════════════════════════════════════════════
  // #7 — TYPE "PUGH" → STUART PUGH PHOTO OVERLAY
  // Works anywhere on the page while focus is not in an input.
  // Drop the photo at assets/stuart-pugh.png (or update the path below).
  // ════════════════════════════════════════════════════════════

  var PUGH_IMG_SRC = 'stuart-pugh.webp';
  var _pughBuf = [];

  function _showPughOverlay() {
    var overlay = document.getElementById('ee-pugh-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'ee-pugh-overlay';
      overlay.style.cssText =
        'position:fixed;top:0;left:0;width:100%;height:100%;' +
        'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
        'gap:24px;z-index:99998;pointer-events:none;' +
        'background:rgba(0,0,0,0);transition:background 0.25s;';
      overlay.innerHTML =
        '<div id="ee-pugh-title" style="' +
        'font-size:64px;font-weight:900;letter-spacing:8px;color:#ffffff;' +
        "font-family:'Inter',-apple-system,sans-serif;" +
        'text-shadow:0 0 40px rgba(255,255,255,0.85);' +
        'opacity:0;transition:opacity 0.25s;">TOTAL DESIGN</div>' +
        '<img id="ee-pugh-photo" src="' + PUGH_IMG_SRC + '" alt="Stuart Pugh" style="' +
        'max-width:240px;max-height:300px;border-radius:10px;' +
        'box-shadow:0 0 50px rgba(255,255,255,0.25);' +
        'opacity:0;transition:opacity 0.4s;">';
      document.body.appendChild(overlay);
    }

    var title = document.getElementById('ee-pugh-title');
    var photo = document.getElementById('ee-pugh-photo');

    // Reset state
    overlay.style.background = 'rgba(0,0,0,0)';
    title.style.opacity = '0';
    photo.style.opacity = '0';
    overlay.style.display = 'flex';

    // Step 1: dark backdrop + title fade in
    setTimeout(function () {
      overlay.style.background = 'rgba(0,0,0,0.92)';
      title.style.opacity = '1';
    }, 20);

    // Step 2: photo fades in after title appears
    setTimeout(function () {
      photo.style.opacity = '1';
    }, 550);

    // Step 3: fade everything out after 5 s total
    setTimeout(function () {
      title.style.opacity = '0';
      photo.style.opacity = '0';
      overlay.style.background = 'rgba(0,0,0,0)';
    }, 5200);

    setTimeout(function () {
      overlay.style.display = 'none';
    }, 5600);
  }

  // PUGH keydown listener
  document.addEventListener('keydown', function (e) {
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    var key = e.key.toLowerCase();
    var expected = 'pugh'[_pughBuf.length];

    if (key === expected) {
      _pughBuf.push(key);
      if (_pughBuf.length === 4) {
        _pughBuf = [];
        _showPughOverlay();
      }
    } else {
      // Reset; re-check if this key starts a fresh sequence
      _pughBuf = (key === 'p') ? ['p'] : [];
    }
  });


  // ════════════════════════════════════════════════════════════
  // #9 — CYCLE ALL 5 THEMES IN ORDER WITHIN 20 s → CONTRA
  // Required sequence: Light → Red & Black → Green & Yellow → Dark → Engineering
  // After the last theme lands, Contra activates (page-scoped only).
  // Navigating to another page restores the pre-cycle theme.
  // ════════════════════════════════════════════════════════════

  var CYCLE_SEQ   = ['light','red-black','green-yellow','dark','engineering'];
  var _cycleBuf   = [];
  var _cycleTimer = null;

  function _activateContraPageTheme() {
    _contraPreTheme = _currentTheme(); // will be 'engineering' — the last in the cycle
    _contraSource   = 'cycle';

    document.body.classList.remove(
      'theme-dark','theme-engineering','theme-red-black','theme-green-yellow'
    );
    document.body.classList.add('theme-contra');
    document.querySelectorAll('.theme-btn').forEach(function (b) {
      b.classList.remove('active');
    });

    _showContraBanner();
  }

  function _showContraBanner() {
    var old = document.getElementById('ee-contra-banner');
    if (old) old.remove();

    var banner = document.createElement('div');
    banner.id = 'ee-contra-banner';
    banner.style.cssText =
      'position:fixed;top:64px;left:50%;transform:translateX(-50%);' +
      'background:#010c01;border:1px solid #33ff33;color:#33ff33;' +
      "font-family:'Courier New',monospace;font-size:11px;letter-spacing:2px;" +
      'padding:7px 18px;border-radius:4px;z-index:9999;white-space:nowrap;' +
      'box-shadow:0 0 14px rgba(51,255,51,0.3);pointer-events:none;' +
      'opacity:0;transition:opacity 0.3s;';
    banner.textContent = '// CONTRA — switch theme or navigate to exit //';
    document.body.appendChild(banner);

    setTimeout(function () { banner.style.opacity = '1'; }, 10);
    setTimeout(function () { banner.style.opacity = '0'; }, 3800);
    setTimeout(function () { if (banner.parentNode) banner.remove(); }, 4200);
  }

  function _restorePreTheme() {
    _contraSource = null;
    document.body.classList.remove('theme-contra');
    var t = _contraPreTheme || 'light';
    if (t !== 'light') document.body.classList.add('theme-' + t);
    document.querySelectorAll('.theme-btn').forEach(function (b) {
      b.classList.remove('active');
    });
    var btn = document.querySelector('.theme-btn[data-theme="' + t + '"]');
    if (btn) btn.classList.add('active');
  }


  // ── HOOKS CALLED BY app.js ───────────────────────────────────

  // Called from setTheme() in app.js every time the user switches themes.
  window._easterEggThemeChanged = function (theme) {
    // If Konami Contra was active, user switching theme intentionally clears it
    if (_contraSource === 'konami') {
      try { localStorage.removeItem('cc_easter_theme'); } catch (e) {}
      _contraSource = null;
    }
    // If page-scoped Contra was active, a theme switch also clears it
    if (_contraSource === 'cycle') {
      _contraSource = null;
    }
    // If Springfield was active, a theme switch clears it
    if (_bartSource === 'bart') {
      try { localStorage.removeItem('cc_easter_theme'); } catch (e) {}
      _bartSource = null;
    }

    // ── Theme cycling tracker ──────────────────────────────────
    var expectedIdx = _cycleBuf.length;

    if (theme === CYCLE_SEQ[expectedIdx]) {
      _cycleBuf.push(theme);
      clearTimeout(_cycleTimer);

      if (_cycleBuf.length === CYCLE_SEQ.length) {
        // Full cycle complete — activate Contra after a brief pause so the
        // last theme (Engineering) renders visibly for a beat
        _cycleBuf = [];
        setTimeout(_activateContraPageTheme, 150);
      } else {
        // Keep the 20-second window alive between theme switches
        _cycleTimer = setTimeout(function () { _cycleBuf = []; }, 20000);
      }
    } else if (theme === CYCLE_SEQ[0]) {
      // Restarting from the first theme — reset and begin
      _cycleBuf = [theme];
      clearTimeout(_cycleTimer);
      _cycleTimer = setTimeout(function () { _cycleBuf = []; }, 20000);
    } else {
      // Out-of-order switch — reset the buffer entirely
      _cycleBuf = [];
      clearTimeout(_cycleTimer);
    }
  };

  // Called from switchPage() in app.js every time the user navigates between pages.
  window._easterEggSwitchPage = function () {
    if (_contraSource === 'cycle') {
      _restorePreTheme();
    }
  };


  // ════════════════════════════════════════════════════════════
  // #BART — TYPE "BART" → SPRINGFIELD THEME
  // Sequence: B A R T (outside inputs)
  // Persists across reloads via localStorage key 'cc_easter_theme' = 'springfield'
  // Cleared when the user manually switches to any normal theme.
  //
  // Visual: sky-blue D'OH! overlay with CSS donuts, then the Springfield
  // theme stays active (sky blue bg, handwritten Caveat font, yellow accents,
  // animated cloud layer) until the user manually changes theme.
  // ════════════════════════════════════════════════════════════

  var BART_SEQ = ['b', 'a', 'r', 't'];
  var _bartBuf = [];

  // Build a single CSS donut element (no images, no emoji).
  // holeColor should match the overlay or body background so the hole shows through.
  function _makeCSSDonut(holeColor) {
    var wrap = document.createElement('div');
    wrap.style.cssText = 'position:relative;width:72px;height:72px;flex-shrink:0;';

    var body = document.createElement('div');
    body.style.cssText =
      'width:72px;height:72px;border-radius:50%;' +
      'background:#f9a8d4;' +                            /* pink frosting */
      'box-shadow:' +
      '  6px -11px 0 -4px #f87171,' +                   /* red sprinkle    */
      ' -8px  -9px 0 -4px #60a5fa,' +                   /* blue sprinkle   */
      ' 12px   3px 0 -4px #34d399,' +                   /* green sprinkle  */
      '-12px   4px 0 -4px #fbbf24,' +                   /* yellow sprinkle */
      '  3px  12px 0 -4px #a78bfa,' +                   /* purple sprinkle */
      ' -5px  11px 0 -4px #fb923c;';                    /* orange sprinkle */

    var hole = document.createElement('div');
    hole.style.cssText =
      'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);' +
      'width:26px;height:26px;border-radius:50%;' +
      'background:' + holeColor + ';';

    wrap.appendChild(body);
    wrap.appendChild(hole);
    return wrap;
  }

  function _applySpringfieldTheme() {
    _bartSource   = 'bart';
    _contraSource = null; // Contra yields to Springfield

    document.body.classList.remove(
      'theme-dark','theme-engineering','theme-red-black','theme-green-yellow','theme-contra'
    );
    document.body.classList.add('theme-springfield');
    document.querySelectorAll('.theme-btn').forEach(function (b) {
      b.classList.remove('active');
    });

    try { localStorage.setItem('cc_easter_theme', 'springfield'); } catch (e) {}

    _showSpringfieldOverlay();
  }

  function _showSpringfieldOverlay() {
    var old = document.getElementById('ee-springfield-overlay');
    if (old) old.remove();

    var overlay = document.createElement('div');
    overlay.id = 'ee-springfield-overlay';
    overlay.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;' +
      'display:flex;flex-direction:column;align-items:center;justify-content:center;' +
      'gap:20px;z-index:99999;pointer-events:none;' +
      'background:#87ceeb;' +
      'opacity:0;transition:opacity 0.45s;';

    // ── Cloud layer behind everything ──
    var cloudLayer = document.createElement('div');
    cloudLayer.style.cssText =
      'position:absolute;top:0;left:0;width:100%;height:100%;' +
      'background-image:' +
      'radial-gradient(ellipse 100px 60px at 11% 18%, rgba(255,255,255,0.93) 55%, transparent 70%),' +
      'radial-gradient(ellipse 70px 46px at 7.5% 24%, rgba(255,255,255,0.93) 55%, transparent 70%),' +
      'radial-gradient(ellipse 70px 46px at 14.5% 24%, rgba(255,255,255,0.93) 55%, transparent 70%),' +
      'radial-gradient(ellipse 85px 52px at 85% 16%, rgba(255,255,255,0.93) 55%, transparent 70%),' +
      'radial-gradient(ellipse 60px 40px at 81% 21%, rgba(255,255,255,0.93) 55%, transparent 70%),' +
      'radial-gradient(ellipse 60px 40px at 89% 21%, rgba(255,255,255,0.93) 55%, transparent 70%),' +
      'radial-gradient(ellipse 80px 50px at 50% 10%, rgba(255,255,255,0.93) 55%, transparent 70%),' +
      'radial-gradient(ellipse 56px 38px at 46% 15%, rgba(255,255,255,0.93) 55%, transparent 70%),' +
      'radial-gradient(ellipse 56px 38px at 54% 15%, rgba(255,255,255,0.93) 55%, transparent 70%);' +
      'background-repeat:no-repeat;pointer-events:none;';
    overlay.appendChild(cloudLayer);

    // ── D'OH! ──
    var heading = document.createElement('div');
    heading.style.cssText =
      'position:relative;' +
      'font-size:96px;font-weight:700;' +
      'color:#fed90f;' +
      "font-family:'Caveat',cursive;" +
      'text-shadow:' +
      '  4px  4px 0 #3d2b1f,' +
      ' -3px -3px 0 #3d2b1f,' +
      '  3px -3px 0 #3d2b1f,' +
      ' -3px  3px 0 #3d2b1f,' +
      '  0px  5px 0 #3d2b1f;' +
      'letter-spacing:6px;';
    heading.textContent = "D'OH!";
    overlay.appendChild(heading);

    // ── Three CSS donuts ──
    var donutRow = document.createElement('div');
    donutRow.style.cssText =
      'position:relative;display:flex;gap:32px;align-items:center;';
    donutRow.appendChild(_makeCSSDonut('#87ceeb'));
    donutRow.appendChild(_makeCSSDonut('#87ceeb'));
    donutRow.appendChild(_makeCSSDonut('#87ceeb'));
    overlay.appendChild(donutRow);

    // ── Unlock label ──
    var label = document.createElement('div');
    label.style.cssText =
      'position:relative;' +
      'font-size:24px;font-weight:700;' +
      'color:#3d2b1f;letter-spacing:3px;' +
      "font-family:'Caveat',cursive;";
    label.textContent = 'SPRINGFIELD THEME UNLOCKED';
    overlay.appendChild(label);

    // ── Subtext ──
    var sub = document.createElement('div');
    sub.style.cssText =
      'position:relative;' +
      'font-size:17px;color:#5c3d1e;' +
      "font-family:'Caveat',cursive;" +
      'font-style:italic;';
    sub.textContent = 'Mmm... donuts...';
    overlay.appendChild(sub);

    document.body.appendChild(overlay);

    // Fade in → hold → fade out
    setTimeout(function () { overlay.style.opacity = '1'; }, 20);
    setTimeout(function () { overlay.style.opacity = '0'; }, 3200);
    setTimeout(function () { if (overlay.parentNode) overlay.remove(); }, 3700);
  }

  // Restore Springfield theme on page load if it was previously unlocked
  (function () {
    try {
      if (localStorage.getItem('cc_easter_theme') === 'springfield') {
        document.body.classList.remove(
          'theme-dark','theme-engineering','theme-red-black','theme-green-yellow','theme-contra'
        );
        document.body.classList.add('theme-springfield');
        document.querySelectorAll('.theme-btn').forEach(function (b) {
          b.classList.remove('active');
        });
        _bartSource = 'bart';
      }
    } catch (e) {}
  }());

  // BART keydown listener
  document.addEventListener('keydown', function (e) {
    var tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    var key = e.key.toLowerCase();
    var expected = BART_SEQ[_bartBuf.length];

    if (key === expected) {
      _bartBuf.push(key);
      if (_bartBuf.length === BART_SEQ.length) {
        _bartBuf = [];
        _applySpringfieldTheme();
      }
    } else {
      // Reset; re-check if this key starts the sequence
      _bartBuf = (key === 'b') ? ['b'] : [];
    }
  });

}());
