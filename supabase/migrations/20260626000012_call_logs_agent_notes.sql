-- Add agent_notes to call_logs so agents can annotate calls independently of
-- Five9-imported notes (the existing 'notes' column). Kept separate so re-imports
-- never overwrite an agent's manual annotations.
ALTER TABLE public.call_logs ADD COLUMN IF NOT EXISTS agent_notes text;

-- Agents, sales, supervisors, and admins need UPDATE to save agent_notes.
GRANT UPDATE ON public.call_logs TO authenticated;

-- RLS UPDATE policy: any staff member can update a call log (scoped to agent_notes in app code).
-- We don't restrict by agent_id here because supervisors need to annotate any call.
DROP POLICY IF EXISTS "Staff can update call logs" ON public.call_logs;

CREATE POLICY "Staff can update call logs"
  ON public.call_logs FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'agent'::app_role)      OR
    has_role(auth.uid(), 'sales'::app_role)       OR
    has_role(auth.uid(), 'supervisor'::app_role)  OR
    has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'agent'::app_role)      OR
    has_role(auth.uid(), 'sales'::app_role)       OR
    has_role(auth.uid(), 'supervisor'::app_role)  OR
    has_role(auth.uid(), 'admin'::app_role)
  );
