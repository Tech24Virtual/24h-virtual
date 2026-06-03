
-- Part B: Add DELETE policy on notifications so users can clear their own
CREATE POLICY "Users can delete own notifications"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Part A, Trigger 1: Notify on ticket reply
CREATE OR REPLACE FUNCTION public.notify_on_ticket_reply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_ticket RECORD;
  v_reply_author_id uuid;
BEGIN
  -- Skip internal notes
  IF NEW.is_internal = true THEN
    RETURN NEW;
  END IF;

  v_reply_author_id := NEW.author_id;

  -- Look up the parent ticket
  SELECT id, submitted_by, assigned_to, ticket_number, title
  INTO v_ticket
  FROM public.support_tickets
  WHERE id = NEW.ticket_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  -- Notify submitted_by (if the replier is someone else)
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
  END IF;

  -- Notify assigned_to (if different from replier AND different from submitted_by)
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
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ticket_reply_notif
  AFTER INSERT ON public.ticket_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_ticket_reply();

-- Part A, Trigger 2: Notify on ticket status change + set last_activity_by
-- Replace the existing trigger function to also set last_activity_by and send notifications
CREATE OR REPLACE FUNCTION public.update_ticket_activity_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_changer_id uuid;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_changer_id := auth.uid();
    NEW.last_activity_at = now();
    NEW.last_activity_by = v_changer_id;

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
    END IF;

    -- Notify assigned_to (if different from changer and from submitted_by)
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
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Part A, Trigger 3: Notify on task assignment / status change
CREATE OR REPLACE FUNCTION public.notify_on_task_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_actor_id uuid;
BEGIN
  v_actor_id := auth.uid();

  IF TG_OP = 'INSERT' THEN
    -- Notify assignee on new task (if different from creator)
    IF NEW.assigned_to IS NOT NULL
       AND NEW.assigned_to IS DISTINCT FROM NEW.created_by THEN
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (
        NEW.assigned_to,
        'New task assigned to you',
        left(NEW.title, 120),
        'task',
        '/tasks/' || NEW.id
      );
    END IF;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify assignee (if not the one who changed it)
    IF NEW.assigned_to IS NOT NULL
       AND NEW.assigned_to IS DISTINCT FROM v_actor_id THEN
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (
        NEW.assigned_to,
        'Task status: ' || NEW.status,
        left(NEW.title, 120),
        'task',
        '/tasks/' || NEW.id
      );
    END IF;

    -- Notify creator (if different from assignee and from actor)
    IF NEW.created_by IS NOT NULL
       AND NEW.created_by IS DISTINCT FROM v_actor_id
       AND NEW.created_by IS DISTINCT FROM NEW.assigned_to THEN
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (
        NEW.created_by,
        'Task status: ' || NEW.status,
        left(NEW.title, 120),
        'task',
        '/tasks/' || NEW.id
      );
    END IF;
  END IF;

  -- Notify on assignment change
  IF TG_OP = 'UPDATE' AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    IF NEW.assigned_to IS NOT NULL
       AND NEW.assigned_to IS DISTINCT FROM v_actor_id THEN
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (
        NEW.assigned_to,
        'Task assigned to you',
        left(NEW.title, 120),
        'task',
        '/tasks/' || NEW.id
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_task_event_notif
  AFTER INSERT OR UPDATE ON public.crm_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_task_event();

-- Also add a trigger for ticket assignment notifications
CREATE OR REPLACE FUNCTION public.notify_on_ticket_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to
     AND NEW.assigned_to IS NOT NULL
     AND NEW.assigned_to IS DISTINCT FROM auth.uid() THEN
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (
      NEW.assigned_to,
      'Ticket #' || NEW.ticket_number || ' assigned to you',
      left(NEW.title, 120),
      'ticket',
      '/tickets/' || NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_ticket_assignment_notif
  AFTER UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_ticket_assignment();
