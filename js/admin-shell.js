// ============================================================
// admin-shell.js — Admin tab handling + entry point
//
// Lives inside app.html. Provides:
//   • activateAdminTab(tab)  — switch between Insights / Blog / Email
//   • renderAdminPage(tab)   — entry called from switchPage('admin');
//                              activates the requested tab and triggers
//                              the appropriate per-pane renderer.
//
// The gate (isAdmin() check) lives in app.js's switchPage() — by the
// time we get here the caller has already verified admin tier.
//
// Tab markup is the same as the standalone admin.html had, so
// admin-insights.js and admin-blog.js find the same DOM IDs.
// ============================================================

(function () {
  'use strict';

  const VALID_TABS = ['insights', 'blog', 'email'];

  // Activate a tab — toggles button states + pane visibility, syncs hash
  // (#admin/<tab>), and calls the matching pane's render function.
  window.activateAdminTab = function (tab) {
    if (VALID_TABS.indexOf(tab) === -1) tab = 'insights';

    document.querySelectorAll('.admin-tab').forEach(function (b) {
      const match = b.getAttribute('data-tab') === tab;
      b.classList.toggle('active', match);
      b.setAttribute('aria-selected', match ? 'true' : 'false');
    });
    document.querySelectorAll('.admin-pane').forEach(function (p) {
      p.classList.toggle('active', p.id === 'pane-' + tab);
    });

    // Sync hash so refresh / back-button keeps the tab and copying the URL
    // deep-links correctly. Don't push history — use replaceState so the
    // back button leaves the admin section instead of cycling tabs.
    const desiredHash = '#admin/' + tab;
    if (window.location.hash !== desiredHash) {
      history.replaceState(null, '', window.location.pathname + desiredHash);
    }

    // Per-tab render dispatch
    if (tab === 'insights' && typeof window.renderAdminInsights === 'function') {
      window.renderAdminInsights();
    } else if (tab === 'blog' && typeof window.renderAdminBlog === 'function') {
      window.renderAdminBlog();
    }
    // email: static content for now
  };

  // Entry point called from switchPage('admin').
  // Activates the tab in the hash (default: insights) and renders.
  window.renderAdminPage = function () {
    const h = window.location.hash || '';
    let tab = 'insights';
    const m = h.match(/^#admin\/(.+)$/);
    if (m && VALID_TABS.indexOf(m[1]) !== -1) {
      tab = m[1];
    }
    window.activateAdminTab(tab);

    // Track admin entries (PostHog also auto-captures $pageview for the route
    // change, but we keep this named event for analytics aggregations).
    if (typeof trackEvent === 'function') {
      trackEvent('page_viewed', { page: '#admin/' + tab });
    }
  };

  // Wire tab clicks (one-time init on page load).
  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.admin-tab').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.activateAdminTab(btn.getAttribute('data-tab'));
      });
    });
  });

  // ── Refresh button (lives in the admin tab strip) ────────────
  // Re-renders the active tab. Skips Blog when the user is mid-edit so we
  // don't blow away unsaved changes.
  function refreshActiveAdminTab() {
    const btn = document.getElementById('adminRefreshBtn');
    if (btn) {
      btn.classList.remove('spinning');
      void btn.offsetWidth;            // force reflow → animation restarts
      btn.classList.add('spinning');
    }
    const activeTab = document.querySelector('.admin-tab.active');
    const tab = activeTab ? activeTab.getAttribute('data-tab') : null;

    if (tab === 'insights' && typeof window.renderAdminInsights === 'function') {
      window.renderAdminInsights();
    } else if (tab === 'blog' && typeof window.renderAdminBlog === 'function') {
      if (typeof window.adminBlogIsEditing === 'function' && window.adminBlogIsEditing()) {
        return; // skip during active edit
      }
      window.renderAdminBlog();
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    const refreshBtn = document.getElementById('adminRefreshBtn');
    if (refreshBtn) refreshBtn.addEventListener('click', refreshActiveAdminTab);
  });
})();
