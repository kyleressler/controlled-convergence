// ============================================================
// netlify/functions/posthog-query.js
//
// Read-only proxy from the admin dashboard to PostHog's Query API.
//
// Why this function exists:
//   PostHog's Query API requires a Personal API Key, which has admin-level
//   access to the entire PostHog project. That key MUST NOT live in
//   client-side code. The function holds the key as a Netlify environment
//   variable and forwards a small, fixed set of named queries to PostHog
//   on behalf of authenticated admin users.
//
// Five guardrails enforced here (do not weaken without a security review):
//   1. Verify the caller's Supabase JWT on every request (no anonymous use).
//   2. Re-check that the caller's tier is 'admin' server-side. Never trust
//      a client-side claim.
//   3. Allowlist of named query shapes — no raw HogQL passthrough. Clients
//      pick a query name and pass sanitized parameters; the HogQL is
//      constructed here.
//   4. CORS locked to the production domain + Netlify preview URLs.
//   5. No secret logging. Logs include the query name and HTTP status, never
//      the API key, JWT, or full PostHog response body.
//
// Required env vars (see .env.example):
//   POSTHOG_PERSONAL_API_KEY  — phx_… key with read/query access
//   POSTHOG_PROJECT_ID        — numeric project ID
//   POSTHOG_HOST              — e.g. https://us.i.posthog.com
//   SUPABASE_URL              — for JWT validation
//   SUPABASE_ANON_KEY         — for JWT validation
// ============================================================

'use strict';

// ── CORS allowlist ─────────────────────────────────────────────
// Production origin + any *.netlify.app preview URL.
const PRODUCTION_ORIGIN = 'https://controlledconvergence.com';
const NETLIFY_PREVIEW_RE = /^https:\/\/[a-z0-9-]+\.netlify\.app$/i;

function originAllowed(origin) {
  if (!origin) return false;
  if (origin === PRODUCTION_ORIGIN) return true;
  if (NETLIFY_PREVIEW_RE.test(origin)) return true;
  return false;
}

function corsHeaders(origin) {
  // If the origin isn't allowed, omit Access-Control-Allow-Origin entirely.
  // The browser will then block the response, which is what we want.
  const headers = {
    'Vary': 'Origin',
    'Content-Type': 'application/json',
  };
  if (originAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
    headers['Access-Control-Max-Age'] = '600';
  }
  return headers;
}

function jsonResponse(status, body, origin) {
  return {
    statusCode: status,
    headers: corsHeaders(origin),
    body: JSON.stringify(body),
  };
}

// ── Logging ─────────────────────────────────────────────────────
// Deliberately terse: only fields that are safe in cleartext logs.
function logEvent(fields) {
  // Strip anything that looks sensitive even by accident.
  const safe = {};
  Object.keys(fields).forEach(function (k) {
    const v = fields[k];
    if (k.toLowerCase().match(/key|token|secret|authorization/)) return;
    if (typeof v === 'string' && v.length > 200) return;
    safe[k] = v;
  });
  console.log('[posthog-query]', JSON.stringify(safe));
}

// ── Auth: verify Supabase JWT + admin tier ─────────────────────
async function verifyAdminCaller(authHeader) {
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return { ok: false, status: 401, reason: 'missing_bearer_token' };
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return { ok: false, status: 401, reason: 'empty_bearer_token' };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnon = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    return { ok: false, status: 500, reason: 'supabase_env_missing' };
  }

  // (1) Validate the JWT signature + expiry by hitting Supabase's auth API.
  //     This is the canonical check; failing here means the token is invalid.
  let user;
  try {
    const r = await fetch(supabaseUrl + '/auth/v1/user', {
      headers: {
        'Authorization': 'Bearer ' + token,
        'apikey': supabaseAnon,
      },
    });
    if (r.status !== 200) {
      return { ok: false, status: 401, reason: 'jwt_invalid_or_expired' };
    }
    user = await r.json();
  } catch (e) {
    return { ok: false, status: 500, reason: 'auth_lookup_failed' };
  }

  if (!user || !user.id) {
    return { ok: false, status: 401, reason: 'no_user_in_token' };
  }

  // (2) Re-check admin tier server-side via the is_admin() SQL function
  //     (SECURITY DEFINER). It uses auth.uid() internally — we don't pass
  //     a UID, so this can't be abused to probe arbitrary users. The user's
  //     own JWT in the Authorization header is what determines auth.uid()
  //     on the Postgres side.
  try {
    const r = await fetch(supabaseUrl + '/rest/v1/rpc/is_admin', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'apikey': supabaseAnon,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    if (r.status !== 200) {
      return { ok: false, status: 403, reason: 'admin_check_failed' };
    }
    const isAdmin = await r.json();
    if (isAdmin !== true) {
      return { ok: false, status: 403, reason: 'not_admin' };
    }
  } catch (e) {
    return { ok: false, status: 500, reason: 'admin_check_threw' };
  }

  return { ok: true, userId: user.id };
}

// ── Allowlisted query shapes ───────────────────────────────────
// Each entry returns a HogQL query string and an optional `transform`
// that reshapes the raw PostHog response into the minimal shape the
// dashboard needs. Never pass raw HogQL from the client.
function buildHogql(queryName, params) {
  const days = clampInt(params && params.days, 30, 1, 365);

  switch (queryName) {

    // Reach + click-through over the trailing N days, sourced from $pageview
    // events that arrived with any utm_source value.
    case 'utm_reach_summary':
      return {
        hogql: `
          SELECT
            count(distinct distinct_id) AS unique_visitors,
            count() AS pageviews
          FROM events
          WHERE event = '$pageview'
            AND timestamp > now() - INTERVAL ${days} DAY
            AND properties.$current_url != ''
            AND properties.utm_source IS NOT NULL
        `,
        transform: function (rows) {
          const row = (rows && rows[0]) || [0, 0];
          return { unique_visitors: row[0] || 0, pageviews: row[1] || 0, days: days };
        },
      };

    // Per-channel breakdown: visits and unique visitors grouped by utm_source.
    case 'utm_channel_breakdown':
      return {
        hogql: `
          SELECT
            properties.utm_source AS source,
            count(distinct distinct_id) AS visitors,
            count() AS visits
          FROM events
          WHERE event = '$pageview'
            AND timestamp > now() - INTERVAL ${days} DAY
            AND properties.utm_source IS NOT NULL
          GROUP BY source
          ORDER BY visits DESC
          LIMIT 50
        `,
        transform: function (rows) {
          return (rows || []).map(function (r) {
            return { source: r[0] || 'unknown', visitors: r[1] || 0, visits: r[2] || 0 };
          });
        },
      };

    // Top blog posts by pageviews (proxy for "what's working") in last N days.
    // `limit` is clamped to [1, 500] so the Performance-by-Tag aggregation
    // on the Insights tab can pull the full corpus of posts (default 20
    // remains for the existing top-content table).
    case 'top_posts_by_views': {
      const limit = clampInt(params && params.limit, 20, 1, 500);
      return {
        hogql: `
          SELECT
            properties.$pathname AS path,
            count() AS views,
            count(distinct distinct_id) AS visitors
          FROM events
          WHERE event = '$pageview'
            AND timestamp > now() - INTERVAL ${days} DAY
            AND properties.$pathname LIKE '/blog/%'
          GROUP BY path
          ORDER BY views DESC
          LIMIT ${limit}
        `,
        transform: function (rows) {
          return (rows || []).map(function (r) {
            return { path: r[0] || '', views: r[1] || 0, visitors: r[2] || 0 };
          });
        },
      };
    }

    default:
      return null;
  }
}

function clampInt(n, fallback, min, max) {
  const x = parseInt(n, 10);
  if (isNaN(x)) return fallback;
  return Math.max(min, Math.min(max, x));
}

// ── PostHog call ────────────────────────────────────────────────
async function runPostHogQuery(hogql) {
  const key = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';
  if (!key || !projectId) {
    return { ok: false, status: 500, reason: 'posthog_env_missing' };
  }

  try {
    const r = await fetch(host + '/api/projects/' + encodeURIComponent(projectId) + '/query/', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: { kind: 'HogQLQuery', query: hogql.trim() },
      }),
    });

    if (r.status !== 200) {
      // PostHog returned a non-200. Don't echo its body to the client — we
      // could leak query internals or rate-limit hints. Log status only.
      return { ok: false, status: 502, reason: 'posthog_non_200', upstream: r.status };
    }

    const data = await r.json();
    // The HogQL response has a `results` array of row arrays. Hand it back.
    return { ok: true, rows: (data && data.results) || [] };
  } catch (e) {
    return { ok: false, status: 502, reason: 'posthog_fetch_threw' };
  }
}

// ── Main handler ────────────────────────────────────────────────
exports.handler = async function (event) {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';

  // Preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'method_not_allowed' }, origin);
  }

  if (!originAllowed(origin)) {
    // Belt and suspenders — without the Access-Control-Allow-Origin header
    // the browser blocks the response, but we also reject server-side so
    // a non-browser client can't bypass CORS.
    logEvent({ event: 'origin_blocked', origin: origin });
    return jsonResponse(403, { error: 'origin_not_allowed' }, origin);
  }

  // Auth
  const auth = event.headers && (event.headers.authorization || event.headers.Authorization);
  const callerCheck = await verifyAdminCaller(auth);
  if (!callerCheck.ok) {
    logEvent({ event: 'auth_failed', reason: callerCheck.reason, status: callerCheck.status });
    return jsonResponse(callerCheck.status, { error: callerCheck.reason }, origin);
  }

  // Parse body
  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return jsonResponse(400, { error: 'invalid_json' }, origin);
  }

  const queryName = String(body.query || '');
  const params = (body.params && typeof body.params === 'object') ? body.params : {};

  const built = buildHogql(queryName, params);
  if (!built) {
    logEvent({ event: 'unknown_query', query: queryName });
    return jsonResponse(400, { error: 'unknown_query', query: queryName }, origin);
  }

  const phResult = await runPostHogQuery(built.hogql);
  if (!phResult.ok) {
    logEvent({
      event: 'upstream_error',
      query: queryName,
      reason: phResult.reason,
      upstream: phResult.upstream || null,
    });
    return jsonResponse(phResult.status, { error: phResult.reason }, origin);
  }

  const transformed = built.transform ? built.transform(phResult.rows) : phResult.rows;

  logEvent({ event: 'query_ok', query: queryName, days: params.days || null });

  return jsonResponse(200, { query: queryName, data: transformed }, origin);
};
