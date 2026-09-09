alter table public.projects
  add column if not exists case_study jsonb not null default '{}'::jsonb;
