// ============================================================
// supa-rest.js — Raw fetch wrappers for Supabase REST API.
//
// All app reads and writes to the database go through these wrappers
// instead of the Supabase JS SDK. The SDK's hot-path bugs (stuck
// promises, lock contention, hung fetches) don't affect us because
// we never call into the SDK from these functions.
//
// Every wrapper:
//   - Pulls the current JWT from supa-session.js (sync, no network)
//   - Adds standard Supabase headers (apikey, Authorization)
//   - Wraps fetch in a 12-second AbortController
//   - On 401, tries to refresh the token once and retry the request
//   - Returns a consistent shape: { ok, status, data, error }
//
// Dependencies: SUPABASE_URL, SUPABASE_ANON_KEY (config.js),
//               _authGetAccessToken, _authRefresh (supa-session.js)
// Used by: api.js (saveProject, loadProjects, etc.)
// ============================================================

const _REST_BASE = SUPABASE_URL + '/rest/v1';
const _REST_FETCH_TIMEOUT_MS = 12000;

// Build the standard headers for a REST request, including JWT if available.
function _restBuildHeaders(extra) {
  const headers = {
    'apikey':       SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  };
  const token = _authGetAccessToken();
  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (extra) Object.assign(headers, extra);
  return headers;
}

/**
 * Core fetch wrapper. Used by every other function in this file.
 *
 * Returns { ok, status, data, error }:
 *   - ok:     true if HTTP 2xx
 *   - status: HTTP status code (0 if the request never completed)
 *   - data:   parsed JSON response, or null if response was empty / not JSON
 *   - error:  human-readable error string, or null on success
 *
 * On 401, attempts a token refresh and retries the request once.
 * On AbortError (12s timeout), returns ok:false with a clear error message.
 *
 * @param {string} url
 * @param {RequestInit} fetchOptions
 * @param {boolean} [isRetry] — internal, prevents infinite refresh loops
 */
async function _restFetch(url, fetchOptions, isRetry) {
  const controller = new AbortController();
  const timer = setTimeout(function() { controller.abort(); }, _REST_FETCH_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, Object.assign({}, fetchOptions, { signal: controller.signal }));
    clearTimeout(timer);
  } catch (e) {
    clearTimeout(timer);
    if (e && e.name === 'AbortError') {
      return { ok: false, status: 0, data: null, error: 'Request timed out after 12 seconds' };
    }
    return { ok: false, status: 0, data: null, error: (e && e.message) ? e.message : String(e) };
  }

  // 401 means the JWT is expired or invalid. Try to refresh and retry once.
  if (response.status === 401 && !isRetry) {
    console.warn('[supa-rest] got 401, refreshing token and retrying');
    const newToken = await _authRefresh();
    if (newToken) {
      const retryHeaders = Object.assign({}, fetchOptions.headers || {}, {
        'Authorization': 'Bearer ' + newToken
      });
      return await _restFetch(url, Object.assign({}, fetchOptions, { headers: retryHeaders }), true);
    }
    // Refresh failed — fall through to return the 401.
  }

  // Try to parse the body as JSON. PostgREST returns JSON for both success
  // and error responses; DELETE may return empty body which is fine.
  let data = null;
  try {
    const text = await response.text();
    if (text) data = JSON.parse(text);
  } catch (e) {
    // Body wasn't JSON — leave data as null.
  }

  let error = null;
  if (!response.ok) {
    error = (data && (data.message || data.hint || data.details))
         || ('HTTP ' + response.status);
  }

  return { ok: response.ok, status: response.status, data: data, error: error };
}

/**
 * GET /rest/v1/{table}?{queryString}
 *
 * Example: _restGet('projects', 'select=*&order=updated_at.desc')
 *
 * @param {string} table
 * @param {string} [queryString] — already URL-encoded; do not include leading '?'
 */
async function _restGet(table, queryString) {
  const url = _REST_BASE + '/' + table + (queryString ? '?' + queryString : '');
  return _restFetch(url, { method: 'GET', headers: _restBuildHeaders() });
}

/**
 * POST /rest/v1/{table} — INSERT or UPSERT.
 *
 * Options:
 *   upsert: boolean — if true, sets Prefer: resolution=merge-duplicates
 *           and on_conflict query param. Default: false (plain INSERT).
 *   onConflict: string — column name(s) to match for upsert. Default: 'id'.
 *   returnRepresentation: boolean — if true (default), Prefer: return=representation
 *           so the response body contains the inserted/updated row.
 *
 * @param {string} table
 * @param {object|object[]} body — single row or array of rows
 * @param {object} [options]
 */
async function _restPost(table, body, options) {
  options = options || {};
  let url = _REST_BASE + '/' + table;
  if (options.upsert) {
    url += '?on_conflict=' + encodeURIComponent(options.onConflict || 'id');
  }
  const preferParts = [];
  if (options.upsert) preferParts.push('resolution=merge-duplicates');
  if (options.returnRepresentation !== false) preferParts.push('return=representation');
  const headers = _restBuildHeaders(preferParts.length ? { 'Prefer': preferParts.join(',') } : null);

  return _restFetch(url, {
    method: 'POST',
    headers: headers,
    body: JSON.stringify(body)
  });
}

/**
 * PATCH /rest/v1/{table}?{whereClause} — UPDATE rows matching where clause.
 *
 * Example: _restPatch('projects', { name: 'New name' }, 'id=eq.proj_123')
 *
 * @param {string} table
 * @param {object} body — fields to update
 * @param {string} whereClause — already URL-encoded PostgREST filter
 */
async function _restPatch(table, body, whereClause) {
  const url = _REST_BASE + '/' + table + '?' + whereClause;
  return _restFetch(url, {
    method: 'PATCH',
    headers: _restBuildHeaders({ 'Prefer': 'return=representation' }),
    body: JSON.stringify(body)
  });
}

/**
 * DELETE /rest/v1/{table}?{whereClause}
 *
 * Example: _restDelete('projects', 'id=eq.proj_123')
 *
 * @param {string} table
 * @param {string} whereClause — already URL-encoded PostgREST filter
 */
async function _restDelete(table, whereClause) {
  const url = _REST_BASE + '/' + table + '?' + whereClause;
  return _restFetch(url, { method: 'DELETE', headers: _restBuildHeaders() });
}

/**
 * POST /rest/v1/rpc/{name}
 *
 * Calls a Postgres function. Body should be an object of arg name → value.
 *
 * @param {string} name — function name
 * @param {object} [body] — arguments
 */
async function _restRpc(name, body) {
  const url = _REST_BASE + '/rpc/' + name;
  return _restFetch(url, {
    method: 'POST',
    headers: _restBuildHeaders(),
    body: JSON.stringify(body || {})
  });
}
