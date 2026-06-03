
-- =========================================
-- campaign_training_modules
-- =========================================
CREATE TABLE public.campaign_training_modules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  tenant_kind public.campaign_tenant_kind NOT NULL,
  wl_partner_id uuid REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  client_lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  wl_client_id uuid REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  title text NOT NULL,
  summary text,
  body_md text NOT NULL DEFAULT '',
  required boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_ctm_campaign ON public.campaign_training_modules(campaign_id);
CREATE INDEX idx_ctm_status ON public.campaign_training_modules(status);
CREATE INDEX idx_ctm_tenant ON public.campaign_training_modules(tenant_kind, wl_partner_id, client_lead_id, wl_client_id);

ALTER TABLE public.campaign_training_modules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and supervisors manage training modules"
  ON public.campaign_training_modules FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Agents read published modules"
  ON public.campaign_training_modules FOR SELECT
  USING (
    status = 'published'
    AND public.has_role(auth.uid(), 'agent')
  );

CREATE TRIGGER trg_ctm_updated_at
  BEFORE UPDATE ON public.campaign_training_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- campaign_training_completions
-- =========================================
CREATE TABLE public.campaign_training_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id uuid NOT NULL REFERENCES public.campaign_training_modules(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  agent_notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, agent_id)
);

CREATE INDEX idx_ctc_agent ON public.campaign_training_completions(agent_id);
CREATE INDEX idx_ctc_campaign ON public.campaign_training_completions(campaign_id);
CREATE INDEX idx_ctc_module ON public.campaign_training_completions(module_id);

ALTER TABLE public.campaign_training_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agents insert their own completions"
  ON public.campaign_training_completions FOR INSERT
  WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Agents read their own completions"
  ON public.campaign_training_completions FOR SELECT
  USING (auth.uid() = agent_id);

CREATE POLICY "Agents delete their own completions"
  ON public.campaign_training_completions FOR DELETE
  USING (auth.uid() = agent_id);

CREATE POLICY "Admins and supervisors manage completions"
  ON public.campaign_training_completions FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

-- =========================================
-- campaign_training_signoffs
-- =========================================
CREATE TABLE public.campaign_training_signoffs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  completion_id uuid NOT NULL UNIQUE REFERENCES public.campaign_training_completions(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.campaign_training_modules(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL,
  signed_off_by uuid NOT NULL,
  signed_off_at timestamptz NOT NULL DEFAULT now(),
  signoff_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cts_module ON public.campaign_training_signoffs(module_id);
CREATE INDEX idx_cts_agent ON public.campaign_training_signoffs(agent_id);
CREATE INDEX idx_cts_campaign ON public.campaign_training_signoffs(campaign_id);

ALTER TABLE public.campaign_training_signoffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and supervisors manage signoffs"
  ON public.campaign_training_signoffs FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));

CREATE POLICY "Agents read their own signoffs"
  ON public.campaign_training_signoffs FOR SELECT
  USING (auth.uid() = agent_id);

-- =========================================
-- coverage view
-- =========================================
CREATE OR REPLACE VIEW public.campaign_training_coverage AS
SELECT
  c.id AS campaign_id,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'published') AS published_modules,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'published' AND m.required) AS required_modules,
  COUNT(DISTINCT comp.id) AS total_completions,
  COUNT(DISTINCT so.id) AS total_signoffs,
  COUNT(DISTINCT comp.agent_id) AS agents_started,
  CASE
    WHEN COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'published' AND m.required) = 0 THEN 100
    ELSE ROUND(
      100.0 * COUNT(DISTINCT so.id) FILTER (WHERE EXISTS (
        SELECT 1 FROM public.campaign_training_modules mm
        WHERE mm.id = so.module_id AND mm.required AND mm.status = 'published'
      ))
      / NULLIF(COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'published' AND m.required) * GREATEST(COUNT(DISTINCT comp.agent_id), 1), 0)
    )
  END AS percent_signed_off
FROM public.campaigns c
LEFT JOIN public.campaign_training_modules m ON m.campaign_id = c.id
LEFT JOIN public.campaign_training_completions comp ON comp.module_id = m.id
LEFT JOIN public.campaign_training_signoffs so ON so.completion_id = comp.id
GROUP BY c.id;

GRANT SELECT ON public.campaign_training_coverage TO authenticated;
