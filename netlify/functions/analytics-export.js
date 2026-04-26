// ============================================================
// DEPRECATED — DELETE THIS FILE
//
// The analytics export was rebuilt as a client-side feature on the
// Insights tab; this Netlify function is no longer used by anything.
//
// To remove cleanly:
//   rm -f .git/index.lock .git/HEAD.lock   # if a lock is stuck
//   git rm netlify/functions/analytics-export.js
//   git commit -m "Remove deprecated analytics-export Netlify function"
//
// Stub returns 410 Gone so any stale caller gets a clear signal.
// ============================================================
'use strict';

exports.handler = async function () {
  return {
    statusCode: 410,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      error: 'gone',
      detail: 'analytics-export was removed; the export now runs client-side on the Insights tab.',
    }),
  };
};
