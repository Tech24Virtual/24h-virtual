-- ============================================================
-- Billing grants — unconditional fix — 2026-06-29
--
-- 20260629000001 wrapped custom_plans + client_addons grants in
-- IF EXISTS DO blocks. If those tables didn't exist at migration
-- time (e.g. on a fresh staging restore), the grants were silently
-- skipped and queries return 403.
--
-- 20260629000003 added call_report_imports grant; still failing
-- if the table-creation migration (20260203214016) was never run
-- on the target env.
--
-- GRANT is idempotent in PostgreSQL — safe to re-apply.
-- ============================================================

-- ── Billing tables ────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE        ON public.custom_plans         TO authenticated;
GRANT SELECT, INSERT, UPDATE        ON public.client_addons        TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_report_imports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_report_mappings TO authenticated;

-- ── Verify call_report_imports exists ─────────────────────────────────────
-- If this script errors with "relation does not exist", run
-- 20260203214016_1c8ac5e3-3c92-43a0-9404-8a0341179b0a.sql first,
-- then re-run this file.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'call_report_imports'
  ) THEN
    RAISE WARNING 'call_report_imports does not exist — run migration 20260203214016 first';
  END IF;
END $$;
