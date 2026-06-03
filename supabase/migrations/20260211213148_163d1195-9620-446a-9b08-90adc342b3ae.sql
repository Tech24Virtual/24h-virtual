
-- Enable pg_net extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- Trigger function for new leads
CREATE OR REPLACE FUNCTION public.notify_admin_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM extensions.http_post(
    url := 'https://grbwstopaqvmybmmtiiv.supabase.co/functions/v1/send-admin-notification',
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
    )
  );
  RETURN NEW;
END;
$$;

-- Trigger function for new job applications
CREATE OR REPLACE FUNCTION public.notify_admin_new_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM extensions.http_post(
    url := 'https://grbwstopaqvmybmmtiiv.supabase.co/functions/v1/send-admin-notification',
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
    )
  );
  RETURN NEW;
END;
$$;

-- Create triggers
CREATE TRIGGER on_new_lead_notify_admin
  AFTER INSERT ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_lead();

CREATE TRIGGER on_new_application_notify_admin
  AFTER INSERT ON public.job_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_new_application();
