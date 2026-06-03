-- Phase 39 fix bundle (D-7): QA seed helper, admin-only, staging-guarded.

create table if not exists public.qa_environment_flags (
  id boolean primary key default true,
  qa_seed_enabled boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint qa_environment_flags_singleton check (id = true)
);

alter table public.qa_environment_flags enable row level security;

drop policy if exists "qa_env admin read" on public.qa_environment_flags;
create policy "qa_env admin read"
  on public.qa_environment_flags for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "qa_env admin write" on public.qa_environment_flags;
create policy "qa_env admin write"
  on public.qa_environment_flags for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

insert into public.qa_environment_flags (id, qa_seed_enabled)
values (true, false)
on conflict (id) do nothing;

-- Seed function. Tagged "QA-SEED 2026-05-10" everywhere for cleanup.
create or replace function public.seed_qa_state()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

  -- Pick any active partner (or first available) so deal scope rows are valid.
  select id into v_partner_id from public.white_label_partners
   where status = 'active' order by created_at limit 1;
  if v_partner_id is null then
    select id into v_partner_id from public.white_label_partners order by created_at limit 1;
  end if;

  -- 1) Open deal below approval threshold
  insert into public.renewal_expansion_deals
    (scope, target_id, deal_type, stage, status,
     proposed_term_months, estimated_discount_pct, is_non_standard_term, is_exception,
     approval_state, notes, created_by)
  values
    ('partner'::deal_scope, coalesce(v_partner_id, gen_random_uuid()),
     'expansion'::deal_type, 'proposal'::deal_stage, 'open'::deal_status,
     12, 5.0, false, false,
     'not_required'::approval_state, v_label || ' below-threshold', v_caller)
  returning id into v_below_id;

  -- 2) Open deal above approval threshold (exception flag triggers approval need)
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

  -- 3) Implemented deal
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

  -- 4) Forecast snapshot
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

  -- 5) RevOps period snapshot + supporting health rows
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

  return jsonb_build_object(
    'ok', true,
    'label', v_label,
    'deal_below_threshold_id', v_below_id,
    'deal_above_threshold_id', v_above_id,
    'deal_implemented_id', v_impl_id,
    'forecast_snapshot_id', v_forecast_id,
    'revops_period_snapshot_id', v_snapshot_id,
    'partner_used', v_partner_id
  );
end;
$$;

revoke all on function public.seed_qa_state() from public, anon, authenticated;
grant execute on function public.seed_qa_state() to authenticated;