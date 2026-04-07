-- ClientPulse V2 Schema — run AFTER the base schema
-- Adds: profiles, tasks, invoices, invoice_items, time_entries, activities
-- Plus: updated_at triggers, storage bucket for avatars

-- =========================================
-- updated_at TRIGGER FUNCTION
-- =========================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_clients_updated on public.clients;
create trigger trg_clients_updated before update on public.clients
  for each row execute function public.set_updated_at();

drop trigger if exists trg_projects_updated on public.projects;
create trigger trg_projects_updated before update on public.projects
  for each row execute function public.set_updated_at();

-- =========================================
-- PROFILES
-- =========================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company text,
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles: select own" on public.profiles;
create policy "Profiles: select own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "Profiles: insert own" on public.profiles;
create policy "Profiles: insert own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "Profiles: update own" on public.profiles;
create policy "Profiles: update own" on public.profiles for update using (auth.uid() = id);

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================
-- TASKS
-- =========================================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status text default 'todo', -- todo, in_progress, review, done
  priority text default 'medium', -- low, medium, high
  due_date date,
  position int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.tasks enable row level security;
drop policy if exists "Tasks: own select" on public.tasks;
create policy "Tasks: own select" on public.tasks for select using (auth.uid() = user_id);
drop policy if exists "Tasks: own insert" on public.tasks;
create policy "Tasks: own insert" on public.tasks for insert with check (auth.uid() = user_id);
drop policy if exists "Tasks: own update" on public.tasks;
create policy "Tasks: own update" on public.tasks for update using (auth.uid() = user_id);
drop policy if exists "Tasks: own delete" on public.tasks;
create policy "Tasks: own delete" on public.tasks for delete using (auth.uid() = user_id);

drop trigger if exists trg_tasks_updated on public.tasks;
create trigger trg_tasks_updated before update on public.tasks
  for each row execute function public.set_updated_at();

create index if not exists tasks_user_id_idx on public.tasks(user_id);
create index if not exists tasks_project_id_idx on public.tasks(project_id);

-- =========================================
-- INVOICES
-- =========================================
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  number text not null,
  status text default 'draft', -- draft, sent, paid, overdue
  issue_date date default current_date,
  due_date date,
  subtotal numeric(12,2) default 0,
  tax_rate numeric(5,2) default 19,
  tax_amount numeric(12,2) default 0,
  total numeric(12,2) default 0,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.invoices enable row level security;
drop policy if exists "Invoices: own select" on public.invoices;
create policy "Invoices: own select" on public.invoices for select using (auth.uid() = user_id);
drop policy if exists "Invoices: own insert" on public.invoices;
create policy "Invoices: own insert" on public.invoices for insert with check (auth.uid() = user_id);
drop policy if exists "Invoices: own update" on public.invoices;
create policy "Invoices: own update" on public.invoices for update using (auth.uid() = user_id);
drop policy if exists "Invoices: own delete" on public.invoices;
create policy "Invoices: own delete" on public.invoices for delete using (auth.uid() = user_id);

drop trigger if exists trg_invoices_updated on public.invoices;
create trigger trg_invoices_updated before update on public.invoices
  for each row execute function public.set_updated_at();

create index if not exists invoices_user_id_idx on public.invoices(user_id);
create index if not exists invoices_client_id_idx on public.invoices(client_id);

-- =========================================
-- INVOICE ITEMS
-- =========================================
create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) default 1,
  unit_price numeric(12,2) default 0,
  amount numeric(12,2) default 0,
  position int default 0
);

alter table public.invoice_items enable row level security;
drop policy if exists "Invoice items: own select" on public.invoice_items;
create policy "Invoice items: own select" on public.invoice_items for select
  using (exists (select 1 from public.invoices i where i.id = invoice_id and i.user_id = auth.uid()));
drop policy if exists "Invoice items: own insert" on public.invoice_items;
create policy "Invoice items: own insert" on public.invoice_items for insert
  with check (exists (select 1 from public.invoices i where i.id = invoice_id and i.user_id = auth.uid()));
drop policy if exists "Invoice items: own update" on public.invoice_items;
create policy "Invoice items: own update" on public.invoice_items for update
  using (exists (select 1 from public.invoices i where i.id = invoice_id and i.user_id = auth.uid()));
drop policy if exists "Invoice items: own delete" on public.invoice_items;
create policy "Invoice items: own delete" on public.invoice_items for delete
  using (exists (select 1 from public.invoices i where i.id = invoice_id and i.user_id = auth.uid()));

-- =========================================
-- TIME ENTRIES
-- =========================================
create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  description text,
  started_at timestamptz not null,
  ended_at timestamptz,
  duration_seconds int,
  billable boolean default true,
  created_at timestamptz default now()
);

alter table public.time_entries enable row level security;
drop policy if exists "Time: own select" on public.time_entries;
create policy "Time: own select" on public.time_entries for select using (auth.uid() = user_id);
drop policy if exists "Time: own insert" on public.time_entries;
create policy "Time: own insert" on public.time_entries for insert with check (auth.uid() = user_id);
drop policy if exists "Time: own update" on public.time_entries;
create policy "Time: own update" on public.time_entries for update using (auth.uid() = user_id);
drop policy if exists "Time: own delete" on public.time_entries;
create policy "Time: own delete" on public.time_entries for delete using (auth.uid() = user_id);

create index if not exists time_entries_user_id_idx on public.time_entries(user_id);
create index if not exists time_entries_project_id_idx on public.time_entries(project_id);

-- =========================================
-- ACTIVITIES
-- =========================================
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  entity_type text,
  entity_id uuid,
  entity_name text,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table public.activities enable row level security;
drop policy if exists "Activities: own select" on public.activities;
create policy "Activities: own select" on public.activities for select using (auth.uid() = user_id);
drop policy if exists "Activities: own insert" on public.activities;
create policy "Activities: own insert" on public.activities for insert with check (auth.uid() = user_id);
drop policy if exists "Activities: own delete" on public.activities;
create policy "Activities: own delete" on public.activities for delete using (auth.uid() = user_id);

create index if not exists activities_user_id_created_idx on public.activities(user_id, created_at desc);

-- =========================================
-- STORAGE: avatars bucket
-- =========================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatars: public read" on storage.objects;
create policy "Avatars: public read" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Avatars: own insert" on storage.objects;
create policy "Avatars: own insert" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Avatars: own update" on storage.objects;
create policy "Avatars: own update" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Avatars: own delete" on storage.objects;
create policy "Avatars: own delete" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
