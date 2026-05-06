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
 * Used by `saveProject`. Centralized so the JSONB shape is defined
 * in exactly one place.
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
 * Persist a project. Uses raw fetch (via supa-rest.js) when signed in,
 * in-memory when not. Bypasses the Supabase SDK entirely on the network
 * path — saves are reliable regardless of SDK state.
 *
 * @param {object} project — standardized project schema from projects.js
 * @returns {Promise<{data: object, error: string|null}>}
 */
async function saveProject(project) {
  const validationError = validateProjectPayload(project);
  if (validationError) {
    console.warn('[saveProject] Validation failed:', validationError);
    return { data: null, error: validationError };
  }

  if (appState.currentUser) {
    const isOwner = !project.user_id || project.user_id === appState.currentUser.id;

    // Phase 3+: collaborators who hold the checkout lock may also write.
    // The RLS UPDATE policy enforces this server-side (editing_user_id = auth.uid()),
    // so we mirror that here to avoid blocking the pre-checkin save that
    // submitCheckIn() needs to flush the collaborator's edits before release_lock
    // snapshots them. Without this, the collaborator's changes are silently
    // discarded and the snapshot stored by release_lock is stale.
    const currentHolderId = (typeof currentProjectLock !== 'undefined' &&
                             currentProjectLock &&
                             currentProjectLock.editing_user_id) || null;
    const isLockHolder = !!(currentHolderId && currentHolderId === appState.currentUser.id);

    // Phase 2: block saves from anyone who is neither owner nor lock holder.
    // Viewers get a clear client-side error before we even hit the network.
    if (!isOwner && !isLockHolder) {
      console.warn('[saveProject] non-owner non-lock-holder attempted save — blocked',
                   '| user:', appState.currentUser.id,
                   '| project:', project.id);
      return { data: null, error: 'You do not have permission to edit this project.' };
    }

    const payload = _buildSaveProjectPayload(project);

    // Phase 3: on the FIRST save (project creation), set editing_user_id =
    // creator so the owner immediately holds the lock. Subsequent saves
    // require the user to already hold the lock (RLS enforces this on UPDATE).
    //
    // We detect "first save" by whether the project exists in our in-memory
    // savedProjects array. If it doesn't, this is creation and we include
    // the lock fields. If it does, this is an UPDATE and we don't touch
    // the lock fields (preserving whoever currently holds it).
    const isFirstSave = !savedProjects.find(function(p) { return p.id === project.id; });

    // Phase 4.5.1: for subsequent saves (UPDATE path), RLS requires us to
    // be the current lock holder. If we're not, the request will return 403
    // and clutter the console. Skip silently — the in-memory state is
    // already updated by the caller, and a future save with the lock will
    // catch up. This commonly happens when an auto-save fires after the
    // user has just checked in.
    if (!isFirstSave && typeof currentProjectLock !== 'undefined' && currentProjectLock) {
      const holderId = currentProjectLock.editing_user_id;
      if (holderId && holderId !== appState.currentUser.id) {
        // Someone else holds the lock — silently skip.
        return { data: project, error: null };
      }
      if (!holderId && !isOwner) {
        // No one holds the lock and we're not the owner — skip (would 403).
        // Owners can always save their own projects via the updated RLS policy.
        return { data: project, error: null };
      }
    }

    // Route to the correct HTTP method based on whether this is a new project.
    //
    // IMPORTANT: Do NOT use POST upsert for existing projects. Supabase evaluates
    // the INSERT RLS policy first on any POST upsert, before conflict resolution
    // kicks in. The INSERT policy requires user_id = auth.uid() (only the owner
    // can create a project row), so a collaborator upsert always fails the INSERT
    // check — even though the UPDATE policy explicitly allows editing_user_id =
    // auth.uid(). The UPDATE policy never gets a chance to run.
    //
    // Fix: use PATCH for existing projects. PATCH only invokes the UPDATE policy,
    // which already permits lock-holding collaborators to write. Never include
    // user_id, editing_user_id, or checked_out_at in the PATCH payload — those
    // are immutable from the client's perspective and managed by the claim_lock /
    // release_lock RPCs.
    let result;
    if (isFirstSave) {
      // New project — INSERT via POST. Sets ownership and initial lock in one shot.
      result = await _restPost('projects', {
        id:              project.id,
        user_id:         appState.currentUser.id,
        created_at:      project.created_at,
        editing_user_id: appState.currentUser.id,
        checked_out_at:  new Date().toISOString(),
        ...payload
      });
    } else {
      // Existing project — UPDATE via PATCH. Checks UPDATE policy only.
      // Collaborators holding the lock satisfy editing_user_id = auth.uid()
      // and can now write successfully.
      result = await _restPatch('projects', payload, 'id=eq.' + encodeURIComponent(project.id));
    }

    if (!result.ok) {
      console.error('[saveProject] error:', result.error,
                    '| status:', result.status,
                    '| user:', appState.currentUser.id,
                    '| project:', project.id);
      return { data: null, error: result.error };
    }

    // Keep in-memory array in sync.
    const idx = savedProjects.findIndex(function(p) { return p.id === project.id; });
    if (idx >= 0) savedProjects[idx] = project; else savedProjects.push(project);
    appState.projects = savedProjects.slice();
    return { data: project, error: null };
  }

  // Anonymous visitor — in-memory only, will not survive a refresh.
  console.warn('[saveProject] No current user — saving in-memory only. Project will be lost on refresh.');
  const idx = savedProjects.findIndex(function(p) { return p.id === project.id; });
  if (idx >= 0) savedProjects[idx] = project; else savedProjects.push(project);
  appState.projects = savedProjects.slice();
  return { data: project, error: null };
}

/**
 * Load all projects for the current user.
 * @returns {Promise<{data: object[], error: string|null}>}
 */
async function loadProjects(userId) {
  if (appState.currentUser) {
    // No user_id filter — RLS handles access control. Returns both owned
    // projects AND shared projects the user is a member of.
    const result = await _restGet('projects', 'select=*&order=updated_at.desc');

    if (!result.ok) {
      console.error('[loadProjects] error:', result.error, '| status:', result.status);
      return { data: [], error: result.error };
    }

    const rows = result.data || [];
    const currentUserId = appState.currentUser && appState.currentUser.id;
    const projects = rows.map(function(row) {
      return Object.assign({
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
        // Phase 3: lock state — null editing_user_id means "available to check out"
        editing_user_id:     row.editing_user_id || null,
        checked_out_at:      row.checked_out_at || null
      }, row.data || {}); // Spread the JSONB data column back to the top level
    });

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

// ── Project lock (check-out / check-in) ─────────────────────
// Phase 3: a project has at most one active editor at a time. To
// modify a project's data, a user must first claim the lock.
// Owner + editor members can claim; viewers cannot. The owner
// additionally has revoke (force-release) power.
//
// All three functions return the wrapper { ok, status, data, error }
// shape from supa-rest. The actual RPC payload is in `data` and may
// contain { success: true } or { error: '...' } for permission errors.

/**
 * Claim the editing lock for a project.
 * Idempotent: succeeds if you already hold the lock.
 * @param {string} projectId
 */
async function claimLock(projectId) {
  return await _restRpc('claim_lock', { p_project_id: projectId });
}

/**
 * Release the lock you hold on a project. Phase 4: this also creates
 * a version snapshot in project_versions, attributed to you, with the
 * comment you provided. The release + snapshot are atomic.
 *
 * @param {string} projectId
 * @param {string} [comment] — optional, what you changed
 */
async function releaseLock(projectId, comment) {
  return await _restRpc('release_lock', {
    p_project_id: projectId,
    p_comment:    comment == null ? null : String(comment)
  });
}

/**
 * List check-in versions for a project (latest first). Filters out the
 * 'checkout' kind snapshots which are bookkeeping for discard_checkout
 * (Phase 4.6) and shouldn't appear in the user-facing history view.
 *
 * @param {string} projectId
 */
async function loadProjectVersions(projectId) {
  return await _restGet('project_versions',
    'select=id,project_id,version_number,checked_in_by,checked_in_at,comment,kind'
    + '&project_id=eq.' + encodeURIComponent(projectId)
    + '&kind=eq.checkin'
    + '&order=version_number.desc');
}

/**
 * Fetch a single version's full snapshot (including the data jsonb
 * blob). Used for "view this version" and Phase 5's revert flow.
 *
 * @param {string} versionId
 */
async function loadProjectVersionSnapshot(versionId) {
  return await _restGet('project_versions',
    'select=*&id=eq.' + encodeURIComponent(versionId));
}

/**
 * Owner force-frees a lock held by another user — non-destructive variant.
 * Phase 5: snapshots the editor's current work as a checkin attributed
 * to them (with a system comment), then frees the lock. Their work is
 * preserved in history.
 * @param {string} projectId
 */
async function revokeLockKeep(projectId) {
  return await _restRpc('revoke_lock_keep', { p_project_id: projectId });
}

/**
 * Owner force-frees a lock held by another user — destructive variant.
 * Phase 5: reverts the project to the editor's pre-checkout snapshot,
 * then frees the lock. The editor's changes since checkout are gone
 * permanently. No checkin row is created.
 * @param {string} projectId
 */
async function revokeLockDiscard(projectId) {
  return await _restRpc('revoke_lock_discard', { p_project_id: projectId });
}

/**
 * Owner reverts the project to a historical version. The reverted-to
 * state replaces the project's current data, and a new checkin entry
 * is created representing the revert action. The original version
 * stays in history (revert isn't destructive of history).
 *
 * Project must NOT be currently checked out.
 * @param {string} projectId
 * @param {number} versionNumber
 */
async function revertProjectToVersion(projectId, versionNumber) {
  return await _restRpc('revert_project_to_version', {
    p_project_id:     projectId,
    p_version_number: versionNumber
  });
}

/**
 * Discard the current checkout — release the lock AND revert any changes
 * made since checkout. Phase 4.6.
 *
 * Implementation: claim_lock writes a 'checkout' snapshot to project_versions
 * when you take the lock. discard_checkout reverts the project's data to that
 * snapshot, deletes the snapshot, and releases the lock. Net effect: as if
 * you never checked out.
 *
 * @param {string} projectId
 */
async function discardCheckout(projectId) {
  return await _restRpc('discard_checkout', { p_project_id: projectId });
}

/**
 * Refresh the lock state for a project. Returns the current
 * editing_user_id, checked_out_at, and updated_at without pulling
 * the full project payload — used by the auto-poll loop to detect
 * lock or content changes cheaply.
 * @param {string} projectId
 */
async function fetchLockState(projectId) {
  return await _restGet('projects',
    'select=editing_user_id,checked_out_at,updated_at&id=eq.' + encodeURIComponent(projectId));
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
