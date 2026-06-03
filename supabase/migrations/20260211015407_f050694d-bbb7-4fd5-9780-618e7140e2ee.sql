
-- Create email_followups table
CREATE TABLE public.email_followups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL REFERENCES public.leads(id),
  subject text NOT NULL,
  contact_email text NOT NULL,
  direction text NOT NULL,
  notes text,
  follow_up_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  completed_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_followups ENABLE ROW LEVEL SECURITY;

-- RLS policies (same pattern as crm_tasks/crm_activities)
CREATE POLICY "Admins can manage all email followups"
  ON public.email_followups FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can view email followups"
  ON public.email_followups FOR SELECT
  USING (
    has_role(auth.uid(), 'agent'::app_role)
    OR has_role(auth.uid(), 'sales'::app_role)
    OR has_role(auth.uid(), 'supervisor'::app_role)
  );

CREATE POLICY "Staff can insert email followups"
  ON public.email_followups FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'agent'::app_role)
    OR has_role(auth.uid(), 'sales'::app_role)
    OR has_role(auth.uid(), 'supervisor'::app_role)
  );

CREATE POLICY "Staff can update email followups"
  ON public.email_followups FOR UPDATE
  USING (
    has_role(auth.uid(), 'agent'::app_role)
    OR has_role(auth.uid(), 'sales'::app_role)
    OR has_role(auth.uid(), 'supervisor'::app_role)
  );

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_followups;
