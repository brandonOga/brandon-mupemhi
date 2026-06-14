# Supabase setup — projects + admin dashboard

This site reads projects from Supabase and lets you manage them at **`/admin`**
without touching code. Until you complete the steps below, the site falls back
to the 5 bundled projects and `/admin` shows a "not configured" notice — so
nothing breaks while you set up.

Follow these once.

## 1. Create a Supabase project

1. Go to <https://supabase.com> → sign in → **New project**.
2. Pick a name, a strong database password, and a region close to you.
3. Wait ~2 minutes for it to provision.

## 2. Create the database table + storage bucket

1. In the project, open **SQL Editor** → **New query**.
2. Open [`supabase/schema.sql`](supabase/schema.sql) from this repo, copy its
   entire contents into the editor, and click **Run**.
3. This creates the `projects` table, security rules, the `project-images`
   storage bucket, and seeds your current 5 projects.

## 3. Get your API keys

1. Go to **Project Settings** (gear icon) → **API**.
2. Copy the **Project URL** and the **anon / public** key.
3. In the repo root, copy `.env.local.example` to `.env.local` and fill them in:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT-REF.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
   ```

4. Restart the dev server (`npm run dev`) so it picks up the new env vars.

> The anon key is safe to expose in the browser — all access is gated by the
> Row Level Security rules created in step 2. There is no service-role key in
> this app, by design.

## 4. Create your admin login

You are the only person who can sign in; public signups are off.

1. In Supabase, go to **Authentication** → **Users** → **Add user** →
   **Create new user**.
2. Enter your email and a password, and tick **Auto Confirm User** (so you can
   log in immediately without an email confirmation step).
3. (Recommended) Go to **Authentication** → **Providers** → **Email** and turn
   **Allow new users to sign up** **off**, so only users you create can exist.

## 5. Use it

1. Visit `/admin`. You'll be sent to `/admin/login`.
2. Sign in with the email/password from step 4.
3. Add, edit, reorder, publish/unpublish, and delete projects. Cover and
   gallery images upload straight to Supabase Storage.

New/changed projects appear on the live site within ~60 seconds (pages use
incremental revalidation), or immediately after a redeploy.

## Deploying (e.g. Vercel)

Add the same two env vars (`NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY`) in your hosting provider's project settings.

## Notes

- **Images**: the 5 seeded projects keep using the images in `public/images`.
  Anything you upload through the dashboard goes to Supabase Storage.
- **Drafts**: untick "Published" to hide a project from the site while keeping
  it in the dashboard.
- **Data model**: `name`, `slug`, short `description`, long-form `body`,
  `cover_image`, `gallery[]`, `year`, `role`, `tags[]`, optional `url`,
  `display_order`, `published`.
