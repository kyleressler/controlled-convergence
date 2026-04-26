// ============================================================
// admin-blog.js — Blog post list + editor (Stage 1 of Chunk 3)
//
// Admin-only. Loaded by admin.html. Responsible for:
//   • Rendering the post list in the Blog tab
//   • Creating, editing, saving, and publishing blog posts
//   • Quill rich-text editing with image upload to blog-images bucket
//   • Autosave every 30 seconds when the editor is dirty
//   • Auto-generating campaign v1 when a post is first published
//
// Future stages (3, 4) will add the campaign timeline + content hub
// and the publishing schedule. We expose a small render hook
// (renderAdminBlog) and a few helpers that those stages will reuse.
//
// Dependencies (already loaded by admin.html):
//   _supabase    — from js/config.js
//   trackEvent   — from js/analytics.js
//   appState     — from js/state.js (hydrated by admin gate)
//   Quill        — loaded from CDN before this file
// ============================================================

(function () {
  'use strict';

  // ── Module-scoped state ───────────────────────────────────────
  // We deliberately keep editor state out of appState — it's transient
  // admin UI, not part of the user's project work.
  let _quill = null;
  let _currentPostId = null;     // null = new (unsaved) post
  let _currentPost = null;       // last-known server-side row (for diffing/dirty)
  let _isDirty = false;
  let _autosaveTimer = null;
  let _view = 'list';            // 'list' | 'editor'

  const AUTOSAVE_INTERVAL_MS = 30 * 1000;
  const STORAGE_BUCKET = 'blog-images';

  // ── Public entry point — admin.html calls this after gate succeeds
  // and whenever the Blog tab is activated.
  window.renderAdminBlog = async function () {
    const root = document.getElementById('pane-blog');
    if (!root) return;

    // Default to list view; editor is opened via "New post" or row click.
    if (_view === 'editor') {
      renderEditor(root);
    } else {
      await renderList(root);
    }
  };

  // Used by the topbar refresh button in admin.html — lets the shell skip
  // re-render while the user is mid-edit so unsaved changes aren't lost.
  window.adminBlogIsEditing = function () {
    return _view === 'editor';
  };

  // ── List view ────────────────────────────────────────────────
  async function renderList(root) {
    root.innerHTML = `
      <div class="blog-header">
        <div>
          <h1>Blog</h1>
          <p class="pane-sub">Write, publish, and re-promote content.</p>
        </div>
        <button class="btn-primary" id="blogNewBtn">+ New post</button>
      </div>
      <div id="blogListContainer">
        <div class="muted">Loading posts…</div>
      </div>
    `;

    document.getElementById('blogNewBtn').addEventListener('click', openNewPost);

    const { data: posts, error } = await _supabase
      .from('blog_posts')
      .select('id, title, slug, status, evergreen, tags, published_at, updated_at, created_at')
      .order('updated_at', { ascending: false });

    const container = document.getElementById('blogListContainer');
    if (error) {
      container.innerHTML = '<div class="muted">Failed to load posts: ' + escapeHtml(error.message) + '</div>';
      return;
    }
    if (!posts || posts.length === 0) {
      container.innerHTML = '<div class="empty-card"><strong>No posts yet.</strong>Click "+ New post" to create your first one.</div>';
      return;
    }

    let html = '<table class="insights-table blog-list-table"><thead><tr>';
    html += '<th>Title</th><th>Slug</th><th>Status</th><th>Tags</th><th>Updated</th><th></th>';
    html += '</tr></thead><tbody>';
    posts.forEach(function (p) {
      const tags = (p.tags || []).map(escapeHtml).map(function (t) {
        return '<span class="tag-chip">' + t + '</span>';
      }).join(' ');
      html += '<tr data-post-id="' + escapeHtml(p.id) + '">';
      html += '<td><a href="#" class="blog-row-link">' + escapeHtml(p.title || '(untitled)') + '</a>';
      html += p.evergreen ? ' <span class="evergreen-badge" title="Evergreen">★</span>' : '';
      html += '</td>';
      html += '<td><code>' + escapeHtml(p.slug) + '</code></td>';
      html += '<td><span class="status-pill status-' + escapeHtml(p.status) + '">' + escapeHtml(p.status) + '</span></td>';
      html += '<td>' + (tags || '<span class="muted">—</span>') + '</td>';
      html += '<td class="muted">' + formatDate(p.updated_at) + '</td>';
      html += '<td><button class="btn-link blog-delete-btn" data-post-id="' + escapeHtml(p.id) + '">Delete</button></td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    container.innerHTML = html;

    // Wire row click → editor
    container.querySelectorAll('.blog-row-link').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        const tr = a.closest('tr');
        if (tr) openExistingPost(tr.getAttribute('data-post-id'));
      });
    });
    // Wire delete buttons
    container.querySelectorAll('.blog-delete-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        deletePost(btn.getAttribute('data-post-id'));
      });
    });
  }

  async function deletePost(postId) {
    if (!confirm('Delete this post? Campaigns and content pieces tied to it will also be removed.')) return;
    const { error } = await _supabase.from('blog_posts').delete().eq('id', postId);
    if (error) {
      alert('Delete failed: ' + error.message);
      return;
    }
    if (typeof trackEvent === 'function') trackEvent('blog_post_deleted', { post_id: postId });
    await renderList(document.getElementById('pane-blog'));
  }

  // ── Editor view ──────────────────────────────────────────────
  function openNewPost() {
    _currentPostId = null;
    _currentPost = {
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      tags: [],
      status: 'draft',
      evergreen: false
    };
    _isDirty = false;
    _view = 'editor';
    renderEditor(document.getElementById('pane-blog'));
  }

  async function openExistingPost(postId) {
    // Pull the latest row from Supabase so we don't edit stale data
    const { data, error } = await _supabase
      .from('blog_posts')
      .select('*')
      .eq('id', postId)
      .single();
    if (error || !data) {
      alert('Failed to load post: ' + (error ? error.message : 'not found'));
      return;
    }
    _currentPostId = postId;
    _currentPost = data;
    _isDirty = false;
    _view = 'editor';
    renderEditor(document.getElementById('pane-blog'));
  }

  function renderEditor(root) {
    const p = _currentPost;
    root.innerHTML = `
      <div class="blog-header">
        <div>
          <button class="btn-link" id="blogBackBtn">← Back to posts</button>
          <h1 id="editorTitle">${escapeHtml(p.title || 'New post')}</h1>
        </div>
        <div class="editor-actions">
          <span id="autosaveStatus" class="muted"></span>
          <button class="btn-secondary" id="blogSaveDraftBtn">Save draft</button>
          <button class="btn-primary" id="blogPublishBtn">${p.status === 'published' ? 'Update' : 'Publish'}</button>
        </div>
      </div>

      <div class="editor-grid">
        <div class="editor-main">
          <label class="editor-label">Title</label>
          <input type="text" id="editorTitleInput" class="editor-text" value="${escapeAttr(p.title)}" placeholder="Post title">

          <label class="editor-label">Content</label>
          <div id="editorQuillContainer">
            <div id="editorQuill"></div>
          </div>
        </div>

        <aside class="editor-side">
          <div class="side-section">
            <label class="editor-label">Slug</label>
            <input type="text" id="editorSlugInput" class="editor-text" value="${escapeAttr(p.slug)}" placeholder="auto-generated-from-title">
            <div class="muted" style="font-size:11px;margin-top:4px">controlledconvergence.com/blog/<span id="slugPreview">${escapeHtml(p.slug || '…')}</span></div>
          </div>

          <div class="side-section">
            <label class="editor-label">Excerpt</label>
            <textarea id="editorExcerptInput" class="editor-text" rows="3" placeholder="One-sentence preview shown on the blog index.">${escapeHtml(p.excerpt || '')}</textarea>
          </div>

          <div class="side-section">
            <label class="editor-label">Tags</label>
            <div id="editorTagsContainer" class="tag-input-row"></div>
            <input type="text" id="editorTagInput" class="editor-text" placeholder="Type a tag and press Enter">
          </div>

          <div class="side-section">
            <label class="editor-label">Status</label>
            <div class="muted" id="editorStatusDisplay">${escapeHtml(p.status)}</div>
            ${p.published_at ? '<div class="muted" style="font-size:11px;margin-top:2px">Published ' + formatDate(p.published_at) + '</div>' : ''}
          </div>

          <div class="side-section">
            <label class="checkbox-row">
              <input type="checkbox" id="editorEvergreenInput" ${p.evergreen ? 'checked' : ''}>
              <span>Evergreen</span>
            </label>
            <div class="muted" style="font-size:11px;margin-top:4px">Mark posts that can be re-promoted later.</div>
          </div>
        </aside>
      </div>
    `;

    // Wire navigation
    document.getElementById('blogBackBtn').addEventListener('click', backToList);

    // Initialize Quill — must run after the container is in the DOM
    initQuill(p.content || '');

    // Wire form fields
    wireField('editorTitleInput', function (v) {
      _currentPost.title = v;
      document.getElementById('editorTitle').textContent = v || 'New post';
      // Auto-generate slug from title only if slug is empty or matches the
      // previously-derived slug (so we don't clobber a manually-edited slug).
      const slugInput = document.getElementById('editorSlugInput');
      const prev = _currentPost.slug || '';
      const derivedFromOld = slugify(_currentPost._lastDerivedTitle || '');
      if (!prev || prev === derivedFromOld) {
        const newSlug = slugify(v);
        slugInput.value = newSlug;
        _currentPost.slug = newSlug;
        document.getElementById('slugPreview').textContent = newSlug || '…';
      }
      _currentPost._lastDerivedTitle = v;
      markDirty();
    });

    wireField('editorSlugInput', function (v) {
      _currentPost.slug = slugify(v); // normalize on every keystroke
      document.getElementById('editorSlugInput').value = _currentPost.slug;
      document.getElementById('slugPreview').textContent = _currentPost.slug || '…';
      markDirty();
    });

    wireField('editorExcerptInput', function (v) {
      _currentPost.excerpt = v;
      markDirty();
    });

    document.getElementById('editorEvergreenInput').addEventListener('change', function (e) {
      _currentPost.evergreen = e.target.checked;
      markDirty();
    });

    initTagsInput();

    document.getElementById('blogSaveDraftBtn').addEventListener('click', function () { savePost('draft'); });
    document.getElementById('blogPublishBtn').addEventListener('click', function () { savePost('published'); });

    // Start autosave timer
    startAutosave();
  }

  function backToList() {
    if (_isDirty) {
      if (!confirm('You have unsaved changes. Leave anyway?')) return;
    }
    stopAutosave();
    _view = 'list';
    _currentPostId = null;
    _currentPost = null;
    _isDirty = false;
    renderList(document.getElementById('pane-blog'));
  }

  function wireField(id, onInput) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', function () { onInput(el.value); });
  }

  // ── Quill ────────────────────────────────────────────────────
  function initQuill(initialHtml) {
    if (typeof Quill === 'undefined') {
      document.getElementById('editorQuill').innerHTML =
        '<div class="muted">Editor unavailable — Quill failed to load.</div>';
      return;
    }
    const toolbarOptions = [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      ['clean']
    ];
    _quill = new Quill('#editorQuill', {
      theme: 'snow',
      modules: {
        toolbar: {
          container: toolbarOptions,
          handlers: { image: imageUploadHandler }
        }
      },
      placeholder: 'Write your post…'
    });
    if (initialHtml) {
      _quill.root.innerHTML = initialHtml;
    }
    _quill.on('text-change', function () {
      _currentPost.content = _quill.root.innerHTML;
      markDirty();
    });
  }

  // Inline-image upload constraints. Editor inserts images into post body, so
  // 1600px wide is plenty (article column is 720px → 2x retina = 1440px).
  const IMG_MAX_WIDTH   = 1600;
  const IMG_QUALITY     = 0.80;     // JPEG/WebP quality (0–1)
  const IMG_OUTPUT_TYPE = 'image/webp'; // browsers without WebP encode fall back to JPEG below

  function imageUploadHandler() {
    // Triggered when the user clicks the toolbar image button. We bypass
    // Quill's default URL prompt and open a file picker, compress + resize
    // the file in the browser BEFORE upload (saves Supabase egress and
    // Netlify bandwidth on every reader), then insert the public URL.
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async function () {
      const file = input.files && input.files[0];
      if (!file) return;
      try {
        setAutosaveStatus('Compressing image…');
        const optimized = await compressImageForUpload(file);
        if (optimized.savedBytes > 0) {
          setAutosaveStatus('Uploading (saved ' + formatBytes(optimized.savedBytes) + ')…');
        } else {
          setAutosaveStatus('Uploading image…');
        }
        const url = await uploadImageToStorage(optimized.blob, optimized.ext);
        const range = _quill.getSelection(true);
        _quill.insertEmbed(range.index, 'image', url, 'user');
        _quill.setSelection(range.index + 1);
        markDirty();
        setAutosaveStatus('Image inserted');
      } catch (e) {
        console.error('[admin-blog] image upload failed:', e);
        alert('Image upload failed: ' + (e.message || e));
        setAutosaveStatus('');
      }
    };
    input.click();
  }

  // Resize + re-encode a user-selected image entirely in the browser.
  // Returns { blob, ext, savedBytes }. Falls back to JPEG when WebP encoding
  // isn't available (older Safari). Skips work entirely if the source file
  // is already small enough — that path returns the original file untouched.
  async function compressImageForUpload(file) {
    // SVG and GIF aren't sensibly re-encoded; pass through.
    if (/^image\/(svg\+xml|gif)$/i.test(file.type)) {
      return { blob: file, ext: extFromName(file.name) || 'png', savedBytes: 0 };
    }

    // Tiny files (under 200 KB) generally aren't worth re-encoding.
    if (file.size < 200 * 1024) {
      return { blob: file, ext: extFromName(file.name) || 'png', savedBytes: 0 };
    }

    const dataUrl = await readFileAsDataURL(file);
    const img = await loadImage(dataUrl);

    // Scale down only — never up. Max width IMG_MAX_WIDTH; preserve aspect ratio.
    let targetW = img.naturalWidth;
    let targetH = img.naturalHeight;
    if (targetW > IMG_MAX_WIDTH) {
      const scale = IMG_MAX_WIDTH / targetW;
      targetW = IMG_MAX_WIDTH;
      targetH = Math.round(img.naturalHeight * scale);
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, targetW, targetH);

    // Try WebP first; fall back to JPEG if the browser can't encode WebP
    // (toBlob returns null in that case on some older Safari builds).
    let blob = await canvasToBlob(canvas, IMG_OUTPUT_TYPE, IMG_QUALITY);
    let ext = 'webp';
    if (!blob) {
      blob = await canvasToBlob(canvas, 'image/jpeg', IMG_QUALITY);
      ext = 'jpg';
    }
    if (!blob) {
      // Last-resort: upload the original
      return { blob: file, ext: extFromName(file.name) || 'png', savedBytes: 0 };
    }

    const savedBytes = Math.max(0, file.size - blob.size);
    return { blob: blob, ext: ext, savedBytes: savedBytes };
  }

  function readFileAsDataURL(file) {
    return new Promise(function (resolve, reject) {
      const fr = new FileReader();
      fr.onload  = function () { resolve(fr.result); };
      fr.onerror = function () { reject(fr.error || new Error('FileReader failed')); };
      fr.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload  = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Image failed to load')); };
      img.src = src;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise(function (resolve) {
      try { canvas.toBlob(function (b) { resolve(b); }, type, quality); }
      catch (e) { resolve(null); }
    });
  }

  function extFromName(name) {
    const m = String(name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return m ? m[1].replace(/[^a-z0-9]/g, '') : '';
  }

  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return Math.round(n / 1024) + ' KB';
    return (n / 1024 / 1024).toFixed(1) + ' MB';
  }

  async function uploadImageToStorage(blob, ext) {
    // Path convention: blog/<timestamp>-<random>.<ext>
    // Random suffix avoids collisions if two uploads happen in the same ms.
    const safeExt = (ext || 'webp').replace(/[^a-z0-9]/g, '') || 'webp';
    const path = 'blog/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + safeExt;
    const contentType = blob.type || ('image/' + (safeExt === 'jpg' ? 'jpeg' : safeExt));

    const { error: upErr } = await _supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, blob, { contentType: contentType, upsert: false });
    if (upErr) throw upErr;

    const { data } = _supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    if (!data || !data.publicUrl) throw new Error('No public URL returned');
    return data.publicUrl;
  }

  // ── Tags pill input ──────────────────────────────────────────
  function initTagsInput() {
    const container = document.getElementById('editorTagsContainer');
    const input = document.getElementById('editorTagInput');
    if (!container || !input) return;

    function render() {
      container.innerHTML = (_currentPost.tags || []).map(function (t, i) {
        return '<span class="tag-pill" data-i="' + i + '">' +
               escapeHtml(t) +
               ' <button class="tag-pill-x" data-i="' + i + '" aria-label="Remove">×</button>' +
               '</span>';
      }).join('');
      container.querySelectorAll('.tag-pill-x').forEach(function (b) {
        b.addEventListener('click', function () {
          const i = parseInt(b.getAttribute('data-i'), 10);
          _currentPost.tags.splice(i, 1);
          markDirty();
          render();
        });
      });
    }
    render();

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const v = input.value.trim().toLowerCase();
        if (v && (_currentPost.tags || []).indexOf(v) === -1) {
          _currentPost.tags = (_currentPost.tags || []).concat(v);
          markDirty();
          render();
        }
        input.value = '';
      } else if (e.key === 'Backspace' && !input.value && (_currentPost.tags || []).length) {
        // Backspace on empty input pops the last tag (familiar pattern)
        _currentPost.tags.pop();
        markDirty();
        render();
      }
    });
  }

  // ── Save / publish ───────────────────────────────────────────
  async function savePost(targetStatus) {
    if (!validateBeforeSave()) return;

    setAutosaveStatus('Saving…');

    const payload = {
      title:     _currentPost.title || '',
      slug:      _currentPost.slug,
      excerpt:   _currentPost.excerpt || null,
      content:   _currentPost.content || '',
      tags:      _currentPost.tags || [],
      status:    targetStatus,
      evergreen: !!_currentPost.evergreen
    };

    // Set published_at on first publish (don't overwrite on subsequent updates)
    const wasUnpublished = !_currentPost.published_at;
    if (targetStatus === 'published' && wasUnpublished) {
      payload.published_at = new Date().toISOString();
    }

    let result;
    if (_currentPostId) {
      // Update existing
      result = await _supabase
        .from('blog_posts')
        .update(payload)
        .eq('id', _currentPostId)
        .select()
        .single();
    } else {
      // Insert new
      payload.author_id = appState && appState.currentUser ? appState.currentUser.id : null;
      result = await _supabase
        .from('blog_posts')
        .insert(payload)
        .select()
        .single();
    }

    if (result.error) {
      setAutosaveStatus('');
      alert('Save failed: ' + result.error.message);
      return;
    }

    const isFirstPublish = targetStatus === 'published' && wasUnpublished;
    _currentPostId = result.data.id;
    _currentPost = result.data;
    _isDirty = false;
    setAutosaveStatus('Saved ' + new Date().toLocaleTimeString());

    if (typeof trackEvent === 'function') {
      trackEvent(targetStatus === 'published' ? 'blog_post_published' : 'blog_post_saved', {
        post_id: _currentPostId,
        slug: _currentPost.slug
      });
    }

    // First publish → auto-create Campaign v1
    if (isFirstPublish) {
      await ensureCampaignV1(_currentPostId);
    }

    // Refresh editor header (status display, button label)
    document.getElementById('editorStatusDisplay').textContent = _currentPost.status;
    document.getElementById('blogPublishBtn').textContent = _currentPost.status === 'published' ? 'Update' : 'Publish';
  }

  function validateBeforeSave() {
    if (!_currentPost.title || !_currentPost.title.trim()) {
      alert('Title is required.');
      return false;
    }
    if (!_currentPost.slug || !_currentPost.slug.trim()) {
      alert('Slug is required.');
      return false;
    }
    if (!/^[a-z0-9-]+$/.test(_currentPost.slug)) {
      alert('Slug must contain only lowercase letters, numbers, and hyphens.');
      return false;
    }
    return true;
  }

  // ── Campaigns: auto-create v1 on first publish ───────────────
  async function ensureCampaignV1(postId) {
    // Check if a campaign already exists (e.g. created by an earlier publish
    // that errored partway through). If so, skip.
    const { data: existing } = await _supabase
      .from('campaigns')
      .select('id')
      .eq('blog_post_id', postId)
      .limit(1);
    if (existing && existing.length > 0) return;

    const { error } = await _supabase
      .from('campaigns')
      .insert({
        blog_post_id: postId,
        version: 1,
        label: 'Original launch',
        status: 'active',
        launched_at: new Date().toISOString()
      });
    if (error) {
      console.warn('[admin-blog] campaign v1 insert failed:', error.message);
      return;
    }
    if (typeof trackEvent === 'function') {
      trackEvent('campaign_created', { post_id: postId, version: 1 });
    }
  }

  // ── Autosave ─────────────────────────────────────────────────
  function startAutosave() {
    stopAutosave();
    _autosaveTimer = setInterval(function () {
      if (_isDirty && _currentPost && _currentPost.title && _currentPost.slug) {
        // Quietly save as draft (or keep current status if already published —
        // we don't promote to published from autosave; that's an explicit action).
        const target = _currentPost.status === 'published' ? 'published' : 'draft';
        savePost(target);
      }
    }, AUTOSAVE_INTERVAL_MS);
  }
  function stopAutosave() {
    if (_autosaveTimer) clearInterval(_autosaveTimer);
    _autosaveTimer = null;
  }

  function markDirty() {
    _isDirty = true;
    setAutosaveStatus('Unsaved changes');
  }

  function setAutosaveStatus(text) {
    const el = document.getElementById('autosaveStatus');
    if (el) el.textContent = text || '';
  }

  // ── Helpers ──────────────────────────────────────────────────
  function slugify(s) {
    return String(s || '')
      .toLowerCase()
      .trim()
      .replace(/['"`]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function escapeAttr(s) { return escapeHtml(s); }

  function formatDate(iso) {
    if (!iso) return '';
    try {
      const d = new Date(iso);
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return iso; }
  }
})();
