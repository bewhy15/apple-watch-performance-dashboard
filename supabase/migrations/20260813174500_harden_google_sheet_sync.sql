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
  if not pg_try_advisory_xact_lock(hashtext('sync_aw_dashboard_from_sheet')) then
    raise exception 'Apple Watch Sheet sync already running' using errcode = '55P03';
  end if;

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

  if jsonb_array_length(p_targets) < 100
     or jsonb_array_length(p_current) < 100
     or jsonb_array_length(p_previous) < 100
     or jsonb_array_length(p_last_year) < 100 then
    raise exception 'Sync payload failed minimum row validation';
  end if;

  delete from public.aw_store_targets where target_month is not null;
  insert into public.aw_store_targets (target_month, store_id, store_name, rm, am, target, imported_at)
  select p_target_month, btrim(x.store_id), btrim(x.store_name), btrim(x.rm), btrim(x.am), x.target, now()
  from jsonb_to_recordset(p_targets) as x(store_id text, store_name text, rm text, am text, target numeric)
  where nullif(btrim(x.store_id), '') is not null
    and nullif(btrim(x.rm), '') is not null
    and nullif(btrim(x.am), '') is not null;

  delete from public.aw_monthly_sales where sales_month is not null;
  insert into public.aw_monthly_sales (source_set, sales_month, store_id, sales, imported_at)
  select 'current', p_current_month, btrim(x.store_id), x.sales, now()
  from jsonb_to_recordset(p_current) as x(store_id text, sales numeric)
  where nullif(btrim(x.store_id), '') is not null
  union all
  select 'current', p_previous_month, btrim(x.store_id), x.sales, now()
  from jsonb_to_recordset(p_previous) as x(store_id text, sales numeric)
  where nullif(btrim(x.store_id), '') is not null
  union all
  select 'last_year', p_last_year_month, btrim(x.store_id), x.sales, now()
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

  if v_target_count < 100 or v_current_count < 100 or v_previous_count < 100 or v_last_year_count < 100 then
    raise exception 'Sync validation failed after staging';
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
