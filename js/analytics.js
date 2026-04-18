// ============================================================
// analytics.js — Analytics wrapper
// All user-action tracking flows through trackEvent().
// Drop in Posthog, Amplitude, Mixpanel, or Segment by replacing
// the implementation block — callers don't change.
//
// Future integration (PostHog example):
//   posthog.init('YOUR_KEY', { api_host: 'https://app.posthog.com' })
//   function trackEvent(name, props) { posthog.capture(name, props) }
// ============================================================

/**
 * Track a named user action with optional properties.
 *
 * @param {string} name — snake_case event name, e.g. 'project_created'
 * @param {object} [props] — additional key/value metadata
 *
 * Standard events used in the app:
 *   mode_switched        { from, to }
 *   project_created      { tier }
 *   project_deleted      {}
 *   requirement_added    { type, ility }
 *   concept_added        { mode }           mode = 'basic' | 'full'
 *   pugh_score_set       { score }
 *   basic_mode_used      {}
 *   full_mode_used       {}
 *   export_triggered     { format }          format = 'json' | 'pdf'
 *   upgrade_prompt_shown { feature }
 *   theme_changed        { theme }
 */
function trackEvent(name, props) {
  const payload = {
    event: name,
    ts: new Date().toISOString(),
    user_id: appState.currentUser ? appState.currentUser.id : 'anonymous',
    tier: userTier,
    mode: appMode,
    ...props
  };

  // MOCK: log to console in dev; swap for real SDK call
  if (typeof console !== 'undefined') {
    console.debug('[analytics]', payload.event, payload);
  }

  // PostHog / Amplitude / Segment replacement:
  // posthog.capture(name, payload)
  // amplitude.track(name, payload)
  // analytics.track(name, payload)
}

/**
 * Identify the current user for analytics (call after login).
 * @param {object} user — { id, email, tier }
 *
 * Replacement:
 *   posthog.identify(user.id, { email: user.email, tier: user.tier })
 */
function identifyUser(user) {
  // MOCK: no-op
  console.debug('[analytics] identify', user && user.id);
}

/**
 * Reset identity on logout.
 *
 * Replacement:
 *   posthog.reset()
 */
function resetAnalyticsUser() {
  // MOCK: no-op
  console.debug('[analytics] reset');
}
