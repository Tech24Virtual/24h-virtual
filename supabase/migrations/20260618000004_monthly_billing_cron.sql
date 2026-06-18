-- Schedule run-call-billing edge function on the 1st of each month at 6am UTC.
--
-- This migration is a no-op if pg_cron is not enabled.
-- To activate the schedule:
--   1. Supabase Dashboard → Database → Extensions → enable pg_cron
--   2. Supabase Dashboard → Database → Extensions → enable pg_net
--   3. Add service role key to Vault:
--        INSERT INTO vault.secrets (name, secret)
--        VALUES ('service_role_key', '<your-service-role-key>')
--        ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret;
--   4. Re-run this migration:
--        npx supabase db push --linked
--
-- To verify after setup:
--   SELECT * FROM cron.job WHERE jobname = 'monthly-billing-auto-run';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove any existing job with this name before (re-)creating it.
    PERFORM cron.unschedule('monthly-billing-auto-run');
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL; -- cron.unschedule may fail if job doesn't exist yet; that's fine
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
     AND EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net') THEN

    PERFORM cron.schedule(
      'monthly-billing-auto-run',
      '0 6 1 * *',
      $cron$
      SELECT net.http_post(
        url     := 'https://sdsxdqsomxuimrjpaylv.supabase.co/functions/v1/run-call-billing',
        headers := jsonb_build_object(
          'Content-Type',  'application/json',
          'Authorization', 'Bearer ' || (
            SELECT decrypted_secret
            FROM   vault.decrypted_secrets
            WHERE  name = 'service_role_key'
            LIMIT  1
          )
        ),
        body    := '{}'::jsonb
      );
      $cron$
    );

    RAISE NOTICE 'monthly-billing-auto-run cron job scheduled (0 6 1 * * UTC).';
  ELSE
    RAISE NOTICE 'pg_cron or pg_net not enabled — skipping cron schedule. Enable both extensions and re-run this migration.';
  END IF;
END;
$$;
