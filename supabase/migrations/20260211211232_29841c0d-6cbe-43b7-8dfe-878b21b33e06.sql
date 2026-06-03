
-- 1. Create lead_conversions table for audit trail
CREATE TABLE public.lead_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  converted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  converted_by UUID REFERENCES auth.users(id),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_conversions ENABLE ROW LEVEL SECURITY;

-- Only users with admin role can manage conversions
CREATE POLICY "Admins can view lead conversions"
  ON public.lead_conversions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert lead conversions"
  ON public.lead_conversions FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. Seed default lead_scoring_rules into admin_settings
INSERT INTO public.admin_settings (key, value)
VALUES (
  'lead_scoring_rules',
  '{"rules":{"phone_provided":{"points":10,"enabled":true},"detailed_message":{"points":15,"enabled":true},"calculator_lead":{"points":25,"enabled":true},"wizard_lead":{"points":15,"enabled":true},"professional_email":{"points":5,"enabled":true},"firm_name_provided":{"points":5,"enabled":true},"high_value_service":{"points":20,"enabled":true}},"labels":{"hot":70,"warm":40}}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
