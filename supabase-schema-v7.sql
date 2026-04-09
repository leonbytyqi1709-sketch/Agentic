-- V7: Gmail Integration
-- Run in Supabase SQL Editor AFTER v1-v6

-- 1. Remember which Google account a user has connected (display only)
create table if not exists public.gmail_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  connected_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.gmail_connections enable row level security;

drop policy if exists "Gmail: own select" on public.gmail_connections;
create policy "Gmail: own select" on public.gmail_connections for select using (auth.uid() = user_id);
drop policy if exists "Gmail: own insert" on public.gmail_connections;
create policy "Gmail: own insert" on public.gmail_connections for insert with check (auth.uid() = user_id);
drop policy if exists "Gmail: own update" on public.gmail_connections;
create policy "Gmail: own update" on public.gmail_connections for update using (auth.uid() = user_id);
drop policy if exists "Gmail: own delete" on public.gmail_connections;
create policy "Gmail: own delete" on public.gmail_connections for delete using (auth.uid() = user_id);

drop trigger if exists trg_gmail_connections_updated on public.gmail_connections;
create trigger trg_gmail_connections_updated before update on public.gmail_connections
  for each row execute function public.set_updated_at();

-- 2. Emails pinned to a client or project
create table if not exists public.email_pins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  gmail_message_id text not null,
  gmail_thread_id text,
  from_email text,
  from_name text,
  subject text,
  snippet text,
  message_date timestamptz,
  pinned_at timestamptz default now(),
  constraint email_pins_one_target check (
    client_id is not null or project_id is not null
  )
);

alter table public.email_pins enable row level security;

drop policy if exists "EmailPins: own select" on public.email_pins;
create policy "EmailPins: own select" on public.email_pins for select using (auth.uid() = user_id);
drop policy if exists "EmailPins: own insert" on public.email_pins;
create policy "EmailPins: own insert" on public.email_pins for insert with check (auth.uid() = user_id);
drop policy if exists "EmailPins: own update" on public.email_pins;
create policy "EmailPins: own update" on public.email_pins for update using (auth.uid() = user_id);
drop policy if exists "EmailPins: own delete" on public.email_pins;
create policy "EmailPins: own delete" on public.email_pins for delete using (auth.uid() = user_id);

create index if not exists email_pins_user_idx on public.email_pins(user_id);
create index if not exists email_pins_client_idx on public.email_pins(client_id);
create index if not exists email_pins_project_idx on public.email_pins(project_id);
create unique index if not exists email_pins_unique
  on public.email_pins(user_id, gmail_message_id, coalesce(client_id::text, ''), coalesce(project_id::text, ''));
