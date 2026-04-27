-- ============================================================
-- Phase 4 migration: version snapshots on check-in
--
-- Every check-in now creates a permanent version snapshot in a new
-- project_versions table. The snapshot is the entire project state
-- (data jsonb + name/owner/description) at the moment of check-in,
-- attributed to whoever held the lock, with an optional comment.
--
-- Modified release_lock RPC takes an additional p_comment argument and
-- atomically (in one transaction):
--   1. Inserts a new project_versions row with the current snapshot
--   2. Increments version_number for this project
--   3. Releases the lock (editing_user_id = NULL)
--
-- Phase 5 will use the same project_versions table for "revert to
-- version" and for revoke_lock to auto-snapshot the previous holder's
-- work attributed to them.
-- ============================================================

BEGIN;

-- ── Step 1: project_versions table ───────────────────────────
CREATE TABLE IF NOT EXISTS public.project_versions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      TEXT        NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  version_number  INTEGER     NOT NULL,
  snapshot        JSONB       NOT NULL,
  checked_in_by   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  checked_in_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  comment         TEXT,
  -- Each project's versions are numbered 1, 2, 3, ... — uniqueness enforced.
  UNIQUE (project_id, version_number)
);

CREATE INDEX IF NOT EXISTS project_versions_project_idx
  ON public.project_versions (project_id, version_number DESC);

-- ── Step 2: RLS — same access as the parent project ──────────
ALTER TABLE public.project_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view project versions" ON public.project_versions;
CREATE POLICY "Members can view project versions"
  ON public.project_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (p.user_id = auth.uid() OR public.user_has_project_access(p.id))
    )
  );

-- INSERT only happens via the SECURITY DEFINER release_lock function.
-- No public INSERT policy — direct INSERTs are denied.

-- ── Step 3: replace release_lock with comment + snapshot ─────
DROP FUNCTION IF EXISTS public.release_lock(TEXT);

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
    (project_id, version_number, snapshot, checked_in_by, comment)
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
    NULLIF(TRIM(p_comment), '')
  );

  -- Release the lock.
  UPDATE public.projects
  SET editing_user_id = NULL, checked_out_at = NULL
  WHERE id = p_project_id;

  RETURN jsonb_build_object('success', true, 'version_number', v_next_version);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.release_lock(TEXT, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.release_lock(TEXT, TEXT) TO authenticated;

COMMIT;

-- ─────────────────────────────────────────────────────────────
-- DOWN MIGRATION (manual — review before running):
-- ─────────────────────────────────────────────────────────────
--
-- BEGIN;
--
-- DROP FUNCTION IF EXISTS public.release_lock(TEXT, TEXT);
-- CREATE OR REPLACE FUNCTION public.release_lock(p_project_id TEXT)
-- RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
-- DECLARE v_count INT;
-- BEGIN
--   UPDATE public.projects
--   SET editing_user_id = NULL, checked_out_at = NULL
--   WHERE id = p_project_id AND editing_user_id = auth.uid();
--   GET DIAGNOSTICS v_count = ROW_COUNT;
--   IF v_count = 0 THEN RETURN jsonb_build_object('error', 'You do not hold the lock'); END IF;
--   RETURN jsonb_build_object('success', true);
-- END;
-- $$;
-- GRANT EXECUTE ON FUNCTION public.release_lock(TEXT) TO authenticated;
--
-- DROP TABLE IF EXISTS public.project_versions;
--
-- COMMIT;
