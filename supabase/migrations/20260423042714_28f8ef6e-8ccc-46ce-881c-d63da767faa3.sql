CREATE OR REPLACE FUNCTION public.run_go_live_self_test()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller        uuid := auth.uid();
  v_lead_id       uuid;
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
  v_suffix        text := gen_random_uuid()::text;
BEGIN
  IF v_caller IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.has_role(v_caller, 'admin'::app_role) THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  BEGIN
    -- Sandbox lead (acts as the client tenant for the campaign chain)
    INSERT INTO public.leads (name, email)
    VALUES ('__SELFTEST__ ' || v_suffix, 'selftest+' || v_suffix || '@example.invalid')
    RETURNING id INTO v_lead_id;

    -- Sandbox department
    INSERT INTO public.client_departments (
      tenant_kind, client_lead_id, department_name, department_type, lifecycle,
      owner_kind, routing_entry_type
    ) VALUES (
      'direct_24h', v_lead_id,
      '__SELFTEST__ ' || v_suffix,
      'general_inquiry'::department_type, 'live'::department_lifecycle,
      'client', 'campaign'
    )
    RETURNING id INTO v_dept_id;

    -- Sandbox campaign
    INSERT INTO public.campaigns (
      tenant_kind, client_lead_id, client_department_id, display_name, status
    ) VALUES (
      'direct_24h', v_lead_id, v_dept_id, '__SELFTEST__ campaign', 'draft'
    )
    RETURNING id INTO v_camp_id;

    v_steps := v_steps || jsonb_build_object(
      'name', 'Create sandbox campaign + department', 'passed', true,
      'detail', 'campaign_id=' || v_camp_id::text
    );
    v_passed := v_passed + 1;

    -- Fresh campaign starts not-ready
    SELECT * INTO v_checks FROM public.campaign_go_live_checks WHERE campaign_id = v_camp_id;
    IF v_checks.all_ok THEN
      v_steps := v_steps || jsonb_build_object('name','Fresh campaign starts not-ready','passed',false,'error','all_ok was true on a brand-new campaign');
      v_failed := v_failed + 1;
    ELSE
      v_steps := v_steps || jsonb_build_object('name','Fresh campaign starts not-ready','passed',true,'detail','all_ok=false as expected');
      v_passed := v_passed + 1;
    END IF;

    -- Activation blocked
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

    -- FAQ approved
    INSERT INTO public.campaign_faq_entries (
      tenant_kind, scope, client_lead_id, client_department_id,
      question, answer_md, status, published_at, published_by
    ) VALUES (
      'direct_24h', 'department', v_lead_id, v_dept_id,
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

    -- Policy approved (use a valid policy_kind)
    INSERT INTO public.campaign_policy_blocks (
      tenant_kind, scope, client_lead_id, client_department_id,
      policy_kind, title, body_md, status, published_at, published_by
    ) VALUES (
      'direct_24h', 'department', v_lead_id, v_dept_id,
      'general_policy', '__selftest policy__', 'selftest body', 'approved', now(), v_caller
    );
    SELECT * INTO v_checks FROM public.campaign_go_live_checks WHERE campaign_id = v_camp_id;
    IF v_checks.policies_ok THEN
      v_steps := v_steps || jsonb_build_object('name','Policy approval flips policies_ok','passed',true);
      v_passed := v_passed + 1;
    ELSE
      v_steps := v_steps || jsonb_build_object('name','Policy approval flips policies_ok','passed',false,'error','policies_ok still false after approval');
      v_failed := v_failed + 1;
    END IF;

    -- Training module + completion + signoff
    INSERT INTO public.campaign_training_modules (
      campaign_id, tenant_kind, title, body_md, required, sort_order, status, created_by
    ) VALUES (
      v_camp_id, 'direct_24h', '__selftest module__', 'body', true, 1, 'published', v_caller
    ) RETURNING id INTO v_module_id;

    INSERT INTO public.campaign_training_completions (
      module_id, campaign_id, agent_id, completed_at
    ) VALUES (v_module_id, v_camp_id, v_caller, now())
    RETURNING id INTO v_completion_id;

    INSERT INTO public.campaign_training_signoffs (
      completion_id, module_id, campaign_id, agent_id,
      signed_off_by, signed_off_at
    ) VALUES (
      v_completion_id, v_module_id, v_camp_id, v_caller, v_caller, now()
    );

    SELECT * INTO v_checks FROM public.campaign_go_live_checks WHERE campaign_id = v_camp_id;
    IF v_checks.training_ok THEN
      v_steps := v_steps || jsonb_build_object('name','Training signoff flips training_ok','passed',true);
      v_passed := v_passed + 1;
    ELSE
      v_steps := v_steps || jsonb_build_object('name','Training signoff flips training_ok','passed',false,'error','training_ok still false after sign-off');
      v_failed := v_failed + 1;
    END IF;

    -- Script publish
    INSERT INTO public.campaign_script_documents (
      campaign_id, tenant_kind, title, status, tree, created_by, updated_by
    ) VALUES (
      v_camp_id, 'direct_24h', '__selftest script__', 'draft',
      jsonb_build_object(
        'nodes', jsonb_build_array(jsonb_build_object('id','root','type','intro','data',jsonb_build_object('text','hi'))),
        'edges', '[]'::jsonb
      ),
      v_caller, v_caller
    ) RETURNING id INTO v_doc_id;

    PERFORM public.publish_script_document(v_doc_id, 'selftest');

    SELECT * INTO v_checks FROM public.campaign_go_live_checks WHERE campaign_id = v_camp_id;
    IF v_checks.script_published AND v_checks.all_ok THEN
      v_steps := v_steps || jsonb_build_object('name','Script publish flips script_published + all_ok','passed',true,'detail','all four checks now green');
      v_passed := v_passed + 1;
    ELSE
      v_steps := v_steps || jsonb_build_object('name','Script publish flips script_published + all_ok','passed',false,'error',format('script_published=%s, all_ok=%s', v_checks.script_published, v_checks.all_ok));
      v_failed := v_failed + 1;
    END IF;

    -- Activation now succeeds
    BEGIN
      UPDATE public.campaigns SET status = 'active' WHERE id = v_camp_id;
      v_steps := v_steps || jsonb_build_object('name','Status -> active succeeds when ready','passed',true);
      v_passed := v_passed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_steps := v_steps || jsonb_build_object('name','Status -> active succeeds when ready','passed',false,'error',SQLERRM);
      v_failed := v_failed + 1;
    END;

    -- Force atomic rollback
    RAISE EXCEPTION 'SELFTEST_ROLLBACK';

  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'SELFTEST_ROLLBACK' THEN
      v_steps := v_steps || jsonb_build_object('name','Sandbox cleanup','passed',false,'error',SQLERRM);
      v_failed := v_failed + 1;
    ELSE
      v_steps := v_steps || jsonb_build_object('name','Sandbox rolled back cleanly','passed',true,'detail','No test data persisted');
      v_passed := v_passed + 1;
    END IF;
  END;

  RETURN jsonb_build_object(
    'passed', v_passed,
    'failed', v_failed,
    'steps',  v_steps,
    'ran_at', now()
  );
END;
$$;