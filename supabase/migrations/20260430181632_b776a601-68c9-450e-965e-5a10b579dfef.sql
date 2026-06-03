CREATE TABLE public.dashboard_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  surface text NOT NULL,
  persona text NOT NULL DEFAULT 'anonymous',
  target text,
  session_id text,
  path text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  properties jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX dashboard_events_event_name_idx ON public.dashboard_events(event_name, occurred_at DESC);
CREATE INDEX dashboard_events_surface_idx ON public.dashboard_events(surface, occurred_at DESC);
CREATE INDEX dashboard_events_persona_idx ON public.dashboard_events(persona, occurred_at DESC);
CREATE INDEX dashboard_events_user_id_idx ON public.dashboard_events(user_id, occurred_at DESC);
CREATE INDEX dashboard_events_session_id_idx ON public.dashboard_events(session_id, occurred_at DESC);

ALTER TABLE public.dashboard_events ENABLE ROW LEVEL SECURITY;

-- Anonymous users can record events (user_id must be NULL)
CREATE POLICY "Anonymous can record own dashboard events"
ON public.dashboard_events
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Authenticated users can record events tagged with their own id (or null)
CREATE POLICY "Authenticated can record own dashboard events"
ON public.dashboard_events
FOR INSERT
TO authenticated
WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Staff read-all for analytics
CREATE POLICY "Staff can read dashboard events"
ON public.dashboard_events
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'supervisor')
);
