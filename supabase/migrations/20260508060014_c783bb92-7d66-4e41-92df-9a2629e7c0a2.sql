
CREATE OR REPLACE FUNCTION public.cron_generate_executive_snapshot()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_payload jsonb;
  v_kpi jsonb;
  v_revenue jsonb;
  v_delivery jsonb;
  v_voice jsonb;
  v_wl jsonb;
  v_automation jsonb;
  v_row_count integer := 0;
BEGIN
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
    (snapshot_type, scope, partner_id, payload, row_count, generated_by, notes)
  VALUES
    ('executive_snapshot_daily', 'admin', NULL, v_payload, v_row_count, NULL, 'pg_cron')
  RETURNING id INTO v_id;

  INSERT INTO public.audit_log (actor_id, action, target_table, target_id, metadata)
  VALUES (NULL, 'intelligence.export.executive_snapshot.cron', 'data_export_snapshots', v_id::text,
          jsonb_build_object('row_count', v_row_count, 'source', 'pg_cron'));

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cron_generate_executive_snapshot() FROM PUBLIC, anon, authenticated;
