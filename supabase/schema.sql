-- Supabase / Postgres schema matching lib/types.ts.
-- Run in Supabase → SQL Editor when you're ready to move off LocalStorage,
-- then implement a SupabaseRepository (see lib/repository.ts).

create table industries (
  id text primary key,
  name text not null,          -- Arabic
  name_en text not null,
  slug text unique not null,
  icon text not null default 'Package',
  sort_order int not null default 0
);

create table categories (
  id text primary key,
  industry_id text not null references industries(id) on delete restrict,
  name text not null,
  name_en text not null,
  slug text unique not null,   -- /category/[slug]
  icon text not null default 'Package',
  sort_order int not null default 0
);

create table stores (
  id text primary key,
  name text not null,
  name_en text not null,
  url text,                    -- nullable: WhatsApp-only shops
  logo_url text,
  logo_text text not null,
  color text not null default '#2563EB',
  trusted boolean not null default false,
  featured boolean not null default false
);

create table products (
  id text primary key,
  slug text unique not null,   -- /product/[slug]
  name text not null,
  name_ar text,
  brand text not null,
  category_id text not null references categories(id) on delete restrict,
  images text[] not null default '{}',
  specs jsonb not null default '[]',   -- [{label, value}] — works for any industry
  description text,
  popularity int not null default 50,
  created_at timestamptz not null default now()
);

create type offer_link_type as enum ('website', 'whatsapp', 'social');

create table offers (
  product_id text references products(id) on delete cascade,
  store_id text references stores(id) on delete cascade,
  price numeric(12,2) not null check (price > 0),
  old_price numeric(12,2),
  link_type offer_link_type not null default 'website',
  url text,                    -- website / social
  whatsapp_number text,        -- whatsapp
  in_stock boolean not null default true,
  free_shipping boolean not null default false,
  delivery_eta text,
  updated_at timestamptz not null default now(),
  primary key (product_id, store_id),
  check (
    (link_type = 'whatsapp' and whatsapp_number is not null) or
    (link_type <> 'whatsapp' and url is not null)
  )
);

create table price_history (
  product_id text references products(id) on delete cascade,
  date date not null,
  price numeric(12,2) not null,      -- lowest in-stock price that day
  primary key (product_id, date)
);

create table price_alerts (
  id text primary key,
  product_id text references products(id) on delete cascade,
  channel text not null check (channel in ('email', 'whatsapp')),
  contact text not null,
  target_price numeric(12,2) not null,
  created_at timestamptz not null default now()
);

create index on products (category_id);
create index on offers (store_id);

-- Public read, admin-only write (enable RLS and add policies for your admin role):
alter table industries enable row level security;
alter table categories enable row level security;
alter table stores enable row level security;
alter table products enable row level security;
alter table offers enable row level security;
alter table price_history enable row level security;
alter table price_alerts enable row level security;
create policy "public read" on industries for select using (true);
create policy "public read" on categories for select using (true);
create policy "public read" on stores for select using (true);
create policy "public read" on products for select using (true);
create policy "public read" on offers for select using (true);
create policy "public read" on price_history for select using (true);
create policy "anyone can create alert" on price_alerts for insert with check (true);
