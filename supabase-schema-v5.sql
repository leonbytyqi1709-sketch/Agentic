-- V5: Global Notes (free notepad) + updated_at auto-updater
-- Run this in Supabase SQL Editor AFTER v1-v4

-- =========================================
-- NOTES (global, not tied to a project)
-- =========================================
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text default '',
  content text default '',
  pinned boolean default false,
  color text default 'primary',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.notes enable row level security;

drop policy if exists "Notes: own select" on public.notes;
create policy "Notes: own select" on public.notes for select using (auth.uid() = user_id);
drop policy if exists "Notes: own insert" on public.notes;
create policy "Notes: own insert" on public.notes for insert with check (auth.uid() = user_id);
drop policy if exists "Notes: own update" on public.notes;
create policy "Notes: own update" on public.notes for update using (auth.uid() = user_id);
drop policy if exists "Notes: own delete" on public.notes;
create policy "Notes: own delete" on public.notes for delete using (auth.uid() = user_id);

drop trigger if exists trg_notes_updated on public.notes;
create trigger trg_notes_updated before update on public.notes
  for each row execute function public.set_updated_at();

create index if not exists notes_user_id_idx on public.notes(user_id);
create index if not exists notes_pinned_idx on public.notes(user_id, pinned desc, updated_at desc);
