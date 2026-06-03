
-- Part A: Add view_context column to ticket_views for context-aware tracking
ALTER TABLE public.ticket_views ADD COLUMN view_context varchar NOT NULL DEFAULT 'default';

-- Drop existing unique constraint
ALTER TABLE public.ticket_views DROP CONSTRAINT IF EXISTS ticket_views_user_id_ticket_id_key;

-- Create new composite unique constraint
ALTER TABLE public.ticket_views ADD CONSTRAINT ticket_views_user_context_key UNIQUE(user_id, ticket_id, view_context);

-- Part B: Replace notify_on_ticket_reply with department fan-out logic
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
  v_dept_user RECORD;
BEGIN
  IF NEW.is_internal = true THEN
    RETURN NEW;
  END IF;

  v_reply_author_id := NEW.author_id;
  v_notified_ids := v_notified_ids || v_reply_author_id;

  SELECT id, submitted_by, assigned_to, ticket_number, title, source, originating_source
  INTO v_ticket
  FROM public.support_tickets
  WHERE id = NEW.ticket_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Notify submitted_by
  IF v_ticket.submitted_by IS NOT NULL
     AND v_ticket.submitted_by IS DISTINCT FROM v_reply_author_id THEN
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (
      v_ticket.submitted_by,
      'New reply on ticket #' || v_ticket.ticket_number,
      COALESCE(NEW.author_name, 'Someone') || ' replied: ' || left(NEW.message, 100),
      'ticket',
      '/tickets/' || v_ticket.id
    );
    v_notified_ids := v_notified_ids || v_ticket.submitted_by;
  END IF;

  -- Notify assigned_to
  IF v_ticket.assigned_to IS NOT NULL
     AND v_ticket.assigned_to IS DISTINCT FROM v_reply_author_id
     AND v_ticket.assigned_to IS DISTINCT FROM v_ticket.submitted_by THEN
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (
      v_ticket.assigned_to,
      'New reply on ticket #' || v_ticket.ticket_number,
      COALESCE(NEW.author_name, 'Someone') || ' replied: ' || left(NEW.message, 100),
      'ticket',
      '/tickets/' || v_ticket.id
    );
    v_notified_ids := v_notified_ids || v_ticket.assigned_to;
  END IF;

  -- Department fan-out: notify all staff in the ticket's target department
  FOR v_dept_user IN
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role::text = v_ticket.source
      AND ur.user_id != ALL(v_notified_ids)
  LOOP
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (
      v_dept_user.user_id,
      'New reply on ticket #' || v_ticket.ticket_number,
      COALESCE(NEW.author_name, 'Someone') || ' replied: ' || left(NEW.message, 100),
      'ticket',
      '/tickets/' || v_ticket.id
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Part C: Replace update_ticket_activity_on_status_change with department fan-out
CREATE OR REPLACE FUNCTION public.update_ticket_activity_on_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_changer_id uuid;
  v_notified_ids uuid[] := '{}';
  v_dept_user RECORD;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_changer_id := auth.uid();
    NEW.last_activity_at = now();
    NEW.last_activity_by = v_changer_id;
    v_notified_ids := v_notified_ids || v_changer_id;

    -- Notify submitted_by
    IF NEW.submitted_by IS NOT NULL
       AND NEW.submitted_by IS DISTINCT FROM v_changer_id THEN
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (
        NEW.submitted_by,
        'Ticket #' || NEW.ticket_number || ' status changed',
        'Status changed from ' || OLD.status || ' to ' || NEW.status || ': ' || left(NEW.title, 80),
        'ticket',
        '/tickets/' || NEW.id
      );
      v_notified_ids := v_notified_ids || NEW.submitted_by;
    END IF;

    -- Notify assigned_to
    IF NEW.assigned_to IS NOT NULL
       AND NEW.assigned_to IS DISTINCT FROM v_changer_id
       AND NEW.assigned_to IS DISTINCT FROM NEW.submitted_by THEN
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (
        NEW.assigned_to,
        'Ticket #' || NEW.ticket_number || ' status changed',
        'Status changed from ' || OLD.status || ' to ' || NEW.status || ': ' || left(NEW.title, 80),
        'ticket',
        '/tickets/' || NEW.id
      );
      v_notified_ids := v_notified_ids || NEW.assigned_to;
    END IF;

    -- Department fan-out
    FOR v_dept_user IN
      SELECT ur.user_id
      FROM public.user_roles ur
      WHERE ur.role::text = NEW.source
        AND ur.user_id != ALL(v_notified_ids)
    LOOP
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (
        v_dept_user.user_id,
        'Ticket #' || NEW.ticket_number || ' status changed',
        'Status changed from ' || OLD.status || ' to ' || NEW.status || ': ' || left(NEW.title, 80),
        'ticket',
        '/tickets/' || NEW.id
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;
