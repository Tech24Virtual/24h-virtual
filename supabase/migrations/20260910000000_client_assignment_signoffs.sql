CREATE TABLE IF NOT EXISTS public.client_assignment_signoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES public.client_agent_assignments(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed')),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (agent_id, client_id)
);
ALTER TABLE public.client_assignment_signoffs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can view and update own signoffs"
  ON public.client_assignment_signoffs FOR ALL
  USING (agent_id = auth.uid());
CREATE POLICY "Supervisors and admins can view all signoffs"
  ON public.client_assignment_signoffs FOR SELECT
  USING (has_role(auth.uid(), 'supervisor'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
GRANT SELECT, INSERT, UPDATE ON public.client_assignment_signoffs TO authenticated;
