# Controlled Convergence — Deployment To-Do

This file tracks everything that needs to be done before or during deployment to GitHub / Netlify / Supabase. Add items here as they come up during development so nothing gets forgotten at deploy time.

---

## Before First Deploy

### Environment & Configuration
- [ ] **Remove or gate DEV Tier Toggle** — The tier toggle in the left sidebar is already gated to `localhost` only in the current codebase (hostname check in JS). Verify it is hidden when running from Netlify's production URL before going live.
- [ ] **Set up Netlify environment variables** — When moving to a Next.js build, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `ANTHROPIC_API_KEY` in Netlify's dashboard under Site Settings → Environment Variables. The Anthropic key must only be used server-side (API routes), never in frontend code.
- [ ] **Create test accounts for each tier** — In Supabase, create `free@test.cc`, `member@test.cc`, and `pro@test.cc` accounts. Manually set the `tier` field in the users table for each. Use these for QA instead of the dev toggle.

### Supabase Setup
- [ ] **Enable Row Level Security (RLS) on all tables** — `projects`, `templates`, and `project_shares` tables must have RLS enabled before any user data is stored. Test all policies with each test account.
- [ ] **Set up auth email templates** — Customize the Supabase invite/confirm email templates to match the Controlled Convergence brand before sending invites to real users.
- [ ] **Configure allowed redirect URLs** — Add production domain (e.g. `controlledconvergence.com`) to Supabase Auth → URL Configuration → Redirect URLs.

### Domain & DNS
- [ ] **Register domain** — `controlledconvergence.com` or `.io` (check availability).
- [ ] **Point DNS to Netlify** — Add CNAME/A records per Netlify instructions once domain is purchased.
- [ ] **Set custom domain in Netlify** — Site Settings → Domain Management.

---

## Before Collaboration Feature Goes Live
- [ ] **Create `project_shares` table in Supabase** — Schema: `id, project_id, owner_user_id, invited_email, shared_user_id, role (editor|viewer), status (pending|active), created_at`.
- [ ] **Write RLS policies for `project_shares`** — Owners can read/write their project's share rows. Editors/viewers can read rows where they are the shared user.
- [ ] **Write RLS policies for `projects` that respect shares** — `SELECT` allowed if `owner_id = auth.uid()` OR active share exists. `UPDATE` allowed if owner OR editor role.
- [ ] **Configure Supabase invite emails** — Invite flow uses Supabase magic link auth. Invited user must create an account before the share activates.

---

## When Supabase Auth Goes Live — Templates Migration
- [ ] **Migrate templates from `localStorage` to Supabase** — Templates currently read/write to `localStorage` under the key `cc_templates` via `loadTemplates()` and `persistTemplates()` in `app.js`. At deploy time, replace those two functions with Supabase `select/insert/delete` calls against the `templates` table, scoped to `auth.uid()`. The rest of the template logic (save modal, load, delete, render) is already decoupled and needs no changes — only the two storage functions swap out.
- [ ] **Create `templates` table in Supabase** — Schema: `id (uuid), user_id (uuid, FK auth.users), name (text), created_at (timestamptz), is_public (boolean, default true), data (jsonb)`.
- [ ] **Offer to import existing localStorage templates on first login** — When a user signs in for the first time after deploy, check if `cc_templates` exists in their localStorage. If so, offer to migrate those templates into their new account. Clear localStorage after successful import.

## Before Template Library Goes Public
- [ ] **Add `is_public` column to `templates` table** — `boolean, default true`. All templates currently save with `is_public = true` (user opt-in from the start).
- [ ] **Add RLS policies for `templates`** — Owner can CRUD their own templates. Anyone can SELECT where `is_public = true`.
- [ ] **Design public template browse UI** — Searchable/filterable list of community templates. Forkable into a new project.

---

## Blog / DecapCMS
- [ ] **Integrate DecapCMS after Next.js migration** — Do not bolt CMS onto the current vanilla HTML build. After migrating to Next.js, add DecapCMS: install, configure `public/admin/config.yml` to point at `content/blog/` folder, add Netlify Identity widget for login. Posts become markdown files committed to GitHub; Netlify rebuilds on push.
- [ ] **Design post schema before migration** — Fields: `title`, `date`, `slug`, `excerpt`, `tags` (comma-separated), `category`, `body` (markdown). Define this now so the blog URL structure is consistent from day one.

---

## Performance & Security
- [ ] **Audit for exposed secrets** — Run a grep for any API keys, tokens, or credentials accidentally committed to the repo before making it public.
- [ ] **Enable Netlify's asset optimization** — Pretty URLs, CSS/JS minification, image compression in Netlify Site Settings → Build & Deploy → Post Processing.
- [ ] **Set up Netlify branch deploys** — Configure deploy previews for PRs so every branch gets a preview URL for QA.

---

*Last updated: April 2026*
