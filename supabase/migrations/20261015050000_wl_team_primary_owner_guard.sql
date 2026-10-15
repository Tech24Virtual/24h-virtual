-- Protect a WL partner's primary owner (white_label_partners.user_id) on the
-- Team page. Previously any owner/manager member could change the primary
-- owner's role or delete their membership row, and any manager could grant
-- the 'owner' role.

CREATE OR REPLACE FUNCTION public.wl_is_primary_owner(_partner_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.white_label_partners p
    WHERE p.id = _partner_id AND p.user_id = _user_id
  );
$$;

REVOKE ALL ON FUNCTION public.wl_is_primary_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.wl_is_primary_owner(uuid, uuid) TO authenticated, service_role;

ALTER POLICY "wl_pm_update_managers" ON public.wl_partner_members
  USING (
    (user_id IS DISTINCT FROM auth.uid())
    AND wl_is_partner_manager(partner_id, auth.uid())
    AND NOT public.wl_is_primary_owner(partner_id, user_id)
  )
  WITH CHECK (
    wl_is_partner_manager(partner_id, auth.uid())
    AND (role <> 'owner' OR public.wl_is_primary_owner(partner_id, auth.uid()))
  );

ALTER POLICY "wl_pm_delete_managers" ON public.wl_partner_members
  USING (
    (user_id IS DISTINCT FROM auth.uid())
    AND wl_is_partner_manager(partner_id, auth.uid())
    AND NOT public.wl_is_primary_owner(partner_id, user_id)
  );

ALTER POLICY "wl_pm_insert_managers" ON public.wl_partner_members
  WITH CHECK (
    wl_is_partner_manager(partner_id, auth.uid())
    AND (role <> 'owner' OR public.wl_is_primary_owner(partner_id, auth.uid()))
  );
