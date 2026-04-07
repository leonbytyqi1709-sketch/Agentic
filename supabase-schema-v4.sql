-- ClientPulse V4 — Expenses, Recurring, Tags, Templates, Attachments, Branding, Public Invoices

-- =========================================
-- EXPENSES
-- =========================================
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  client_id uuid references public.clients(id) on delete set null,
  category text default 'other',
  description text not null,
  amount numeric(12,2) not null default 0,
  date date default current_date,
  billable boolean default false,
  receipt_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.expenses enable row level security;
drop policy if exists "Expenses: own select" on public.expenses;
create policy "Expenses: own select" on public.expenses for select using (auth.uid() = user_id);
drop policy if exists "Expenses: own insert" on public.expenses;
create policy "Expenses: own insert" on public.expenses for insert with check (auth.uid() = user_id);
drop policy if exists "Expenses: own update" on public.expenses;
create policy "Expenses: own update" on public.expenses for update using (auth.uid() = user_id);
drop policy if exists "Expenses: own delete" on public.expenses;
create policy "Expenses: own delete" on public.expenses for delete using (auth.uid() = user_id);

drop trigger if exists trg_expenses_updated on public.expenses;
create trigger trg_expenses_updated before update on public.expenses
  for each row execute function public.set_updated_at();

create index if not exists expenses_user_id_idx on public.expenses(user_id);
create index if not exists expenses_project_id_idx on public.expenses(project_id);

-- =========================================
-- RECURRING INVOICES
-- =========================================
create table if not exists public.recurring_invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  name text not null,
  frequency text default 'monthly', -- weekly, monthly, quarterly, yearly
  next_run date not null,
  tax_rate numeric(5,2) default 19,
  items jsonb default '[]'::jsonb,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.recurring_invoices enable row level security;
drop policy if exists "Recurring: own select" on public.recurring_invoices;
create policy "Recurring: own select" on public.recurring_invoices for select using (auth.uid() = user_id);
drop policy if exists "Recurring: own insert" on public.recurring_invoices;
create policy "Recurring: own insert" on public.recurring_invoices for insert with check (auth.uid() = user_id);
drop policy if exists "Recurring: own update" on public.recurring_invoices;
create policy "Recurring: own update" on public.recurring_invoices for update using (auth.uid() = user_id);
drop policy if exists "Recurring: own delete" on public.recurring_invoices;
create policy "Recurring: own delete" on public.recurring_invoices for delete using (auth.uid() = user_id);

drop trigger if exists trg_recurring_updated on public.recurring_invoices;
create trigger trg_recurring_updated before update on public.recurring_invoices
  for each row execute function public.set_updated_at();

-- =========================================
-- TAGS
-- =========================================
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text default '#E11D48',
  created_at timestamptz default now()
);

alter table public.tags enable row level security;
drop policy if exists "Tags: own" on public.tags;
create policy "Tags: own" on public.tags for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Client & Project tag arrays
alter table public.clients add column if not exists tag_ids uuid[] default '{}';
alter table public.projects add column if not exists tag_ids uuid[] default '{}';

-- =========================================
-- PROJECT TEMPLATES
-- =========================================
create table if not exists public.project_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  description text,
  default_budget numeric(12,2),
  default_status text default 'planning',
  tasks jsonb default '[]'::jsonb, -- [{title, status, priority}]
  created_at timestamptz default now()
);

alter table public.project_templates enable row level security;
drop policy if exists "Templates: own" on public.project_templates;
create policy "Templates: own" on public.project_templates for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================
-- ATTACHMENTS
-- =========================================
create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null, -- 'project' | 'client'
  entity_id uuid not null,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  mime_type text,
  created_at timestamptz default now()
);

alter table public.attachments enable row level security;
drop policy if exists "Attachments: own" on public.attachments;
create policy "Attachments: own" on public.attachments for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists attachments_entity_idx on public.attachments(entity_type, entity_id);

-- Attachments storage bucket
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', false)
on conflict (id) do nothing;

drop policy if exists "Attachments: own read" on storage.objects;
create policy "Attachments: own read" on storage.objects for select
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Attachments: own insert" on storage.objects;
create policy "Attachments: own insert" on storage.objects for insert
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Attachments: own delete" on storage.objects;
create policy "Attachments: own delete" on storage.objects for delete
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = auth.uid()::text);

-- =========================================
-- INVOICE BRANDING (extend profiles)
-- =========================================
alter table public.profiles
  add column if not exists invoice_footer text,
  add column if not exists invoice_accent_color text default '#E11D48',
  add column if not exists address text,
  add column if not exists vat_id text;

-- =========================================
-- PUBLIC INVOICE SHARE TOKENS
-- =========================================
alter table public.invoices
  add column if not exists public_token text unique;

-- Public read policy: allow anyone to SELECT invoices where public_token is provided
-- We'll handle token verification in the app layer via a function
create or replace function public.get_public_invoice(token text)
returns table (
  id uuid,
  number text,
  status text,
  issue_date date,
  due_date date,
  subtotal numeric,
  tax_rate numeric,
  tax_amount numeric,
  total numeric,
  notes text,
  client_name text,
  client_company text,
  client_email text,
  profile_name text,
  profile_company text,
  profile_address text,
  profile_vat text,
  profile_footer text,
  profile_accent text
) language sql security definer as $$
  select
    i.id, i.number, i.status, i.issue_date, i.due_date,
    i.subtotal, i.tax_rate, i.tax_amount, i.total, i.notes,
    c.name, c.company, c.email,
    p.full_name, p.company, p.address, p.vat_id,
    p.invoice_footer, p.invoice_accent_color
  from public.invoices i
  left join public.clients c on c.id = i.client_id
  left join public.profiles p on p.id = i.user_id
  where i.public_token = token
  limit 1;
$$;

create or replace function public.get_public_invoice_items(token text)
returns table (
  description text,
  quantity numeric,
  unit_price numeric,
  amount numeric,
  item_position int
) language sql security definer as $$
  select it.description, it.quantity, it.unit_price, it.amount, it.position
  from public.invoice_items it
  join public.invoices i on i.id = it.invoice_id
  where i.public_token = token
  order by it.position;
$$;

grant execute on function public.get_public_invoice(text) to anon, authenticated;
grant execute on function public.get_public_invoice_items(text) to anon, authenticated;
