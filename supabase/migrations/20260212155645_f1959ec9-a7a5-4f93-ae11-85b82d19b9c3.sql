
-- New table: offboarding
CREATE TABLE public.offboarding (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL,
  initiated_by UUID NOT NULL,
  reason TEXT NOT NULL DEFAULT 'resignation',
  reason_details TEXT,
  status TEXT NOT NULL DEFAULT 'initiated',
  last_working_day DATE,
  exit_interview_notes TEXT,
  google_deprovisioned BOOLEAN NOT NULL DEFAULT false,
  five9_deprovisioned BOOLEAN NOT NULL DEFAULT false,
  slack_removed BOOLEAN NOT NULL DEFAULT false,
  final_payout_processed BOOLEAN NOT NULL DEFAULT false,
  equipment_returned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- New table: onboarding_templates
CREATE TABLE public.onboarding_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- New table: offboarding_templates
CREATE TABLE public.offboarding_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  checklist JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- New table: hr_communications
CREATE TABLE public.hr_communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  from_user_id UUID NOT NULL,
  to_user_id UUID,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Alter profiles: add employment fields
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS employment_status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS hire_date DATE,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS reporting_to UUID;

-- Alter agent_onboarding: add template and hr approval
ALTER TABLE public.agent_onboarding
  ADD COLUMN IF NOT EXISTS onboarding_template_id UUID REFERENCES public.onboarding_templates(id),
  ADD COLUMN IF NOT EXISTS hr_approved_by UUID;

-- Insert default onboarding template
INSERT INTO public.onboarding_templates (name, description, steps, is_default)
VALUES (
  'Standard Onboarding',
  'Default 8-step onboarding sequence',
  '[
    {"label": "Offer Sent", "who": "HR", "required": true},
    {"label": "Accepted", "who": "Agent", "required": true},
    {"label": "Contract Signed", "who": "Agent", "required": true},
    {"label": "Banking", "who": "Agent", "required": true},
    {"label": "Provisioning", "who": "Supervisor", "required": true},
    {"label": "Training", "who": "Supervisor", "required": true},
    {"label": "Live Training", "who": "Supervisor", "required": true},
    {"label": "Complete", "who": "HR", "required": true}
  ]'::jsonb,
  true
);

-- Insert default offboarding template
INSERT INTO public.offboarding_templates (name, description, checklist, is_default)
VALUES (
  'Standard Offboarding',
  'Default offboarding checklist',
  '[
    {"label": "Deactivate Google Workspace", "required": true},
    {"label": "Remove Five9 Access", "required": true},
    {"label": "Remove from Slack", "required": true},
    {"label": "Process Final Payout", "required": true},
    {"label": "Collect Equipment", "required": false},
    {"label": "Exit Interview", "required": true}
  ]'::jsonb,
  true
);

-- Enable RLS on all new tables
ALTER TABLE public.offboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offboarding_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_communications ENABLE ROW LEVEL SECURITY;

-- RLS: offboarding
CREATE POLICY "HR and admin full access on offboarding" ON public.offboarding
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('hr', 'admin'))
  );
CREATE POLICY "Supervisors can view offboarding" ON public.offboarding
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'supervisor')
  );

-- RLS: onboarding_templates
CREATE POLICY "HR and admin full access on onboarding_templates" ON public.onboarding_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('hr', 'admin'))
  );
CREATE POLICY "Supervisors can view onboarding_templates" ON public.onboarding_templates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'supervisor')
  );

-- RLS: offboarding_templates
CREATE POLICY "HR and admin full access on offboarding_templates" ON public.offboarding_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('hr', 'admin'))
  );
CREATE POLICY "Supervisors can view offboarding_templates" ON public.offboarding_templates
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'supervisor')
  );

-- RLS: hr_communications
CREATE POLICY "HR and admin full access on hr_communications" ON public.hr_communications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('hr', 'admin'))
  );
CREATE POLICY "Users can read their own communications" ON public.hr_communications
  FOR SELECT USING (to_user_id = auth.uid() OR from_user_id = auth.uid());
CREATE POLICY "Users can insert communications" ON public.hr_communications
  FOR INSERT WITH CHECK (from_user_id = auth.uid());
