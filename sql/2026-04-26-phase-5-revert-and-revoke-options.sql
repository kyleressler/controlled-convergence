-- ============================================================
-- Phase 5 migration: revert + non/destructive revoke options
--
-- 1. Splits revoke_lock into two RPCs:
--      revoke_lock_keep    — non-destructive. Snapshots the editor's
--                            current work as a checkin attributed to them,
--                            then frees the lock. Their changes live in
--                            history, no work lost.
--      revoke_lock_discard — destructive. Reverts the project to the
--                            checkout snapshot (pre-checkout state),
--                            then frees the lock. Editor's changes since
--                            checkout are permanently deleted.
--
--    Both replace the previous single revoke_lock — that gets dropped.
--    Owner-only; verified inside each function.
--
-- 2. New revert_project_to_version(p_project_id, p_version_number) RPC.
--    Owner-only. Project must NOT be currently checked out (a revert
--    while someone is editing would conflict). Loads the snapshot for
--    the given version, sets projects.data to it, creates a NEW checkin
--    version attributed to the owner with comment 'Reverted to version X'.
--    The reverted-to version stays in history so the owner can navigate
--    back and forth via the history modal.
-- ============================================================

BEGIN;

-- ── Drop the old single revoke_lock ──────────────────────────
DROP FUNCTION IF EXISTS public.revoke_lock(TEXT);

-- ── revoke_lock_keep: non-destructive ────────────────────────
-- Owner snapshots the editor's current work as a checkin attributed
-- to the editor (not the owner doing the revoke), with a system
-- comment noting the auto-checkin context. Then frees the lock.
CREATE OR REPLACE FUNCTION public.revoke_lock_keep(p_project_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project       public.projects%ROWTYPE;
  v_holder_id     UUID;
  v_next_version  INTEGER;
  v_is_owner      BOOLEAN;
BEGIN
  SELECT * INTO v_project FROM public.projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Project not found');
  END IF;

  v_is_owner := (v_project.user_id = auth.uid());
  IF NOT v_is_owner THEN
    RETURN jsonb_build_object('error', 'Only the project owner can revoke a checkout');
  END IF;

  v_holder_id := v_project.editing_user_id;
  IF v_holder_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Project is not currently checked out');
  END IF;

  -- Snapshot current state as a checkin attributed to the previous holder.
  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_version
    FROM public.project_versions
    WHERE project_id = p_project_id;

  INSERT INTO public.project_versions
    (project_id, version_number, snapshot, checked_in_by, comment, kind)
  VALUES (
    p_project_id,
    v_next_version,
    jsonb_build_object(
      'name',        v_project.name,
      'owner',       v_project.owner,
      'description', v_project.description,
      'data',        v_project.data,
      'updated_at',  v_project.updated_at
    ),
    v_holder_id,
    'system: owner revoked checkout — changes preserved',
    'checkin'
  );

  -- Clean up the matching checkout snapshot (no longer needed).
  DELETE FROM public.project_versions
  WHERE project_id    = p_project_id
    AND checked_in_by = v_holder_id
    AND kind          = 'checkout';

  -- Free the lock.
  UPDATE public.projects
  SET editing_user_id = NULL, checked_out_at = NULL
  WHERE id = p_project_id;

  RETURN jsonb_build_object('success', true, 'version_number', v_next_version);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.revoke_lock_keep(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.revoke_lock_keep(TEXT) TO authenticated;

-- ── revoke_lock_discard: destructive ─────────────────────────
-- Reverts the project to the editor's pre-checkout snapshot, then
-- frees the lock. Editor's changes are gone — no checkin row created.
CREATE OR REPLACE FUNCTION public.revoke_lock_discard(p_project_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project    public.projects%ROWTYPE;
  v_holder_id  UUID;
  v_snapshot   JSONB;
  v_snap_id    UUID;
  v_is_owner   BOOLEAN;
BEGIN
  SELECT * INTO v_project FROM public.projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Project not found');
  END IF;

  v_is_owner := (v_project.user_id = auth.uid());
  IF NOT v_is_owner THEN
    RETURN jsonb_build_object('error', 'Only the project owner can revoke a checkout');
  END IF;

  v_holder_id := v_project.editing_user_id;
  IF v_holder_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Project is not currently checked out');
  END IF;

  -- Find the checkout snapshot for the current holder.
  SELECT id, snapshot INTO v_snap_id, v_snapshot
    FROM public.project_versions
    WHERE project_id    = p_project_id
      AND checked_in_by = v_holder_id
      AND kind          = 'checkout'
    ORDER BY version_number DESC
    LIMIT 1;

  IF v_snap_id IS NULL THEN
    -- No checkout snapshot — fall back to just freeing the lock without revert.
    -- (Shouldn't normally happen since claim_lock always creates one.)
    UPDATE public.projects
    SET editing_user_id = NULL, checked_out_at = NULL
    WHERE id = p_project_id;
    RETURN jsonb_build_object('success', true, 'reverted', false);
  END IF;

  -- Revert the project's data to the checkout snapshot, then free the lock.
  UPDATE public.projects
  SET name        = COALESCE(v_snapshot->>'name', name),
      owner       = COALESCE(v_snapshot->>'owner', owner),
      description = COALESCE(v_snapshot->>'description', description),
      data        = COALESCE(v_snapshot->'data', data),
      editing_user_id = NULL,
      checked_out_at  = NULL,
      updated_at      = NOW()
  WHERE id = p_project_id;

  -- Delete the checkout snapshot — its job is done.
  DELETE FROM public.project_versions WHERE id = v_snap_id;

  RETURN jsonb_build_object('success', true, 'reverted', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.revoke_lock_discard(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.revoke_lock_discard(TEXT) TO authenticated;

-- ── revert_project_to_version ────────────────────────────────
-- Owner picks a historical version from the history modal and reverts.
-- The reverted-to state replaces the project's current data. A new
-- checkin version is created attributed to the owner with a comment
-- recording the source version, so the action is itself in history.
-- The original version stays in history (revert isn't destructive).
CREATE OR REPLACE FUNCTION public.revert_project_to_version(
  p_project_id     TEXT,
  p_version_number INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project       public.projects%ROWTYPE;
  v_target        public.project_versions%ROWTYPE;
  v_next_version  INTEGER;
  v_is_owner      BOOLEAN;
BEGIN
  SELECT * INTO v_project FROM public.projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Project not found');
  END IF;

  v_is_owner := (v_project.user_id = auth.uid());
  IF NOT v_is_owner THEN
    RETURN jsonb_build_object('error', 'Only the project owner can revert');
  END IF;

  -- Don't allow revert while someone (including the owner) holds the lock.
  -- Editing in progress + revert would create lost-update conflicts.
  IF v_project.editing_user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'error',
      'Project is currently checked out — check in or revoke first, then try again.'
    );
  END IF;

  -- Find the target version. Restrict to checkin kind (history only shows
  -- checkin entries, but defensive in case a checkout id was passed).
  SELECT * INTO v_target
    FROM public.project_versions
    WHERE project_id     = p_project_id
      AND version_number = p_version_number
      AND kind           = 'checkin';

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Version not found');
  END IF;

  -- Apply the snapshot to the project.
  UPDATE public.projects
  SET name        = COALESCE(v_target.snapshot->>'name', name),
      owner       = COALESCE(v_target.snapshot->>'owner', owner),
      description = COALESCE(v_target.snapshot->>'description', description),
      data        = COALESCE(v_target.snapshot->'data', data),
      updated_at  = NOW()
  WHERE id = p_project_id;

  -- Create a new checkin version representing the revert action.
  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_version
    FROM public.project_versions
    WHERE project_id = p_project_id;

  INSERT INTO public.project_versions
    (project_id, version_number, snapshot, checked_in_by, comment, kind)
  VALUES (
    p_project_id,
    v_next_version,
    v_target.snapshot,
    auth.uid(),
    'Reverted to version ' || p_version_number,
    'checkin'
  );

  RETURN jsonb_build_object(
    'success', true,
    'reverted_to', p_version_number,
    'new_version', v_next_version
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.revert_project_to_version(TEXT, INTEGER) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.revert_project_to_version(TEXT, INTEGER) TO authenticated;

COMMIT;

-- ─────────────────────────────────────────────────────────────
-- DOWN MIGRATION (manual — review before running):
-- ─────────────────────────────────────────────────────────────
--
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.revoke_lock_keep(TEXT);
-- DROP FUNCTION IF EXISTS public.revoke_lock_discard(TEXT);
-- DROP FUNCTION IF EXISTS public.revert_project_to_version(TEXT, INTEGER);
--
-- CREATE OR REPLACE FUNCTION public.revoke_lock(p_project_id TEXT) ...
-- (paste the Phase 3 revoke_lock body here)
--
-- COMMIT;
