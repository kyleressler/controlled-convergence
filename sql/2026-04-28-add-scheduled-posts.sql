-- ============================================================
-- 2026-04-28 — Add scheduled post support to blog_posts
--
-- What this does:
--   1. Adds a `scheduled_at` column so a post can be queued for
--      future publication (status = 'scheduled', scheduled_at = future ts).
--   2. Updates the public-read RLS policy so that once a scheduled
--      post's time has arrived it becomes visible on the public blog
--      without any manual DB state change.
--
-- Run once in the Supabase SQL Editor.
-- ============================================================

-- ── 1. New column ─────────────────────────────────────────────
-- Nullable: NULL means "publish immediately when status → published".
-- Not null only when status = 'scheduled'.
ALTER TABLE blog_posts
  ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ DEFAULT NULL;

-- ── 2. Index for scheduler queries ────────────────────────────
-- The admin list filters on status IN ('draft','scheduled','published')
-- and the public query checks scheduled_at <= now(). This index makes
-- both fast even as the post count grows.
CREATE INDEX IF NOT EXISTS blog_posts_scheduled_at_idx
  ON blog_posts (scheduled_at)
  WHERE scheduled_at IS NOT NULL;

-- ── 3. Update the public-read RLS policy ──────────────────────
-- Drop the old policy that only exposes status = 'published' rows, then
-- recreate it to also expose scheduled posts whose time has arrived.
-- Admins already have unrestricted access via a separate policy.
DROP POLICY IF EXISTS "Published posts are visible to everyone" ON blog_posts;

CREATE POLICY "Published posts are visible to everyone"
  ON blog_posts
  FOR SELECT
  USING (
    status = 'published'
    OR (status = 'scheduled' AND scheduled_at IS NOT NULL AND scheduled_at <= now())
  );

-- ── Notes ─────────────────────────────────────────────────────
-- • The admin-blog.js savePost() function sets status = 'scheduled'
--   and stores the chosen datetime in scheduled_at.
-- • The public blog (blog.html, blog-post.html) queries Supabase with
--   status = 'published' — update those queries to use the new policy
--   logic OR rely on the RLS policy above (which already handles it
--   transparently if you query without a status filter for public views).
-- • No cron job is needed: RLS gates the read. The post becomes
--   visible to readers exactly when scheduled_at passes.
-- • To "force-publish" a scheduled post early: update status → 'published'
--   in the admin editor (the Schedule button becomes Publish again once
--   you clear the scheduled date).
