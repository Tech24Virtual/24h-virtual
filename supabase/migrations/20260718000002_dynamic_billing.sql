-- Dynamic plan management: a real billing_plans catalog (didn't exist —
-- confirmed absent from staging), plan tracking on leads, and a monthly
-- cron that auto-adjusts a client's plan based on last month's usage.
--
-- STATUS: Applied directly to staging (sdsxdqsomxuimrjpaylv) via `supabase db
-- query` at implementation time. Kept here for documentation and so future
-- deployments (e.g. prod) pick it up.

-- ── billing_plans: shared plan catalog ──────────────────────────────────
-- Did not exist. plan_type follows the same free-text convention as
-- custom_plans.plan_type (per_minute | fixed | hybrid) rather than an enum,
-- for consistency with the rest of this schema. service_type is nullable —
-- NULL means the plan is generic/not tied to one of the four core services;
-- set it to lock a plan (and its upgrade/downgrade chain) to one service,
-- mirroring the service-isolation rule already enforced in
-- src/lib/dynamicBilling.ts for the static pricing tiers.
CREATE TABLE IF NOT EXISTS public.billing_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  plan_type text NOT NULL DEFAULT 'fixed',
  service_type text,
  minute_rate numeric,
  fixed_amount numeric,
  included_minutes int,
  is_active boolean NOT NULL DEFAULT true,
  auto_upgrade_at_minutes int,
  auto_downgrade_at_minutes int,
  upgrade_to_plan_id uuid REFERENCES public.billing_plans(id) ON DELETE SET NULL,
  downgrade_to_plan_id uuid REFERENCES public.billing_plans(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage billing plans"
  ON public.billing_plans FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view active billing plans"
  ON public.billing_plans FOR SELECT
  USING (is_active = true OR has_role(auth.uid(), 'admin'::app_role));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.billing_plans TO authenticated;

CREATE TRIGGER update_billing_plans_updated_at
  BEFORE UPDATE ON public.billing_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Same audit pattern already used for custom_plans (audit_custom_plans_changes
-- / log_audit_event) — reused here so plan-catalog edits are auditable too.
CREATE OR REPLACE FUNCTION public.audit_billing_plans_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event('billing.plan.created', 'billing_plans', NEW.id::text,
      NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event('billing.plan.updated', 'billing_plans', NEW.id::text,
      NULL, jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event('billing.plan.deleted', 'billing_plans', OLD.id::text,
      NULL, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE TRIGGER trg_audit_billing_plans
  AFTER INSERT OR UPDATE OR DELETE ON public.billing_plans
  FOR EACH ROW EXECUTE FUNCTION public.audit_billing_plans_changes();

-- ── leads: plan assignment + override tracking ──────────────────────────
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS current_plan_id uuid REFERENCES public.billing_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_override boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan_override_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_override_at timestamptz,
  ADD COLUMN IF NOT EXISTS plan_last_auto_changed_at timestamptz;

GRANT UPDATE ON public.leads TO authenticated;

-- Audit every current_plan_id change on leads (manual saves AND cron
-- auto-adjustments — the cron runs as a DB role with no auth.uid(), so
-- log_audit_event will record actor_id/actor_email as NULL for those,
-- which is itself the signal that a change was system-driven).
CREATE OR REPLACE FUNCTION public.audit_lead_plan_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.current_plan_id IS DISTINCT FROM OLD.current_plan_id THEN
    PERFORM public.log_audit_event(
      CASE WHEN NEW.plan_last_auto_changed_at IS DISTINCT FROM OLD.plan_last_auto_changed_at
        THEN 'billing.plan.auto_adjusted' ELSE 'billing.plan.changed' END,
      'leads', NEW.id::text, NULL,
      jsonb_build_object(
        'old_plan_id', OLD.current_plan_id,
        'new_plan_id', NEW.current_plan_id,
        'plan_override', NEW.plan_override
      )
    );
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_audit_lead_plan_changes
  AFTER UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.audit_lead_plan_changes();

-- ── Monthly auto-adjustment cron ─────────────────────────────────────────
-- Fixes vs. the original draft:
--   * billing_summaries has no lead_id/billing_month columns — it's
--     client_id + period_start/period_end (confirmed against
--     supabase/functions/run-call-billing/index.ts, which inserts
--     period_start as the first day of the PREVIOUS calendar month).
--   * Anti-oscillation guard: without it, a lead upgraded by the first
--     UPDATE could immediately match the second (downgrade) UPDATE's
--     WHERE clause in the same run if the new plan's own threshold is
--     tight, because the second statement re-reads the just-modified
--     current_plan_id. The run_ts capture + "not touched this run" guard
--     on the downgrade pass prevents that.
SELECT cron.schedule(
  'auto-adjust-client-plans',
  '0 1 1 * *', -- 1am on the 1st of each month
  $$
  DO $cron$
  DECLARE
    run_ts timestamptz := now();
    last_month_start timestamptz := date_trunc('month', now() - interval '1 month');
  BEGIN
    -- Upgrade clients who met/exceeded their plan's auto_upgrade threshold
    UPDATE public.leads l
    SET
      current_plan_id = bp.upgrade_to_plan_id,
      plan_last_auto_changed_at = run_ts
    FROM public.billing_plans bp
    JOIN public.billing_summaries bs ON bs.client_id = l.id
    WHERE l.current_plan_id = bp.id
      AND bp.upgrade_to_plan_id IS NOT NULL
      AND bp.auto_upgrade_at_minutes IS NOT NULL
      AND bs.total_minutes >= bp.auto_upgrade_at_minutes
      AND l.plan_override = false
      AND bs.period_start = last_month_start;

    -- Downgrade clients who fell below their plan's auto_downgrade threshold.
    -- Excludes leads just touched by the upgrade pass above (same run_ts).
    UPDATE public.leads l
    SET
      current_plan_id = bp.downgrade_to_plan_id,
      plan_last_auto_changed_at = run_ts
    FROM public.billing_plans bp
    JOIN public.billing_summaries bs ON bs.client_id = l.id
    WHERE l.current_plan_id = bp.id
      AND bp.downgrade_to_plan_id IS NOT NULL
      AND bp.auto_downgrade_at_minutes IS NOT NULL
      AND bs.total_minutes < bp.auto_downgrade_at_minutes
      AND l.plan_override = false
      AND bs.period_start = last_month_start
      AND (l.plan_last_auto_changed_at IS NULL OR l.plan_last_auto_changed_at <> run_ts);
  END;
  $cron$;
  $$
);
