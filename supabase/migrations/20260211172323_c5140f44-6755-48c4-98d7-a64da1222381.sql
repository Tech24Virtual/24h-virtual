
-- Agent Onboarding pipeline table
CREATE TABLE public.agent_onboarding (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  applicant_user_id uuid NOT NULL,
  supervisor_id uuid NOT NULL,
  job_application_id uuid REFERENCES public.job_applications(id),
  status text NOT NULL DEFAULT 'offer_pending',
  pay_rate numeric,
  pay_type text DEFAULT 'hourly',
  schedule_type text DEFAULT 'full_time',
  contract_text text,
  contract_signed_at timestamptz,
  banking_submitted boolean NOT NULL DEFAULT false,
  google_email text,
  five9_username text,
  five9_password_encrypted text,
  slack_invited boolean NOT NULL DEFAULT false,
  training_checklist jsonb DEFAULT '[]'::jsonb,
  training_completed_at timestamptz,
  live_training_scheduled_at timestamptz,
  live_training_completed_at timestamptz,
  slack_channels_assigned boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_onboarding ENABLE ROW LEVEL SECURITY;

-- Supervisors and admins can do everything
CREATE POLICY "Supervisors and admins can manage onboarding"
ON public.agent_onboarding FOR ALL
USING (
  public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin')
);

-- Agents can read their own onboarding record
CREATE POLICY "Agents can view own onboarding"
ON public.agent_onboarding FOR SELECT
USING (applicant_user_id = auth.uid());

-- Agents can update specific fields on their own record
CREATE POLICY "Agents can update own onboarding"
ON public.agent_onboarding FOR UPDATE
USING (applicant_user_id = auth.uid())
WITH CHECK (applicant_user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_agent_onboarding_updated_at
BEFORE UPDATE ON public.agent_onboarding
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Training Templates table
CREATE TABLE public.training_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.training_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors and admins can manage training templates"
ON public.training_templates FOR ALL
USING (
  public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin')
);

-- Agent Onboarding Log (audit trail)
CREATE TABLE public.agent_onboarding_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  onboarding_id uuid NOT NULL REFERENCES public.agent_onboarding(id) ON DELETE CASCADE,
  action text NOT NULL,
  performed_by uuid,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.agent_onboarding_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Supervisors and admins can manage onboarding logs"
ON public.agent_onboarding_log FOR ALL
USING (
  public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Agents can view own onboarding logs"
ON public.agent_onboarding_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.agent_onboarding ao
    WHERE ao.id = onboarding_id AND ao.applicant_user_id = auth.uid()
  )
);
