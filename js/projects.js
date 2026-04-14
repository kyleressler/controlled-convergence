// ============================================================
// projects.js — Project model, validation, and Stripe gate
// ============================================================

// ── Tier limits ───────────────────────────────────────────────
const PROJECT_LIMITS = {
  free:   1,   // free users: 1 saved project
  member: 5,   // member tier: 5 projects
  pro:    Infinity  // pro: unlimited
};

/**
 * Create a new standardized project object.
 * Shape mirrors the Supabase 'projects' table schema.
 *
 * @param {object} opts
 * @param {string} opts.name
 * @param {string} [opts.description]
 * @param {string} [opts.owner]
 * @param {string} [opts.userId] — set to appState.currentUser.id when auth is live
 * @returns {object} project
 */
function createProjectModel({ name, description = '', owner = '', userId = null } = {}) {
  return {
    id: 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    user_id: userId || (appState.currentUser ? appState.currentUser.id : null),
    name: name || 'Untitled Project',
    description,
    owner,
    // Goal statement (TO/BY/USING/WHILE)
    goal: {
      to: '',
      by: '',
      using: '',
      while: ''
    },
    // Full guided-mode data (persisted for round-trip)
    ilities: [],
    stakeholders: [],
    requirements: [],
    concepts: [],       // pughConcepts[]
    matrix: {},         // pughScores{}
    pughSettings: { advancedScoring: false, showMTHUS: false, showMAS: false },
    // Timestamps
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * Check whether a user is allowed to create another project.
 * This is the Stripe entitlement gate — in production, validate
 * against the user's active subscription from Stripe.
 *
 * @param {object|null} user — appState.currentUser
 * @param {number} currentCount — savedProjects.length
 * @returns {{ allowed: boolean, reason: string|null }}
 *
 * Stripe integration points:
 *   1. On login: fetch customer.subscriptions.data[0].items to determine tier
 *   2. Store entitlement in appState.currentUser.tier
 *   3. This function reads that tier — no change needed here once step 2 is live
 */
function canCreateProject(user, currentCount) {
  const tier = (user && user.tier) || userTier || 'free';
  const limit = PROJECT_LIMITS[tier] !== undefined ? PROJECT_LIMITS[tier] : 1;

  if (currentCount < limit) {
    return { allowed: true, reason: null };
  }

  const messages = {
    free:   'Free accounts can save 1 project. Create a free Member account to save up to 5.',
    member: 'Member accounts can save up to 5 projects. Upgrade to Pro for unlimited projects.',
    pro:    null // unlimited — should never hit this branch
  };

  return { allowed: false, reason: messages[tier] || 'Project limit reached.' };
}

/**
 * Snapshot the current in-memory state into a project object
 * ready for api.saveProject().
 *
 * @param {object} existingProject — the project to update (must have .id)
 * @returns {object} — updated project with current state merged in
 */
function snapshotCurrentState(existingProject) {
  const toEl    = document.getElementById('tbuw-to');
  const byEl    = document.getElementById('tbuw-by');
  const usingEl = document.getElementById('tbuw-using');
  const whileEl = document.getElementById('tbuw-while');

  return {
    ...existingProject,
    name: existingProject.name,
    goal: {
      to:    toEl    ? toEl.value    : (existingProject.goal && existingProject.goal.to)    || '',
      by:    byEl    ? byEl.value    : (existingProject.goal && existingProject.goal.by)    || '',
      using: usingEl ? usingEl.value : (existingProject.goal && existingProject.goal.using) || '',
      while: whileEl ? whileEl.value : (existingProject.goal && existingProject.goal.while) || ''
    },
    ilities:      Array.from(selectedIlities),
    stakeholders: Array.from(selectedStakeholders),
    requirements: requirements.slice(),
    concepts:     pughConcepts.slice(),
    matrix:       Object.assign({}, pughScores),
    pughSettings: Object.assign({}, pughSettings),
    updated_at:   new Date().toISOString()
  };
}

/**
 * Restore full project state from a saved project object.
 * Called after loading a project (replaces the old uploadProjectData flow).
 *
 * @param {object} project — standardized project object
 */
function restoreProjectState(project) {
  activeProject = project;
  appState.currentProject = project;

  // Goal statement
  const g = project.goal || {};
  const toEl    = document.getElementById('tbuw-to');
  const byEl    = document.getElementById('tbuw-by');
  const usingEl = document.getElementById('tbuw-using');
  const whileEl = document.getElementById('tbuw-while');
  if (toEl)    toEl.value    = g.to    || '';
  if (byEl)    byEl.value    = g.by    || '';
  if (usingEl) usingEl.value = g.using || '';
  if (whileEl) whileEl.value = g.while || '';

  // Ilities
  selectedIlities = new Set(project.ilities || []);
  customIlities   = [];

  // Stakeholders
  selectedStakeholders = new Set(project.stakeholders || []);
  customStakeholders   = [];

  // Requirements
  requirements  = (project.requirements || []).slice();
  reqIdCounter  = requirements.length ? Math.max(...requirements.map(r => r.id || 0)) + 1 : 0;

  // Pugh
  pughConcepts  = (project.concepts || []).slice();
  pughScores    = Object.assign({}, project.matrix || {});
  pughSettings  = Object.assign({ advancedScoring: false, showMTHUS: false, showMAS: false }, project.pughSettings || {});
}
