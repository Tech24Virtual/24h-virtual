-- Fix: the notify_on_outbound_request() trigger function had a mojibake
-- "â€”" baked directly into its body (visible via pg_get_functiondef) where an
-- em dash was intended, so every outbound-call notification/activity message
-- it generated came out corrupted (e.g. "Call X at Y â€" reason"). Replace it
-- with a plain ASCII separator so the message renders correctly everywhere
-- and isn't at risk of the same double-encoding class of bug again.

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
    v_message := v_message || ' - ' || left(NEW.reason, 100);
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

-- Self-heal already-corrupted notification rows from before this fix.
UPDATE public.notifications
SET message = replace(message, ' â€” ', ' - ')
WHERE message LIKE '%â€”%';
