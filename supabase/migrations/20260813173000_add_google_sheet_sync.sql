create table if not exists public.aw_sync_status (
  id boolean primary key default true check (id),
  source_sheet_id text not null,
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  source_latest_date date,
  target_month date,
  target_count integer not null default 0,
  current_count integer not null default 0,
  previous_count integer not null default 0,
  last_year_count integer not null default 0,
  target_total numeric not null default 0,
  current_total numeric not null default 0,
  previous_total numeric not null default 0,
  last_year_total numeric not null default 0,
  last_error text
);

alter table public.aw_sync_status enable row level security;
grant select on public.aw_sync_status to anon, authenticated;

drop policy if exists "aw_sync_status_read_dashboard" on public.aw_sync_status;
create policy "aw_sync_status_read_dashboard"
  on public.aw_sync_status for select to anon, authenticated using (true);

insert into public.aw_sync_status (
  id, source_sheet_id, last_attempt_at, last_success_at, source_latest_date,
  target_month, target_count, current_count, previous_count, last_year_count,
  target_total, current_total, previous_total, last_year_total
)
select
  true,
  '1mtjBRN84PQDXhGzWRgQ82ImHJrKml29z7cftl-15crc',
  now(),
  now(),
  date '2026-08-12',
  (select max(target_month) from public.aw_store_targets),
  (select count(*) from public.aw_store_targets where target_month = (select max(target_month) from public.aw_store_targets)),
  (select count(*) from public.aw_monthly_sales where source_set = 'current' and sales_month = date '2026-08-01'),
  (select count(*) from public.aw_monthly_sales where source_set = 'current' and sales_month = date '2026-07-01'),
  (select count(*) from public.aw_monthly_sales where source_set = 'last_year' and sales_month = date '2025-08-01'),
  (select coalesce(sum(target), 0) from public.aw_store_targets where target_month = (select max(target_month) from public.aw_store_targets)),
  (select coalesce(sum(sales), 0) from public.aw_monthly_sales where source_set = 'current' and sales_month = date '2026-08-01'),
  (select coalesce(sum(sales), 0) from public.aw_monthly_sales where source_set = 'current' and sales_month = date '2026-07-01'),
  (select coalesce(sum(sales), 0) from public.aw_monthly_sales where source_set = 'last_year' and sales_month = date '2025-08-01')
on conflict (id) do nothing;

create or replace function public.sync_aw_dashboard_from_sheet(
  p_target_month date,
  p_current_month date,
  p_previous_month date,
  p_last_year_month date,
  p_latest_date date,
  p_targets jsonb,
  p_current jsonb,
  p_previous jsonb,
  p_last_year jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_target_count integer;
  v_current_count integer;
  v_previous_count integer;
  v_last_year_count integer;
  v_target_total numeric;
  v_current_total numeric;
  v_previous_total numeric;
  v_last_year_total numeric;
begin
  if p_target_month <> date_trunc('month', p_target_month)::date
     or p_current_month <> date_trunc('month', p_current_month)::date
     or p_previous_month <> (p_current_month - interval '1 month')::date
     or p_last_year_month <> (p_current_month - interval '1 year')::date
     or p_latest_date < p_current_month
     or p_latest_date >= (p_current_month + interval '1 month')::date then
    raise exception 'Invalid sync periods';
  end if;

  if jsonb_typeof(p_targets) <> 'array'
     or jsonb_typeof(p_current) <> 'array'
     or jsonb_typeof(p_previous) <> 'array'
     or jsonb_typeof(p_last_year) <> 'array' then
    raise exception 'Sync payloads must be JSON arrays';
  end if;

  delete from public.aw_store_targets;
  insert into public.aw_store_targets (target_month, store_id, store_name, rm, am, target, imported_at)
  select p_target_month, x.store_id, x.store_name, x.rm, x.am, x.target, now()
  from jsonb_to_recordset(p_targets) as x(store_id text, store_name text, rm text, am text, target numeric)
  where nullif(btrim(x.store_id), '') is not null;

  delete from public.aw_monthly_sales
  where (source_set = 'current' and sales_month in (p_current_month, p_previous_month))
     or (source_set = 'last_year' and sales_month = p_last_year_month);

  insert into public.aw_monthly_sales (source_set, sales_month, store_id, sales, imported_at)
  select 'current', p_current_month, x.store_id, x.sales, now()
  from jsonb_to_recordset(p_current) as x(store_id text, sales numeric)
  where nullif(btrim(x.store_id), '') is not null
  union all
  select 'current', p_previous_month, x.store_id, x.sales, now()
  from jsonb_to_recordset(p_previous) as x(store_id text, sales numeric)
  where nullif(btrim(x.store_id), '') is not null
  union all
  select 'last_year', p_last_year_month, x.store_id, x.sales, now()
  from jsonb_to_recordset(p_last_year) as x(store_id text, sales numeric)
  where nullif(btrim(x.store_id), '') is not null;

  select count(*), coalesce(sum(target), 0) into v_target_count, v_target_total
  from public.aw_store_targets where target_month = p_target_month;
  select count(*), coalesce(sum(sales), 0) into v_current_count, v_current_total
  from public.aw_monthly_sales where source_set = 'current' and sales_month = p_current_month;
  select count(*), coalesce(sum(sales), 0) into v_previous_count, v_previous_total
  from public.aw_monthly_sales where source_set = 'current' and sales_month = p_previous_month;
  select count(*), coalesce(sum(sales), 0) into v_last_year_count, v_last_year_total
  from public.aw_monthly_sales where source_set = 'last_year' and sales_month = p_last_year_month;

  if v_target_count = 0 or v_current_count = 0 then
    raise exception 'Sync produced empty target or current data';
  end if;

  insert into public.aw_sync_status (
    id, source_sheet_id, last_attempt_at, last_success_at, source_latest_date,
    target_month, target_count, current_count, previous_count, last_year_count,
    target_total, current_total, previous_total, last_year_total, last_error
  ) values (
    true, '1mtjBRN84PQDXhGzWRgQ82ImHJrKml29z7cftl-15crc', now(), now(), p_latest_date,
    p_target_month, v_target_count, v_current_count, v_previous_count, v_last_year_count,
    v_target_total, v_current_total, v_previous_total, v_last_year_total, null
  )
  on conflict (id) do update set
    source_sheet_id = excluded.source_sheet_id,
    last_attempt_at = excluded.last_attempt_at,
    last_success_at = excluded.last_success_at,
    source_latest_date = excluded.source_latest_date,
    target_month = excluded.target_month,
    target_count = excluded.target_count,
    current_count = excluded.current_count,
    previous_count = excluded.previous_count,
    last_year_count = excluded.last_year_count,
    target_total = excluded.target_total,
    current_total = excluded.current_total,
    previous_total = excluded.previous_total,
    last_year_total = excluded.last_year_total,
    last_error = null;

  return jsonb_build_object(
    'source_latest_date', p_latest_date,
    'target_month', p_target_month,
    'target_count', v_target_count,
    'current_count', v_current_count,
    'previous_count', v_previous_count,
    'last_year_count', v_last_year_count,
    'target_total', v_target_total,
    'current_total', v_current_total,
    'previous_total', v_previous_total,
    'last_year_total', v_last_year_total
  );
end;
$$;

revoke all on function public.sync_aw_dashboard_from_sheet(date, date, date, date, date, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.sync_aw_dashboard_from_sheet(date, date, date, date, date, jsonb, jsonb, jsonb, jsonb) to service_role;

drop view if exists public.aw_dashboard_rows;
create view public.aw_dashboard_rows
with (security_invoker = true)
as
with context as (
  select
    (select max(target_month) from public.aw_store_targets) as target_month,
    (select max(sales_month) from public.aw_monthly_sales where source_set = 'current') as sales_month,
    (select source_latest_date from public.aw_sync_status where id) as source_latest_date,
    (select last_success_at from public.aw_sync_status where id) as sheet_synced_at
), sales as (
  select
    s.store_id,
    sum(s.sales) filter (where s.source_set = 'current' and s.sales_month = c.sales_month) as current_sales,
    sum(s.sales) filter (where s.source_set = 'current' and s.sales_month = (c.sales_month - interval '1 month')::date) as previous_sales,
    sum(s.sales) filter (where s.source_set = 'last_year' and s.sales_month = (c.sales_month - interval '1 year')::date) as last_year_sales
  from public.aw_monthly_sales s cross join context c
  group by s.store_id
), base as (
  select
    t.target_month,
    c.sales_month,
    c.source_latest_date as data_through_date,
    c.sheet_synced_at,
    t.store_id,
    t.store_name,
    t.rm,
    t.am,
    t.target,
    coalesce(s.current_sales, 0) as current_sales,
    coalesce(s.previous_sales, 0) as previous_sales,
    coalesce(s.last_year_sales, 0) as last_year_sales,
    case when t.target > 0 then coalesce(s.current_sales, 0) / t.target end as target_attainment,
    case when coalesce(s.previous_sales, 0) > 0 then (coalesce(s.current_sales, 0) - s.previous_sales) / s.previous_sales end as mom,
    case when coalesce(s.last_year_sales, 0) > 0 then (coalesce(s.current_sales, 0) - s.last_year_sales) / s.last_year_sales end as yoy,
    case when extract(day from c.source_latest_date) > 0 then
      coalesce(s.current_sales, 0)
      / extract(day from c.source_latest_date)
      * extract(day from (date_trunc('month', c.sales_month) + interval '1 month - 1 day'))
    end as forecast
  from public.aw_store_targets t
  cross join context c
  left join sales s on s.store_id = t.store_id
  where t.target_month = c.target_month
)
select
  base.*,
  case when target > 0 then forecast / target end as forecast_attainment
from base;

grant select on public.aw_dashboard_rows to anon, authenticated;
