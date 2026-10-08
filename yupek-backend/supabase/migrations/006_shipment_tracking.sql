-- =======================================================
-- YUPEK MIGRATION 006: PRINTIFY SHIPMENT TRACKING & STATUS
-- Add tracking details, timestamps, and email guard to orders
-- =======================================================

alter table if exists public.orders
  add column if not exists tracking_number text,
  add column if not exists carrier text,
  add column if not exists tracking_url text,
  add column if not exists shipped_at timestamptz,
  add column if not exists delivered_at timestamptz,
  add column if not exists shipped_email_sent boolean not null default false;

-- Indexes for rapid lookups and filtering
create index if not exists idx_orders_tracking_number on public.orders (tracking_number);
create index if not exists idx_orders_shipped_at on public.orders (shipped_at desc);
create index if not exists idx_orders_shipped_email_sent on public.orders (shipped_email_sent);
