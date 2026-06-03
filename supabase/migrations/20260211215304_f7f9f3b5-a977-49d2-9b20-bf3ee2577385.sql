
-- Fix overly permissive FOR ALL policy on client_quick_links
DROP POLICY "Supervisors can manage all quick links" ON public.client_quick_links;

CREATE POLICY "Supervisors can view all quick links"
  ON public.client_quick_links FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors can insert quick links"
  ON public.client_quick_links FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors can update quick links"
  ON public.client_quick_links FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Supervisors can delete quick links"
  ON public.client_quick_links FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor') OR public.has_role(auth.uid(), 'admin'));
