CREATE TABLE public.wizard_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token text NOT NULL UNIQUE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
  email text,
  service text,
  industry text,
  country text,
  billing_currency text,
  plan_minutes integer,
  billing_period text,
  current_step integer NOT NULL DEFAULT 1,
  completed_steps integer[] NOT NULL DEFAULT '{}',
  is_complete boolean NOT NULL DEFAULT false,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX wizard_sessions_user_id_idx ON public.wizard_sessions(user_id);
CREATE INDEX wizard_sessions_email_idx ON public.wizard_sessions(lower(email));
CREATE INDEX wizard_sessions_lead_id_idx ON public.wizard_sessions(lead_id);
CREATE INDEX wizard_sessions_last_activity_idx ON public.wizard_sessions(last_activity_at DESC);

CREATE OR REPLACE FUNCTION public.tg_wizard_sessions_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_activity_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER wizard_sessions_set_updated_at
BEFORE UPDATE ON public.wizard_sessions
FOR EACH ROW EXECUTE FUNCTION public.tg_wizard_sessions_set_updated_at();

ALTER TABLE public.wizard_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can create a wizard session"
ON public.wizard_sessions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Update by session token bearer"
ON public.wizard_sessions
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Owners can read own wizard sessions"
ON public.wizard_sessions
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR (
    email IS NOT NULL
    AND lower(email) = lower(coalesce((auth.jwt() ->> 'email'), ''))
  )
);

CREATE POLICY "Staff can read all wizard sessions"
ON public.wizard_sessions
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'sales')
  OR public.has_role(auth.uid(), 'billing')
  OR public.has_role(auth.uid(), 'supervisor')
  OR public.has_role(auth.uid(), 'hr')
);

CREATE POLICY "Staff can update wizard sessions"
ON public.wizard_sessions
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'sales')
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'sales')
);
