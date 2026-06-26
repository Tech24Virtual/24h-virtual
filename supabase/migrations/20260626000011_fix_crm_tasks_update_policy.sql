-- The original "Staff can update tasks" policy (migration 20260206010959) had two problems:
-- 1. No TO clause — applied to PUBLIC instead of authenticated, which Supabase PostgREST
--    treats differently from explicit authenticated grants.
-- 2. No WITH CHECK clause — defaulted to the USING expression, which is correct in theory
--    but ambiguous when combined with FOR ALL policies that have their own WITH CHECK.
-- Result: agents and supervisors saw a silent 0-row UPDATE with no error returned.

DROP POLICY IF EXISTS "Staff can update tasks" ON public.crm_tasks;

CREATE POLICY "Staff can update tasks"
  ON public.crm_tasks FOR UPDATE TO authenticated
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

-- Ensure the GRANT covers UPDATE (belt-and-suspenders — also in 20260624000003).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_tasks TO authenticated;
