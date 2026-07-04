// ============================================================
// concept-images.js — signed-URL helper for private concept hero images
//
// Concept hero images live in the PRIVATE Supabase Storage bucket
// `concept-images` (see sql/2026-07-03-concept-hero-images.sql). Because
// the bucket is private, a plain <img src> cannot load an object — you
// need a short-lived SIGNED URL, which is a tokenized, expiring link.
//
// DESIGN (why this is safe against the "URL expired mid-session" worry):
//   • We store only the OBJECT PATH on the concept (heroImagePath), never
//     a URL. Signed URLs are minted ON DEMAND from that path at render time
//     and cached in memory — never persisted.
//   • TTL is 180 minutes. A typical session is covered by the first mint;
//     if a session runs longer, the next render re-mints transparently.
//   • Refresh / new tab → fresh page context → fresh mints. Nothing depends
//     on any single URL outliving its TTL.
//   • Minting requires a valid Supabase session (the app keeps the JWT fresh
//     via supa-session.js). If the session itself dies, the user can't load
//     project data at all — images going dark is then correct, not a bug.
//
// Access is enforced by RLS on storage.objects: createSignedUrl only
// succeeds if the current user may VIEW that project's images.
//
// Exposed globally as window.ConceptImages.
// Uses the SDK storage client `_supabase.storage` (config.js) — the same
// client admin-blog.js uses for the public blog-images bucket.
// ============================================================

(function () {
  'use strict';

  var BUCKET             = 'concept-images';
  var TTL_SECONDS        = 180 * 60;          // 180-minute signed URLs
  var REFRESH_MARGIN_MS  = 5 * 60 * 1000;     // re-mint when within 5 min of expiry

  // path -> { url: string, expiresAt: number (epoch ms) }
  var _cache = new Map();

  function _fresh(entry) {
    return entry && (entry.expiresAt - Date.now()) > REFRESH_MARGIN_MS;
  }

  // ── Single object ──────────────────────────────────────────
  // Returns a signed URL string, or null on any failure / no access.
  async function getSignedUrl(path) {
    if (!path) return null;

    var cached = _cache.get(path);
    if (_fresh(cached)) return cached.url;

    try {
      var res = await _supabase.storage.from(BUCKET).createSignedUrl(path, TTL_SECONDS);
      if (res.error || !res.data || !res.data.signedUrl) {
        if (res.error) console.warn('[concept-images] createSignedUrl failed:', res.error.message || res.error);
        return null;
      }
      _cache.set(path, { url: res.data.signedUrl, expiresAt: Date.now() + TTL_SECONDS * 1000 });
      return res.data.signedUrl;
    } catch (e) {
      console.warn('[concept-images] createSignedUrl threw:', e);
      return null;
    }
  }

  // ── Batch (for the Pugh matrix — mint all at once so hovers are instant) ──
  // Takes an array of paths; returns a Map(path -> url|null). Only the
  // uncached/stale paths hit the network, in a single createSignedUrls call.
  async function getSignedUrls(paths) {
    var out = new Map();
    var misses = [];

    (paths || []).forEach(function (p) {
      if (!p) return;
      var cached = _cache.get(p);
      if (_fresh(cached)) out.set(p, cached.url);
      else if (misses.indexOf(p) === -1) misses.push(p);
    });

    if (misses.length === 0) return out;

    try {
      var res = await _supabase.storage.from(BUCKET).createSignedUrls(misses, TTL_SECONDS);
      if (res.error || !Array.isArray(res.data)) {
        if (res.error) console.warn('[concept-images] createSignedUrls failed:', res.error.message || res.error);
        misses.forEach(function (p) { out.set(p, null); });
        return out;
      }
      var expiresAt = Date.now() + TTL_SECONDS * 1000;
      res.data.forEach(function (row) {
        // row: { path, signedUrl, error }
        if (row && row.signedUrl && !row.error) {
          _cache.set(row.path, { url: row.signedUrl, expiresAt: expiresAt });
          out.set(row.path, row.signedUrl);
        } else {
          out.set(row && row.path, null);
        }
      });
      // Anything the API silently omitted → null so callers don't hang on it.
      misses.forEach(function (p) { if (!out.has(p)) out.set(p, null); });
      return out;
    } catch (e) {
      console.warn('[concept-images] createSignedUrls threw:', e);
      misses.forEach(function (p) { out.set(p, null); });
      return out;
    }
  }

  // Drop a cached URL (call after replacing/deleting an object at this path).
  function invalidate(path) {
    if (path) _cache.delete(path);
  }

  // Wipe the whole cache (call on logout / when switching projects).
  function clearCache() {
    _cache.clear();
  }

  window.ConceptImages = {
    BUCKET:      BUCKET,
    TTL_SECONDS: TTL_SECONDS,
    getSignedUrl:  getSignedUrl,
    getSignedUrls: getSignedUrls,
    invalidate:    invalidate,
    clearCache:    clearCache
  };
})();
