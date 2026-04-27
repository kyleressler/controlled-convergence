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
// ── BUG FIX: bypass navigator.locks for auth coordination ──
// By default, the Supabase SDK uses the browser's navigator.locks API to
// coordinate JWT token refreshes across tabs. In Safari (and occasionally
// Chrome), this lock can get stuck — e.g. if a background tab dies mid-refresh,
// or if a refresh request takes too long. Once stuck, EVERY subsequent
// Supabase call (including all save/load operations) queues at the lock
// acquisition step and never reaches the network. No error is thrown.
// Symptom: saves silently stop working mid-session; network tab shows zero
// requests to supabase.co; calls return Promise {status: "pending"} forever.
//
// The fix below replaces the default lock with a no-op pass-through. This
// removes cross-tab refresh coordination (worst case: two tabs each fire one
// extra refresh request, which is harmless), but it eliminates the hang
// entirely — there's no lock to get stuck on.
//
// We keep the 12-second AbortController fetch wrapper as a belt-and-suspenders
// defense: if any individual fetch ever hangs (e.g. network goes dark), it
// aborts cleanly instead of pending forever.
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Bypass navigator.locks — see comment block above.
    // Signature: (name, acquireTimeout, fn) => Promise<R>
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
