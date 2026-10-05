-- YUPEK Site Config & Content Management System table
create table if not exists site_config (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table site_config enable row level security;

-- Public read access for visitors
create policy "public read config" on site_config
  for select using (true);

-- Public write/update or authenticated update (for anon API or authenticated admin)
create policy "allow config upsert" on site_config
  for all using (true) with check (true);

-- Contact submissions table for inquiries from the contact form
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

create policy "public insert contact" on contact_submissions
  for insert with check (true);

create policy "admin read contact" on contact_submissions
  for select using (true);
