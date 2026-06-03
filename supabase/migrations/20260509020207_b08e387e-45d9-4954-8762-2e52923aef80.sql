
-- ═══════════════════════════════════════════════════════════════
-- PHASE 23 — Pricing Experimentation & Plan Analytics
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.pricing_experiments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  hypothesis      text,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','closed','archived')),
  variants        jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes           text,
  started_at      timestamptz,
  ended_at        timestamptz,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pricing_experiment_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id   uuid NOT NULL REFERENCES public.pricing_experiments(id) ON DELETE CASCADE,
  variant_key     text NOT NULL,
  lead_id         uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  visitor_key     text,
  surface_key     text,
  assigned_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pea_experiment ON public.pricing_experiment_assignments(experiment_id);
CREATE INDEX IF NOT EXISTS idx_pea_lead ON public.pricing_experiment_assignments(lead_id);
CREATE INDEX IF NOT EXISTS idx_pea_variant ON public.pricing_experiment_assignments(experiment_id, variant_key);

ALTER TABLE public.pricing_experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_experiment_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage pricing experiments" ON public.pricing_experiments;
CREATE POLICY "Admins manage pricing experiments"
  ON public.pricing_experiments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins manage pricing assignments" ON public.pricing_experiment_assignments;
CREATE POLICY "Admins manage pricing assignments"
  ON public.pricing_experiment_assignments FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE TRIGGER trg_pricing_experiments_updated
BEFORE UPDATE ON public.pricing_experiments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE VIEW public.v_pricing_experiment_results
WITH (security_invoker = true) AS
SELECT
  e.id                                            AS experiment_id,
  e.name                                          AS experiment_name,
  e.status                                        AS experiment_status,
  a.variant_key                                   AS variant_key,
  COUNT(a.id)                                     AS assignments,
  COUNT(DISTINCT a.lead_id)                       AS leads_assigned,
  COUNT(DISTINCT a.visitor_key)                   AS visitors_assigned,
  COUNT(DISTINCT s.lead_id) FILTER (WHERE s.subscription_state IN ('active','past_due','canceled'))
                                                  AS leads_converted,
  COUNT(DISTINCT s.lead_id) FILTER (WHERE s.subscription_state = 'active')
                                                  AS active_subs,
  COALESCE(SUM(s.mrr_usd) FILTER (WHERE s.subscription_state = 'active'), 0)::numeric
                                                  AS active_known_mrr_usd,
  CASE
    WHEN COUNT(DISTINCT s.lead_id) FILTER (WHERE s.subscription_state = 'active' AND s.mrr_usd IS NOT NULL) > 0
    THEN (COALESCE(SUM(s.mrr_usd) FILTER (WHERE s.subscription_state = 'active'), 0)
          / NULLIF(COUNT(DISTINCT s.lead_id) FILTER (WHERE s.subscription_state = 'active' AND s.mrr_usd IS NOT NULL), 0))::numeric
    ELSE NULL
  END                                             AS avg_active_known_mrr_usd
FROM public.pricing_experiments e
LEFT JOIN public.pricing_experiment_assignments a ON a.experiment_id = e.id
LEFT JOIN public.v_subscription_snapshot s ON s.lead_id = a.lead_id
GROUP BY e.id, e.name, e.status, a.variant_key;

CREATE OR REPLACE VIEW public.v_bi_pricing_experiment_results
WITH (security_invoker = true) AS
SELECT * FROM public.v_pricing_experiment_results;

-- ═══════════════════════════════════════════════════════════════
-- PHASE 24 — Partner-Facing Finance & Performance (partner-safe)
-- ═══════════════════════════════════════════════════════════════

-- Partner-safe self economics: only the calling partner's own row.
-- Admin-only fields (servicing cost, partner-side CAC, partial margin) are
-- intentionally NOT projected here.
CREATE OR REPLACE VIEW public.v_wl_partner_self_economics
WITH (security_invoker = true) AS
SELECT
  e.partner_id,
  e.partner_slug,
  e.company_name,
  e.tier,
  e.partner_status,
  e.cohort_month,
  e.created_at,
  e.total_clients,
  e.active_clients,
  e.recurring_value_proxy_usd,
  e.sum_recurring_90d_usd,
  e.paid_invoices_90d,
  e.latest_paid_period,
  e.clients_expansion,
  e.clients_contraction,
  e.clients_stable,
  e.clients_with_signal,
  CASE
    WHEN e.recurring_value_proxy_usd IS NULL THEN 'recurring_unknown'
    ELSE 'recurring_known'
  END                                             AS coverage_flag
FROM public.v_wl_partner_economics e
WHERE EXISTS (
  SELECT 1 FROM public.white_label_partners wlp
  WHERE wlp.id = e.partner_id
    AND wlp.user_id = auth.uid()
);

-- Per-client health rollup, scoped strictly to the calling partner via
-- v_growth_attribution_lead.wl_partner_id and partner ownership.
CREATE OR REPLACE VIEW public.v_wl_partner_self_portfolio_health
WITH (security_invoker = true) AS
SELECT
  wlp.id                                          AS partner_id,
  COALESCE(s.health_band, 'unknown')              AS health_band,
  COUNT(*)                                        AS client_count
FROM public.white_label_partners wlp
JOIN public.v_growth_attribution_lead g ON g.wl_partner_id = wlp.id
LEFT JOIN public.v_success_account_status s ON s.lead_id = g.lead_id
WHERE wlp.user_id = auth.uid()
GROUP BY wlp.id, s.health_band;
