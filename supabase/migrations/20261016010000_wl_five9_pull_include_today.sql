-- The hourly WL Five9 pull asked only for yesterday (period_start = period_end =
-- CURRENT_DATE - 1), so a call made today never reached the portal until the
-- next day. Pull yesterday through today instead: yesterday catches late
-- calls across the UTC date boundary, today makes new calls show up within
-- the hour. pull-wl-five9-calls dedupes against existing rows, so re-pulling
-- is safe.
--
-- The job command carries the service-role key, so edit the body in place
-- rather than re-creating the job.
SELECT cron.alter_job(
  job_id := j.jobid,
  command := replace(
    j.command,
    $q$'period_end', to_char((CURRENT_DATE - INTERVAL '1 day'), 'YYYY-MM-DD')$q$,
    $q$'period_end', to_char(CURRENT_DATE, 'YYYY-MM-DD')$q$
  )
)
FROM cron.job j
WHERE j.jobname = 'wl-five9-call-report-hourly-pull';
