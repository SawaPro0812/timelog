-- TimeLog rls.sql
-- Run in Supabase SQL Editor AFTER schema.sql

-- Enable RLS
alter table public.presets enable row level security;
alter table public.sessions enable row level security;

-- presets policies
drop policy if exists "presets_select_own" on public.presets;
create policy "presets_select_own"
on public.presets for select
using (auth.uid() = user_id);

drop policy if exists "presets_insert_own" on public.presets;
create policy "presets_insert_own"
on public.presets for insert
with check (auth.uid() = user_id);

drop policy if exists "presets_update_own" on public.presets;
create policy "presets_update_own"
on public.presets for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "presets_delete_own" on public.presets;
create policy "presets_delete_own"
on public.presets for delete
using (auth.uid() = user_id);

-- sessions policies
drop policy if exists "sessions_select_own" on public.sessions;
create policy "sessions_select_own"
on public.sessions for select
using (auth.uid() = user_id);

drop policy if exists "sessions_insert_own" on public.sessions;
create policy "sessions_insert_own"
on public.sessions for insert
with check (auth.uid() = user_id);

drop policy if exists "sessions_update_own" on public.sessions;
create policy "sessions_update_own"
on public.sessions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "sessions_delete_own" on public.sessions;
create policy "sessions_delete_own"
on public.sessions for delete
using (auth.uid() = user_id);
