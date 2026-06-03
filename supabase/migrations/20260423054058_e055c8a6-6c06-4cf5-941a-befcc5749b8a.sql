-- Fix permissive policy on retraining_events
DROP POLICY IF EXISTS "System inserts retraining events" ON public.campaign_training_retraining_events;
CREATE POLICY "Admins and supervisors insert retraining events"
  ON public.campaign_training_retraining_events FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor') OR auth.uid() IS NULL);

-- ============================================================
-- Templates
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campaign_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  client_lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  wl_client_id uuid REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  source_campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_campaign_templates_tenant ON public.campaign_templates(tenant_kind, wl_partner_id, client_lead_id, wl_client_id);
ALTER TABLE public.campaign_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage templates"
  ON public.campaign_templates FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors read templates"
  ON public.campaign_templates FOR SELECT
  USING (public.has_role(auth.uid(), 'supervisor'));

CREATE TRIGGER trg_campaign_templates_updated_at
  BEFORE UPDATE ON public.campaign_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.save_campaign_as_template(
  p_campaign_id uuid,
  p_name text,
  p_description text DEFAULT NULL
)
RETURNS public.campaign_templates
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_camp public.campaigns%ROWTYPE;
  v_snapshot jsonb;
  v_template public.campaign_templates%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_camp FROM public.campaigns WHERE id = p_campaign_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign not found'; END IF;

  v_snapshot := jsonb_build_object(
    'campaign', jsonb_build_object('display_name', v_camp.display_name, 'tenant_kind', v_camp.tenant_kind),
    'scenarios', COALESCE((SELECT jsonb_agg(to_jsonb(s) - 'id' - 'campaign_id' - 'created_at' - 'updated_at')
                            FROM public.campaign_scenarios s WHERE s.campaign_id = p_campaign_id), '[]'::jsonb),
    'script_tree', (SELECT d.tree FROM public.campaign_script_documents d WHERE d.campaign_id = p_campaign_id ORDER BY d.created_at DESC LIMIT 1),
    'training_modules', COALESCE((SELECT jsonb_agg(jsonb_build_object(
        'title', m.title, 'summary', m.summary, 'body_md', m.body_md,
        'required', m.required, 'sort_order', m.sort_order, 'status', m.status,
        'retraining_interval_days', m.retraining_interval_days,
        'lessons', COALESCE((SELECT jsonb_agg(jsonb_build_object(
            'kind', l.kind, 'title', l.title, 'body_md', l.body_md,
            'sort_order', l.sort_order, 'passing_score', l.passing_score, 'required', l.required,
            'questions', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                'question', q.question, 'choices', q.choices,
                'correct_index', q.correct_index, 'explanation', q.explanation, 'sort_order', q.sort_order
              )) FROM public.campaign_training_quiz_questions q WHERE q.lesson_id = l.id), '[]'::jsonb)
          )) FROM public.campaign_training_lessons l WHERE l.module_id = m.id), '[]'::jsonb)
      )) FROM public.campaign_training_modules m WHERE m.campaign_id = p_campaign_id), '[]'::jsonb)
  );

  INSERT INTO public.campaign_templates
    (tenant_kind, wl_partner_id, client_lead_id, wl_client_id, source_campaign_id, name, description, snapshot, created_by)
  VALUES
    (v_camp.tenant_kind, v_camp.wl_partner_id, v_camp.client_lead_id, v_camp.wl_client_id,
     p_campaign_id, p_name, p_description, v_snapshot, auth.uid())
  RETURNING * INTO v_template;

  RETURN v_template;
END;
$$;

REVOKE ALL ON FUNCTION public.save_campaign_as_template(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_campaign_as_template(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.clone_template_into_department(
  p_template_id uuid,
  p_target_department_id uuid,
  p_new_campaign_name text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_template public.campaign_templates%ROWTYPE;
  v_dept public.client_departments%ROWTYPE;
  v_camp_id uuid;
  v_module_id uuid;
  v_lesson_id uuid;
  m jsonb;
  l jsonb;
  q jsonb;
  s jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admin only'; END IF;
  SELECT * INTO v_template FROM public.campaign_templates WHERE id = p_template_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Template not found'; END IF;

  SELECT * INTO v_dept FROM public.client_departments WHERE id = p_target_department_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Department not found'; END IF;

  -- Same-tenant guard
  IF v_dept.tenant_kind <> v_template.tenant_kind THEN
    RAISE EXCEPTION 'Cross-tenant cloning is not permitted in this phase';
  END IF;

  INSERT INTO public.campaigns (tenant_kind, wl_partner_id, client_lead_id, wl_client_id, client_department_id, display_name, status)
  VALUES (v_dept.tenant_kind, v_dept.wl_partner_id, v_dept.client_lead_id, v_dept.wl_client_id, v_dept.id, p_new_campaign_name, 'draft')
  RETURNING id INTO v_camp_id;

  -- Scenarios
  FOR s IN SELECT * FROM jsonb_array_elements(COALESCE(v_template.snapshot->'scenarios', '[]'::jsonb)) LOOP
    INSERT INTO public.campaign_scenarios (campaign_id, tenant_kind, wl_partner_id, client_lead_id, wl_client_id,
      title, trigger_md, expected_outcome_md, disposition, routing, tags, sort_order, status)
    VALUES (v_camp_id, v_dept.tenant_kind, v_dept.wl_partner_id, v_dept.client_lead_id, v_dept.wl_client_id,
      s->>'title', s->>'trigger_md', s->>'expected_outcome_md', s->>'disposition', s->>'routing',
      ARRAY(SELECT jsonb_array_elements_text(COALESCE(s->'tags','[]'::jsonb))),
      COALESCE((s->>'sort_order')::int, 100), 'draft');
  END LOOP;

  -- Training modules + lessons + questions
  FOR m IN SELECT * FROM jsonb_array_elements(COALESCE(v_template.snapshot->'training_modules', '[]'::jsonb)) LOOP
    INSERT INTO public.campaign_training_modules (campaign_id, tenant_kind, wl_partner_id, client_lead_id, wl_client_id,
      title, summary, body_md, required, sort_order, status, retraining_interval_days, created_by)
    VALUES (v_camp_id, v_dept.tenant_kind, v_dept.wl_partner_id, v_dept.client_lead_id, v_dept.wl_client_id,
      m->>'title', m->>'summary', COALESCE(m->>'body_md',''),
      COALESCE((m->>'required')::boolean, true), COALESCE((m->>'sort_order')::int, 100),
      'draft', NULLIF(m->>'retraining_interval_days','')::int, auth.uid())
    RETURNING id INTO v_module_id;
    FOR l IN SELECT * FROM jsonb_array_elements(COALESCE(m->'lessons','[]'::jsonb)) LOOP
      INSERT INTO public.campaign_training_lessons (module_id, kind, title, body_md, sort_order, passing_score, required, created_by)
      VALUES (v_module_id, l->>'kind', l->>'title', COALESCE(l->>'body_md',''),
        COALESCE((l->>'sort_order')::int, 0), COALESCE((l->>'passing_score')::int, 80),
        COALESCE((l->>'required')::boolean, true), auth.uid())
      RETURNING id INTO v_lesson_id;
      FOR q IN SELECT * FROM jsonb_array_elements(COALESCE(l->'questions','[]'::jsonb)) LOOP
        INSERT INTO public.campaign_training_quiz_questions (lesson_id, question, choices, correct_index, explanation, sort_order)
        VALUES (v_lesson_id, q->>'question', COALESCE(q->'choices','[]'::jsonb),
          COALESCE((q->>'correct_index')::int, 0), q->>'explanation', COALESCE((q->>'sort_order')::int, 0));
      END LOOP;
    END LOOP;
  END LOOP;

  -- Script document (draft, with cloned tree)
  IF v_template.snapshot ? 'script_tree' AND v_template.snapshot->'script_tree' IS NOT NULL THEN
    INSERT INTO public.campaign_script_documents (campaign_id, tenant_kind, title, status, tree, created_by, updated_by)
    VALUES (v_camp_id, v_dept.tenant_kind, p_new_campaign_name || ' — Script', 'draft',
      v_template.snapshot->'script_tree', auth.uid(), auth.uid());
  END IF;

  RETURN v_camp_id;
END;
$$;

REVOKE ALL ON FUNCTION public.clone_template_into_department(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clone_template_into_department(uuid, uuid, text) TO authenticated;

-- ============================================================
-- AI draft log (rate limiter)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.ai_draft_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  prompt text NOT NULL,
  response jsonb,
  model text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  status text NOT NULL DEFAULT 'ok' CHECK (status IN ('ok','error','rate_limited')),
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_draft_log_user_time ON public.ai_draft_log(user_id, created_at DESC);
ALTER TABLE public.ai_draft_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read their own draft log"
  ON public.ai_draft_log FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Admins read all draft logs"
  ON public.ai_draft_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Extended self-test (11 steps)
-- ============================================================
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
  v_signoff_id    uuid;
  v_lesson_id     uuid;
  v_checks        record;
  v_steps         jsonb := '[]'::jsonb;
  v_passed        int := 0;
  v_failed        int := 0;
  v_block_ok      boolean;
  v_suffix        text := gen_random_uuid()::text;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT public.has_role(v_caller, 'admin'::app_role) THEN RAISE EXCEPTION 'Admin only'; END IF;

  BEGIN
    INSERT INTO public.leads (name, email)
    VALUES ('__SELFTEST__ ' || v_suffix, 'selftest+' || v_suffix || '@example.invalid')
    RETURNING id INTO v_lead_id;

    INSERT INTO public.client_departments (
      tenant_kind, client_lead_id, department_name, department_type, lifecycle,
      owner_kind, routing_entry_type
    ) VALUES (
      'direct_24h', v_lead_id, '__SELFTEST__ ' || v_suffix,
      'general_inquiry'::department_type, 'live'::department_lifecycle,
      'client', 'direct'
    ) RETURNING id INTO v_dept_id;

    INSERT INTO public.campaigns (
      tenant_kind, client_lead_id, client_department_id, display_name, status
    ) VALUES (
      'direct_24h', v_lead_id, v_dept_id, '__SELFTEST__ campaign', 'draft'
    ) RETURNING id INTO v_camp_id;

    v_steps := v_steps || jsonb_build_object('name','Create sandbox campaign + department','passed',true,'detail','campaign_id=' || v_camp_id::text);
    v_passed := v_passed + 1;

    SELECT * INTO v_checks FROM public.campaign_go_live_checks WHERE campaign_id = v_camp_id;
    IF v_checks.all_ok THEN
      v_steps := v_steps || jsonb_build_object('name','Fresh campaign starts not-ready','passed',false,'error','all_ok was true on a brand-new campaign');
      v_failed := v_failed + 1;
    ELSE
      v_steps := v_steps || jsonb_build_object('name','Fresh campaign starts not-ready','passed',true,'detail','all_ok=false as expected');
      v_passed := v_passed + 1;
    END IF;

    v_block_ok := false;
    BEGIN
      UPDATE public.campaigns SET status = 'active' WHERE id = v_camp_id;
    EXCEPTION WHEN OTHERS THEN v_block_ok := true; END;
    IF v_block_ok THEN
      v_steps := v_steps || jsonb_build_object('name','Activation blocked when checks fail','passed',true);
      v_passed := v_passed + 1;
    ELSE
      v_steps := v_steps || jsonb_build_object('name','Activation blocked when checks fail','passed',false,'error','campaign was set to active despite failing checks');
      v_failed := v_failed + 1;
    END IF;

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
      v_steps := v_steps || jsonb_build_object('name','FAQ approval flips faqs_ok','passed',false);
      v_failed := v_failed + 1;
    END IF;

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
      v_steps := v_steps || jsonb_build_object('name','Policy approval flips policies_ok','passed',false);
      v_failed := v_failed + 1;
    END IF;

    INSERT INTO public.campaign_training_modules (
      campaign_id, tenant_kind, title, body_md, required, sort_order, status, created_by
    ) VALUES (v_camp_id, 'direct_24h', '__selftest module__', 'body', true, 1, 'published', v_caller)
    RETURNING id INTO v_module_id;

    INSERT INTO public.campaign_training_completions (module_id, campaign_id, agent_id, completed_at)
    VALUES (v_module_id, v_camp_id, v_caller, now()) RETURNING id INTO v_completion_id;

    INSERT INTO public.campaign_training_signoffs (
      completion_id, module_id, campaign_id, agent_id, signed_off_by, signed_off_at
    ) VALUES (v_completion_id, v_module_id, v_camp_id, v_caller, v_caller, now())
    RETURNING id INTO v_signoff_id;

    SELECT * INTO v_checks FROM public.campaign_go_live_checks WHERE campaign_id = v_camp_id;
    IF v_checks.training_ok THEN
      v_steps := v_steps || jsonb_build_object('name','Training signoff flips training_ok','passed',true);
      v_passed := v_passed + 1;
    ELSE
      v_steps := v_steps || jsonb_build_object('name','Training signoff flips training_ok','passed',false);
      v_failed := v_failed + 1;
    END IF;

    INSERT INTO public.campaign_script_documents (
      campaign_id, tenant_kind, title, status, tree, created_by, updated_by
    ) VALUES (
      v_camp_id, 'direct_24h', '__selftest script__', 'draft',
      jsonb_build_object('nodes', jsonb_build_array(jsonb_build_object('id','root','type','intro','data',jsonb_build_object('text','hi'))), 'edges', '[]'::jsonb),
      v_caller, v_caller
    ) RETURNING id INTO v_doc_id;

    PERFORM public.publish_script_document(v_doc_id, 'selftest');

    -- After republish, signoff should be flipped to needs_refresh => training_ok = false
    SELECT * INTO v_checks FROM public.campaign_go_live_checks WHERE campaign_id = v_camp_id;
    IF v_checks.script_published AND NOT v_checks.training_ok THEN
      v_steps := v_steps || jsonb_build_object('name','Republish flips signoffs to needs_refresh','passed',true);
      v_passed := v_passed + 1;
    ELSE
      v_steps := v_steps || jsonb_build_object('name','Republish flips signoffs to needs_refresh','passed',false,
        'error', format('script_published=%s, training_ok=%s', v_checks.script_published, v_checks.training_ok));
      v_failed := v_failed + 1;
    END IF;

    -- Clear the refresh flag so we can continue
    UPDATE public.campaign_training_signoffs SET needs_refresh = false WHERE id = v_signoff_id;

    -- Step: Expired signoff blocks activation
    UPDATE public.campaign_training_signoffs SET expires_at = now() - interval '1 day' WHERE id = v_signoff_id;
    SELECT * INTO v_checks FROM public.campaign_go_live_checks WHERE campaign_id = v_camp_id;
    IF NOT v_checks.training_ok THEN
      v_steps := v_steps || jsonb_build_object('name','Expired signoff blocks activation','passed',true);
      v_passed := v_passed + 1;
    ELSE
      v_steps := v_steps || jsonb_build_object('name','Expired signoff blocks activation','passed',false,'error','training_ok stayed true with an expired signoff');
      v_failed := v_failed + 1;
    END IF;
    -- Restore
    UPDATE public.campaign_training_signoffs SET expires_at = NULL WHERE id = v_signoff_id;

    -- Step: Required quiz lesson + no passing attempt -> would block at the quiz layer (verified via view)
    INSERT INTO public.campaign_training_lessons (module_id, kind, title, body_md, sort_order, passing_score, required, created_by)
    VALUES (v_module_id, 'quiz', '__selftest quiz__', '', 1, 80, true, v_caller)
    RETURNING id INTO v_lesson_id;

    DECLARE
      v_quiz_passed boolean;
    BEGIN
      SELECT COALESCE(bool_or(passed), false) INTO v_quiz_passed
        FROM public.campaign_training_module_quiz_status
       WHERE module_id = v_module_id AND lesson_id = v_lesson_id AND agent_id = v_caller;
      IF NOT v_quiz_passed THEN
        v_steps := v_steps || jsonb_build_object('name','Quiz lesson blocks signoff until passed','passed',true,
          'detail','quiz_status view reports no passing attempt');
        v_passed := v_passed + 1;
      ELSE
        v_steps := v_steps || jsonb_build_object('name','Quiz lesson blocks signoff until passed','passed',false,
          'error','quiz showed passed=true with no attempts');
        v_failed := v_failed + 1;
      END IF;
    END;

    SELECT * INTO v_checks FROM public.campaign_go_live_checks WHERE campaign_id = v_camp_id;
    IF v_checks.script_published AND v_checks.all_ok THEN
      v_steps := v_steps || jsonb_build_object('name','Script publish + clean signoff -> all_ok','passed',true);
      v_passed := v_passed + 1;
    ELSE
      v_steps := v_steps || jsonb_build_object('name','Script publish + clean signoff -> all_ok','passed',false,
        'error', format('script_published=%s, all_ok=%s', v_checks.script_published, v_checks.all_ok));
      v_failed := v_failed + 1;
    END IF;

    BEGIN
      UPDATE public.campaigns SET status = 'active' WHERE id = v_camp_id;
      v_steps := v_steps || jsonb_build_object('name','Status -> active succeeds when ready','passed',true);
      v_passed := v_passed + 1;
    EXCEPTION WHEN OTHERS THEN
      v_steps := v_steps || jsonb_build_object('name','Status -> active succeeds when ready','passed',false,'error',SQLERRM);
      v_failed := v_failed + 1;
    END;

    RAISE EXCEPTION 'SELFTEST_ROLLBACK';

  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> 'SELFTEST_ROLLBACK' THEN
      v_steps := v_steps || jsonb_build_object('name','Sandbox cleanup','passed',false,'error',SQLERRM);
      v_failed := v_failed + 1;
    ELSE
      v_steps := v_steps || jsonb_build_object('name','Sandbox rolled back cleanly','passed',true);
      v_passed := v_passed + 1;
    END IF;
  END;

  RETURN jsonb_build_object('passed', v_passed, 'failed', v_failed, 'steps', v_steps, 'ran_at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.run_go_live_self_test() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_go_live_self_test() TO authenticated;