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
    // Supabase: upsert the full project row
    const { data, error } = await _supabase
      .from('projects')
      .upsert({
        id:          project.id,
        user_id:     appState.currentUser.id,
        name:        project.name,
        owner:       project.owner || '',
        description: project.description || '',
        data:        {
          goal:         project.goal,
          ilities:      project.ilities,
          stakeholders: project.stakeholders,
          requirements: project.requirements,
          concepts:     project.concepts,
          matrix:       project.matrix,
          pughSettings: project.pughSettings
        },
        created_at:  project.created_at,
        updated_at:  new Date().toISOString()
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    // Keep in-memory array in sync
    const idx = savedProjects.findIndex(p => p.id === project.id);
    if (idx >= 0) savedProjects[idx] = project; else savedProjects.push(project);
    appState.projects = savedProjects.slice();
    return { data: project, error: null };
  }

  // Fallback: in-memory only (anonymous visitor)
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
    const { data, error } = await _supabase
      .from('projects')
      .select('*')
      .eq('user_id', appState.currentUser.id)
      .order('updated_at', { ascending: false });

    if (error) return { data: [], error: error.message };

    // Normalize Supabase rows back to the project model shape
    const projects = (data || []).map(row => ({
      id:          row.id,
      user_id:     row.user_id,
      name:        row.name,
      owner:       row.owner || '',
      description: row.description || '',
      created_at:  row.created_at,
      updated_at:  row.updated_at,
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
 * Delete a project by id.
 * @param {string} projectId
 * @returns {Promise<{error: string|null}>}
 */
async function deleteProject(projectId) {
  if (appState.currentUser) {
    const { error } = await _supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .eq('user_id', appState.currentUser.id); // extra safety

    if (error) return { error: error.message };
  }

  // Update in-memory array regardless
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
