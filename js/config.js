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

const SUPABASE_URL      = 'https://jqelfzqgcemtrpcrbpsl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpxZWxmenFnY2VtdHJwY3JicHNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMzY1OTAsImV4cCI6MjA5MTcxMjU5MH0.kSZSX_yDisKBSwChNGs8qfRvPwEgurW1TncYOhwdJp8';

// Create the Supabase client — available globally as `_supabase`
// (prefixed to avoid conflict with the supabase CDN global)
const _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
