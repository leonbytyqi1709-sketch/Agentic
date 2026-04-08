-- V6: Calendar Events
-- Run in Supabase SQL Editor AFTER v1-v5

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  description text default '',
  starts_at timestamptz not null,
  ends_at timestamptz,
  all_day boolean default false,
  color text default 'primary',
  reminder_minutes int default 1440,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.events enable row level security;

drop policy if exists "Events: own select" on public.events;
create policy "Events: own select" on public.events for select using (auth.uid() = user_id);
drop policy if exists "Events: own insert" on public.events;
create policy "Events: own insert" on public.events for insert with check (auth.uid() = user_id);
drop policy if exists "Events: own update" on public.events;
create policy "Events: own update" on public.events for update using (auth.uid() = user_id);
drop policy if exists "Events: own delete" on public.events;
create policy "Events: own delete" on public.events for delete using (auth.uid() = user_id);

drop trigger if exists trg_events_updated on public.events;
create trigger trg_events_updated before update on public.events
  for each row execute function public.set_updated_at();

create index if not exists events_user_id_idx on public.events(user_id);
create index if not exists events_starts_at_idx on public.events(user_id, starts_at);
