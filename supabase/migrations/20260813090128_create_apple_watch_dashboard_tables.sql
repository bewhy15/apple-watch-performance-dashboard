create table if not exists public.aw_store_targets (
  target_month date not null check (target_month = date_trunc('month', target_month)::date),
  store_id text not null,
  store_name text not null,
  rm text not null default '',
  am text not null default '',
  target numeric not null default 0 check (target >= 0),
  imported_at timestamptz not null default now(),
  primary key (target_month, store_id)
);

create table if not exists public.aw_monthly_sales (
  source_set text not null check (source_set in ('current', 'last_year')),
  sales_month date not null check (sales_month = date_trunc('month', sales_month)::date),
  store_id text not null,
  sales numeric not null default 0 check (sales >= 0),
  imported_at timestamptz not null default now(),
  primary key (source_set, sales_month, store_id)
);

create index if not exists aw_store_targets_rm_am_idx
  on public.aw_store_targets (target_month, rm, am);
create index if not exists aw_monthly_sales_month_store_idx
  on public.aw_monthly_sales (sales_month, store_id);

alter table public.aw_store_targets enable row level security;
alter table public.aw_monthly_sales enable row level security;

grant select on public.aw_store_targets to anon, authenticated;
grant select on public.aw_monthly_sales to anon, authenticated;

drop policy if exists "aw_targets_read_dashboard" on public.aw_store_targets;
create policy "aw_targets_read_dashboard"
  on public.aw_store_targets for select to anon, authenticated using (true);

drop policy if exists "aw_sales_read_dashboard" on public.aw_monthly_sales;
create policy "aw_sales_read_dashboard"
  on public.aw_monthly_sales for select to anon, authenticated using (true);
