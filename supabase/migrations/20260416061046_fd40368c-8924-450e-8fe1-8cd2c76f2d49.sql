
-- =============================================
-- Phase 1A: Add work_queue and escalation columns to support_tickets
-- =============================================
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS work_queue text,
  ADD COLUMN IF NOT EXISTS wl_client_id uuid REFERENCES public.white_label_clients(id),
  ADD COLUMN IF NOT EXISTS linked_wl_client_ticket_id uuid;

-- Backfill work_queue from source
UPDATE public.support_tickets SET work_queue = source WHERE work_queue IS NULL;

-- Index for work_queue filtering
CREATE INDEX IF NOT EXISTS idx_support_tickets_work_queue ON public.support_tickets(work_queue);

-- =============================================
-- Phase 1B: Add escalation columns to wl_client_tickets
-- =============================================
ALTER TABLE public.wl_client_tickets
  ADD COLUMN IF NOT EXISTS linked_support_ticket_id uuid REFERENCES public.support_tickets(id),
  ADD COLUMN IF NOT EXISTS is_escalated_to_24h boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS mask_24h_from_client boolean DEFAULT true;

-- Add FK for linked_wl_client_ticket_id now that both tables exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'support_tickets_linked_wl_client_ticket_id_fkey'
  ) THEN
    ALTER TABLE public.support_tickets
      ADD CONSTRAINT support_tickets_linked_wl_client_ticket_id_fkey
      FOREIGN KEY (linked_wl_client_ticket_id) REFERENCES public.wl_client_tickets(id);
  END IF;
END $$;

-- =============================================
-- Phase 1C: Add visible_to_partner on ticket_replies
-- =============================================
ALTER TABLE public.ticket_replies
  ADD COLUMN IF NOT EXISTS visible_to_partner boolean DEFAULT false;

-- =============================================
-- Phase 1D: Enable realtime for WL ticket tables
-- =============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.wl_client_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE public.wl_client_ticket_replies;

-- =============================================
-- Phase 1E: Update trigger functions to use work_queue for fan-out
-- =============================================

-- Update the status change trigger to use work_queue
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
  v_queue text;
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_changer_id := auth.uid();
    NEW.last_activity_at = now();
    NEW.last_activity_by = v_changer_id;
    v_notified_ids := v_notified_ids || v_changer_id;

    -- Use work_queue for routing, fall back to source
    v_queue := COALESCE(NEW.work_queue, NEW.source);
    v_is_cross_dept := (NEW.originating_source IS DISTINCT FROM v_queue);

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

    -- Department fan-out using work_queue
    FOR v_dept_user IN
      SELECT ur.user_id
      FROM public.user_roles ur
      WHERE ur.role::text = v_queue
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

-- Update the reply notification trigger to use work_queue
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
  v_queue text;
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

  -- Use work_queue for routing, fall back to source
  v_queue := COALESCE(v_ticket.work_queue, v_ticket.source);
  v_is_cross_dept := (v_ticket.originating_source IS DISTINCT FROM v_queue);

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

  -- Department fan-out using work_queue
  FOR v_dept_user IN
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role::text = v_queue
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

-- =============================================
-- Phase 1F: RLS for WL partner read access to escalated System A tickets
-- =============================================

-- Allow WL partners to read escalated support tickets linked to their partner_id
CREATE POLICY "WL partners can view escalated tickets"
  ON public.support_tickets
  FOR SELECT
  TO authenticated
  USING (
    partner_id IS NOT NULL
    AND originating_source = 'white_label_escalation'
    AND public.has_role(auth.uid(), 'white_label')
    AND partner_id IN (
      SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()
    )
  );

-- Allow WL partners to read replies on escalated tickets (only visible_to_partner or non-internal)
CREATE POLICY "WL partners can view escalated ticket replies"
  ON public.ticket_replies
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'white_label')
    AND (visible_to_partner = true OR is_internal = false)
    AND ticket_id IN (
      SELECT id FROM public.support_tickets
      WHERE partner_id IN (
        SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()
      )
      AND originating_source = 'white_label_escalation'
    )
  );

-- Update the WL portal ticket trigger to also use work_queue
CREATE OR REPLACE FUNCTION public.notify_on_wl_portal_ticket()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_staff RECORD;
BEGIN
  -- Only for new tickets from white_label_portal
  IF NEW.source != 'white_label_portal' THEN
    RETURN NEW;
  END IF;

  -- Ensure work_queue is set
  IF NEW.work_queue IS NULL THEN
    NEW.work_queue := 'supervisor';
  END IF;

  FOR v_staff IN
    SELECT DISTINCT ur.user_id FROM public.user_roles ur
    WHERE ur.role IN ('billing'::app_role, 'supervisor'::app_role)
  LOOP
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (
      v_staff.user_id,
      'WL Partner Ticket #' || NEW.ticket_number,
      left(NEW.title, 120),
      'ticket',
      '/admin/tickets/' || NEW.id
    );
  END LOOP;

  RETURN NEW;
END;
$function$;
