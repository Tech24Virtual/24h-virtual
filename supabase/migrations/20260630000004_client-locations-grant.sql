-- client_locations: created in 20260423000210 with RLS policies (admin_all,
-- tenant_select) but no table-level GRANT was ever issued.
-- Without GRANT the role is blocked before RLS evaluates, causing:
--   - useClientLocations() → empty list / 403
--   - useCreateLocation() → 403 on INSERT
--   - useUpdateLocation() / useArchiveLocation() → 403 on UPDATE
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_locations TO authenticated;
