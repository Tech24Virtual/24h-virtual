-- Make candidate views respect caller RLS
ALTER VIEW public.v_candidate_faqs SET (security_invoker = true);
ALTER VIEW public.v_candidate_policies SET (security_invoker = true);

-- Replace FOR ALL admin policy with explicit narrow policies
DROP POLICY IF EXISTS "client_locations_admin_all" ON public.client_locations;

CREATE POLICY "client_locations_admin_insert" ON public.client_locations
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "client_locations_admin_update" ON public.client_locations
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "client_locations_admin_delete" ON public.client_locations
  FOR DELETE USING (public.has_role(auth.uid(), 'admin'::app_role));