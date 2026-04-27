// ============================================================
// supa-session.js — Session management, independent of Supabase SDK.
//
// We own the JWT lifecycle in plain JS so the app's hot-path saves and
// loads never depend on the SDK's internal state machine (which has
// proven unreliable: stuck refresh promises, hung fetch promises that
// Safari refuses to abort, multi-instance lock contention, etc.).
//
// What this file owns:
//   - Reading / writing the session blob in localStorage (the same key
//     the Supabase SDK uses, so they share state during the transition)
//   - Exposing the current access token synchronously (no network)
//   - Refreshing the token via raw POST to /auth/v1/token
//   - Background auto-refresh (every 60s, refresh if expiring within 5 min)
//
// What this file does NOT do:
//   - Login / signup / logout — those still go through the SDK in auth.js
//   - Manage the user object — that's appState.currentUser, set by auth.js
//   - Anything UI-related
//
// Dependencies: SUPABASE_URL, SUPABASE_ANON_KEY (from config.js)
// Used by: supa-rest.js (every REST request reads the token via _authGetAccessToken)
// ============================================================

// localStorage key matches what the Supabase SDK uses, so we share state.
// Format: sb-{projectRef}-auth-token where projectRef is the subdomain.
const _AUTH_STORAGE_KEY =
  'sb-' + SUPABASE_URL.replace('https://', '').split('.')[0] + '-auth-token';

// How often the background loop checks whether to refresh.
const _AUTH_REFRESH_CHECK_INTERVAL_MS = 60 * 1000;

// Refresh the token if it expires within this window.
// 5 min margin means even slow networks have time to refresh before expiry.
const _AUTH_REFRESH_BEFORE_EXPIRY_S = 5 * 60;

// Hard timeout on the refresh fetch itself.
const _AUTH_REFRESH_FETCH_TIMEOUT_MS = 12000;

// Read the session blob from localStorage. Returns null if missing or malformed.
function _authReadSessionBlob() {
  try {
    const raw = localStorage.getItem(_AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('[supa-session] could not read session from localStorage:', e);
    return null;
  }
}

// Write the session blob to localStorage. Returns true on success.
function _authWriteSessionBlob(session) {
  try {
    localStorage.setItem(_AUTH_STORAGE_KEY, JSON.stringify(session));
    return true;
  } catch (e) {
    console.warn('[supa-session] could not write session to localStorage:', e);
    return false;
  }
}

/**
 * Get the current access token. Sync — never hits the network.
 * Returns null if no session exists.
 * The token may be expired; callers should be prepared to handle 401s
 * from the API and trigger a refresh-and-retry (see supa-rest.js).
 */
function _authGetAccessToken() {
  const session = _authReadSessionBlob();
  return (session && session.access_token) || null;
}

/**
 * Get the full session blob (access_token, refresh_token, user, expires_at, etc.).
 * Sync — never hits the network. Returns null if no session.
 */
function _authGetSession() {
  return _authReadSessionBlob();
}

// True if the access token expires within `marginSeconds`.
function _authIsExpiringSoon(marginSeconds) {
  const session = _authReadSessionBlob();
  if (!session || !session.expires_at) return true;
  const nowSec = Math.floor(Date.now() / 1000);
  return session.expires_at - nowSec < marginSeconds;
}

/**
 * True if the access token is already expired.
 */
function _authIsExpired() {
  return _authIsExpiringSoon(0);
}

/**
 * Refresh the access token using the stored refresh_token.
 * Returns the new access_token on success, or null on failure.
 *
 * On success, localStorage is updated with the new token + new
 * refresh_token + new expires_at. Subsequent _authGetAccessToken()
 * calls will return the new token.
 */
async function _authRefresh() {
  const session = _authReadSessionBlob();
  if (!session || !session.refresh_token) {
    console.warn('[supa-session] cannot refresh — no refresh_token in localStorage');
    return null;
  }

  const url = SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token';
  const controller = new AbortController();
  const timer = setTimeout(function() { controller.abort(); }, _AUTH_REFRESH_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'apikey':       SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: session.refresh_token })
    });
    clearTimeout(timer);

    if (!response.ok) {
      const text = await response.text().catch(function() { return ''; });
      console.warn('[supa-session] refresh failed:', response.status, text);
      return null;
    }

    const newSession = await response.json();
    // The /token endpoint returns the same shape we store: access_token,
    // refresh_token, expires_in, expires_at, token_type, user.
    _authWriteSessionBlob(newSession);
    return newSession.access_token || null;
  } catch (e) {
    clearTimeout(timer);
    if (e && e.name === 'AbortError') {
      console.warn('[supa-session] refresh aborted at 12s timeout');
    } else {
      console.warn('[supa-session] refresh threw:', e);
    }
    return null;
  }
}

// Background auto-refresh state.
let _authAutoRefreshTimer = null;

/**
 * Start the background auto-refresh loop. Idempotent — calling twice has
 * no effect. The loop checks every 60 seconds and refreshes the token
 * if it expires within 5 minutes.
 *
 * Called once at app init (in app.js). Should not need to be called
 * again — the loop runs for the lifetime of the page.
 */
function _authStartAutoRefresh() {
  if (_authAutoRefreshTimer) return;
  _authAutoRefreshTimer = setInterval(async function() {
    // Only refresh if a session exists AND it's expiring soon.
    const session = _authReadSessionBlob();
    if (!session || !session.refresh_token) return;
    if (!_authIsExpiringSoon(_AUTH_REFRESH_BEFORE_EXPIRY_S)) return;
    await _authRefresh();
  }, _AUTH_REFRESH_CHECK_INTERVAL_MS);
}

/**
 * Stop the background auto-refresh loop. Used during logout, or for tests.
 */
function _authStopAutoRefresh() {
  if (_authAutoRefreshTimer) {
    clearInterval(_authAutoRefreshTimer);
    _authAutoRefreshTimer = null;
  }
}
