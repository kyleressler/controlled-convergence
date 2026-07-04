// ============================================================
// concept-images.js — private concept hero images over raw Storage REST
//
// Concept hero images live in the PRIVATE Supabase Storage bucket
// `concept-images` (see sql/2026-07-03-concept-hero-images.sql). Because the
// bucket is private, a plain <img src> cannot load an object — you need a
// short-lived SIGNED URL (a tokenized, expiring link).
//
// WHY RAW REST (not the SDK): the Supabase JS SDK's storage calls share the
// same unreliable hot path the rest of this app avoids (stuck refresh
// promises, hung fetches Safari won't abort — see config.js / supa-session.js).
// So we talk to the Storage REST API directly with the user's JWT, an
// AbortController timeout, and one 401 refresh-retry — mirroring supa-rest.js.
// This guarantees calls can never hang indefinitely.
//
// SIGNED-URL DESIGN (why "URL expired mid-session" is a non-issue):
//   • We store only the OBJECT PATH on the concept (heroImagePath), never a URL.
//   • Signed URLs are minted ON DEMAND from that path and cached in memory.
//   • TTL is 180 minutes; re-mint is transparent on the next render. Refresh /
//     new tab → fresh page → fresh mints. Nothing depends on one URL surviving.
//
// Access is enforced by RLS on storage.objects: signing/uploading only succeed
// if the current user may view / edit that project's images.
//
// Exposed globally as window.ConceptImages.
// Dependencies: SUPABASE_URL, SUPABASE_ANON_KEY (config.js),
//               _authGetAccessToken, _authRefresh (supa-session.js).
// ============================================================

(function () {
  'use strict';

  var BUCKET            = 'concept-images';
  var TTL_SECONDS       = 180 * 60;           // 180-minute signed URLs
  var REFRESH_MARGIN_MS = 5 * 60 * 1000;      // re-mint when within 5 min of expiry
  var STORAGE_BASE      = SUPABASE_URL + '/storage/v1';
  var OP_TIMEOUT_MS     = 15000;              // sign / delete
  var UPLOAD_TIMEOUT_MS = 20000;              // upload (larger body)

  // path -> { url: string, expiresAt: number (epoch ms) }
  var _cache = new Map();

  function _fresh(entry) {
    return entry && (entry.expiresAt - Date.now()) > REFRESH_MARGIN_MS;
  }

  // Raw fetch to the Storage API: user JWT + apikey, hard timeout, one 401
  // refresh-retry. Never touches the SDK. Returns the Response (or throws on
  // network error / abort).
  async function _storageFetch(subpath, options, timeoutMs, _retried) {
    var token = _authGetAccessToken();
    var headers = Object.assign({
      'apikey':        SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + (token || SUPABASE_ANON_KEY)
    }, options.headers || {});

    var controller = new AbortController();
    var timer = setTimeout(function () { controller.abort(); }, timeoutMs || OP_TIMEOUT_MS);
    var resp;
    try {
      resp = await fetch(STORAGE_BASE + subpath,
        Object.assign({}, options, { headers: headers, signal: controller.signal }));
    } finally {
      clearTimeout(timer);
    }

    if (resp.status === 401 && !_retried) {
      var newTok = await _authRefresh();
      if (newTok) return _storageFetch(subpath, options, timeoutMs, true);
    }
    return resp;
  }

  // POST /object/sign/{bucket}  { expiresIn, paths:[...] } → [{ signedURL, path, error }]
  async function _signBatch(paths) {
    var resp = await _storageFetch('/object/sign/' + BUCKET, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ expiresIn: TTL_SECONDS, paths: paths })
    }, OP_TIMEOUT_MS);
    if (!resp.ok) return null;
    return await resp.json();
  }

  // ── Single object → signed URL (or null) ───────────────────
  async function getSignedUrl(path) {
    if (!path) return null;
    var cached = _cache.get(path);
    if (_fresh(cached)) return cached.url;
    try {
      var arr = await _signBatch([path]);
      if (!Array.isArray(arr) || !arr[0] || !arr[0].signedURL || arr[0].error) return null;
      var full = STORAGE_BASE + arr[0].signedURL;
      _cache.set(path, { url: full, expiresAt: Date.now() + TTL_SECONDS * 1000 });
      return full;
    } catch (e) {
      console.warn('[concept-images] getSignedUrl failed:', e);
      return null;
    }
  }

  // ── Batch (for the Pugh matrix) → Map(path -> url|null) ─────
  async function getSignedUrls(paths) {
    var out = new Map();
    var misses = [];
    (paths || []).forEach(function (p) {
      if (!p) return;
      var c = _cache.get(p);
      if (_fresh(c)) out.set(p, c.url);
      else if (misses.indexOf(p) === -1) misses.push(p);
    });
    if (!misses.length) return out;

    try {
      var arr = await _signBatch(misses);
      var exp = Date.now() + TTL_SECONDS * 1000;
      if (Array.isArray(arr)) {
        arr.forEach(function (row) {
          if (row && row.signedURL && !row.error) {
            var full = STORAGE_BASE + row.signedURL;
            _cache.set(row.path, { url: full, expiresAt: exp });
            out.set(row.path, full);
          } else {
            out.set(row && row.path, null);
          }
        });
      }
      misses.forEach(function (p) { if (!out.has(p)) out.set(p, null); });
    } catch (e) {
      console.warn('[concept-images] getSignedUrls failed:', e);
      misses.forEach(function (p) { out.set(p, null); });
    }
    return out;
  }

  // ── Upload a blob → { ok, status, error } ──────────────────
  // POST /object/{bucket}/{path}, body = blob. RLS gates it to owner/editor.
  async function upload(path, blob, contentType) {
    try {
      var resp = await _storageFetch('/object/' + BUCKET + '/' + path, {
        method:  'POST',
        headers: { 'Content-Type': contentType || 'application/octet-stream', 'x-upsert': 'false' },
        body:    blob
      }, UPLOAD_TIMEOUT_MS);
      if (!resp.ok) {
        var msg = '';
        try { msg = (await resp.json()).message || ''; }
        catch (e) { try { msg = await resp.text(); } catch (e2) {} }
        return { ok: false, status: resp.status, error: msg || ('HTTP ' + resp.status) };
      }
      return { ok: true, status: resp.status };
    } catch (e) {
      return { ok: false, status: 0, error: (e && e.name === 'AbortError') ? 'timeout' : String((e && e.message) || e) };
    }
  }

  // ── Best-effort delete of one or more object paths ─────────
  // DELETE /object/{bucket}  { prefixes:[...] }. Never throws.
  async function remove(paths) {
    var list = Array.isArray(paths) ? paths : [paths];
    list = list.filter(Boolean);
    if (!list.length) return;
    try {
      await _storageFetch('/object/' + BUCKET, {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ prefixes: list })
      }, OP_TIMEOUT_MS);
    } catch (e) { /* best-effort */ }
    list.forEach(function (p) { _cache.delete(p); });
  }

  function invalidate(path) { if (path) _cache.delete(path); }
  function clearCache() { _cache.clear(); }

  window.ConceptImages = {
    BUCKET:        BUCKET,
    TTL_SECONDS:   TTL_SECONDS,
    getSignedUrl:  getSignedUrl,
    getSignedUrls: getSignedUrls,
    upload:        upload,
    remove:        remove,
    invalidate:    invalidate,
    clearCache:    clearCache
  };
})();
