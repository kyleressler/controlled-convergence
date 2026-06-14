-- ============================================================
-- Fix 5: Tighten tasks INSERT policy — scoring and req_review
--         tasks must be created by the project owner.
--
-- The previous policy only checked auth.uid() = assigner_id,
-- meaning any collaborator could create scoring or req_review
-- tasks for a project they merely have access to. This adds a
-- server-side ownership check for those two task types.
--
-- collab_invite is not restricted here because collaborators
-- can legitimately forward or re-invite; tier enforcement is
-- handled by the enforce_invite_tier trigger (2026-06-13-invite-security.sql).
--
-- Fix 7: Task cleanup function
--         Deletes task rows that are stale: declined or expired
--         tasks older than 30 days. Safe to run repeatedly.
--         Schedule via Supabase pg_cron or call manually.
-- ============================================================


-- ── Fix 5: Replace tasks INSERT policy ───────────────────────

DROP POLICY IF EXISTS "Assigners can create tasks" ON public.tasks;

CREATE POLICY "Assigners can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    auth.uid() = assigner_id
    AND assigner_id <> assignee_id
    AND (
      -- collab_invite: any member can create (tier enforced by trigger)
      task_type = 'collab_invite'
      OR
      -- scoring / req_review: only the project owner may assign work
      (
        task_type IN ('scoring', 'req_review')
        AND EXISTS (
          SELECT 1 FROM public.projects p
          WHERE p.id = (payload->>'project_id')
            AND p.user_id = auth.uid()
        )
      )
    )
  );


-- ── Fix 7: Stale task cleanup ─────────────────────────────────
-- Removes:
--   • tasks with status='declined' older than 30 days
--   • tasks with status='pending' and expires_at in the past
--     older than 30 days (definitively abandoned invites)
--   • tasks with status='completed' older than 90 days
--     (keep recent completed tasks for audit; purge old ones)
--
-- To schedule with pg_cron (enable the extension in Supabase
-- Dashboard → Database → Extensions first):
--
--   SELECT cron.schedule(
--     'cleanup-stale-tasks',
--     '0 3 * * *',   -- 3 AM UTC daily
--     $$ SELECT public.cleanup_stale_tasks(); $$
--   );

CREATE OR REPLACE FUNCTION public.cleanup_stale_tasks()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_declined  INTEGER;
  v_expired   INTEGER;
  v_completed INTEGER;
BEGIN
  -- Declined tasks older than 30 days
  WITH deleted AS (
    DELETE FROM public.tasks
    WHERE status = 'declined'
      AND created_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_declined FROM deleted;

  -- Pending-but-expired tasks older than 30 days
  WITH deleted AS (
    DELETE FROM public.tasks
    WHERE status = 'pending'
      AND expires_at IS NOT NULL
      AND expires_at < NOW()
      AND created_at < NOW() - INTERVAL '30 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_expired FROM deleted;

  -- Completed tasks older than 90 days
  WITH deleted AS (
    DELETE FROM public.tasks
    WHERE status = 'completed'
      AND created_at < NOW() - INTERVAL '90 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_completed FROM deleted;

  RETURN jsonb_build_object(
    'declined_deleted',  v_declined,
    'expired_deleted',   v_expired,
    'completed_deleted', v_completed
  );
END;
$$;

-- Only admins and service-role callers should run cleanup.
REVOKE EXECUTE ON FUNCTION public.cleanup_stale_tasks() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.cleanup_stale_tasks() TO service_role;


-- ─────────────────────────────────────────────────────────────
-- DOWN MIGRATION (manual — review before running):
-- ─────────────────────────────────────────────────────────────
--
-- DROP POLICY IF EXISTS "Assigners can create tasks" ON public.tasks;
-- CREATE POLICY "Assigners can create tasks"
--   ON public.tasks FOR INSERT
--   WITH CHECK (
--     auth.uid() = assigner_id
--     AND assigner_id <> assignee_id
--   );
--
-- DROP FUNCTION IF EXISTS public.cleanup_stale_tasks();
