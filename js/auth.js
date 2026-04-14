// ============================================================
// auth.js — Authentication (Supabase)
//
// Depends on: _supabase (from config.js), appState + userTier (from state.js)
// Called by: app.js (init, handleAccountCTA, handleLogout)
// ============================================================

/**
 * Sign in with email + password.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{user: object|null, error: string|null}>}
 */
async function login(email, password) {
  const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
  if (error) return { user: null, error: error.message };
  const user = await _buildUserFromSession(data.user);
  appState.currentUser = user;
  userTier = user.tier || 'free';
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
    Object.keys(localStorage)
      .filter(k => k.startsWith('sb-'))
      .forEach(k => localStorage.removeItem(k));
  } catch (e) { /* localStorage may be restricted in some Safari contexts */ }
  appState.currentUser = null;
  userTier = 'free';
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
  }

  // Subscribe to auth state changes (login, logout, token refresh)
  _supabase.auth.onAuthStateChange(async (event, session) => {
    if (session && session.user) {
      const user = await _buildUserFromSession(session.user);
      appState.currentUser = user;
      userTier = user.tier || 'free';
    } else {
      appState.currentUser = null;
      userTier = 'free';
    }
    // Refresh UI to reflect the new auth state
    _onAuthStateUpdated();
  });
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
    tier:  profile?.tier  || 'free',
    theme: profile?.theme || 'engineering'
  };
}

/**
 * Called after any auth state change. Refreshes all relevant UI.
 */
function _onAuthStateUpdated() {
  if (typeof updateAccountStatus    === 'function') updateAccountStatus();
  if (typeof updateTierBadges       === 'function') updateTierBadges();
  if (typeof updatePughMemberToggles=== 'function') updatePughMemberToggles();
  if (typeof renderProjList         === 'function') renderProjList();
  if (typeof renderTemplateList     === 'function') renderTemplateList();
  _refreshLogoutButton();
  _refreshSidebarProfile();
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

/** Show the signed-in user's name in the sidebar profile row. */
function _refreshSidebarProfile() {
  const nameEl = document.getElementById('sidebarProfileName');
  if (!nameEl) return;
  nameEl.textContent = appState.currentUser
    ? (appState.currentUser.name || appState.currentUser.email)
    : 'Not signed in';
}
