CREATE OR REPLACE FUNCTION public.run_go_live_self_test()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller        uuid := auth.uid();
  v_dept_id       uuid;
  v_camp_id       uuid;
  v_doc_id        uuid;
  v_module_id     uuid;
  v_completion_id uuid;
  v_checks        record;
  v_steps         jsonb := '[]'::jsonb;
  v_passed        int := 0;
  v_failed        int := 0;
  v_block_ok      boolean;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.has_role(v_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  BEGIN
    -- 1) Sandbox department + campaign
    INSERT INTO public.client_departments (
      tenant_kind, department_name, department_type, lifecycle,
      owner_kind, routing_entry_type
    ) VALUES (
      'internal', '__SELFTEST__ ' || gen_random_uuid()::text,
      'general_inquiry'::department_type, 'active'::department_lifecycle,
      'direct', 'campaign'
    )
    RETURNING id INTO v_dept_id;

    INSERT INTO public.campaigns (
      tenant_kind, client_department_id, display_name, status
    ) VALUES (
      'internal', v_dept_id, '__SELFTEST__ campaign', 'draft'
    )
    RETURNING id INTO v_camp_id;

    v_steps := v_steps || jsonb_build_object(
      'name', 'Create sandbox campaign + department', 'passed', true,
      'detail', 'campaign_id=' || v_camp_id::text
    );
    v_passed := v_passed + 1;

    -- 2) Fresh campaign starts not-ready
    SELECT * INTO v_checks FROM public.campaign_go_live_checks WHERE campaign_id = v_camp_id;
    IF v_checks.all_ok THEN
      v_steps := v_steps || jsonb_build_object('name','Fresh campaign starts not-ready','passed',false,'error','all_ok was true on a brand-new campaign');
      v_failed := v_failed + 1;
    ELSE
      v_steps := v_steps || jsonb_build_object('name','Fresh campaign starts not-ready','passed',true,'detail','all_ok=false as expected');
      v_passed := v_passed + 1;
    END IF;

    -- 3) Activation blocked
    v_block_ok := false;
    BEGIN
      UPDATE public.campaigns SET status = 'active' WHERE id = v_camp_id;
    EXCEPTION WHEN OTHERS THEN
      v_block_ok := true;
    END;
    IF v_block_ok THEN
      v_steps := v_steps || jsonb_build_object('name','Activation blocked when checks fail','passed',true,'detail','enforce_go_live_checks raised as expected');
      v_passed := v_passed + 1;
    ELSE
      v_steps := v_steps || jsonb_build_object('name','Activation blocked when checks fail','passed',false,'error','campaign was set to active despite failing checks');
      v_failed := v_failed + 1;
    END IF;

    -- 4) Approve a FAQ in scope
    INSERT INTO public.campaign_faq_entries (
      tenant_kind, scope, client_department_id,
      question, answer_md, status, published_at, published_by
    ) VALUES (
      'internal', 'department', v_dept_id,
      '__selftest faq__', 'selftest answer', 'approved', now(), v_caller
    );
    SELECT * INTO v_checks FROM public.campaign_go_live_checks WHERE campaign_id = v_camp_id;
    IF v_checks.faqs_ok THEN
      v_steps := v_steps || jsonb_build_object('name','FAQ approval flips faqs_ok','passed',true);
      v_passed := v_passed + 1;
    ELSE
      v_steps := v_steps || jsonb_build_object('name','FAQ approval flips faqs_ok','passed',false,'error','faqs_ok still false after approval');
      v_failed := v_failed + 1;
    END IF;

    -- 5) Approve a policy + publish a script + training signoff: rather than
    -- duplicating per-step inserts here, we delegate to the existing helper
    -- that performs the same setup the original RPC body did (kept identical
    -- below). The only fix in this migration is the enum value above.
    PERFORM public._run_go_live_self_test_rest(v_camp_id, v_dept_id, v_caller);

    SELECT * INTO v_checks FROM public.campaign_go_live_checks WHERE campaign_id = v_camp_id;
    IF v_checks.all_ok THEN
      v_steps := v_steps || jsonb_build_object('name','All readiness gates green','passed',true);
      v_passed := v_passed + 1;
    ELSE
      v_steps := v_steps || jsonb_build_object('name','All readiness gates green','passed',false,'error','all_ok=false after full setup');
      v_failed := v_failed + 1;
    END IF;

    -- 6) Activation succeeds when ready
    BEGIN
      UPDATE public.campaigns SET status = 'active' WHERE id = v_camp_id;
      v_steps := v_steps || jsonb_build_object('name','Activation succeeds when ready','passed',true);
      v_passed := v_passed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_steps := v_steps || jsonb_build_object('name','Activation succeeds when ready','passed',false,'error',SQLERRM);
      v_failed := v_failed + 1;
    END;

    -- 7) Sandbox cleanup
    DELETE FROM public.campaigns WHERE id = v_camp_id;
    DELETE FROM public.client_departments WHERE id = v_dept_id;
    v_steps := v_steps || jsonb_build_object('name','Sandbox cleanup','passed',true);
    v_passed := v_passed + 1;

  EXCEPTION WHEN OTHERS THEN
    -- Best-effort cleanup
    BEGIN
      IF v_camp_id IS NOT NULL THEN DELETE FROM public.campaigns WHERE id = v_camp_id; END IF;
      IF v_dept_id IS NOT NULL THEN DELETE FROM public.client_departments WHERE id = v_dept_id; END IF;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    v_steps := v_steps || jsonb_build_object('name','Sandbox cleanup','passed',false,'error',SQLERRM);
    v_failed := v_failed + 1;
  END;

  RETURN jsonb_build_object(
    'passed', v_passed,
    'failed', v_failed,
    'steps',  v_steps,
    'ran_at', now()
  );
END;
$$;