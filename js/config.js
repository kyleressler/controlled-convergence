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
// SCOPE: this client is now used ONLY for the initial auth flows —
// signInWithPassword, signUp, signOut. All database reads and writes
// go through supa-rest.js (raw fetch directly to /rest/v1/*) and all
// session/token management goes through supa-session.js.
//
// Why: the SDK's hot-path operations have proven unreliable in Safari
// (stuck refresh promises, hung fetches, multi-instance lock contention).
// By owning the JWT lifecycle and REST calls ourselves, we eliminate an
// entire class of failure modes.
//
// We keep two SDK config options as defense in depth for the auth flows
// that DO still go through the SDK:
//
//   - autoRefreshToken: false — the SDK's background refresh fights with
//     ours. Disable it; supa-session.js handles refresh with a 60-second
//     check interval and a 5-minute pre-expiry margin.
//
//   - auth.lock: no-op — bypass navigator.locks (which can get stuck in
//     Safari) for the small amount of auth coordination the SDK still does.
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
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
