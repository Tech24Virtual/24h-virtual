-- Seed test outbound call requests so the Agent Outbound Calls page is not blank.
-- All rows have no client_id/lead_id so they appear to all staff regardless of assignment.
-- Idempotent: only inserts if the table is empty.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.outbound_call_requests LIMIT 1) THEN
    INSERT INTO public.outbound_call_requests
      (contact_name, contact_phone, reason, urgency, status, source, max_attempts)
    VALUES
      ('Alice Tanaka',   '+1 (555) 201-0001', 'Interested in upgrading their service plan',  'urgent',  'pending',       'portal',     3),
      ('Bob Kessler',    '+1 (555) 201-0002', 'Wants to discuss contract renewal',            'normal',  'pending',       'portal',     3),
      ('Carol Nguyen',   '+1 (555) 201-0003', 'Follow-up on billing inquiry',                 'normal',  'retry_pending', 'web_widget', 3),
      ('David Park',     '+1 (555) 201-0004', 'New service onboarding questions',             'normal',  'in_progress',   'portal',     3),
      ('Emma Rodriguez', '+1 (555) 201-0005', 'Cancelled appointment needs rescheduling',     'urgent',  'pending',       'web_widget', 5),
      ('Frank Li',       '+1 (555) 201-0006', 'Dispute on last monthly invoice',              'normal',  'completed',     'portal',     3);
  END IF;
END;
$$;
