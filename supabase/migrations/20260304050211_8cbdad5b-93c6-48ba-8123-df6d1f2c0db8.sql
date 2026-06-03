
-- Fix notify_admin_new_lead: replace extensions.http_post with net.http_post + add exception handler
CREATE OR REPLACE FUNCTION public.notify_admin_new_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://grbwstopaqvmybmmtiiv.supabase.co/functions/v1/send-admin-notification'::text,
    body := jsonb_build_object(
      'type', 'new_lead',
      'record', jsonb_build_object(
        'id', NEW.id,
        'name', NEW.name,
        'email', NEW.email,
        'phone', NEW.phone,
        'company', NEW.company,
        'service_type', NEW.service_type,
        'source', NEW.source,
        'notes', NEW.notes,
        'plan_minutes', NEW.plan_minutes,
        'score', NEW.score
      )
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyYndzdG9wYXF2bXlibW10aWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjkxMjQsImV4cCI6MjA4NTY0NTEyNH0.d6XVSev5y9nFiGDOD8ts0ZkuEPJQPFW9WbbUttBwESI'
    )::jsonb
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_admin_new_lead failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Fix notify_admin_new_application: same fix
CREATE OR REPLACE FUNCTION public.notify_admin_new_application()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM net.http_post(
    url := 'https://grbwstopaqvmybmmtiiv.supabase.co/functions/v1/send-admin-notification'::text,
    body := jsonb_build_object(
      'type', 'new_application',
      'record', jsonb_build_object(
        'id', NEW.id,
        'name', NEW.name,
        'email', NEW.email,
        'phone', NEW.phone,
        'cover_letter', NEW.cover_letter,
        'job_posting_id', NEW.job_posting_id,
        'status', NEW.status
      )
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyYndzdG9wYXF2bXlibW10aWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjkxMjQsImV4cCI6MjA4NTY0NTEyNH0.d6XVSev5y9nFiGDOD8ts0ZkuEPJQPFW9WbbUttBwESI'
    )::jsonb
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_admin_new_application failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;
