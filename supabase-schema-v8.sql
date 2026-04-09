-- V8: Quotes / Angebote
-- Run in Supabase SQL Editor AFTER v1-v7

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  number text not null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'accepted', 'declined', 'expired')),
  issue_date date default current_date,
  valid_until date,
  subtotal numeric(12,2) default 0,
  tax_rate numeric(5,2) default 19,
  tax_amount numeric(12,2) default 0,
  total numeric(12,2) default 0,
  notes text,
  /** When accepted + converted, points to the invoice */
  converted_invoice_id uuid references public.invoices(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.quote_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  description text not null,
  quantity numeric(10,2) default 1,
  unit_price numeric(12,2) default 0,
  amount numeric(12,2) default 0,
  position int default 0
);

alter table public.quotes enable row level security;
alter table public.quote_items enable row level security;

drop policy if exists "Quotes: own select" on public.quotes;
create policy "Quotes: own select" on public.quotes for select using (auth.uid() = user_id);
drop policy if exists "Quotes: own insert" on public.quotes;
create policy "Quotes: own insert" on public.quotes for insert with check (auth.uid() = user_id);
drop policy if exists "Quotes: own update" on public.quotes;
create policy "Quotes: own update" on public.quotes for update using (auth.uid() = user_id);
drop policy if exists "Quotes: own delete" on public.quotes;
create policy "Quotes: own delete" on public.quotes for delete using (auth.uid() = user_id);

drop policy if exists "QuoteItems: own select" on public.quote_items;
create policy "QuoteItems: own select" on public.quote_items for select
  using (exists (select 1 from public.quotes q where q.id = quote_items.quote_id and q.user_id = auth.uid()));
drop policy if exists "QuoteItems: own insert" on public.quote_items;
create policy "QuoteItems: own insert" on public.quote_items for insert
  with check (exists (select 1 from public.quotes q where q.id = quote_items.quote_id and q.user_id = auth.uid()));
drop policy if exists "QuoteItems: own update" on public.quote_items;
create policy "QuoteItems: own update" on public.quote_items for update
  using (exists (select 1 from public.quotes q where q.id = quote_items.quote_id and q.user_id = auth.uid()));
drop policy if exists "QuoteItems: own delete" on public.quote_items;
create policy "QuoteItems: own delete" on public.quote_items for delete
  using (exists (select 1 from public.quotes q where q.id = quote_items.quote_id and q.user_id = auth.uid()));

drop trigger if exists trg_quotes_updated on public.quotes;
create trigger trg_quotes_updated before update on public.quotes
  for each row execute function public.set_updated_at();

create index if not exists quotes_user_idx on public.quotes(user_id);
create index if not exists quotes_client_idx on public.quotes(client_id);
create index if not exists quotes_project_idx on public.quotes(project_id);
create index if not exists quotes_status_idx on public.quotes(user_id, status);
create index if not exists quote_items_quote_idx on public.quote_items(quote_id);

-- Auto-number quotes per user (Q-2026-0001 style)
create or replace function public.next_quote_number(p_user_id uuid)
returns text language plpgsql as $$
declare
  yr text := to_char(now(), 'YYYY');
  seq int;
begin
  select coalesce(max(substring(number from '\d+$')::int), 0) + 1
    into seq
    from public.quotes
    where user_id = p_user_id and number like 'Q-' || yr || '-%';
  return 'Q-' || yr || '-' || lpad(seq::text, 4, '0');
end;
$$;
