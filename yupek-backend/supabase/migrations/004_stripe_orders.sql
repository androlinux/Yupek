-- =======================================================
-- YUPEK STRIPE -> PRINTIFY ORDER PIPELINE MIGRATION
-- Table schemas for production payment & fulfillment tracking
-- =======================================================

create table if not exists orders (
  id text primary key,
  customer_email text not null,
  customer_name text not null,
  shipping_address jsonb not null,
  currency text not null default 'EUR',
  subtotal_cents int not null,
  shipping_cents int not null,
  vat_cents int not null,
  total_cents int not null,
  payment_status text not null default 'pending', -- pending, paid, failed, refunded
  fulfillment_status text not null default 'pending_payment', -- pending_payment, paid, printify_order_created, sent_to_production, in_production, shipped, delivered, cancelled, failed
  stripe_payment_intent_id text unique,
  printify_order_id text,
  items jsonb not null,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for rapid lookups and idempotency
create index if not exists idx_orders_customer_email on orders (customer_email);
create index if not exists idx_orders_payment_intent on orders (stripe_payment_intent_id);
create index if not exists idx_orders_payment_status on orders (payment_status);
create index if not exists idx_orders_fulfillment_status on orders (fulfillment_status);
create index if not exists idx_orders_created_at on orders (created_at desc);

-- =======================================================
-- STRIPE WEBHOOK DEDUPLICATION & IDEMPOTENCY TABLE
-- =======================================================

create table if not exists stripe_webhook_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text unique not null,
  event_type text not null,
  status text not null default 'processed', -- processed, ignored, error
  error text,
  created_at timestamptz default now(),
  processed_at timestamptz default now()
);

create index if not exists idx_stripe_webhook_events_event_id on stripe_webhook_events (stripe_event_id);

-- Enable RLS
alter table orders enable row level security;
alter table stripe_webhook_events enable row level security;

-- Policies for server access
drop policy if exists "service role orders all" on orders;
create policy "service role orders all" on orders
  for all
  to service_role
  using (true) with check (true);

drop policy if exists "service role webhook events all" on stripe_webhook_events;
create policy "service role webhook events all" on stripe_webhook_events
  for all
  to service_role
  using (true) with check (true);
