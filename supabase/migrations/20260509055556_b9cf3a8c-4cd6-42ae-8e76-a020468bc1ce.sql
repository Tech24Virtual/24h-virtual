-- Phase 34 — snapshot triggering flags on approval_requests + timeline view

ALTER TABLE public.approval_requests
  ADD COLUMN IF NOT EXISTS estimated_discount_pct_snapshot numeric NULL,
  ADD COLUMN IF NOT EXISTS is_non_standard_term_snapshot boolean NULL,
  ADD COLUMN IF NOT EXISTS is_exception_snapshot boolean NULL,
  ADD COLUMN IF NOT EXISTS proposed_plan_key_snapshot text NULL,
  ADD COLUMN IF NOT EXISTS proposed_term_months_snapshot integer NULL;

CREATE OR REPLACE FUNCTION public.approval_request_snapshot_trigger_flags()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.estimated_discount_pct_snapshot IS NULL
     AND NEW.is_non_standard_term_snapshot IS NULL
     AND NEW.is_exception_snapshot IS NULL THEN
    SELECT
      d.estimated_discount_pct,
      d.is_non_standard_term,
      d.is_exception,
      d.proposed_plan_key,
      d.proposed_term_months
    INTO
      NEW.estimated_discount_pct_snapshot,
      NEW.is_non_standard_term_snapshot,
      NEW.is_exception_snapshot,
      NEW.proposed_plan_key_snapshot,
      NEW.proposed_term_months_snapshot
    FROM public.renewal_expansion_deals d
    WHERE d.id = NEW.deal_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS approval_request_snapshot_flags ON public.approval_requests;
CREATE TRIGGER approval_request_snapshot_flags
  BEFORE INSERT ON public.approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.approval_request_snapshot_trigger_flags();

-- Backfill snapshots for existing rows from current deal values
UPDATE public.approval_requests r
   SET estimated_discount_pct_snapshot = d.estimated_discount_pct,
       is_non_standard_term_snapshot   = d.is_non_standard_term,
       is_exception_snapshot           = d.is_exception,
       proposed_plan_key_snapshot      = d.proposed_plan_key,
       proposed_term_months_snapshot   = d.proposed_term_months
  FROM public.renewal_expansion_deals d
 WHERE d.id = r.deal_id
   AND r.estimated_discount_pct_snapshot IS NULL
   AND r.is_non_standard_term_snapshot IS NULL
   AND r.is_exception_snapshot IS NULL;

-- Timeline view: one row per approval request, enriched with policy + approver names
CREATE OR REPLACE VIEW public.v_deal_approval_timeline AS
SELECT
  r.id,
  r.deal_id,
  r.policy_id,
  p.name             AS policy_name,
  r.required_role,
  r.tier,
  r.status::text     AS status,
  r.reason,
  r.decision_notes,
  r.decided_by,
  prof.full_name     AS decided_by_name,
  r.decided_at,
  r.requested_at,
  r.created_at,
  r.updated_at,
  r.sla_hours_snapshot,
  r.created_notified_at,
  r.sla_notified_at,
  r.estimated_discount_pct_snapshot,
  r.is_non_standard_term_snapshot,
  r.is_exception_snapshot,
  r.proposed_plan_key_snapshot,
  r.proposed_term_months_snapshot,
  CASE
    WHEN r.decided_at IS NOT NULL
      THEN EXTRACT(EPOCH FROM (r.decided_at - r.requested_at))/3600.0
    ELSE NULL
  END AS hours_to_decision,
  CASE
    WHEN r.status = 'pending'
      THEN EXTRACT(EPOCH FROM (now() - r.requested_at))/3600.0
    ELSE NULL
  END AS hours_pending,
  CASE
    WHEN r.status = 'pending'
     AND r.sla_hours_snapshot IS NOT NULL
     AND r.requested_at + (r.sla_hours_snapshot || ' hours')::interval < now()
    THEN true ELSE false
  END AS is_sla_breached
FROM public.approval_requests r
LEFT JOIN public.approval_policies p ON p.id = r.policy_id
LEFT JOIN public.profiles prof       ON prof.id = r.decided_by;

GRANT SELECT ON public.v_deal_approval_timeline TO authenticated;