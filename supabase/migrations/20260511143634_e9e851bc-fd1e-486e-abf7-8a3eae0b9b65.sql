-- D-12: fix client_addons / custom_plans RLS to use auth.jwt() email
DROP POLICY IF EXISTS "Clients can view own addons" ON public.client_addons;
CREATE POLICY "Clients can view own addons"
  ON public.client_addons
  FOR SELECT
  USING (
    lead_id IN (
      SELECT id FROM public.leads WHERE email = (auth.jwt() ->> 'email')
    )
  );

DROP POLICY IF EXISTS "Clients can view own custom plans" ON public.custom_plans;
CREATE POLICY "Clients can view own custom plans"
  ON public.custom_plans
  FOR SELECT
  USING (
    lead_id IN (
      SELECT id FROM public.leads WHERE email = (auth.jwt() ->> 'email')
    )
  );

-- D-11: fix capture_revops_snapshot to use real columns of v_exec_direct_vs_wl_summary
CREATE OR REPLACE FUNCTION public.capture_revops_snapshot(
  p_period_start date,
  p_period_end date,
  p_label text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_forecast_snapshot_id uuid DEFAULT NULL,
  p_board_pack_ref text DEFAULT NULL,
  p_force boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_label text;
  v_existing uuid;
  v_spine record;
  v_mov record;
  v_dvw record;
  v_ret record;
  v_extras jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin role required';
  END IF;
  IF p_period_end < p_period_start THEN
    RAISE EXCEPTION 'period_end must be >= period_start';
  END IF;

  v_label := COALESCE(NULLIF(p_label, ''), to_char(p_period_start, 'YYYY-MM'));

  SELECT id INTO v_existing FROM public.revops_period_snapshots WHERE label = v_label;
  IF v_existing IS NOT NULL THEN
    IF NOT p_force THEN
      RAISE EXCEPTION 'snapshot already exists for label %, pass force=true to recapture', v_label;
    END IF;
    DELETE FROM public.revops_period_snapshots WHERE id = v_existing;
  END IF;

  SELECT * INTO v_spine FROM public.v_exec_mrr_spine
   WHERE month_start = date_trunc('month', p_period_start)::date;
  SELECT * INTO v_mov FROM public.v_subscription_movements
   WHERE month_start = date_trunc('month', p_period_start)::date;

  SELECT
    COALESCE(SUM(CASE WHEN stream = 'direct' THEN known_mrr_usd END), 0)          AS direct_mrr,
    COALESCE(SUM(CASE WHEN stream = 'wl'     THEN wl_recurring_proxy_usd END), 0) AS wl_mrr_proxy
   INTO v_dvw
   FROM public.v_exec_direct_vs_wl_summary;

  SELECT * INTO v_ret FROM public.v_exec_retention_rates
   WHERE month_start = date_trunc('month', p_period_start)::date;

  v_extras := jsonb_build_object(
    'sources', jsonb_build_array(
      'v_exec_mrr_spine','v_subscription_movements','v_exec_direct_vs_wl_summary',
      'v_exec_retention_rates','v_open_deals_pipeline','v_renewal_workflows_pipeline',
      'v_capacity_gaps','v_gtm_target_variance'
    ),
    'captured_period', jsonb_build_object(
      'start', p_period_start,
      'end', p_period_end,
      'notes', 'direct_vs_wl_summary captured as-of capture time (not month-keyed)'
    )
  );

  INSERT INTO public.revops_period_snapshots
    (period_start_date, period_end_date, label, captured_by,
     linked_forecast_snapshot_id, linked_board_pack_ref, notes, extras)
  VALUES
    (p_period_start, p_period_end, v_label, auth.uid(),
     p_forecast_snapshot_id, p_board_pack_ref, p_notes, v_extras)
  RETURNING id INTO v_id;

  INSERT INTO public.revops_snapshot_metrics
    (snapshot_id, starting_mrr_usd, ending_mrr_usd, net_new_mrr_usd,
     new_mrr_usd, churned_mrr_usd, expansion_mrr_usd, contraction_mrr_usd,
     new_subs, churned_subs, ending_active_subs,
     nrr_pct, grr_pct, direct_mrr_usd, wl_recurring_proxy_usd)
  VALUES
    (v_id, v_spine.starting_mrr_usd, v_spine.ending_mrr_usd, v_spine.net_new_mrr_usd,
     v_mov.new_mrr_usd, v_mov.churned_mrr_usd, v_mov.expansion_mrr_usd, v_mov.contraction_mrr_usd,
     v_mov.new_subs, v_mov.churned_subs, v_spine.ending_active_subs,
     v_ret.nrr_pct, v_ret.grr_pct, v_dvw.direct_mrr, v_dvw.wl_mrr_proxy);

  INSERT INTO public.revops_snapshot_pipeline (snapshot_id, bucket, deal_type, stage, count, weighted_count)
  SELECT v_id, 'open_deals', d.deal_type::text, d.stage::text, COUNT(*)::int, NULL
  FROM public.v_open_deals_pipeline d
  GROUP BY d.deal_type, d.stage;

  INSERT INTO public.revops_snapshot_pipeline (snapshot_id, bucket, deal_type, stage, count, weighted_count)
  SELECT v_id, 'renewal_workflows', NULL, COALESCE(stage::text, 'unknown'), COUNT(*)::int, NULL
  FROM public.v_renewal_workflows_pipeline
  GROUP BY stage;

  INSERT INTO public.revops_snapshot_capacity
    (snapshot_id, scope, function, demand, current_supply, gap_now, over_under_pct,
     gtm_target_new_mrr, gtm_forecast_new_mrr, gtm_variance_pct)
  SELECT
    v_id, g.scope, g.function, g.demand, g.current_supply, g.gap_now, g.over_under_pct,
    NULL, NULL, NULL
  FROM public.v_capacity_gaps g
  WHERE g.period = date_trunc('month', p_period_start)::date;

  INSERT INTO public.revops_snapshot_capacity
    (snapshot_id, scope, function, demand, current_supply, gap_now, over_under_pct,
     gtm_target_new_mrr, gtm_forecast_new_mrr, gtm_variance_pct)
  SELECT
    v_id, v.scope, 'gtm_new_mrr', NULL, NULL, NULL, NULL,
    v.target_new_business_mrr, v.forecast_new_business_mrr, v.variance_pct
  FROM public.v_gtm_target_variance v
  WHERE v.period = date_trunc('month', p_period_start)::date;

  RETURN v_id;
END;
$$;

-- D-11 / TS-06: extend seed_qa_state() to seed offer fixtures
create or replace function public.seed_qa_state()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_caller uuid := auth.uid();
  v_enabled boolean;
  v_label text := 'QA-SEED 2026-05-10';
  v_forecast_id uuid;
  v_snapshot_id uuid;
  v_partner_id uuid;
  v_below_id uuid;
  v_above_id uuid;
  v_impl_id uuid;
  v_offer_eligible_id uuid;
  v_offer_ineligible_id uuid;
  v_period_start date := date_trunc('month', now())::date;
  v_period_end date := (date_trunc('month', now()) + interval '1 month - 1 day')::date;
begin
  if v_caller is null or not public.has_role(v_caller, 'admin'::public.app_role) then
    raise exception 'seed_qa_state: admin role required' using errcode = '42501';
  end if;

  select qa_seed_enabled into v_enabled from public.qa_environment_flags where id = true;
  if coalesce(v_enabled, false) = false then
    raise exception 'seed_qa_state: disabled. Toggle qa_environment_flags.qa_seed_enabled to true on staging before running.'
      using errcode = 'P0001';
  end if;

  select id into v_partner_id from public.white_label_partners
   where status = 'active' order by created_at limit 1;
  if v_partner_id is null then
    select id into v_partner_id from public.white_label_partners order by created_at limit 1;
  end if;

  insert into public.renewal_expansion_deals
    (scope, target_id, deal_type, stage, status,
     proposed_term_months, estimated_discount_pct, is_non_standard_term, is_exception,
     approval_state, notes, created_by)
  values
    ('partner'::deal_scope, coalesce(v_partner_id, gen_random_uuid()),
     'expansion'::deal_type, 'proposal_sent'::deal_stage, 'open'::deal_status,
     12, 5.0, false, false,
     'not_required'::approval_state, v_label || ' below-threshold', v_caller)
  returning id into v_below_id;

  insert into public.renewal_expansion_deals
    (scope, target_id, deal_type, stage, status,
     proposed_term_months, estimated_discount_pct, is_non_standard_term, is_exception,
     approval_state, notes, created_by)
  values
    ('partner'::deal_scope, coalesce(v_partner_id, gen_random_uuid()),
     'renewal'::deal_type, 'negotiation'::deal_stage, 'open'::deal_status,
     24, 35.0, true, true,
     'pending'::approval_state, v_label || ' above-threshold', v_caller)
  returning id into v_above_id;

  insert into public.renewal_expansion_deals
    (scope, target_id, deal_type, stage, status,
     proposed_term_months, implemented_at,
     approval_state, notes, created_by)
  values
    ('partner'::deal_scope, coalesce(v_partner_id, gen_random_uuid()),
     'renewal'::deal_type, 'implemented'::deal_stage, 'won'::deal_status,
     12, now(),
     'not_required'::approval_state, v_label || ' implemented', v_caller)
  returning id into v_impl_id;

  insert into public.forecast_snapshots
    (label, notes, horizon_start, horizon_end, parameters, payload, parameters_hash,
     created_by, source)
  values
    (v_label || ' forecast', v_label, v_period_start, v_period_end + interval '5 months',
     jsonb_build_object('seed', true, 'label', v_label),
     jsonb_build_object('seed', true, 'mrr_baseline', 50000, 'expansions', 5000, 'churn_risk', 2500),
     md5(v_label || now()::text),
     v_caller, 'qa_seed')
  returning id into v_forecast_id;

  insert into public.revops_period_snapshots
    (period_start_date, period_end_date, label, captured_by,
     linked_forecast_snapshot_id, notes,
     extras)
  values
    (v_period_start, v_period_end, v_label || ' period ' || v_period_start::text,
     v_caller, v_forecast_id, v_label,
     jsonb_build_object('seed', true,
       'direct_clients', jsonb_build_array(
         jsonb_build_object('label','Healthy direct client (seed)','status','healthy'),
         jsonb_build_object('label','At-risk renewal-window client (seed)','status','at_risk')),
       'wl_partners', jsonb_build_array(
         jsonb_build_object('label','Healthy WL portfolio (seed)','status','healthy'),
         jsonb_build_object('label','At-risk WL portfolio (seed)','status','at_risk'))))
  returning id into v_snapshot_id;

  insert into public.offers
    (key, label, surface, audience, plan_key,
     is_baseline, active, eligibility, metadata, created_by)
  values
    ('qa_seed_signup_eligible', v_label || ' eligible signup offer',
     'signup', 'all', 'qa_seed_plan_starter',
     true, true, '{}'::jsonb,
     jsonb_build_object('qa_seed', v_label, 'intent', 'eligible'),
     v_caller)
  on conflict (key) do update set
    label = excluded.label,
    surface = excluded.surface,
    audience = excluded.audience,
    plan_key = excluded.plan_key,
    is_baseline = excluded.is_baseline,
    active = excluded.active,
    eligibility = excluded.eligibility,
    metadata = excluded.metadata,
    updated_at = now()
  returning id into v_offer_eligible_id;

  insert into public.offers
    (key, label, surface, audience, plan_key,
     is_baseline, active, eligibility, metadata, created_by)
  values
    ('qa_seed_signup_ineligible', v_label || ' ineligible signup offer',
     'signup', 'wl_end_client', 'qa_seed_plan_starter',
     false, true,
     jsonb_build_object('min_tenure_days', 36500),
     jsonb_build_object('qa_seed', v_label, 'intent', 'ineligible'),
     v_caller)
  on conflict (key) do update set
    label = excluded.label,
    surface = excluded.surface,
    audience = excluded.audience,
    plan_key = excluded.plan_key,
    is_baseline = excluded.is_baseline,
    active = excluded.active,
    eligibility = excluded.eligibility,
    metadata = excluded.metadata,
    updated_at = now()
  returning id into v_offer_ineligible_id;

  return jsonb_build_object(
    'ok', true,
    'label', v_label,
    'deal_below_threshold_id', v_below_id,
    'deal_above_threshold_id', v_above_id,
    'deal_implemented_id', v_impl_id,
    'forecast_snapshot_id', v_forecast_id,
    'revops_period_snapshot_id', v_snapshot_id,
    'offer_eligible_id', v_offer_eligible_id,
    'offer_ineligible_id', v_offer_ineligible_id,
    'partner_used', v_partner_id
  );
end;
$function$;