-- Assignment layer for the campaign training system.
-- Without this, every agent with role 'agent' could see every published module.
-- This table ties a specific agent to a specific module with optional due_date.

CREATE TABLE public.campaign_training_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.campaign_training_modules(id) ON DELETE CASCADE,
  agent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamptz DEFAULT now(),
  due_date timestamptz,
  trigger_type text DEFAULT 'manual' CHECK (trigger_type IN ('manual', 'onboarding', 'campaign_assignment', 'refresher')),
  UNIQUE(module_id, agent_id)
);

ALTER TABLE public.campaign_training_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agent_see_own_assignments" ON public.campaign_training_assignments
  FOR SELECT TO authenticated
  USING (
    agent_id = auth.uid()
    OR public.has_role(auth.uid(), 'supervisor'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "supervisor_manage_assignments" ON public.campaign_training_assignments
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'supervisor'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'supervisor'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_training_assignments TO authenticated;

-- Auto-assign published required modules when an agent is assigned to a client.
-- Looks up modules via client_lead_id so tenant isolation is preserved.
CREATE OR REPLACE FUNCTION public.auto_assign_campaign_training()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.campaign_training_assignments (module_id, agent_id, trigger_type)
  SELECT m.id, NEW.agent_id, 'campaign_assignment'
  FROM public.campaign_training_modules m
  WHERE m.client_lead_id = NEW.client_id
    AND m.status = 'published'
    AND m.required = true
  ON CONFLICT (module_id, agent_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_assign_campaign_training
  AFTER INSERT ON public.client_agent_assignments
  FOR EACH ROW EXECUTE FUNCTION public.auto_assign_campaign_training();
