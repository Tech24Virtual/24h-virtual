
-- Phase 1 Feedback Workflows: assignment picker source
-- SECURITY DEFINER function returning the narrow, intentional list of users
-- who can handle the /admin/feedback queue today (admin role only).
-- Callable only by admins to avoid leaking user identity broadly.

CREATE OR REPLACE FUNCTION public.list_feedback_admin_handlers()
RETURNS TABLE(user_id uuid, full_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ur.user_id, COALESCE(p.full_name, '')::text AS full_name
  FROM public.user_roles ur
  LEFT JOIN public.profiles p ON p.id = ur.user_id
  WHERE ur.role = 'admin'::public.app_role
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  ORDER BY COALESCE(p.full_name, '');
$$;

REVOKE ALL ON FUNCTION public.list_feedback_admin_handlers() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_feedback_admin_handlers() TO authenticated;
