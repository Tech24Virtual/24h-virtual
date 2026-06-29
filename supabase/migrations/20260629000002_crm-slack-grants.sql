-- ============================================================
-- CRM + Slack grants — 2026-06-29
-- All tables confirmed in types.ts (lines 10412, 18594, 18630, 18663)
-- None were covered by the previous 20260629000001 migration.
-- ============================================================

-- ── CRM tables ────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON public.crm_tasks      TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.crm_activities TO authenticated;

-- ── Slack tables ──────────────────────────────────────────────────────────
-- slack_channels: synced by the slack-sync edge function, read-only for clients
GRANT SELECT ON public.slack_channels TO authenticated;

-- slack_messages: agents insert when sending, read for history
GRANT SELECT, INSERT ON public.slack_messages TO authenticated;

-- slack_user_mappings: admins create/delete mappings for CRM users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.slack_user_mappings TO authenticated;
