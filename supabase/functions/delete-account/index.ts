// supabase/functions/delete-account/index.ts
// ─────────────────────────────────────────────────────────────
// Supabase Edge Function — Delete the calling user's account.
//
// Called by: settings.js → deleteAccount()
// Method:    POST  /functions/v1/delete-account
// Auth:      Bearer <user_access_token>  (Supabase JWT)
//
// Environment variables required (set in Supabase dashboard):
//   SUPABASE_URL     — auto-injected by Supabase, no action needed
//   SUPABASE_ANON_KEY — auto-injected by Supabase, no action needed
//   SERVICE_ROLE_KEY — add manually in dashboard (Settings → API → service_role)
//
// HOW TO DEPLOY:
//   1. Install Supabase CLI:  npm install -g supabase
//   2. Link your project:     supabase link --project-ref <your-project-ref>
//   3. Deploy this function:  supabase functions deploy delete-account
//   4. In the Supabase dashboard → Edge Functions → delete-account → Secrets,
//      add SUPABASE_SERVICE_ROLE_KEY (Settings → API → service_role key).
// ─────────────────────────────────────────────────────────────

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── 1. Extract the caller's JWT ───────────────────────────
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonError('Missing or invalid Authorization header.', 401);
    }
    const userJwt = authHeader.replace('Bearer ', '');

    // ── 2. Verify the JWT and resolve the user's ID ───────────
    // Create a client scoped to the user's token (anon key + user JWT).
    // This respects RLS and lets us verify the token is valid.
    const supabaseUrl         = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey     = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey  = Deno.env.get('SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${userJwt}` } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonError('Could not verify user session. Please log in again.', 401);
    }

    // ── 3. Delete the user using the admin (service role) client ──
    // The service role bypasses RLS and can call auth.admin.deleteUser().
    // All user data cascades automatically via FK constraints.
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('[delete-account] deleteUser error:', deleteError.message);
      return jsonError('Account deletion failed. Please try again.', 500);
    }

    // ── 4. Done ────────────────────────────────────────────────
    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('[delete-account] Unexpected error:', err);
    return jsonError('An unexpected error occurred. Please try again.', 500);
  }
});

function jsonError(message: string, status: number): Response {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
