
-- Fix notify_on_ticket_reply: only exclude submitted_by/assigned_to from fan-out if they were actually notified
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

  v_is_cross_dept := (v_ticket.originating_source IS DISTINCT FROM v_ticket.source);

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

  -- Build fan-out exclusion list
  IF v_is_cross_dept THEN
    v_fanout_exclude_ids := '{}';
    -- Only exclude submitted_by if they were ACTUALLY individually notified
    IF v_ticket.submitted_by IS NOT NULL
       AND v_ticket.submitted_by IS DISTINCT FROM v_reply_author_id THEN
      v_fanout_exclude_ids := v_fanout_exclude_ids || v_ticket.submitted_by;
    END IF;
    -- Only exclude assigned_to if they were ACTUALLY individually notified
    IF v_ticket.assigned_to IS NOT NULL
       AND v_ticket.assigned_to IS DISTINCT FROM v_reply_author_id THEN
      v_fanout_exclude_ids := v_fanout_exclude_ids || v_ticket.assigned_to;
    END IF;
  ELSE
    v_fanout_exclude_ids := v_notified_ids;
  END IF;

  -- Department fan-out
  FOR v_dept_user IN
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role::text = v_ticket.source
      AND ur.user_id != ALL(v_fanout_exclude_ids)
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

-- Fix update_ticket_activity_on_status_change: same exclusion logic fix
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
  v_dept_user RECORD;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_changer_id := auth.uid();
    NEW.last_activity_at = now();
    NEW.last_activity_by = v_changer_id;
    v_notified_ids := v_notified_ids || v_changer_id;

    v_is_cross_dept := (NEW.originating_source IS DISTINCT FROM NEW.source);

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

    -- Build fan-out exclusion list
    IF v_is_cross_dept THEN
      v_fanout_exclude_ids := '{}';
      -- Only exclude if actually notified (different from changer)
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

    -- Department fan-out
    FOR v_dept_user IN
      SELECT ur.user_id
      FROM public.user_roles ur
      WHERE ur.role::text = NEW.source
        AND ur.user_id != ALL(v_fanout_exclude_ids)
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
