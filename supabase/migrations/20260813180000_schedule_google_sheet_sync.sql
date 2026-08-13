create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.aw_sync_config (
  id boolean primary key default true check (id),
  sync_token text not null,
  created_at timestamptz not null default now()
);

create or replace function public.verify_aw_sync_token(p_token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from private.aw_sync_config
    where id and sync_token = p_token
  );
$$;

revoke all on function public.verify_aw_sync_token(text) from public, anon, authenticated;
grant execute on function public.verify_aw_sync_token(text) to service_role;

do $$
declare
  v_token text;
  v_secret_id uuid;
begin
  select sync_token into v_token from private.aw_sync_config where id;
  if v_token is null then
    v_token := gen_random_uuid()::text || gen_random_uuid()::text;
    insert into private.aw_sync_config (id, sync_token) values (true, v_token);
  end if;

  select id into v_secret_id from vault.secrets where name = 'aw_sync_token' limit 1;
  if v_secret_id is null then
    perform vault.create_secret(v_token, 'aw_sync_token', 'Token for the scheduled Apple Watch Google Sheet sync');
  else
    perform vault.update_secret(v_secret_id, v_token, 'aw_sync_token', 'Token for the scheduled Apple Watch Google Sheet sync');
  end if;

  if not exists (select 1 from vault.secrets where name = 'aw_project_url') then
    perform vault.create_secret('https://qoazkcserdyczckvhakt.supabase.co', 'aw_project_url', 'Supabase URL for Apple Watch sync');
  end if;
  if not exists (select 1 from vault.secrets where name = 'aw_publishable_key') then
    perform vault.create_secret('sb_publishable_U5bdVQgH0jZdb-phJoljdA_XHbY2oA2', 'aw_publishable_key', 'Publishable key for Apple Watch sync');
  end if;
end;
$$;

select cron.unschedule('sync-apple-watch-google-sheet-every-15-minutes')
where exists (
  select 1 from cron.job where jobname = 'sync-apple-watch-google-sheet-every-15-minutes'
);

select cron.schedule(
  'sync-apple-watch-google-sheet-every-15-minutes',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'aw_project_url' limit 1)
      || '/functions/v1/sync-google-sheet',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'aw_publishable_key' limit 1),
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'aw_publishable_key' limit 1),
      'x-sync-token', (select decrypted_secret from vault.decrypted_secrets where name = 'aw_sync_token' limit 1)
    ),
    body := jsonb_build_object('scheduled_at', now()),
    timeout_milliseconds := 120000
  ) as request_id;
  $$
);
