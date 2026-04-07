-- V3: Add hourly_rate + currency to profiles
alter table public.profiles
  add column if not exists hourly_rate numeric(10,2) default 0,
  add column if not exists currency text default 'EUR';
