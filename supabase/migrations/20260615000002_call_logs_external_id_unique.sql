-- Unique index on external_call_id to support upsert deduplication
-- (skip calls already captured by the Five9 webhook)
CREATE UNIQUE INDEX IF NOT EXISTS call_logs_external_call_id_unique
  ON public.call_logs (external_call_id)
  WHERE external_call_id IS NOT NULL;

-- Grants for pull-five9-call-report function (service role) on tables it touches
GRANT SELECT, INSERT, UPDATE ON public.call_logs TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.variance_queue TO service_role;
GRANT SELECT ON public.five9_campaign_mappings TO service_role;
GRANT SELECT ON public.leads TO service_role;
GRANT SELECT ON public.campaigns TO service_role;

-- Schedule pull-five9-call-report at 2am on the 1st of each month via pg_cron + pg_net.
-- Guard: only register if pg_cron extension is available in this environment.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'pull-five9-call-report-monthly') THEN
      PERFORM cron.schedule(
        'pull-five9-call-report-monthly',
        '0 2 1 * *',
        $cron$
        SELECT net.http_post(
          url := 'https://sdsxdqsomxuimrjpaylv.supabase.co/functions/v1/pull-five9-call-report'::text,
          body := '{}'::jsonb,
          headers := '{"Content-Type": "application/json"}'::jsonb
        );
        $cron$
      );
    END IF;
  END IF;
END;
$$;
