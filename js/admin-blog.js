// ============================================================
// admin-blog.js — Blog post list + editor (Stage 1 of Chunk 3)
//
// Admin-only. Loaded by app.html into the in-app admin route
// (#admin/blog). Responsible for:
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
// Dependencies (already loaded by app.html):
//   _supabase    — from js/config.js
//   trackEvent   — from js/analytics.js
//   appState     — from js/state.js (hydrated by app.js admin gate)
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
  let _view = 'list';            // 'list' | 'editor' | 'campaign'

  // Campaign hub state
  let _currentCampaign = null;   // campaign row being viewed (with .blog_post)
  let _editingPieceId = null;    // null when adding; piece id when editing
  let _hubTab = 'pieces';        // 'pieces' | 'schedule'
  let _scheduleView = 'list';    // 'list' | 'week' | 'calendar'
  let _weekAnchor = null;        // Date — Sunday of currently-viewed week
  let _calendarAnchor = null;    // Date — first day of currently-viewed month
  let _hubPieces = [];           // cached pieces for the active campaign (used by schedule views)

  // Sort prefs for the two sections of the blog post list. Each section's date
  // column is independently flippable (click the column header). Defaults to
  // newest-first, which matches the natural "what did I touch most recently"
  // and "what did I publish most recently" reading order.
  let _draftsSort    = { col: 'updated_at',   dir: 'desc' };
  let _publishedSort = { col: 'published_at', dir: 'desc' };

  // Where each platform's composer lives. We open these in a new tab as a
  // jumping-off point — the user pastes their copied content there.
  const PLATFORM_COMPOSE_URLS = {
    linkedin: 'https://www.linkedin.com/feed/',
    email:    'https://app.kit.com/broadcasts',
    youtube:  'https://studio.youtube.com/'
  };

  // UTM convention — must match the build-prompt spec exactly:
  //   linkedin → utm_source=linkedin, utm_medium=social,    utm_content=li-post-{n}
  //   email    → utm_source=email,    utm_medium=newsletter, utm_content=email-{n}
  //   youtube  → utm_source=youtube,  utm_medium=video,     utm_content=yt-video-{n}
  const PIECE_TYPES = {
    linkedin: { label: 'LinkedIn',  source: 'linkedin', medium: 'social',     contentPrefix: 'li-post-',  hasPlatformUrl: true  },
    email:    { label: 'Email',     source: 'email',    medium: 'newsletter', contentPrefix: 'email-',    hasPlatformUrl: false },
    youtube:  { label: 'YouTube',   source: 'youtube',  medium: 'video',      contentPrefix: 'yt-video-', hasPlatformUrl: true  }
  };
  // Origin of the deploy the admin is currently using. Each environment
  // generates self-consistent URLs — preview deploys generate preview URLs
  // that work for testing; production generates production URLs to share.
  function getSiteOrigin() {
    return (typeof window !== 'undefined' && window.location && window.location.origin)
      || 'https://controlledconvergence.com';
  }

  const AUTOSAVE_INTERVAL_MS = 30 * 1000;
  const STORAGE_BUCKET = 'blog-images';

  // ── Public entry point — admin-shell.js calls this whenever the
  // Blog tab is activated (and on initial #admin/blog deep-link).
  window.renderAdminBlog = async function () {
    const root = document.getElementById('pane-blog');
    if (!root) return;

    if (_view === 'editor') {
      renderEditor(root);
    } else if (_view === 'campaign') {
      await renderCampaignHub(root);
    } else {
      await renderList(root);
    }
  };

  // Used by admin-shell.js's refresh button — lets the shell skip
  // re-render while the user is mid-edit so unsaved changes aren't lost.
  window.adminBlogIsEditing = function () {
    return _view === 'editor' || _view === 'campaign';
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

    // Wrap the supabase fetch in try/catch + a hard 10-second timeout so an
    // unexpected hang (auth refresh deadlock, network stall, supabase client
    // wedged after navigation) never leaves the user staring at "Loading
    // posts…" forever. Any failure flips to a visible error + Retry.
    const container = document.getElementById('blogListContainer');
    console.debug('[admin-blog] renderList: starting fetch');
    const fetchStart = Date.now();
    let posts, error;
    try {
      const fetchPromise = _supabase
        .from('blog_posts')
        .select('id, title, slug, status, evergreen, tags, published_at, updated_at, created_at')
        .order('updated_at', { ascending: false });
      const timeoutPromise = new Promise(function (_, reject) {
        setTimeout(function () { reject(new Error('renderList fetch timed out after 10s')); }, 10000);
      });
      const result = await Promise.race([fetchPromise, timeoutPromise]);
      posts = result.data;
      error = result.error;
      console.debug('[admin-blog] renderList: fetch complete in ' + (Date.now() - fetchStart) + 'ms; rows=' + (posts ? posts.length : 0));
    } catch (e) {
      console.error('[admin-blog] renderList threw after ' + (Date.now() - fetchStart) + 'ms:', e);
      container.innerHTML =
        '<div class="muted">Couldn\'t load posts (' + escapeHtml(e.message || 'network error') + '). ' +
        '<button class="btn-link" onclick="window.renderAdminBlog()">Retry</button></div>';
      return;
    }
    if (error) {
      console.warn('[admin-blog] renderList supabase error:', error);
      container.innerHTML =
        '<div class="muted">Failed to load posts: ' + escapeHtml(error.message) + ' ' +
        '<button class="btn-link" onclick="window.renderAdminBlog()">Retry</button></div>';
      return;
    }
    if (!posts || posts.length === 0) {
      container.innerHTML = '<div class="empty-card"><strong>No posts yet.</strong>Click "+ New post" to create your first one.</div>';
      return;
    }

    // Split into Drafts (work in progress) and Published (live).
    // Each section has its own sortable date column, independently flippable.
    const drafts    = posts.filter(function (p) { return p.status === 'draft'; });
    const published = posts.filter(function (p) { return p.status === 'published'; });

    container.innerHTML =
      renderBlogSection('drafts', 'Drafts', drafts, _draftsSort, 'updated_at', 'Updated') +
      renderBlogSection('published', 'Published', published, _publishedSort, 'published_at', 'Published');

    // Row click → open editor
    container.querySelectorAll('.blog-row-link').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        const tr = a.closest('tr');
        if (tr) openExistingPost(tr.getAttribute('data-post-id'));
      });
    });
    // Delete buttons
    container.querySelectorAll('.blog-delete-btn').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        deletePost(btn.getAttribute('data-post-id'));
      });
    });
    // Sortable column header → flip direction (and re-render)
    container.querySelectorAll('.blog-sortable').forEach(function (th) {
      th.addEventListener('click', function () {
        const section = th.getAttribute('data-section');
        const sortDef = section === 'drafts' ? _draftsSort : _publishedSort;
        sortDef.dir = sortDef.dir === 'desc' ? 'asc' : 'desc';
        renderList(document.getElementById('pane-blog'));
      });
    });
  }

  // Render one section (Drafts or Published) of the blog post list. Each
  // section is its own table so columns can vary and the visual separation
  // is unmistakable.
  function renderBlogSection(sectionKey, label, posts, sortDef, dateCol, dateLabel) {
    const sorted = posts.slice().sort(function (a, b) {
      const av = String(a[sortDef.col] || '');
      const bv = String(b[sortDef.col] || '');
      return sortDef.dir === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv);
    });
    const arrow = sortDef.dir === 'desc' ? '↓' : '↑';

    let html = '<section class="blog-section">';
    html += '<div class="blog-section-header">';
    html += '<h2>' + escapeHtml(label) + ' <span class="blog-section-count">' + sorted.length + '</span></h2>';
    html += '</div>';

    if (sorted.length === 0) {
      html += '<div class="blog-section-empty muted">' +
              (sectionKey === 'drafts'
                ? 'No drafts in progress.'
                : 'Nothing published yet.') +
              '</div>';
      html += '</section>';
      return html;
    }

    html += '<table class="insights-table blog-list-table">';
    html += '<thead><tr>';
    html += '<th>Title</th>';
    html += '<th>Slug</th>';
    html += '<th>Tags</th>';
    html += '<th class="blog-sortable" data-section="' + sectionKey + '" data-col="' + dateCol + '">' +
            escapeHtml(dateLabel) + ' <span class="sort-arrow">' + arrow + '</span></th>';
    html += '<th></th>';
    html += '</tr></thead><tbody>';

    sorted.forEach(function (p) {
      const tags = (p.tags || []).map(escapeHtml).map(function (t) {
        return '<span class="tag-chip">' + t + '</span>';
      }).join(' ');
      html += '<tr data-post-id="' + escapeHtml(p.id) + '">';
      html += '<td><a href="#" class="blog-row-link">' + escapeHtml(p.title || '(untitled)') + '</a>';
      html += p.evergreen ? ' <span class="evergreen-badge" title="Evergreen">★</span>' : '';
      html += '</td>';
      html += '<td><code>' + escapeHtml(p.slug) + '</code></td>';
      html += '<td>' + (tags || '<span class="muted">—</span>') + '</td>';
      html += '<td class="muted">' + (p[dateCol] ? formatDate(p[dateCol]) : '—') + '</td>';
      html += '<td><button class="btn-link blog-delete-btn" data-post-id="' + escapeHtml(p.id) + '">Delete</button></td>';
      html += '</tr>';
    });

    html += '</tbody></table></section>';
    return html;
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
      evergreen: false,
      // Editorial metadata — surfaced in the analytics export so the LLM
      // workflow can analyze patterns. New posts start blank; the editor
      // exposes them in a collapsed side section.
      frameworks: [],
      hook_type: null,
      audience_target: null,
      format: null,
      editorial_notes: null
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

          ${renderEditorialMetadataSection(p)}
        </aside>
      </div>

      <!-- Campaign timeline appears below the editor on saved posts only.
           Filled by renderCampaignTimeline() once the post has an id. -->
      <section class="campaign-timeline-wrap" id="campaignTimelineWrap"></section>
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

    wireEditorialMetadataInputs();

    initTagsInput();

    document.getElementById('blogSaveDraftBtn').addEventListener('click', function () { savePost('draft'); });
    document.getElementById('blogPublishBtn').addEventListener('click', function () { savePost('published'); });

    // Render campaign timeline below the editor (saved posts only)
    if (_currentPostId) {
      renderCampaignTimeline(document.getElementById('campaignTimelineWrap'));
    }

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

  // ── Editorial metadata (frameworks / hook_type / audience / format / notes) ─
  // Powers the analytics export. The vocabularies below match the export
  // schema spec exactly — if you add an option here, also update the
  // analytics-export Netlify function's docs (it tolerates any value, but
  // the LLM workflow assumes the picklist).
  const FRAMEWORK_OPTIONS = [
    { value: 'design-game',      label: 'Design Game' },
    { value: 'readiness-levels', label: 'Readiness Levels' },
    { value: 'other',            label: 'Other' },
    { value: 'none',             label: 'None' }
  ];
  const HOOK_TYPE_OPTIONS = [
    { value: 'story',       label: 'Story' },
    { value: 'question',    label: 'Question' },
    { value: 'contrarian',  label: 'Contrarian' },
    { value: 'framework',   label: 'Framework' },
    { value: 'list',        label: 'List' },
    { value: 'how-to',      label: 'How-to' }
  ];
  const AUDIENCE_OPTIONS = [
    { value: 'engineers', label: 'Engineers' },
    { value: 'educators', label: 'Educators' },
    { value: 'managers',  label: 'Managers' },
    { value: 'mixed',     label: 'Mixed' }
  ];
  const FORMAT_OPTIONS = [
    { value: 'essay',       label: 'Essay' },
    { value: 'tutorial',    label: 'Tutorial' },
    { value: 'case-study',  label: 'Case Study' },
    { value: 'opinion',     label: 'Opinion' },
    { value: 'personal',    label: 'Personal' }
  ];

  // Each editorial-metadata field is rendered as a chip picker:
  // predefined values + a small "or custom" input. The same visual
  // treatment applies regardless of single vs multi-select cardinality —
  // click logic decides whether toggling a chip replaces or augments
  // the underlying field value. Field config below drives both render
  // and click handlers so the two stay in sync.
  const EDITORIAL_FIELDS = [
    { id: 'frameworks',      label: 'Frameworks',      options: FRAMEWORK_OPTIONS, multi: true,  placeholder: 'or custom framework…' },
    { id: 'hook_type',       label: 'Hook type',       options: HOOK_TYPE_OPTIONS, multi: false, placeholder: 'or custom hook type…' },
    { id: 'audience_target', label: 'Audience target', options: AUDIENCE_OPTIONS,  multi: false, placeholder: 'or custom audience…' },
    { id: 'format',          label: 'Format',          options: FORMAT_OPTIONS,    multi: false, placeholder: 'or custom format…' }
  ];

  // Renders a collapsed <details> block in the editor sidebar. We keep it
  // collapsed by default so the writer's eye lands on title/content first;
  // editorial metadata is for after the post is shaped.
  function renderEditorialMetadataSection(p) {
    const pickersHtml = EDITORIAL_FIELDS.map(function (f) {
      return renderChipPicker(f, p[f.id]);
    }).join('');

    return '' +
      '<details class="side-section editorial-metadata">' +
        '<summary style="cursor:pointer;list-style:none;display:flex;align-items:center;justify-content:space-between">' +
          '<span class="editor-label" style="margin:0">Editorial metadata</span>' +
          '<span class="muted" style="font-size:11px">private</span>' +
        '</summary>' +

        '<div style="margin-top:10px">' +
          pickersHtml +
        '</div>' +

        '<label class="editor-label">Editorial notes (private)</label>' +
        '<textarea id="editorEditorialNotes" class="editor-text" rows="3" placeholder="What worked? What\u2019s the angle? Anything to remember.">' +
          escapeHtml(p.editorial_notes || '') +
        '</textarea>' +
      '</details>';
  }

  // Renders one chip picker. Container has data-field attribute so we can
  // re-target it for partial re-renders after the underlying value changes.
  function renderChipPicker(field, currentValue) {
    return '<div class="chip-picker" data-field="' + escapeAttr(field.id) + '">' +
             '<label class="editor-label">' + escapeHtml(field.label) + '</label>' +
             '<div class="chip-row">' + renderChipRow(field, currentValue) + '</div>' +
             '<input type="text" class="chip-add-input" placeholder="' + escapeAttr(field.placeholder) + '">' +
           '</div>';
  }

  // Inner chip row only — separated so we can redraw just the row when a
  // value changes without disturbing the input or label.
  function renderChipRow(field, currentValue) {
    const values = field.multi
      ? (Array.isArray(currentValue) ? currentValue : [])
      : (currentValue ? [currentValue] : []);
    const optionValues = field.options.map(function (o) { return o.value; });

    let html = '';
    field.options.forEach(function (opt) {
      const sel = values.indexOf(opt.value) !== -1;
      html += '<button type="button" class="chip' + (sel ? ' chip-active' : '') + '" data-value="' +
              escapeAttr(opt.value) + '">' + escapeHtml(opt.label) + '</button>';
    });
    // Any stored values that aren't in the predefined options are custom.
    // Render them as active chips with the chip-custom suffix so the user
    // knows clicking removes them.
    values.filter(function (v) { return optionValues.indexOf(v) === -1; }).forEach(function (v) {
      html += '<button type="button" class="chip chip-active chip-custom" data-value="' +
              escapeAttr(v) + '">' + escapeHtml(v) + '</button>';
    });
    return html;
  }

  function wireEditorialMetadataInputs() {
    EDITORIAL_FIELDS.forEach(function (f) { wireChipPicker(f); });

    const notesEl = document.getElementById('editorEditorialNotes');
    if (notesEl) {
      notesEl.addEventListener('input', function () {
        // Empty string normalizes to null so the schema stays consistent
        // (null = no note, never an empty string).
        _currentPost.editorial_notes = notesEl.value.trim() ? notesEl.value : null;
        markDirty();
      });
    }
  }

  // Event delegation on the picker container — chip clicks toggle the
  // value, Enter on the input adds a custom value. After every change we
  // redraw just the chip row so the visual state matches _currentPost.
  function wireChipPicker(field) {
    const container = document.querySelector('.chip-picker[data-field="' + cssAttr(field.id) + '"]');
    if (!container) return;

    container.addEventListener('click', function (e) {
      const chip = e.target.closest('.chip');
      if (!chip || !container.contains(chip)) return;
      const value = chip.getAttribute('data-value');
      toggleChipValue(field, value);
      redrawChipRow(field, container);
    });

    const input = container.querySelector('.chip-add-input');
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const v = input.value.trim();
        if (!v) return;
        addChipValue(field, v);
        input.value = '';
        redrawChipRow(field, container);
      });
    }
  }

  // Single-select: clicking the active value clears it; clicking another
  // replaces it. Multi-select: clicking toggles in/out of the array.
  function toggleChipValue(field, value) {
    if (field.multi) {
      const arr = Array.isArray(_currentPost[field.id]) ? _currentPost[field.id].slice() : [];
      const idx = arr.indexOf(value);
      if (idx === -1) arr.push(value);
      else arr.splice(idx, 1);
      _currentPost[field.id] = arr;
    } else {
      _currentPost[field.id] = (_currentPost[field.id] === value) ? null : value;
    }
    markDirty();
  }

  // Used by the Enter-on-input path. Custom values feel additive even on
  // single-select fields (typing replaces the current value).
  function addChipValue(field, value) {
    if (field.multi) {
      const arr = Array.isArray(_currentPost[field.id]) ? _currentPost[field.id].slice() : [];
      if (arr.indexOf(value) === -1) arr.push(value);
      _currentPost[field.id] = arr;
    } else {
      _currentPost[field.id] = value;
    }
    markDirty();
  }

  function redrawChipRow(field, container) {
    const row = container.querySelector('.chip-row');
    if (!row) return;
    row.innerHTML = renderChipRow(field, _currentPost[field.id]);
  }

  // Escape a value for use inside a CSS attribute selector. Field IDs
  // are alphanumeric + underscore today, but this future-proofs the
  // [data-field="..."] lookup against richer field names.
  function cssAttr(s) {
    return String(s).replace(/[^a-zA-Z0-9_-]/g, function (ch) { return '\\' + ch; });
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
      title:           _currentPost.title || '',
      slug:            _currentPost.slug,
      excerpt:         _currentPost.excerpt || null,
      content:         _currentPost.content || '',
      tags:            _currentPost.tags || [],
      status:          targetStatus,
      evergreen:       !!_currentPost.evergreen,
      // Editorial metadata — null/[] when blank so the analytics export
      // emits a stable schema. Blank values are intentional, not errors.
      frameworks:      Array.isArray(_currentPost.frameworks) ? _currentPost.frameworks : [],
      hook_type:       _currentPost.hook_type       || null,
      audience_target: _currentPost.audience_target || null,
      format:          _currentPost.format          || null,
      editorial_notes: _currentPost.editorial_notes || null
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

  // ── Campaign timeline (renders below the editor) ─────────────
  async function renderCampaignTimeline(container) {
    if (!container || !_currentPostId) return;

    container.innerHTML = '<div class="muted">Loading campaigns…</div>';

    const { data: campaigns, error } = await _supabase
      .from('campaigns')
      .select('id, version, label, hook_angle, status, launched_at, created_at')
      .eq('blog_post_id', _currentPostId)
      .order('version', { ascending: true });

    if (error) {
      container.innerHTML = '<div class="muted">Couldn\'t load campaigns: ' + escapeHtml(error.message) + '</div>';
      return;
    }

    let html = '<div class="campaign-timeline-header">';
    html += '<h2>Campaigns</h2>';
    if (_currentPost && _currentPost.status === 'published') {
      html += '<button class="btn-secondary" id="repromoteBtn">+ Re-promote</button>';
    } else {
      html += '<span class="muted">Publish the post to start your first campaign.</span>';
    }
    html += '</div>';

    if (!campaigns || campaigns.length === 0) {
      html += '<div class="empty-card"><strong>No campaigns yet.</strong>' +
              (_currentPost && _currentPost.status === 'published'
                ? 'Click + Re-promote to add one, or publish-update the post to bootstrap v1.'
                : 'Publish the post to bootstrap Campaign 1.') +
              '</div>';
    } else {
      html += '<div class="campaign-list">';
      campaigns.forEach(function (c) {
        html += renderCampaignTile(c);
      });
      html += '</div>';
    }

    container.innerHTML = html;

    // Wire tile clicks → open hub
    container.querySelectorAll('.campaign-tile').forEach(function (el) {
      el.addEventListener('click', function () {
        openCampaign(el.getAttribute('data-campaign-id'));
      });
    });

    const repBtn = document.getElementById('repromoteBtn');
    if (repBtn) repBtn.addEventListener('click', function () { repromoteCampaign(campaigns); });
  }

  function renderCampaignTile(c) {
    const launched = c.launched_at ? formatDate(c.launched_at) : 'Not launched';
    return '' +
      '<div class="campaign-tile" data-campaign-id="' + escapeHtml(c.id) + '">' +
        '<div class="campaign-tile-header">' +
          '<span class="campaign-version">Campaign ' + c.version + '</span>' +
          '<span class="status-pill status-' + escapeHtml(c.status) + '">' + escapeHtml(c.status) + '</span>' +
        '</div>' +
        '<div class="campaign-label">' + escapeHtml(c.label || '(untitled)') + '</div>' +
        (c.hook_angle ? '<div class="campaign-hook muted">' + escapeHtml(c.hook_angle) + '</div>' : '') +
        '<div class="campaign-meta muted">' + escapeHtml(launched) + '</div>' +
      '</div>';
  }

  async function repromoteCampaign(existingCampaigns) {
    const nextVersion = (existingCampaigns && existingCampaigns.length)
      ? Math.max.apply(null, existingCampaigns.map(function (c) { return c.version || 1; })) + 1
      : 2;

    const label = window.prompt(
      'Label for Campaign v' + nextVersion + ' (e.g. "6-month re-promotion"):',
      nextVersion + '-month re-promotion'
    );
    if (label === null) return;

    const hookAngle = window.prompt(
      'New hook angle for this re-promotion (optional — what\'s the fresh take?):',
      ''
    );
    if (hookAngle === null) return;

    const { data, error } = await _supabase
      .from('campaigns')
      .insert({
        blog_post_id: _currentPostId,
        version: nextVersion,
        label: label.trim() || ('Re-promotion v' + nextVersion),
        hook_angle: hookAngle.trim() || null,
        status: 'planning',
        launched_at: null
      })
      .select()
      .single();

    if (error) {
      alert('Couldn\'t create campaign: ' + error.message);
      return;
    }

    if (typeof trackEvent === 'function') {
      trackEvent('campaign_created', { post_id: _currentPostId, version: nextVersion });
    }

    // Refresh the timeline so the new campaign tile appears. We deliberately
    // DON'T auto-open the hub — a re-promotion doesn't require immediate
    // attention to the LinkedIn/email/YouTube content. The user clicks into
    // the new tile when they're ready to start writing pieces.
    await renderCampaignTimeline(document.getElementById('campaignTimelineWrap'));
  }

  // ── Content hub (per campaign) ───────────────────────────────
  async function openCampaign(campaignId) {
    const { data: campaign, error } = await _supabase
      .from('campaigns')
      .select('id, version, label, hook_angle, status, launched_at, blog_post_id, blog_posts(id, title, slug)')
      .eq('id', campaignId)
      .single();
    if (error || !campaign) {
      alert('Couldn\'t load campaign: ' + (error ? error.message : 'not found'));
      return;
    }
    // Normalize the joined post field — Supabase nests it under blog_posts
    campaign.post = campaign.blog_posts;
    _currentCampaign = campaign;
    _editingPieceId = null;
    _view = 'campaign';
    stopAutosave();
    renderAdminBlog();
  }

  function backToEditor() {
    _view = 'editor';
    _currentCampaign = null;
    _editingPieceId = null;
    renderAdminBlog();
  }

  async function renderCampaignHub(root) {
    if (!_currentCampaign) {
      // Defensive — if state was lost, fall back to list view
      _view = 'list';
      await renderList(root);
      return;
    }
    const c = _currentCampaign;
    const post = c.post || {};

    root.innerHTML = `
      <div class="blog-header">
        <div>
          <button class="btn-link" id="hubBackBtn">← Back to "${escapeHtml(post.title || '')}"</button>
          <h1>Campaign ${c.version} — ${escapeHtml(c.label || '')}</h1>
          ${c.hook_angle ? '<p class="pane-sub">Hook: ' + escapeHtml(c.hook_angle) + '</p>' : ''}
        </div>
        <div class="editor-actions">
          <label class="muted" style="margin-right:6px">Status</label>
          <select id="campaignStatusSelect" class="editor-text" style="width:auto">
            <option value="planning"${c.status === 'planning' ? ' selected' : ''}>Planning</option>
            <option value="active"${c.status === 'active' ? ' selected' : ''}>Active</option>
            <option value="complete"${c.status === 'complete' ? ' selected' : ''}>Complete</option>
          </select>
        </div>
      </div>

      <!-- Sub-tabs: Pieces (the per-channel columns) vs Schedule (timeline views) -->
      <div class="hub-subnav">
        <button class="hub-subnav-btn ${_hubTab === 'pieces' ? 'active' : ''}" data-hub-tab="pieces">Pieces</button>
        <button class="hub-subnav-btn ${_hubTab === 'schedule' ? 'active' : ''}" data-hub-tab="schedule">Schedule</button>
      </div>

      <div id="hubBody"></div>
    `;

    document.getElementById('hubBackBtn').addEventListener('click', backToEditor);

    document.getElementById('campaignStatusSelect').addEventListener('change', async function (e) {
      const newStatus = e.target.value;
      const { error } = await _supabase
        .from('campaigns')
        .update({ status: newStatus, launched_at: newStatus === 'active' && !c.launched_at ? new Date().toISOString() : c.launched_at })
        .eq('id', c.id);
      if (error) { alert('Status update failed: ' + error.message); return; }
      _currentCampaign.status = newStatus;
    });

    // Sub-tab clicks
    root.querySelectorAll('.hub-subnav-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        _hubTab = b.getAttribute('data-hub-tab');
        // Toggle active class without re-rendering the header
        root.querySelectorAll('.hub-subnav-btn').forEach(function (x) {
          x.classList.toggle('active', x === b);
        });
        renderHubBody();
      });
    });

    await renderHubBody();
  }

  // Renders whichever sub-tab body the user has selected. Re-fetches pieces
  // each time so the schedule view reflects the latest planned_dates / statuses.
  async function renderHubBody() {
    const body = document.getElementById('hubBody');
    if (!body) return;

    // Always refresh the pieces cache before rendering either sub-tab.
    await loadHubPieces();

    if (_hubTab === 'schedule') {
      renderScheduleView(body);
    } else {
      renderPiecesView(body);
    }
  }

  async function loadHubPieces() {
    if (!_currentCampaign) { _hubPieces = []; return; }
    const { data, error } = await _supabase
      .from('content_pieces')
      .select('*')
      .eq('campaign_id', _currentCampaign.id)
      .order('piece_number', { ascending: true });
    _hubPieces = (!error && data) ? data : [];
  }

  // Pieces sub-tab — the original three-column hub (LinkedIn / Email / YouTube).
  function renderPiecesView(body) {
    body.innerHTML = `
      <div class="hub-columns">
        <div class="hub-column" data-type="linkedin"><h2>LinkedIn</h2><div class="hub-pieces" id="hubPieces-linkedin"></div><button class="btn-secondary hub-add-btn" data-type="linkedin">+ Add LinkedIn post</button></div>
        <div class="hub-column" data-type="email"><h2>Email</h2><div class="hub-pieces" id="hubPieces-email"></div><button class="btn-secondary hub-add-btn" data-type="email">+ Add email</button></div>
        <div class="hub-column" data-type="youtube"><h2>YouTube</h2><div class="hub-pieces" id="hubPieces-youtube"></div><button class="btn-secondary hub-add-btn" data-type="youtube">+ Add video</button></div>
      </div>
    `;

    body.querySelectorAll('.hub-add-btn').forEach(function (b) {
      b.addEventListener('click', function () { openPieceForm(b.getAttribute('data-type'), null); });
    });

    // Group cached pieces by type, render into each column
    const byType = { linkedin: [], email: [], youtube: [] };
    _hubPieces.forEach(function (p) { if (byType[p.type]) byType[p.type].push(p); });
    Object.keys(byType).forEach(function (t) {
      const el = document.getElementById('hubPieces-' + t);
      if (!el) return;
      if (byType[t].length === 0) {
        el.innerHTML = '<div class="muted hub-empty">No pieces yet.</div>';
      } else {
        el.innerHTML = byType[t].map(renderPieceCard).join('');
        wirePieceCardEvents(el);
      }
    });
  }

  // Re-renders the active sub-tab (Pieces or Schedule). Both views read from
  // the same _hubPieces cache, which renderHubBody refreshes from Supabase.
  async function loadAndRenderPieces() {
    if (!_currentCampaign) return;
    await renderHubBody();
  }

  // ── Schedule view (List / Week / Calendar) ───────────────────
  function renderScheduleView(body) {
    body.innerHTML = `
      <div class="schedule-subnav">
        <button class="schedule-view-btn ${_scheduleView === 'list' ? 'active' : ''}" data-view="list">List</button>
        <button class="schedule-view-btn ${_scheduleView === 'week' ? 'active' : ''}" data-view="week">Week</button>
        <button class="schedule-view-btn ${_scheduleView === 'calendar' ? 'active' : ''}" data-view="calendar">Calendar</button>
      </div>

      <!-- Color-key legend so the badge/status meanings are always visible. -->
      <div class="schedule-legend">
        <span class="legend-label">Channels:</span>
        <span class="piece-badge piece-badge-linkedin">LinkedIn</span>
        <span class="piece-badge piece-badge-email">Email</span>
        <span class="piece-badge piece-badge-youtube">YouTube</span>
        <span class="legend-divider"></span>
        <span class="legend-label">Status:</span>
        <span class="status-pill status-draft">draft</span>
        <span class="status-pill status-ready">ready</span>
        <span class="status-pill status-scheduled">scheduled</span>
        <span class="status-pill status-published">published</span>
        <span class="legend-divider"></span>
        <span class="past-due-badge">Past due</span>
        <span class="legend-prime-swatch">Prime slot</span>
      </div>

      <div id="scheduleBody"></div>
    `;
    body.querySelectorAll('.schedule-view-btn').forEach(function (b) {
      b.addEventListener('click', function () {
        _scheduleView = b.getAttribute('data-view');
        body.querySelectorAll('.schedule-view-btn').forEach(function (x) {
          x.classList.toggle('active', x === b);
        });
        renderScheduleBody();
      });
    });
    renderScheduleBody();
  }

  function renderScheduleBody() {
    const target = document.getElementById('scheduleBody');
    if (!target) return;
    if (_scheduleView === 'week')          renderWeekScheduleView(target);
    else if (_scheduleView === 'calendar') renderCalendarScheduleStub(target);
    else                                   renderListScheduleView(target);
  }

  // ── List view ────────────────────────────────────────────────
  // Chronological across all types. Past-due unpublished items get amber row
  // highlight. Pieces with no planned_date sink to bottom in a separate group.
  function renderListScheduleView(target) {
    const dated = _hubPieces.filter(function (p) { return !!p.planned_date; })
      .slice()
      .sort(function (a, b) { return (a.planned_date || '').localeCompare(b.planned_date || ''); });
    const undated = _hubPieces.filter(function (p) { return !p.planned_date; });

    if (dated.length === 0 && undated.length === 0) {
      target.innerHTML = '<div class="empty-card"><strong>No pieces yet.</strong>Add a LinkedIn / Email / YouTube piece in the Pieces tab to see it on the schedule.</div>';
      return;
    }

    const todayIso = isoDate(new Date());

    let html = '<table class="insights-table schedule-list-table"><thead><tr>';
    html += '<th>Date</th><th>Type</th><th>Title</th><th>Status</th><th></th>';
    html += '</tr></thead><tbody>';

    dated.forEach(function (p) {
      const pastDue = p.planned_date < todayIso && p.status !== 'published';
      html += renderScheduleRow(p, { pastDue: pastDue });
    });

    if (undated.length > 0) {
      html += '<tr><td colspan="5" class="schedule-section-divider muted">Unscheduled</td></tr>';
      undated.forEach(function (p) {
        html += renderScheduleRow(p, { pastDue: false, unscheduled: true });
      });
    }

    html += '</tbody></table>';
    target.innerHTML = html;
    wireScheduleActions(target);
  }

  function renderScheduleRow(p, opts) {
    const titleField = p.type === 'email' ? (p.subject || p.title || '(untitled)') : (p.title || '(untitled)');
    const dateLabel  = p.planned_date ? formatDate(p.planned_date) : '—';
    const cls = opts && opts.pastDue ? 'schedule-row past-due' : 'schedule-row';
    return '' +
      '<tr class="' + cls + '" data-piece-id="' + escapeHtml(p.id) + '" data-piece-type="' + escapeHtml(p.type) + '">' +
        '<td>' + escapeHtml(dateLabel) + (opts && opts.pastDue ? ' <span class="past-due-badge">Past due</span>' : '') + '</td>' +
        '<td><span class="piece-badge piece-badge-' + escapeHtml(p.type) + '">' + escapeHtml(PIECE_TYPES[p.type].label) + ' #' + (p.piece_number || 1) + '</span></td>' +
        '<td>' + escapeHtml(titleField) + '</td>' +
        '<td><span class="status-pill status-' + escapeHtml(p.status) + '">' + escapeHtml(p.status) + '</span></td>' +
        '<td><button class="btn-link schedule-edit-btn">Open</button></td>' +
      '</tr>';
  }

  function wireScheduleActions(target) {
    target.querySelectorAll('.schedule-edit-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const tr = btn.closest('tr');
        openPieceForm(tr.getAttribute('data-piece-type'), tr.getAttribute('data-piece-id'));
      });
    });
  }

  // ── Week view ────────────────────────────────────────────────
  // Sunday-start grid of the currently-anchored week. Tuesday and Thursday
  // are tinted as "prime slots" (data-backed nudge — Tuesday morning and
  // Thursday afternoon are when LinkedIn engagement is historically highest;
  // we don't lock you to those days, just suggest them).
  function renderWeekScheduleView(target) {
    if (!_weekAnchor) _weekAnchor = startOfWeek(new Date());
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(_weekAnchor);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    const todayIso = isoDate(new Date());
    const piecesByDay = {};
    days.forEach(function (d) { piecesByDay[isoDate(d)] = []; });
    _hubPieces.forEach(function (p) {
      if (p.planned_date && piecesByDay[p.planned_date] !== undefined) {
        piecesByDay[p.planned_date].push(p);
      }
    });
    const undated = _hubPieces.filter(function (p) { return !p.planned_date; });

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const PRIME_SLOTS = { 2: 'AM', 4: 'PM' }; // Tuesday morning, Thursday afternoon

    let html = '<div class="schedule-week-nav">';
    html += '<button class="btn-secondary" id="weekPrevBtn">← Prev</button>';
    html += '<div class="schedule-week-label">' + escapeHtml(formatWeekRange(days[0], days[6])) + '</div>';
    html += '<button class="btn-secondary" id="weekNextBtn">Next →</button>';
    html += '<button class="btn-link" id="weekTodayBtn" style="margin-left:auto">Today</button>';
    html += '</div>';

    html += '<div class="schedule-week-grid">';
    days.forEach(function (d, idx) {
      const iso = isoDate(d);
      const isToday  = iso === todayIso;
      const primeSlot = PRIME_SLOTS[d.getDay()];
      const cls = ['schedule-day'];
      if (isToday) cls.push('is-today');
      if (primeSlot) cls.push('is-prime');

      html += '<div class="' + cls.join(' ') + '">';
      html += '<div class="schedule-day-header">';
      html += '<span class="schedule-day-name">' + dayLabels[d.getDay()] + '</span>';
      html += '<span class="schedule-day-date">' + d.getDate() + '</span>';
      html += '</div>';
      if (primeSlot) {
        html += '<div class="schedule-prime-label">Prime: ' + primeSlot + '</div>';
      }
      html += '<div class="schedule-day-pieces">';
      if (piecesByDay[iso].length === 0) {
        html += '<div class="schedule-day-empty muted">—</div>';
      } else {
        piecesByDay[iso].forEach(function (p) {
          const titleField = p.type === 'email' ? (p.subject || p.title || '(untitled)') : (p.title || '(untitled)');
          const isPastDue = iso < todayIso && p.status !== 'published';
          html += '<div class="schedule-week-piece ' + (isPastDue ? 'past-due' : '') + '" data-piece-id="' + escapeHtml(p.id) + '" data-piece-type="' + escapeHtml(p.type) + '">';
          html += '<span class="piece-badge piece-badge-' + escapeHtml(p.type) + '">' + escapeHtml(PIECE_TYPES[p.type].label) + ' #' + (p.piece_number || 1) + '</span>';
          html += '<div class="schedule-week-piece-title">' + escapeHtml(titleField) + '</div>';
          html += '<span class="status-pill status-' + escapeHtml(p.status) + '">' + escapeHtml(p.status) + '</span>';
          html += '</div>';
        });
      }
      html += '</div></div>';
    });
    html += '</div>';

    if (undated.length > 0) {
      html += '<div class="schedule-unscheduled-section">';
      html += '<h3>Unscheduled (' + undated.length + ')</h3>';
      html += '<div class="schedule-unscheduled-list">';
      undated.forEach(function (p) {
        const titleField = p.type === 'email' ? (p.subject || p.title || '(untitled)') : (p.title || '(untitled)');
        html += '<div class="schedule-week-piece" data-piece-id="' + escapeHtml(p.id) + '" data-piece-type="' + escapeHtml(p.type) + '">';
        html += '<span class="piece-badge piece-badge-' + escapeHtml(p.type) + '">' + escapeHtml(PIECE_TYPES[p.type].label) + ' #' + (p.piece_number || 1) + '</span>';
        html += '<div class="schedule-week-piece-title">' + escapeHtml(titleField) + '</div>';
        html += '<span class="muted">No date set</span>';
        html += '</div>';
      });
      html += '</div></div>';
    }

    target.innerHTML = html;

    document.getElementById('weekPrevBtn').addEventListener('click', function () {
      _weekAnchor = new Date(_weekAnchor); _weekAnchor.setDate(_weekAnchor.getDate() - 7);
      renderScheduleBody();
    });
    document.getElementById('weekNextBtn').addEventListener('click', function () {
      _weekAnchor = new Date(_weekAnchor); _weekAnchor.setDate(_weekAnchor.getDate() + 7);
      renderScheduleBody();
    });
    document.getElementById('weekTodayBtn').addEventListener('click', function () {
      _weekAnchor = startOfWeek(new Date());
      renderScheduleBody();
    });

    // Click-to-open on any week-view piece tile
    target.querySelectorAll('.schedule-week-piece').forEach(function (el) {
      el.addEventListener('click', function () {
        openPieceForm(el.getAttribute('data-piece-type'), el.getAttribute('data-piece-id'));
      });
    });
  }

  // ── Calendar view (month grid) ──────────────────────────────
  // Standard 6-row × 7-column grid (always 6 rows so layout doesn't jump
  // between months with different week counts). Days outside the current
  // month are dimmed; today is accented; pieces appear as small chips.
  function renderCalendarScheduleStub(target) {
    if (!_calendarAnchor) _calendarAnchor = startOfMonth(new Date());

    const monthStart = startOfMonth(_calendarAnchor);
    const monthEnd   = endOfMonth(_calendarAnchor);
    const gridStart  = startOfWeek(monthStart);   // first Sunday on/before the 1st
    const todayIso   = isoDate(new Date());

    // Build 42 day cells starting at gridStart
    const cells = [];
    const cur = new Date(gridStart);
    for (let i = 0; i < 42; i++) {
      cells.push(new Date(cur));
      cur.setDate(cur.getDate() + 1);
    }

    // Bucket pieces by their planned_date for fast lookup
    const piecesByDay = {};
    _hubPieces.forEach(function (p) {
      if (!p.planned_date) return;
      (piecesByDay[p.planned_date] = piecesByDay[p.planned_date] || []).push(p);
    });

    const monthLabel = _calendarAnchor.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let html = '<div class="schedule-cal-nav">';
    html += '<button class="btn-secondary" id="calPrevBtn">← Prev</button>';
    html += '<div class="schedule-cal-label">' + escapeHtml(monthLabel) + '</div>';
    html += '<button class="btn-secondary" id="calNextBtn">Next →</button>';
    html += '<button class="btn-link" id="calTodayBtn" style="margin-left:auto">Today</button>';
    html += '</div>';

    html += '<div class="schedule-cal-grid">';
    dayHeaders.forEach(function (lbl, i) {
      const isPrime = (i === 2 || i === 4); // Tue/Thu prime indicator on header too
      html += '<div class="schedule-cal-header' + (isPrime ? ' is-prime' : '') + '">' + lbl + '</div>';
    });
    cells.forEach(function (d) {
      const iso = isoDate(d);
      const inMonth = d >= monthStart && d <= monthEnd;
      const isToday = iso === todayIso;
      const isPrime = (d.getDay() === 2 || d.getDay() === 4);
      const cls = ['schedule-cal-cell'];
      if (!inMonth) cls.push('out-month');
      if (isToday)  cls.push('is-today');
      if (isPrime && inMonth) cls.push('is-prime');

      html += '<div class="' + cls.join(' ') + '">';
      html += '<div class="schedule-cal-date">' + d.getDate() + '</div>';
      const day = piecesByDay[iso] || [];
      day.forEach(function (p) {
        const titleField = p.type === 'email' ? (p.subject || p.title || '(untitled)') : (p.title || '(untitled)');
        const isPastDue = iso < todayIso && p.status !== 'published';
        html += '<div class="schedule-cal-piece ' + (isPastDue ? 'past-due' : '') + '" ' +
                'data-piece-id="' + escapeHtml(p.id) + '" ' +
                'data-piece-type="' + escapeHtml(p.type) + '" ' +
                'title="' + escapeAttr(titleField) + '">' +
                '<span class="piece-badge piece-badge-' + escapeHtml(p.type) + '">' + escapeHtml(PIECE_TYPES[p.type].label.charAt(0)) + '</span>' +
                '<span class="schedule-cal-piece-title">' + escapeHtml(titleField) + '</span>' +
                '</div>';
      });
      html += '</div>';
    });
    html += '</div>';

    target.innerHTML = html;

    document.getElementById('calPrevBtn').addEventListener('click', function () {
      _calendarAnchor = new Date(_calendarAnchor); _calendarAnchor.setMonth(_calendarAnchor.getMonth() - 1);
      renderScheduleBody();
    });
    document.getElementById('calNextBtn').addEventListener('click', function () {
      _calendarAnchor = new Date(_calendarAnchor); _calendarAnchor.setMonth(_calendarAnchor.getMonth() + 1);
      renderScheduleBody();
    });
    document.getElementById('calTodayBtn').addEventListener('click', function () {
      _calendarAnchor = startOfMonth(new Date());
      renderScheduleBody();
    });

    target.querySelectorAll('.schedule-cal-piece').forEach(function (el) {
      el.addEventListener('click', function () {
        openPieceForm(el.getAttribute('data-piece-type'), el.getAttribute('data-piece-id'));
      });
    });
  }

  function startOfMonth(d) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    x.setDate(1);
    return x;
  }
  function endOfMonth(d) {
    const x = startOfMonth(d);
    x.setMonth(x.getMonth() + 1);
    x.setDate(0);
    return x;
  }

  // ── Date helpers ────────────────────────────────────────────
  function isoDate(d) {
    // YYYY-MM-DD using local time (matches how the date input stores values).
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
  function startOfWeek(d) {
    // Sunday-start (US convention)
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    x.setDate(x.getDate() - x.getDay());
    return x;
  }
  function formatWeekRange(start, end) {
    const sm = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const em = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return sm + ' – ' + em;
  }

  function renderPieceCard(p) {
    const utm = utmUrlForPiece(p);
    const isPublished = p.status === 'published';
    const titleField = p.type === 'email' ? (p.subject || p.title || '(untitled)') : (p.title || '(untitled)');
    const platformLink = p.platform_url
      ? '<a href="' + escapeAttr(p.platform_url) + '" target="_blank" rel="noopener">View on ' + PIECE_TYPES[p.type].label + ' ↗</a>'
      : '';

    return '' +
      '<div class="piece-card" data-piece-id="' + escapeHtml(p.id) + '" data-piece-type="' + escapeHtml(p.type) + '">' +
        '<div class="piece-card-header">' +
          '<span class="piece-badge piece-badge-' + escapeHtml(p.type) + '">' + escapeHtml(PIECE_TYPES[p.type].label) + ' #' + (p.piece_number || 1) + '</span>' +
          '<span class="status-pill status-' + escapeHtml(p.status) + '">' + escapeHtml(p.status) + '</span>' +
        '</div>' +
        '<div class="piece-title">' + escapeHtml(titleField) + '</div>' +
        '<div class="piece-content-preview">' + escapeHtml(p.content || '') + '</div>' +
        (p.planned_date ? '<div class="muted piece-date">Planned: ' + escapeHtml(p.planned_date) + '</div>' : '') +
        '<div class="utm-row">' +
          '<input type="text" class="utm-input" readonly value="' + escapeAttr(utm) + '">' +
          '<button class="btn-secondary utm-copy-btn" data-utm="' + escapeAttr(utm) + '">Copy</button>' +
        '</div>' +
        (p.type === 'youtube'
          ? '<label class="checkbox-row piece-embed-row"><input type="checkbox" class="piece-embed-toggle" ' + (p.embed_in_post ? 'checked' : '') + '><span>Embed in blog post</span></label>'
          : '') +
        '<div class="piece-actions">' +
          '<button class="btn-link piece-edit-btn">Edit</button>' +
          '<button class="btn-link piece-delete-btn">Delete</button>' +
          (isPublished
            ? '<span class="muted">Confirmed ' + (p.confirmed_at ? formatDate(p.confirmed_at) : '') + ' · ' + platformLink + '</span>'
            : '<button class="btn-primary piece-confirm-btn">' + (PIECE_TYPES[p.type].hasPlatformUrl ? 'Mark Published →' : 'Confirm Sent') + '</button>'
          ) +
        '</div>' +
        '<div class="piece-confirm-row" style="display:none">' +
          '<input type="url" class="piece-platform-url-input editor-text" placeholder="Paste the ' + escapeHtml(PIECE_TYPES[p.type].label) + ' URL">' +
          '<button class="btn-primary piece-confirm-save-btn">Confirm</button>' +
          '<button class="btn-link piece-confirm-cancel-btn">Cancel</button>' +
        '</div>' +
      '</div>';
  }

  function wirePieceCardEvents(container) {
    container.querySelectorAll('.utm-copy-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        copyToClipboard(btn.getAttribute('data-utm'));
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = 'Copy'; }, 1200);
      });
    });
    container.querySelectorAll('.piece-edit-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const card = btn.closest('.piece-card');
        openPieceForm(card.getAttribute('data-piece-type'), card.getAttribute('data-piece-id'));
      });
    });
    container.querySelectorAll('.piece-delete-btn').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        const card = btn.closest('.piece-card');
        if (!confirm('Delete this piece?')) return;
        const { error } = await _supabase.from('content_pieces').delete().eq('id', card.getAttribute('data-piece-id'));
        if (error) { alert('Delete failed: ' + error.message); return; }
        await loadAndRenderPieces();
      });
    });
    container.querySelectorAll('.piece-confirm-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const card = btn.closest('.piece-card');
        const type = card.getAttribute('data-piece-type');
        if (PIECE_TYPES[type].hasPlatformUrl) {
          // Expand the inline URL paste row
          card.querySelector('.piece-confirm-row').style.display = 'flex';
          card.querySelector('.piece-platform-url-input').focus();
        } else {
          // Email — confirm immediately
          confirmPiece(card.getAttribute('data-piece-id'), null);
        }
      });
    });
    container.querySelectorAll('.piece-confirm-save-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const card = btn.closest('.piece-card');
        const url = card.querySelector('.piece-platform-url-input').value.trim();
        if (!url) { alert('Paste the platform URL first.'); return; }
        confirmPiece(card.getAttribute('data-piece-id'), url);
      });
    });
    container.querySelectorAll('.piece-confirm-cancel-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const card = btn.closest('.piece-card');
        card.querySelector('.piece-confirm-row').style.display = 'none';
      });
    });
    container.querySelectorAll('.piece-embed-toggle').forEach(function (cb) {
      cb.addEventListener('change', async function () {
        const card = cb.closest('.piece-card');
        const { error } = await _supabase
          .from('content_pieces')
          .update({ embed_in_post: cb.checked })
          .eq('id', card.getAttribute('data-piece-id'));
        if (error) { alert('Update failed: ' + error.message); cb.checked = !cb.checked; }
      });
    });
  }

  async function confirmPiece(pieceId, platformUrl) {
    const update = {
      status: 'published',
      confirmed_at: new Date().toISOString()
    };
    if (platformUrl) update.platform_url = platformUrl;

    const { error } = await _supabase
      .from('content_pieces')
      .update(update)
      .eq('id', pieceId);
    if (error) { alert('Confirm failed: ' + error.message); return; }

    if (typeof trackEvent === 'function') {
      trackEvent('content_piece_confirmed', { piece_id: pieceId, platform_url: platformUrl || null });
    }

    // Auto-flip the campaign from Planning → Active on first confirmed piece.
    // (V1 campaigns start as Active; v2+ start as Planning. The first piece
    // going live is the natural "this campaign is now running" signal.)
    if (_currentCampaign && _currentCampaign.status === 'planning') {
      const launchedAt = _currentCampaign.launched_at || new Date().toISOString();
      const { error: campErr } = await _supabase
        .from('campaigns')
        .update({ status: 'active', launched_at: launchedAt })
        .eq('id', _currentCampaign.id);
      if (!campErr) {
        _currentCampaign.status = 'active';
        _currentCampaign.launched_at = launchedAt;
        // Sync the visible status select if it exists
        const sel = document.getElementById('campaignStatusSelect');
        if (sel) sel.value = 'active';
      }
    }

    await loadAndRenderPieces();
  }

  // ── Piece create / edit form ─────────────────────────────────
  async function openPieceForm(type, pieceId) {
    if (!PIECE_TYPES[type]) return;
    _editingPieceId = pieceId;

    let existing = null;
    if (pieceId) {
      const { data, error } = await _supabase.from('content_pieces').select('*').eq('id', pieceId).single();
      if (error || !data) { alert('Couldn\'t load piece: ' + (error ? error.message : 'not found')); return; }
      existing = data;
    }

    const isEmail = type === 'email';
    const isYouTube = type === 'youtube';
    const titleLabel = isEmail ? 'Subject' : 'Title';
    const titleField = isEmail ? 'subject' : 'title';
    const titleVal   = existing ? (existing[titleField] || '') : '';
    const contentVal = existing ? (existing.content || '') : '';
    const dateVal    = existing && existing.planned_date ? existing.planned_date : '';
    const statusVal  = existing ? existing.status : 'draft';
    const embedVal   = existing ? !!existing.embed_in_post : false;

    // Pre-compute the piece number + UTM URL so the "Post to ..." helper
    // section in the form can show real, paste-ready content for new pieces
    // too — not just edited ones.
    const formPieceNumber = existing ? (existing.piece_number || 1) : await nextPieceNumber(type);
    const formUtmUrl = utmUrlFor(
      _currentCampaign && _currentCampaign.post,
      _currentCampaign,
      { type: type, piece_number: formPieceNumber }
    );
    const platformOpenUrl = PLATFORM_COMPOSE_URLS[type] || '';

    // Render an inline modal-like overlay
    const overlay = document.createElement('div');
    overlay.className = 'piece-form-overlay';
    overlay.innerHTML = `
      <div class="piece-form">
        <div class="piece-form-header">
          <h2>${pieceId ? 'Edit' : 'Add'} ${escapeHtml(PIECE_TYPES[type].label)} ${pieceId ? 'piece' : 'piece'}</h2>
          <button class="btn-link" id="pieceFormCloseBtn">Close</button>
        </div>

        <label class="editor-label">${titleLabel}</label>
        <input type="text" id="pieceTitleInput" class="editor-text" value="${escapeAttr(titleVal)}" placeholder="${escapeAttr(isEmail ? 'Email subject' : (isYouTube ? 'Video title' : 'Hook line'))}">

        <label class="editor-label">${isEmail ? 'Email body' : 'Content'}</label>
        <textarea id="pieceContentInput" class="editor-text" rows="6" placeholder="Write the ${escapeHtml(PIECE_TYPES[type].label).toLowerCase()} content here.">${escapeHtml(contentVal)}</textarea>

        <div class="piece-form-row">
          <div>
            <label class="editor-label">Planned date</label>
            <input type="date" id="pieceDateInput" class="editor-text" value="${escapeAttr(dateVal)}">
          </div>
          ${pieceId ? `
            <div>
              <label class="editor-label">Status</label>
              <select id="pieceStatusInput" class="editor-text">
                <option value="draft"${statusVal === 'draft' ? ' selected' : ''}>Draft</option>
                <option value="ready"${statusVal === 'ready' ? ' selected' : ''}>Ready</option>
                <option value="scheduled"${statusVal === 'scheduled' ? ' selected' : ''}>Scheduled</option>
                <option value="published"${statusVal === 'published' ? ' selected' : ''}>Published</option>
              </select>
            </div>
          ` : ''}
        </div>

        ${isYouTube ? `
          <label class="checkbox-row" style="margin-top:12px">
            <input type="checkbox" id="pieceEmbedInput" ${embedVal ? 'checked' : ''}>
            <span>Embed video in the blog post</span>
          </label>
        ` : ''}

        <!-- Post-to-platform helpers. Manual workflow: write here → copy → paste in
             the platform's composer → publish → come back to confirm. -->
        <div class="post-helper">
          <div class="post-helper-header">
            <h3>Post to ${escapeHtml(PIECE_TYPES[type].label)}</h3>
            ${platformOpenUrl ? '<a href="' + escapeAttr(platformOpenUrl) + '" target="_blank" rel="noopener" class="btn-link">Open ' + escapeHtml(PIECE_TYPES[type].label) + ' →</a>' : ''}
          </div>
          <div class="post-helper-utm">
            <input type="text" readonly class="utm-input" value="${escapeAttr(formUtmUrl)}">
            <button type="button" class="btn-secondary post-copy-btn" data-copy-source="utm">Copy URL</button>
          </div>
          <div class="post-helper-actions">
            <button type="button" class="btn-secondary post-copy-btn" data-copy-source="title">Copy ${isEmail ? 'subject' : (isYouTube ? 'title' : 'hook')}</button>
            <button type="button" class="btn-secondary post-copy-btn" data-copy-source="content">Copy ${isEmail ? 'body' : (isYouTube ? 'description' : 'content')}</button>
            <button type="button" class="btn-primary post-copy-btn" data-copy-source="ready">Copy ready-to-paste</button>
          </div>
          <div class="post-helper-hint muted">
            "Ready-to-paste" assembles ${isEmail ? 'body + UTM URL (subject is separate)' : (isYouTube ? 'description + UTM URL — paste this as the video description' : 'hook + content + UTM URL — paste this as your full LinkedIn post')}.
          </div>
        </div>

        <div class="piece-form-actions">
          <button class="btn-secondary" id="pieceFormCancelBtn">Cancel</button>
          <button class="btn-primary" id="pieceFormSaveBtn">${pieceId ? 'Save' : 'Add piece'}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    function close() { overlay.remove(); _editingPieceId = null; }
    document.getElementById('pieceFormCloseBtn').addEventListener('click', close);
    document.getElementById('pieceFormCancelBtn').addEventListener('click', close);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });

    // Wire up the "Post to ..." copy helpers. Each button reads the LIVE
    // input values so the user can copy in any order (write, copy, save) —
    // they aren't forced to save first to copy.
    overlay.querySelectorAll('.post-copy-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        const source = btn.getAttribute('data-copy-source');
        const titleNow   = (document.getElementById('pieceTitleInput').value || '').trim();
        const contentNow = (document.getElementById('pieceContentInput').value || '').trim();
        let payload = '';
        if (source === 'utm')          payload = formUtmUrl;
        else if (source === 'title')   payload = titleNow;
        else if (source === 'content') payload = contentNow;
        else if (source === 'ready')   payload = buildReadyToPaste(type, titleNow, contentNow, formUtmUrl);
        copyToClipboard(payload);
        const original = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(function () { btn.textContent = original; }, 1200);
      });
    });

    document.getElementById('pieceFormSaveBtn').addEventListener('click', async function () {
      const titleVal   = document.getElementById('pieceTitleInput').value.trim();
      const contentVal = document.getElementById('pieceContentInput').value.trim();
      const dateVal    = document.getElementById('pieceDateInput').value || null;
      const statusEl   = document.getElementById('pieceStatusInput');
      const embedEl    = document.getElementById('pieceEmbedInput');
      const statusVal  = statusEl ? statusEl.value : 'draft';
      const embedVal   = embedEl ? embedEl.checked : false;

      if (!titleVal) { alert((isEmail ? 'Subject' : 'Title') + ' is required.'); return; }

      let row;
      if (pieceId) {
        // Update existing
        const update = {
          content: contentVal,
          planned_date: dateVal,
          status: statusVal,
          embed_in_post: embedVal
        };
        if (isEmail) update.subject = titleVal; else update.title = titleVal;

        const { data, error } = await _supabase
          .from('content_pieces')
          .update(update)
          .eq('id', pieceId)
          .select()
          .single();
        if (error) { alert('Save failed: ' + error.message); return; }
        row = data;
        // Re-generate UTM in case slug or version changed (rare but safe)
        await refreshPieceUtm(row);
      } else {
        // Insert — assign next piece_number for this campaign+type
        const pieceNumber = await nextPieceNumber(type);
        const insert = {
          blog_post_id: _currentCampaign.blog_post_id,
          campaign_id: _currentCampaign.id,
          type: type,
          content: contentVal,
          planned_date: dateVal,
          status: 'draft',
          piece_number: pieceNumber,
          embed_in_post: embedVal
        };
        if (isEmail) insert.subject = titleVal; else insert.title = titleVal;
        // Generate the UTM URL on insert. We need the post slug — use the
        // joined post on _currentCampaign.
        insert.utm_url = utmUrlFor(_currentCampaign.post, _currentCampaign, { type: type, piece_number: pieceNumber });

        const { data, error } = await _supabase
          .from('content_pieces')
          .insert(insert)
          .select()
          .single();
        if (error) { alert('Add failed: ' + error.message); return; }
        row = data;
      }

      close();
      await loadAndRenderPieces();
    });
  }

  async function nextPieceNumber(type) {
    const { data, error } = await _supabase
      .from('content_pieces')
      .select('piece_number')
      .eq('campaign_id', _currentCampaign.id)
      .eq('type', type)
      .order('piece_number', { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) return 1;
    return (data[0].piece_number || 0) + 1;
  }

  async function refreshPieceUtm(piece) {
    const post = (_currentCampaign && _currentCampaign.post) || null;
    if (!post) return;
    const url = utmUrlFor(post, _currentCampaign, piece);
    if (url !== piece.utm_url) {
      await _supabase.from('content_pieces').update({ utm_url: url }).eq('id', piece.id);
    }
  }

  // ── UTM URL generation ──────────────────────────────────────
  // Format (per build-prompt spec):
  //   https://controlledconvergence.com/blog/{slug}
  //     ?utm_source={source}&utm_medium={medium}
  //     &utm_campaign={campaign_slug}&utm_content={prefix}{n}
  // Campaign slug versioning: v1 = post.slug, v2+ = post.slug + '-v' + version
  function utmUrlFor(post, campaign, piece) {
    if (!post || !post.slug || !PIECE_TYPES[piece.type]) return '';
    const t = PIECE_TYPES[piece.type];
    const campaignSlug = (campaign && campaign.version > 1)
      ? post.slug + '-v' + campaign.version
      : post.slug;
    const params = new URLSearchParams({
      utm_source: t.source,
      utm_medium: t.medium,
      utm_campaign: campaignSlug,
      utm_content: t.contentPrefix + (piece.piece_number || 1)
    });
    return getSiteOrigin() + '/blog/' + post.slug + '?' + params.toString();
  }

  // ALWAYS compute fresh from the current origin. The utm_url column in the
  // DB is just a cache (it gets refreshed on insert + edit), but for display
  // we use the live origin so preview deploys generate working preview URLs
  // and production generates working production URLs.
  function utmUrlForPiece(piece) {
    return utmUrlFor((_currentCampaign && _currentCampaign.post) || null, _currentCampaign, piece);
  }

  // Assemble platform-appropriate paste-ready text for a piece. Each platform
  // has a different convention for how title/content/URL combine:
  //   linkedin → hook on top, body, blank line, URL at bottom
  //   email    → body + URL footer (subject is copied separately into Kit)
  //   youtube  → description body + URL footer (title goes in YouTube's title field)
  function buildReadyToPaste(type, titleOrSubject, content, utmUrl) {
    const safe = function (s) { return (s == null ? '' : String(s)).trim(); };
    const t = safe(titleOrSubject);
    const c = safe(content);
    const u = safe(utmUrl);
    if (type === 'linkedin') {
      return [t, '', c, '', u].filter(function (line, i) {
        // Drop empty leading lines but keep intentional blanks between sections.
        return !(i === 0 && line === '');
      }).join('\n');
    }
    if (type === 'email') {
      return c + (u ? '\n\nRead the full post: ' + u : '');
    }
    if (type === 'youtube') {
      return c + (u ? '\n\n🔗 ' + u : '');
    }
    return [t, c, u].filter(Boolean).join('\n\n');
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {});
      return;
    }
    // Fallback for older browsers / non-secure contexts
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    ta.remove();
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
