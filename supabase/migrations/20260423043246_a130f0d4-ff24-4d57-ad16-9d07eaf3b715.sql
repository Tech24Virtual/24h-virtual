-- Update campaign_go_live_checks to recognize a script as published when there is
-- any campaign_script_documents row with status='published' for the campaign,
-- regardless of whether campaigns.published_version_id has been backfilled.
CREATE OR REPLACE VIEW public.campaign_go_live_checks
WITH (security_invoker='true') AS
SELECT
  c.id AS campaign_id,
  c.client_department_id,
  EXISTS (
    SELECT 1
    FROM campaign_script_documents d
    WHERE d.campaign_id = c.id AND d.status = 'published'
  ) OR c.published_version_id IS NOT NULL AS script_published,
  COALESCE((
    SELECT count(*)::integer
    FROM campaign_faq_entries f
    WHERE f.status = 'approved'
      AND (
        f.client_department_id = c.client_department_id
        OR f.scope = 'global'
        OR (f.scope = 'tenant'
            AND f.tenant_kind = c.tenant_kind
            AND COALESCE(f.wl_partner_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(c.wl_partner_id, '00000000-0000-0000-0000-000000000000'::uuid)
            AND COALESCE(f.client_lead_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(c.client_lead_id, '00000000-0000-0000-0000-000000000000'::uuid)
            AND COALESCE(f.wl_client_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(c.wl_client_id, '00000000-0000-0000-0000-000000000000'::uuid))
      )
  ), 0) AS faqs_approved_count,
  COALESCE((
    SELECT count(*)::integer
    FROM campaign_policy_blocks p
    WHERE p.status = 'approved'
      AND (
        p.client_department_id = c.client_department_id
        OR p.scope = 'global'
        OR (p.scope = 'tenant'
            AND p.tenant_kind = c.tenant_kind
            AND COALESCE(p.wl_partner_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(c.wl_partner_id, '00000000-0000-0000-0000-000000000000'::uuid)
            AND COALESCE(p.client_lead_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(c.client_lead_id, '00000000-0000-0000-0000-000000000000'::uuid)
            AND COALESCE(p.wl_client_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(c.wl_client_id, '00000000-0000-0000-0000-000000000000'::uuid))
      )
  ), 0) AS policies_approved_count,
  COALESCE(tc.required_modules, 0)::integer AS required_modules,
  COALESCE(tc.total_signoffs, 0)::integer AS required_signoffs,
  COALESCE((
    SELECT count(*) FROM campaign_faq_entries f
    WHERE f.status = 'approved'
      AND (f.client_department_id = c.client_department_id OR f.scope = 'global' OR (f.scope = 'tenant' AND f.tenant_kind = c.tenant_kind))
  ), 0) > 0 AS faqs_ok,
  COALESCE((
    SELECT count(*) FROM campaign_policy_blocks p
    WHERE p.status = 'approved'
      AND (p.client_department_id = c.client_department_id OR p.scope = 'global' OR (p.scope = 'tenant' AND p.tenant_kind = c.tenant_kind))
  ), 0) > 0 AS policies_ok,
  (COALESCE(tc.required_modules, 0) = 0 OR COALESCE(tc.total_signoffs, 0) >= COALESCE(tc.required_modules, 0)) AS training_ok,
  (
    (EXISTS (SELECT 1 FROM campaign_script_documents d WHERE d.campaign_id = c.id AND d.status = 'published') OR c.published_version_id IS NOT NULL)
    AND COALESCE((
      SELECT count(*) FROM campaign_faq_entries f
      WHERE f.status = 'approved'
        AND (f.client_department_id = c.client_department_id OR f.scope = 'global' OR (f.scope = 'tenant' AND f.tenant_kind = c.tenant_kind))
    ), 0) > 0
    AND COALESCE((
      SELECT count(*) FROM campaign_policy_blocks p
      WHERE p.status = 'approved'
        AND (p.client_department_id = c.client_department_id OR p.scope = 'global' OR (p.scope = 'tenant' AND p.tenant_kind = c.tenant_kind))
    ), 0) > 0
    AND (COALESCE(tc.required_modules, 0) = 0 OR COALESCE(tc.total_signoffs, 0) >= COALESCE(tc.required_modules, 0))
  ) AS all_ok
FROM campaigns c
LEFT JOIN campaign_training_coverage tc ON tc.campaign_id = c.id;