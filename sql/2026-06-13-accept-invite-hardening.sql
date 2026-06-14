-- ============================================================
-- accept_project_invite hardening + version history RLS tightening
--
-- Fix 1 (race condition): Lock the user_profiles row with FOR UPDATE
--   before the collab-limit count so two simultaneous accepts from the
--   same user cannot both pass the limit check and both insert.
--
-- Fix 2 (role downgrade): Only update role on conflict if the new role
--   outranks the existing one. Prevents a stale or duplicate invite
--   from silently demoting an editor back to viewer.
--
-- Fix 3 (version history RLS): Restrict project_versions SELECT to
--   owners and editors only. Viewers can see the current project state
--   but not the full historical audit trail.
-- ============================================================

-- ── Fix 1 + 2: replace accept_project_invite ─────────────────

CREATE OR REPLACE FUNCTION public.accept_project_invite(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task         public.tasks%ROWTYPE;
  v_project_id   TEXT;
  v_role         TEXT;
  v_user_tier    TEXT;
  v_collab_count INTEGER;
  v_collab_limit INTEGER;
BEGIN
  -- Fetch and validate the task
  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id;
  IF NOT FOUND                           THEN RETURN jsonb_build_object('error', 'Task not found'); END IF;
  IF v_task.task_type <> 'collab_invite' THEN RETURN jsonb_build_object('error', 'Not an invite task'); END IF;
  IF v_task.assignee_id <> auth.uid()   THEN RETURN jsonb_build_object('error', 'Not authorized'); END IF;
  IF v_task.status <> 'pending'         THEN RETURN jsonb_build_object('error', 'Invite is no longer pending'); END IF;

  -- Pull project_id and role out of the task payload
  v_project_id := v_task.payload->>'project_id';
  v_role       := v_task.payload->>'role';
  IF v_project_id IS NULL OR v_role IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid invite payload');
  END IF;

  -- ── Collaboration limit check (atomic) ──────────────────────
  -- FOR UPDATE locks the user_profiles row for this transaction so
  -- two simultaneous accepts cannot both pass the limit check.
  SELECT tier INTO v_user_tier
    FROM public.user_profiles
    WHERE id = auth.uid()
    FOR UPDATE;

  IF v_user_tier = 'pro' OR v_user_tier = 'admin' THEN
    v_collab_limit := 2147483647;
  ELSE
    v_collab_limit := 3;
  END IF;

  SELECT COUNT(*) INTO v_collab_count
    FROM public.project_members
    WHERE user_id = auth.uid();

  IF v_collab_count >= v_collab_limit THEN
    RETURN jsonb_build_object('error', 'collab_limit_reached');
  END IF;
  -- ────────────────────────────────────────────────────────────

  -- Add to project_members.
  -- On conflict, only update the role if the incoming role outranks the
  -- existing one (editor > viewer). Prevents a stale or duplicate invite
  -- from silently demoting an editor back to viewer.
  INSERT INTO public.project_members (project_id, user_id, role, invited_by)
  VALUES (v_project_id, auth.uid(), v_role, v_task.assigner_id)
  ON CONFLICT (project_id, user_id) DO UPDATE
    SET role = EXCLUDED.role
    WHERE (CASE EXCLUDED.role          WHEN 'editor' THEN 2 WHEN 'viewer' THEN 1 ELSE 0 END)
        > (CASE project_members.role   WHEN 'editor' THEN 2 WHEN 'viewer' THEN 1 ELSE 0 END);

  -- Mark the task accepted
  UPDATE public.tasks SET status = 'accepted' WHERE id = p_task_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_project_invite(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.accept_project_invite(UUID) TO authenticated;


-- ── Fix 3: tighten project_versions RLS ──────────────────────
-- Viewers can see the live project state but not the historical audit
-- trail. Restrict version history to owners and editors only.

DROP POLICY IF EXISTS "Members can view project versions" ON public.project_versions;

CREATE POLICY "Owners and editors can view project versions"
  ON public.project_versions FOR SELECT
  USING (
    -- Project owner
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND p.user_id = auth.uid()
    )
    OR
    -- Editor collaborator
    EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = project_id
        AND pm.user_id = auth.uid()
        AND pm.role = 'editor'
    )
  );


-- ─────────────────────────────────────────────────────────────
-- DOWN MIGRATION (manual — review before running):
-- ─────────────────────────────────────────────────────────────
--
-- Restore original accept_project_invite (without FOR UPDATE and with
-- unconditional upsert) from supabase-schema.sql.
--
-- DROP POLICY IF EXISTS "Owners and editors can view project versions"
--   ON public.project_versions;
-- CREATE POLICY "Members can view project versions"
--   ON public.project_versions FOR SELECT
--   USING (
--     EXISTS (
--       SELECT 1 FROM public.projects p
--       WHERE p.id = project_id
--         AND (p.user_id = auth.uid() OR public.user_has_project_access(p.id))
--     )
--   );
