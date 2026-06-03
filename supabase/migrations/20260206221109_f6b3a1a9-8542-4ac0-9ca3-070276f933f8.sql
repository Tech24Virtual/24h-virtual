
-- Create meetings table for Calendly/Pabbly meeting ingestion
CREATE TABLE public.meetings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.leads(id),
  event_type text,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer DEFAULT 30,
  status text NOT NULL DEFAULT 'scheduled',
  attendee_name text,
  attendee_email text,
  calendly_event_id text UNIQUE,
  calendly_event_url text,
  meeting_link text,
  location text,
  notes text,
  assigned_to uuid,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

-- SELECT: sales, admin, supervisor can read all meetings
CREATE POLICY "Sales/admin/supervisor can view meetings"
  ON public.meetings FOR SELECT
  USING (
    public.has_role(auth.uid(), 'sales') OR
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'supervisor')
  );

-- UPDATE: sales and admin can update (for status changes)
CREATE POLICY "Sales/admin can update meetings"
  ON public.meetings FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'sales') OR
    public.has_role(auth.uid(), 'admin')
  );

-- No INSERT policy for authenticated users (service role only via edge function)

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.meetings;
