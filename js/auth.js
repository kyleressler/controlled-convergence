// ============================================================
// auth.js — Authentication (Supabase)
//
// Depends on: _supabase (from config.js), appState + userTier (from state.js)
// Called by: app.js (init, handleAccountCTA, handleLogout)
// ============================================================

// ── Client-side login rate limiting ──────────────────────────
// Tracks failed attempts per email in sessionStorage. After MAX_ATTEMPTS
// failures within WINDOW_MS, the login function returns an error without
// hitting Supabase. Supabase has its own server-side limits as a backstop.
const _LOGIN_MAX_ATTEMPTS = 5;
const _LOGIN_WINDOW_MS    = 15 * 60 * 1000; // 15 minutes

function _getRateLimit(email) {
  try {
    const key  = 'cc_login_rl_' + btoa(email.toLowerCase().trim()).replace(/=/g, '');
    const raw  = sessionStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : { count: 0, first: Date.now() };
    return { key, data };
  } catch (_e) {
    return { key: null, data: { count: 0, first: Date.now() } };
  }
}

function _recordFailedLogin(email) {
  try {
    const { key, data } = _getRateLimit(email);
    if (!key) return;
    const now = Date.now();
    if (now - data.first > _LOGIN_WINDOW_MS) {
      // Window expired — start fresh
      sessionStorage.setItem(key, JSON.stringify({ count: 1, first: now }));
    } else {
      sessionStorage.setItem(key, JSON.stringify({ count: data.count + 1, first: data.first }));
    }
  } catch (_e) { /* sessionStorage may be unavailable */ }
}

function _clearLoginRateLimit(email) {
  try {
    const { key } = _getRateLimit(email);
    if (key) sessionStorage.removeItem(key);
  } catch (_e) { }
}

function _isLoginRateLimited(email) {
  try {
    const { data } = _getRateLimit(email);
    const now = Date.now();
    if (now - data.first > _LOGIN_WINDOW_MS) return false; // window expired
    return data.count >= _LOGIN_MAX_ATTEMPTS;
  } catch (_e) {
    return false; // fail open — don't block logins if storage is broken
  }
}

/**
 * Sign in with email + password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: object|null, error: string|null}>}
 */
async function login(email, password) {
  if (_isLoginRateLimited(email)) {
    return { user: null, error: 'Too many failed login attempts. Please wait 15 minutes and try again.' };
  }
  const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
  if (error) {
    _recordFailedLogin(email);
    return { user: null, error: error.message };
  }
  _clearLoginRateLimit(email); // successful login resets the counter
  const user = await _buildUserFromSession(data.user);
  appState.currentUser = user;
  userTier = user.tier || 'free';
  if (typeof identifyUser === 'function') identifyUser(user);
  return { user, error: null };
}

/**
 * Register a new user account.
 * @param {string} email
 * @param {string} password
 * @param {string} [name] — display name
 * @returns {Promise<{user: object|null, error: string|null, requiresEmailConfirm: boolean}>}
 */
async function register(email, password, name) {
  const { data, error } = await _supabase.auth.signUp({ email, password });
  if (error) return { user: null, error: error.message, requiresEmailConfirm: false };

  // If email confirm is disabled in Supabase dashboard, data.session will be set immediately.
  // If confirm is required, data.session is null and we show a "check your email" message.
  const requiresEmailConfirm = !data.session;

  if (!requiresEmailConfirm && data.user) {
    // Optionally write the name to user_profiles (the trigger creates the row,
    // but name isn't set by the trigger — we patch it here)
    if (name) {
      await _supabase
        .from('user_profiles')
        .update({ name })
        .eq('id', data.user.id);
    }
    const user = await _buildUserFromSession(data.user);
    appState.currentUser = user;
    userTier = user.tier || 'free';
    if (typeof identifyUser === 'function') identifyUser(user);
    return { user, error: null, requiresEmailConfirm: false };
  }

  return { user: null, error: null, requiresEmailConfirm: true };
}

/**
 * Sign out the current user.
 * @returns {Promise<{error: string|null}>}
 */
async function logout() {
  const { error } = await _supabase.auth.signOut();
  // Explicitly scrub Supabase session keys from localStorage.
  // Safari on iOS doesn't always propagate the signOut() storage
  // change reliably, so we force-clear them to prevent the session
  // from being restored on the next page load.
  try {
    // Scrub Supabase session keys (Safari doesn't always propagate signOut())
    // and all app-level cc_* keys so the next user doesn't inherit stale
    // project state (active project ID, last page, session count, etc.)
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-') || k.startsWith('cc_'))
      .forEach(k => localStorage.removeItem(k));
  } catch (e) { /* localStorage may be restricted in some Safari contexts */ }
  appState.currentUser = null;
  userTier = 'free';
  if (typeof resetAnalyticsUser === 'function') resetAnalyticsUser();
  return { error: error ? error.message : null };
}

/**
 * Return the currently authenticated user, or null.
 * @returns {Promise<{user: object|null, error: null}>}
 */
async function getCurrentUser() {
  return { user: appState.currentUser, error: null };
}

/**
 * Bootstrap auth state on app load (called from init()).
 * Restores session if one exists, then subscribes to future changes.
 */
async function initAuth() {
  // Restore session from localStorage (Supabase handles this automatically)
  const { data: { session } } = await _supabase.auth.getSession();
  if (session && session.user) {
    const user = await _buildUserFromSession(session.user);
    appState.currentUser = user;
    userTier = user.tier || 'free';
    if (typeof identifyUser === 'function') identifyUser(user);
    // Update UI immediately — don't wait for onAuthStateChange to fire.
    // Without this, there's a visible "logged out" flash on every page refresh.
    _onAuthStateUpdated();
  }

  // Subscribe to auth state changes (login, logout, signup).
  // The SDK fires this for login/logout. With autoRefreshToken disabled
  // (config.js) and our own refresh in supa-session.js, the SDK does
  // less work here than before, but onAuthStateChange still fires for
  // the user-initiated flows.
  _supabase.auth.onAuthStateChange(async (event, session) => {
    if (session && session.user) {
      const user = await _buildUserFromSession(session.user);
      appState.currentUser = user;
      userTier = user.tier || 'free';
      if (typeof identifyUser === 'function') identifyUser(user);
      if (typeof _hideSessionWarning === 'function') _hideSessionWarning();
    } else {
      appState.currentUser = null;
      userTier = 'free';
      if (typeof resetAnalyticsUser === 'function') resetAnalyticsUser();
      // SIGNED_OUT fired without user clicking logout = session expired mid-session
      if (event === 'SIGNED_OUT' && typeof _showSessionWarning === 'function') {
        _showSessionWarning();
      }
    }
    _onAuthStateUpdated();
  });
}

/**
 * True iff the currently authenticated user has the 'admin' tier.
 * Reads from appState.currentUser.tier (populated by _buildUserFromSession,
 * which fetches user_profiles.tier on every session restore + auth state change).
 *
 * Used to gate admin.html and the #admin route in app.js.
 *
 * @returns {boolean}
 */
function isAdmin() {
  return !!(appState && appState.currentUser && appState.currentUser.tier === 'admin');
}

// ── Internal helpers ──────────────────────────────────────────

/**
 * Build a normalized user object from a Supabase auth user.
 * Fetches the user_profiles row to get tier, name, and theme.
 */
async function _buildUserFromSession(supabaseUser) {
  if (!supabaseUser) return null;

  // Fetch the profile row (created automatically by a DB trigger on signup)
  const { data: profile } = await _supabase
    .from('user_profiles')
    .select('tier, name, theme')
    .eq('id', supabaseUser.id)
    .single();

  return {
    id:    supabaseUser.id,
    email: supabaseUser.email,
    name:  profile?.name  || supabaseUser.email.split('@')[0],
    tier:  (profile?.tier || 'free').toLowerCase(),
    theme: profile?.theme || 'engineering'
  };
}

/**
 * Called after any auth state change. Refreshes all relevant UI.
 */
function _onAuthStateUpdated() {
  if (typeof updateAccountStatus    === 'function') updateAccountStatus();
  if (typeof updateTierBadges       === 'function') updateTierBadges();
  if (typeof updatePughAccountToggles=== 'function') updatePughAccountToggles();
  if (typeof renderProjList         === 'function') renderProjList();
  if (typeof renderTemplateList     === 'function') renderTemplateList();
  if (typeof _refreshTasksNavBtn    === 'function') _refreshTasksNavBtn();
  _refreshLogoutButton();
  _refreshSidebarProfile();
  // Close the auth modal if a user just signed in — handles the case where
  // submitAuthLogin/Signup fails to reach closeAuthModal() due to an error.
  if (appState.currentUser && typeof closeAuthModal === 'function') {
    closeAuthModal();
  }

  // Feature 8: link any tasks that were created for this email before they
  // had an account. Fire-and-forget — errors are non-fatal.
  // Note: Supabase RPC builders are thenable but don't expose .catch() directly,
  // so we use .then(null, handler) to swallow errors safely.
  if (appState.currentUser) {
    _supabase.rpc('link_pending_tasks_to_user').then(null, function() {});
  }
}

/** Enable/disable the logout button based on login state. */
function _refreshLogoutButton() {
  const btn = document.getElementById('logoutBtn');
  if (!btn) return;
  if (appState.currentUser) {
    btn.style.opacity = '1';
    btn.style.cursor  = 'pointer';
    btn.title = '';
    btn.onclick = handleLogout;
  } else {
    btn.style.opacity = '0.5';
    btn.style.cursor  = 'not-allowed';
    btn.title = 'Sign in first';
    btn.onclick = null;
  }
}

/** Show the signed-in user's name in the sidebar profile row, and make it clickable when logged in. */
function _refreshSidebarProfile() {
  const nameEl = document.getElementById('sidebarProfileName');
  const rowEl  = document.getElementById('sidebarProfileRow');
  if (!nameEl) return;
  if (appState.currentUser) {
    nameEl.textContent = appState.currentUser.name || appState.currentUser.email;
    if (rowEl) {
      rowEl.classList.add('clickable');
      rowEl.title   = 'Account settings';
      rowEl.onclick = function() {
        if (typeof openSettingsModal === 'function') openSettingsModal();
      };
    }
  } else {
    nameEl.textContent = 'Not signed in';
    if (rowEl) {
      rowEl.classList.remove('clickable');
      rowEl.title   = '';
      rowEl.onclick = null;
    }
  }
}
