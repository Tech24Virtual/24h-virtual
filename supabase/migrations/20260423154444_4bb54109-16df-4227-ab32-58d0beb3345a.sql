-- Phase H: Reporting views, scenario effectiveness, and Five9 drift detection

DROP VIEW IF EXISTS public.v_scenario_outcome_rollup CASCADE;
DROP VIEW IF EXISTS public.v_campaign_rollup_30d CASCADE;
DROP VIEW IF EXISTS public.v_campaign_call_attribution CASCADE;
DROP FUNCTION IF EXISTS public.run_go_live_self_test();

-- 1. Cross-Campaign Reporting Views
CREATE VIEW public.v_campaign_call_attribution AS
SELECT
  c.id AS campaign_id,
  c.tenant_kind,
  c.client_lead_id,
  c.wl_partner_id,
  c.wl_client_id,
  c.client_department_id,
  cl.id AS call_id,
  cl.disposition,
  cl.handle_time_seconds,
  cl.call_duration,
  cl.call_date,
  cl.call_time,
  cl.campaign_name AS source_campaign_name,
  cl.dnis
FROM public.call_logs cl
JOIN public.client_report_mappings m
  ON m.is_active = true
 AND (
      (m.match_type = 'dnis' AND cl.dnis = m.match_value)
   OR (m.match_type = 'campaign_name' AND cl.campaign_name = m.match_value)
   OR (m.match_type = 'caller_number' AND cl.caller_number = m.match_value)
 )
JOIN public.campaigns c
  ON (
       (m.lead_id IS NOT NULL AND c.client_lead_id = m.lead_id)
    OR (m.wl_client_id IS NOT NULL AND c.wl_client_id = m.wl_client_id)
  );

CREATE VIEW public.v_campaign_rollup_30d AS
SELECT
  a.campaign_id,
  a.tenant_kind,
  a.client_lead_id,
  a.wl_partner_id,
  a.wl_client_id,
  a.client_department_id,
  COUNT(*)::int AS calls_30d,
  COALESCE(AVG(NULLIF(a.handle_time_seconds, 0)), 0)::numeric(10,2) AS avg_handle_time_seconds,
  (COUNT(*) FILTER (WHERE LOWER(COALESCE(a.disposition,'')) ~ '(missed|no answer|no-answer|abandon|voicemail|hang)')::numeric
    / NULLIF(COUNT(*),0)::numeric * 100)::numeric(5,2) AS missed_pct,
  MAX(a.call_date) AS last_call_date
FROM public.v_campaign_call_attribution a
WHERE a.call_date >= (CURRENT_DATE - INTERVAL '30 days')
GROUP BY a.campaign_id, a.tenant_kind, a.client_lead_id, a.wl_partner_id, a.wl_client_id, a.client_department_id;

-- 2. Disposition bucketing + scenario rollup
CREATE OR REPLACE FUNCTION public.disposition_bucket(_disposition text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN _disposition IS NULL OR LENGTH(TRIM(_disposition)) = 0 THEN 'other'
    WHEN LOWER(_disposition) ~ '(resolved|completed|success|sale|booked|scheduled|answered|handled)' THEN 'resolved'
    WHEN LOWER(_disposition) ~ '(escalat|transfer|supervisor|callback requested)' THEN 'escalated'
    WHEN LOWER(_disposition) ~ '(missed|no answer|no-answer|abandon|voicemail|hang|busy|not reached)' THEN 'no_contact'
    ELSE 'other'
  END;
$$;

CREATE VIEW public.v_scenario_outcome_rollup AS
WITH scenario_calls AS (
  SELECT
    s.id AS scenario_id,
    s.campaign_id,
    s.title AS scenario_title,
    public.disposition_bucket(a.disposition) AS bucket,
    a.call_id
  FROM public.campaign_scenarios s
  LEFT JOIN public.v_campaign_call_attribution a
    ON a.campaign_id = s.campaign_id
   AND a.call_date >= (CURRENT_DATE - INTERVAL '30 days')
)
SELECT
  scenario_id,
  campaign_id,
  scenario_title,
  COUNT(*) FILTER (WHERE bucket = 'resolved' AND call_id IS NOT NULL)::int AS resolved_count,
  COUNT(*) FILTER (WHERE bucket = 'escalated' AND call_id IS NOT NULL)::int AS escalated_count,
  COUNT(*) FILTER (WHERE bucket = 'no_contact' AND call_id IS NOT NULL)::int AS no_contact_count,
  COUNT(*) FILTER (WHERE bucket = 'other' AND call_id IS NOT NULL)::int AS other_count,
  COUNT(*) FILTER (WHERE call_id IS NOT NULL)::int AS total_count
FROM scenario_calls
GROUP BY scenario_id, campaign_id, scenario_title;

-- 3. Five9 Drift Detection
CREATE TABLE IF NOT EXISTS public.five9_drift_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  wl_client_id uuid REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  client_lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  client_department_id uuid REFERENCES public.client_departments(id) ON DELETE CASCADE,
  captured_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('manual_paste','csv_upload','scheduled')),
  drift jsonb NOT NULL DEFAULT '{}'::jsonb,
  captured_by uuid
);

CREATE INDEX IF NOT EXISTS idx_five9_drift_department ON public.five9_drift_snapshots(client_department_id, captured_at DESC);

ALTER TABLE public.five9_drift_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins manage five9 drift snapshots" ON public.five9_drift_snapshots;
CREATE POLICY "Admins manage five9 drift snapshots"
ON public.five9_drift_snapshots
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.five9_drift_snapshot_latest AS
SELECT DISTINCT ON (client_department_id)
  id,
  tenant_kind,
  wl_partner_id,
  wl_client_id,
  client_lead_id,
  client_department_id,
  captured_at,
  source,
  drift,
  captured_by
FROM public.five9_drift_snapshots
WHERE client_department_id IS NOT NULL
ORDER BY client_department_id, captured_at DESC;

-- 4. Extended self-test
CREATE FUNCTION public.run_go_live_self_test()
RETURNS TABLE(probe text, passed boolean, detail text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY SELECT 'campaigns_table'::text, (SELECT to_regclass('public.campaigns') IS NOT NULL), 'campaigns table present'::text;
  RETURN QUERY SELECT 'campaign_scenarios_table'::text, (SELECT to_regclass('public.campaign_scenarios') IS NOT NULL), 'scenarios table present'::text;
  RETURN QUERY SELECT 'campaign_faqs_table'::text, (SELECT to_regclass('public.campaign_faq_entries') IS NOT NULL), 'faq table present'::text;
  RETURN QUERY SELECT 'campaign_policies_table'::text, (SELECT to_regclass('public.campaign_policy_blocks') IS NOT NULL), 'policies table present'::text;
  RETURN QUERY SELECT 'five9_variable_mappings_table'::text, (SELECT to_regclass('public.five9_variable_mappings') IS NOT NULL), 'five9 mappings present'::text;
  RETURN QUERY SELECT 'publish_versions_table'::text, (SELECT to_regclass('public.campaign_publish_versions') IS NOT NULL), 'publish versions present'::text;
  RETURN QUERY SELECT 'audit_log_table'::text, (SELECT to_regclass('public.campaign_audit_log') IS NOT NULL), 'audit log present'::text;
  RETURN QUERY SELECT 'is_tenant_member_fn'::text, (SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_tenant_member')), 'tenant-member helper present'::text;
  RETURN QUERY SELECT 'supervisor_assignments_table'::text, (SELECT to_regclass('public.supervisor_tenant_assignments') IS NOT NULL), 'supervisor assignments present'::text;
  RETURN QUERY SELECT 'training_table'::text, (SELECT to_regclass('public.campaign_training_materials') IS NOT NULL OR to_regclass('public.training_modules') IS NOT NULL), 'training storage present'::text;
  RETURN QUERY SELECT 'go_live_checks_view'::text, (SELECT to_regclass('public.campaign_go_live_checks') IS NOT NULL), 'go-live checks view present'::text;
  RETURN QUERY SELECT 'campaign_rollup_30d_view'::text, (SELECT to_regclass('public.v_campaign_rollup_30d') IS NOT NULL), 'reporting view present'::text;
  RETURN QUERY SELECT 'five9_drift_snapshots_table'::text, (SELECT to_regclass('public.five9_drift_snapshots') IS NOT NULL), 'drift table present with RLS'::text;
END;
$$;