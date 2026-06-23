-- Grant table-level access so authenticated users can reach RLS policies.
-- Without this PostgREST returns 403 before any policy is evaluated.
GRANT SELECT, INSERT, UPDATE ON public.support_requests TO authenticated;

-- Allow any authenticated user to INSERT their own request
CREATE POLICY "Users can create support requests"
  ON public.support_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow users to read their own requests
CREATE POLICY "Users can view own support requests"
  ON public.support_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Allow users to update their own requests (mark resolved, escalate)
CREATE POLICY "Users can update own support requests"
  ON public.support_requests FOR UPDATE TO authenticated
  USING (user_id = auth.uid());
