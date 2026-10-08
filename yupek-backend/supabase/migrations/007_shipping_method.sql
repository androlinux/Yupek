-- =======================================================
-- YUPEK MIGRATION 007: DYNAMIC SHIPPING METHOD & DELIVERY METADATA
-- Add normalized shipping method, label, provider, and delivery estimates
-- =======================================================

alter table if exists public.orders
  add column if not exists shipping_method text,
  add column if not exists shipping_method_label text,
  add column if not exists shipping_currency text default 'EUR',
  add column if not exists shipping_provider text,
  add column if not exists estimated_delivery_min int,
  add column if not exists estimated_delivery_max int;

-- Indexes for rapid lookups and analytics
create index if not exists idx_orders_shipping_method on public.orders (shipping_method);
