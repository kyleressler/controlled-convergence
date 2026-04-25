// ============================================================
// analytics.js — Analytics wrapper (PostHog)
// All user-action tracking flows through trackEvent().
// PostHog is initialized in app.html via the snippet in <head>;
// this file simply forwards events to window.posthog when present.
//
// Safe-by-design: every call checks that posthog is loaded and
// initialized. If it isn't (network blocked, init not yet run, or
// running on a page without the snippet), the call is a no-op
// — never throws, never breaks the calling flow.
// ============================================================

/**
 * True iff the PostHog SDK is loaded and `capture` is available.
 * The snippet stub also exposes `capture`, so this is true after
 * the inline snippet runs even before the remote array.js arrives.
 */
function _posthogReady() {
  return typeof window !== 'undefined'
      && window.posthog
      && typeof window.posthog.capture === 'function';
}

/**
 * Track a named user action with optional properties.
 *
 * @param {string} name — snake_case event name, e.g. 'project_created'
 * @param {object} [props] — additional key/value metadata
 *
 * Standard events used in the app:
 *   page_viewed              { page }                       // PostHog also auto-captures $pageview
 *   mode_switched            { from, to }
 *   project_created          { tier }
 *   project_deleted          {}
 *   requirement_added        { type, ility }
 *   concept_added            { mode }                       // mode = 'basic' | 'full'
 *   pugh_score_set           { score }
 *   basic_mode_used          {}
 *   full_mode_used           {}
 *   export_triggered         { format }                     // format = 'json' | 'pdf'
 *   upgrade_prompt_shown     { feature }
 *   theme_changed            { theme }
 *
 * Admin/content events (Chunk 1+):
 *   blog_post_created        { post_id }
 *   blog_post_published      { post_id, slug }
 *   campaign_created         { post_id, version }
 *   content_piece_confirmed  { piece_id, type, platform_url? }
 */
function trackEvent(name, props) {
  // Build a payload that matches the existing call sites — these properties
  // become event properties in PostHog and are automatically queryable.
  var payload = Object.assign(
    {
      tier: typeof userTier === 'string' ? userTier : 'free',
      mode: typeof appMode  === 'string' ? appMode  : 'full'
    },
    props || {}
  );

  if (_posthogReady()) {
    try { window.posthog.capture(name, payload); } catch (e) { /* never let analytics break the app */ }
  }
}

/**
 * Identify the current user for analytics (call after login).
 * @param {object} user — { id, email, tier }
 */
function identifyUser(user) {
  if (!user || !user.id) return;
  if (_posthogReady() && typeof window.posthog.identify === 'function') {
    try {
      window.posthog.identify(user.id, {
        email: user.email,
        tier:  user.tier
      });
    } catch (e) { /* swallow */ }
  }
}

/**
 * Reset identity on logout. Clears the PostHog distinct_id and starts a new
 * anonymous session so subsequent events aren't attributed to the prior user.
 */
function resetAnalyticsUser() {
  if (_posthogReady() && typeof window.posthog.reset === 'function') {
    try { window.posthog.reset(); } catch (e) { /* swallow */ }
  }
}
