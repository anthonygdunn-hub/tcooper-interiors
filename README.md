# T Cooper Interiors — Website Redesign

A full rebuild of the T Cooper Interiors website. Keeps the original brand's
plum/gold identity and logo wordmark, but replaces the Wix template with a
hand-built, fast, mobile-first site backed by a real Supabase database for
enquiries, reviews and the project gallery.

## What's in here

- `index.html`, `styles.css`, `app.js` — the site itself. No build step,
  no framework — just static files you can open directly or deploy anywhere.
- `supabase/migrations/0001_init.sql` — the database schema (already applied
  to the live Supabase project). Keep this in the repo so the schema is
  version-controlled even though it's already live.
- `artifact/` — a self-contained preview copy (images inlined, no live
  network calls) used for quick visual review. Not part of the deployed site.

## Backend (Supabase)

This is wired up to project `acdpgarasgfhvupzsbxf` (your existing
"anthonygdunn-hub's Project"), using three tables:

- `tcooper_enquiries` — quote-form submissions. Public **insert only** —
  nobody but you (via the Supabase dashboard) can read these.
- `tcooper_testimonials` — customer reviews, public read-only. Seeded with
  6 of the real reviews already published on the current site.
- `tcooper_gallery` — completed-project photos, public read-only. Seeded
  with 3 real project photos pulled from the current site.

The publishable (anon) key in `app.js` is safe to expose publicly — it can
only do what the Row Level Security policies above allow.

**To add or edit reviews and gallery photos**, use the Supabase dashboard's
table editor (Table Editor → `tcooper_testimonials` / `tcooper_gallery`) —
no code changes needed. Set `featured = false` to hide an item without
deleting it.

**To see quote requests**, open the Supabase dashboard → Table Editor →
`tcooper_enquiries`.

## Running it locally

No build tools needed:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploying

Any static host works (GitHub Pages, Netlify, Vercel, Cloudflare Pages).
For GitHub Pages:

1. Push this repo to GitHub (see below).
2. In the repo, go to **Settings → Pages**, set source to the `main` branch,
   root folder.
3. Point your domain's DNS at GitHub Pages, or use the `*.github.io` URL
   GitHub gives you.

## Pushing this to GitHub

This folder is already a git repo with one commit. To push it to a new
GitHub repository:

```bash
# 1. Create a new empty repo on github.com (no README/license — just empty)
# 2. Then, from this folder:
git remote add origin https://github.com/<your-username>/tcooper-interiors.git
git branch -M main
git push -u origin main
```

If you use SSH instead of HTTPS, use
`git@github.com:<your-username>/tcooper-interiors.git` as the remote URL.

## Why this beats the local competition

See `COMPETITOR-NOTES.md` for the detailed comparison against three real
local competitors (Atlantis Installations, Surrey Interiors, Winfield
Contracts) researched during the redesign.
