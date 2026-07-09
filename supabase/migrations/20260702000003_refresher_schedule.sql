-- Correction #12: automated refresher schedule.
--
-- Design note (deviates from the original draft in three places, all verified
-- against the real schema before writing this):
--
-- 1. campaign_training_retraining_events does NOT have agent_id/module_id/reason/
--    triggered_at columns. Its real columns (from migration 20260423053913) are
--    campaign_id, trigger_kind (CHECK-constrained), trigger_entity_id,
--    affected_signoffs, note, created_at — it logs one aggregate row per trigger
--    event, matching the existing script/faq/policy-approval triggers. We extend
--    the trigger_kind CHECK to add 'refresher_expired' and log the same way.
--
-- 2. profiles has no `role` column (roles live in user_roles) — the
--    promote-senior-agents job is rewritten to check user_roles.
--
-- 3. A per-module `retraining_interval_days` + BEFORE INSERT trigger
--    (set_signoff_expiry / trg_set_signoff_expiry) already existed from
--    migration 20260423053913. Rather than clobber it, this migration extends
--    that same function: a module-specific interval still wins when set: the
--    agent's refresher_interval_months from profiles is only the fallback.
--
-- Root cause fix for "agent can never redo a module they already completed":
-- campaign_training_completions has UNIQUE(module_id, agent_id), and
-- campaign_training_signoffs.completion_id -> completions.id ON DELETE CASCADE.
-- So the only way to let an agent redo a module is to delete its completion row
-- (which cascades away the attached signoff automatically). The daily cron does
-- exactly that for interval-expired signoffs, then logs the event. This reuses
-- the same mechanism the existing "Reject" button in SupervisorTrainingSignoffs.tsx
-- already relies on (useDeleteCompletion) — just automated on a schedule.

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Extend trigger_kind to allow the new automated-refresher event type
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.campaign_training_retraining_events
  DROP CONSTRAINT IF EXISTS campaign_training_retraining_events_trigger_kind_check;

ALTER TABLE public.campaign_training_retraining_events
  ADD CONSTRAINT campaign_training_retraining_events_trigger_kind_check
  CHECK (trigger_kind IN ('script_published','faq_approved','policy_approved','manual','refresher_expired'));

-- Table has an RLS SELECT policy but was missing the table-level GRANT
-- (PostgREST refuses the query before RLS even runs without this).
GRANT SELECT ON public.campaign_training_retraining_events TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Signoff expiry: module-specific interval wins if set, else the agent's
--    refresher_interval_months (1 = monthly, 3 = quarterly) from profiles.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_signoff_expiry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_days   int;
  v_months int;
BEGIN
  SELECT retraining_interval_days INTO v_days
    FROM public.campaign_training_modules
   WHERE id = NEW.module_id;

  IF v_days IS NOT NULL AND v_days > 0 THEN
    NEW.expires_at := COALESCE(NEW.signed_off_at, now()) + (v_days || ' days')::interval;
  ELSE
    SELECT COALESCE(refresher_interval_months, 1) INTO v_months
      FROM public.profiles
     WHERE id = NEW.agent_id;
    NEW.expires_at := COALESCE(NEW.signed_off_at, now()) + (COALESCE(v_months, 1) || ' months')::interval;
  END IF;

  NEW.needs_refresh := false;
  RETURN NEW;
END;
$$;

-- Trigger already exists (trg_set_signoff_expiry, BEFORE INSERT) — replacing the
-- function body is sufficient, no need to touch the trigger itself.

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Daily cron: expire signoffs whose interval has passed, delete the stale
--    completion (cascades the signoff away too), log one event per campaign.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT cron.schedule(
  'expire-training-signoffs',
  '0 6 * * *', -- 6am daily
  $$
  WITH expired AS (
    UPDATE public.campaign_training_signoffs
       SET needs_refresh = true
     WHERE expires_at IS NOT NULL
       AND expires_at <= now()
       AND needs_refresh = false
    RETURNING id, agent_id, module_id, campaign_id
  ),
  deleted_completions AS (
    DELETE FROM public.campaign_training_completions c
    USING expired e
    WHERE c.agent_id = e.agent_id AND c.module_id = e.module_id
    RETURNING c.agent_id, c.module_id, e.campaign_id
  ),
  per_campaign AS (
    SELECT campaign_id, count(*)::int AS n
    FROM deleted_completions
    GROUP BY campaign_id
  )
  INSERT INTO public.campaign_training_retraining_events (campaign_id, trigger_kind, affected_signoffs, note)
  SELECT campaign_id, 'refresher_expired', n, 'Scheduled refresher interval elapsed — agent(s) must redo training'
  FROM per_campaign;
  $$
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Daily cron: auto-promote agents to the quarterly (3-month) interval once
--    they've been active for 3+ months. profiles has no `role` column — check
--    user_roles instead.
-- ─────────────────────────────────────────────────────────────────────────────

SELECT cron.schedule(
  'promote-senior-agents',
  '0 7 * * *', -- 7am daily
  $$
  UPDATE public.profiles p
     SET refresher_interval_months = 3
   WHERE p.refresher_interval_months = 1
     AND p.agent_start_date IS NOT NULL
     AND p.agent_start_date <= (CURRENT_DATE - INTERVAL '3 months')
     AND EXISTS (
       SELECT 1 FROM public.user_roles ur
       WHERE ur.user_id = p.id AND ur.role = 'agent'::app_role
     );
  $$
);
