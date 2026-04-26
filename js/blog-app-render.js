// ============================================================
// blog-app-render.js — In-app blog renderer
//
// Renders the public blog inside app.html's #page-blog section so
// logged-in users keep their sidebars, theme, and top nav while
// reading. Reads the current hash to decide what to show:
//
//   #blog          → list of published posts
//   #blog/<slug>   → single post detail
//
// Logged-out visitors get the standalone blog.html / blog-post.html
// pages (with marketing chrome) — those pages redirect to the
// in-app version when a Supabase session is present.
//
// Dependencies (loaded earlier in app.html):
//   _supabase    — from js/config.js
//   trackEvent   — from js/analytics.js (optional)
// ============================================================

(function () {
  'use strict';

  // Public entry point — called from switchPage('blog') in app.js.
  window.renderAppBlog = async function () {
    const root = document.getElementById('blogAppContainer');
    if (!root) return;

    const slug = currentSlugFromHash();
    if (slug) {
      await renderArticle(root, slug);
    } else {
      await renderIndex(root);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────
  function currentSlugFromHash() {
    const h = window.location.hash || '';
    if (h.indexOf('#blog/') !== 0) return '';
    try {
      return decodeURIComponent(h.slice('#blog/'.length)).trim().toLowerCase();
    } catch (e) {
      return h.slice('#blog/'.length).trim().toLowerCase();
    }
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return ''; }
  }

  function readTimeMinutes(html) {
    const text = String(html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!text) return 1;
    return Math.max(1, Math.round(text.split(' ').length / 225));
  }

  // ── Index view ────────────────────────────────────────────────
  async function renderIndex(root) {
    root.innerHTML = '<div class="blog-app-loading">Loading posts…</div>';

    const { data: posts, error } = await _supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, content, tags, published_at')
      .eq('status', 'published')
      .order('published_at', { ascending: false });

    if (error) {
      root.innerHTML =
        '<div class="blog-app-empty">Couldn\'t load posts right now. ' +
        '<br><span style="opacity:0.6">' + escapeHtml(error.message) + '</span></div>';
      return;
    }

    if (!posts || posts.length === 0) {
      root.innerHTML =
        '<div class="blog-app-index">' +
          '<div class="blog-app-hero">' +
            '<h1>Blog</h1>' +
            '<p>Notes on systems thinking, capability design, and the practical work of converging on better strategy.</p>' +
          '</div>' +
          '<div class="blog-app-empty">No posts published yet — come back soon.</div>' +
        '</div>';
      return;
    }

    let html = '<div class="blog-app-index">' +
      '<div class="blog-app-hero">' +
        '<h1>Blog</h1>' +
        '<p>Notes on systems thinking, capability design, and the practical work of converging on better strategy.</p>' +
      '</div>' +
      '<div class="blog-app-grid">';

    posts.forEach(function (p) {
      const tags = (p.tags || []).map(function (t) {
        return '<span class="tag">' + escapeHtml(t) + '</span>';
      }).join('');
      const minutes = readTimeMinutes(p.content);
      html += '' +
        '<article class="blog-app-card" data-slug="' + escapeHtml(p.slug) + '">' +
          '<div class="meta">' + formatDate(p.published_at) + ' · ' + minutes + ' min read</div>' +
          '<h2>' + escapeHtml(p.title || 'Untitled') + '</h2>' +
          '<div class="excerpt">' + escapeHtml(p.excerpt || '') + '</div>' +
          (tags ? '<div class="tags">' + tags + '</div>' : '') +
        '</article>';
    });
    html += '</div></div>';

    root.innerHTML = html;

    // Wire card clicks to update the hash. The hashchange listener in app.js
    // re-runs renderAppBlog → renders the single-post view.
    root.querySelectorAll('.blog-app-card').forEach(function (card) {
      card.addEventListener('click', function () {
        const slug = card.getAttribute('data-slug');
        if (slug) window.location.hash = '#blog/' + slug;
      });
    });
  }

  // ── Single post ───────────────────────────────────────────────
  async function renderArticle(root, slug) {
    root.innerHTML = '<div class="blog-app-loading">Loading…</div>';

    const { data: post, error } = await _supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, content, tags, published_at, evergreen')
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();

    if (error) {
      console.error('[blog-app-render] supabase error:', error);
      root.innerHTML =
        '<div class="blog-app-notfound"><h1>Couldn\'t load post</h1>' +
        '<p>Please try again in a moment.</p>' +
        '<p><a href="#blog" class="blog-app-back">← All posts</a></p></div>';
      return;
    }

    if (!post) {
      root.innerHTML =
        '<div class="blog-app-notfound"><h1>Post not found</h1>' +
        '<p>We couldn\'t find a published post at <code>' + escapeHtml(slug) + '</code>.</p>' +
        '<p><a href="#blog" class="blog-app-back">← All posts</a></p></div>';
      return;
    }

    const tags = (post.tags || []).map(function (t) {
      return '<span class="tag">' + escapeHtml(t) + '</span>';
    }).join('');

    root.innerHTML = '' +
      '<article class="blog-app-article">' +
        '<a href="#blog" class="blog-app-back">← All posts</a>' +
        '<div class="article-meta">' + formatDate(post.published_at) + ' · ' +
          readTimeMinutes(post.content) + ' min read</div>' +
        '<h1>' + escapeHtml(post.title || '') + '</h1>' +
        (tags ? '<div class="article-tags">' + tags + '</div>' : '') +
        '<div class="blog-app-body">' + (post.content || '') + '</div>' +
      '</article>';
  }
})();
