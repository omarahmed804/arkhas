-- "نبهني لما السعر ينزل" — run this once in Supabase → SQL Editor → New query → Run.
create table if not exists price_alerts_live (
  id uuid primary key default gen_random_uuid(),
  product_id text not null,
  product_slug text not null,
  product_name text not null,
  email text not null,
  target_price numeric(12,2) not null,
  lang text not null default 'ar',
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (product_id, email)
);
-- Only the server (service key) can read/write. Visitors go through /api/alerts.
alter table price_alerts_live enable row level security;
