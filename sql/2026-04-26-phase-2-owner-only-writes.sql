-- ============================================================
-- Phase 2 migration: collapse to owner-only writes
--
-- Background: the previous model allowed three writer roles —
-- owner, editor, scoped_editor. In practice this proved fragile
-- (concurrent-edit risk, complex permission logic) and we're moving
-- to a check-out / check-in lock model in Phase 3 instead.
--
-- This migration:
--   1. Converts any remaining 'editor' or 'scoped_editor' rows in
--      project_members to 'viewer'. (Defensive — Kyle wiped all
--      project_members rows before running this, so should be no-op.)
--   2. Updates the project_members.role CHECK constraint to only
--      allow 'owner' and 'viewer'. The 'editor' role returns in
--      Phase 3 with check-out support.
--   3. Drops the projects UPDATE/INSERT policies that allowed
--      editors and scoped_editors to write. Replaces with owner-only.
--   4. Drops the tasks UPDATE policy that allowed scoped editors to
--      modify assigned tasks. (Tasks become read-only messages —
--      assignees can update their OWN tasks via a separate policy
--      not affected here.)
--   5. Drops the user_can_edit_project helper function (no longer
--      referenced).
--   6. Drops the grant_task_project_access RPC (it inserted
--      scoped_editor rows; that role no longer exists).
--
-- KEPT INTENTIONALLY:
--   - accept_project_invite RPC. It pulls 'role' from the task
--     payload and INSERTs into project_members. With the new CHECK
--     constraint, only 'viewer' is valid; any other role will fail
--     at the DB level. The client only sends 'viewer' going forward.
--     Phase 3 will modify this function (or the constraint) to
--     allow 'editor' again.
--
-- Reversibility: see the matching down migration in comments at the
-- end of this file. We don't run the down automatically — if rollback
-- is needed it requires manual review.
-- ============================================================

BEGIN;

-- ── Step 1: convert existing rows to viewer ──────────────────
-- Defensive — should be 0 rows after Kyle's cleanup.
UPDATE public.project_members
SET role = 'viewer'
WHERE role IN ('editor', 'scoped_editor');

-- ── Step 2: tighten the CHECK constraint ─────────────────────
ALTER TABLE public.project_members
  DROP CONSTRAINT IF EXISTS project_members_role_check;

ALTER TABLE public.project_members
  ADD CONSTRAINT project_members_role_check
  CHECK (role IN ('owner', 'viewer'));

-- ── Step 3: replace projects write policies ──────────────────
DROP POLICY IF EXISTS "Owners and editors can update projects"             ON public.projects;
DROP POLICY IF EXISTS "Owners and editors can insert or upsert projects"   ON public.projects;

-- Owner-only UPDATE
CREATE POLICY "Only owners can update projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

-- Owner-only INSERT (user_id must match the inserter)
CREATE POLICY "Only owners can insert projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── Step 4: drop scoped-editor task UPDATE policy ────────────
DROP POLICY IF EXISTS "Scoped editors can update assigned tasks" ON public.tasks;

-- ── Step 5: drop user_can_edit_project helper ────────────────
DROP FUNCTION IF EXISTS public.user_can_edit_project(TEXT);

-- ── Step 6: drop grant_task_project_access RPC ───────────────
DROP FUNCTION IF EXISTS public.grant_task_project_access(UUID);

COMMIT;

-- ─────────────────────────────────────────────────────────────
-- DOWN MIGRATION (manual — review before running):
-- ─────────────────────────────────────────────────────────────
--
-- BEGIN;
--
-- ALTER TABLE public.project_members
--   DROP CONSTRAINT IF EXISTS project_members_role_check;
-- ALTER TABLE public.project_members
--   ADD CONSTRAINT project_members_role_check
--   CHECK (role IN ('owner', 'editor', 'scoped_editor', 'viewer'));
--
-- DROP POLICY IF EXISTS "Only owners can update projects" ON public.projects;
-- DROP POLICY IF EXISTS "Only owners can insert projects" ON public.projects;
--
-- CREATE OR REPLACE FUNCTION public.user_can_edit_project(p_project_id TEXT)
-- RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
--   SELECT EXISTS (
--     SELECT 1 FROM public.project_members
--     WHERE project_id = p_project_id
--       AND user_id = auth.uid()
--       AND role IN ('editor', 'scoped_editor')
--   );
-- $$;
-- REVOKE EXECUTE ON FUNCTION public.user_can_edit_project(TEXT) FROM PUBLIC;
-- GRANT  EXECUTE ON FUNCTION public.user_can_edit_project(TEXT) TO authenticated;
--
-- CREATE POLICY "Owners and editors can update projects"
--   ON public.projects FOR UPDATE
--   USING (auth.uid() = user_id OR public.user_can_edit_project(id));
--
-- CREATE POLICY "Owners and editors can insert or upsert projects"
--   ON public.projects FOR INSERT
--   WITH CHECK (auth.uid() = user_id OR public.user_can_edit_project(id));
--
-- CREATE POLICY "Scoped editors can update assigned tasks"
--   ON public.tasks FOR UPDATE
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.project_members
--       WHERE project_members.project_id = tasks.project_id
--         AND project_members.user_id = auth.uid()
--         AND project_members.role = 'scoped_editor'
--     )
--     AND auth.uid() = assignee_id
--   );
--
-- (grant_task_project_access body would also need to be restored.)
--
-- COMMIT;
