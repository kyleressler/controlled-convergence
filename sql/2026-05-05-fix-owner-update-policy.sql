-- ============================================================
-- Fix: owner can always update their own project, regardless of lock state.
--
-- Background: the Phase 3 lock model replaced the owner-only UPDATE policy
-- with a lock-holder-only policy (USING auth.uid() = editing_user_id).
-- This proved too restrictive — owners were blocked from saving their own
-- projects whenever the lock was null (e.g. after a collaborator checked
-- in via release_lock, which sets editing_user_id = NULL).
--
-- Fix: add owner check back as an OR condition. The lock still coordinates
-- collaboration (claim_lock only succeeds when editing_user_id IS NULL,
-- so only one editor at a time can hold it), but the project owner is
-- never blocked from saving their own work.
-- ============================================================

DROP POLICY IF EXISTS "Lock holder can update projects" ON public.projects;

CREATE POLICY "Owner or lock holder can update projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = editing_user_id);

-- ─────────────────────────────────────────────────────────────
-- DOWN MIGRATION (manual — review before running):
-- ─────────────────────────────────────────────────────────────
--
-- DROP POLICY IF EXISTS "Owner or lock holder can update projects" ON public.projects;
--
-- CREATE POLICY "Lock holder can update projects"
--   ON public.projects FOR UPDATE
--   USING (auth.uid() = editing_user_id);
