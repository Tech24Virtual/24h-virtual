
-- ========================================================================
-- Phase 33 — Renewal & Expansion Deal Operations
-- ========================================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE public.deal_scope AS ENUM ('direct','partner');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.deal_type AS ENUM ('renewal','expansion','downsell','save');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.deal_stage AS ENUM (
    'identified','outreach_started','proposal_prepared','proposal_sent',
    'negotiation','verbally_approved','implemented','closed_won','closed_lost','deferred'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.deal_status AS ENUM ('open','won','lost','deferred','stalled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Table
CREATE TABLE IF NOT EXISTS public.renewal_expansion_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope public.deal_scope NOT NULL,
  target_id UUID NOT NULL,
  deal_type public.deal_type NOT NULL,
  related_renewal_workflow_id UUID NULL REFERENCES public.renewal_workflows(id) ON DELETE SET NULL,
  related_partner_play_id UUID NULL REFERENCES public.partner_success_plays(id) ON DELETE SET NULL,
  related_direct_play_id UUID NULL REFERENCES public.direct_success_plays(id) ON DELETE SET NULL,
  owner_user_id UUID NULL,
  current_plan_key TEXT NULL,
  current_subscription_id UUID NULL,
  proposed_plan_key TEXT NULL,
  proposed_offer_id UUID NULL,
  proposed_term_months INTEGER NULL,
  proposed_price_summary TEXT NULL,
  stage public.deal_stage NOT NULL DEFAULT 'identified',
  status public.deal_status NOT NULL DEFAULT 'open',
  outcome_reason TEXT NULL,
  expected_close_date DATE NULL,
  implemented_at TIMESTAMPTZ NULL,
  notes TEXT NULL,
  stage_changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_red_target ON public.renewal_expansion_deals (scope, target_id);
CREATE INDEX IF NOT EXISTS idx_red_stage ON public.renewal_expansion_deals (stage);
CREATE INDEX IF NOT EXISTS idx_red_status ON public.renewal_expansion_deals (status);
CREATE INDEX IF NOT EXISTS idx_red_renewal ON public.renewal_expansion_deals (related_renewal_workflow_id);

-- Prevent duplicate open deals against the same renewal workflow
CREATE UNIQUE INDEX IF NOT EXISTS uniq_red_open_per_renewal
  ON public.renewal_expansion_deals (related_renewal_workflow_id)
  WHERE status = 'open' AND related_renewal_workflow_id IS NOT NULL;

ALTER TABLE public.renewal_expansion_deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage deals" ON public.renewal_expansion_deals;
CREATE POLICY "Admins manage deals" ON public.renewal_expansion_deals
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'))
  WITH CHECK (public.has_role(auth.uid(),'admin'));

DROP TRIGGER IF EXISTS trg_red_updated ON public.renewal_expansion_deals;
CREATE TRIGGER trg_red_updated BEFORE UPDATE ON public.renewal_expansion_deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Link communication_actions to a deal
ALTER TABLE public.communication_actions
  ADD COLUMN IF NOT EXISTS deal_id UUID NULL REFERENCES public.renewal_expansion_deals(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_comm_actions_deal ON public.communication_actions (deal_id);

-- ── Views ─────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_open_deals_pipeline
WITH (security_invoker = true) AS
SELECT
  d.*,
  CASE WHEN d.expected_close_date IS NOT NULL
       THEN (d.expected_close_date - CURRENT_DATE) END AS days_to_expected_close,
  EXTRACT(EPOCH FROM (now() - d.stage_changed_at))/86400.0 AS days_in_stage,
  (SELECT COUNT(*) FROM public.communication_actions ca WHERE ca.deal_id = d.id) AS comm_action_count,
  rw.renewal_date,
  rw.stage AS renewal_stage
FROM public.renewal_expansion_deals d
LEFT JOIN public.renewal_workflows rw ON rw.id = d.related_renewal_workflow_id
WHERE d.status = 'open';

CREATE OR REPLACE VIEW public.v_stalled_approved_deals
WITH (security_invoker = true) AS
SELECT d.*,
  EXTRACT(EPOCH FROM (now() - d.stage_changed_at))/86400.0 AS days_since_approval
FROM public.renewal_expansion_deals d
WHERE d.stage = 'verbally_approved'
  AND d.status = 'open'
  AND d.stage_changed_at < (now() - INTERVAL '14 days');

CREATE OR REPLACE VIEW public.v_bi_renewal_expansion_deals
WITH (security_invoker = true) AS
SELECT id, scope, target_id, deal_type, related_renewal_workflow_id,
       owner_user_id, current_plan_key, proposed_plan_key, proposed_offer_id,
       proposed_term_months, stage, status, outcome_reason,
       expected_close_date, implemented_at, stage_changed_at, created_at, updated_at
FROM public.renewal_expansion_deals;

-- ── RPCs ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_renewal_expansion_deal(
  p_scope public.deal_scope,
  p_target_id UUID,
  p_deal_type public.deal_type,
  p_related_renewal_workflow_id UUID DEFAULT NULL,
  p_related_partner_play_id UUID DEFAULT NULL,
  p_related_direct_play_id UUID DEFAULT NULL,
  p_proposed_plan_key TEXT DEFAULT NULL,
  p_proposed_offer_id UUID DEFAULT NULL,
  p_proposed_term_months INTEGER DEFAULT NULL,
  p_proposed_price_summary TEXT DEFAULT NULL,
  p_expected_close_date DATE DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id UUID; v_current_plan TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  -- best-effort current plan lookup for direct accounts
  IF p_scope = 'direct' THEN
    BEGIN
      SELECT plan_key INTO v_current_plan
      FROM public.v_subscription_snapshot
      WHERE lead_id = p_target_id
      LIMIT 1;
    EXCEPTION WHEN others THEN v_current_plan := NULL;
    END;
  END IF;

  INSERT INTO public.renewal_expansion_deals (
    scope, target_id, deal_type, related_renewal_workflow_id,
    related_partner_play_id, related_direct_play_id,
    current_plan_key, proposed_plan_key, proposed_offer_id,
    proposed_term_months, proposed_price_summary,
    expected_close_date, notes, created_by, owner_user_id
  ) VALUES (
    p_scope, p_target_id, p_deal_type, p_related_renewal_workflow_id,
    p_related_partner_play_id, p_related_direct_play_id,
    v_current_plan, p_proposed_plan_key, p_proposed_offer_id,
    p_proposed_term_months, p_proposed_price_summary,
    p_expected_close_date, p_notes, auth.uid(), auth.uid()
  ) RETURNING id INTO v_id;

  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.transition_deal_stage(
  p_deal_id UUID,
  p_new_stage public.deal_stage,
  p_outcome_reason TEXT DEFAULT NULL
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status public.deal_status;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  v_status := CASE p_new_stage
    WHEN 'closed_won' THEN 'won'::public.deal_status
    WHEN 'closed_lost' THEN 'lost'::public.deal_status
    WHEN 'deferred' THEN 'deferred'::public.deal_status
    WHEN 'implemented' THEN 'won'::public.deal_status
    ELSE 'open'::public.deal_status
  END;

  UPDATE public.renewal_expansion_deals
     SET stage = p_new_stage,
         status = v_status,
         outcome_reason = COALESCE(p_outcome_reason, outcome_reason),
         stage_changed_at = now(),
         implemented_at = CASE WHEN p_new_stage = 'implemented' THEN now() ELSE implemented_at END
   WHERE id = p_deal_id;

  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.link_comm_action_to_deal(
  p_action_id UUID,
  p_deal_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;
  UPDATE public.communication_actions SET deal_id = p_deal_id WHERE id = p_action_id;
  RETURN FOUND;
END $$;

-- Lightweight reconciliation: mark verbally_approved/closed_won deals as
-- implemented when subscription truth shows the proposed plan is now active;
-- flag stalled when verbally_approved >14d and no plan change observed.
CREATE OR REPLACE FUNCTION public.reconcile_renewal_expansion_deals()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_implemented INT := 0; v_stalled INT := 0; v_rec RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  -- Implementation match: direct deals where subscription truth now shows proposed plan
  FOR v_rec IN
    SELECT d.id
      FROM public.renewal_expansion_deals d
      JOIN public.v_subscription_snapshot s ON s.lead_id = d.target_id
     WHERE d.scope = 'direct'
       AND d.status = 'open'
       AND d.proposed_plan_key IS NOT NULL
       AND d.stage IN ('verbally_approved','proposal_sent','negotiation','closed_won')
       AND s.plan_key = d.proposed_plan_key
  LOOP
    UPDATE public.renewal_expansion_deals
       SET stage = 'implemented', status = 'won',
           implemented_at = now(), stage_changed_at = now(),
           outcome_reason = COALESCE(outcome_reason,'reconciled_from_subscription_truth')
     WHERE id = v_rec.id;
    v_implemented := v_implemented + 1;
  END LOOP;

  -- Stalled: verbally_approved >14 days and still open
  UPDATE public.renewal_expansion_deals
     SET status = 'stalled'
   WHERE stage = 'verbally_approved'
     AND status = 'open'
     AND stage_changed_at < (now() - INTERVAL '14 days');
  GET DIAGNOSTICS v_stalled = ROW_COUNT;

  RETURN jsonb_build_object('implemented', v_implemented, 'stalled', v_stalled);
END $$;
