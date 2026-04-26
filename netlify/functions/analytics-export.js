// ============================================================
// netlify/functions/analytics-export.js
//
// Admin-only blog analytics export. Returns one JSON file containing
// every post (drafts, scheduled, and published) plus their metadata,
// blog views per time window, referrer breakdown, and stubs for
// email + LinkedIn metrics until those integrations are wired up.
//
// The output is consumed by an external LLM editorial workflow, so the
// schema is stable: every key is always present, missing data is `null`
// (or `[]` for arrays), and we never throw — partial failures land in
// a top-level `warnings` array instead so the LLM can see what's missing.
//
// Security model: same as posthog-query.js.
//   1. Validate Supabase JWT (no anonymous use).
//   2. Re-check admin tier server-side via is_admin() RPC.
//   3. CORS locked to production + Netlify previews.
//   4. PostHog Personal API Key stays in env, never reaches the client.
//
// Required env vars:
//   POSTHOG_PERSONAL_API_KEY
//   POSTHOG_PROJECT_ID
//   POSTHOG_HOST              (default: https://us.i.posthog.com)
//   SUPABASE_URL
//   SUPABASE_ANON_KEY
//
// Future integrations (TODO):
//   • Kit (ConvertKit) — wire KIT_API_KEY and replace email + audience
//     stubs with real per-broadcast data.
//   • LinkedIn — once we store post-level repost stats locally (likely
//     in a `linkedin_metrics` table keyed by blog_post_id), replace the
//     LinkedIn stubs with a SELECT join.
// ============================================================

'use strict';

// ── Constants ───────────────────────────────────────────────────
const SCHEMA_VERSION   = '1.0';
const SITE_TIMEZONE    = 'America/New_York';
const SITE_BASE_URL    = 'https://controlledconvergence.com';
const READING_WPM      = 200;            // industry-standard for blog read time
const REFERRER_LOOKBACK_DAYS = 365;       // referrer breakdown window
// One-year fallback for date_range.start when there are no posts yet.
const DATE_RANGE_FALLBACK_DAYS = 365;

// CORS allowlist — same surface area as posthog-query.js so the admin
// dashboard and Netlify preview deploys can both call the function.
const PRODUCTION_ORIGIN = 'https://controlledconvergence.com';
const NETLIFY_PREVIEW_RE = /^https:\/\/[a-z0-9-]+\.netlify\.app$/i;

function originAllowed(origin) {
  if (!origin) return true; // same-origin (no Origin header) is fine
  if (origin === PRODUCTION_ORIGIN) return true;
  if (NETLIFY_PREVIEW_RE.test(origin)) return true;
  return false;
}

function corsHeaders(origin) {
  const headers = { 'Vary': 'Origin' };
  if (origin && originAllowed(origin)) {
    headers['Access-Control-Allow-Origin']  = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type';
    headers['Access-Control-Max-Age']       = '600';
  }
  return headers;
}

function jsonResponse(status, body, origin, extraHeaders) {
  return {
    statusCode: status,
    headers: Object.assign(
      { 'Content-Type': 'application/json' },
      corsHeaders(origin),
      extraHeaders || {}
    ),
    body: JSON.stringify(body),
  };
}

function logEvent(fields) {
  const safe = {};
  Object.keys(fields).forEach(function (k) {
    const v = fields[k];
    if (k.toLowerCase().match(/key|token|secret|authorization/)) return;
    if (typeof v === 'string' && v.length > 200) return;
    safe[k] = v;
  });
  console.log('[analytics-export]', JSON.stringify(safe));
}

// ── Auth: verify Supabase JWT + admin tier ─────────────────────
// Mirrors posthog-query.js so the security posture is identical.
async function verifyAdminCaller(authHeader) {
  if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
    return { ok: false, status: 401, reason: 'missing_bearer_token' };
  }
  const token = authHeader.slice(7).trim();
  if (!token) return { ok: false, status: 401, reason: 'empty_bearer_token' };

  const supabaseUrl  = process.env.SUPABASE_URL;
  const supabaseAnon = process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnon) {
    return { ok: false, status: 500, reason: 'supabase_env_missing' };
  }

  let user;
  try {
    const r = await fetch(supabaseUrl + '/auth/v1/user', {
      headers: { 'Authorization': 'Bearer ' + token, 'apikey': supabaseAnon },
    });
    if (r.status !== 200) return { ok: false, status: 401, reason: 'jwt_invalid_or_expired' };
    user = await r.json();
  } catch (e) {
    return { ok: false, status: 500, reason: 'auth_lookup_failed' };
  }
  if (!user || !user.id) return { ok: false, status: 401, reason: 'no_user_in_token' };

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
    if (r.status !== 200) return { ok: false, status: 403, reason: 'admin_check_failed' };
    const isAdmin = await r.json();
    if (isAdmin !== true) return { ok: false, status: 403, reason: 'not_admin' };
  } catch (e) {
    return { ok: false, status: 500, reason: 'admin_check_threw' };
  }

  return { ok: true, userId: user.id, token: token };
}

// ── Supabase REST: pull all blog_posts (admin sees all rows via RLS) ─
async function fetchAllBlogPosts(token) {
  const supabaseUrl  = process.env.SUPABASE_URL;
  const supabaseAnon = process.env.SUPABASE_ANON_KEY;
  // Select every column we care about for the export. Order doesn't matter
  // semantically — the consumer keys off `id` — but published_at desc keeps
  // the file diff-friendly when re-running this regularly.
  const params = new URLSearchParams({
    select: [
      'id', 'title', 'slug', 'status', 'evergreen', 'tags',
      'excerpt', 'content', 'published_at', 'created_at', 'updated_at',
      'frameworks', 'hook_type', 'audience_target', 'format', 'editorial_notes'
    ].join(','),
    order: 'published_at.desc.nullslast',
  });
  const r = await fetch(supabaseUrl + '/rest/v1/blog_posts?' + params.toString(), {
    headers: {
      'Authorization': 'Bearer ' + token,
      'apikey': supabaseAnon,
      'Accept': 'application/json',
    },
  });
  if (r.status !== 200) {
    const body = await safeText(r);
    throw new Error('blog_posts fetch failed: HTTP ' + r.status + ' ' + body);
  }
  return await r.json();
}

async function safeText(r) {
  try { return (await r.text()).slice(0, 200); } catch (e) { return ''; }
}

// ── PostHog calls ──────────────────────────────────────────────
async function runPostHogQuery(hogql) {
  const key       = process.env.POSTHOG_PERSONAL_API_KEY;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const host      = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';
  if (!key || !projectId) {
    return { ok: false, reason: 'posthog_env_missing' };
  }
  try {
    const r = await fetch(host + '/api/projects/' + encodeURIComponent(projectId) + '/query/', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: { kind: 'HogQLQuery', query: hogql.trim() } }),
    });
    if (r.status !== 200) {
      return { ok: false, reason: 'posthog_non_200', upstream: r.status };
    }
    const data = await r.json();
    return { ok: true, rows: (data && data.results) || [] };
  } catch (e) {
    return { ok: false, reason: 'posthog_fetch_threw' };
  }
}

// Per-path view counts across the four time windows the export schema
// requires. `countIf` lets us do all four in a single PostHog round-trip
// instead of four separate queries.
const VIEWS_BY_PATH_HOGQL = `
  SELECT
    properties.$pathname AS path,
    countIf(timestamp > now() - INTERVAL 7 DAY)  AS views_7d,
    countIf(timestamp > now() - INTERVAL 30 DAY) AS views_30d,
    countIf(timestamp > now() - INTERVAL 90 DAY) AS views_90d,
    count()                                      AS views_all_time,
    uniqIf(distinct_id, timestamp > now() - INTERVAL 30 DAY) AS unique_visitors_30d
  FROM events
  WHERE event = '$pageview'
    AND properties.$pathname LIKE '/blog/%'
  GROUP BY path
  LIMIT 1000
`;

// Per-path referrer/UTM breakdown — we categorize in JS (search engines,
// LinkedIn variants, kit/email UTMs, etc.) so the SQL stays readable.
const REFERRERS_HOGQL = `
  SELECT
    properties.$pathname AS path,
    properties.$referring_domain AS domain,
    properties.utm_source AS utm,
    count() AS views
  FROM events
  WHERE event = '$pageview'
    AND properties.$pathname LIKE '/blog/%'
    AND timestamp > now() - INTERVAL ${REFERRER_LOOKBACK_DAYS} DAY
  GROUP BY path, domain, utm
  LIMIT 10000
`;

// ── PostHog response shaping ───────────────────────────────────
// Build a { '/blog/slug': { views_7d, ... } } map keyed by path.
function indexViewsByPath(rows) {
  const out = Object.create(null);
  (rows || []).forEach(function (row) {
    const path = String(row[0] || '');
    if (!path) return;
    out[path] = {
      views_7d:           Number(row[1]) || 0,
      views_30d:          Number(row[2]) || 0,
      views_90d:          Number(row[3]) || 0,
      views_all_time:     Number(row[4]) || 0,
      unique_visitors_30d: Number(row[5]) || 0,
    };
  });
  return out;
}

// Categorize each (domain, utm) pair into one of the 5 referrer buckets
// the export schema specifies. The order of checks matters: utm_source
// is a stronger signal than $referring_domain for emails specifically
// (Kit click-tracking links replace the referrer with their own domain).
function categorizeReferrer(domain, utm) {
  const u = String(utm || '').toLowerCase();
  const d = String(domain || '').toLowerCase().replace(/^www\./, '');

  // Kit / email — UTM source is the only reliable signal because Kit
  // rewrites links through ck.kit.com so the $referring_domain doesn't
  // tell us "this came from an email" on its own.
  if (u === 'email' || u === 'kit' || u === 'newsletter') return 'kit_email';

  // LinkedIn covers both the web app and lnkd.in shortlinks.
  if (u === 'linkedin' || /(^|\.)linkedin\.com$/.test(d) || d === 'lnkd.in') return 'linkedin';

  // Direct = no referrer at all. PostHog stores '$direct' for this case.
  if (!d || d === '$direct') return 'direct';

  // Common search engines. We treat private-search engines (DDG, Brave)
  // as 'search' too even though they pass minimal referrer data.
  if (
    /(^|\.)google\./.test(d) || /(^|\.)bing\.com$/.test(d) ||
    d === 'duckduckgo.com' || /(^|\.)yandex\./.test(d) ||
    /(^|\.)search\.brave\.com$/.test(d) || /(^|\.)ecosia\.org$/.test(d)
  ) return 'search';

  return 'other';
}

// Build a { '/blog/slug': { direct, linkedin, kit_email, search, other } } map.
function indexReferrersByPath(rows) {
  const out = Object.create(null);
  (rows || []).forEach(function (row) {
    const path = String(row[0] || '');
    if (!path) return;
    const bucket = categorizeReferrer(row[1], row[2]);
    const views  = Number(row[3]) || 0;
    if (!out[path]) {
      out[path] = { direct: 0, linkedin: 0, kit_email: 0, search: 0, other: 0 };
    }
    out[path][bucket] += views;
  });
  return out;
}

// ── Post shaping ───────────────────────────────────────────────
function htmlToText(html) {
  if (!html) return '';
  return String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(html) {
  const text = htmlToText(html);
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

// Day-of-week + HH:MM in site timezone. Using Intl.DateTimeFormat avoids
// an external tz library and is correct across DST boundaries.
function localDayAndTime(iso) {
  if (!iso) return { day: null, time: null };
  let d;
  try { d = new Date(iso); } catch (e) { return { day: null, time: null }; }
  if (isNaN(d.getTime())) return { day: null, time: null };

  const dayFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: SITE_TIMEZONE, weekday: 'long',
  });
  // hour12:false keeps it in 24-hour format; the spec needs HH:MM.
  const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: SITE_TIMEZONE, hour: '2-digit', minute: '2-digit', hour12: false,
  });
  // Intl can return "24:05" instead of "00:05" in some locales/runtimes;
  // normalize defensively.
  const timeRaw = timeFmt.format(d);
  const time = timeRaw.replace(/^24:/, '00:');
  return { day: dayFmt.format(d), time: time };
}

function buildPost(row, viewsByPath, referrersByPath) {
  const slug = String(row.slug || '');
  const path = '/blog/' + slug;
  const v = viewsByPath[path] || null;
  const refs = referrersByPath[path] || null;
  const wc = wordCount(row.content);
  const dayTime = localDayAndTime(row.published_at);

  return {
    id:                 String(row.id),
    title:              row.title || '',
    slug:               slug,
    url:                SITE_BASE_URL + path,
    // The DB only stores 'draft' and 'published' today; if a future
    // schema adds 'scheduled', it'll pass through unchanged.
    status:             row.status || null,
    published_at:       row.published_at || null,
    // No scheduled-publish feature today — emit null so the schema is
    // forward-compatible. (See SCHEDULING TODO in the post editor.)
    scheduled_for:      null,
    day_of_week:        dayTime.day,
    time_of_day:        dayTime.time,
    word_count:         wc,
    estimated_read_time_min: wc > 0 ? Math.max(1, Math.ceil(wc / READING_WPM)) : 0,
    tags:               Array.isArray(row.tags) ? row.tags : [],
    frameworks:         Array.isArray(row.frameworks) ? row.frameworks : [],
    hook_type:          row.hook_type       || null,
    audience_target:    row.audience_target || null,
    format:             row.format          || null,
    notes:              row.editorial_notes || null,
    blog: {
      views_7d:            v ? v.views_7d : 0,
      views_30d:           v ? v.views_30d : 0,
      views_90d:           v ? v.views_90d : 0,
      views_all_time:      v ? v.views_all_time : 0,
      unique_visitors_30d: v ? v.unique_visitors_30d : 0,
      // Engagement-quality metrics (time on page, scroll depth, bounce rate)
      // require either explicit $pageleave events with a $duration property
      // or web-vitals tracking. Neither is wired up yet; emit null so the
      // schema is stable. TODO: add these via PostHog session-recording or
      // a dedicated $pageleave handler in the public site.
      avg_time_on_page_sec: null,
      scroll_depth_pct:     null,
      bounce_rate_pct:      null,
      referrers: refs || { direct: 0, linkedin: 0, kit_email: 0, search: 0, other: 0 },
      // TODO: post-to-post click tracking. Requires $autocapture clicks
      // joined to the source pathname; deferred until we add per-post
      // internal-link instrumentation. Empty array, never null, because
      // the schema spec types this as a list.
      internal_clickthroughs: [],
    },
    email: {
      // TODO(kit): wire Kit broadcast metrics keyed by blog_post_id.
      // Schema present so the LLM workflow is forward-compatible.
      sent:           null,
      opens:          null,
      open_rate_pct:  null,
      clicks:         null,
      click_rate_pct: null,
      unsubscribes:   null,
      replies:        null,
      link_clicks:    [],
    },
    linkedin: {
      // TODO(linkedin): we don't store LinkedIn repost stats locally yet.
      // Once we do (likely a `linkedin_metrics` table keyed by blog_post_id),
      // populate these fields from a SELECT join.
      variant_used:    null,
      posted_at:       null,
      impressions:     null,
      reactions:       null,
      comments:        null,
      reshares:        null,
      click_throughs:  null,
    },
    engagement: {
      // No comments system on the blog; no first-party share counter.
      // newsletter_signups_attributed will light up once UTM source is
      // captured at signup time (see admin-insights.js note).
      blog_comments:                  0,
      total_shares:                   null,
      newsletter_signups_attributed:  null,
    },
  };
}

// Date-range start: oldest published_at OR (now - 1 year), whichever is
// MORE RECENT per the spec. (i.e. clip far-back posts to a 1y window.)
function computeDateRangeStart(posts, nowMs) {
  const fallback = new Date(nowMs - DATE_RANGE_FALLBACK_DAYS * 24 * 3600 * 1000);
  let oldestMs = null;
  posts.forEach(function (p) {
    if (!p.published_at) return;
    const t = Date.parse(p.published_at);
    if (!isNaN(t) && (oldestMs === null || t < oldestMs)) oldestMs = t;
  });
  if (oldestMs === null) return fallback.toISOString();
  // "More recent" = larger timestamp.
  return new Date(Math.max(oldestMs, fallback.getTime())).toISOString();
}

// YYYY-MM-DD in site timezone for the filename.
function todayYmdInTz(iso) {
  const d = iso ? new Date(iso) : new Date();
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: SITE_TIMEZONE, year: 'numeric', month: '2-digit', day: '2-digit',
  });
  // en-CA returns YYYY-MM-DD natively.
  return fmt.format(d);
}

// ── Main handler ───────────────────────────────────────────────
exports.handler = async function (event) {
  const origin = (event.headers && (event.headers.origin || event.headers.Origin)) || '';

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders(origin), body: '' };
  }
  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'method_not_allowed' }, origin);
  }
  if (origin && !originAllowed(origin)) {
    logEvent({ event: 'origin_blocked', origin: origin });
    return jsonResponse(403, { error: 'origin_not_allowed' }, origin);
  }

  // Auth
  const authHeader = event.headers && (event.headers.authorization || event.headers.Authorization);
  const callerCheck = await verifyAdminCaller(authHeader);
  if (!callerCheck.ok) {
    logEvent({ event: 'auth_failed', reason: callerCheck.reason });
    return jsonResponse(callerCheck.status, { error: callerCheck.reason }, origin);
  }

  const warnings = [];
  const exportedAtIso = new Date().toISOString();

  // Fan out: Supabase + both PostHog queries in parallel. Each settle
  // is handled independently so a single upstream failure never wipes
  // out the rest of the export.
  const [postsSettled, viewsSettled, refsSettled] = await Promise.allSettled([
    fetchAllBlogPosts(callerCheck.token),
    runPostHogQuery(VIEWS_BY_PATH_HOGQL),
    runPostHogQuery(REFERRERS_HOGQL),
  ]);

  // Posts is the only hard requirement. If Supabase failed we return a
  // 502 — without posts there's nothing meaningful to export.
  if (postsSettled.status !== 'fulfilled') {
    logEvent({ event: 'supabase_failed', error: String(postsSettled.reason).slice(0, 200) });
    return jsonResponse(502, { error: 'supabase_fetch_failed' }, origin);
  }
  const posts = postsSettled.value || [];

  // PostHog failures are soft: they degrade the export but don't block it.
  let viewsByPath = {};
  if (viewsSettled.status === 'fulfilled' && viewsSettled.value.ok) {
    viewsByPath = indexViewsByPath(viewsSettled.value.rows);
  } else {
    const reason = (viewsSettled.status === 'fulfilled')
      ? viewsSettled.value.reason
      : 'promise_rejected';
    warnings.push('PostHog views query failed (' + reason + '); blog view metrics are 0.');
  }

  let referrersByPath = {};
  if (refsSettled.status === 'fulfilled' && refsSettled.value.ok) {
    referrersByPath = indexReferrersByPath(refsSettled.value.rows);
  } else {
    const reason = (refsSettled.status === 'fulfilled')
      ? refsSettled.value.reason
      : 'promise_rejected';
    warnings.push('PostHog referrer query failed (' + reason + '); referrer breakdown is 0.');
  }

  // Stub warnings for integrations that don't exist yet. Surface them so
  // the LLM workflow knows the difference between "0 opens" (real) and
  // "no Kit integration" (placeholder).
  warnings.push('Kit integration not yet wired up — email metrics and Kit subscriber counts are null.');
  warnings.push('LinkedIn integration not yet wired up — per-post LinkedIn metrics and follower counts are null.');

  // Build the JSON payload
  const payload = {
    schema_version: SCHEMA_VERSION,
    exported_at:    exportedAtIso,
    date_range: {
      start: computeDateRangeStart(posts, Date.now()),
      end:   exportedAtIso,
    },
    audience: {
      // TODO(kit): plug Kit subscriber count here.
      kit_subscribers:    null,
      // TODO(linkedin): plug LinkedIn follower count here.
      linkedin_followers: null,
      growth_30d: {
        kit:      null,
        linkedin: null,
      },
    },
    posts: posts.map(function (p) { return buildPost(p, viewsByPath, referrersByPath); }),
  };
  if (warnings.length) payload.warnings = warnings;

  const filename = 'cc-analytics-' + todayYmdInTz(exportedAtIso) + '.json';

  logEvent({
    event: 'export_ok',
    posts: posts.length,
    warnings: warnings.length,
    views_paths: Object.keys(viewsByPath).length,
    referrer_paths: Object.keys(referrersByPath).length,
  });

  return {
    statusCode: 200,
    headers: Object.assign(
      {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="' + filename + '"',
        // Don't let the browser cache an admin export — the data changes.
        'Cache-Control': 'no-store',
      },
      corsHeaders(origin)
    ),
    // Indented for human-readability — files are small (admin-only) and
    // the LLM consumer doesn't care either way.
    body: JSON.stringify(payload, null, 2),
  };
};
