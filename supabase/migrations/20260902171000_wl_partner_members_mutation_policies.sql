-- wl_partner_members previously had SELECT-only grants and no INSERT/UPDATE/DELETE
-- RLS policies (by original design: "mutations go through service-role edge
-- function"). The WL Team page performs these mutations directly from the client,
-- so under FORCE ROW LEVEL SECURITY every UPDATE/DELETE matched zero rows and
-- silently no-op'd (PostgREST returns 200/204 for a 0-row match, not an error) —
-- role changes and removals appeared to succeed but never persisted.

GRANT INSERT, UPDATE, DELETE ON public.wl_partner_members TO authenticated;

CREATE OR REPLACE FUNCTION public.wl_is_partner_manager(_partner_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.wl_partner_members m
    WHERE m.partner_id = _partner_id
      AND m.user_id = _user_id
      AND m.status = 'active'
      AND m.role IN ('owner', 'manager')
  );
$$;

DROP POLICY IF EXISTS wl_pm_insert_managers ON public.wl_partner_members;
CREATE POLICY wl_pm_insert_managers
ON public.wl_partner_members
FOR INSERT
TO authenticated
WITH CHECK (public.wl_is_partner_manager(partner_id, auth.uid()));

-- A manager/owner may update any other member's row in their own partner, but not
-- their own (role changes/removal of self must go through a different flow so an
-- owner can't accidentally lock themselves out).
DROP POLICY IF EXISTS wl_pm_update_managers ON public.wl_partner_members;
CREATE POLICY wl_pm_update_managers
ON public.wl_partner_members
FOR UPDATE
TO authenticated
USING (
  user_id IS DISTINCT FROM auth.uid()
  AND public.wl_is_partner_manager(partner_id, auth.uid())
)
WITH CHECK (public.wl_is_partner_manager(partner_id, auth.uid()));

DROP POLICY IF EXISTS wl_pm_delete_managers ON public.wl_partner_members;
CREATE POLICY wl_pm_delete_managers
ON public.wl_partner_members
FOR DELETE
TO authenticated
USING (
  user_id IS DISTINCT FROM auth.uid()
  AND public.wl_is_partner_manager(partner_id, auth.uid())
);
