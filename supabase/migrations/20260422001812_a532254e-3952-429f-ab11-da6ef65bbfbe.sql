
-- Fix function search_path on the three campaign helpers
ALTER FUNCTION public.enforce_campaign_tenant_identity() SET search_path = public;
ALTER FUNCTION public.enforce_campaign_identity_immutable() SET search_path = public;
ALTER FUNCTION public.campaign_touch_updated_at() SET search_path = public;

-- Recreate v_tenant_brand with security_invoker so RLS of base tables applies
DROP VIEW IF EXISTS public.v_tenant_brand;
CREATE VIEW public.v_tenant_brand
WITH (security_invoker = true) AS
WITH overrides AS (
  SELECT tbp.tenant_kind, tbp.wl_partner_id, tbp.client_lead_id, tbp.wl_client_id,
    tbp.brand_label, tbp.logo_url, tbp.primary_color, tbp.secondary_color, tbp.accent_color,
    tbp.sender_name, tbp.sender_email, tbp.support_email, tbp.support_phone,
    tbp.footer_html, tbp.social_links, 'override'::text AS source
  FROM public.tenant_brand_profiles tbp
),
wl_brand AS (
  SELECT 'wl_partner'::public.campaign_tenant_kind AS tenant_kind,
    wlb.partner_id AS wl_partner_id, NULL::uuid AS client_lead_id, NULL::uuid AS wl_client_id,
    wlb.company_name AS brand_label, wlb.logo_url,
    wlb.primary_color, wlb.secondary_color, wlb.accent_color,
    COALESCE(wlb.email_from_name, wlb.company_name) AS sender_name,
    COALESCE(wlb.email_from_address, wlb.support_email) AS sender_email,
    wlb.support_email, wlb.support_phone,
    wlb.email_footer AS footer_html, '{}'::jsonb AS social_links,
    'wl_branding'::text AS source
  FROM public.white_label_branding wlb
)
SELECT * FROM overrides
UNION ALL
SELECT * FROM wl_brand
WHERE NOT EXISTS (
  SELECT 1 FROM overrides o
  WHERE o.tenant_kind = 'wl_partner'
    AND o.wl_partner_id = wl_brand.wl_partner_id
    AND o.wl_client_id IS NULL
);

-- Tighten supervisor UPDATE policies: must also be tenant member (admin policy already grants full access)
DROP POLICY IF EXISTS tenant_brand_profiles_supervisor_update ON public.tenant_brand_profiles;
CREATE POLICY tenant_brand_profiles_supervisor_update ON public.tenant_brand_profiles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'::app_role) AND public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id))
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'::app_role) AND public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));

DROP POLICY IF EXISTS client_contacts_supervisor_update ON public.client_contacts;
CREATE POLICY client_contacts_supervisor_update ON public.client_contacts
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'::app_role) AND public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id))
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'::app_role) AND public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));

DROP POLICY IF EXISTS client_departments_supervisor_update ON public.client_departments;
CREATE POLICY client_departments_supervisor_update ON public.client_departments
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'::app_role) AND public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id))
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'::app_role) AND public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));

DROP POLICY IF EXISTS department_numbers_supervisor_update ON public.department_numbers;
CREATE POLICY department_numbers_supervisor_update ON public.department_numbers
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'supervisor'::app_role) AND public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id))
  WITH CHECK (public.has_role(auth.uid(), 'supervisor'::app_role) AND public.is_tenant_member(auth.uid(), tenant_kind::text, wl_partner_id, client_lead_id, wl_client_id));
