-- Allow all staff to view all tasks for collaboration
CREATE POLICY "Staff can view all tasks"
  ON crm_tasks FOR SELECT
  USING (
    has_role(auth.uid(), 'agent'::app_role) OR
    has_role(auth.uid(), 'sales'::app_role) OR
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Allow staff to update tasks (complete permission enforced in app code)
CREATE POLICY "Staff can update tasks"
  ON crm_tasks FOR UPDATE
  USING (
    has_role(auth.uid(), 'agent'::app_role) OR
    has_role(auth.uid(), 'sales'::app_role) OR
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Update ticket visibility: Staff can view tickets assigned to them or their department
DROP POLICY IF EXISTS "Sales can view sales tickets" ON support_tickets;
DROP POLICY IF EXISTS "Agents can view client portal tickets" ON support_tickets;
DROP POLICY IF EXISTS "Supervisors can view client portal tickets" ON support_tickets;
DROP POLICY IF EXISTS "Billing staff can view billing tickets" ON support_tickets;

-- New unified staff ticket visibility policy
CREATE POLICY "Staff can view relevant tickets"
  ON support_tickets FOR SELECT
  USING (
    -- Admin sees all
    has_role(auth.uid(), 'admin'::app_role) OR
    -- Ticket assigned to current user
    assigned_to = auth.uid() OR
    -- User submitted the ticket
    submitted_by = auth.uid() OR
    -- Sales sees sales source OR sales category
    (has_role(auth.uid(), 'sales'::app_role) AND (source = 'sales' OR category = 'sales' OR category = 'sales_inquiry')) OR
    -- Agents see agent source OR client portal tickets
    (has_role(auth.uid(), 'agent'::app_role) AND (source = 'agent' OR source = 'client_portal')) OR
    -- Supervisors see agent/supervisor tickets
    (has_role(auth.uid(), 'supervisor'::app_role) AND (source IN ('agent', 'supervisor', 'client_portal'))) OR
    -- Billing sees billing tickets
    (has_role(auth.uid(), 'billing'::app_role) AND (source = 'billing' OR category = 'billing'))
  );