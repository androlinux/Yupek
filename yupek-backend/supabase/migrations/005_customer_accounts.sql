-- =======================================================
-- YUPEK CUSTOMER ACCOUNT SYSTEM MIGRATION (005)
-- Customer Profiles, Addresses, Wishlist, Order Linking & RLS
-- =======================================================

-- 1. ADD USER_ID TO ORDERS TABLE (GUEST CHECKOUT SUPPORT: NULLABLE)
alter table if exists public.orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists idx_orders_user_id on public.orders (user_id);

-- 2. ORDERS ROW LEVEL SECURITY
alter table public.orders enable row level security;

-- Customer can SELECT only own orders
drop policy if exists "Users can view own orders" on public.orders;
create policy "Users can view own orders"
  on public.orders
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Backend service_role has full management access
drop policy if exists "service role orders all" on public.orders;
create policy "service role orders all"
  on public.orders
  for all
  to service_role
  using (true)
  with check (true);

-- 3. CUSTOMER PROFILES TABLE
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text default '',
  last_name text default '',
  phone text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

-- Customer can only access and update their own profile
drop policy if exists "Users can select own profile" on public.profiles;
create policy "Users can select own profile"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Backend service_role full management access
drop policy if exists "service role profiles all" on public.profiles;
create policy "service role profiles all"
  on public.profiles
  for all
  to service_role
  using (true)
  with check (true);

-- 4. PROFILE CREATION TRIGGER ON AUTH.USERS INSERT
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', split_part(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), ' ', 1), ''),
    coalesce(new.raw_user_meta_data->>'last_name', nullif(substr(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), length(split_part(coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''), ' ', 1)) + 2), ''), ''),
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do update set
    first_name = coalesce(nullif(excluded.first_name, ''), public.profiles.first_name),
    last_name = coalesce(nullif(excluded.last_name, ''), public.profiles.last_name),
    phone = coalesce(nullif(excluded.phone, ''), public.profiles.phone),
    updated_at = now();
  return new;
exception
  when others then
    return new; -- Safe: trigger must never break signup if an error occurs
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 5. CUSTOMER ADDRESSES TABLE
create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  address1 text not null default '',
  address2 text default '',
  city text not null default '',
  postal_code text not null default '',
  country text not null default 'Netherlands',
  phone text default '',
  is_default boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_addresses_user_id on public.addresses (user_id);

alter table public.addresses enable row level security;

-- Customer can only CRUD their own addresses
drop policy if exists "Users can view own addresses" on public.addresses;
create policy "Users can view own addresses"
  on public.addresses
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own addresses" on public.addresses;
create policy "Users can insert own addresses"
  on public.addresses
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own addresses" on public.addresses;
create policy "Users can update own addresses"
  on public.addresses
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own addresses" on public.addresses;
create policy "Users can delete own addresses"
  on public.addresses
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Backend service_role full management access
drop policy if exists "service role addresses all" on public.addresses;
create policy "service role addresses all"
  on public.addresses
  for all
  to service_role
  using (true)
  with check (true);

-- Ensure only ONE default address per user
create or replace function public.handle_address_default()
returns trigger as $$
begin
  if new.is_default = true then
    update public.addresses
    set is_default = false
    where user_id = new.user_id and id != new.id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_address_default on public.addresses;
create trigger trg_address_default
  before insert or update of is_default on public.addresses
  for each row
  when (new.is_default = true)
  execute function public.handle_address_default();

-- 6. WISHLISTS TABLE
create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);

create index if not exists idx_wishlists_user_id on public.wishlists (user_id);

alter table public.wishlists enable row level security;

-- Customer can only access and modify their own wishlist
drop policy if exists "Users can view own wishlist" on public.wishlists;
create policy "Users can view own wishlist"
  on public.wishlists
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own wishlist" on public.wishlists;
create policy "Users can insert own wishlist"
  on public.wishlists
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own wishlist" on public.wishlists;
create policy "Users can delete own wishlist"
  on public.wishlists
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- Backend service_role full management access
drop policy if exists "service role wishlists all" on public.wishlists;
create policy "service role wishlists all"
  on public.wishlists
  for all
  to service_role
  using (true)
  with check (true);

-- 7. AUDIT WEBHOOK EVENTS TABLE SERVICE ROLE POLICY
alter table if exists public.stripe_webhook_events enable row level security;

drop policy if exists "service role webhook events all" on public.stripe_webhook_events;
create policy "service role webhook events all"
  on public.stripe_webhook_events
  for all
  to service_role
  using (true)
  with check (true);
