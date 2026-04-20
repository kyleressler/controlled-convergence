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


-- ── 5. HELPER FUNCTIONS ──────────────────────────────────────

-- Look up a Supabase user UUID by email address.
-- Used when assigning tasks: lets the frontend resolve an email to a user ID
-- without needing admin access to auth.users.
-- SECURITY DEFINER runs as the function owner (postgres), not the calling user.
CREATE OR REPLACE FUNCTION public.get_user_id_by_email(lookup_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_id UUID;
BEGIN
  SELECT id INTO found_id FROM auth.users WHERE email = lookup_email LIMIT 1;
  RETURN found_id;
END;
$$;

-- Grant execute to authenticated users only
REVOKE EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_user_id_by_email(TEXT) TO authenticated;


-- ── 6. PROJECT MEMBERS + PERMISSION LEVELS ───────────────────
-- Tracks who has access to each project and at what role level.
-- The project creator (projects.user_id) is always the implicit owner —
-- they do NOT need a row here. This table is for invited collaborators only.
--
-- Roles:
--   owner        — full edit (reserved for implicit owner via projects.user_id)
--   scoped_editor — can only write to records assigned via tasks; view everything
--   viewer       — read-only access to the entire project

CREATE TABLE IF NOT EXISTS public.project_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  TEXT NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('owner', 'scoped_editor', 'viewer')),
  invited_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON public.project_members (project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user    ON public.project_members (user_id);

ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Members can see their own membership rows
CREATE POLICY "Members can view their own membership"
  ON public.project_members FOR SELECT
  USING (auth.uid() = user_id);

-- Project owners can view all members of their projects
CREATE POLICY "Owners can view all project members"
  ON public.project_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_members.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- Project owners can add members
CREATE POLICY "Owners can add project members"
  ON public.project_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_members.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- Project owners can update member roles
CREATE POLICY "Owners can update member roles"
  ON public.project_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_members.project_id
        AND projects.user_id = auth.uid()
    )
  );

-- Project owners can remove members
CREATE POLICY "Owners can remove project members"
  ON public.project_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.projects
      WHERE projects.id = project_members.project_id
        AND projects.user_id = auth.uid()
    )
  );


-- ── Update projects RLS to allow member access ────────────────
-- Drop the old owner-only SELECT and UPDATE policies, replace with
-- policies that also cover invited collaborators.

DROP POLICY IF EXISTS "Users can view their own projects"   ON public.projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON public.projects;

-- Owners AND members can view a project
CREATE POLICY "Owners and members can view projects"
  ON public.projects FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
    )
  );

-- Owners can update projects freely; editors and scoped editors can update too
CREATE POLICY "Owners and editors can update projects"
  ON public.projects FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = projects.id
        AND project_members.user_id = auth.uid()
        AND project_members.role IN ('editor', 'scoped_editor')
    )
  );


-- ── Update tasks RLS so project members can see project tasks ─
CREATE POLICY "Project members can view tasks"
  ON public.tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = tasks.project_id
        AND project_members.user_id = auth.uid()
    )
  );

-- Scoped editors can update task status (accept/complete their assigned tasks)
CREATE POLICY "Scoped editors can update assigned tasks"
  ON public.tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members
      WHERE project_members.project_id = tasks.project_id
        AND project_members.user_id = auth.uid()
        AND project_members.role = 'scoped_editor'
    )
    AND auth.uid() = assignee_id
  );


-- ── Helper: get the current user's role for a project ─────────
CREATE OR REPLACE FUNCTION public.get_my_project_role(p_project_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_owner BOOLEAN;
  v_role     TEXT;
BEGIN
  -- Check if caller is the project owner
  SELECT (user_id = auth.uid()) INTO v_is_owner
    FROM public.projects WHERE id = p_project_id;
  IF v_is_owner IS TRUE THEN RETURN 'owner'; END IF;

  -- Check project_members table
  SELECT role INTO v_role
    FROM public.project_members
    WHERE project_id = p_project_id AND user_id = auth.uid();
  RETURN v_role;  -- NULL if not a member at all
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_my_project_role(TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_my_project_role(TEXT) TO authenticated;


-- ── 7. ACCEPT PROJECT INVITE FUNCTION ───────────────────────
-- Called when an invited user clicks Accept on a collab_invite task.
-- Atomically: validates the task, adds the user to project_members,
-- and marks the task accepted. SECURITY DEFINER so the invitee can
-- insert their own row into project_members without a broad INSERT policy.

CREATE OR REPLACE FUNCTION public.accept_project_invite(p_task_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task       public.tasks%ROWTYPE;
  v_project_id TEXT;
  v_role       TEXT;
BEGIN
  -- Fetch and validate the task
  SELECT * INTO v_task FROM public.tasks WHERE id = p_task_id;
  IF NOT FOUND                         THEN RETURN jsonb_build_object('error', 'Task not found'); END IF;
  IF v_task.task_type <> 'collab_invite' THEN RETURN jsonb_build_object('error', 'Not an invite task'); END IF;
  IF v_task.assignee_id <> auth.uid() THEN RETURN jsonb_build_object('error', 'Not authorized'); END IF;
  IF v_task.status <> 'pending'       THEN RETURN jsonb_build_object('error', 'Invite is no longer pending'); END IF;

  -- Pull project_id and role out of the task payload
  v_project_id := v_task.payload->>'project_id';
  v_role       := v_task.payload->>'role';
  IF v_project_id IS NULL OR v_role IS NULL THEN
    RETURN jsonb_build_object('error', 'Invalid invite payload');
  END IF;

  -- Add to project_members (upsert — safe to re-accept)
  INSERT INTO public.project_members (project_id, user_id, role, invited_by)
  VALUES (v_project_id, auth.uid(), v_role, v_task.assigner_id)
  ON CONFLICT (project_id, user_id) DO UPDATE SET role = EXCLUDED.role;

  -- Mark the task accepted
  UPDATE public.tasks SET status = 'accepted' WHERE id = p_task_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_project_invite(UUID) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.accept_project_invite(UUID) TO authenticated;


-- ── 8. TEST ACCOUNTS (manual setup — run separately) ─────────
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
