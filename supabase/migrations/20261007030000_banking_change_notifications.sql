-- Notify every HR user when banking details are created or changed by anyone other than HR.
-- Done as a trigger (not client-side) so edits by billing/admin are also caught and the
-- notifications table's insert RLS is not an obstacle for agents.
CREATE OR REPLACE FUNCTION public.agent_banking_notify_hr()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  agent_label text;
  actor_label text;
  msg text;
  bank_changed boolean;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    bank_changed :=
         NEW.bank_name IS DISTINCT FROM OLD.bank_name
      OR NEW.account_holder_name IS DISTINCT FROM OLD.account_holder_name
      OR NEW.account_number_encrypted IS DISTINCT FROM OLD.account_number_encrypted
      OR NEW.routing_number IS DISTINCT FROM OLD.routing_number
      OR NEW.institution_number IS DISTINCT FROM OLD.institution_number
      OR NEW.transit_number IS DISTINCT FROM OLD.transit_number
      OR NEW.account_type IS DISTINCT FROM OLD.account_type
      OR NEW.swift_bic IS DISTINCT FROM OLD.swift_bic
      OR NEW.iban IS DISTINCT FROM OLD.iban
      OR NEW.currency IS DISTINCT FROM OLD.currency
      OR NEW.country IS DISTINCT FROM OLD.country
      OR NEW.payment_method IS DISTINCT FROM OLD.payment_method
      OR NEW.e_transfer_email IS DISTINCT FROM OLD.e_transfer_email
      OR NEW.home_address IS DISTINCT FROM OLD.home_address;
    IF NOT bank_changed THEN
      RETURN NEW;
    END IF;
  END IF;

  -- HR editing banking themselves doesn't need to alert HR
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'hr'::app_role) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, 'An agent') INTO agent_label FROM public.profiles WHERE id = NEW.agent_id;
  agent_label := COALESCE(agent_label, 'An agent');

  IF auth.uid() IS NULL OR auth.uid() = NEW.agent_id THEN
    msg := 'Banking details updated by ' || agent_label || ' — please review before next payroll';
  ELSE
    SELECT COALESCE(full_name, 'staff') INTO actor_label FROM public.profiles WHERE id = auth.uid();
    msg := 'Banking details for ' || agent_label || ' updated by ' || COALESCE(actor_label, 'staff')
           || ' — please review before next payroll';
  END IF;

  INSERT INTO public.notifications (user_id, title, message, type, category, is_read, action_url, metadata)
  SELECT ur.user_id, 'Banking details updated', msg, 'banking_change', 'payroll', false, '/hr-portal/payroll',
         jsonb_build_object('agent_id', NEW.agent_id, 'operation', TG_OP, 'changed_by', auth.uid())
  FROM public.user_roles ur
  WHERE ur.role = 'hr'::app_role;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS agent_banking_notify_hr ON public.agent_banking;
CREATE TRIGGER agent_banking_notify_hr
  AFTER INSERT OR UPDATE ON public.agent_banking
  FOR EACH ROW EXECUTE FUNCTION public.agent_banking_notify_hr();
