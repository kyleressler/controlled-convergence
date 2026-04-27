-- ============================================================
-- Phase 3 migration: check-out / check-in lock model + editor role
--
-- Brings back collaborative editing under a "one editor at a time"
-- model. Introduces:
--   - editing_user_id, checked_out_at columns on projects
--   - 'editor' role added back to project_members CHECK constraint
--   - projects UPDATE policy: only the current lock holder may write
--   - claim_lock / release_lock / revoke_lock RPCs
--   - user_can_take_lock helper (owner + editor members)
--
-- Lock semantics:
--   - editing_user_id NULL  → no one has the lock; project is available
--   - editing_user_id = X   → user X holds the lock and is the only
--                             one who can UPDATE the project
--   - checked_out_at        → when the current lock was claimed
--                             (used for display only; no auto-expiry)
--
-- Project creation: when an owner first INSERTs a project, the client
-- includes editing_user_id = creator_id so they hold the lock immediately.
-- The INSERT policy (owner-only) doesn't care about the lock fields.
--
-- Owner is NOT special at the RLS level — owner must also claim the
-- lock to edit. Owner's only privilege beyond editor is revoke_lock,
-- which lets them forcibly free a stuck checkout.
--
-- Phase 5 will add version snapshots and update revoke_lock to
-- auto-snapshot the current state on the previous holder's behalf.
-- For now, revoke_lock just frees the lock — no version is saved.
-- ============================================================

BEGIN;

-- ── Step 1: add lock columns to projects ─────────────────────
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS editing_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS checked_out_at  TIMESTAMPTZ;

-- ── Step 2: add 'editor' back to the role CHECK constraint ───
ALTER TABLE public.project_members
  DROP CONSTRAINT IF EXISTS project_members_role_check;

ALTER TABLE public.project_members
  ADD CONSTRAINT project_members_role_check
  CHECK (role IN ('owner', 'editor', 'viewer'));

-- ── Step 3: replace UPDATE policy: lock holder only ──────────
DROP POLICY IF EXISTS "Only owners can update projects" ON public.projects;

-- Only the current lock holder can UPDATE the projects row. This
-- includes the owner (who must take the lock like everyone else).
-- The lock holder's identity is set/cleared by claim_lock / release_lock /
-- revoke_lock RPCs (SECURITY DEFINER, bypass this policy).
CREATE POLICY "Lock holder can update projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = editing_user_id);

-- INSERT policy unchanged (owner-only; auth.uid() = user_id).
-- The client includes editing_user_id = auth.uid() in the initial
-- INSERT so the creator immediately holds the lock — no separate
-- claim required for project creation.

-- ── Step 4: helper — can current user take this lock? ────────
-- True if they're the owner or an editor member.
-- Viewers cannot claim the lock (read-only access).
CREATE OR REPLACE FUNCTION public.user_can_take_lock(p_project_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.projects
    WHERE id = p_project_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
      AND role = 'editor'
  );
$$;
REVOKE EXECUTE ON FUNCTION public.user_can_take_lock(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.user_can_take_lock(TEXT) TO authenticated;

-- ── Step 5: claim_lock RPC ───────────────────────────────────
-- Atomically claim the lock if it's free. Returns:
--   { success: true }                              — lock claimed
--   { error: "...", lock_holder_id: <uuid|null> } — claim failed
-- Idempotent: calling when you already hold the lock returns success.
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
BEGIN
  v_can_take := public.user_can_take_lock(p_project_id);
  IF NOT v_can_take THEN
    RETURN jsonb_build_object('error', 'You do not have permission to edit this project');
  END IF;

  -- Atomic conditional UPDATE — succeeds only if the lock is free.
  UPDATE public.projects
  SET editing_user_id = auth.uid(), checked_out_at = NOW()
  WHERE id = p_project_id AND editing_user_id IS NULL
  RETURNING editing_user_id INTO v_claimed_user_id;

  IF v_claimed_user_id IS NOT NULL THEN
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

-- ── Step 6: release_lock RPC ─────────────────────────────────
-- Release the lock if I currently hold it.
-- Phase 4 will make this also create a version snapshot.
CREATE OR REPLACE FUNCTION public.release_lock(p_project_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  UPDATE public.projects
  SET editing_user_id = NULL, checked_out_at = NULL
  WHERE id = p_project_id AND editing_user_id = auth.uid();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count = 0 THEN
    RETURN jsonb_build_object('error', 'You do not hold the lock on this project');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.release_lock(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.release_lock(TEXT) TO authenticated;

-- ── Step 7: revoke_lock RPC ──────────────────────────────────
-- Owner force-frees the lock regardless of who holds it.
-- Phase 3: just clears the lock. Phase 5 will additionally auto-snapshot
-- the current state attributed to the previous holder.
CREATE OR REPLACE FUNCTION public.revoke_lock(p_project_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_owner BOOLEAN;
BEGIN
  SELECT (user_id = auth.uid()) INTO v_is_owner
    FROM public.projects WHERE id = p_project_id;

  IF v_is_owner IS NULL THEN
    RETURN jsonb_build_object('error', 'Project not found');
  END IF;
  IF v_is_owner IS FALSE THEN
    RETURN jsonb_build_object('error', 'Only the project owner can revoke a checkout');
  END IF;

  UPDATE public.projects
  SET editing_user_id = NULL, checked_out_at = NULL
  WHERE id = p_project_id;

  RETURN jsonb_build_object('success', true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.revoke_lock(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.revoke_lock(TEXT) TO authenticated;

COMMIT;

-- ─────────────────────────────────────────────────────────────
-- DOWN MIGRATION (manual — review before running):
-- ─────────────────────────────────────────────────────────────
--
-- BEGIN;
--
-- DROP FUNCTION IF EXISTS public.claim_lock(TEXT);
-- DROP FUNCTION IF EXISTS public.release_lock(TEXT);
-- DROP FUNCTION IF EXISTS public.revoke_lock(TEXT);
-- DROP FUNCTION IF EXISTS public.user_can_take_lock(TEXT);
--
-- DROP POLICY IF EXISTS "Lock holder can update projects" ON public.projects;
-- CREATE POLICY "Only owners can update projects"
--   ON public.projects FOR UPDATE
--   USING (auth.uid() = user_id);
--
-- ALTER TABLE public.project_members
--   DROP CONSTRAINT IF EXISTS project_members_role_check;
-- ALTER TABLE public.project_members
--   ADD CONSTRAINT project_members_role_check
--   CHECK (role IN ('owner', 'viewer'));
--
-- ALTER TABLE public.projects
--   DROP COLUMN IF EXISTS editing_user_id,
--   DROP COLUMN IF EXISTS checked_out_at;
--
-- COMMIT;
