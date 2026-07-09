-- Fix: ticket-related notifications were linking to a bare '/tickets/:id',
-- which is not a route anywhere in the app (only role-scoped variants exist:
-- /admin/tickets/:id, /staff/<role>/tickets/:id, /hr-portal/tickets/:id,
-- /client-dashboard/support/:id, /white-label-dashboard/account/support/:id).
-- Recipients of these notifications span multiple roles (admin, supervisor,
-- agent, sales, billing, tech, hr, client, white_label — confirmed live via
-- DISTINCT roles on support_tickets.submitted_by/assigned_to), so a single
-- hardcoded path can't be correct for everyone. wl_client has no per-ticket
-- detail route at all, so it resolves to NULL — both notification UIs
-- (NotificationList.tsx, AgentNotifications.tsx) already skip rendering the
-- "View" affordance when action_url is null.

CREATE OR REPLACE FUNCTION public.get_ticket_url_for_role_name(p_role text, p_ticket_id uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_role
    WHEN 'admin'       THEN '/admin/tickets/' || p_ticket_id
    WHEN 'supervisor'  THEN '/staff/supervisor/tickets/' || p_ticket_id
    WHEN 'agent'       THEN '/staff/agent/tickets/' || p_ticket_id
    WHEN 'sales'       THEN '/staff/sales/tickets/' || p_ticket_id
    WHEN 'billing'     THEN '/staff/billing/tickets/' || p_ticket_id
    WHEN 'tech'        THEN '/staff/tech/tickets/' || p_ticket_id
    WHEN 'hr'          THEN '/hr-portal/tickets/' || p_ticket_id
    WHEN 'client'      THEN '/client-dashboard/support/' || p_ticket_id
    WHEN 'white_label' THEN '/white-label-dashboard/account/support/' || p_ticket_id
    ELSE NULL -- wl_client, affiliate, referrer: no per-ticket detail route exists
  END;
$$;

-- A user can hold more than one role; pick the one most likely to be
-- ticket-relevant so the link goes somewhere that user can actually reach.
CREATE OR REPLACE FUNCTION public.get_ticket_url_for_role(p_user_id uuid, p_ticket_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  SELECT role::text INTO v_role
  FROM public.user_roles
  WHERE user_id = p_user_id
  ORDER BY CASE role::text
    WHEN 'admin'       THEN 1
    WHEN 'supervisor'  THEN 2
    WHEN 'agent'       THEN 3
    WHEN 'billing'     THEN 4
    WHEN 'sales'       THEN 5
    WHEN 'tech'        THEN 6
    WHEN 'hr'          THEN 7
    WHEN 'client'      THEN 8
    WHEN 'white_label' THEN 9
    ELSE 10
  END
  LIMIT 1;

  RETURN public.get_ticket_url_for_role_name(v_role, p_ticket_id);
END;
$$;

REVOKE ALL ON FUNCTION public.get_ticket_url_for_role_name(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_ticket_url_for_role(uuid, uuid) FROM PUBLIC;

-- ─────────────────────────────────────────────────────────────────────────────
-- notify_on_ticket_reply — per-recipient URL instead of one shared bare path
-- ─────────────────────────────────────────────────────────────────────────────
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

  -- Notify submitted_by
  IF v_ticket.submitted_by IS NOT NULL
     AND v_ticket.submitted_by IS DISTINCT FROM v_reply_author_id THEN
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (v_ticket.submitted_by, v_title, v_message, 'ticket',
            public.get_ticket_url_for_role(v_ticket.submitted_by, v_ticket.id));
    v_notified_ids := v_notified_ids || v_ticket.submitted_by;
  END IF;

  -- Notify assigned_to
  IF v_ticket.assigned_to IS NOT NULL
     AND v_ticket.assigned_to IS DISTINCT FROM v_reply_author_id
     AND v_ticket.assigned_to IS DISTINCT FROM v_ticket.submitted_by THEN
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (v_ticket.assigned_to, v_title, v_message, 'ticket',
            public.get_ticket_url_for_role(v_ticket.assigned_to, v_ticket.id));
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

  -- Fan-out recipients are all members of one role queue, so one URL applies to all of them.
  PERFORM public.fanout_ticket_dept_notifications(
    v_queue, v_fanout_exclude_ids, v_title, v_message,
    public.get_ticket_url_for_role_name(v_queue, v_ticket.id)
  );

  RETURN NEW;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- update_ticket_activity_on_status_change — same fix
-- ─────────────────────────────────────────────────────────────────────────────
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

    -- Notify submitted_by
    IF NEW.submitted_by IS NOT NULL
       AND NEW.submitted_by IS DISTINCT FROM v_changer_id THEN
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (NEW.submitted_by, v_title, v_message, 'ticket',
              public.get_ticket_url_for_role(NEW.submitted_by, NEW.id));
      v_notified_ids := v_notified_ids || NEW.submitted_by;
    END IF;

    -- Notify assigned_to
    IF NEW.assigned_to IS NOT NULL
       AND NEW.assigned_to IS DISTINCT FROM v_changer_id
       AND NEW.assigned_to IS DISTINCT FROM NEW.submitted_by THEN
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (NEW.assigned_to, v_title, v_message, 'ticket',
              public.get_ticket_url_for_role(NEW.assigned_to, NEW.id));
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
      v_queue, v_fanout_exclude_ids, v_title, v_message,
      public.get_ticket_url_for_role_name(v_queue, NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- ─────────────────────────────────────────────────────────────────────────────
-- notify_on_ticket_assignment — single recipient (NEW.assigned_to)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_on_ticket_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
      public.get_ticket_url_for_role(NEW.assigned_to, NEW.id)
    );
  END IF;
  RETURN NEW;
END;
$function$;

-- Backfill: repoint existing bad '/tickets/:id' rows (missing role prefix) to
-- the correct destination for each notification's own recipient.
UPDATE public.notifications n
SET action_url = public.get_ticket_url_for_role(n.user_id, (regexp_match(n.action_url, '^/tickets/(.+)$'))[1]::uuid)
WHERE n.action_url ~ '^/tickets/[0-9a-f-]+$';
