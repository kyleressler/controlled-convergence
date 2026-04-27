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

// Create the Supabase client — available globally as `_supabase`
// (prefixed to avoid conflict with the supabase CDN global)
//
// CUSTOM FETCH WITH TIMEOUT
// The Supabase SDK uses navigator.locks to coordinate token refresh.
// If the refresh network request hangs (network hiccup, server delay),
// the lock is held indefinitely and every subsequent Supabase call queues
// behind it — silently, with no error, forever. This caused saves to stop
// working mid-session without any visible error message.
//
// The fix: wrap every Supabase fetch call with a 12-second AbortController
// timeout. If any request (including the token refresh) doesn't respond in
// 12 seconds, it's aborted. The SDK then surfaces a real error through the
// promise chain and the onAuthStateChange handler, instead of hanging silently.
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    fetch: function(url, options) {
      const controller = new AbortController();
      const timer = setTimeout(function() { controller.abort(); }, 12000);
      return fetch(url, Object.assign({}, options, { signal: controller.signal }))
        .finally(function() { clearTimeout(timer); });
    }
  }
});
