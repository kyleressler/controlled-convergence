// ============================================================
// api.js — Backend interface (Supabase)
//
// Depends on: _supabase (from config.js), appState + savedProjects (from state.js)
// All functions return Promises and fall back to in-memory if the
// user is not signed in, so the tool works for anonymous visitors too.
// ============================================================

// ── Projects ─────────────────────────────────────────────────

/**
 * Persist a project. Uses Supabase when signed in, in-memory when not.
 * @param {object} project — standardized project schema from projects.js
 * @returns {Promise<{data: object, error: string|null}>}
 */
async function saveProject(project) {
  if (appState.currentUser) {
    const isOwner = !project.user_id || project.user_id === appState.currentUser.id;

    // Shared content payload — same shape regardless of owner vs. collaborator.
    // data is a JSONB column; everything that restoreProjectState reads must live here.
    const payload = {
      name:        project.name,
      owner:       project.owner || '',
      description: project.description || '',
      data: {
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
 * @param {string} theme — 'engineering' | 'light' | 'dark'
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
