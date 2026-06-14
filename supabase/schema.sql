-- ============================================================================
-- Design By Brandon — projects schema
-- Run this in the Supabase dashboard → SQL Editor → New query → Run.
-- Safe to re-run: it uses "if not exists" / "drop policy if exists".
-- ============================================================================

-- 1. PROJECTS TABLE --------------------------------------------------------
create table if not exists public.projects (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name          text not null,
  description   text not null default '',      -- short blurb (monitor hover + card)
  body          text not null default '',      -- long-form case study (markdown)
  cover_image   text not null default '',      -- public URL of the cover image
  gallery       jsonb not null default '[]',   -- array of image URL strings
  year          text not null default '',
  role          text not null default '',
  tags          text[] not null default '{}',
  url           text,                           -- optional external/live link
  display_order int  not null default 0,       -- lower = shown first
  published     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists projects_published_order_idx
  on public.projects (published, display_order);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists projects_set_updated_at on public.projects;
create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

-- 2. ROW LEVEL SECURITY ----------------------------------------------------
alter table public.projects enable row level security;

-- Anyone (anon) may read published projects.
drop policy if exists "public reads published projects" on public.projects;
create policy "public reads published projects"
  on public.projects for select
  using (published = true);

-- Any signed-in user may read everything (admin needs to see drafts).
drop policy if exists "authenticated reads all projects" on public.projects;
create policy "authenticated reads all projects"
  on public.projects for select
  to authenticated
  using (true);

-- Only signed-in users may write.
drop policy if exists "authenticated writes projects" on public.projects;
create policy "authenticated writes projects"
  on public.projects for all
  to authenticated
  using (true)
  with check (true);

-- 3. STORAGE BUCKET FOR IMAGES --------------------------------------------
insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;

-- Public read of images.
drop policy if exists "public reads project images" on storage.objects;
create policy "public reads project images"
  on storage.objects for select
  using (bucket_id = 'project-images');

-- Signed-in users may upload / update / delete images.
drop policy if exists "authenticated writes project images" on storage.objects;
create policy "authenticated writes project images"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'project-images')
  with check (bucket_id = 'project-images');

-- 4. SEED — your current 5 projects (cover images still served from /public)
insert into public.projects (slug, name, description, cover_image, display_order)
values
  ('ferrari',      'Ferrari',      'Premium automotive design',   '/images/ferrari.jpg',      0),
  ('alfa-romeo',   'Alfa Romeo',   'Timeless Italian elegance',   '/images/alfa-romeo.jpg',   1),
  ('red-bull',     'Red Bull',     'Dynamic brand presence',      '/images/red-bull.jpg',     2),
  ('aston-martin', 'Aston Martin', 'Luxury craftsmanship',        '/images/aston-martin.jpg', 3),
  ('mercedes',     'Mercedes',     'Engineering excellence',      '/images/mercedes.jpg',     4)
on conflict (slug) do nothing;
