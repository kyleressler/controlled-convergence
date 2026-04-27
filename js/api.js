// ============================================================
// api.js — Backend interface (Supabase)
//
// Depends on: _supabase (from config.js), appState + savedProjects (from state.js)
// All functions return Promises and fall back to in-memory if the
// user is not signed in, so the tool works for anonymous visitors too.
// ============================================================

// ── Projects ─────────────────────────────────────────────────

// ── Input-length limits (security: prevent DoS via oversized payloads) ───────
const PAYLOAD_LIMITS = {
  name:              200,   // project name
  description:       5000,  // project description
  goal:              5000,  // goal statement
  reqText:           2000,  // individual requirement text
  reqsMax:           500,   // total requirements per project
  stakeholderName:   200,   // individual stakeholder name
  stakeholdersMax:   200,   // total stakeholders per project
  conceptName:       200,   // individual concept name
  conceptDesc:       5000,  // individual concept description
  conceptsMax:       100,   // total concepts per project
};

/**
 * Validate project payload before saving. Returns an error string if a limit
 * is exceeded, or null if everything is within bounds.
 * @param {object} project
 * @returns {string|null}
 */
function validateProjectPayload(project) {
  if (!project || typeof project !== 'object') return 'Invalid project object.';

  const str = (v) => (typeof v === 'string' ? v : '');

  if (str(project.name).length > PAYLOAD_LIMITS.name)
    return `Project name must be ${PAYLOAD_LIMITS.name} characters or fewer.`;
  if (str(project.description).length > PAYLOAD_LIMITS.description)
    return `Project description must be ${PAYLOAD_LIMITS.description} characters or fewer.`;
  if (str(project.goal).length > PAYLOAD_LIMITS.goal)
    return `Goal statement must be ${PAYLOAD_LIMITS.goal} characters or fewer.`;

  if (Array.isArray(project.requirements)) {
    if (project.requirements.length > PAYLOAD_LIMITS.reqsMax)
      return `Projects may not exceed ${PAYLOAD_LIMITS.reqsMax} requirements.`;
    for (const req of project.requirements) {
      if (str(req && req.text).length > PAYLOAD_LIMITS.reqText)
        return `Requirement text must be ${PAYLOAD_LIMITS.reqText} characters or fewer.`;
    }
  }

  if (Array.isArray(project.stakeholders)) {
    if (project.stakeholders.length > PAYLOAD_LIMITS.stakeholdersMax)
      return `Projects may not exceed ${PAYLOAD_LIMITS.stakeholdersMax} stakeholders.`;
    for (const s of project.stakeholders) {
      if (str(s && s.name).length > PAYLOAD_LIMITS.stakeholderName)
        return `Stakeholder name must be ${PAYLOAD_LIMITS.stakeholderName} characters or fewer.`;
    }
  }

  if (Array.isArray(project.concepts)) {
    if (project.concepts.length > PAYLOAD_LIMITS.conceptsMax)
      return `Projects may not exceed ${PAYLOAD_LIMITS.conceptsMax} concepts.`;
    for (const c of project.concepts) {
      if (str(c && c.name).length > PAYLOAD_LIMITS.conceptName)
        return `Concept name must be ${PAYLOAD_LIMITS.conceptName} characters or fewer.`;
      if (str(c && c.description).length > PAYLOAD_LIMITS.conceptDesc)
        return `Concept description must be ${PAYLOAD_LIMITS.conceptDesc} characters or fewer.`;
    }
  }

  return null;
}

/**
 * Persist a project. Uses Supabase when signed in, in-memory when not.
 * @param {object} project — standardized project schema from projects.js
 * @returns {Promise<{data: object, error: string|null}>}
 */
/**
 * Build the row payload that gets written to the `projects` table.
 * Extracted so both `saveProject` (SDK path) and `_rawFetchSaveProject`
 * (raw-fetch fallback path) produce identical writes.
 */
function _buildSaveProjectPayload(project) {
  return {
    name:        project.name,
    owner:       project.owner || '',
    description: project.description || '',
    data: {
      // Project type — 'quick' | 'full'. Persisted in JSONB so old DB rows
      // without this field load as 'full' (defaulted in restoreProjectState).
      projectType:        project.projectType === 'quick' ? 'quick' : 'full',
      // Goal
      goal:               project.goal,
      goalMode:           project.goalMode,
      currentPage:        project.currentPage,
      reqFormat:          project.reqFormat,
      // Ilities
      ilities:            project.ilities,
      customIlities:      project.customIlities,
      ilityOrder:         project.ilityOrder,
      // Stakeholders
      stakeholders:       project.stakeholders,
      customStakeholders: project.customStakeholders,
      stakOrder:          project.stakOrder,
      stakeholderOverrides: project.stakeholderOverrides,
      // Requirements
      requirements:       project.requirements,
      // Pairwise
      pairComparisons:    project.pairComparisons,
      pairSubject:        project.pairSubject,
      pairMethod:         project.pairMethod,
      pairMode:           project.pairMode,
      forcedRankOrder:    project.forcedRankOrder,
      // Pugh / scoring
      concepts:           project.concepts,
      matrix:             project.matrix,
      pughSettings:       project.pughSettings,
      datumPerformance:   project.datumPerformance,
      conceptPerformance: project.conceptPerformance,
      conceptNotes:       project.conceptNotes,
      conceptCustomFields: project.conceptCustomFields,
      scorerFilter:       project.scorerFilter,
      // Convergence
      convergence:        project.convergence,
    },
    updated_at:  new Date().toISOString()
  };
}

/**
 * Raw-fetch save fallback. Bypasses the Supabase SDK entirely — reads the
 * JWT directly from localStorage, sends the upsert via PostgREST with our
 * own AbortController-wrapped fetch.
 *
 * Used by `_autoSaveNow` when the SDK save times out (the SDK has gotten
 * itself into a stuck state we can't recover from). This path doesn't
 * touch the SDK, so it works regardless of how broken the SDK is.
 *
 * Only handles the owner case (upsert). Collaborator saves still go
 * through the SDK; if those time out we just show the warning banner.
 *
 * @param {object} project
 * @returns {Promise<{data: object|null, error: string|null}>}
 */
async function _rawFetchSaveProject(project) {
  const validationError = validateProjectPayload(project);
  if (validationError) return { data: null, error: validationError };
  if (!appState.currentUser) return { data: null, error: 'Not signed in' };

  const isOwner = !project.user_id || project.user_id === appState.currentUser.id;
  if (!isOwner) return { data: null, error: 'Raw-fetch fallback only handles owner saves' };

  // Pull the JWT from localStorage. Supabase v2 stores it under
  // `sb-{projectRef}-auth-token` as a JSON object containing access_token.
  const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
  const storageKey = 'sb-' + projectRef + '-auth-token';
  let accessToken = null;
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      accessToken = parsed && parsed.access_token;
    }
  } catch (e) {
    return { data: null, error: 'Could not read session from localStorage: ' + e.message };
  }
  if (!accessToken) return { data: null, error: 'No access token in localStorage' };

  const payload = _buildSaveProjectPayload(project);
  const body = JSON.stringify({
    id:         project.id,
    user_id:    appState.currentUser.id,
    created_at: project.created_at,
    ...payload
  });

  // PostgREST upsert: POST with on_conflict + Prefer: resolution=merge-duplicates.
  // Equivalent to the SDK's .upsert(...) call.
  const url = SUPABASE_URL + '/rest/v1/projects?on_conflict=id';
  const controller = new AbortController();
  const timer = setTimeout(function() { controller.abort(); }, 12000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'apikey':        SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type':  'application/json',
        'Prefer':        'resolution=merge-duplicates,return=representation'
      },
      body: body
    });
    clearTimeout(timer);
    if (!response.ok) {
      const text = await response.text().catch(function() { return ''; });
      return { data: null, error: 'HTTP ' + response.status + ': ' + text };
    }
    // Keep in-memory array in sync (matches what saveProject does)
    const idx = savedProjects.findIndex(function(p) { return p.id === project.id; });
    if (idx >= 0) savedProjects[idx] = project; else savedProjects.push(project);
    appState.projects = savedProjects.slice();
    return { data: project, error: null };
  } catch (e) {
    clearTimeout(timer);
    return { data: null, error: e && e.message ? e.message : String(e) };
  }
}

async function saveProject(project) {
  const validationError = validateProjectPayload(project);
  if (validationError) {
    console.warn('[saveProject] Validation failed:', validationError);
    return { data: null, error: validationError };
  }
  if (appState.currentUser) {
    const isOwner = !project.user_id || project.user_id === appState.currentUser.id;

    const payload = _buildSaveProjectPayload(project);

    let data, error;

    if (isOwner) {
      // Owner: upsert handles both first-save (INSERT) and subsequent saves (UPDATE).
      ({ data, error } = await _supabase
        .from('projects')
        .upsert({ id: project.id, user_id: appState.currentUser.id, created_at: project.created_at, ...payload })
        .select()
        .single());
    } else {
      // Collaborator (editor / scoped_editor): UPDATE only.
      // Supabase upsert is an INSERT + ON CONFLICT DO UPDATE, so the INSERT RLS check
      // fires first — which blocks any user whose id doesn't match user_id.
      // Plain UPDATE bypasses that; the "Owners and editors can update projects" policy allows it.
      // Do NOT use .select().single() here — viewers are RLS-blocked (0 rows), and .single()
      // would throw PGRST116. A viewer save is a graceful no-op at the DB level.
      ({ error } = await _supabase
        .from('projects')
        .update(payload)
        .eq('id', project.id));
      data = null;
    }

    if (error) {
      console.error('[saveProject] Supabase error:', error.message,
                    '| code:', error.code,
                    '| user:', appState.currentUser?.id,
                    '| project:', project.id,
                    '| isOwner:', isOwner);
      return { data: null, error: error.message };
    }

    // Keep in-memory array in sync
    const idx = savedProjects.findIndex(p => p.id === project.id);
    if (idx >= 0) savedProjects[idx] = project; else savedProjects.push(project);
    appState.projects = savedProjects.slice();
    return { data: project, error: null };
  }

  // Fallback: in-memory only (anonymous visitor — data will not survive a refresh)
  console.warn('[saveProject] No current user — saving in-memory only. Project will be lost on refresh.');
  const idx = savedProjects.findIndex(p => p.id === project.id);
  if (idx >= 0) {
    savedProjects[idx] = project;
  } else {
    savedProjects.push(project);
  }
  appState.projects = savedProjects.slice();
  return { data: project, error: null };
}

/**
 * Load all projects for the current user.
 * @returns {Promise<{data: object[], error: string|null}>}
 */
async function loadProjects(userId) {
  if (appState.currentUser) {
    // No user_id filter here — RLS handles access control.
    // After Feature 5 this returns both owned projects AND shared projects
    // the user is a member of (via project_members RLS policy).
    const { data, error } = await _supabase
      .from('projects')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[loadProjects] Supabase error:', error.message, '| code:', error.code);
      return { data: [], error: error.message };
    }

    // Normalize Supabase rows back to the project model shape
    const currentUserId = appState.currentUser?.id;
    const projects = (data || []).map(row => ({
      id:                  row.id,
      user_id:             row.user_id,
      name:                row.name,
      owner:               row.owner || '',
      description:         row.description || '',
      created_at:          row.created_at,
      updated_at:          row.updated_at,
      scheduled_delete_at: row.scheduled_delete_at || null,
      // is_owner: true when this user created the project; false = collaborator
      is_owner:            row.user_id === currentUserId,
      // Spread the JSONB data column back to the top level
      ...(row.data || {})
    }));

    savedProjects = projects;
    appState.projects = projects.slice();
    return { data: projects, error: null };
  }

  // Fallback: in-memory only
  return { data: savedProjects.slice(), error: null };
}

/**
 * Immediately delete a project by id (owner only).
 * Renamed from deleteProject to avoid shadowing by app.js UI handler.
 * @param {string} projectId
 * @returns {Promise<{error: string|null}>}
 */
async function deleteProjectAPI(projectId) {
  if (appState.currentUser) {
    const { error } = await _supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', appState.currentUser.id); // extra safety: owner only

    if (error) return { error: error.message };
  }

  // Update in-memory array regardless
  savedProjects = savedProjects.filter(p => p.id !== projectId);
  appState.projects = savedProjects.slice();
  return { error: null };
}

/**
 * Schedule a project for deletion 48 hours from now.
 * Sets scheduled_delete_at; pg_cron does the actual delete.
 * @param {string} projectId
 * @returns {Promise<{scheduled_delete_at: string|null, error: string|null}>}
 */
async function scheduleProjectDelete(projectId) {
  const deleteAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  if (appState.currentUser) {
    const { error } = await _supabase
      .from('projects')
      .update({ scheduled_delete_at: deleteAt })
      .eq('id', projectId)
      .eq('user_id', appState.currentUser.id);

    if (error) return { scheduled_delete_at: null, error: error.message };
  }

  // Update in-memory
  const idx = savedProjects.findIndex(p => p.id === projectId);
  if (idx >= 0) savedProjects[idx] = { ...savedProjects[idx], scheduled_delete_at: deleteAt };
  appState.projects = savedProjects.slice();
  return { scheduled_delete_at: deleteAt, error: null };
}

/**
 * Cancel a scheduled deletion — clears scheduled_delete_at.
 * @param {string} projectId
 * @returns {Promise<{error: string|null}>}
 */
async function cancelScheduledDelete(projectId) {
  if (appState.currentUser) {
    const { error } = await _supabase
      .from('projects')
      .update({ scheduled_delete_at: null })
      .eq('id', projectId)
      .eq('user_id', appState.currentUser.id);

    if (error) return { error: error.message };
  }

  const idx = savedProjects.findIndex(p => p.id === projectId);
  if (idx >= 0) savedProjects[idx] = { ...savedProjects[idx], scheduled_delete_at: null };
  appState.projects = savedProjects.slice();
  return { error: null };
}

/**
 * Remove the current user from a project's collaborators (leave project).
 * Deletes their project_members row; does NOT delete the project itself.
 * @param {string} projectId
 * @returns {Promise<{error: string|null}>}
 */
async function removeCollabProjectAPI(projectId) {
  if (appState.currentUser) {
    const { error } = await _supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', appState.currentUser.id);

    if (error) return { error: error.message };
  }

  // Remove from in-memory list
  savedProjects = savedProjects.filter(p => p.id !== projectId);
  appState.projects = savedProjects.slice();
  return { error: null };
}

// ── AI Coaching ───────────────────────────────────────────────

/**
 * Fetch AI coaching text for a given page/context.
 * Calls a Netlify serverless function which holds the Anthropic API key.
 * @param {string} page — e.g. 'goal', 'ility', 'reqs'
 * @param {object} context — relevant state snapshot
 * @returns {Promise<{data: string|null, error: string|null}>}
 */
async function getCoaching(page, context) {
  // AI coaching is not yet enabled — needs Netlify function + Anthropic key
  return { data: null, error: 'AI coaching not yet enabled' };

  // Future Netlify function integration:
  // try {
  //   const res = await fetch('/.netlify/functions/coaching', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ page, context })
  //   });
  //   return res.json();
  // } catch (err) {
  //   return { data: null, error: err.message };
  // }
}

// ── Theme persistence ─────────────────────────────────────────

/**
 * Save user's theme preference.
 * @param {string} theme — 'light' | 'red-black' | 'green-yellow' | 'dark' | 'engineering'
 * @returns {Promise<{error: string|null}>}
 */
async function saveThemePreference(theme) {
  if (appState.currentUser) {
    const { error } = await _supabase
      .from('user_profiles')
      .update({ theme })
      .eq('id', appState.currentUser.id);

    if (error) return { error: error.message };
    appState.currentUser.theme = theme;
    return { error: null };
  }

  // Not signed in — just update in-memory
  if (appState.currentUser) appState.currentUser.theme = theme;
  return { error: null };
}

/**
 * Load user's saved theme preference.
 * @returns {Promise<{data: string|null, error: string|null}>}
 */
async function loadThemePreference() {
  const theme = (appState.currentUser && appState.currentUser.theme) || null;
  return { data: theme, error: null };
}
