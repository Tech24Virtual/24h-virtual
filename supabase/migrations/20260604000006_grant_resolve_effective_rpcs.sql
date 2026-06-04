-- Grant EXECUTE on the updated 6-parameter resolve_effective_* RPCs.
--
-- Migration 20260423000210 dropped the original 5-parameter versions and
-- recreated them with a 6th parameter (p_location_id uuid DEFAULT NULL), but
-- omitted GRANT EXECUTE. The earlier grants in 20260422011549 targeted the old
-- 5-parameter signatures which no longer exist. Without this grant, every call
-- from the authenticated role fails with permission denied before the function
-- body runs — TanStack Query swallows the error, data stays undefined, and
-- the Effective tab renders 0 rows for both FAQs and Policies.

GRANT EXECUTE ON FUNCTION public.resolve_effective_faqs(
  public.campaign_tenant_kind, uuid, uuid, uuid, uuid, uuid
) TO authenticated;

GRANT EXECUTE ON FUNCTION public.resolve_effective_policies(
  public.campaign_tenant_kind, uuid, uuid, uuid, uuid, uuid
) TO authenticated;
