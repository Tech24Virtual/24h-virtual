
-- Phase 30 — Customer Success for Direct Accounts

-- 1. direct_success_plays
CREATE TABLE IF NOT EXISTS public.direct_success_plays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  play_type TEXT NOT NULL CHECK (play_type IN ('educate','upsell','save','onboard','reactivate')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','active','completed','dismissed')),
  notes TEXT,
  follow_up_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dsp_lead    ON public.direct_success_plays(lead_id);
CREATE INDEX IF NOT EXISTS idx_dsp_status  ON public.direct_success_plays(status);
CREATE INDEX IF NOT EXISTS idx_dsp_followup ON public.direct_success_plays(follow_up_date);

ALTER TABLE public.direct_success_plays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dsp admin all" ON public.direct_success_plays;
CREATE POLICY "dsp admin all" ON public.direct_success_plays
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_dsp_updated_at ON public.direct_success_plays;
CREATE TRIGGER trg_dsp_updated_at
  BEFORE UPDATE ON public.direct_success_plays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.direct_success_plays IS
'Phase 30: lightweight direct-account success play tracking. Admin-only.';

-- 2. v_direct_success_summary  (per direct account)
CREATE OR REPLACE VIEW public.v_direct_success_summary
WITH (security_invoker = true) AS
WITH base AS (
  SELECT
    s.lead_id,
    s.name,
    s.company,
    s.plan_name,
    s.activated_at,
    s.days_live,
    s.days_since_activity,
    s.open_tickets_count,
    s.live_campaigns_count,
    s.total_campaigns_count,
    s.receptionist_health,
    s.lifecycle_signal,
    s.health_band,
    s.reasons,
    sub.subscription_state,
    sub.last_payment_status,
    sub.mrr_usd,
    sub.mrr_basis
  FROM public.v_success_account_status s
  LEFT JOIN public.v_subscription_snapshot sub ON sub.lead_id = s.lead_id
  WHERE s.acquisition_type = 'direct'
),
flagged AS (
  SELECT
    b.*,
    (b.subscription_state = 'past_due')                                              AS flag_payment_risk,
    (b.subscription_state = 'canceled')                                              AS flag_canceled,
    (b.health_band = 'intervention')                                                 AS flag_intervention,
    (b.lifecycle_signal = 'downgrade_risk')                                          AS flag_downgrade_risk,
    (b.lifecycle_signal = 'expansion')                                               AS flag_expansion_signal,
    (b.receptionist_health = 'missing' AND b.days_live > 7)                          AS flag_no_receptionist,
    (b.open_tickets_count >= 3)                                                      AS flag_support_friction,
    (b.days_since_activity >= 30 AND b.days_live > 14)                               AS flag_inactive,
    (b.health_band = 'healthy'
       AND b.lifecycle_signal = 'expansion'
       AND COALESCE(b.subscription_state,'unknown') = 'active'
       AND b.days_live >= 30
       AND b.open_tickets_count = 0)                                                 AS flag_expansion_ready,
    (b.activated_at IS NOT NULL
       AND b.days_live <= 30
       AND b.health_band <> 'intervention')                                          AS flag_new_account
  FROM base b
)
SELECT
  f.*,
  CASE
    WHEN f.flag_canceled THEN 'at_risk'
    WHEN f.flag_payment_risk THEN 'at_risk'
    WHEN f.flag_intervention THEN 'at_risk'
    WHEN f.flag_inactive AND f.health_band = 'watch' THEN 'at_risk'
    WHEN f.flag_downgrade_risk OR f.flag_no_receptionist OR f.flag_support_friction
      THEN 'stabilize'
    WHEN f.flag_expansion_ready THEN 'expansion_ready'
    ELSE 'nurture'
  END::text AS success_state
FROM flagged f;

COMMENT ON VIEW public.v_direct_success_summary IS
'Phase 30: per direct-account success state with explainable flags. Sources v_success_account_status + v_subscription_snapshot. acquisition_type=direct only.';

-- 3. v_direct_success_opportunities
CREATE OR REPLACE VIEW public.v_direct_success_opportunities
WITH (security_invoker = true) AS
SELECT s.lead_id, s.name, s.company, s.success_state,
       'save'::text AS opportunity_type, 1::int AS priority,
       'Subscription past due'::text AS reason
FROM public.v_direct_success_summary s WHERE s.flag_payment_risk
UNION ALL
SELECT s.lead_id, s.name, s.company, s.success_state,
       'reactivate', 1, 'Subscription canceled'
FROM public.v_direct_success_summary s WHERE s.flag_canceled
UNION ALL
SELECT s.lead_id, s.name, s.company, s.success_state,
       'save', 1, 'Health band: intervention'
FROM public.v_direct_success_summary s WHERE s.flag_intervention
UNION ALL
SELECT s.lead_id, s.name, s.company, s.success_state,
       'save', 2, 'Lifecycle signal: downgrade risk'
FROM public.v_direct_success_summary s
WHERE s.flag_downgrade_risk AND NOT s.flag_intervention
UNION ALL
SELECT s.lead_id, s.name, s.company, s.success_state,
       'onboard', 2, 'No live receptionist after first week'
FROM public.v_direct_success_summary s
WHERE s.flag_no_receptionist AND NOT s.flag_intervention
UNION ALL
SELECT s.lead_id, s.name, s.company, s.success_state,
       'save', 3, '3+ open support tickets'
FROM public.v_direct_success_summary s
WHERE s.flag_support_friction AND NOT s.flag_intervention
UNION ALL
SELECT s.lead_id, s.name, s.company, s.success_state,
       'reactivate', 3, '30+ days without activity'
FROM public.v_direct_success_summary s
WHERE s.flag_inactive AND NOT s.flag_canceled
UNION ALL
SELECT s.lead_id, s.name, s.company, s.success_state,
       'upsell', 1, 'Healthy account with expansion signals'
FROM public.v_direct_success_summary s
WHERE s.flag_expansion_ready
UNION ALL
SELECT s.lead_id, s.name, s.company, s.success_state,
       'educate', 3, 'New account in first 30 days'
FROM public.v_direct_success_summary s
WHERE s.flag_new_account;

COMMENT ON VIEW public.v_direct_success_opportunities IS
'Phase 30: rule-based candidate plays per direct account. Each row carries an explicit reason; no opaque scoring.';

-- 4. v_direct_self_success  (client-safe, scoped via auth.uid -> leads.user_id)
CREATE OR REPLACE VIEW public.v_direct_self_success
WITH (security_invoker = true) AS
WITH me AS (
  SELECT id AS lead_id FROM public.leads WHERE user_id = auth.uid()
)
SELECT
  s.lead_id,
  -- safe hints only — no state labels, no economics
  (s.health_band = 'healthy')                                AS hint_healthy,
  (s.flag_no_receptionist)                                   AS hint_setup_incomplete,
  (s.flag_support_friction)                                  AS hint_support_attention,
  (s.flag_expansion_ready)                                   AS hint_expansion_ready,
  (s.flag_new_account)                                       AS hint_new_account,
  s.days_live,
  s.live_campaigns_count,
  s.open_tickets_count
FROM public.v_direct_success_summary s
WHERE s.lead_id IN (SELECT lead_id FROM me);

COMMENT ON VIEW public.v_direct_self_success IS
'Phase 30: client-safe self view. Own account only via auth.uid() -> leads.user_id. No internal economics, no state labels.';

-- 5. BI mirrors
CREATE OR REPLACE VIEW public.v_bi_direct_success_summary
WITH (security_invoker = true) AS SELECT * FROM public.v_direct_success_summary;

CREATE OR REPLACE VIEW public.v_bi_direct_success_opportunities
WITH (security_invoker = true) AS SELECT * FROM public.v_direct_success_opportunities;

CREATE OR REPLACE VIEW public.v_bi_direct_success_plays
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.lead_id,
  l.name        AS lead_name,
  l.company     AS lead_company,
  p.play_type,
  p.status,
  p.follow_up_date,
  p.notes,
  p.created_at,
  p.updated_at
FROM public.direct_success_plays p
LEFT JOIN public.leads l ON l.id = p.lead_id;
