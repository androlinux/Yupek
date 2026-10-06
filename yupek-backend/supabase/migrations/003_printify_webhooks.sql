-- Migration 003: Printify Webhooks, Idempotency, and Product Synchronization
-- Paste into Supabase Dashboard > SQL Editor > Run if using Supabase directly.

-- 1. Ensure external identifier column exists and is UNIQUE on products
alter table products add column if not exists printify_product_id text;
create unique index if not exists idx_products_printify_product_id on products (printify_product_id) where printify_product_id is not null;

-- 2. Webhook events table for idempotency and event auditing
create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  event_id text unique not null,
  event_type text not null,
  shop_id text not null,
  resource_id text,
  payload jsonb default '{}'::jsonb,
  status text not null default 'processed', -- 'processed', 'skipped', 'error'
  error_message text,
  processed_at timestamptz default now()
);

create index if not exists idx_webhook_events_event_id on webhook_events (event_id);
create index if not exists idx_webhook_events_shop_id on webhook_events (shop_id);
create index if not exists idx_webhook_events_processed_at on webhook_events (processed_at desc);

-- 3. Printify sync log table for monitoring sync operations
create table if not exists printify_sync_log (
  id uuid primary key default gen_random_uuid(),
  event_id text,
  event_type text not null,
  product_id text,
  action text not null, -- 'created', 'updated', 'archived', 'publish_review'
  status text not null, -- 'success', 'error'
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_printify_sync_log_product_id on printify_sync_log (product_id);
create index if not exists idx_printify_sync_log_created_at on printify_sync_log (created_at desc);

-- 4. Row Level Security policies
alter table webhook_events enable row level security;
alter table printify_sync_log enable row level security;

create policy "service role webhook_events" on webhook_events for all using (true) with check (true);
create policy "service role printify_sync_log" on printify_sync_log for all using (true) with check (true);
