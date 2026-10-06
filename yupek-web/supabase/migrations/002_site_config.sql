-- =======================================================
-- YUPEK Site Config & Content Management System table
-- Source of truth for CMS configuration, banners, products
-- =======================================================

create table if not exists site_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table site_config enable row level security;

-- Public read access for visitors & storefront
drop policy if exists "public read config" on site_config;
create policy "public read config" on site_config
  for select using (true);

-- Allow upsert for server-side operations
drop policy if exists "allow config upsert" on site_config;
create policy "allow config upsert" on site_config
  for all using (true) with check (true);

-- =======================================================
-- Contact inquiries table
-- =======================================================

create table if not exists contact_submissions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  subject text,
  message text not null,
  created_at timestamptz default now(),
  status text default 'new'
);

alter table contact_submissions enable row level security;

drop policy if exists "public insert contact" on contact_submissions;
create policy "public insert contact" on contact_submissions
  for insert with check (true);

drop policy if exists "admin read contact" on contact_submissions;
create policy "admin read contact" on contact_submissions
  for select using (true);
