-- ============================================================
-- Concept Hero Images — private Storage bucket + RLS
--
-- Adds one PRIVATE bucket, `concept-images`, that holds a small square hero
-- image for each concept. There is exactly ONE bucket, shared by every user
-- and project; isolation is enforced entirely by RLS on storage.objects,
-- evaluated per-object per-request.
--
-- PATH CONVENTION (set by the client on upload):
--     concept-images/<project_id>/<concept_id>-<random>.webp
-- The FIRST path segment is the project id, pulled off with
-- (storage.foldername(name))[1].
--
-- Access model:
--   • VIEW (SELECT):            owner OR any member  (matches project read access)
--   • UPLOAD/REPLACE/DELETE:    owner OR editor      ("owner + editors")
--
-- APPROACH — SECURITY DEFINER helpers (NOT inline subqueries):
-- An earlier version inlined `EXISTS (SELECT 1 FROM public.projects ...)` in the
-- policies. That fails from a storage.objects policy: the cross-schema subquery
-- does not reliably see public.projects/public.project_members rows in the RLS
-- evaluation context, so even the project OWNER was denied (403). The app's own
-- projects/tasks policies avoid this by using SECURITY DEFINER helper functions,
-- which run as the function owner and bypass that visibility problem. We do the
-- same here. `user_is_project_owner` and `user_has_project_access` already exist
-- in the live DB; `user_can_edit_project` was never created there (it was left
-- commented out in the phase-2 migration), so we (re)create it below.
--
-- Idempotent (CREATE OR REPLACE / ON CONFLICT / DROP-before-CREATE).
-- Apply in Supabase Dashboard → SQL Editor.
-- ============================================================


-- ── 1. The bucket (private) ──────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'concept-images',
  'concept-images',
  false,
  524288,                                   -- 512 KB hard ceiling
  ARRAY['image/webp', 'image/jpeg']         -- formats the client emits
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ── 2. Ensure the editor helper exists (owner + others already exist) ──
-- Matches the definition intended in supabase-schema.sql. SECURITY DEFINER so
-- it bypasses RLS on project_members; granted to authenticated only.
CREATE OR REPLACE FUNCTION public.user_can_edit_project(p_project_id TEXT)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
      AND role IN ('editor', 'scoped_editor')
  );
$$;
REVOKE EXECUTE ON FUNCTION public.user_can_edit_project(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.user_can_edit_project(TEXT) TO authenticated;


-- ── 3. RLS policies on storage.objects (via helper functions) ──
-- (RLS is already enabled on storage.objects by Supabase.)

-- VIEW: owner or any member
DROP POLICY IF EXISTS "concept-images view" ON storage.objects;
CREATE POLICY "concept-images view"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'concept-images'
    AND (
      public.user_is_project_owner((storage.foldername(name))[1])
      OR public.user_has_project_access((storage.foldername(name))[1])
    )
  );

-- UPLOAD: owner or editor
DROP POLICY IF EXISTS "concept-images insert" ON storage.objects;
CREATE POLICY "concept-images insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'concept-images'
    AND (
      public.user_is_project_owner((storage.foldername(name))[1])
      OR public.user_can_edit_project((storage.foldername(name))[1])
    )
  );

-- REPLACE (upsert): owner or editor
DROP POLICY IF EXISTS "concept-images update" ON storage.objects;
CREATE POLICY "concept-images update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'concept-images'
    AND (
      public.user_is_project_owner((storage.foldername(name))[1])
      OR public.user_can_edit_project((storage.foldername(name))[1])
    )
  );

-- DELETE (replace cleanup / concept removal): owner or editor
DROP POLICY IF EXISTS "concept-images delete" ON storage.objects;
CREATE POLICY "concept-images delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'concept-images'
    AND (
      public.user_is_project_owner((storage.foldername(name))[1])
      OR public.user_can_edit_project((storage.foldername(name))[1])
    )
  );


-- ─────────────────────────────────────────────────────────────
-- DOWN MIGRATION (manual — review before running):
-- ─────────────────────────────────────────────────────────────
--
-- DROP POLICY IF EXISTS "concept-images view"   ON storage.objects;
-- DROP POLICY IF EXISTS "concept-images insert" ON storage.objects;
-- DROP POLICY IF EXISTS "concept-images update" ON storage.objects;
-- DROP POLICY IF EXISTS "concept-images delete" ON storage.objects;
-- -- (leave public.user_can_edit_project in place; harmless and matches schema)
-- DELETE FROM storage.buckets WHERE id = 'concept-images';  -- only if empty
