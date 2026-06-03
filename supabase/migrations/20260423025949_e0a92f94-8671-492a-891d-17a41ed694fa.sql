-- Override columns on campaigns
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS go_live_override_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS go_live_override_by uuid NULL,
  ADD COLUMN IF NOT EXISTS go_live_override_reason text NULL;

-- Go-live checks view: per-campaign readiness rollup
CREATE OR REPLACE VIEW public.campaign_go_live_checks
WITH (security_invoker = true) AS
SELECT
  c.id AS campaign_id,
  c.client_department_id,
  -- Script published: campaign points to a published version + doc is published
  (
    c.published_version_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.campaign_script_documents d
      WHERE d.campaign_id = c.id AND d.status = 'published'
    )
  ) AS script_published,
  -- FAQs approved in scope (department-scoped or broader)
  COALESCE((
    SELECT COUNT(*)::int FROM public.campaign_faq_entries f
    WHERE f.status = 'approved'
      AND (
        f.client_department_id = c.client_department_id
        OR (f.scope = 'global')
        OR (f.scope = 'tenant' AND f.tenant_kind = c.tenant_kind
            AND COALESCE(f.wl_partner_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(c.wl_partner_id, '00000000-0000-0000-0000-000000000000'::uuid)
            AND COALESCE(f.client_lead_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(c.client_lead_id, '00000000-0000-0000-0000-000000000000'::uuid)
            AND COALESCE(f.wl_client_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(c.wl_client_id, '00000000-0000-0000-0000-000000000000'::uuid))
      )
  ), 0) AS faqs_approved_count,
  -- Policies approved in scope
  COALESCE((
    SELECT COUNT(*)::int FROM public.campaign_policy_blocks p
    WHERE p.status = 'approved'
      AND (
        p.client_department_id = c.client_department_id
        OR (p.scope = 'global')
        OR (p.scope = 'tenant' AND p.tenant_kind = c.tenant_kind
            AND COALESCE(p.wl_partner_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(c.wl_partner_id, '00000000-0000-0000-0000-000000000000'::uuid)
            AND COALESCE(p.client_lead_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(c.client_lead_id, '00000000-0000-0000-0000-000000000000'::uuid)
            AND COALESCE(p.wl_client_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(c.wl_client_id, '00000000-0000-0000-0000-000000000000'::uuid))
      )
  ), 0) AS policies_approved_count,
  -- Training counts from existing coverage view
  COALESCE(tc.required_modules, 0)::int AS required_modules,
  COALESCE(tc.total_signoffs, 0)::int AS required_signoffs,
  -- Derived booleans
  (COALESCE((
    SELECT COUNT(*) FROM public.campaign_faq_entries f
    WHERE f.status = 'approved'
      AND (f.client_department_id = c.client_department_id OR f.scope = 'global'
           OR (f.scope = 'tenant' AND f.tenant_kind = c.tenant_kind))
  ), 0) > 0) AS faqs_ok,
  (COALESCE((
    SELECT COUNT(*) FROM public.campaign_policy_blocks p
    WHERE p.status = 'approved'
      AND (p.client_department_id = c.client_department_id OR p.scope = 'global'
           OR (p.scope = 'tenant' AND p.tenant_kind = c.tenant_kind))
  ), 0) > 0) AS policies_ok,
  (COALESCE(tc.required_modules, 0) = 0
    OR COALESCE(tc.total_signoffs, 0) >= COALESCE(tc.required_modules, 0)) AS training_ok,
  (
    c.published_version_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.campaign_script_documents d WHERE d.campaign_id = c.id AND d.status = 'published')
    AND COALESCE((SELECT COUNT(*) FROM public.campaign_faq_entries f
                  WHERE f.status = 'approved' AND (f.client_department_id = c.client_department_id OR f.scope = 'global'
                       OR (f.scope = 'tenant' AND f.tenant_kind = c.tenant_kind))), 0) > 0
    AND COALESCE((SELECT COUNT(*) FROM public.campaign_policy_blocks p
                  WHERE p.status = 'approved' AND (p.client_department_id = c.client_department_id OR p.scope = 'global'
                       OR (p.scope = 'tenant' AND p.tenant_kind = c.tenant_kind))), 0) > 0
    AND (COALESCE(tc.required_modules, 0) = 0 OR COALESCE(tc.total_signoffs, 0) >= COALESCE(tc.required_modules, 0))
  ) AS all_ok
FROM public.campaigns c
LEFT JOIN public.campaign_training_coverage tc ON tc.campaign_id = c.id;

-- Trigger function: enforce go-live checks on transition to active
CREATE OR REPLACE FUNCTION public.enforce_go_live_checks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_check RECORD;
  v_missing text[] := '{}';
BEGIN
  -- Only fire on transitions INTO 'active' from another status
  IF NEW.status <> 'active' OR OLD.status = 'active' THEN
    RETURN NEW;
  END IF;

  -- If this update set a fresh override, allow it through
  IF NEW.go_live_override_at IS NOT NULL
     AND (OLD.go_live_override_at IS NULL OR NEW.go_live_override_at > OLD.go_live_override_at) THEN
    RETURN NEW;
  END IF;

  SELECT script_published, faqs_ok, policies_ok, training_ok, all_ok
  INTO v_check
  FROM public.campaign_go_live_checks
  WHERE campaign_id = NEW.id;

  IF v_check IS NULL OR NOT v_check.all_ok THEN
    IF NOT v_check.script_published THEN v_missing := v_missing || 'published script'; END IF;
    IF NOT v_check.faqs_ok THEN v_missing := v_missing || 'approved FAQ'; END IF;
    IF NOT v_check.policies_ok THEN v_missing := v_missing || 'approved policy'; END IF;
    IF NOT v_check.training_ok THEN v_missing := v_missing || 'training signoffs'; END IF;
    RAISE EXCEPTION 'Campaign is not ready to go live. Missing: %. Use Force activate to override.', array_to_string(v_missing, ', ')
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_go_live_checks ON public.campaigns;
CREATE TRIGGER trg_enforce_go_live_checks
  BEFORE UPDATE ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_go_live_checks();

-- Admin RPC: force activate a campaign with a reason
CREATE OR REPLACE FUNCTION public.force_activate_campaign(p_campaign_id uuid, p_reason text)
RETURNS public.campaigns
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_campaign public.campaigns%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Forbidden: admin role required to force activate a campaign';
  END IF;
  IF p_reason IS NULL OR length(trim(p_reason)) < 3 THEN
    RAISE EXCEPTION 'A reason of at least 3 characters is required';
  END IF;

  UPDATE public.campaigns
     SET status = 'active',
         go_live_override_at = now(),
         go_live_override_by = auth.uid(),
         go_live_override_reason = p_reason,
         updated_at = now()
   WHERE id = p_campaign_id
   RETURNING * INTO v_campaign;

  IF v_campaign.id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found';
  END IF;

  -- Best-effort audit log entry (audit_log table exists in this project)
  BEGIN
    INSERT INTO public.audit_log(action, actor_id, target_table, target_id, metadata)
    VALUES (
      'campaign.force_activate',
      auth.uid(),
      'campaigns',
      v_campaign.id::text,
      jsonb_build_object('reason', p_reason)
    );
  EXCEPTION WHEN OTHERS THEN
    -- never block activation on audit failure
    NULL;
  END;

  RETURN v_campaign;
END;
$$;

GRANT EXECUTE ON FUNCTION public.force_activate_campaign(uuid, text) TO authenticated;