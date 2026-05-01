-- ============================================================
-- 2026-05-01 — Fix blog_posts status check constraint
--
-- The 2026-04-28 scheduling migration added status = 'scheduled'
-- support in JS and RLS policies but forgot to update the CHECK
-- constraint, which still only allows ('draft', 'published').
-- This causes a constraint violation when saving a scheduled post.
--
-- Run once in the Supabase SQL Editor.
-- ============================================================

ALTER TABLE blog_posts
  DROP CONSTRAINT blog_posts_status_check;

ALTER TABLE blog_posts
  ADD CONSTRAINT blog_posts_status_check
  CHECK (status IN ('draft', 'scheduled', 'published'));
