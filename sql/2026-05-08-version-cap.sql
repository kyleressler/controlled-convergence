-- ── 2026-05-08: 10-version rolling cap ────────────────────────────────────────
-- Adds a rolling cap of 10 checkin versions per project to release_lock.
-- After inserting the new version snapshot, any checkin versions beyond the
-- 10 most recent are deleted (oldest first). The checkout snapshot cleanup
-- and lock release logic are unchanged.
-- ──────────────────────────────────────────────────────────────────────────────

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

  -- Enforce 10-version rolling cap: after inserting, delete any checkin
  -- versions beyond the 10 most recent (by version_number, oldest first).
  DELETE FROM public.project_versions
  WHERE id IN (
    SELECT id FROM public.project_versions
    WHERE project_id = p_project_id
      AND kind = 'checkin'
    ORDER BY version_number ASC
    OFFSET 10
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
