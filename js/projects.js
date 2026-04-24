// ============================================================
// projects.js — Project model, validation, and Stripe gate
// ============================================================

// ── Tier limits ───────────────────────────────────────────────
// Owned projects (projects this user created). Quick and Full have
// SEPARATE pools — a Free Account user can own 3 Quick + 3 Full
// independently. A Pro user can own 100 of each.
const PROJECT_LIMITS = {
  free:    { quick: 0,   full: 0   }, // free = not logged in; cannot own saved projects
  account: { quick: 3,   full: 3   }, // free Account tier: 3 Quick + 3 Full
  pro:     { quick: 100, full: 100 }  // Pro: 100 Quick + 100 Full
};

/**
 * Look up the owned-project limit for a given tier and project type.
 * Defaults to 'full' when projectType is missing.
 */
function getProjectLimit(tier, projectType) {
  const tierLimits = PROJECT_LIMITS[tier] || PROJECT_LIMITS.free;
  const type = projectType === 'quick' ? 'quick' : 'full';
  return typeof tierLimits[type] === 'number' ? tierLimits[type] : 0;
}

// Collaborating projects (projects this user was invited to)
const COLLAB_LIMITS = {
  free:    0,        // free = not logged in; cannot collaborate
  account: 5,        // account tier: up to 5 collaborating projects
  pro:     Infinity  // pro: unlimited
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
 * @param {string} [opts.projectType] — 'quick' | 'full' (default 'full').
 *        Quick and Full share the same JSON schema; Quick uses a subset of fields
 *        so a Quick Project can be converted to a Full Project without data loss.
 * @returns {object} project
 */
function createProjectModel({ name, description = '', owner = '', userId = null, projectType = 'full' } = {}) {
  return {
    id: 'proj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    user_id: userId || (appState.currentUser ? appState.currentUser.id : null),
    is_owner: true,  // newly created projects are always owned by the creating user
    scheduled_delete_at: null,
    name: name || 'Untitled Project',
    description,
    owner,
    // 'quick' or 'full'. Existing projects with no projectType field are treated as 'full'
    // by readers (loadProject, project card rendering, etc.).
    projectType: projectType === 'quick' ? 'quick' : 'full',
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
 * Check whether a user is allowed to create another project of the given type.
 * Quick and Full projects have separate per-type pools.
 *
 * @param {object|null} user — appState.currentUser
 * @param {number} currentCount — count of OWNED projects of the SAME projectType
 * @param {string} [projectType='full'] — 'quick' | 'full'
 * @returns {{ allowed: boolean, reason: string|null }}
 *
 * Stripe integration points:
 *   1. On login: fetch customer.subscriptions.data[0].items to determine tier
 *   2. Store entitlement in appState.currentUser.tier
 *   3. This function reads that tier — no change needed here once step 2 is live
 */
function canCreateProject(user, currentCount, projectType) {
  const tier  = (user && user.tier) || userTier || 'free';
  const type  = projectType === 'quick' ? 'quick' : 'full';
  const limit = getProjectLimit(tier, type);

  if (currentCount < limit) {
    return { allowed: true, reason: null };
  }

  const typeLabel = type === 'quick' ? 'Quick Projects' : 'Full Projects';
  const messages = {
    free:    'Sign in to save ' + typeLabel + '.',
    account: 'Free Accounts can own up to ' + limit + ' ' + typeLabel + '. Upgrade to Pro for more.',
    pro:     'Pro users can own up to ' + limit + ' ' + typeLabel + '.'
  };

  return { allowed: false, reason: messages[tier] || 'Project limit reached.' };
}

/**
 * Check whether a user is allowed to accept one more collaboration invite.
 *
 * @param {object|null} user         — appState.currentUser
 * @param {number}      currentCount — number of projects the user currently collaborates on
 * @returns {{ allowed: boolean, reason: string|null }}
 */
function canAcceptCollabInvite(user, currentCount) {
  const tier  = (user && user.tier) || userTier || 'free';
  const limit = COLLAB_LIMITS[tier] !== undefined ? COLLAB_LIMITS[tier] : 0;

  if (currentCount < limit) return { allowed: true, reason: null };

  const messages = {
    free:    'You need an Account to collaborate on projects.',
    account: 'You\'re at your collaborating limit. Remove a project from your collaborator list or upgrade to Pro for unlimited.',
    pro:     null // unlimited — should never reach this
  };

  return { allowed: false, reason: messages[tier] || 'Collaboration limit reached.' };
}

/**
 * Snapshot the current in-memory state into a project object
 * ready for api.saveProject().
 *
 * @param {object} existingProject — the project to update (must have .id)
 * @returns {object} — updated project with current state merged in
 */
function snapshotCurrentState(existingProject) {
  // Goal statement — correct element IDs are input-to, input-by, etc.
  const toEl       = document.getElementById('input-to');
  const byEl       = document.getElementById('input-by');
  const usingEl    = document.getElementById('input-using');
  const whileEl    = document.getElementById('input-while');
  const basicEl    = document.getElementById('input-goal-basic');

  return {
    ...existingProject,
    name: existingProject.name,
    // Preserve projectType through every save. Default 'full' for legacy projects
    // saved before this field existed.
    projectType: existingProject.projectType === 'quick' ? 'quick' : 'full',
    goal: {
      to:    toEl    ? toEl.value    : (existingProject.goal && existingProject.goal.to)    || '',
      by:    byEl    ? byEl.value    : (existingProject.goal && existingProject.goal.by)    || '',
      using: usingEl ? usingEl.value : (existingProject.goal && existingProject.goal.using) || '',
      while: whileEl ? whileEl.value : (existingProject.goal && existingProject.goal.while) || '',
      basic: basicEl ? basicEl.value : (existingProject.goal && existingProject.goal.basic) || ''
    },
    // typeof goalMode check: defined in app.js (loads after projects.js, but is set
    // before any user action that would call snapshotCurrentState)
    goalMode:         (typeof goalMode !== 'undefined') ? goalMode : (existingProject.goalMode || 'basic'),
    currentPage:      (typeof _currentPage !== 'undefined') ? _currentPage : (existingProject.currentPage || 'tbus'),
    reqFormat:        (typeof reqFormat !== 'undefined') ? reqFormat : (existingProject.reqFormat || 'agile'),
    ilities:          Array.from(selectedIlities),
    customIlities:    (typeof customIlities !== 'undefined' ? customIlities : []).slice(),
    ilityOrder:       ilityOrder.slice(),
    stakeholders:     Array.from(selectedStakeholders),
    customStakeholders: (typeof customStakeholders !== 'undefined' ? customStakeholders : []).slice(),
    stakOrder:        stakOrder.slice(),
    // Persist contact-field edits made to built-in stakeholders (STAKEHOLDERS array entries).
    // Custom stakeholders already carry their full objects; this covers the built-ins.
    stakeholderOverrides: (() => {
      const overrides = {};
      if (typeof STAKEHOLDERS !== 'undefined') {
        STAKEHOLDERS.forEach(s => {
          if (s.contactName || s.contactTitle || s.contactEmail) {
            overrides[s.id] = {
              contactName:  s.contactName  || '',
              contactTitle: s.contactTitle || '',
              contactEmail: s.contactEmail || ''
            };
          }
        });
      }
      return overrides;
    })(),
    requirements:     requirements.slice(),
    pairComparisons:  Object.assign({}, (typeof pairComparisons !== 'undefined' ? pairComparisons : {})),
    pairSubject:      (typeof pairSubject     !== 'undefined') ? pairSubject     : 'ilities',
    pairMethod:       (typeof pairMethod      !== 'undefined') ? pairMethod      : 'pairwise',
    forcedRankOrder:  (typeof forcedRankOrder !== 'undefined' ? forcedRankOrder : []).slice(),
    concepts:         pughConcepts.slice(),
    matrix:           Object.assign({}, pughScores),
    pughSettings:     Object.assign({}, pughSettings),
    datumPerformance: Object.assign({}, (typeof datumPerformance !== 'undefined' ? datumPerformance : {})),
    conceptPerformance: Object.assign({}, (typeof conceptPerformance !== 'undefined' ? conceptPerformance : {})),
    conceptNotes:     Object.assign({}, (typeof conceptNotes !== 'undefined' ? conceptNotes : {})),
    conceptCustomFields: (typeof conceptCustomFields !== 'undefined' ? conceptCustomFields : []).slice(),
    scorerFilter:     (typeof scorerFilter !== 'undefined') ? scorerFilter : '',
    pairMode:         (typeof pairMode     !== 'undefined') ? pairMode     : 'nonweighted',
    convergence: {
      selectedConceptId: convSelectedConceptId,
      rationale:         convRationale,
      lessons:           Object.assign({}, convLessons),
      risks:             convRisks,
      nextSteps:         convNextSteps.slice(),
      closedAt:          convClosedAt
    },
    updated_at:       new Date().toISOString()
  };
}

/**
 * Restore full project state from a saved project object.
 * Called after loading a project (replaces the old uploadProjectData flow).
 *
 * @param {object} project — standardized project object
 */
function restoreProjectState(project) {
  // Default missing projectType to 'full' so legacy projects load as Full Projects.
  if (project && project.projectType !== 'quick' && project.projectType !== 'full') {
    project.projectType = 'full';
  }
  activeProject = project;
  appState.currentProject = project;

  // Goal statement — correct element IDs are input-to, input-by, etc.
  const g = project.goal || {};
  const toEl    = document.getElementById('input-to');
  const byEl    = document.getElementById('input-by');
  const usingEl = document.getElementById('input-using');
  const whileEl = document.getElementById('input-while');
  const basicEl = document.getElementById('input-goal-basic');
  if (toEl)    toEl.value    = g.to    || '';
  if (byEl)    byEl.value    = g.by    || '';
  if (usingEl) usingEl.value = g.using || '';
  if (whileEl) whileEl.value = g.while || '';
  if (basicEl) basicEl.value = g.basic || '';

  // Ilities
  selectedIlities  = new Set(project.ilities || []);
  customIlities    = (project.customIlities || []).slice();
  ilityOrder       = (project.ilityOrder || []).slice();

  // Stakeholders
  selectedStakeholders = new Set(project.stakeholders || []);
  customStakeholders   = (project.customStakeholders || []).slice();
  stakOrder            = (project.stakOrder || []).slice();

  // Apply saved contact-field overrides back onto built-in STAKEHOLDERS entries.
  // Always run this (even when overrides is empty) to clear stale data from a previous project.
  if (typeof STAKEHOLDERS !== 'undefined') {
    const overrides = project.stakeholderOverrides || {};
    STAKEHOLDERS.forEach(s => {
      const ov = overrides[s.id];
      s.contactName  = ov ? (ov.contactName  || '') : '';
      s.contactTitle = ov ? (ov.contactTitle || '') : '';
      s.contactEmail = ov ? (ov.contactEmail || '') : '';
    });
  }

  // Requirements
  requirements  = (project.requirements || []).slice();
  reqIdCounter  = requirements.length
    ? Math.max(...requirements.map(r => parseInt(String(r.id).replace('r', ''), 10) || 0)) + 1
    : 0;
  if (typeof reqFormat !== 'undefined') reqFormat = project.reqFormat || 'agile';
  if (typeof switchReqFormat === 'function') switchReqFormat(project.reqFormat || 'agile');

  // Pairwise
  pairComparisons = Object.assign({}, project.pairComparisons || {});
  pairSubject     = project.pairSubject     || 'ilities';
  pairMethod      = project.pairMethod      || 'pairwise';
  forcedRankOrder = (project.forcedRankOrder || []).slice();

  // Pugh / scoring
  pughConcepts        = (project.concepts || []).slice();
  pughScores          = Object.assign({}, project.matrix || {});
  pughSettings        = Object.assign({ advancedScoring: false, showMTHUS: false, showMAS: false }, project.pughSettings || {});
  datumPerformance    = Object.assign({}, project.datumPerformance || {});
  conceptPerformance  = Object.assign({}, project.conceptPerformance || {});
  conceptNotes        = Object.assign({}, project.conceptNotes || {});
  conceptCustomFields = (project.conceptCustomFields || []).slice();
  _cfIdCounter        = conceptCustomFields.reduce((max, f) => {
    const n = parseInt(String(f.id).replace('cf', ''), 10) || 0;
    return Math.max(max, n);
  }, 0);
  scorerFilter        = project.scorerFilter || '';
  if (typeof pairMode !== 'undefined') pairMode = project.pairMode || 'nonweighted';

  // Convergence Summary
  const cv              = project.convergence || {};
  convSelectedConceptId = cv.selectedConceptId || '';
  convRationale         = cv.rationale         || '';
  convLessons           = Object.assign({ req: '', concepts: '', assumption: '', different: '' }, cv.lessons || {});
  convRisks             = cv.risks             || '';
  convNextSteps         = (cv.nextSteps        || []).slice();
  convClosedAt          = cv.closedAt          || null;
  _convNSCounter        = convNextSteps.reduce((max, s) => {
    const n = parseInt(String(s.id).replace('ns', ''), 10) || 0;
    return Math.max(max, n);
  }, 0);
}
