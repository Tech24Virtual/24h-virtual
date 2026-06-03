
-- ============================================================
-- Phase 31 — Success Playbook Automation
-- ============================================================

-- ---- Playbook templates --------------------------------------
CREATE TABLE public.playbook_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('partner','direct')),
  play_type text NOT NULL CHECK (play_type IN ('educate','upsell','save','onboard','reactivate')),
  template_key text NOT NULL,
  title text NOT NULL,
  description text,
  trigger_type text NOT NULL DEFAULT 'opportunity'
    CHECK (trigger_type IN ('opportunity','state_change','metric_threshold','time_since_event','manual')),
  trigger_definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  default_followup_days integer NOT NULL DEFAULT 7,
  auto_create boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scope, template_key)
);

ALTER TABLE public.playbook_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read playbook_templates"
  ON public.playbook_templates FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write playbook_templates"
  ON public.playbook_templates FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_playbook_templates_updated
  BEFORE UPDATE ON public.playbook_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---- Play suggestions queue ----------------------------------
CREATE TABLE public.play_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL CHECK (scope IN ('partner','direct')),
  target_id uuid NOT NULL, -- partner_id or lead_id
  template_id uuid NOT NULL REFERENCES public.playbook_templates(id) ON DELETE CASCADE,
  opportunity_type text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','dismissed','auto_created')),
  resulting_play_id uuid,
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX play_suggestions_pending_dedupe
  ON public.play_suggestions (scope, target_id, template_id)
  WHERE status = 'pending';

CREATE INDEX play_suggestions_status_idx ON public.play_suggestions (status, created_at DESC);

ALTER TABLE public.play_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read play_suggestions"
  ON public.play_suggestions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins write play_suggestions"
  ON public.play_suggestions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ---- Extend success play tables ------------------------------
ALTER TABLE public.partner_success_plays
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.playbook_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS last_touch_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.direct_success_plays
  ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES public.playbook_templates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS last_touch_at timestamptz,
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT true;

-- ---- Overdue / suggestion views ------------------------------
CREATE OR REPLACE VIEW public.v_partner_overdue_plays
  WITH (security_invoker = true) AS
SELECT
  p.id,
  p.partner_id,
  wp.company_name,
  p.play_type,
  p.status,
  p.due_date,
  p.last_touch_at,
  p.notes,
  p.template_id,
  t.title AS template_title,
  GREATEST(0, (CURRENT_DATE - p.due_date))::int AS days_overdue
FROM public.partner_success_plays p
LEFT JOIN public.white_label_partners wp ON wp.id = p.partner_id
LEFT JOIN public.playbook_templates t ON t.id = p.template_id
WHERE p.status IN ('not_started','active')
  AND p.reminder_enabled
  AND p.due_date IS NOT NULL
  AND p.due_date <= CURRENT_DATE + INTERVAL '3 days';

CREATE OR REPLACE VIEW public.v_direct_overdue_plays
  WITH (security_invoker = true) AS
SELECT
  p.id,
  p.lead_id,
  l.name,
  l.company,
  p.play_type,
  p.status,
  p.due_date,
  p.last_touch_at,
  p.notes,
  p.template_id,
  t.title AS template_title,
  GREATEST(0, (CURRENT_DATE - p.due_date))::int AS days_overdue
FROM public.direct_success_plays p
LEFT JOIN public.leads l ON l.id = p.lead_id
LEFT JOIN public.playbook_templates t ON t.id = p.template_id
WHERE p.status IN ('not_started','active')
  AND p.reminder_enabled
  AND p.due_date IS NOT NULL
  AND p.due_date <= CURRENT_DATE + INTERVAL '3 days';

CREATE OR REPLACE VIEW public.v_play_suggestions_open
  WITH (security_invoker = true) AS
SELECT
  s.id,
  s.scope,
  s.target_id,
  s.template_id,
  s.opportunity_type,
  s.reason,
  s.status,
  s.created_at,
  t.title AS template_title,
  t.play_type AS template_play_type,
  t.default_followup_days,
  t.auto_create,
  CASE
    WHEN s.scope = 'partner' THEN wp.company_name
    WHEN s.scope = 'direct'  THEN COALESCE(l.company, l.name)
  END AS target_label
FROM public.play_suggestions s
JOIN public.playbook_templates t ON t.id = s.template_id
LEFT JOIN public.white_label_partners wp
  ON s.scope = 'partner' AND wp.id = s.target_id
LEFT JOIN public.leads l
  ON s.scope = 'direct' AND l.id = s.target_id
WHERE s.status = 'pending';

-- ---- BI mirrors ----------------------------------------------
CREATE OR REPLACE VIEW public.v_bi_playbook_templates
  WITH (security_invoker = true) AS
SELECT id, scope, play_type, template_key, title, trigger_type, trigger_definition,
       default_followup_days, auto_create, active, created_at, updated_at
FROM public.playbook_templates;

CREATE OR REPLACE VIEW public.v_bi_play_suggestions
  WITH (security_invoker = true) AS
SELECT id, scope, target_id, template_id, opportunity_type, reason, status,
       resulting_play_id, decided_by, decided_at, created_at
FROM public.play_suggestions;

-- ---- Suggestion generation RPC -------------------------------
CREATE OR REPLACE FUNCTION public.generate_playbook_suggestions()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_pending int := 0;
  v_auto_created int := 0;
  rec record;
  v_template public.playbook_templates%ROWTYPE;
  v_play_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  -- Partner opportunities
  FOR rec IN SELECT * FROM public.v_partner_success_opportunities LOOP
    SELECT * INTO v_template
    FROM public.playbook_templates
    WHERE scope = 'partner'
      AND play_type = rec.opportunity_type
      AND active
    ORDER BY auto_create DESC, updated_at DESC
    LIMIT 1;
    IF v_template.id IS NULL THEN CONTINUE; END IF;

    IF v_template.auto_create THEN
      -- skip if any open play of this template already exists
      IF EXISTS (
        SELECT 1 FROM public.partner_success_plays
        WHERE partner_id = rec.partner_id
          AND template_id = v_template.id
          AND status IN ('not_started','active')
      ) THEN CONTINUE; END IF;
      INSERT INTO public.partner_success_plays
        (partner_id, play_type, status, notes, template_id, due_date, reminder_enabled, created_by)
      VALUES
        (rec.partner_id, v_template.play_type, 'not_started', rec.reason, v_template.id,
         CURRENT_DATE + (v_template.default_followup_days || ' days')::interval,
         true, auth.uid())
      RETURNING id INTO v_play_id;
      INSERT INTO public.play_suggestions
        (scope, target_id, template_id, opportunity_type, reason, status,
         resulting_play_id, decided_by, decided_at)
      VALUES
        ('partner', rec.partner_id, v_template.id, rec.opportunity_type, rec.reason,
         'auto_created', v_play_id, auth.uid(), now());
      v_auto_created := v_auto_created + 1;
    ELSE
      INSERT INTO public.play_suggestions
        (scope, target_id, template_id, opportunity_type, reason)
      VALUES
        ('partner', rec.partner_id, v_template.id, rec.opportunity_type, rec.reason)
      ON CONFLICT (scope, target_id, template_id) WHERE status = 'pending' DO NOTHING;
      IF FOUND THEN v_inserted_pending := v_inserted_pending + 1; END IF;
    END IF;
  END LOOP;

  -- Direct opportunities
  FOR rec IN SELECT * FROM public.v_direct_success_opportunities LOOP
    SELECT * INTO v_template
    FROM public.playbook_templates
    WHERE scope = 'direct'
      AND play_type = rec.opportunity_type
      AND active
    ORDER BY auto_create DESC, updated_at DESC
    LIMIT 1;
    IF v_template.id IS NULL THEN CONTINUE; END IF;

    IF v_template.auto_create THEN
      IF EXISTS (
        SELECT 1 FROM public.direct_success_plays
        WHERE lead_id = rec.lead_id
          AND template_id = v_template.id
          AND status IN ('not_started','active')
      ) THEN CONTINUE; END IF;
      INSERT INTO public.direct_success_plays
        (lead_id, play_type, status, notes, template_id, due_date, reminder_enabled, created_by)
      VALUES
        (rec.lead_id, v_template.play_type, 'not_started', rec.reason, v_template.id,
         CURRENT_DATE + (v_template.default_followup_days || ' days')::interval,
         true, auth.uid())
      RETURNING id INTO v_play_id;
      INSERT INTO public.play_suggestions
        (scope, target_id, template_id, opportunity_type, reason, status,
         resulting_play_id, decided_by, decided_at)
      VALUES
        ('direct', rec.lead_id, v_template.id, rec.opportunity_type, rec.reason,
         'auto_created', v_play_id, auth.uid(), now());
      v_auto_created := v_auto_created + 1;
    ELSE
      INSERT INTO public.play_suggestions
        (scope, target_id, template_id, opportunity_type, reason)
      VALUES
        ('direct', rec.lead_id, v_template.id, rec.opportunity_type, rec.reason)
      ON CONFLICT (scope, target_id, template_id) WHERE status = 'pending' DO NOTHING;
      IF FOUND THEN v_inserted_pending := v_inserted_pending + 1; END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'pending_inserted', v_inserted_pending,
    'auto_created', v_auto_created,
    'generated_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.generate_playbook_suggestions() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.generate_playbook_suggestions() TO authenticated;

-- ---- Accept suggestion RPC -----------------------------------
CREATE OR REPLACE FUNCTION public.accept_play_suggestion(p_suggestion_id uuid, p_notes text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s public.play_suggestions%ROWTYPE;
  t public.playbook_templates%ROWTYPE;
  v_play_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  SELECT * INTO s FROM public.play_suggestions WHERE id = p_suggestion_id AND status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'suggestion not pending'; END IF;
  SELECT * INTO t FROM public.playbook_templates WHERE id = s.template_id;

  IF s.scope = 'partner' THEN
    INSERT INTO public.partner_success_plays
      (partner_id, play_type, status, notes, template_id, due_date, reminder_enabled, created_by)
    VALUES
      (s.target_id, t.play_type, 'not_started', COALESCE(p_notes, s.reason), t.id,
       CURRENT_DATE + (t.default_followup_days || ' days')::interval, true, auth.uid())
    RETURNING id INTO v_play_id;
  ELSE
    INSERT INTO public.direct_success_plays
      (lead_id, play_type, status, notes, template_id, due_date, reminder_enabled, created_by)
    VALUES
      (s.target_id, t.play_type, 'not_started', COALESCE(p_notes, s.reason), t.id,
       CURRENT_DATE + (t.default_followup_days || ' days')::interval, true, auth.uid())
    RETURNING id INTO v_play_id;
  END IF;

  UPDATE public.play_suggestions
  SET status = 'accepted', resulting_play_id = v_play_id,
      decided_by = auth.uid(), decided_at = now()
  WHERE id = p_suggestion_id;

  RETURN v_play_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_play_suggestion(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.accept_play_suggestion(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.dismiss_play_suggestion(p_suggestion_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE public.play_suggestions
  SET status = 'dismissed', decided_by = auth.uid(), decided_at = now()
  WHERE id = p_suggestion_id AND status = 'pending';
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.dismiss_play_suggestion(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.dismiss_play_suggestion(uuid) TO authenticated;

-- ---- Seed templates ------------------------------------------
INSERT INTO public.playbook_templates
  (scope, play_type, template_key, title, description, trigger_type, default_followup_days, auto_create)
VALUES
  ('partner','save','partner_save_intervention',
   'Partner risk intervention',
   'Outreach + remediation when partner shows high intervention share, contraction, or inactivity.',
   'opportunity', 5, false),
  ('partner','upsell','partner_expansion_nudge',
   'Partner expansion nudge',
   'Cooperative outreach to strategic / expansion-ready partners with healthy portfolio momentum.',
   'opportunity', 14, false),
  ('direct','onboard','direct_new_account_onboarding',
   'New account onboarding check-in',
   'Confirm setup completion and live receptionist for accounts inside their first weeks.',
   'opportunity', 3, true),
  ('direct','save','direct_risk_save',
   'Direct account save play',
   'Outreach when payment risk, intervention health, or downgrade signal is detected.',
   'opportunity', 4, false),
  ('direct','upsell','direct_expansion_nudge',
   'Direct expansion-ready nudge',
   'Cooperative expansion conversation for healthy direct accounts showing usage growth.',
   'opportunity', 10, false)
ON CONFLICT (scope, template_key) DO NOTHING;
