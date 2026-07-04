-- ============================================================
-- Concept Hero Images — private Storage bucket + RLS
--
-- Adds one PRIVATE bucket, `concept-images`, that holds a small
-- square hero image for each concept. There is exactly ONE bucket,
-- shared by every user and project; isolation is enforced entirely
-- by RLS on storage.objects, evaluated per-object per-request.
--
-- PATH CONVENTION (set by the client on upload):
--     concept-images/<project_id>/<concept_id>-<random>.webp
--
-- The FIRST path segment is the project id, pulled off the path with
-- (storage.foldername(name))[1].
--
-- Access model:
--   • VIEW (SELECT):            owner OR any member  (matches project read access)
--   • UPLOAD/REPLACE/DELETE:    owner OR editor      ("owner + editors")
--
-- NOTE ON APPROACH: the checks are INLINED (EXISTS against public.projects
-- and public.project_members) rather than calling helper functions like
-- user_can_edit_project(). That helper is defined in supabase-schema.sql but
-- is NOT present in the live database (it was left commented out in the
-- phase-2 migration), so referencing it fails. Inlining removes that
-- dependency entirely.
--
-- Why inlining is safe from RLS recursion: every subquery filters on
-- `user_id = auth.uid()`, so it only ever needs to see the CURRENT user's
-- own project/membership row — which their existing SELECT policies on
-- public.projects ("owner can view own") and public.project_members
-- ("members can view their own membership") already expose. Neither of
-- those tables' policies reference storage.objects, so there is no cycle.
--
-- Defense in depth beyond the client-side crop/compress pipeline:
--   • bucket is private (public = false) — no anonymous access, ever
--   • file_size_limit caps object size server-side
--   • allowed_mime_types restricts to the formats the client emits
--
-- Safe to run repeatedly (idempotent inserts / DROP-before-CREATE).
-- Apply in Supabase Dashboard → SQL Editor.
-- ============================================================


-- ── 1. The bucket (private) ──────────────────────────────────
-- file_size_limit is a hard ceiling; the client targets ~100 KB but
-- we allow headroom (512 KB) so an occasional dense photo still uploads.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'concept-images',
  'concept-images',
  false,
  524288,                                   -- 512 KB
  ARRAY['image/webp', 'image/jpeg']         -- formats the client emits (WebP, JPEG fallback)
)
ON CONFLICT (id) DO UPDATE
  SET public             = EXCLUDED.public,
      file_size_limit    = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;


-- ── 2. RLS policies on storage.objects ───────────────────────
-- (RLS is already enabled on storage.objects by Supabase.)

-- VIEW: owner or any member of the project encoded in the path
DROP POLICY IF EXISTS "concept-images view" ON storage.objects;
CREATE POLICY "concept-images view"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'concept-images'
    AND (
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = (storage.foldername(name))[1]
          AND p.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.project_members m
        WHERE m.project_id = (storage.foldername(name))[1]
          AND m.user_id = auth.uid()
      )
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
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = (storage.foldername(name))[1]
          AND p.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.project_members m
        WHERE m.project_id = (storage.foldername(name))[1]
          AND m.user_id = auth.uid()
          AND m.role IN ('editor', 'scoped_editor')
      )
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
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = (storage.foldername(name))[1]
          AND p.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.project_members m
        WHERE m.project_id = (storage.foldername(name))[1]
          AND m.user_id = auth.uid()
          AND m.role IN ('editor', 'scoped_editor')
      )
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
      EXISTS (
        SELECT 1 FROM public.projects p
        WHERE p.id = (storage.foldername(name))[1]
          AND p.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.project_members m
        WHERE m.project_id = (storage.foldername(name))[1]
          AND m.user_id = auth.uid()
          AND m.role IN ('editor', 'scoped_editor')
      )
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
--
-- -- Only removes the bucket row if it is already empty; delete objects first.
-- DELETE FROM storage.buckets WHERE id = 'concept-images';
