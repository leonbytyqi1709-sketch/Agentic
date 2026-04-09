-- v9: enable Supabase Realtime publication for all user tables
-- Run this once in the Supabase SQL Editor.
-- Without it, postgres_changes subscriptions never receive events.

alter publication supabase_realtime add table public.clients;
alter publication supabase_realtime add table public.projects;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.invoices;
alter publication supabase_realtime add table public.invoice_items;
alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.events;
alter publication supabase_realtime add table public.expenses;
alter publication supabase_realtime add table public.time_entries;
alter publication supabase_realtime add table public.activities;
alter publication supabase_realtime add table public.attachments;

-- If any ALTER fails with "relation is already member of publication",
-- that table is already enabled — safe to ignore.
