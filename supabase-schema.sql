-- ============================================================
-- Controlled Convergence — Supabase Database Schema
--
-- Run this entire file in the Supabase SQL Editor:
--   supabase.com → your project → SQL Editor → New Query → paste → Run
--
-- Run it top to bottom, in order. Each section is labeled.
-- ============================================================


-- ── 1. USER PROFILES ─────────────────────────────────────────
-- One row per user. Created automatically on signup via trigger below.
-- The 'tier' field controls what features are unlocked (free / member / pro).

CREATE TABLE IF NOT EXISTS public.user_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email      TEXT,
  name       TEXT,
  tier       TEXT NOT NULL DEFAULT 'free'
               CHECK (tier IN ('free', 'member', 'pro', 'admin')),
  theme      TEXT NOT NULL DEFAULT 'engineering'
               CHECK (theme IN ('engineering', 'light', 'dark')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: auto-create a user_profiles row when someone signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, tier, theme)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'free',
    'engineering'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS: Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: users can read and update only their own profile
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);


-- ── 2. PROJECTS ──────────────────────────────────────────────
-- One row per project. All guided-mode data is stored in the `data` JSONB column.

CREATE TABLE IF NOT EXISTS public.projects (
  id          TEXT PRIMARY KEY,              -- 'proj_<timestamp>_<random>'
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL DEFAULT 'Untitled Project',
  owner       TEXT,
  description TEXT,
  data        JSONB,                         -- { goal, ilities, stakeholders, requirements, concepts, matrix, pughSettings }
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast user project lookups
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON public.projects (user_id);

-- RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);


-- ── 3. TEMPLATES ─────────────────────────────────────────────
-- Reusable project starting points. Stored per user.
-- is_public = true makes the template visible in the community library (future feature).

CREATE TABLE IF NOT EXISTS public.templates (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  data       JSONB,                          -- { ilities, stakeholders, requirements, pairWeights }
  is_public  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_templates_user_id ON public.templates (user_id);

-- RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own templates"
  ON public.templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view public templates"
  ON public.templates FOR SELECT
  USING (is_public = TRUE);

CREATE POLICY "Users can insert their own templates"
  ON public.templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON public.templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON public.templates FOR DELETE
  USING (auth.uid() = user_id);


-- ── 4. TASKS ─────────────────────────────────────────────────
-- One row per task. Tasks are created by a project owner (assigner) and
-- directed at a stakeholder or project member (assignee).
-- task_type:  'scoring'       — score requirements/concepts (Feature 3)
--             'req_review'    — review and approve a requirement (Feature 4)
--             'collab_invite' — accept/decline a project collaboration invite (Feature 6)
-- status:     pending | accepted | declined | completed | expired

CREATE TABLE IF NOT EXISTS public.tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assigner_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assignee_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assignee_email TEXT,                      -- used before/if assignee has no account
  task_type     TEXT NOT NULL DEFAULT 'scoring'
                  CHECK (task_type IN ('scoring', 'req_review', 'collab_invite')),
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'declined', 'completed', 'expired')),
  title         TEXT,                       -- short description shown in panel
  payload       JSONB,                      -- task-specific data (req ids, concept ids, etc.)
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ                 -- optional expiry; NULL = no expiry
);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id  ON public.tasks (assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigner_id  ON public.tasks (assigner_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id   ON public.tasks (project_id);

-- RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Assignee can see tasks directed at them
CREATE POLICY "Assignees can view their tasks"
  ON public.tasks FOR SELECT
  USING (auth.uid() = assignee_id);

-- Assigner can see tasks they created
CREATE POLICY "Assigners can view tasks they created"
  ON public.tasks FOR SELECT
  USING (auth.uid() = assigner_id);

-- Assigner can insert tasks
CREATE POLICY "Assigners can create tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = assigner_id);

-- Assigner can update (revoke/delete) tasks they created
CREATE POLICY "Assigners can update their tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = assigner_id);

-- Assignee can update status (accept / decline / complete)
CREATE POLICY "Assignees can update task status"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = assignee_id);

-- Assigner can delete tasks they created
CREATE POLICY "Assigners can delete their tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = assigner_id);

-- Trigger: keep updated_at current
CREATE OR REPLACE FUNCTION public.handle_task_updated()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS on_task_updated ON public.tasks;
CREATE TRIGGER on_task_updated
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.handle_task_updated();


-- ── 5. TEST ACCOUNTS (manual setup — run separately) ─────────
-- After creating test user accounts via the Supabase Auth UI or signup flow,
-- manually set their tiers here:
--
-- UPDATE public.user_profiles SET tier = 'free'   WHERE email = 'free@test.cc';
-- UPDATE public.user_profiles SET tier = 'member' WHERE email = 'member@test.cc';
-- UPDATE public.user_profiles SET tier = 'pro'    WHERE email = 'pro@test.cc';
--
-- To create admin-level access (shows DEV tier toggle in production):
-- UPDATE public.user_profiles SET tier = 'admin'  WHERE email = 'your@email.com';


-- ── DONE ──────────────────────────────────────────────────────
-- Your schema is ready. Return to the deployment guide for next steps.
