create table if not exists private.aw_store_channels (
  store_id text primary key,
  channel text not null check (channel in ('AAR', 'AAR Tier1', 'AAR(P)', 'AAR(U Store)', 'APP', 'APR')),
  imported_at timestamptz not null default now()
);

insert into private.aw_store_channels (store_id, channel) values
  ('103', 'AAR'),
  ('105', 'APR'),
  ('106', 'APP'),
  ('109', 'APP'),
  ('112', 'APR'),
  ('114', 'APP'),
  ('115', 'APP'),
  ('118', 'APP'),
  ('134', 'AAR'),
  ('138', 'APP'),
  ('197', 'AAR'),
  ('206', 'APP'),
  ('215', 'APR'),
  ('233', 'AAR Tier1'),
  ('242', 'AAR'),
  ('243', 'AAR'),
  ('246', 'APP'),
  ('249', 'AAR Tier1'),
  ('251', 'APP'),
  ('253', 'AAR'),
  ('255', 'AAR'),
  ('256', 'AAR'),
  ('260', 'AAR(U Store)'),
  ('272', 'AAR Tier1'),
  ('273', 'AAR'),
  ('282', 'AAR'),
  ('286', 'AAR'),
  ('292', 'APP'),
  ('298', 'AAR Tier1'),
  ('305', 'AAR'),
  ('308', 'AAR Tier1'),
  ('310', 'AAR'),
  ('313', 'AAR'),
  ('315', 'AAR'),
  ('321', 'APP'),
  ('329', 'APR'),
  ('335', 'APP'),
  ('337', 'APP'),
  ('340', 'AAR Tier1'),
  ('341', 'AAR Tier1'),
  ('344', 'AAR'),
  ('362', 'AAR Tier1'),
  ('368', 'AAR Tier1'),
  ('369', 'AAR Tier1'),
  ('377', 'AAR Tier1'),
  ('387', 'AAR'),
  ('389', 'AAR'),
  ('410', 'APP'),
  ('412', 'AAR'),
  ('413', 'APR'),
  ('414', 'AAR Tier1'),
  ('417', 'AAR(U Store)'),
  ('420', 'AAR'),
  ('422', 'AAR'),
  ('452', 'AAR'),
  ('484', 'AAR'),
  ('498', 'APP'),
  ('543', 'AAR(P)'),
  ('544', 'AAR(P)'),
  ('545', 'AAR(P)'),
  ('565', 'AAR(U Store)'),
  ('586', 'AAR'),
  ('627', 'APP'),
  ('632', 'AAR'),
  ('633', 'APR'),
  ('645', 'APP'),
  ('647', 'APR'),
  ('651', 'AAR'),
  ('653', 'AAR'),
  ('655', 'AAR'),
  ('656', 'AAR'),
  ('660', 'AAR Tier1'),
  ('661', 'AAR Tier1'),
  ('666', 'AAR'),
  ('673', 'AAR'),
  ('674', 'AAR Tier1'),
  ('675', 'AAR'),
  ('676', 'AAR'),
  ('684', 'AAR'),
  ('686', 'AAR Tier1'),
  ('691', 'AAR'),
  ('695', 'AAR'),
  ('705', 'AAR(U Store)'),
  ('706', 'AAR(U Store)'),
  ('707', 'AAR(U Store)'),
  ('708', 'AAR(U Store)'),
  ('709', 'AAR(U Store)'),
  ('741', 'AAR'),
  ('748', 'AAR Tier1'),
  ('754', 'AAR'),
  ('780', 'AAR'),
  ('844', 'AAR Tier1'),
  ('859', 'AAR(U Store)'),
  ('865', 'AAR(U Store)'),
  ('1069', 'AAR'),
  ('1071', 'AAR(U Store)'),
  ('1086', 'AAR Tier1'),
  ('1103', 'AAR'),
  ('1106', 'AAR Tier1'),
  ('1110', 'AAR'),
  ('1113', 'AAR'),
  ('1179', 'AAR(U Store)'),
  ('1195', 'AAR'),
  ('1196', 'APR'),
  ('1345', 'AAR'),
  ('1484', 'AAR(P)'),
  ('1558', 'AAR(U Store)'),
  ('1559', 'AAR(U Store)'),
  ('1563', 'AAR'),
  ('1567', 'AAR(U Store)'),
  ('1616', 'AAR'),
  ('1620', 'AAR'),
  ('1621', 'AAR'),
  ('1623', 'AAR'),
  ('1768', 'AAR'),
  ('1780', 'AAR'),
  ('1785', 'AAR'),
  ('1812', 'AAR'),
  ('1999', 'APP'),
  ('2318', 'AAR(U Store)'),
  ('2359', 'AAR'),
  ('2373', 'AAR'),
  ('2441', 'AAR'),
  ('2445', 'AAR'),
  ('2465', 'AAR'),
  ('2466', 'AAR'),
  ('2501', 'AAR'),
  ('2522', 'AAR'),
  ('2530', 'AAR'),
  ('2553', 'AAR'),
  ('2585', 'AAR'),
  ('2614', 'AAR'),
  ('2615', 'AAR'),
  ('2618', 'AAR'),
  ('2633', 'AAR'),
  ('2634', 'AAR'),
  ('2647', 'AAR'),
  ('2678', 'AAR'),
  ('2680', 'AAR'),
  ('2684', 'AAR'),
  ('2685', 'AAR'),
  ('2686', 'AAR'),
  ('2713', 'AAR'),
  ('2715', 'AAR'),
  ('2716', 'AAR'),
  ('2717', 'APP'),
  ('2722', 'AAR'),
  ('2727', 'AAR'),
  ('2742', 'AAR'),
  ('2743', 'AAR'),
  ('2744', 'AAR'),
  ('2755', 'AAR'),
  ('2757', 'AAR'),
  ('2758', 'AAR'),
  ('2762', 'AAR'),
  ('2779', 'AAR'),
  ('2783', 'AAR'),
  ('2785', 'AAR'),
  ('2797', 'AAR'),
  ('2799', 'AAR'),
  ('2800', 'AAR'),
  ('2824', 'AAR'),
  ('2838', 'AAR'),
  ('2843', 'AAR'),
  ('2858', 'AAR'),
  ('2860', 'AAR'),
  ('2868', 'AAR'),
  ('2879', 'AAR'),
  ('2880', 'AAR'),
  ('2881', 'AAR'),
  ('2906', 'AAR'),
  ('2907', 'AAR'),
  ('2909', 'AAR'),
  ('2919', 'AAR'),
  ('2920', 'AAR'),
  ('2925', 'AAR'),
  ('2926', 'AAR'),
  ('2935', 'AAR'),
  ('2957', 'AAR'),
  ('2974', 'AAR'),
  ('2986', 'AAR'),
  ('2987', 'AAR'),
  ('3003', 'AAR'),
  ('3015', 'AAR'),
  ('3025', 'AAR'),
  ('3038', 'AAR'),
  ('3039', 'AAR'),
  ('3042', 'AAR'),
  ('3067', 'AAR')
on conflict (store_id) do update set channel = excluded.channel, imported_at = now();

alter table public.aw_store_targets
  add column if not exists channel text not null default 'ไม่ระบุ';

update public.aw_store_targets t
set channel = c.channel
from private.aw_store_channels c
where c.store_id = t.store_id;

create or replace function public.sync_aw_dashboard_from_sheet_v2(
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
  v_result jsonb;
begin
  v_result := public.sync_aw_dashboard_from_sheet(
    p_target_month, p_current_month, p_previous_month, p_last_year_month,
    p_latest_date, p_targets, p_current, p_previous, p_last_year
  );

  update public.aw_store_targets t
  set channel = coalesce(nullif(btrim(x.channel), ''), c.channel, 'ไม่ระบุ')
  from jsonb_to_recordset(p_targets) as x(store_id text, channel text)
  left join private.aw_store_channels c on c.store_id = btrim(x.store_id)
  where t.store_id = btrim(x.store_id);

  return v_result || jsonb_build_object(
    'channel_count', (select count(distinct channel) from public.aw_store_targets),
    'unmatched_channel_count', (select count(*) from public.aw_store_targets where channel = 'ไม่ระบุ')
  );
end;
$$;

revoke all on function public.sync_aw_dashboard_from_sheet_v2(date, date, date, date, date, jsonb, jsonb, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.sync_aw_dashboard_from_sheet_v2(date, date, date, date, date, jsonb, jsonb, jsonb, jsonb) to service_role;

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
    t.channel,
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
select base.*, case when target > 0 then forecast / target end as forecast_attainment
from base;

grant select on public.aw_dashboard_rows to anon, authenticated;
