
-- Phase 29 — Partner Success & Expansion Operations

-- 1. partner_success_plays
CREATE TABLE IF NOT EXISTS public.partner_success_plays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  play_type TEXT NOT NULL CHECK (play_type IN ('educate','upsell','save','onboard','reactivate')),
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','active','completed','dismissed')),
  notes TEXT,
  follow_up_date DATE,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_psp_partner ON public.partner_success_plays(partner_id);
CREATE INDEX IF NOT EXISTS idx_psp_status ON public.partner_success_plays(status);
CREATE INDEX IF NOT EXISTS idx_psp_followup ON public.partner_success_plays(follow_up_date);

ALTER TABLE public.partner_success_plays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "psp admin all" ON public.partner_success_plays;
CREATE POLICY "psp admin all" ON public.partner_success_plays
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_psp_updated_at ON public.partner_success_plays;
CREATE TRIGGER trg_psp_updated_at
  BEFORE UPDATE ON public.partner_success_plays
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.partner_success_plays IS
'Phase 29: lightweight partner-success play tracking. Admin-only.';

-- 2. v_partner_success_summary
CREATE OR REPLACE VIEW public.v_partner_success_summary
WITH (security_invoker = true) AS
WITH band AS (
  SELECT
    s.partner_id,
    COUNT(*)::int AS account_count,
    COUNT(*) FILTER (WHERE s.health_band = 'healthy')::int      AS healthy_count,
    COUNT(*) FILTER (WHERE s.health_band = 'watch')::int        AS watch_count,
    COUNT(*) FILTER (WHERE s.health_band = 'intervention')::int AS intervention_count
  FROM public.v_success_account_status s
  WHERE s.partner_id IS NOT NULL
  GROUP BY s.partner_id
)
SELECT
  e.partner_id,
  e.partner_slug,
  e.company_name,
  e.tier,
  e.partner_status,
  e.cohort_month,
  e.total_clients,
  e.active_clients,
  e.recurring_value_proxy_usd,
  e.partial_margin_proxy_usd,
  e.partial_margin_pct,
  e.clients_expansion,
  e.clients_contraction,
  COALESCE(b.account_count, 0)      AS account_count,
  COALESCE(b.healthy_count, 0)      AS healthy_count,
  COALESCE(b.watch_count, 0)        AS watch_count,
  COALESCE(b.intervention_count, 0) AS intervention_count,
  CASE WHEN COALESCE(b.account_count,0) > 0
       THEN (b.healthy_count::numeric / b.account_count) ELSE NULL END AS healthy_share,
  CASE WHEN COALESCE(b.account_count,0) > 0
       THEN (b.intervention_count::numeric / b.account_count) ELSE NULL END AS intervention_share,
  (e.partner_status = 'inactive')                                                    AS flag_partner_inactive,
  (COALESCE(b.intervention_count,0) > 0
     AND COALESCE(b.account_count,0) > 0
     AND b.intervention_count::numeric / b.account_count >= 0.3)                     AS flag_high_intervention,
  (e.clients_contraction > e.clients_expansion AND e.clients_contraction > 0)        AS flag_net_contraction,
  (e.partial_margin_pct IS NOT NULL AND e.partial_margin_pct < 0.10)                 AS flag_low_margin,
  (COALESCE(b.healthy_count,0) >= 3
     AND e.clients_expansion >= 2
     AND COALESCE(b.intervention_count,0) = 0)                                       AS flag_expansion_ready,
  (e.active_clients >= 5
     AND COALESCE(b.healthy_count,0)::numeric / NULLIF(b.account_count,0) >= 0.7)    AS flag_strategic,
  CASE
    WHEN e.partner_status = 'inactive' THEN 'at_risk'
    WHEN COALESCE(b.intervention_count,0) > 0
         AND b.intervention_count::numeric / NULLIF(b.account_count,0) >= 0.3 THEN 'at_risk'
    WHEN (e.clients_contraction > e.clients_expansion AND e.clients_contraction > 0)
         OR (e.partial_margin_pct IS NOT NULL AND e.partial_margin_pct < 0.10) THEN 'stabilize'
    WHEN COALESCE(b.healthy_count,0) >= 3
         AND e.clients_expansion >= 2
         AND COALESCE(b.intervention_count,0) = 0
         AND e.active_clients >= 5
         AND b.healthy_count::numeric / NULLIF(b.account_count,0) >= 0.7 THEN 'strategic_growth'
    ELSE 'nurture'
  END::text AS partner_state
FROM public.v_wl_partner_economics e
LEFT JOIN band b ON b.partner_id = e.partner_id;

COMMENT ON VIEW public.v_partner_success_summary IS
'Phase 29: per-partner success state with explainable flags. Sources v_wl_partner_economics + v_success_account_status.';

-- 3. v_partner_success_accounts
CREATE OR REPLACE VIEW public.v_partner_success_accounts
WITH (security_invoker = true) AS
SELECT
  s.partner_id,
  s.lead_id,
  s.name,
  s.company,
  s.health_band,
  s.lifecycle_signal,
  s.receptionist_health,
  s.days_live,
  s.days_since_activity,
  s.open_tickets_count,
  s.live_campaigns_count,
  s.total_campaigns_count
FROM public.v_success_account_status s
WHERE s.partner_id IS NOT NULL;

COMMENT ON VIEW public.v_partner_success_accounts IS
'Phase 29: per-partner account-level drivers behind partner success state.';

-- 4. v_partner_success_opportunities (UNION ALL of rule rows)
CREATE OR REPLACE VIEW public.v_partner_success_opportunities
WITH (security_invoker = true) AS
SELECT s.partner_id, s.partner_slug, s.company_name, s.partner_state,
       'save'::text AS opportunity_type, 1::int AS priority,
       'Net contraction across portfolio'::text AS reason
FROM public.v_partner_success_summary s
WHERE s.flag_net_contraction
UNION ALL
SELECT s.partner_id, s.partner_slug, s.company_name, s.partner_state,
       'save', 1, 'High intervention share (>=30% of accounts)'
FROM public.v_partner_success_summary s
WHERE s.flag_high_intervention
UNION ALL
SELECT s.partner_id, s.partner_slug, s.company_name, s.partner_state,
       'save', 2, 'Partner status inactive'
FROM public.v_partner_success_summary s
WHERE s.flag_partner_inactive
UNION ALL
SELECT s.partner_id, s.partner_slug, s.company_name, s.partner_state,
       'educate', 2, 'Partial margin below 10%'
FROM public.v_partner_success_summary s
WHERE s.flag_low_margin AND NOT s.flag_high_intervention
UNION ALL
SELECT s.partner_id, s.partner_slug, s.company_name, s.partner_state,
       'upsell', 1, 'Healthy portfolio with expansion signals'
FROM public.v_partner_success_summary s
WHERE s.flag_expansion_ready
UNION ALL
SELECT s.partner_id, s.partner_slug, s.company_name, s.partner_state,
       'upsell', 2, 'Strategic growth profile (>=70% healthy, 5+ active clients)'
FROM public.v_partner_success_summary s
WHERE s.flag_strategic AND NOT s.flag_expansion_ready
UNION ALL
SELECT s.partner_id, s.partner_slug, s.company_name, s.partner_state,
       'onboard', 3, 'Has accounts but few healthy clients'
FROM public.v_partner_success_summary s
WHERE s.healthy_share IS NOT NULL
  AND s.healthy_share < 0.5
  AND s.account_count >= 2
  AND NOT s.flag_high_intervention;

COMMENT ON VIEW public.v_partner_success_opportunities IS
'Phase 29: rule-based partner expansion/intervention candidates. Each row carries an explicit reason; no opaque scoring.';

-- 5. v_partner_self_success (partner-safe)
CREATE OR REPLACE VIEW public.v_partner_self_success
WITH (security_invoker = true) AS
WITH me AS (
  SELECT id AS partner_id
  FROM public.white_label_partners
  WHERE user_id = auth.uid()
),
band AS (
  SELECT
    s.partner_id,
    COUNT(*)::int AS account_count,
    COUNT(*) FILTER (WHERE s.health_band = 'healthy')::int      AS healthy_count,
    COUNT(*) FILTER (WHERE s.health_band = 'watch')::int        AS watch_count,
    COUNT(*) FILTER (WHERE s.health_band = 'intervention')::int AS intervention_count
  FROM public.v_success_account_status s
  WHERE s.partner_id IN (SELECT partner_id FROM me)
  GROUP BY s.partner_id
),
econ AS (
  SELECT partner_id, clients_expansion, clients_contraction, active_clients
  FROM public.v_wl_partner_economics
  WHERE partner_id IN (SELECT partner_id FROM me)
)
SELECT
  m.partner_id,
  COALESCE(b.account_count, 0)      AS account_count,
  COALESCE(b.healthy_count, 0)      AS healthy_count,
  COALESCE(b.watch_count, 0)        AS watch_count,
  COALESCE(b.intervention_count, 0) AS intervention_count,
  COALESCE(e.clients_expansion, 0)  AS clients_expansion,
  COALESCE(e.clients_contraction, 0) AS clients_contraction,
  COALESCE(e.active_clients, 0)     AS active_clients,
  (COALESCE(b.healthy_count,0) >= 3 AND COALESCE(e.clients_expansion,0) >= 2
     AND COALESCE(b.intervention_count,0) = 0)                                  AS hint_expansion_ready,
  (COALESCE(b.intervention_count,0) > 0)                                        AS hint_attention_needed,
  (COALESCE(b.account_count,0) > 0
     AND COALESCE(b.healthy_count,0)::numeric / b.account_count >= 0.7)         AS hint_strong_portfolio
FROM me m
LEFT JOIN band b ON b.partner_id = m.partner_id
LEFT JOIN econ e ON e.partner_id = m.partner_id;

COMMENT ON VIEW public.v_partner_self_success IS
'Phase 29: partner-safe expansion view. Own portfolio only, no internal economics, no state labels.';

-- 6. BI mirrors
CREATE OR REPLACE VIEW public.v_bi_partner_success_summary
WITH (security_invoker = true) AS SELECT * FROM public.v_partner_success_summary;

CREATE OR REPLACE VIEW public.v_bi_partner_success_opportunities
WITH (security_invoker = true) AS SELECT * FROM public.v_partner_success_opportunities;

CREATE OR REPLACE VIEW public.v_bi_partner_success_plays
WITH (security_invoker = true) AS
SELECT
  p.id,
  p.partner_id,
  wlp.partner_slug,
  wlp.company_name,
  p.play_type,
  p.status,
  p.follow_up_date,
  p.notes,
  p.created_at,
  p.updated_at
FROM public.partner_success_plays p
LEFT JOIN public.white_label_partners wlp ON wlp.id = p.partner_id;
