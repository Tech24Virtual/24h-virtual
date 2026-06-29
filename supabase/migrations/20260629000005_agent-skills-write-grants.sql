-- ============================================================
-- agent_skills write grants — 2026-06-29
--
-- All prior migrations granted only SELECT on agent_skills:
--   20260624000003: GRANT SELECT ON public.agent_skills TO authenticated
--   20260629000001: GRANT SELECT ON public.agent_skills TO authenticated
--
-- AgentSkillsManager (used on both Admin and Supervisor pages) calls
-- .insert() to add a skill and .delete() to remove one. Without INSERT
-- and DELETE grants those actions silently 403.
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_skills TO authenticated;
