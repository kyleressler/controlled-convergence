-- ============================================================
-- Invite security: server-side tier enforcement + self-invite guard
--
-- C-1: Add a BEFORE INSERT trigger on tasks that rejects collab_invite
--      tasks with role='editor' when the assigner's tier is not 'pro'
--      or 'admin'. The client already gates this, but without a server-
--      side check a compromised or outdated client could bypass it.
--      "At invite time" semantics: the inviter's tier is evaluated when
--      the invite task is created, not when the invitee accepts.
--
-- H-1: Tighten the tasks INSERT policy to block self-invitations
--      (assigner_id = assignee_id). The client already guards this but
--      a direct API call could bypass it. The constraint is simple and
--      has no legitimate exception.
-- ============================================================

-- ── C-1: Trigger function ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.validate_collab_invite()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inviter_tier TEXT;
BEGIN
  -- Only apply to collab_invite tasks offering the editor role.
  IF NEW.task_type = 'collab_invite' AND (NEW.payload->>'role') = 'editor' THEN
    SELECT tier INTO v_inviter_tier
      FROM public.user_profiles
      WHERE id = NEW.assigner_id;

    IF v_inviter_tier NOT IN ('pro', 'admin') THEN
      RAISE EXCEPTION 'editor_invite_requires_pro'
        USING HINT = 'Upgrade to Pro to invite editors.',
              ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_collab_invite() FROM PUBLIC;

DROP TRIGGER IF EXISTS enforce_invite_tier ON public.tasks;

CREATE TRIGGER enforce_invite_tier
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_collab_invite();


-- ── H-1: Block self-invitations at policy level ───────────────

DROP POLICY IF EXISTS "Assigners can create tasks" ON public.tasks;

CREATE POLICY "Assigners can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (
    auth.uid() = assigner_id
    AND assigner_id <> assignee_id
  );


-- ─────────────────────────────────────────────────────────────
-- DOWN MIGRATION (manual — review before running):
-- ─────────────────────────────────────────────────────────────
--
-- DROP TRIGGER IF EXISTS enforce_invite_tier ON public.tasks;
-- DROP FUNCTION IF EXISTS public.validate_collab_invite();
--
-- DROP POLICY IF EXISTS "Assigners can create tasks" ON public.tasks;
-- CREATE POLICY "Assigners can create tasks"
--   ON public.tasks FOR INSERT
--   WITH CHECK (auth.uid() = assigner_id);
