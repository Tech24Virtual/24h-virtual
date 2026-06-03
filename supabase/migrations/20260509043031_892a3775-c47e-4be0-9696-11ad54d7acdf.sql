
-- Phase 32 — Success Communications & Renewal Automation

-- ── Communication templates ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.communication_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('partner','direct')),
  channel text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','email')),
  play_type text NOT NULL CHECK (play_type IN ('educate','upsell','save','onboard','reactivate','renewal')),
  template_key text NOT NULL UNIQUE,
  sequence_key text,
  step_number integer NOT NULL DEFAULT 1,
  subject text NOT NULL,
  body text NOT NULL,
  allowed_tokens text[] NOT NULL DEFAULT ARRAY[]::text[],
  requires_approval boolean NOT NULL DEFAULT true,
  auto_send boolean NOT NULL DEFAULT false,
  suppression_hours integer NOT NULL DEFAULT 72,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on communication_templates"
  ON public.communication_templates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_communication_templates_updated
  BEFORE UPDATE ON public.communication_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Communication actions ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.communication_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('partner','direct')),
  target_id uuid NOT NULL,
  template_id uuid NOT NULL REFERENCES public.communication_templates(id) ON DELETE CASCADE,
  play_id uuid,
  channel text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app','email')),
  status text NOT NULL DEFAULT 'suggested'
    CHECK (status IN ('suggested','approved','queued','sent','dismissed','failed','suppressed')),
  suppression_reason text,
  rendered_subject text,
  rendered_body text,
  sent_at timestamptz,
  approved_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.communication_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on communication_actions"
  ON public.communication_actions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_communication_actions_updated
  BEFORE UPDATE ON public.communication_actions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_comm_actions_scope_target ON public.communication_actions(scope, target_id);
CREATE INDEX IF NOT EXISTS idx_comm_actions_status ON public.communication_actions(status);
CREATE UNIQUE INDEX IF NOT EXISTS uq_comm_actions_pending
  ON public.communication_actions(scope, target_id, template_id)
  WHERE status IN ('suggested','approved','queued');

-- ── Renewal workflows ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.renewal_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('partner','direct')),
  target_id uuid NOT NULL,
  subscription_id text,
  renewal_date date NOT NULL,
  stage text NOT NULL DEFAULT 'approaching'
    CHECK (stage IN ('approaching','outreach_started','awaiting_response','in_progress','renewed','downgraded','churned','lapsed')),
  outcome_notes text,
  last_touch_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, target_id, renewal_date)
);

ALTER TABLE public.renewal_workflows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin full access on renewal_workflows"
  ON public.renewal_workflows FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_renewal_workflows_updated
  BEFORE UPDATE ON public.renewal_workflows
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── Views ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.v_communication_actions_open
WITH (security_invoker = true) AS
SELECT
  a.id, a.scope, a.target_id, a.template_id, a.play_id, a.channel,
  a.status, a.suppression_reason, a.rendered_subject, a.created_at, a.updated_at,
  t.template_key, t.sequence_key, t.step_number, t.play_type,
  t.subject AS template_subject, t.requires_approval, t.auto_send
FROM public.communication_actions a
JOIN public.communication_templates t ON t.id = a.template_id
WHERE a.status IN ('suggested','approved','queued','suppressed','failed');

CREATE OR REPLACE VIEW public.v_renewal_workflows_pipeline
WITH (security_invoker = true) AS
SELECT
  r.*,
  (r.renewal_date - CURRENT_DATE) AS days_to_renewal
FROM public.renewal_workflows r;

-- BI mirrors
CREATE OR REPLACE VIEW public.v_bi_communication_templates
WITH (security_invoker = true) AS SELECT * FROM public.communication_templates;

CREATE OR REPLACE VIEW public.v_bi_communication_actions
WITH (security_invoker = true) AS SELECT * FROM public.communication_actions;

CREATE OR REPLACE VIEW public.v_bi_renewal_workflows
WITH (security_invoker = true) AS SELECT * FROM public.renewal_workflows;

-- ── RPCs ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_communication_actions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted integer := 0;
  v_suppressed integer := 0;
  v_auto_sent integer := 0;
  r record;
  v_recent_count integer;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  -- Walk eligible plays (partner + direct) and propose actions per matching template
  FOR r IN
    SELECT 'partner'::text AS scope, p.id AS play_id, p.partner_id AS target_id, p.play_type, p.template_id
    FROM public.partner_success_plays p
    WHERE p.status IN ('not_started','active')
    UNION ALL
    SELECT 'direct'::text, d.id, d.lead_id, d.play_type, d.template_id
    FROM public.direct_success_plays d
    WHERE d.status IN ('not_started','active')
  LOOP
    FOR v_recent_count IN
      SELECT 1
      FROM public.communication_templates t
      WHERE t.active
        AND t.scope = r.scope
        AND t.play_type = r.play_type
    LOOP
      -- continue per template
    END LOOP;

    INSERT INTO public.communication_actions(scope, target_id, template_id, play_id, channel, status, suppression_reason)
    SELECT r.scope, r.target_id, t.id, r.play_id, t.channel,
           CASE
             WHEN EXISTS (
               SELECT 1 FROM public.communication_actions a2
               WHERE a2.scope = r.scope
                 AND a2.target_id = r.target_id
                 AND a2.template_id = t.id
                 AND a2.status = 'sent'
                 AND a2.sent_at > now() - make_interval(hours => t.suppression_hours)
             ) THEN 'suppressed'
             WHEN t.auto_send AND NOT t.requires_approval THEN 'queued'
             ELSE 'suggested'
           END,
           CASE
             WHEN EXISTS (
               SELECT 1 FROM public.communication_actions a3
               WHERE a3.scope = r.scope
                 AND a3.target_id = r.target_id
                 AND a3.template_id = t.id
                 AND a3.status = 'sent'
                 AND a3.sent_at > now() - make_interval(hours => t.suppression_hours)
             ) THEN 'recent_send_within_suppression_window'
             ELSE NULL
           END
    FROM public.communication_templates t
    WHERE t.active
      AND t.scope = r.scope
      AND t.play_type = r.play_type
      AND NOT EXISTS (
        SELECT 1 FROM public.communication_actions a
        WHERE a.scope = r.scope
          AND a.target_id = r.target_id
          AND a.template_id = t.id
          AND a.status IN ('suggested','approved','queued')
      );

    GET DIAGNOSTICS v_recent_count = ROW_COUNT;
    v_inserted := v_inserted + v_recent_count;
  END LOOP;

  -- Renewal sequencing: ensure renewal_workflows row exists for direct accounts with subscriptions
  INSERT INTO public.renewal_workflows(scope, target_id, subscription_id, renewal_date, stage)
  SELECT 'direct', s.lead_id, s.subscription_id, s.current_period_end::date, 'approaching'
  FROM public.v_subscription_snapshot s
  WHERE s.lead_id IS NOT NULL
    AND s.current_period_end IS NOT NULL
    AND s.current_period_end::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '120 days'
    AND s.status IN ('active','trialing','past_due')
  ON CONFLICT (scope, target_id, renewal_date) DO NOTHING;

  RETURN jsonb_build_object(
    'inserted', v_inserted,
    'suppressed', v_suppressed,
    'auto_sent', v_auto_sent
  );
END;
$$;

REVOKE ALL ON FUNCTION public.generate_communication_actions() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.generate_communication_actions() TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_communication_action(p_action_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.communication_actions
    SET status = 'approved', approved_by = auth.uid()
    WHERE id = p_action_id AND status = 'suggested';
  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.dismiss_communication_action(p_action_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.communication_actions SET status = 'dismissed' WHERE id = p_action_id;
  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.mark_communication_sent(p_action_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.communication_actions
    SET status = 'sent', sent_at = now()
    WHERE id = p_action_id AND status IN ('approved','queued');
  RETURN FOUND;
END; $$;

CREATE OR REPLACE FUNCTION public.upsert_renewal_workflow(
  p_scope text, p_target_id uuid, p_renewal_date date,
  p_stage text, p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  INSERT INTO public.renewal_workflows(scope, target_id, renewal_date, stage, outcome_notes, last_touch_at)
    VALUES (p_scope, p_target_id, p_renewal_date, p_stage, p_notes, now())
  ON CONFLICT (scope, target_id, renewal_date) DO UPDATE
    SET stage = EXCLUDED.stage,
        outcome_notes = COALESCE(EXCLUDED.outcome_notes, public.renewal_workflows.outcome_notes),
        last_touch_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

REVOKE ALL ON FUNCTION public.approve_communication_action(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.dismiss_communication_action(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.mark_communication_sent(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.upsert_renewal_workflow(text,uuid,date,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.approve_communication_action(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.dismiss_communication_action(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_communication_sent(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_renewal_workflow(text,uuid,date,text,text) TO authenticated;

-- ── Seeds ────────────────────────────────────────────────────────────
INSERT INTO public.communication_templates(scope, channel, play_type, template_key, sequence_key, step_number, subject, body, allowed_tokens, requires_approval, auto_send, suppression_hours)
VALUES
  ('partner','in_app','save','partner_save_intervention','partner_save',1,'Quick check-in on your portfolio','Hi {{partner_name}} — we noticed a few accounts may need attention this week. Want to jump on a quick sync?', ARRAY['partner_name'], true, false, 168),
  ('partner','in_app','upsell','partner_expansion_nudge','partner_expansion',1,'Expansion opportunity in your portfolio','Hi {{partner_name}} — based on recent activity, a few of your accounts look ready for an expansion conversation.', ARRAY['partner_name'], true, false, 336),
  ('direct','in_app','onboard','direct_new_account_onboarding','direct_onboard',1,'Welcome — let''s finish your setup','Hi {{client_name}}, your account is live. Finish receptionist setup to start handling calls.', ARRAY['client_name'], false, true, 72),
  ('direct','in_app','save','direct_risk_save','direct_save',1,'Let''s make sure things are working','Hi {{client_name}}, we noticed some friction on your account. Want a quick optimization call?', ARRAY['client_name'], true, false, 168),
  ('direct','in_app','upsell','direct_expansion_nudge','direct_expansion',1,'You may be ready for more capacity','Hi {{client_name}}, your usage suggests an upgrade could fit your volume.', ARRAY['client_name'], true, false, 336),
  ('direct','in_app','renewal','direct_renewal_90','direct_renewal',1,'Your renewal is approaching','Hi {{client_name}}, your renewal is in about 90 days. Anything we should plan for?', ARRAY['client_name','renewal_date'], true, false, 720),
  ('direct','in_app','renewal','direct_renewal_60','direct_renewal',2,'Renewal touchpoint','Hi {{client_name}}, your renewal is in about 60 days. Let''s confirm your plan.', ARRAY['client_name','renewal_date'], true, false, 720),
  ('direct','in_app','renewal','direct_renewal_30','direct_renewal',3,'Renewal coming up','Hi {{client_name}}, your renewal is in about 30 days. Confirm or adjust your plan now.', ARRAY['client_name','renewal_date'], true, false, 720)
ON CONFLICT (template_key) DO NOTHING;
