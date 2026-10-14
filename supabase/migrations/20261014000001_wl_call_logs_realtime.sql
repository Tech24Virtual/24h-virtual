-- Live call updates on the WL client portal (useWLCallLogsRealtime).
-- Realtime still enforces RLS: WL clients only receive their own rows
-- ("WL clients view own call logs").
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'wl_call_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.wl_call_logs;
  END IF;
END $$;
