
-- ============================================================
-- WORKFLOW AUTOMATION TRIGGERS
-- Connects all dashboards via notification system
-- ============================================================

-- 1. Lead pipeline stage change notifications
CREATE OR REPLACE FUNCTION public.notify_on_pipeline_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_staff RECORD;
  v_lead_name text;
BEGIN
  -- Only fire when pipeline_stage actually changes
  IF OLD.pipeline_stage IS NOT DISTINCT FROM NEW.pipeline_stage THEN
    RETURN NEW;
  END IF;

  v_lead_name := COALESCE(NEW.name, 'Unknown');

  -- Lead moves to 'ready_for_billing'
  IF NEW.pipeline_stage = 'ready_for_billing' THEN
    -- Notify billing team
    FOR v_staff IN
      SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role = 'billing'::app_role
    LOOP
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (
        v_staff.user_id,
        'Client Ready for Billing',
        v_lead_name || ' is ready for billing setup.',
        'billing',
        '/staff/billing/client-lookup'
      );
    END LOOP;

    -- Auto-create sales commission if assigned_sales_rep exists
    IF NEW.assigned_sales_rep IS NOT NULL THEN
      INSERT INTO public.sales_commissions (sales_rep_id, lead_id, base_amount, commission_rate, commission_amount, status)
      VALUES (
        NEW.assigned_sales_rep,
        NEW.id,
        COALESCE(NEW.plan_minutes, 0) * COALESCE(NEW.custom_minute_rate, 1.39),
        0.10,
        COALESCE(NEW.plan_minutes, 0) * COALESCE(NEW.custom_minute_rate, 1.39) * 0.10,
        'pending'
      );
    END IF;
  END IF;

  -- Lead moves to 'active'
  IF NEW.pipeline_stage = 'active' THEN
    -- Notify supervisors
    FOR v_staff IN
      SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role = 'supervisor'::app_role
    LOOP
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (
        v_staff.user_id,
        'New Active Client',
        v_lead_name || ' is now active and may need agent assignments.',
        'client',
        '/admin/leads/' || NEW.id
      );
    END LOOP;

    -- Notify assigned agents if any
    FOR v_staff IN
      SELECT DISTINCT agent_id FROM public.client_agent_assignments WHERE client_id = NEW.id
    LOOP
      INSERT INTO public.notifications (user_id, title, message, category, action_url)
      VALUES (
        v_staff.agent_id,
        'New Client Assigned',
        'You have been assigned to ' || v_lead_name || '.',
        'client',
        '/staff/agent/clients'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger on leads table for pipeline_stage changes
DROP TRIGGER IF EXISTS trg_notify_pipeline_stage_change ON public.leads;
CREATE TRIGGER trg_notify_pipeline_stage_change
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_pipeline_stage_change();


-- 2. WL client billing_verified change notification
CREATE OR REPLACE FUNCTION public.notify_on_wl_client_verification_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_partner_user_id uuid;
  v_client_name text;
  v_status_text text;
BEGIN
  -- Only fire when billing_verified changes
  IF OLD.billing_verified IS NOT DISTINCT FROM NEW.billing_verified THEN
    RETURN NEW;
  END IF;

  -- Get the client name
  SELECT client_name INTO v_client_name
  FROM public.white_label_clients
  WHERE id = NEW.wl_client_id;

  -- Get the partner's user_id
  SELECT user_id INTO v_partner_user_id
  FROM public.white_label_partners
  WHERE id = NEW.partner_id;

  IF NEW.billing_verified THEN
    v_status_text := 'verified';
  ELSE
    v_status_text := 'unverified';
  END IF;

  -- Notify the WL partner
  IF v_partner_user_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (
      v_partner_user_id,
      'Client Verification Updated',
      COALESCE(v_client_name, 'A client') || ' has been ' || v_status_text || '.',
      'billing',
      '/white-label-dashboard/clients'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_wl_verification_change ON public.wl_client_service_config;
CREATE TRIGGER trg_notify_wl_verification_change
  AFTER UPDATE ON public.wl_client_service_config
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_wl_client_verification_change();


-- 3. New WL client (unverified) → Notify billing team
CREATE OR REPLACE FUNCTION public.notify_on_new_wl_client()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_staff RECORD;
  v_partner_name text;
BEGIN
  -- Get partner name
  SELECT company_name INTO v_partner_name
  FROM public.white_label_partners
  WHERE id = NEW.partner_id;

  -- Notify billing team about unverified client
  FOR v_staff IN
    SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role = 'billing'::app_role
  LOOP
    INSERT INTO public.notifications (user_id, title, message, category, action_url)
    VALUES (
      v_staff.user_id,
      'New WL Client Needs Verification',
      NEW.client_name || ' added by ' || COALESCE(v_partner_name, 'Unknown partner') || '. Billing verification required.',
      'billing',
      '/staff/billing/wl-partners'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_wl_client ON public.white_label_clients;
CREATE TRIGGER trg_notify_new_wl_client
  AFTER INSERT ON public.white_label_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_new_wl_client();


-- 4. WL ticket → Notify billing + supervisor teams
CREATE OR REPLACE FUNCTION public.notify_on_wl_portal_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_staff RECORD;
BEGIN
  -- Only for new tickets from white_label_portal
  IF NEW.source != 'white_label_portal' THEN
    RETURN NEW;
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
$$;

DROP TRIGGER IF EXISTS trg_notify_wl_portal_ticket ON public.support_tickets;
CREATE TRIGGER trg_notify_wl_portal_ticket
  AFTER INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_on_wl_portal_ticket();
