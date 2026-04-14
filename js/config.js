// ============================================================
// config.js — Supabase configuration
//
// HOW TO FILL THIS IN:
//   1. Go to supabase.com → your project → Settings → API
//   2. Copy "Project URL"  → paste below as SUPABASE_URL
//   3. Copy "anon public"  → paste below as SUPABASE_ANON_KEY
//
// The anon key is safe to include in frontend code.
// It cannot bypass Row Level Security (RLS) policies.
// ============================================================

const SUPABASE_URL      = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';

// Create the Supabase client — available globally as `_supabase`
// (prefixed to avoid conflict with the supabase CDN global)
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
