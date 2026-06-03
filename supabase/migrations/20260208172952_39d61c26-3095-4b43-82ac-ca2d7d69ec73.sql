
-- Create outbound_call_requests table
CREATE TABLE public.outbound_call_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID,
  lead_id UUID REFERENCES public.leads(id),
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  reason TEXT,
  urgency TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'pending',
  claimed_by UUID,
  claimed_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  outcome TEXT,
  outcome_notes TEXT,
  source TEXT NOT NULL DEFAULT 'portal',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  last_attempt_outcome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create outbound_call_attempts table
CREATE TABLE public.outbound_call_attempts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES public.outbound_call_requests(id) ON DELETE CASCADE,
  agent_id UUID,
  agent_name TEXT,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  outcome TEXT NOT NULL,
  notes TEXT,
  retry_scheduled_for TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.outbound_call_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outbound_call_attempts ENABLE ROW LEVEL SECURITY;

-- RLS for outbound_call_requests
CREATE POLICY "Clients can insert own outbound requests"
  ON public.outbound_call_requests FOR INSERT
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Clients can view own outbound requests"
  ON public.outbound_call_requests FOR SELECT
  USING (client_id = auth.uid());

CREATE POLICY "Clients can cancel own pending requests"
  ON public.outbound_call_requests FOR UPDATE
  USING (client_id = auth.uid() AND status = 'pending');

CREATE POLICY "Staff can view all outbound requests"
  ON public.outbound_call_requests FOR SELECT
  USING (
    has_role(auth.uid(), 'agent'::app_role) OR
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Staff can update outbound requests"
  ON public.outbound_call_requests FOR UPDATE
  USING (
    has_role(auth.uid(), 'agent'::app_role) OR
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can manage all outbound requests"
  ON public.outbound_call_requests FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS for outbound_call_attempts
CREATE POLICY "Staff can insert outbound call attempts"
  ON public.outbound_call_attempts FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'agent'::app_role) OR
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Staff can view outbound call attempts"
  ON public.outbound_call_attempts FOR SELECT
  USING (
    has_role(auth.uid(), 'agent'::app_role) OR
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Clients can view own request attempts"
  ON public.outbound_call_attempts FOR SELECT
  USING (
    request_id IN (
      SELECT id FROM public.outbound_call_requests
      WHERE client_id = auth.uid()
    )
  );

-- Notification trigger for new outbound requests
CREATE OR REPLACE FUNCTION public.notify_on_outbound_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_staff RECORD;
  v_title TEXT;
  v_message TEXT;
BEGIN
  IF NEW.urgency = 'urgent' THEN
    v_title := 'Urgent Outbound Call Request';
  ELSE
    v_title := 'New Outbound Call Request';
  END IF;

  v_message := 'Call ' || NEW.contact_name || ' at ' || NEW.contact_phone;
  IF NEW.reason IS NOT NULL AND length(NEW.reason) > 0 THEN
    v_message := v_message || ' — ' || left(NEW.reason, 100);
  END IF;

  FOR v_staff IN
    SELECT DISTINCT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role IN ('agent'::app_role, 'supervisor'::app_role)
  LOOP
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (
      v_staff.user_id,
      v_title,
      v_message,
      'outbound_call',
      '/staff/agent/outbound-calls'
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trigger_notify_on_outbound_request
  AFTER INSERT ON public.outbound_call_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_outbound_request();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.outbound_call_requests;
