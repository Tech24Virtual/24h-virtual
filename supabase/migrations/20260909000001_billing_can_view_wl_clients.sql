-- WL Partner Billing page (src/pages/staff/BillingWLPartners.tsx) shows a
-- "N clients" summary next to each partner, counted client-side from
-- public.white_label_clients filtered by partner_id. No RLS SELECT policy
-- previously granted the 'billing' role access to that table (only
-- wl_client_service_config and wl_partner_usage_summary have "Billing full
-- access" policies), so the query silently returned zero rows for billing
-- staff and every partner showed "0 clients" — while the expanded panel's
-- "Active Clients" count (from wl_partner_usage_summary, computed by the
-- calculate-wl-usage edge function with the service role, bypassing RLS)
-- showed the real number. Granting billing SELECT here lets both counts
-- read from real data instead of one being silently RLS-filtered to zero.
CREATE POLICY "Billing can view white label clients"
ON public.white_label_clients
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'billing'::app_role));
