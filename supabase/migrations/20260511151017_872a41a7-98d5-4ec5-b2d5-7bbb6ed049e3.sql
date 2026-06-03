CREATE OR REPLACE FUNCTION public.seed_qa_state()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_snapshot_label text := v_label || ' period ' || v_period_start::text;
  v_forecast_label text := v_label || ' forecast';
  v_below_note text := v_label || ' below-threshold';
  v_above_note text := v_label || ' above-threshold';
  v_impl_note  text := v_label || ' implemented';
  v_status jsonb := '{}'::jsonb;
  v_existed boolean;
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

  -- below-threshold deal
  select id into v_below_id from public.renewal_expansion_deals where notes = v_below_note limit 1;
  if v_below_id is null then
    insert into public.renewal_expansion_deals
      (scope, target_id, deal_type, stage, status,
       proposed_term_months, estimated_discount_pct, is_non_standard_term, is_exception,
       approval_state, notes, created_by)
    values
      ('partner'::deal_scope, coalesce(v_partner_id, gen_random_uuid()),
       'expansion'::deal_type, 'proposal_sent'::deal_stage, 'open'::deal_status,
       12, 5.0, false, false,
       'not_required'::approval_state, v_below_note, v_caller)
    returning id into v_below_id;
    v_status := v_status || jsonb_build_object('deal_below_threshold', 'inserted');
  else
    v_status := v_status || jsonb_build_object('deal_below_threshold', 'already_present');
  end if;

  -- above-threshold deal
  select id into v_above_id from public.renewal_expansion_deals where notes = v_above_note limit 1;
  if v_above_id is null then
    insert into public.renewal_expansion_deals
      (scope, target_id, deal_type, stage, status,
       proposed_term_months, estimated_discount_pct, is_non_standard_term, is_exception,
       approval_state, notes, created_by)
    values
      ('partner'::deal_scope, coalesce(v_partner_id, gen_random_uuid()),
       'renewal'::deal_type, 'negotiation'::deal_stage, 'open'::deal_status,
       24, 35.0, true, true,
       'pending'::approval_state, v_above_note, v_caller)
    returning id into v_above_id;
    v_status := v_status || jsonb_build_object('deal_above_threshold', 'inserted');
  else
    v_status := v_status || jsonb_build_object('deal_above_threshold', 'already_present');
  end if;

  -- implemented deal
  select id into v_impl_id from public.renewal_expansion_deals where notes = v_impl_note limit 1;
  if v_impl_id is null then
    insert into public.renewal_expansion_deals
      (scope, target_id, deal_type, stage, status,
       proposed_term_months, implemented_at,
       approval_state, notes, created_by)
    values
      ('partner'::deal_scope, coalesce(v_partner_id, gen_random_uuid()),
       'renewal'::deal_type, 'implemented'::deal_stage, 'won'::deal_status,
       12, now(),
       'not_required'::approval_state, v_impl_note, v_caller)
    returning id into v_impl_id;
    v_status := v_status || jsonb_build_object('deal_implemented', 'inserted');
  else
    v_status := v_status || jsonb_build_object('deal_implemented', 'already_present');
  end if;

  -- forecast snapshot
  select id into v_forecast_id from public.forecast_snapshots where label = v_forecast_label limit 1;
  if v_forecast_id is null then
    insert into public.forecast_snapshots
      (label, notes, horizon_start, horizon_end, parameters, payload, parameters_hash,
       created_by, source)
    values
      (v_forecast_label, v_label, v_period_start, v_period_end + interval '5 months',
       jsonb_build_object('seed', true, 'label', v_label),
       jsonb_build_object('seed', true, 'mrr_baseline', 50000, 'expansions', 5000, 'churn_risk', 2500),
       md5(v_label || now()::text),
       v_caller, 'qa_seed')
    returning id into v_forecast_id;
    v_status := v_status || jsonb_build_object('forecast_snapshot', 'inserted');
  else
    v_status := v_status || jsonb_build_object('forecast_snapshot', 'already_present');
  end if;

  -- revops period snapshot (idempotent on label)
  select id into v_snapshot_id from public.revops_period_snapshots where label = v_snapshot_label limit 1;
  if v_snapshot_id is null then
    insert into public.revops_period_snapshots
      (period_start_date, period_end_date, label, captured_by,
       linked_forecast_snapshot_id, notes, extras)
    values
      (v_period_start, v_period_end, v_snapshot_label,
       v_caller, v_forecast_id, v_label,
       jsonb_build_object('seed', true,
         'direct_clients', jsonb_build_array(
           jsonb_build_object('label','Healthy direct client (seed)','status','healthy'),
           jsonb_build_object('label','At-risk renewal-window client (seed)','status','at_risk')),
         'wl_partners', jsonb_build_array(
           jsonb_build_object('label','Healthy WL portfolio (seed)','status','healthy'),
           jsonb_build_object('label','At-risk WL portfolio (seed)','status','at_risk'))))
    on conflict (label) do update set notes = excluded.notes
    returning id into v_snapshot_id;
    v_status := v_status || jsonb_build_object('revops_period_snapshot', 'inserted');
  else
    v_status := v_status || jsonb_build_object('revops_period_snapshot', 'already_present');
  end if;

  -- eligible offer
  select (id is not null) into v_existed from public.offers where key = 'qa_seed_signup_eligible';
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
    label = excluded.label, surface = excluded.surface, audience = excluded.audience,
    plan_key = excluded.plan_key, is_baseline = excluded.is_baseline,
    active = excluded.active, eligibility = excluded.eligibility,
    metadata = excluded.metadata, updated_at = now()
  returning id into v_offer_eligible_id;
  v_status := v_status || jsonb_build_object('offer_eligible', case when coalesce(v_existed,false) then 'already_present' else 'inserted' end);

  -- ineligible offer
  select (id is not null) into v_existed from public.offers where key = 'qa_seed_signup_ineligible';
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
    label = excluded.label, surface = excluded.surface, audience = excluded.audience,
    plan_key = excluded.plan_key, is_baseline = excluded.is_baseline,
    active = excluded.active, eligibility = excluded.eligibility,
    metadata = excluded.metadata, updated_at = now()
  returning id into v_offer_ineligible_id;
  v_status := v_status || jsonb_build_object('offer_ineligible', case when coalesce(v_existed,false) then 'already_present' else 'inserted' end);

  return jsonb_build_object(
    'ok', true,
    'label', v_label,
    'status', v_status,
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