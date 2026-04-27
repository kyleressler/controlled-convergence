// ============================================================
// config.js — App configuration (Supabase + PostHog)
//
// SUPABASE
//   1. supabase.com → your project → Settings → API
//   2. Copy "Project URL"  → SUPABASE_URL
//   3. Copy "anon public"  → SUPABASE_ANON_KEY
//   The anon key is safe to include in frontend code; it cannot bypass RLS.
//
// POSTHOG
//   posthog.com → Project Settings → Project API Key
//   The Project API Key is safe to include in frontend code.
// ============================================================

const SUPABASE_URL      = 'https://jqelfzqgcemtrpcrbpsl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxZWxmenFnY2VtdHJwY3JicHNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzY1OTAsImV4cCI6MjA5MTcxMjU5MH0.kSZSX_yDisKBSwChNGs8qfRvPwEgurW1TncYOhwdJp8';

const POSTHOG_KEY  = 'phc_kN3iLEBLpdFAh8xR6ebwRqtPBRd93ZW6zqbqrAVdJZRp';
const POSTHOG_HOST = 'https://us.i.posthog.com';

// ── Supabase client — available globally as `_supabase` ──
// (prefixed to avoid conflict with the supabase CDN global)
//
// LAYERED DEFENSES against silent save failures:
//
// 1. `auth.lock` bypass — replaces the default navigator.locks coordinator
//    with a no-op pass-through. The default uses navigator.locks for
//    cross-tab token refresh, which can get stuck and freeze the entire
//    SDK silently. Worst case of bypassing: two tabs each fire one extra
//    refresh request — harmless.
//
// 2. 12-second `fetch` AbortController — every Supabase fetch has a hard
//    timeout. If a request stalls (slow network, dropped connection),
//    it aborts cleanly instead of pending forever.
//
// 3. Client recreate (see `_recreateSupabaseClient` below) — if the SDK
//    still gets stuck despite #1 and #2 (e.g. Safari sometimes ignores
//    AbortController on a stalled fetch, leaving the SDK holding an
//    orphan promise), the app can call `_recreateSupabaseClient()` to
//    swap in a brand-new client with no in-flight stuck state. The new
//    client auto-restores the session from localStorage.
//
// We declare _supabase with `let` (not const) so the recreate function
// can reassign it.
function _createSupabaseClient() {
  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      // Bypass navigator.locks — signature: (name, acquireTimeout, fn) => Promise<R>
      lock: function(_name, _acquireTimeout, fn) { return fn(); }
    },
    global: {
      fetch: function(url, options) {
        const controller = new AbortController();
        const timer = setTimeout(function() { controller.abort(); }, 12000);
        return fetch(url, Object.assign({}, options, { signal: controller.signal }))
          .finally(function() { clearTimeout(timer); });
      }
    }
  });
}

let _supabase = _createSupabaseClient();

// Recreate the client from scratch. Used to recover when the SDK gets
// stuck holding an orphan fetch promise (Safari quirk: AbortController
// doesn't always actually settle a stalled fetch, leaving the SDK
// waiting on a promise that will never resolve).
//
// After recreating, the auth state listener must be re-bound to the new
// client — _bindAuthStateListener() (in auth.js) handles that.
function _recreateSupabaseClient() {
  console.warn('[_recreateSupabaseClient] swapping in a fresh Supabase client to recover from stuck SDK');
  _supabase = _createSupabaseClient();
  if (typeof _bindAuthStateListener === 'function') {
    _bindAuthStateListener();
  }
}
