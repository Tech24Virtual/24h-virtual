
-- Create billing_notes table
CREATE TABLE public.billing_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  created_by UUID NOT NULL,
  note TEXT NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'general',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Billing/admin can manage billing notes"
ON public.billing_notes FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'billing') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'billing') OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_billing_notes_lead_id ON public.billing_notes(lead_id);

-- Create tech_issues table
CREATE TABLE public.tech_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID,
  affected_department TEXT,
  resolution_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tech_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tech/admin can manage tech issues"
ON public.tech_issues FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'tech') OR public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'tech') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "All staff can view tech issues"
ON public.tech_issues FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'agent') OR
  public.has_role(auth.uid(), 'supervisor') OR
  public.has_role(auth.uid(), 'billing') OR
  public.has_role(auth.uid(), 'sales') OR
  public.has_role(auth.uid(), 'hr')
);

CREATE INDEX idx_tech_issues_status ON public.tech_issues(status);
CREATE INDEX idx_tech_issues_category ON public.tech_issues(category);

-- Add sla_deadline to support_tickets
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ;
