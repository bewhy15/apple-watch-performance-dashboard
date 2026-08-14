select cron.alter_job(
  job_id := (
    select jobid
    from cron.job
    where jobname = 'sync-apple-watch-google-sheet-every-15-minutes'
  ),
  schedule := '*/5 * * * *'
);
