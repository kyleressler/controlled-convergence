-- ============================================================
-- Phase 4.6 migration: discard checkout (revert to pre-checkout state)
--
-- Adds the ability for the lock holder to abandon a checkout without
-- creating a check-in version, AND have any changes they made since
-- checkout reverted on the server.
--
-- Background on what changes vs. what stays:
--   Saves are still autosaved on every mutation (live writes to projects).
--   Check-in still creates a 'checkin' snapshot in project_versions.
--   What's NEW: claim_lock now ALSO writes a 'checkout' snapshot
--   (kind='checkout') so we have a known-good state to revert to if the
--   user discards their checkout.
--
-- Database changes:
--   1. Add `kind` column to project_versions ('checkin' default, 'checkout' for snapshots
--      created by claim_lock).
--   2. claim_lock RPC: in addition to setting the lock fields, INSERT a
--      kind='checkout' snapshot of the project's current state.
--   3. discard_checkout RPC (new): finds the most recent kind='checkout'
--      snapshot for this project, reverts the project's data fields to it,
--      releases the lock, and deletes the checkout snapshot.
--   4. release_lock keeps writing kind='checkin' (default value). On
--      successful check-in, also delete the matching checkout snapshot
--      (no longer needed, prevents accumulation).
--
-- History view filter: clients should query project_versions with
-- kind='checkin' to avoid showing the bookkeeping checkout snapshots.
-- ============================================================

BEGIN;

-- ── Step 1: add kind column ──────────────────────────────────
-- Existing rows are check-in snapshots — default value covers them.
ALTER TABLE public.project_versions
  ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'checkin'
  CHECK (kind IN ('checkin', 'checkout'));

-- Useful index for "find most recent checkout for this project by this user"
CREATE INDEX IF NOT EXISTS project_versions_checkout_idx
  ON public.project_versions (project_id, checked_in_by, kind, version_number DESC)
  WHERE kind = 'checkout';

-- ── Step 2: replace claim_lock to also write a checkout snapshot ─
DROP FUNCTION IF EXISTS public.claim_lock(TEXT);

CREATE OR REPLACE FUNCTION public.claim_lock(p_project_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_can_take          BOOLEAN;
  v_claimed_user_id   UUID;
  v_existing_holder   UUID;
  v_project           public.projects%ROWTYPE;
  v_next_version      INTEGER;
BEGIN
  v_can_take := public.user_can_take_lock(p_project_id);
  IF NOT v_can_take THEN
    RETURN jsonb_build_object('error', 'You do not have permission to edit this project');
  END IF;

  -- Atomic conditional UPDATE — succeeds only if the lock is free.
  UPDATE public.projects
  SET editing_user_id = auth.uid(), checked_out_at = NOW()
  WHERE id = p_project_id AND editing_user_id IS NULL
  RETURNING * INTO v_project;

  IF v_project.id IS NOT NULL THEN
    -- Claimed successfully. Now write a checkout snapshot so discard_checkout
    -- has a known-good state to revert to.
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
      auth.uid(),
      'system: checkout snapshot',
      'checkout'
    );

    RETURN jsonb_build_object('success', true);
  END IF;

  -- The conditional UPDATE didn't match — find out who actually holds it.
  SELECT editing_user_id INTO v_existing_holder
    FROM public.projects WHERE id = p_project_id;

  IF v_existing_holder = auth.uid() THEN
    -- We already hold it — treat as idempotent success.
    RETURN jsonb_build_object('success', true);
  END IF;

  RETURN jsonb_build_object(
    'error',          'Project is already checked out by another user',
    'lock_holder_id', v_existing_holder
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.claim_lock(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.claim_lock(TEXT) TO authenticated;

-- ── Step 3: replace release_lock to clean up matching checkout snapshot ─
DROP FUNCTION IF EXISTS public.release_lock(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.release_lock(p_project_id TEXT, p_comment TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project       public.projects%ROWTYPE;
  v_next_version  INTEGER;
  v_holder_id     UUID;
BEGIN
  -- Fetch project + verify caller holds the lock.
  SELECT * INTO v_project FROM public.projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Project not found');
  END IF;
  IF v_project.editing_user_id <> auth.uid() THEN
    RETURN jsonb_build_object('error', 'You do not hold the lock on this project');
  END IF;
  v_holder_id := v_project.editing_user_id;

  -- Determine the next version_number for this project.
  SELECT COALESCE(MAX(version_number), 0) + 1
    INTO v_next_version
    FROM public.project_versions
    WHERE project_id = p_project_id;

  -- Build the snapshot from the current row. Includes data jsonb and
  -- the small set of top-level columns the frontend reads.
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
    NULLIF(TRIM(p_comment), ''),
    'checkin'
  );

  -- Cleanup: remove the checkout snapshot for this user/project (if any).
  -- Now that we've successfully checked in, we don't need the pre-checkout
  -- state anymore. Prevents accumulation of one-shot checkout snapshots.
  DELETE FROM public.project_versions
  WHERE project_id = p_project_id
    AND checked_in_by = v_holder_id
    AND kind = 'checkout';

  -- Release the lock.
  UPDATE public.projects
  SET editing_user_id = NULL, checked_out_at = NULL
  WHERE id = p_project_id;

  RETURN jsonb_build_object('success', true, 'version_number', v_next_version);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.release_lock(TEXT, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.release_lock(TEXT, TEXT) TO authenticated;

-- ── Step 4: new discard_checkout RPC ──────────────────────────
-- Reverts the project's data fields to the most recent checkout snapshot
-- for this user, then releases the lock and deletes the snapshot.
CREATE OR REPLACE FUNCTION public.discard_checkout(p_project_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project    public.projects%ROWTYPE;
  v_snapshot   JSONB;
  v_snap_id    UUID;
BEGIN
  -- Verify caller holds the lock on this project.
  SELECT * INTO v_project FROM public.projects WHERE id = p_project_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Project not found');
  END IF;
  IF v_project.editing_user_id <> auth.uid() THEN
    RETURN jsonb_build_object('error', 'You do not hold the lock on this project');
  END IF;

  -- Find the most recent checkout snapshot for this user.
  SELECT id, snapshot INTO v_snap_id, v_snapshot
    FROM public.project_versions
    WHERE project_id    = p_project_id
      AND checked_in_by = auth.uid()
      AND kind          = 'checkout'
    ORDER BY version_number DESC
    LIMIT 1;

  IF v_snap_id IS NULL THEN
    -- No checkout snapshot exists — just release the lock without revert.
    -- This shouldn't normally happen but is a graceful fallback.
    UPDATE public.projects
    SET editing_user_id = NULL, checked_out_at = NULL
    WHERE id = p_project_id;
    RETURN jsonb_build_object('success', true, 'reverted', false);
  END IF;

  -- Revert the project's data fields to the checkout snapshot.
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
REVOKE EXECUTE ON FUNCTION public.discard_checkout(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.discard_checkout(TEXT) TO authenticated;

COMMIT;

-- ─────────────────────────────────────────────────────────────
-- DOWN MIGRATION (manual — review before running):
-- ─────────────────────────────────────────────────────────────
--
-- BEGIN;
-- DROP FUNCTION IF EXISTS public.discard_checkout(TEXT);
-- DROP INDEX IF EXISTS public.project_versions_checkout_idx;
-- ALTER TABLE public.project_versions DROP COLUMN IF EXISTS kind;
-- -- (claim_lock and release_lock would need to be restored to their pre-4.6
-- -- versions — see 2026-04-26-phase-3-lock-model.sql and the phase-4 migration.)
-- COMMIT;
