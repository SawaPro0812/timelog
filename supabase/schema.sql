-- TimeLog schema.sql
-- Run in Supabase SQL Editor

-- 1) presets
create table if not exists public.presets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null,
  work_mode text not null check (work_mode in ('timed', 'manual')),
  work_seconds integer null check (work_seconds is null or work_seconds >= 0),
  rest_seconds integer not null check (rest_seconds >= 0),

  created_at timestamp with time zone not null default now()
);

create index if not exists presets_user_id_idx on public.presets(user_id);
create index if not exists presets_created_at_idx on public.presets(created_at desc);

-- 2) sessions
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  preset_id uuid null references public.presets(id) on delete set null,

  started_at timestamp with time zone not null default now(),
  ended_at timestamp with time zone null,

  sets_completed integer not null default 0 check (sets_completed >= 0),
  total_rest_seconds integer not null default 0 check (total_rest_seconds >= 0),
  total_work_seconds integer not null default 0 check (total_work_seconds >= 0)
);

create index if not exists sessions_user_id_idx on public.sessions(user_id);
create index if not exists sessions_started_at_idx on public.sessions(started_at desc);
create index if not exists sessions_preset_id_idx on public.sessions(preset_id);
