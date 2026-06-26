-- Fix: supervisors had no INSERT policy on crm_tasks, so their task creation was silently blocked.
-- Also add explicit INSERT policy for all staff (agents, sales, supervisors) to cover any gaps.

CREATE POLICY "Supervisors can create tasks"
  ON public.crm_tasks FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'supervisor'::app_role)
    OR has_role(auth.uid(), 'sales'::app_role)
  );

-- Grant table-level permissions so RLS policies can fire
GRANT SELECT, INSERT, UPDATE ON public.crm_tasks TO authenticated;

-- task_notes: grant full DML so staff can add, edit, and delete notes
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_notes TO authenticated;

-- Replace the overly broad task_notes policies with targeted role-based ones.
-- Drop both the originally requested name and the name actually used in the prior block.
DROP POLICY IF EXISTS "Users can manage task notes" ON public.task_notes;
DROP POLICY IF EXISTS "Authenticated users can manage own task notes" ON public.task_notes;
-- Also drop the earlier staff-role policies from migration 20260206013115 so there
-- are no overlapping SELECT/INSERT policies that could confuse the permission model.
DROP POLICY IF EXISTS "Staff can view task notes" ON public.task_notes;
DROP POLICY IF EXISTS "Staff can add task notes" ON public.task_notes;

-- Admins and supervisors can read and write all notes
CREATE POLICY "Admins and supervisors can manage all task notes"
  ON public.task_notes FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'supervisor'::app_role)
  );

-- Agents and sales can read notes on tasks they are assigned to or created.
-- Using assigned_to = auth.uid() is the primary check; created_by handles tasks
-- the agent self-created. NULL created_by (outbound tasks pre-fix) is fine because
-- the OR short-circuits on the assigned_to clause.
CREATE POLICY "Agents can see notes on their tasks"
  ON public.task_notes FOR SELECT TO authenticated
  USING (
    (
      has_role(auth.uid(), 'agent'::app_role)
      OR has_role(auth.uid(), 'sales'::app_role)
    )
    AND task_id IN (
      SELECT id FROM public.crm_tasks
      WHERE assigned_to = auth.uid()
         OR created_by  = auth.uid()
    )
  );

-- Agents and sales can insert notes on tasks they own or are assigned to.
-- Admin/supervisor access is covered by the FOR ALL policy above.
CREATE POLICY "Users can add notes to their tasks"
  ON public.task_notes FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'supervisor'::app_role)
    OR (
      (
        has_role(auth.uid(), 'agent'::app_role)
        OR has_role(auth.uid(), 'sales'::app_role)
      )
      AND task_id IN (
        SELECT id FROM public.crm_tasks
        WHERE assigned_to = auth.uid()
           OR created_by  = auth.uid()
      )
    )
  );
