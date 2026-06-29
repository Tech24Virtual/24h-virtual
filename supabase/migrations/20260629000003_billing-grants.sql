-- ============================================================
-- Billing grants — 2026-06-29
-- call_report_imports had no GRANT in any prior migration
-- (RLS policies existed but the role had no access at all)
-- ============================================================

-- ── call_report_imports ───────────────────────────────────────────────────
-- Admins read/write import records; agents read-only (per existing RLS).
-- Without this GRANT, CallImportsTab returns 403 and silently shows empty.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_report_imports TO authenticated;

-- ── client_report_mappings ────────────────────────────────────────────────
-- Created in the same migration as call_report_imports; also missing a GRANT.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE  table_schema = 'public' AND table_name = 'client_report_mappings'
  ) THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_report_mappings TO authenticated';
  END IF;
END $$;
