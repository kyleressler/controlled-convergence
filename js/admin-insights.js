// ============================================================
// admin-insights.js — Insights dashboard logic
//
// Loaded by app.html into the in-app admin route (#admin/insights).
// Renders four sections inside the #pane-insights container:
//
//   1. Funnel summary       — Reach, Click-through (PostHog) +
//                             Signups, Activated, 30-day Active (Supabase RPC)
//   2. Action cards         — threshold-based prescriptive nudges
//   3. Channel performance  — UTM source breakdown (PostHog)
//   4. Top content          — published blog posts ranked by views
//
// Empty states everywhere: if PostHog has no events yet, or if Supabase
// returns 0 signups, we say so plainly. Never fake numbers.
//
// Dependencies (already loaded by app.html):
//   _supabase    — from js/config.js
//   trackEvent   — from js/analytics.js
//   appState     — from js/state.js (hydrated by app.js admin gate)
// ============================================================

(function () {
  'use strict';

  // Path to the Netlify Function. Same domain → no CORS preflight needed
  // beyond what the function itself enforces.
  const POSTHOG_PROXY = '/.netlify/functions/posthog-query';

  // Window size for "what's happened lately" — used by every PostHog query.
  const WINDOW_DAYS = 30;

  // Action-card thresholds. Tunable; adjust as we learn what's noisy.
  const THRESHOLDS = {
    LINKEDIN_CONVERSION_FLOOR: 0.02,    // < 2% conversion → suggest more LI
    SIGNUPS_STALL_DAYS:        7,       // 0 signups in last 7d → top-of-funnel alert
    EVERGREEN_REPROMOTE_MONTHS: 6,      // re-promote evergreen posts every 6 months
  };

  // ── Public entry point ────────────────────────────────────────
  // admin.html calls this once the gate passes.
  window.renderAdminInsights = async function () {
    const root = document.getElementById('pane-insights');
    if (!root) return;

    root.innerHTML = insightsScaffoldHtml();

    // Fire all data sources in parallel — they're independent.
    // Each handler is responsible for rendering its own section, including
    // its own empty/error state.
    await Promise.all([
      loadFunnelSummary(),
      loadChannelPerformance(),
      loadTopContent(),
      loadPerformanceByTag(),
    ]);

    // Action cards are computed from the data the other sections fetched,
    // plus a fresh blog_posts query for the evergreen check. Run last.
    await loadActionCards();
  };

  // ── Layout scaffold ───────────────────────────────────────────
  function insightsScaffoldHtml() {
    return `
      <h1>Insights</h1>
      <p class="pane-sub">Prescriptive analytics — what to do next, not just what happened.</p>

      <section class="insights-section" id="insightsFunnel">
        <h2>Funnel — last ${WINDOW_DAYS} days</h2>
        <div class="metrics-row" id="funnelMetricsRow">
          <div class="metric-card loading"><div class="metric-label">Loading…</div></div>
        </div>
      </section>

      <section class="insights-section" id="insightsActions">
        <h2>What to do next</h2>
        <div id="actionCardsList">
          <div class="muted">Computing recommendations…</div>
        </div>
      </section>

      <section class="insights-section" id="insightsChannels">
        <h2>Channel performance</h2>
        <div id="channelTableContainer">
          <div class="muted">Loading channel breakdown…</div>
        </div>
      </section>

      <section class="insights-section" id="insightsTopContent">
        <h2>Top content</h2>
        <div id="topContentContainer">
          <div class="muted">Loading top posts…</div>
        </div>
      </section>

      <section class="insights-section" id="insightsPerfByTag">
        <h2>Performance by editorial tag</h2>
        <p class="muted" style="margin:-4px 0 12px;font-size:12px">
          Average views per post grouped by tag — how the writing pattern correlates with traction. Last ${WINDOW_DAYS} days.
        </p>
        <div id="perfByTagContainer">
          <div class="muted">Loading tag performance…</div>
        </div>
      </section>
    `;
  }

  // ── 1. Funnel summary ─────────────────────────────────────────
  async function loadFunnelSummary() {
    const row = document.getElementById('funnelMetricsRow');
    if (!row) return;

    // Two independent calls — Supabase (signups, activation, retention) and
    // PostHog (reach, click-through). Either can fail without breaking the
    // other; we render whichever halves we have.
    const [supabaseRes, posthogRes] = await Promise.all([
      fetchSupabaseFunnelMetrics(),
      fetchPosthogQuery('utm_reach_summary', { days: WINDOW_DAYS }),
    ]);

    const cards = [];

    // PostHog-sourced cards (Reach, Click-through)
    if (posthogRes && posthogRes.ok && posthogRes.data) {
      cards.push(metricCard('Reach',
        formatNum(posthogRes.data.unique_visitors),
        'Unique visitors arriving with a UTM tag'
      ));
      cards.push(metricCard('Click-through',
        formatNum(posthogRes.data.pageviews),
        'UTM pageviews — total clicks from outside'
      ));
    } else {
      cards.push(metricCard('Reach', '—', emptyMessageForPosthog(posthogRes)));
      cards.push(metricCard('Click-through', '—', ''));
    }

    // Supabase-sourced cards (Signups, Activated, Active 30d)
    if (supabaseRes && supabaseRes.ok && supabaseRes.data) {
      const d = supabaseRes.data;
      cards.push(metricCard('Signups',
        formatNum(d.signups_total),
        formatNum(d.signups_last_7d) + ' new in last 7 days'
      ));
      cards.push(metricCard('Activated',
        formatNum(d.activated_users),
        'Users who created ≥1 project'
      ));
      cards.push(metricCard('Active 30d',
        formatNum(d.active_30d),
        'Edited a project in last 30 days'
      ));
    } else {
      cards.push(metricCard('Signups',    '—', supabaseRes && supabaseRes.error ? supabaseRes.error : 'Unable to load'));
      cards.push(metricCard('Activated',  '—', ''));
      cards.push(metricCard('Active 30d', '—', ''));
    }

    row.innerHTML = cards.join('');
  }

  async function fetchSupabaseFunnelMetrics() {
    try {
      const { data, error } = await _supabase.rpc('admin_funnel_metrics');
      if (error) {
        console.warn('[admin-insights] admin_funnel_metrics rpc:', error.message);
        return { ok: false, error: 'RPC failed: ' + error.message };
      }
      return { ok: true, data: data };
    } catch (e) {
      console.warn('[admin-insights] admin_funnel_metrics threw:', e);
      return { ok: false, error: 'Network error' };
    }
  }

  // ── 2. Action cards (computed last; depends on other queries) ─
  async function loadActionCards() {
    const list = document.getElementById('actionCardsList');
    if (!list) return;

    const cards = [];

    // a) Top-of-funnel stall: 0 signups in last 7 days
    const funnel = await fetchSupabaseFunnelMetrics();
    if (funnel.ok && funnel.data && funnel.data.signups_last_7d === 0 && funnel.data.signups_total > 0) {
      cards.push(actionCard(
        'amber',
        'Top-of-funnel has stalled',
        'No new signups in the last ' + THRESHOLDS.SIGNUPS_STALL_DAYS + ' days. ' +
        'Time to ship a LinkedIn post or send to your email list.'
      ));
    }

    // b) Channel underperformance: any UTM source with <2% conversion
    //    (visits → signups). Requires correlating PostHog UTM visits with
    //    Supabase signup counts — not possible until we capture UTM source
    //    on signup. Stub this until Chunk 3.
    //    [Chunk 3 will store utm_source on user_profiles at signup time.]

    // c) Evergreen post not re-promoted in 6 months
    const evergreenStale = await fetchStaleEvergreenPosts();
    evergreenStale.forEach(function (post) {
      cards.push(actionCard(
        'blue',
        'Re-promote: "' + escapeHtml(post.title) + '"',
        'This evergreen post hasn\'t had a campaign in over ' +
        THRESHOLDS.EVERGREEN_REPROMOTE_MONTHS + ' months. Consider a v2 launch.'
      ));
    });

    // d) Empty state — no actions to take
    if (cards.length === 0) {
      list.innerHTML = '<div class="muted">No urgent actions right now. Check back as data accumulates.</div>';
      return;
    }

    list.innerHTML = cards.join('');
  }

  async function fetchStaleEvergreenPosts() {
    // Pulls evergreen posts whose most recent campaign launched more than
    // EVERGREEN_REPROMOTE_MONTHS ago. Includes posts with no campaigns yet.
    try {
      const months = THRESHOLDS.EVERGREEN_REPROMOTE_MONTHS;
      // Fetch evergreen posts. We'd ideally LEFT JOIN campaigns and pick the
      // max launched_at per post, but the JS client doesn't do that cleanly;
      // do it in two queries. Volume here is small (admin-only).
      const { data: posts, error } = await _supabase
        .from('blog_posts')
        .select('id, title, slug, published_at')
        .eq('evergreen', true)
        .eq('status', 'published');
      if (error || !posts || posts.length === 0) return [];

      // For each post, get the most recent campaign launched_at.
      const { data: campaigns } = await _supabase
        .from('campaigns')
        .select('blog_post_id, launched_at')
        .in('blog_post_id', posts.map(function (p) { return p.id; }));

      const latestByPost = {};
      (campaigns || []).forEach(function (c) {
        if (!c.launched_at) return;
        if (!latestByPost[c.blog_post_id] || c.launched_at > latestByPost[c.blog_post_id]) {
          latestByPost[c.blog_post_id] = c.launched_at;
        }
      });

      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - months);
      const cutoffIso = cutoff.toISOString();

      return posts.filter(function (p) {
        const last = latestByPost[p.id];
        return !last || last < cutoffIso;
      });
    } catch (e) {
      console.warn('[admin-insights] fetchStaleEvergreenPosts:', e);
      return [];
    }
  }

  // ── 3. Channel performance ────────────────────────────────────
  async function loadChannelPerformance() {
    const container = document.getElementById('channelTableContainer');
    if (!container) return;

    const res = await fetchPosthogQuery('utm_channel_breakdown', { days: WINDOW_DAYS });
    if (!res || !res.ok) {
      container.innerHTML = '<div class="muted">' + emptyMessageForPosthog(res) + '</div>';
      return;
    }

    const rows = res.data || [];
    if (rows.length === 0) {
      container.innerHTML = '<div class="muted">No UTM-tagged traffic in the last ' + WINDOW_DAYS + ' days. Once you start posting, this table will fill in.</div>';
      return;
    }

    let html = '<table class="insights-table"><thead><tr>';
    html += '<th>Source</th><th class="num">Visitors</th><th class="num">Visits</th>';
    html += '</tr></thead><tbody>';
    rows.forEach(function (r) {
      html += '<tr>';
      html += '<td>' + escapeHtml(r.source) + '</td>';
      html += '<td class="num">' + formatNum(r.visitors) + '</td>';
      html += '<td class="num">' + formatNum(r.visits) + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';

    // Forward note: signup attribution column (visits → signups) lights up in
    // Chunk 3 once we capture utm_source on signup.
    html += '<div class="muted" style="margin-top:8px">Signup attribution per channel will appear once we capture UTM source at signup (Chunk 3).</div>';

    container.innerHTML = html;
  }

  // ── 4. Top content ────────────────────────────────────────────
  async function loadTopContent() {
    const container = document.getElementById('topContentContainer');
    if (!container) return;

    // Get list of published blog_posts (admin RLS lets us see all of them)
    let posts = [];
    try {
      const { data, error } = await _supabase
        .from('blog_posts')
        .select('id, title, slug, status, published_at, evergreen')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(20);
      if (!error && data) posts = data;
    } catch (e) {
      console.warn('[admin-insights] blog_posts fetch:', e);
    }

    if (posts.length === 0) {
      container.innerHTML = '<div class="muted">No published blog posts yet. Once you publish one in the Blog tab, traffic to it will appear here ranked by views.</div>';
      return;
    }

    // Layer in PostHog view counts by path. If PostHog is unavailable, fall
    // back to a list with no view counts (still useful — shows what's live).
    const phRes = await fetchPosthogQuery('top_posts_by_views', { days: WINDOW_DAYS });
    const viewsByPath = {};
    if (phRes && phRes.ok && phRes.data) {
      phRes.data.forEach(function (r) { viewsByPath[r.path] = r; });
    }

    let html = '<table class="insights-table"><thead><tr>';
    html += '<th>Title</th><th>Slug</th><th class="num">Views (' + WINDOW_DAYS + 'd)</th><th class="num">Visitors</th><th>Evergreen</th>';
    html += '</tr></thead><tbody>';

    // Annotate each row with view counts when available.
    posts.forEach(function (p) {
      const path = '/blog/' + p.slug;
      const ph = viewsByPath[path];
      html += '<tr>';
      html += '<td>' + escapeHtml(p.title) + '</td>';
      html += '<td><code>' + escapeHtml(p.slug) + '</code></td>';
      html += '<td class="num">' + (ph ? formatNum(ph.views) : '—') + '</td>';
      html += '<td class="num">' + (ph ? formatNum(ph.visitors) : '—') + '</td>';
      html += '<td>' + (p.evergreen ? 'Yes' : '') + '</td>';
      html += '</tr>';
    });
    html += '</tbody></table>';

    if (!phRes || !phRes.ok) {
      html += '<div class="muted" style="margin-top:8px">' + emptyMessageForPosthog(phRes) + '</div>';
    }

    container.innerHTML = html;
  }

  // ── 5. Performance by editorial tag ───────────────────────────
  // Joins the published-posts list (with editorial tag columns) against
  // PostHog views per /blog/<slug>, then aggregates by each tag dimension.
  // Posts with no tag value contribute to an "Untagged" row so the writer
  // sees how much of the corpus is unannotated.
  //
  // Single-select fields (hook_type, audience_target, format) → one row
  // per stored value. Multi-select (frameworks) → posts with multiple
  // values count toward each row, so the post counts can sum higher than
  // total post count; we caveat that under the table.
  const TAG_TABLES = [
    { field: 'hook_type',       label: 'Hook type',       multi: false },
    { field: 'format',          label: 'Format',          multi: false },
    { field: 'audience_target', label: 'Audience target', multi: false },
    { field: 'frameworks',      label: 'Frameworks',      multi: true  }
  ];

  async function loadPerformanceByTag() {
    const container = document.getElementById('perfByTagContainer');
    if (!container) return;

    // Pull every published post with the tag columns. Even posts that
    // got 0 views in the last N days are useful here — they contribute
    // a 0-views row to the tag aggregation and surface as Untagged when
    // no tags are set.
    let posts = [];
    try {
      const { data, error } = await _supabase
        .from('blog_posts')
        .select('id, title, slug, frameworks, hook_type, audience_target, format')
        .eq('status', 'published');
      if (!error && data) posts = data;
    } catch (e) {
      console.warn('[admin-insights] perf-by-tag posts fetch:', e);
    }

    if (posts.length === 0) {
      container.innerHTML = '<div class="muted">No published posts yet. Once you publish + tag a few, this section will fill in.</div>';
      return;
    }

    // Pull views per /blog/<slug> with a higher limit than top_posts_by_views
    // uses by default — we want the full corpus, not just the top 20.
    const phRes = await fetchPosthogQuery('top_posts_by_views', { days: WINDOW_DAYS, limit: 500 });
    const viewsByPath = {};
    if (phRes && phRes.ok && phRes.data) {
      phRes.data.forEach(function (r) { viewsByPath[r.path] = r.views || 0; });
    }

    // Annotate each post with its view count (0 if PostHog has nothing).
    const annotated = posts.map(function (p) {
      return {
        slug:            p.slug,
        title:           p.title,
        views:           viewsByPath['/blog/' + p.slug] || 0,
        hook_type:       p.hook_type || null,
        format:          p.format || null,
        audience_target: p.audience_target || null,
        frameworks:      Array.isArray(p.frameworks) ? p.frameworks : []
      };
    });

    // Render four tables stacked vertically. Even if PostHog is down, the
    // tables still show post counts (just with 0 views), so the section
    // is useful for spotting tag coverage gaps even without traffic data.
    let html = '<div class="perf-by-tag-grid">';
    TAG_TABLES.forEach(function (cfg) {
      html += renderTagTable(cfg, annotated);
    });
    html += '</div>';

    if (!phRes || !phRes.ok) {
      html += '<div class="muted" style="margin-top:8px">' + emptyMessageForPosthog(phRes) + '</div>';
    }

    container.innerHTML = html;
  }

  // Aggregate `posts` by `field`, sort by avg-views desc, and render.
  function renderTagTable(cfg, posts) {
    const isMulti = !!cfg.multi;
    const buckets = Object.create(null);
    let untagged = { count: 0, totalViews: 0 };

    posts.forEach(function (p) {
      const v = p[cfg.field];
      const values = isMulti
        ? (Array.isArray(v) && v.length > 0 ? v : [])
        : (v ? [v] : []);

      if (values.length === 0) {
        untagged.count++;
        untagged.totalViews += p.views || 0;
        return;
      }
      values.forEach(function (val) {
        if (!buckets[val]) buckets[val] = { count: 0, totalViews: 0 };
        buckets[val].count++;
        buckets[val].totalViews += p.views || 0;
      });
    });

    const rows = Object.keys(buckets).map(function (k) {
      const b = buckets[k];
      return {
        value:      k,
        count:      b.count,
        totalViews: b.totalViews,
        avgViews:   b.count > 0 ? b.totalViews / b.count : 0
      };
    });
    rows.sort(function (a, b) { return b.avgViews - a.avgViews; });

    let html = '<div class="perf-by-tag-card">';
    html += '<h3 class="perf-by-tag-title">' + escapeHtml(cfg.label) + '</h3>';
    html += '<table class="insights-table">';
    html += '<thead><tr>' +
              '<th>Value</th>' +
              '<th class="num">Posts</th>' +
              '<th class="num">Total views</th>' +
              '<th class="num">Avg / post</th>' +
            '</tr></thead><tbody>';

    if (rows.length === 0 && untagged.count === 0) {
      html += '<tr><td colspan="4" class="muted" style="text-align:center;padding:14px">No data yet.</td></tr>';
    } else {
      rows.forEach(function (r) {
        html += '<tr>';
        html += '<td>' + escapeHtml(prettyTagValue(r.value)) + '</td>';
        html += '<td class="num">' + formatNum(r.count) + '</td>';
        html += '<td class="num">' + formatNum(r.totalViews) + '</td>';
        html += '<td class="num">' + formatNum(Math.round(r.avgViews)) + '</td>';
        html += '</tr>';
      });
      if (untagged.count > 0) {
        const avg = Math.round(untagged.totalViews / untagged.count);
        html += '<tr style="opacity:0.65">';
        html += '<td><em>Untagged</em></td>';
        html += '<td class="num">' + formatNum(untagged.count) + '</td>';
        html += '<td class="num">' + formatNum(untagged.totalViews) + '</td>';
        html += '<td class="num">' + formatNum(avg) + '</td>';
        html += '</tr>';
      }
    }

    html += '</tbody></table>';
    if (isMulti) {
      html += '<div class="muted" style="font-size:11px;margin-top:4px">' +
              'Posts tagged with multiple frameworks count toward each row.' +
              '</div>';
    }
    html += '</div>';
    return html;
  }

  // Convert canonical kebab-case values back to display labels.
  // Custom values pass through unchanged so they look like the user
  // typed them (with first-letter capitalization for visual consistency).
  function prettyTagValue(v) {
    if (!v) return '';
    return String(v).split('-').map(function (w) {
      return w.charAt(0).toUpperCase() + w.slice(1);
    }).join(' ');
  }

  // ── PostHog proxy fetch ───────────────────────────────────────
  async function fetchPosthogQuery(queryName, params) {
    let token = '';
    try {
      const { data } = await _supabase.auth.getSession();
      token = (data && data.session && data.session.access_token) || '';
    } catch (e) { /* fall through to no-token error */ }

    if (!token) {
      return { ok: false, status: 401, error: 'Not signed in' };
    }

    try {
      const r = await fetch(POSTHOG_PROXY, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: queryName, params: params || {} }),
      });

      if (r.status === 200) {
        const body = await r.json();
        return { ok: true, data: body.data };
      }

      let errBody = {};
      try { errBody = await r.json(); } catch (e) {}
      return { ok: false, status: r.status, error: errBody.error || ('HTTP ' + r.status) };
    } catch (e) {
      return { ok: false, status: 0, error: 'Network error' };
    }
  }

  // ── Render helpers ────────────────────────────────────────────
  function metricCard(label, value, sub) {
    return '' +
      '<div class="metric-card">' +
        '<div class="metric-label">' + escapeHtml(label) + '</div>' +
        '<div class="metric-value">' + escapeHtml(String(value)) + '</div>' +
        (sub ? '<div class="metric-sub">' + escapeHtml(sub) + '</div>' : '') +
      '</div>';
  }

  function actionCard(severity, title, body) {
    return '' +
      '<div class="action-card action-' + severity + '">' +
        '<div class="action-title">' + escapeHtml(title) + '</div>' +
        '<div class="action-body">' + escapeHtml(body) + '</div>' +
      '</div>';
  }

  function emptyMessageForPosthog(res) {
    if (!res) return 'PostHog unavailable.';
    if (res.status === 401) return 'Sign-in expired. Refresh the page.';
    if (res.status === 403) return 'Admin access required.';
    if (res.status === 502 && res.error === 'posthog_env_missing') {
      return 'PostHog environment variables not yet configured on Netlify.';
    }
    if (res.status === 502) return 'PostHog upstream error.';
    if (!res.ok) return 'PostHog query failed (' + (res.error || 'unknown') + ').';
    return 'No data yet — come back after your first week of traffic.';
  }

  function formatNum(n) {
    if (n === null || n === undefined) return '—';
    const x = Number(n);
    if (isNaN(x)) return '—';
    return x.toLocaleString('en-US');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
})();
