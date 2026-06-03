
-- ─────────────────────────────────────────────────────────────────
-- Phase 11: Export / External BI & Data Products
-- ─────────────────────────────────────────────────────────────────

-- 1. Snapshot storage
CREATE TABLE IF NOT EXISTS public.data_export_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_type text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('admin', 'partner')),
  partner_id uuid NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  row_count integer NOT NULL DEFAULT 0,
  generated_by uuid NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  notes text NULL
);

CREATE INDEX IF NOT EXISTS idx_data_export_snapshots_type_time
  ON public.data_export_snapshots(snapshot_type, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_export_snapshots_partner
  ON public.data_export_snapshots(partner_id, generated_at DESC)
  WHERE partner_id IS NOT NULL;

ALTER TABLE public.data_export_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all snapshots"
  ON public.data_export_snapshots FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Partners view their own snapshots"
  ON public.data_export_snapshots FOR SELECT
  TO authenticated
  USING (
    scope = 'partner'
    AND partner_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.white_label_partners wlp
      WHERE wlp.id = data_export_snapshots.partner_id
        AND wlp.user_id = auth.uid()
    )
  );

-- 2. BI-facing views (stable schema for external warehouse / BI tools)
-- Inherit RLS from underlying views (security invoker default).

CREATE OR REPLACE VIEW public.v_bi_executive_kpi AS
SELECT
  computed_at AS as_of,
  active_leads,
  leads_won_30d,
  leads_new_30d,
  intakes_open,
  intakes_activated_30d,
  receptionists_live,
  receptionists_blocked,
  wl_partners_live,
  wl_partners_total,
  blog_published_30d,
  recs_open,
  recs_warn_or_critical,
  recs_resolved_30d
FROM public.v_intelligence_executive_summary;

CREATE OR REPLACE VIEW public.v_bi_revenue_pipeline AS
SELECT
  pipeline_stage::text AS stage,
  lead_count,
  estimated_value_usd,
  unassigned_count,
  overdue_followups,
  now() AS as_of
FROM public.v_revenue_pipeline;

CREATE OR REPLACE VIEW public.v_bi_delivery_pipeline AS
SELECT *, now() AS as_of FROM public.v_delivery_pipeline;

CREATE OR REPLACE VIEW public.v_bi_voice_readiness AS
SELECT *, now() AS as_of FROM public.v_call_flow_receptionist_readiness;

CREATE OR REPLACE VIEW public.v_bi_wl_partner_readiness AS
SELECT *, now() AS as_of FROM public.v_wl_partner_readiness;

CREATE OR REPLACE VIEW public.v_bi_automation_health AS
SELECT *, now() AS as_of FROM public.v_open_recommendations;

-- Partner-safe export view: filters by caller via underlying RLS on
-- white_label_clients.user_id-style policies. Partners only see their own.
CREATE OR REPLACE VIEW public.v_bi_wl_partner_export AS
SELECT
  d.partner_id,
  d.wl_client_id,
  d.client_name,
  d.status AS account_status,
  d.plan,
  d.service_type,
  d.total_campaigns,
  d.published_campaigns,
  d.live_receptionist_flows,
  d.pending_receptionist_flows,
  d.open_tickets,
  d.created_at,
  now() AS as_of
FROM public.v_wl_client_directory_for_partner d;

-- 3. RPCs
CREATE OR REPLACE FUNCTION public.generate_executive_snapshot()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_payload jsonb;
  v_id uuid;
  v_actor uuid := auth.uid();
  v_kpi jsonb;
  v_revenue jsonb;
  v_delivery jsonb;
  v_voice jsonb;
  v_wl jsonb;
  v_automation jsonb;
  v_row_count integer := 0;
BEGIN
  IF NOT has_role(v_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  SELECT to_jsonb(s.*) INTO v_kpi FROM public.v_intelligence_executive_summary s LIMIT 1;
  SELECT coalesce(jsonb_agg(to_jsonb(r.*)), '[]'::jsonb) INTO v_revenue FROM public.v_revenue_pipeline r;
  SELECT coalesce(jsonb_agg(to_jsonb(r.*)), '[]'::jsonb) INTO v_delivery FROM public.v_delivery_pipeline r;
  SELECT coalesce(jsonb_agg(to_jsonb(r.*)), '[]'::jsonb) INTO v_voice FROM public.v_call_flow_receptionist_readiness r;
  SELECT coalesce(jsonb_agg(to_jsonb(r.*)), '[]'::jsonb) INTO v_wl FROM public.v_wl_partner_readiness r;
  SELECT coalesce(jsonb_agg(to_jsonb(r.*)), '[]'::jsonb) INTO v_automation FROM public.v_open_recommendations r;

  v_payload := jsonb_build_object(
    'kpi', coalesce(v_kpi, '{}'::jsonb),
    'revenue_pipeline', v_revenue,
    'delivery_pipeline', v_delivery,
    'voice_readiness', v_voice,
    'wl_partner_readiness', v_wl,
    'open_recommendations', v_automation
  );

  v_row_count :=
    coalesce(jsonb_array_length(v_revenue),0) +
    coalesce(jsonb_array_length(v_delivery),0) +
    coalesce(jsonb_array_length(v_voice),0) +
    coalesce(jsonb_array_length(v_wl),0) +
    coalesce(jsonb_array_length(v_automation),0);

  INSERT INTO public.data_export_snapshots
    (snapshot_type, scope, partner_id, payload, row_count, generated_by)
  VALUES
    ('executive_snapshot', 'admin', NULL, v_payload, v_row_count, v_actor)
  RETURNING id INTO v_id;

  INSERT INTO public.audit_log (actor_id, action, target_table, target_id, metadata)
  VALUES (v_actor, 'intelligence.export.executive_snapshot', 'data_export_snapshots', v_id::text,
          jsonb_build_object('row_count', v_row_count));

  INSERT INTO public.dashboard_events (event_name, surface, persona, target, user_id, properties)
  VALUES ('intelligence.export.executive_snapshot', 'admin/intelligence', 'admin',
          v_id::text, v_actor, jsonb_build_object('row_count', v_row_count));

  RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_wl_partner_snapshot(p_partner_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_actor uuid := auth.uid();
  v_is_admin boolean := has_role(v_actor, 'admin'::app_role);
  v_owns boolean;
  v_payload jsonb;
  v_readiness jsonb;
  v_clients jsonb;
  v_row_count integer := 0;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.white_label_partners
    WHERE id = p_partner_id AND user_id = v_actor
  ) INTO v_owns;

  IF NOT (v_is_admin OR v_owns) THEN
    RAISE EXCEPTION 'forbidden: must be admin or owning partner';
  END IF;

  SELECT to_jsonb(r.*) INTO v_readiness
    FROM public.v_wl_partner_readiness r WHERE r.partner_id = p_partner_id LIMIT 1;
  SELECT coalesce(jsonb_agg(to_jsonb(r.*)), '[]'::jsonb) INTO v_clients
    FROM public.v_wl_client_directory_for_partner r WHERE r.partner_id = p_partner_id;

  v_payload := jsonb_build_object(
    'partner_id', p_partner_id,
    'readiness', coalesce(v_readiness, '{}'::jsonb),
    'clients', v_clients
  );
  v_row_count := coalesce(jsonb_array_length(v_clients),0);

  INSERT INTO public.data_export_snapshots
    (snapshot_type, scope, partner_id, payload, row_count, generated_by)
  VALUES
    ('wl_partner_snapshot', 'partner', p_partner_id, v_payload, v_row_count, v_actor)
  RETURNING id INTO v_id;

  INSERT INTO public.audit_log (actor_id, action, target_table, target_id, metadata)
  VALUES (v_actor, 'intelligence.export.wl_partner_snapshot', 'data_export_snapshots', v_id::text,
          jsonb_build_object('partner_id', p_partner_id, 'row_count', v_row_count));

  INSERT INTO public.dashboard_events (event_name, surface, persona, target, user_id, properties)
  VALUES ('intelligence.export.wl_partner_snapshot',
          CASE WHEN v_is_admin THEN 'admin/intelligence' ELSE 'wl-dashboard' END,
          CASE WHEN v_is_admin THEN 'admin' ELSE 'wl_partner' END,
          v_id::text, v_actor,
          jsonb_build_object('partner_id', p_partner_id, 'row_count', v_row_count));

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_executive_snapshot() TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_wl_partner_snapshot(uuid) TO authenticated;
