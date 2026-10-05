-- YUPEK schema. Paste into Supabase Dashboard > SQL Editor > Run.
create extension if not exists pg_trgm;
create extension if not exists pgcrypto;

create table suppliers (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  type text not null,
  api_base text,
  config jsonb default '{}'::jsonb,
  active boolean default true
);

create table products (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity unique,
  slug text unique not null,
  name text not null,
  short_descriptor text,
  description text,
  material text,
  category text not null,
  gender text not null default 'unisex' check (gender in ('men','women','unisex')),
  tags text[] default '{}',
  badge text,
  featured boolean default false,
  new_arrival boolean default false,
  status text not null default 'draft' check (status in ('active','draft','archived')),
  supplier_id uuid references suppliers(id),
  supplier_product_id text,
  supplier_price_cents int,
  shipping_days int,
  created_at timestamptz default now(),
  unique (supplier_id, supplier_product_id)
);

create table product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  sku text unique not null,
  size text not null,
  color text not null,
  price_cents int not null check (price_cents >= 0),
  currency text not null default 'EUR',
  inventory int,
  supplier_variant_id text
);

create table product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  url text not null,
  alt text,
  position int not null default 1
);

create table cart_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  variant_id uuid not null references product_variants(id) on delete cascade,
  quantity int not null check (quantity between 1 and 10),
  primary key (user_id, variant_id)
);

create table wishlists (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  primary key (user_id, product_id)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  status text not null default 'pending',
  subtotal_cents int not null,
  shipping_cents int not null,
  vat_cents int not null,
  total_cents int not null,
  delivery text,
  address jsonb,
  payment_provider text,
  payment_ref text,
  supplier_order_ref text,
  notes text,
  created_at timestamptz default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  variant_id uuid references product_variants(id) on delete set null,
  quantity int not null,
  unit_price_cents int not null
);

create table supplier_sync_log (
  id uuid primary key default gen_random_uuid(),
  supplier_id uuid references suppliers(id) on delete cascade,
  products int, variants int,
  created_at timestamptz default now()
);

-- Indexes
create index products_filter_idx on products (status, category, gender, new_arrival, seq desc);
create index products_tags_gin on products using gin (tags);
create index products_name_trgm on products using gin (name gin_trgm_ops);
create index variants_product_idx on product_variants (product_id);
create index variants_price_idx on product_variants (price_cents);
create index images_product_idx on product_images (product_id, position);
create index orders_user_idx on orders (user_id, created_at desc);
create index order_items_order_idx on order_items (order_id);

-- Card view used by the shop grid (single query, no joins in the API)
create view product_cards as
select p.id, p.seq, p.slug, p.name, p.short_descriptor, p.category, p.gender, p.tags,
       array_to_string(p.tags, ' ') as tags_text, p.badge, p.featured, p.new_arrival, p.created_at,
       (select url from product_images i where i.product_id = p.id order by position limit 1 offset 0) as image,
       (select url from product_images i where i.product_id = p.id order by position limit 1 offset 1) as image_hover,
       min(v.price_cents) as min_price_cents,
       coalesce(min(v.currency), 'EUR') as currency,
       coalesce(array_agg(distinct v.size) filter (where v.size is not null), '{}') as sizes,
       coalesce(array_agg(distinct v.color) filter (where v.color is not null), '{}') as colors
from products p
left join product_variants v on v.product_id = p.id
where p.status = 'active'
group by p.id;

-- Row Level Security (defence in depth; the API uses the service role)
alter table suppliers enable row level security;
alter table products enable row level security;
alter table product_variants enable row level security;
alter table product_images enable row level security;
alter table cart_items enable row level security;
alter table wishlists enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table supplier_sync_log enable row level security;

create policy "public read products" on products for select using (status = 'active');
create policy "public read variants" on product_variants for select
  using (exists (select 1 from products p where p.id = product_id and p.status = 'active'));
create policy "public read images" on product_images for select
  using (exists (select 1 from products p where p.id = product_id and p.status = 'active'));
create policy "own cart" on cart_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own wishlist" on wishlists for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own orders" on orders for select using (auth.uid() = user_id);
create policy "own order items" on order_items for select
  using (exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid()));
-- suppliers + sync log: no policies = service role only
