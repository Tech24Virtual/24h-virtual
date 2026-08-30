-- Billing staff need to search/view all leads via Client Lookup
-- (src/pages/staff/BillingClientLookup.tsx), but no RLS SELECT policy
-- previously granted the 'billing' role access to public.leads — the
-- query silently returned zero rows for every search.
CREATE POLICY "Billing can view all leads"
ON public.leads
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'billing'::app_role));
