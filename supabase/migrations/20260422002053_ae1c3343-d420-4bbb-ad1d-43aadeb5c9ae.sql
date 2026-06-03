
-- Replace the always-true SELECT policies with tenant-aware ones
DROP POLICY IF EXISTS campaign_field_visibility_rules_select ON public.campaign_field_visibility_rules;
CREATE POLICY campaign_field_visibility_rules_select ON public.campaign_field_visibility_rules
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'supervisor'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.campaign_fields f
      WHERE f.id = field_id
        AND (
          f.scope = 'global'
          OR public.is_tenant_member(auth.uid(), f.tenant_kind::text, f.wl_partner_id, f.client_lead_id, f.wl_client_id)
        )
    )
  );

DROP POLICY IF EXISTS campaign_field_display_labels_select ON public.campaign_field_display_labels;
CREATE POLICY campaign_field_display_labels_select ON public.campaign_field_display_labels
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'supervisor'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.campaign_fields f
      WHERE f.id = field_id
        AND (
          f.scope = 'global'
          OR public.is_tenant_member(auth.uid(), f.tenant_kind::text, f.wl_partner_id, f.client_lead_id, f.wl_client_id)
        )
    )
  );
