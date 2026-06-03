
-- ============================================================
-- Phase 34 — Commercial Approvals & Discount Governance
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.approval_state AS ENUM ('not_required','pending','approved','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.approval_request_status AS ENUM ('pending','approved','rejected','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Extend deals with governance fields
ALTER TABLE public.renewal_expansion_deals
  ADD COLUMN IF NOT EXISTS approval_state public.approval_state NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS estimated_discount_pct numeric(6,2),
  ADD COLUMN IF NOT EXISTS is_non_standard_term boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_exception boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS approval_evaluated_at timestamptz;

-- Approval policies
CREATE TABLE IF NOT EXISTS public.approval_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  scope text NOT NULL CHECK (scope IN ('direct','partner','both')),
  deal_type text NOT NULL CHECK (deal_type IN ('renewal','expansion','downsell','save','any')),
  -- Trigger conditions (any/all of these can fire approval)
  min_discount_pct numeric(6,2),               -- triggers if estimated_discount_pct >= this
  triggers_on_non_standard_term boolean NOT NULL DEFAULT false,
  triggers_on_exception boolean NOT NULL DEFAULT false,
  triggers_on_unknown_discount boolean NOT NULL DEFAULT false,
  -- Required approver
  required_approver_role text NOT NULL DEFAULT 'admin',
  tier int NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_policies_active
  ON public.approval_policies(active, scope, deal_type);

ALTER TABLE public.approval_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approval_policies_admin_all" ON public.approval_policies;
CREATE POLICY "approval_policies_admin_all" ON public.approval_policies
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_approval_policies_updated_at
  BEFORE UPDATE ON public.approval_policies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Approval requests
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.renewal_expansion_deals(id) ON DELETE CASCADE,
  policy_id uuid REFERENCES public.approval_policies(id) ON DELETE SET NULL,
  required_role text NOT NULL DEFAULT 'admin',
  tier int NOT NULL DEFAULT 1,
  status public.approval_request_status NOT NULL DEFAULT 'pending',
  reason text,                  -- why the policy fired
  decision_notes text,
  decided_by uuid,
  decided_at timestamptz,
  requested_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_deal ON public.approval_requests(deal_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON public.approval_requests(status);
-- Avoid duplicate pending requests for the same deal+policy+tier
CREATE UNIQUE INDEX IF NOT EXISTS uq_approval_requests_deal_policy_pending
  ON public.approval_requests(deal_id, policy_id, tier)
  WHERE status = 'pending';

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "approval_requests_admin_all" ON public.approval_requests;
CREATE POLICY "approval_requests_admin_all" ON public.approval_requests
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TRIGGER trg_approval_requests_updated_at
  BEFORE UPDATE ON public.approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- Evaluation engine
-- ============================================================
CREATE OR REPLACE FUNCTION public.evaluate_deal_approvals(p_deal_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deal renewal_expansion_deals%ROWTYPE;
  v_policy approval_policies%ROWTYPE;
  v_created int := 0;
  v_matched int := 0;
  v_pending int;
  v_rejected int;
  v_approved int;
  v_state approval_state;
  v_unknown_discount boolean;
  v_reason text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;

  SELECT * INTO v_deal FROM renewal_expansion_deals WHERE id = p_deal_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deal % not found', p_deal_id; END IF;

  v_unknown_discount := (v_deal.estimated_discount_pct IS NULL);

  -- Iterate active policies that match scope + deal_type
  FOR v_policy IN
    SELECT * FROM approval_policies
    WHERE active = true
      AND (scope = 'both' OR scope = v_deal.scope)
      AND (deal_type = 'any' OR deal_type = v_deal.deal_type)
    ORDER BY tier ASC
  LOOP
    v_reason := NULL;

    IF v_policy.min_discount_pct IS NOT NULL
       AND v_deal.estimated_discount_pct IS NOT NULL
       AND v_deal.estimated_discount_pct >= v_policy.min_discount_pct THEN
      v_reason := format('Discount %.2f%% ≥ threshold %.2f%%',
                         v_deal.estimated_discount_pct, v_policy.min_discount_pct);
    ELSIF v_policy.triggers_on_non_standard_term AND v_deal.is_non_standard_term THEN
      v_reason := 'Non-standard term';
    ELSIF v_policy.triggers_on_exception AND v_deal.is_exception THEN
      v_reason := 'Exception flag set';
    ELSIF v_policy.triggers_on_unknown_discount AND v_unknown_discount THEN
      v_reason := 'Discount could not be estimated — manual review required';
    END IF;

    IF v_reason IS NOT NULL THEN
      v_matched := v_matched + 1;
      -- Insert pending if not already pending
      INSERT INTO approval_requests (deal_id, policy_id, required_role, tier, reason)
      VALUES (v_deal.id, v_policy.id, v_policy.required_approver_role, v_policy.tier, v_reason)
      ON CONFLICT DO NOTHING;
      IF FOUND THEN v_created := v_created + 1; END IF;
    END IF;
  END LOOP;

  -- Recompute approval_state
  SELECT
    count(*) FILTER (WHERE status='pending'),
    count(*) FILTER (WHERE status='rejected'),
    count(*) FILTER (WHERE status='approved')
    INTO v_pending, v_rejected, v_approved
  FROM approval_requests WHERE deal_id = v_deal.id AND status <> 'cancelled';

  IF v_rejected > 0 THEN v_state := 'rejected';
  ELSIF v_pending > 0 THEN v_state := 'pending';
  ELSIF v_approved > 0 THEN v_state := 'approved';
  ELSE v_state := 'not_required';
  END IF;

  UPDATE renewal_expansion_deals
     SET approval_state = v_state,
         approval_evaluated_at = now()
   WHERE id = v_deal.id;

  RETURN jsonb_build_object(
    'deal_id', v_deal.id,
    'matched_policies', v_matched,
    'created_requests', v_created,
    'approval_state', v_state,
    'pending', v_pending,
    'rejected', v_rejected,
    'approved', v_approved
  );
END $$;

-- Decide an approval request
CREATE OR REPLACE FUNCTION public.decide_approval_request(
  p_request_id uuid, p_decision text, p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_req approval_requests%ROWTYPE;
  v_new_status approval_request_status;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;
  IF p_decision NOT IN ('approved','rejected','cancelled') THEN
    RAISE EXCEPTION 'Invalid decision %', p_decision;
  END IF;

  SELECT * INTO v_req FROM approval_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request % not found', p_request_id; END IF;
  IF v_req.status <> 'pending' THEN
    RAISE EXCEPTION 'Request % is not pending (status=%)', p_request_id, v_req.status;
  END IF;

  v_new_status := p_decision::approval_request_status;

  UPDATE approval_requests
     SET status = v_new_status,
         decided_by = auth.uid(),
         decided_at = now(),
         decision_notes = p_notes
   WHERE id = p_request_id;

  -- Re-evaluate deal state
  PERFORM public.evaluate_deal_approvals(v_req.deal_id);

  RETURN jsonb_build_object('request_id', p_request_id, 'status', v_new_status);
END $$;

-- ============================================================
-- Enforcement: extend transition_deal_stage with approval gate
-- ============================================================
CREATE OR REPLACE FUNCTION public.transition_deal_stage(
  p_deal_id uuid, p_new_stage deal_stage, p_outcome_reason text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_deal renewal_expansion_deals%ROWTYPE;
  v_new_status deal_status;
  v_implemented_at timestamptz;
  v_gated_stages text[] := ARRAY['proposal_sent','verbally_approved','closed_won','implemented'];
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Admin role required';
  END IF;
  SELECT * INTO v_deal FROM renewal_expansion_deals WHERE id = p_deal_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Deal % not found', p_deal_id; END IF;

  -- Approval gate
  IF p_new_stage::text = ANY(v_gated_stages)
     AND v_deal.approval_state NOT IN ('approved','not_required') THEN
    RAISE EXCEPTION 'Deal % cannot move to % — approval_state is % (admin approval required)',
      p_deal_id, p_new_stage, v_deal.approval_state;
  END IF;

  v_new_status := CASE p_new_stage
    WHEN 'closed_won' THEN 'won'::deal_status
    WHEN 'implemented' THEN 'won'::deal_status
    WHEN 'closed_lost' THEN 'lost'::deal_status
    WHEN 'deferred' THEN 'deferred'::deal_status
    ELSE 'open'::deal_status
  END;

  v_implemented_at := CASE WHEN p_new_stage = 'implemented' THEN now() ELSE v_deal.implemented_at END;

  UPDATE renewal_expansion_deals
     SET stage = p_new_stage,
         status = v_new_status,
         outcome_reason = COALESCE(p_outcome_reason, outcome_reason),
         implemented_at = v_implemented_at,
         stage_changed_at = now()
   WHERE id = p_deal_id;

  RETURN true;
END $$;

-- ============================================================
-- Views
-- ============================================================
CREATE OR REPLACE VIEW public.v_open_approval_requests
WITH (security_invoker = true) AS
SELECT
  ar.id, ar.deal_id, ar.policy_id, ar.required_role, ar.tier,
  ar.reason, ar.requested_at, ar.created_at,
  d.scope, d.deal_type, d.target_id, d.stage, d.approval_state,
  d.estimated_discount_pct, d.is_non_standard_term, d.is_exception,
  d.proposed_plan_key, d.proposed_term_months, d.proposed_price_summary,
  p.name AS policy_name,
  EXTRACT(epoch FROM (now() - ar.requested_at))/3600 AS hours_pending
FROM approval_requests ar
JOIN renewal_expansion_deals d ON d.id = ar.deal_id
LEFT JOIN approval_policies p ON p.id = ar.policy_id
WHERE ar.status = 'pending'
ORDER BY ar.requested_at ASC;

CREATE OR REPLACE VIEW public.v_bi_approval_requests
WITH (security_invoker = true) AS
SELECT
  ar.id, ar.deal_id, ar.policy_id, ar.required_role, ar.tier,
  ar.status, ar.reason, ar.decision_notes, ar.decided_by, ar.decided_at,
  ar.requested_at, ar.created_at, ar.updated_at,
  EXTRACT(epoch FROM (COALESCE(ar.decided_at, now()) - ar.requested_at))/3600 AS hours_to_decision,
  d.scope, d.deal_type, d.stage, d.approval_state,
  d.estimated_discount_pct, d.is_non_standard_term, d.is_exception,
  p.name AS policy_name
FROM approval_requests ar
JOIN renewal_expansion_deals d ON d.id = ar.deal_id
LEFT JOIN approval_policies p ON p.id = ar.policy_id;

-- Seed a small set of starter policies (idempotent)
INSERT INTO public.approval_policies
  (name, description, scope, deal_type, min_discount_pct, triggers_on_non_standard_term,
   triggers_on_exception, triggers_on_unknown_discount, required_approver_role, tier, active)
SELECT * FROM (VALUES
  ('Standard discount > 15%','Any deal with estimated discount above 15% needs admin sign-off.',
   'both','any', 15.00, false, false, false, 'admin', 1, true),
  ('Deep discount > 30%','Deep discount tier — exec/admin approval required.',
   'both','any', 30.00, false, false, false, 'admin', 2, true),
  ('Non-standard term','Multi-year or off-cycle term requires approval.',
   'both','any', NULL, true, false, false, 'admin', 1, true),
  ('Exception / special terms','Anything flagged as exception is reviewed manually.',
   'both','any', NULL, false, true, false, 'admin', 1, true),
  ('Unknown discount fallback','If discount cannot be estimated, require manual review.',
   'both','any', NULL, false, false, true, 'admin', 1, true)
) AS s(name, description, scope, deal_type, min_discount_pct, triggers_on_non_standard_term,
       triggers_on_exception, triggers_on_unknown_discount, required_approver_role, tier, active)
WHERE NOT EXISTS (SELECT 1 FROM public.approval_policies WHERE approval_policies.name = s.name);
