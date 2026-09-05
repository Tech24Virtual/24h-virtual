-- Switch the Five9 call report pull from once daily (2 AM) to hourly.
-- Same hardcoded URL + literal service_role JWT pattern as the job it replaces
-- (see 20260722000006_five9_call_report_cron.sql) — current_setting-based auth
-- is unset at the database level and does not work here.
SELECT cron.unschedule('five9-call-report-daily-pull');

SELECT cron.schedule(
  'five9-call-report-hourly-pull',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://sdsxdqsomxuimrjpaylv.supabase.co/functions/v1/pull-five9-call-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkc3hkcXNvbXh1aW1yanBheWx2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTI5MDM4MiwiZXhwIjoyMDk0ODY2MzgyfQ.lwAfB8yWk9WF7Wp-865qMgR530FwhM_UEDxokj7M6YM'
    ),
    body := jsonb_build_object(
      'period_start', to_char((CURRENT_DATE - INTERVAL '1 day'), 'YYYY-MM-DD'),
      'period_end', to_char((CURRENT_DATE - INTERVAL '1 day'), 'YYYY-MM-DD')
    )
  );
  $$
);
