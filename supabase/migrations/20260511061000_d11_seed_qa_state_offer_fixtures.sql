-- TS-06 fixture gap fix: extend seed_qa_state() to seed two offers so the
-- offer-eligibility code path has data to evaluate on staging.
--
-- The v5 retest could not exercise TS-06 (offer eligibility guardrails) or the
-- offers branch of RP-4 because the `offers` table was empty after seeding.
-- Without at least one eligible and one ineligible offer, the guardrail and
-- exposure logic is untestable.
--
-- This migration rewrites `public.seed_qa_state()` with the same body that
-- shipped in the merged D-10 fix (20260511050740), and APPENDS an offer
-- fixture block before the RETURN. The new block:
--   - inserts one offer that should be ELIGIBLE for a direct-audience signup
--     surface (audience='all', active=true, eligibility='{}')
--   - inserts one offer that should be INELIGIBLE on the same surface because
--     of audience mismatch + an impossible eligibility predicate
--   - is idempotent via ON CONFLICT (key) DO UPDATE
--   - is namespaced under key prefix `qa_seed_` and tagged
--     metadata.qa_seed = v_label for cleanup
--   - never touches non-qa_seed offers
--
-- Note: `offers.plan_key` is free text in this schema (no plans table FK), so
-- the fixture uses a self-describing key (`qa_seed_plan_starter`) rather than
-- assuming a particular product catalogue.

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

  -- TS-06 fixture: eligible signup offer (audience='all', active, empty
  -- eligibility predicate). Idempotent on key.
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

  -- TS-06 fixture: ineligible signup offer. Two independent reasons to fail:
  -- (a) audience='wl_end_client' (direct caller mismatches), (b) eligibility
  -- requires implausible 36500-day tenure. Active so it is not filtered by
  -- the trivial active=true check.
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
