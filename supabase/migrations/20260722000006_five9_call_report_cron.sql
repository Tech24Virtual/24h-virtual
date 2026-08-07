-- Daily pull of Five9 call reports for yesterday's date range.
-- Uses the hardcoded URL + literal service_role JWT pattern (matches monthly-billing-auto-run),
-- NOT current_setting('app.service_role_key')/('app.supabase_url') — those are unset at the
-- database level (confirmed NULL), which is why auto-retry-failed-payments has been broken.
SELECT cron.schedule(
  'five9-call-report-daily-pull',
  '0 2 * * *',
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
