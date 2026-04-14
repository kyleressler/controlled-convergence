# Controlled Convergence — Deployment Guide
*For someone who has never done this before. Every step is explained.*

---

## Before You Start — What This Guide Covers

By the end of this guide, you will have Controlled Convergence running live on the internet with:

- ✅ The full tool live at your own domain (GOAL, ILTY, STAK, REQS, PAIR, SCOR, PUGH all work)
- ✅ Real user accounts — visitors can sign up, log in, and log out
- ✅ Projects saved to a real database — work persists across sessions and devices
- ✅ Tier system active — Free / Member / Pro accounts with actual gating
- ✅ Your domain name (e.g. `controlledconvergence.com`)
- ✅ HTTPS (the padlock icon)

**What is NOT live yet after this guide:**
- AI coaching — needs a Netlify function and Anthropic API key (a future step)
- Stripe payments — Pro tier upgrade flow (a future step)
- PDF report export — depends on Pro tier / payment (a future step)
- Community template library — needs additional UI work (a future step)

This is your full working beta. Real users can sign up, use the tool, and have their data saved.

---

## What Accounts You Need

You need four accounts. All are free to start.

| Service | What It Does | Cost |
|---|---|---|
| **GitHub** | Stores your code online | Free |
| **Netlify** | Hosts your site and auto-deploys when you update code | Free tier is plenty |
| **Namecheap** | Where you register your domain | ~$10–15/year |
| **Supabase** | Your database — stores user accounts and projects | Free up to 50,000 users |

You do NOT need Stripe yet. That comes later when you add payments.

---

## Phase 1 — GitHub (store your code online)

GitHub is where your code lives. Think of it as Google Drive for code — every time you save a new version, the history is kept. Netlify will watch GitHub and automatically update your live site every time you push new code.

### Step 1: Create a GitHub Account

1. Go to **github.com**
2. Click the green **Sign up** button
3. Enter your email, create a password, and choose a username
   - Something professional like `kyleressler` or your initials is fine — it will be visible publicly
4. GitHub sends a verification email — open it and click the link
5. Click through any setup questions until you reach your dashboard

### Step 2: Download GitHub Desktop

GitHub Desktop is a visual app that lets you manage your code without typing commands in a terminal.

1. Go to **desktop.github.com**
2. Click **Download for Mac** (or Windows)
3. Open the downloaded file, drag GitHub Desktop into your Applications folder
4. Open GitHub Desktop
5. Click **Sign in to GitHub.com** and log in with the account you just created
6. When it asks to configure Git, enter your name and email — click **Continue**, then **Finish**

### Step 3: Create a New Repository

A "repository" (or "repo") is just a folder on GitHub that holds your project.

1. In GitHub Desktop, click **File → New Repository** in the menu bar
2. Fill in the form:
   - **Name:** `controlled-convergence` (lowercase, hyphens — GitHub requires this format)
   - **Description:** `Design methodology and concept selection platform`
   - **Local Path:** Click **Choose…** and pick your Desktop or Documents folder. GitHub Desktop will create a new folder called `controlled-convergence` here.
3. Leave everything else default and click **Create Repository**

### Step 4: Copy Your Project Files Into the Repository Folder

1. Open Finder
2. Navigate to your Controlled Convergence project folder — the one containing `index.html`, the `css` folder, the `js` folder, etc.
3. Select everything **except** the `archive` folder (old versions don't need to be in the repo)
4. Copy those files (Cmd+C)
5. Navigate to the new `controlled-convergence` folder GitHub Desktop just created
6. Paste everything there (Cmd+V)

Your repository folder should now contain: `index.html`, `css/`, `js/`, `supabase-schema.sql`, and the markdown files.

### Step 5: Publish to GitHub

1. Switch back to GitHub Desktop
2. You'll see a list of all the files you just added on the left — GitHub is showing you what changed
3. At the bottom left, in the **Summary** field, type: `Initial commit — first deploy`
4. Click **Commit to main**
5. At the top, click **Publish repository**
6. In the dialog:
   - Make sure **Keep this code private** is **unchecked** — Netlify needs to be able to read it
   - Click **Publish Repository**

Your code is now on GitHub. Verify by going to `github.com/YOUR-USERNAME/controlled-convergence` in a browser.

---

## Phase 2 — Netlify (put your site on the internet)

Netlify takes your GitHub repository and turns it into a live website. Every time you push new code to GitHub, Netlify rebuilds and updates your site automatically.

### Step 6: Create a Netlify Account

1. Go to **netlify.com**
2. Click **Sign up**
3. Click **Sign up with GitHub** — this links the two accounts automatically
4. GitHub will ask if you want to authorize Netlify — click **Authorize netlify**
5. You'll land on the Netlify dashboard

### Step 7: Deploy Your Site

1. On the Netlify dashboard, click **Add new site → Deploy with GitHub**
2. Select your **controlled-convergence** repository
3. On the Build settings screen:
   - **Branch to deploy:** `main` (already selected)
   - **Build command:** leave this **completely empty** — your site is plain HTML, no build step needed
   - **Publish directory:** leave as `/` or empty
4. Click **Deploy controlled-convergence**

After 30–60 seconds you'll see a green checkmark and a URL like `https://whimsical-croissant-a1b2c3.netlify.app`

5. Click that URL — your site is live on the internet.

> ✅ **Check:** Open the live URL and confirm the "Dev: Tier Toggle" is NOT visible in the left sidebar. It should only appear on localhost.

### Step 8: Rename Your Netlify Site (optional)

1. In Netlify, click your site → **Site configuration** in the left sidebar
2. Click **Change site name**
3. Type `controlled-convergence` — Netlify checks availability
4. If available, click **Save** — your site is now at `https://controlled-convergence.netlify.app`

---

## Phase 3 — Domain Name (your real address)

### Step 9: Register Your Domain

1. Go to **namecheap.com**
2. Search for `controlledconvergence` in the search bar
3. Choose your extension:
   - `.com` is most credible (~$10–14/year)
   - `.io` is popular for tech products (~$30–40/year)
4. Add your chosen domain to the cart
5. On checkout:
   - **WhoisGuard:** leave ON (free — hides your personal info from public records)
   - **Auto-renew:** turn ON — losing your domain is painful
   - Skip the upsells (hosting, email, etc.)
6. Complete checkout

### Step 10: Connect Your Domain to Netlify

**In Netlify:**

1. Go to your site dashboard → **Domain management** in the left sidebar
2. Click **Add a domain**
3. Type your domain exactly as purchased (e.g. `controlledconvergence.com`) → click **Verify** → **Add domain**
4. Netlify shows you DNS instructions — leave this tab open

**In Namecheap:**

1. Log in → click **Account** → **Dashboard**
2. Find your domain and click **Manage**
3. Click the **Advanced DNS** tab
4. Netlify will give you one of two options:

   **Option A — Netlify DNS (easier):** Netlify says "point your nameservers to us." In Namecheap, find the **NAMESERVERS** section, switch the dropdown from "Namecheap BasicDNS" to **"Custom DNS"**, and enter the nameserver addresses Netlify gives you (they look like `dns1.p01.nsone.net`).

   **Option B — CNAME record:** In Namecheap's DNS Records table, click **Add New Record**, choose type **CNAME**, set Host to `www`, and Value to your `.netlify.app` address.

5. Save your changes. DNS changes take anywhere from a few minutes to 48 hours — usually under an hour.

> ✅ **Check:** Once the domain loads, add it to your bookmarks.

### Step 11: Enable HTTPS

Netlify does this automatically. Go to your site → **Domain management** → scroll to **HTTPS**. If it doesn't say "HTTPS enabled," click **Verify DNS configuration** → **Provision certificate**. Done.

---

## Phase 4 — Supabase (user accounts and project saving)

This is the step that makes user accounts and saved projects real. Without this, sign-up and login don't work. With it, users can create accounts, save projects, and come back to them later.

### Step 12: Create a Supabase Account

1. Go to **supabase.com**
2. Click **Start your project**
3. Sign up with GitHub (easiest option — keeps everything connected)

### Step 13: Create a New Supabase Project

1. On the Supabase dashboard, click **New project**
2. Fill in:
   - **Project name:** `controlled-convergence`
   - **Database password:** Create a strong password and save it somewhere safe (you'll need this if you ever connect a database tool directly)
   - **Region:** Pick the one closest to where most of your users will be (e.g. US East for North America)
3. Click **Create new project** — this takes about 2 minutes to provision

### Step 14: Run the Database Schema

This creates the tables that store user profiles and projects.

1. In your Supabase project, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase-schema.sql` in your project folder (you can open it in any text editor — TextEdit, VS Code, etc.)
4. Select all the text (Cmd+A) and copy it (Cmd+C)
5. Paste it into the Supabase SQL Editor
6. Click **Run** (the green button, or press Cmd+Enter)

You should see "Success. No rows returned" at the bottom — that means it worked.

> ✅ **Verify:** Click **Table Editor** in the left sidebar. You should see three tables: `user_profiles`, `projects`, and `templates`.

### Step 15: Get Your Supabase API Keys

1. In your Supabase project, click **Settings** (gear icon) in the left sidebar
2. Click **API**
3. You'll see two values you need:
   - **Project URL** — looks like `https://abcdefghijklmn.supabase.co`
   - **anon public** key — a long string starting with `eyJ...`
4. Copy both — you'll need them in the next two steps

### Step 16: Add Your Keys to the Code

Open the file `js/config.js` in your project folder in a text editor. It looks like this:

```
const SUPABASE_URL      = 'YOUR_SUPABASE_URL_HERE';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';
```

Replace `YOUR_SUPABASE_URL_HERE` with your Project URL, and `YOUR_SUPABASE_ANON_KEY_HERE` with your anon public key. Save the file.

> **Is this safe?** Yes. The anon key is designed to be in frontend code. Supabase's Row Level Security (RLS) policies — which the schema already set up — prevent any user from reading or modifying another user's data, even if they have the key.

### Step 17: Decide on Email Confirmation (for your testers)

When someone signs up, Supabase can require them to click a link in a confirmation email before their account is active. This is good for production, but annoying for early testers.

**To turn email confirmation OFF (recommended for testers):**

1. In Supabase, go to **Authentication** in the left sidebar
2. Click **Providers**
3. Click **Email**
4. Toggle **Confirm email** to OFF
5. Click **Save**

Now testers can sign up and log in immediately without checking their email.

**To turn it back ON later** (before launch to real users): follow the same steps and toggle it back to ON.

### Step 18: Configure the Allowed Redirect URL

When Supabase sends password reset or email confirmation emails, it needs to know where to send the user afterward.

1. In Supabase, go to **Authentication → URL Configuration**
2. In **Site URL**, enter your Netlify URL for now: `https://controlled-convergence.netlify.app`
   - Once your real domain is live, come back and change this to `https://controlledconvergence.com`
3. In **Redirect URLs**, add both:
   - `https://controlled-convergence.netlify.app`
   - `https://controlledconvergence.com` (add this even before it's live)
4. Click **Save**

### Step 19: Push the Updated Code to GitHub

Now that you've edited `js/config.js` with your real keys, you need to push those changes so Netlify serves the updated file.

1. Open GitHub Desktop
2. You'll see `js/config.js` listed as a changed file on the left
3. In the Summary field, type: `Add Supabase credentials`
4. Click **Commit to main**
5. Click **Push origin**

Netlify detects the push and rebuilds your site in about 30 seconds.

> ✅ **Check:** Go to your live URL. Open the left sidebar. Click **Create Free Member Account**. A sign-up modal should appear. Create an account. If it works, Supabase is connected. After signing up, you should see your name appear in the sidebar and "Not signed in" change to your name.

### Step 20: Create Test Accounts for Each Tier

Create three test accounts so you can verify tier gating works without switching the DEV toggle.

1. On your live site, go through the sign-up flow three times to create:
   - `free@test.cc`
   - `member@test.cc`
   - `pro@test.cc`
   
   Use any password you want — these are just for testing.

2. In Supabase, go to **Table Editor → user_profiles**
3. Find the row for `member@test.cc` — click the row, then click the `tier` column and change it from `free` to `member`. Click the checkmark to save.
4. Do the same for `pro@test.cc` — change tier to `pro`.

Now you can log in with each account and verify that member-only features are locked for free users and unlocked for member/pro users.

---

## Phase 5 — Asset Optimization (make it fast)

This makes your site load faster with zero extra effort.

1. In Netlify, go to your site dashboard
2. Click **Site configuration → Build & deploy → Post processing**
3. Under **Asset optimization**, enable:
   - ✅ Bundle CSS
   - ✅ Minify CSS
   - ✅ Minify JS
   - ✅ Compress images
4. Click **Save**

---

## How to Update Your Site Going Forward

Every time you make changes to the code:

1. Make your changes (in your sessions with your developer)
2. Copy the updated files into your `controlled-convergence` repository folder (replacing old versions)
3. Open GitHub Desktop — you'll see the list of changed files on the left
4. Type a short description in the Summary box (e.g. `Fix Pugh matrix MAS column`)
5. Click **Commit to main**
6. Click **Push origin**
7. Netlify detects the push and rebuilds — takes about 30 seconds
8. Your live site is updated

---

## What's NOT Ready Yet — The Road Ahead

### AI Coaching

Needs a Netlify serverless function that calls the Anthropic API. The function keeps the API key on the server (never in the browser). When the code is ready:

1. Create a file at `netlify/functions/coaching.js`
2. In Netlify dashboard, go to **Site configuration → Environment variables**
3. Add `ANTHROPIC_API_KEY` with your key from anthropic.com
4. The coaching button in the tool will call `/.netlify/functions/coaching`

### Stripe (Payments)

Handles credit card processing for Pro tier subscriptions. When the code is ready:

1. Go to **stripe.com** and create an account
2. Set up a "Product" for the Pro tier and get API keys
3. Add a webhook that updates the user's `tier` in Supabase when a subscription activates

---

## Quick Reference — Your Accounts Checklist

| Account | URL | Purpose |
|---|---|---|
| GitHub | github.com | Where your code lives |
| GitHub Desktop | desktop.github.com | Push code without a terminal |
| Netlify | netlify.com | Hosts your site |
| Namecheap | namecheap.com | Domain registration |
| Supabase | supabase.com | User accounts + database |
| Stripe | stripe.com | **Future** — payments |

---

## If Something Goes Wrong

**Site shows a blank page or 404:**
Go to Netlify → your site → **Deploys** tab → click the latest deploy → read the deploy log for errors.

**"YOUR_SUPABASE_URL_HERE" still appears in the code:**
The `config.js` edit wasn't pushed. Open GitHub Desktop, check the files changed list, commit, and push.

**Sign-up modal appears but signing up gives an error:**
Go to Supabase → **Authentication → Logs** — the error message will tell you what went wrong. Common issues: email confirmation is ON (turn it off for testers), or the Site URL isn't configured.

**Projects aren't saving:**
Open your browser's developer console (Option+Cmd+J in Chrome). Look for red error messages. If you see "RLS violation," the Row Level Security policies may not have run correctly — re-run the SQL schema.

**Domain isn't loading:**
DNS changes can take up to 48 hours. Check propagation status at **dnschecker.org** — enter your domain and select A record.

**You made a mistake and want to roll back the live site:**
In Netlify → **Deploys** tab → find a previous successful deploy → click it → click **Publish deploy**. Instant rollback.

**You can't find a file:**
Everything is at `github.com/YOUR-USERNAME/controlled-convergence` — browse all files there in a browser.

---

*Guide written April 2026. Refer to `deployment-todo.md` for the full checklist of remaining items.*
