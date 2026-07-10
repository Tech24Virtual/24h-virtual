-- Add department assignment to crm_tasks
ALTER TABLE public.crm_tasks
  ADD COLUMN IF NOT EXISTS assigned_department text;

-- Update RLS: grant billing/tech/hr same access as agent/sales/supervisor/admin
DROP POLICY IF EXISTS "Staff can view all tasks" ON public.crm_tasks;
CREATE POLICY "Staff can view all tasks" ON public.crm_tasks
  FOR SELECT USING (
    has_role(auth.uid(), 'agent'::app_role) OR
    has_role(auth.uid(), 'sales'::app_role) OR
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'billing'::app_role) OR
    has_role(auth.uid(), 'tech'::app_role) OR
    has_role(auth.uid(), 'hr'::app_role)
  );

DROP POLICY IF EXISTS "Staff can update tasks" ON public.crm_tasks;
CREATE POLICY "Staff can update tasks" ON public.crm_tasks
  FOR UPDATE USING (
    has_role(auth.uid(), 'agent'::app_role) OR
    has_role(auth.uid(), 'sales'::app_role) OR
    has_role(auth.uid(), 'supervisor'::app_role) OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'billing'::app_role) OR
    has_role(auth.uid(), 'tech'::app_role) OR
    has_role(auth.uid(), 'hr'::app_role)
  );

-- Allow department-assigned tasks to be managed by matching role users.
-- Uses IN rather than a `LIMIT 1` scalar subquery so multi-role users
-- (e.g. a supervisor who also holds the agent role) match on ANY of their
-- roles rather than an arbitrary single row from user_roles.
DROP POLICY IF EXISTS "Users can manage assigned tasks" ON public.crm_tasks;
CREATE POLICY "Users can manage assigned tasks" ON public.crm_tasks
  FOR ALL USING (
    assigned_to = auth.uid()
    OR assigned_department IN (
      SELECT role::text FROM public.user_roles
      WHERE user_id = auth.uid()
    )
  );
