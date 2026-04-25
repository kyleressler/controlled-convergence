# Controlled Convergence — Admin System Build Prompt

You are a senior full-stack developer helping build an admin system for a live, production website called **Controlled Convergence**. Read this entire document before writing a single line of code. Do not skip sections. Do not start building until you reach the first PAUSE checkpoint and receive confirmation.

---

## The Site

**Controlled Convergence** is a live SaaS web app for business strategists and consultants. It helps users think through systems, capabilities, and organizational design.

**Deployment stack:**
- GitHub repo: `controlled-convergence` (all lowercase, no spaces) — this is the live repo
- Netlify: continuous deployment (every commit to GitHub auto-deploys)
- Supabase: PostgreSQL database, Auth, Storage, Row Level Security
- Vanilla HTML5 + ES6 JavaScript — no React, no Next.js, no framework
- Hash-based routing: `#home`, `#proj`, `#admin`, etc., dispatched through `switchPage()` in `app.js`

**Analytics stack (to be wired up in Chunk 1):**
- PostHog: behavioral event tracking, UTM attribution
- Kit (formerly ConvertKit): email platform

---

## What Already Exists in the Repo

Before touching anything, read these files to understand the current state:

| File | What it does |
|------|-------------|
| `js/config.js` | Supabase URL + anon key. **Verify these are real values, not placeholders.** |
| `js/analytics.js` | Has `trackEvent()`, `identifyUser()`, `resetAnalyticsUser()` — currently only `console.log`. Needs PostHog SDK swap. |
| `js/auth.js` | Has `login()`, `register()`, `logout()`, `initAuth()`. Needs admin tier detection added. |
| `js/app.js` | ~7,500 lines. Main event dispatcher and router. Needs `#admin` route added. |
| `js/api.js` | Supabase client wrapper. |
| `js/state.js` | Global app state. |
| `app.html` | Main app shell. Needs PostHog snippet added to `<head>`. |
| `supabase-schema.sql` | Existing schema. Key table: `user_profiles` with `tier` column (`free` | `member` | `pro` | `admin`). |

---

## What Needs to Be Built

The admin system has two modes:

### Read Admin — Insights Dashboard
A prescriptive analytics dashboard that tells the owner **what to do and when**, not just what happened. Think action cards like "Post more to LinkedIn — your conversion is 0.8%, below the 2% threshold" and surface cards like "This post outperformed everything — do it again."

Data sources: Supabase (business metrics) + PostHog (behavioral data, UTM attribution).

### Write Admin — Content Hub
A blog post editor and content management system. Workflow:
1. Author writes blog post content in Claude (external) using skills
2. Author logs into admin, creates a blog post, pastes content, sets status
3. Author creates associated content pieces (LinkedIn posts, emails, YouTube videos) as children of the blog post
4. System auto-generates UTM-tagged URLs for each piece
5. Author manually posts to LinkedIn / Kit / YouTube
6. Author confirms back in admin (pastes platform URL for LinkedIn/YouTube, marks email as "confirmed sent")

**No AI in admin for MVP. No auto-posting.**

---

## Design Decisions Already Made — Do Not Re-Ask

- Manual + confirm workflow (no API posting to LinkedIn or Kit)
- LinkedIn and YouTube posts: log the actual platform URL on confirm
- Email (Kit): just confirm sent, no URL needed
- Blog post editor uses **Quill.js** (CDN) with a custom image upload handler to Supabase Storage
- Images stored in a Supabase Storage bucket called `blog-images` (public)
- Blog posts support: title, slug, excerpt, content (rich text), tags (array), status (draft/published), published_at
- Tags included from the start
- Content pieces (LinkedIn, email, YouTube) belong to **campaigns** (see Campaign Lineage below)
- Publishing schedule has three view options: List, Week, Calendar
- Week view shows Tuesday AM and Thursday PM as "prime slots" (data-backed nudges, not locks)
- Blog posts have an **Evergreen** flag — signals the post can be re-promoted in future campaigns
- YouTube pieces have an "Embed in blog post" toggle
- YouTube UTM goes on the video description link back to the site (not on the YouTube URL itself)
- Admin is gated by `userTier === 'admin'` check in `auth.js` and `admin.html`
- Business LinkedIn page and YouTube channel (not personal accounts)

---

## Campaign Lineage (Re-Promotion System)

This is a core design concept. Content pieces do **not** live directly on a blog post — they belong to a **campaign**. This creates a content lineage.

- **Campaign v1** = Original launch. Created automatically when a blog post is published.
- **Campaign v2, v3...** = Re-promotions. Created manually when the owner wants to re-surface old content with a new hook angle to a larger audience.
- Each campaign has: a label (e.g. "Original launch", "6-month re-promotion"), a hook angle note, a status (planning / active / complete), and a launched_at date.
- Each campaign has its own set of content pieces (LinkedIn posts, emails, YouTube).
- UTM campaign slug versions: `systemized-approach-growth` → `systemized-approach-growth-v2`
- In the admin, a blog post detail view shows a campaign timeline: "Campaign 1 — Apr 2026 | Campaign 2 — Oct 2026"
- Clicking into a campaign shows that campaign's associated content pieces and publishing schedule

---

## New Files to Create

| File | Purpose |
|------|---------|
| `admin.html` | Admin shell. Tab navigation: Insights / Blog / Email. Admin gate. |
| `js/admin-insights.js` | Insights dashboard: Supabase queries + PostHog UTM data. |
| `js/admin-blog.js` | Blog post list, editor, campaign + associated content management. |
| `js/admin-email.js` | Kit subscriber count, campaign attribution. |
| `blog.html` | Public blog index. Queries published posts from Supabase. |
| `blog-post.html` | Individual post renderer. Reads slug from URL, fetches from Supabase. |

---

## Database: SQL Queries to Run

**These must be run in Supabase SQL Editor in order, before building Chunk 2 or Chunk 3.**

At each PAUSE checkpoint you will ask whether these have been run.

### Query 1 — blog_posts table
```sql
-- Name this query: "create-blog-posts-table"
CREATE TABLE blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  evergreen BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  author_id UUID REFERENCES auth.users(id)
);
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published posts are publicly readable"
  ON blog_posts FOR SELECT USING (status = 'published');
CREATE POLICY "Admins can manage all posts"
  ON blog_posts FOR ALL USING (
    auth.uid() IN (SELECT id FROM user_profiles WHERE tier = 'admin')
  );
```

### Query 2 — blog-images storage bucket
```sql
-- Name this query: "create-blog-images-bucket"
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-images', 'blog-images', true);
CREATE POLICY "Blog images are publicly readable"
  ON storage.objects FOR SELECT USING (bucket_id = 'blog-images');
CREATE POLICY "Admins can upload blog images"
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'blog-images' AND
    auth.uid() IN (SELECT id FROM user_profiles WHERE tier = 'admin')
  );
```

### Query 3 — campaigns table
```sql
-- Name this query: "create-campaigns-table"
CREATE TABLE campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  version INTEGER DEFAULT 1,
  label TEXT DEFAULT 'Original launch',
  hook_angle TEXT,
  status TEXT DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'complete')),
  launched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage campaigns"
  ON campaigns FOR ALL USING (
    auth.uid() IN (SELECT id FROM user_profiles WHERE tier = 'admin')
  );
```

### Query 4 — content_pieces table
```sql
-- Name this query: "create-content-pieces-table"
CREATE TABLE content_pieces (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id UUID REFERENCES blog_posts(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('linkedin', 'email', 'youtube', 'reddit')),
  title TEXT,
  subject TEXT,
  content TEXT,
  piece_number INTEGER DEFAULT 1,
  planned_date DATE,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'scheduled', 'published')),
  utm_url TEXT,
  platform_url TEXT,
  confirmed_at TIMESTAMPTZ,
  embed_in_post BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE content_pieces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage content pieces"
  ON content_pieces FOR ALL USING (
    auth.uid() IN (SELECT id FROM user_profiles WHERE tier = 'admin')
  );
```

### Query 5 — Set admin tier (run last, after confirming account exists)
```sql
-- Name this query: "set-admin-tier"
UPDATE user_profiles SET tier = 'admin' WHERE email = 'coney_horns0k@icloud.com';
SELECT email, tier FROM user_profiles WHERE email = 'coney_horns0k@icloud.com';
```

---

## UTM URL Format

Auto-generate UTM URLs using this convention:

```
https://controlledconvergence.com/blog/{slug}?utm_source={source}&utm_medium={medium}&utm_campaign={campaign_slug}&utm_content={type}-{n}
```

| Piece type | utm_source | utm_medium | utm_content |
|-----------|-----------|-----------|------------|
| LinkedIn post | linkedin | social | li-post-{n} |
| Email | email | newsletter | email-{n} |
| YouTube | youtube | video | yt-video-{n} |

For re-promotion campaigns, append the version to the campaign slug: `systemized-approach-growth-v2`

---

## Build Plan: Three Chunks

Work through these in order. Do not start a chunk until the checkpoint is cleared.

---

### CHUNK 1: Foundation

**Goal:** Wire up analytics, create the admin gate, and build the admin shell.

**Files to modify:**
- `app.html` — add PostHog snippet to `<head>`
- `js/analytics.js` — swap `console.log` calls for `posthog.capture()`
- `js/auth.js` — add admin tier detection; expose `isAdmin()` helper
- `js/app.js` — add `#admin` route to `switchPage()`

**Files to create:**
- `admin.html` — admin shell with tab nav (Insights / Blog / Email); gate checks `isAdmin()` on load, redirects to `#home` if not admin

**Events to track in analytics.js (PostHog):**
- `page_viewed` with `{ page: '#admin' }`
- `blog_post_created`
- `blog_post_published`
- `content_piece_confirmed`
- `campaign_created`

---

### ═══ PAUSE 1 — Before starting Chunk 1 ═══

**Stop here. Ask the following questions and wait for answers before writing any code.**

Ask:

> **Before I start building, I need a few things from you. Please answer each one:**
>
> 1. Open `js/config.js` and tell me what you see for `SUPABASE_URL` and `SUPABASE_ANON_KEY`. Are they real values (starting with `https://`) or placeholders?
>    - [ ] Real values — good to go
>    - [ ] Still placeholders — I'll provide them now: `[SUPABASE_URL: ___________ ]` `[SUPABASE_ANON_KEY: ___________ ]`
>
> 2. Have you signed up for PostHog at posthog.com?
>    - [ ] Yes — here is my Project API Key: `[POSTHOG_KEY: ___________ ]`
>    - [ ] Yes — here is my Host URL (circle one): `https://us.i.posthog.com` / `https://app.posthog.com` / Other: `___________`
>    - [ ] Not yet — I'll go do it now (go to posthog.com, create a project, then come back)
>
> 3. What is your site's production domain?
>    - [ ] `controlledconvergence.com`
>    - [ ] Other: `___________`
>
> Once I have these, I'll start Chunk 1.

---

### CHUNK 2: Read Admin — Insights Dashboard

**Goal:** Build the Insights tab in `admin.html` — a prescriptive dashboard that tells the owner what to do.

**File to create:** `js/admin-insights.js`

**Dashboard sections:**

1. **Funnel summary** — top-level metrics row:
   - Reach (PostHog: unique visitors, sourced from UTM)
   - Click-through (PostHog: UTM clicks → site)
   - Signups (Supabase: `user_profiles` count)
   - Activation (Supabase: users who created ≥1 project)
   - Retention (Supabase: users active in last 30 days)

2. **Action cards** — threshold-based alerts. Examples:
   - LinkedIn conversion < 2% → "Post more LinkedIn content or change your hook"
   - No new signups in 7 days → "Your top-of-funnel has stalled"
   - A post is outperforming others → "This post is working — replicate the pattern"
   - Evergreen post not re-promoted in 6 months → "Time to re-promote this one"

3. **Channel performance table** — UTM breakdown: LinkedIn / Email / YouTube / Organic / Direct. Columns: Visits, Signups, Activation rate.

4. **Top content** — blog posts ranked by signups attributed (via UTM). Highlight the top performer with a "Do this again →" button.

**PostHog API calls:** Use `posthog.capture()` client-side for events. For querying aggregated data server-side, use PostHog's Query API (HTTP GET with your API key). Document the exact endpoints needed.

**Supabase queries needed:**
- Total signups: `SELECT COUNT(*) FROM user_profiles`
- Activated users: `SELECT COUNT(DISTINCT user_id) FROM projects`
- Recent active: `SELECT COUNT(*) FROM user_profiles WHERE last_seen_at > NOW() - INTERVAL '30 days'`

---

### ═══ PAUSE 2 — Before starting Chunk 2 ═══

**Stop here. Ask:**

> **Checkpoint before Chunk 2:**
>
> 1. Have you run Query 1 (blog_posts table) in Supabase SQL Editor?
>    - [ ] Yes
>    - [ ] No — go to Supabase → SQL Editor → paste and run Query 1 from this prompt, then come back
>
> 2. Have you run Query 5 (set admin tier) and confirmed your account shows `tier = admin`?
>    - [ ] Yes — it returned `coney_horns0k@icloud.com | admin`
>    - [ ] No — run Query 5 now
>
> 3. Have you signed up for Kit at kit.com?
>    - [ ] Yes — here is my API Secret: `[KIT_API_SECRET: ___________ ]`
>    - [ ] Not yet — skip Kit integration for now, we'll wire it in later
>
> 4. Did Chunk 1 deploy cleanly? Can you log in and see the admin tab appear?
>    - [ ] Yes
>    - [ ] No — describe what's broken and we'll fix it before moving on
>
> Once confirmed, I'll start Chunk 2.

---

### CHUNK 3: Write Admin — Blog + Content Hub

**Goal:** Build the Blog tab — post list, post editor, campaign management, and associated content pieces.

**Files to create:**
- `js/admin-blog.js` — full blog management logic
- `blog.html` — public blog index (queries published posts from Supabase)
- `blog-post.html` — individual post renderer (slug from URL query param)

**Blog post editor features:**
- Quill.js rich text editor (load from CDN: `https://cdn.quilljs.com/1.3.6/`)
- Custom image handler: file picker → upload to Supabase Storage `blog-images` bucket → insert public URL into Quill at cursor
- Fields: Title, Slug (auto-generated from title, editable), Excerpt, Tags (pill input), Status toggle (Draft / Published), Evergreen toggle
- Auto-save draft to Supabase every 30 seconds

**Campaign section (below editor):**
- Show all campaigns for this post in a timeline
- "Campaign 1 — Original launch — Apr 2026 — Active"
- "Re-promote →" button creates Campaign v2 (prompts for label + hook angle note)
- Clicking a campaign opens its content hub

**Content Hub (per campaign):**
- Associated content pieces grouped by type: LinkedIn / Email / YouTube
- "Add LinkedIn post", "Add email", "Add video" buttons
- Each piece card shows: type badge, piece number, planned date, status, content preview (2-line clamp), UTM URL bar with Copy button, action buttons
- Status flow: Draft → Ready → Scheduled → Published
- LinkedIn + YouTube confirm: inline URL paste field expands on "Mark published →" click
- Email confirm: "Confirm sent" button (no URL)
- YouTube pieces: "Embed in blog post" toggle, UTM for video description

**Publishing schedule (tab within Content Hub):**
- Three view options: List | Week | Calendar
- Week view: highlight Tuesday AM and Thursday PM as prime slots (teal tint + "Prime slot" label)
- List view: chronological across all pieces, amber highlight for past-due items
- Calendar view: stub for now ("Coming soon")

**Public blog pages:**
- `blog.html`: grid of published posts (title, excerpt, tags, date, read time estimate)
- `blog-post.html`: reads `?slug=` from URL, fetches from Supabase, renders Quill delta content as HTML, sets `<title>` and OG meta tags

---

### ═══ PAUSE 3 — Before starting Chunk 3 ═══

**Stop here. Ask:**

> **Checkpoint before Chunk 3:**
>
> 1. Have you run all 5 SQL queries (blog_posts, blog-images bucket, campaigns, content_pieces, admin tier)?
>    - [ ] Yes, all 5
>    - [ ] Missing: ___________ (go run the missing ones)
>
> 2. Did Chunk 2 deploy? Can you see the Insights tab with at least placeholder data?
>    - [ ] Yes
>    - [ ] No — describe the issue
>
> 3. Confirm your Supabase Storage bucket: go to Supabase → Storage → you should see `blog-images` listed as a public bucket.
>    - [ ] Confirmed
>    - [ ] Not there — run Query 2 from this prompt
>
> Once confirmed, I'll start Chunk 3.

---

## General Rules — Follow These Throughout

1. **Always edit `controlled-convergence/` (lowercase, no spaces).** This is the live git repo. There is a second folder called `Controlled Convergence` — do not touch it.

2. **Commit after each logical unit of work.** Small, focused commits. Never bundle unrelated changes.

3. **Every change is potentially going to production.** Netlify deploys on every commit. Do not push broken states.

4. **Verify the path before any edit.** The repo is at `/sessions/.../mnt/controlled-convergence/` in the shell environment.

5. **Do not introduce any framework.** No React, no Vue, no Svelte. Vanilla JS only.

6. **Do not mock data in the Insights dashboard.** If PostHog or Supabase data isn't available yet, show a clear empty state ("No data yet — come back after your first week of traffic") rather than fake numbers.

7. **RLS must be enabled on every new table.** Never create a table without Row Level Security policies.

8. **Ask before assuming on anything ambiguous.** If something isn't covered in this document, stop and ask rather than guessing.

---

## Summary of API Keys to Collect

| Key | Where to get it | Format |
|-----|----------------|--------|
| `SUPABASE_URL` | Supabase → Project Settings → API | `https://xxxx.supabase.co` |
| `SUPABASE_ANON_KEY` | Supabase → Project Settings → API | Long JWT string |
| `POSTHOG_API_KEY` | PostHog → Project Settings → Project API Key | `phc_xxxxx` |
| `POSTHOG_HOST` | PostHog → Project Settings | `https://us.i.posthog.com` or similar |
| `KIT_API_SECRET` | Kit → Settings → Developer → API Secret | Long string |

---

## Start Here

Read the entire document above. Then say:

> "I've read the full brief. I'm ready to start. Before writing any code, I need to collect a few things from you."

Then go directly to **PAUSE 1** and ask those questions. Do not start Chunk 1 until you have the PostHog key and Supabase confirmation.
