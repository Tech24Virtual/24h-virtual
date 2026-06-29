-- ============================================================
-- user_roles write grants — 2026-06-30
--
-- Every migration so far has granted only SELECT on user_roles:
--   20260520220706: GRANT SELECT ON public.user_roles TO authenticated;
--   20260608000002: GRANT SELECT ON public.user_roles TO authenticated;
--
-- RLS policies already exist in 20260203165845 that ALLOW admins to
-- INSERT and DELETE — but PostgreSQL checks table-level privileges
-- before RLS, so those policies are never reached.
--
-- Broken flows (all silently return 403):
--   ManageUserRolesDialog  — INSERT + DELETE when saving role changes
--   RevokeDemoDialog       — DELETE when revoking all roles ("Disable Access")
--
-- GRANT is idempotent in PostgreSQL — safe to re-apply.
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
