-- Agent Bookii assignment — superadmin assigns Bookii accounts to agents
CREATE TABLE public.agent_bookii_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bookii_username text NOT NULL,
  bookii_embed_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  assigned_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (agent_id)
);

ALTER TABLE public.agent_bookii_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage all bookii assignments"
  ON public.agent_bookii_assignments FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Agents can view own bookii assignment"
  ON public.agent_bookii_assignments FOR SELECT
  USING (agent_id = auth.uid());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agent_bookii_assignments TO authenticated;
