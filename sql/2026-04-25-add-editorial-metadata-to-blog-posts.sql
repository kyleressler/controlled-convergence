-- ============================================================
-- Migration: add editorial metadata columns to blog_posts
--
-- Suggested Supabase SQL Editor query name:
--   "add-editorial-metadata-to-blog-posts"
--
-- Why:
--   The analytics export feeds an LLM editorial workflow. The LLM needs
--   stable, structured metadata about each post (what framework it uses,
--   how it hooks the reader, who it's for, what format it is) so that
--   patterns across posts can be analyzed. These are admin-only fields
--   surfaced in the post editor under "Editorial metadata".
--
-- Columns added:
--   frameworks       — multi-select, free-form (text[]). Expected values:
--                      'design-game', 'readiness-levels', 'other', 'none'
--                      Stored as a text array so we can grow the vocabulary
--                      without another migration.
--   hook_type        — single-select free-form (text). Expected values:
--                      'story', 'question', 'contrarian', 'framework',
--                      'list', 'how-to'
--   audience_target  — single-select free-form (text). Expected values:
--                      'engineers', 'educators', 'managers', 'mixed'
--   format           — single-select free-form (text). Expected values:
--                      'essay', 'tutorial', 'case-study', 'opinion', 'personal'
--   editorial_notes  — freeform admin-only notes (text). Named with the
--                      'editorial_' prefix to avoid collision with any
--                      future user-facing 'notes' field.
--
-- We deliberately do NOT add CHECK constraints on the enum-like columns —
-- the vocabulary may evolve and a CHECK would force another migration each
-- time we add a new option. The post editor enforces the picklist at the
-- UI layer; the export tolerates any value.
--
-- Existing rows will have NULL for all new columns, which the export
-- handler renders as `null` (and `[]` for the frameworks array) — that's
-- the intended behavior per the export spec.
-- ============================================================

ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS frameworks      TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hook_type       TEXT,
  ADD COLUMN IF NOT EXISTS audience_target TEXT,
  ADD COLUMN IF NOT EXISTS format          TEXT,
  ADD COLUMN IF NOT EXISTS editorial_notes TEXT;

-- Lightweight index on hook_type / format so future "show me all my
-- contrarian essays" queries from the LLM workflow stay fast even as the
-- table grows. Tags-style array columns don't get an index here — pg's
-- GIN index is overkill for an admin-only table with a small row count.
CREATE INDEX IF NOT EXISTS blog_posts_hook_type_idx
  ON public.blog_posts (hook_type)
  WHERE hook_type IS NOT NULL;

CREATE INDEX IF NOT EXISTS blog_posts_format_idx
  ON public.blog_posts (format)
  WHERE format IS NOT NULL;
