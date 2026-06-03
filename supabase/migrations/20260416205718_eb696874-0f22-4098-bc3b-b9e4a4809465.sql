-- 1. Add cname_last_checked_at columns
ALTER TABLE public.white_label_branding
  ADD COLUMN IF NOT EXISTS cname_last_checked_at timestamptz;

ALTER TABLE public.white_label_domain_aliases
  ADD COLUMN IF NOT EXISTS cname_last_checked_at timestamptz;

-- 2. Store anon JWT in Vault (idempotent: if it already exists, do nothing)
DO $$
DECLARE
  v_secret_id uuid;
BEGIN
  SELECT id INTO v_secret_id
  FROM vault.secrets
  WHERE name = 'admin_notification_anon_jwt';

  IF v_secret_id IS NULL THEN
    PERFORM vault.create_secret(
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyYndzdG9wYXF2bXlibW10aWl2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAwNjkxMjQsImV4cCI6MjA4NTY0NTEyNH0.d6XVSev5y9nFiGDOD8ts0ZkuEPJQPFW9WbbUttBwESI',
      'admin_notification_anon_jwt',
      'Anon JWT used by notify_admin_* triggers to call send-admin-notification edge function'
    );
  END IF;
END $$;

-- 3. Centralized fan-out helper for ticket department notifications.
-- Replaces the duplicated FOR-loop in update_ticket_activity_on_status_change()
-- and notify_on_ticket_reply().
CREATE OR REPLACE FUNCTION public.fanout_ticket_dept_notifications(
  _queue text,
  _exclude_ids uuid[],
  _title text,
  _message text,
  _action_url text
) RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  v_user RECORD;
BEGIN
  IF _queue IS NULL THEN
    RETURN;
  END IF;

  FOR v_user IN
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role::text = _queue
      AND ur.user_id != ALL(COALESCE(_exclude_ids, ARRAY[]::uuid[]))
  LOOP
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (v_user.user_id, _title, _message, 'ticket', _action_url);
  END LOOP;
END;
$$;

-- 4. Refactor update_ticket_activity_on_status_change() to use the helper
CREATE OR REPLACE FUNCTION public.update_ticket_activity_on_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_changer_id uuid;
  v_notified_ids uuid[] := '{}';
  v_fanout_exclude_ids uuid[] := '{}';
  v_is_cross_dept boolean;
  v_queue text;
  v_title text;
  v_message text;
  v_action_url text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_changer_id := auth.uid();
    NEW.last_activity_at = now();
    NEW.last_activity_by = v_changer_id;
    v_notified_ids := v_notified_ids || v_changer_id;

    v_queue := COALESCE(NEW.work_queue, NEW.source);
    v_is_cross_dept := (NEW.originating_source IS DISTINCT FROM v_queue);

    v_title := 'Ticket #' || NEW.ticket_number || ' status changed';
    v_message := 'Status changed from ' || OLD.status || ' to ' || NEW.status || ': ' || left(NEW.title, 80);
    v_action_url := '/tickets/' || NEW.id;

    -- Notify submitted_by
    IF NEW.submitted_by IS NOT NULL
       AND NEW.submitted_by IS DISTINCT FROM v_changer_id THEN
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (NEW.submitted_by, v_title, v_message, 'ticket', v_action_url);
      v_notified_ids := v_notified_ids || NEW.submitted_by;
    END IF;

    -- Notify assigned_to
    IF NEW.assigned_to IS NOT NULL
       AND NEW.assigned_to IS DISTINCT FROM v_changer_id
       AND NEW.assigned_to IS DISTINCT FROM NEW.submitted_by THEN
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (NEW.assigned_to, v_title, v_message, 'ticket', v_action_url);
      v_notified_ids := v_notified_ids || NEW.assigned_to;
    END IF;

    -- Build fan-out exclusion list
    IF v_is_cross_dept THEN
      v_fanout_exclude_ids := '{}';
      IF NEW.submitted_by IS NOT NULL
         AND NEW.submitted_by IS DISTINCT FROM v_changer_id THEN
        v_fanout_exclude_ids := v_fanout_exclude_ids || NEW.submitted_by;
      END IF;
      IF NEW.assigned_to IS NOT NULL
         AND NEW.assigned_to IS DISTINCT FROM v_changer_id THEN
        v_fanout_exclude_ids := v_fanout_exclude_ids || NEW.assigned_to;
      END IF;
    ELSE
      v_fanout_exclude_ids := v_notified_ids;
    END IF;

    PERFORM public.fanout_ticket_dept_notifications(
      v_queue, v_fanout_exclude_ids, v_title, v_message, v_action_url
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- 5. Refactor notify_on_ticket_reply() to use the helper
CREATE OR REPLACE FUNCTION public.notify_on_ticket_reply()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ticket RECORD;
  v_reply_author_id uuid;
  v_notified_ids uuid[] := '{}';
  v_fanout_exclude_ids uuid[] := '{}';
  v_is_cross_dept boolean;
  v_queue text;
  v_title text;
  v_message text;
  v_action_url text;
BEGIN
  IF NEW.is_internal = true THEN
    RETURN NEW;
  END IF;

  v_reply_author_id := NEW.author_id;
  v_notified_ids := v_notified_ids || v_reply_author_id;

  SELECT id, submitted_by, assigned_to, ticket_number, title, source, originating_source, work_queue
  INTO v_ticket
  FROM public.support_tickets
  WHERE id = NEW.ticket_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_queue := COALESCE(v_ticket.work_queue, v_ticket.source);
  v_is_cross_dept := (v_ticket.originating_source IS DISTINCT FROM v_queue);

  v_title := 'New reply on ticket #' || v_ticket.ticket_number;
  v_message := COALESCE(NEW.author_name, 'Someone') || ' replied: ' || left(NEW.message, 100);
  v_action_url := '/tickets/' || v_ticket.id;

  -- Notify submitted_by
  IF v_ticket.submitted_by IS NOT NULL
     AND v_ticket.submitted_by IS DISTINCT FROM v_reply_author_id THEN
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (v_ticket.submitted_by, v_title, v_message, 'ticket', v_action_url);
    v_notified_ids := v_notified_ids || v_ticket.submitted_by;
  END IF;

  -- Notify assigned_to
  IF v_ticket.assigned_to IS NOT NULL
     AND v_ticket.assigned_to IS DISTINCT FROM v_reply_author_id
     AND v_ticket.assigned_to IS DISTINCT FROM v_ticket.submitted_by THEN
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (v_ticket.assigned_to, v_title, v_message, 'ticket', v_action_url);
    v_notified_ids := v_notified_ids || v_ticket.assigned_to;
  END IF;

  IF v_is_cross_dept THEN
    v_fanout_exclude_ids := '{}';
    IF v_ticket.submitted_by IS NOT NULL
       AND v_ticket.submitted_by IS DISTINCT FROM v_reply_author_id THEN
      v_fanout_exclude_ids := v_fanout_exclude_ids || v_ticket.submitted_by;
    END IF;
    IF v_ticket.assigned_to IS NOT NULL
       AND v_ticket.assigned_to IS DISTINCT FROM v_reply_author_id THEN
      v_fanout_exclude_ids := v_fanout_exclude_ids || v_ticket.assigned_to;
    END IF;
  ELSE
    v_fanout_exclude_ids := v_notified_ids;
  END IF;

  PERFORM public.fanout_ticket_dept_notifications(
    v_queue, v_fanout_exclude_ids, v_title, v_message, v_action_url
  );

  RETURN NEW;
END;
$function$;

-- 6. Update notify_admin_new_lead to read JWT from Vault
CREATE OR REPLACE FUNCTION public.notify_admin_new_lead()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt text;
BEGIN
  SELECT decrypted_secret INTO v_jwt
  FROM vault.decrypted_secrets
  WHERE name = 'admin_notification_anon_jwt'
  LIMIT 1;

  IF v_jwt IS NULL THEN
    RAISE WARNING 'notify_admin_new_lead: admin_notification_anon_jwt not found in vault';
    RETURN NEW;
  END IF;

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
      'Authorization', 'Bearer ' || v_jwt
    )::jsonb
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_admin_new_lead failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- 7. Update notify_admin_new_application to read JWT from Vault
CREATE OR REPLACE FUNCTION public.notify_admin_new_application()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_jwt text;
BEGIN
  SELECT decrypted_secret INTO v_jwt
  FROM vault.decrypted_secrets
  WHERE name = 'admin_notification_anon_jwt'
  LIMIT 1;

  IF v_jwt IS NULL THEN
    RAISE WARNING 'notify_admin_new_application: admin_notification_anon_jwt not found in vault';
    RETURN NEW;
  END IF;

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
      'Authorization', 'Bearer ' || v_jwt
    )::jsonb
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'notify_admin_new_application failed: %', SQLERRM;
  RETURN NEW;
END;
$function$;