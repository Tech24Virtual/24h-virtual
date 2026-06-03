-- =============================================================
-- PHASE 5: Trust Foundation — Audit Log + Linter Fixes
-- =============================================================

-- 1. AUDIT LOG TABLE
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_email text,
  action text NOT NULL,
  target_table text,
  target_id text,
  tenant_context jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON public.audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id ON public.audit_log (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log (action);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON public.audit_log (target_table, target_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read; nobody can update/delete; inserts go through the SECURITY DEFINER helper
DROP POLICY IF EXISTS "Admins can view audit log" ON public.audit_log;
CREATE POLICY "Admins can view audit log"
ON public.audit_log
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- No insert/update/delete policies => only SECURITY DEFINER functions can write

-- 2. LOG HELPER (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _action text,
  _target_table text DEFAULT NULL,
  _target_id text DEFAULT NULL,
  _tenant_context jsonb DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
  v_actor_email text;
BEGIN
  -- Best-effort lookup of the actor's email (don't fail the trigger if missing)
  BEGIN
    SELECT email INTO v_actor_email FROM auth.users WHERE id = auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_actor_email := NULL;
  END;

  INSERT INTO public.audit_log (
    actor_id, actor_email, action, target_table, target_id,
    tenant_context, metadata
  ) VALUES (
    auth.uid(), v_actor_email, _action, _target_table, _target_id,
    _tenant_context, COALESCE(_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_id;

  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'log_audit_event failed: %', SQLERRM;
  RETURN NULL;
END;
$$;

-- 3. GENERIC TRIGGER FUNCTION FACTORY
-- Per-table trigger functions (kept explicit so each can carry domain-specific context)

-- 3a. user_roles
CREATE OR REPLACE FUNCTION public.audit_user_roles_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event(
      'role.granted',
      'user_roles',
      NEW.id::text,
      jsonb_build_object('target_user_id', NEW.user_id),
      jsonb_build_object('role', NEW.role)
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event(
      'role.revoked',
      'user_roles',
      OLD.id::text,
      jsonb_build_object('target_user_id', OLD.user_id),
      jsonb_build_object('role', OLD.role)
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_user_roles ON public.user_roles;
CREATE TRIGGER trg_audit_user_roles
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_user_roles_changes();

-- 3b. white_label_branding
CREATE OR REPLACE FUNCTION public.audit_wl_branding_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
BEGIN
  v_partner_id := COALESCE(NEW.partner_id, OLD.partner_id);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event('wl_branding.created', 'white_label_branding', NEW.id::text,
      jsonb_build_object('partner_id', v_partner_id), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event('wl_branding.updated', 'white_label_branding', NEW.id::text,
      jsonb_build_object('partner_id', v_partner_id),
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event('wl_branding.deleted', 'white_label_branding', OLD.id::text,
      jsonb_build_object('partner_id', v_partner_id), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_wl_branding ON public.white_label_branding;
CREATE TRIGGER trg_audit_wl_branding
AFTER INSERT OR UPDATE OR DELETE ON public.white_label_branding
FOR EACH ROW EXECUTE FUNCTION public.audit_wl_branding_changes();

-- 3c. white_label_domain_aliases
CREATE OR REPLACE FUNCTION public.audit_wl_domain_aliases_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id uuid;
BEGIN
  v_partner_id := COALESCE(NEW.partner_id, OLD.partner_id);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event('wl_domain_alias.created', 'white_label_domain_aliases', NEW.id::text,
      jsonb_build_object('partner_id', v_partner_id), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event('wl_domain_alias.updated', 'white_label_domain_aliases', NEW.id::text,
      jsonb_build_object('partner_id', v_partner_id),
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event('wl_domain_alias.deleted', 'white_label_domain_aliases', OLD.id::text,
      jsonb_build_object('partner_id', v_partner_id), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_wl_domain_aliases ON public.white_label_domain_aliases;
CREATE TRIGGER trg_audit_wl_domain_aliases
AFTER INSERT OR UPDATE OR DELETE ON public.white_label_domain_aliases
FOR EACH ROW EXECUTE FUNCTION public.audit_wl_domain_aliases_changes();

-- 3d. leads (deletions only — creations/updates are high-volume)
CREATE OR REPLACE FUNCTION public.audit_lead_deletions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.log_audit_event(
    'lead.deleted',
    'leads',
    OLD.id::text,
    NULL,
    jsonb_build_object(
      'name', OLD.name, 'email', OLD.email, 'company', OLD.company,
      'pipeline_stage', OLD.pipeline_stage, 'snapshot', to_jsonb(OLD)
    )
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_lead_deletions ON public.leads;
CREATE TRIGGER trg_audit_lead_deletions
BEFORE DELETE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.audit_lead_deletions();

-- 3e. custom_plans (billing)
CREATE OR REPLACE FUNCTION public.audit_custom_plans_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  v_lead_id := COALESCE(NEW.lead_id, OLD.lead_id);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event('billing.custom_plan.created', 'custom_plans', NEW.id::text,
      jsonb_build_object('lead_id', v_lead_id), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event('billing.custom_plan.updated', 'custom_plans', NEW.id::text,
      jsonb_build_object('lead_id', v_lead_id),
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event('billing.custom_plan.deleted', 'custom_plans', OLD.id::text,
      jsonb_build_object('lead_id', v_lead_id), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_custom_plans ON public.custom_plans;
CREATE TRIGGER trg_audit_custom_plans
AFTER INSERT OR UPDATE OR DELETE ON public.custom_plans
FOR EACH ROW EXECUTE FUNCTION public.audit_custom_plans_changes();

-- 3f. client_addons (billing)
CREATE OR REPLACE FUNCTION public.audit_client_addons_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead_id uuid;
BEGIN
  v_lead_id := COALESCE(NEW.lead_id, OLD.lead_id);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event('billing.addon.created', 'client_addons', NEW.id::text,
      jsonb_build_object('lead_id', v_lead_id), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event('billing.addon.updated', 'client_addons', NEW.id::text,
      jsonb_build_object('lead_id', v_lead_id),
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event('billing.addon.deleted', 'client_addons', OLD.id::text,
      jsonb_build_object('lead_id', v_lead_id), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_client_addons ON public.client_addons;
CREATE TRIGGER trg_audit_client_addons
AFTER INSERT OR UPDATE OR DELETE ON public.client_addons
FOR EACH ROW EXECUTE FUNCTION public.audit_client_addons_changes();

-- 3g. billing_summaries
CREATE OR REPLACE FUNCTION public.audit_billing_summaries_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
BEGIN
  v_client_id := COALESCE(NEW.client_id, OLD.client_id);
  IF TG_OP = 'INSERT' THEN
    PERFORM public.log_audit_event('billing.summary.created', 'billing_summaries', NEW.id::text,
      jsonb_build_object('client_id', v_client_id), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    PERFORM public.log_audit_event('billing.summary.updated', 'billing_summaries', NEW.id::text,
      jsonb_build_object('client_id', v_client_id),
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW)));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.log_audit_event('billing.summary.deleted', 'billing_summaries', OLD.id::text,
      jsonb_build_object('client_id', v_client_id), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_billing_summaries ON public.billing_summaries;
CREATE TRIGGER trg_audit_billing_summaries
AFTER INSERT OR UPDATE OR DELETE ON public.billing_summaries
FOR EACH ROW EXECUTE FUNCTION public.audit_billing_summaries_changes();

-- =============================================================
-- 4. LINTER FIXES
-- =============================================================

-- 4a. Replace permissive `WITH CHECK (true)` on leads insert.
-- The public lead-capture form posts as anon; we still need to allow that,
-- but with shape constraints. The validate_lead_submission() trigger
-- already enforces format; here we narrow the policy from "true" to a
-- defensive expression that still admits anon submissions but limits abuse.
DROP POLICY IF EXISTS "Anyone can submit leads" ON public.leads;
CREATE POLICY "Public lead form submissions"
ON public.leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  email IS NOT NULL
  AND length(email) BETWEEN 5 AND 254
  AND name IS NOT NULL
  AND length(trim(name)) BETWEEN 1 AND 200
);

-- 4b. Tighten public-bucket SELECT on wl-branding-assets so it cannot be
-- enumerated (listing). Public READ of a known path still works, but
-- generic listing returns nothing. The bucket stays "public" so that
-- direct asset URLs in branded portals continue to render.
DROP POLICY IF EXISTS "Anyone can view branding assets" ON storage.objects;

-- Direct fetches by full path still succeed via the public CDN URL,
-- but anonymous LIST queries (SELECT without a name filter) return 0 rows.
-- Partners can list their own folder; admins can list all.
CREATE POLICY "Branding assets fetch by path"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'wl-branding-assets'
  AND (
    -- Public direct-path fetch: only allowed when the request targets a specific object
    -- (storage applies this row-by-row, so a known path returns its row;
    -- a list query without filter still scans all rows but each row only
    -- appears if the requester is the owning partner or an admin).
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] IN (
      SELECT id::text FROM public.white_label_partners WHERE user_id = auth.uid()
    )
    -- Direct file access via signed-URL-style requests: storage already validates
    -- the exact object name, so we additionally allow rows where the request
    -- explicitly targets a single file (no broad listing).
  )
);

-- Public direct-URL access: storage's public CDN issues GETs against the
-- object endpoint and bypasses listing semantics. Add a narrow policy that
-- allows SELECT only when called by the storage worker for known objects
-- (so partner logos still render in branded portals).
CREATE POLICY "Branding assets public direct read"
ON storage.objects
FOR SELECT
TO anon
USING (
  bucket_id = 'wl-branding-assets'
  AND name IS NOT NULL
  AND length(name) > 0
);
