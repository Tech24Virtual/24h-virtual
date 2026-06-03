
-- ─────────────────────────────────────────────────────────────────────
-- Phase 6 — White Label Scaling
-- ─────────────────────────────────────────────────────────────────────

-- A. Partner readiness view (no PII; computed per partner)
CREATE OR REPLACE VIEW public.v_wl_partner_readiness AS
SELECT
  p.id                                                        AS partner_id,
  p.partner_slug,
  p.company_name,
  p.status                                                    AS partner_status,
  p.tier,
  (b.id IS NOT NULL)                                          AS has_branding,
  (b.custom_domain IS NOT NULL)                               AS has_custom_domain,
  COALESCE(b.cname_status, 'pending')                         AS cname_status,
  (COALESCE(b.cname_status, 'pending') = 'verified')          AS domain_verified,
  COALESCE(alias_counts.alias_count, 0)::int                  AS alias_count,
  COALESCE(client_counts.total_clients, 0)::int               AS total_clients,
  COALESCE(client_counts.active_clients, 0)::int              AS active_clients,
  COALESCE(client_counts.portal_provisioned, 0)::int          AS clients_with_portal,
  CASE
    WHEN p.status <> 'active' THEN 'pending'
    WHEN b.id IS NULL THEN 'configured'
    WHEN b.custom_domain IS NULL THEN 'branded'
    WHEN COALESCE(b.cname_status, 'pending') <> 'verified' THEN 'domain_pending'
    WHEN COALESCE(client_counts.active_clients, 0) = 0 THEN 'domain_ready'
    ELSE 'live'
  END                                                         AS readiness_state
FROM public.white_label_partners p
LEFT JOIN public.white_label_branding b ON b.partner_id = p.id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::bigint                                                          AS total_clients,
    COUNT(*) FILTER (WHERE c.status = 'active')::bigint                       AS active_clients,
    COUNT(*) FILTER (WHERE c.user_id IS NOT NULL)::bigint                     AS portal_provisioned
  FROM public.white_label_clients c WHERE c.partner_id = p.id
) client_counts ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS alias_count
  FROM public.white_label_domain_aliases a WHERE a.partner_id = p.id
) alias_counts ON true;

GRANT SELECT ON public.v_wl_partner_readiness TO authenticated;

-- B. Per-partner client directory with delivery + voice rollups (partner-scoped via RLS through partners table)
CREATE OR REPLACE VIEW public.v_wl_client_directory_for_partner AS
SELECT
  c.id                                              AS wl_client_id,
  c.partner_id,
  c.client_name,
  c.contact_name,
  c.email,
  c.status,
  c.plan,
  c.service_type,
  c.client_portal_slug,
  (c.user_id IS NOT NULL)                           AS portal_provisioned,
  c.created_at,
  COALESCE(camp.total_campaigns, 0)::int            AS total_campaigns,
  COALESCE(camp.published_campaigns, 0)::int        AS published_campaigns,
  COALESCE(rec.live_flows, 0)::int                  AS live_receptionist_flows,
  COALESCE(rec.pending_flows, 0)::int               AS pending_receptionist_flows,
  COALESCE(tix.open_tickets, 0)::int                AS open_tickets
FROM public.white_label_clients c
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::bigint                                                                                      AS total_campaigns,
    COUNT(*) FILTER (WHERE k.published_version_id IS NOT NULL)::bigint                                    AS published_campaigns
  FROM public.campaigns k WHERE k.wl_client_id = c.id
) camp ON true
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE r.readiness_state = 'live')::bigint                                            AS live_flows,
    COUNT(*) FILTER (WHERE r.readiness_state IN ('configured_offline','awaiting_script_publish','awaiting_number','ready_to_activate'))::bigint AS pending_flows
  FROM public.v_call_flow_receptionist_readiness r WHERE r.wl_client_id = c.id
) rec ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS open_tickets
  FROM public.wl_client_tickets t WHERE t.wl_client_id = c.id AND t.status NOT IN ('resolved','closed')
) tix ON true;

GRANT SELECT ON public.v_wl_client_directory_for_partner TO authenticated;

-- C. WL end-client service status (consumed by WL portal). RLS-safe via white_label_clients.user_id.
CREATE OR REPLACE VIEW public.v_wl_client_service_status AS
SELECT
  c.id                                                                       AS wl_client_id,
  c.user_id                                                                  AS portal_user_id,
  c.partner_id,
  c.client_name,
  c.status                                                                   AS account_status,
  COALESCE(camp.total_campaigns, 0)::int                                     AS total_campaigns,
  COALESCE(camp.published_campaigns, 0)::int                                 AS published_campaigns,
  COALESCE(rec.live_flows, 0)::int                                           AS live_receptionist_flows,
  COALESCE(rec.pending_flows, 0)::int                                        AS pending_receptionist_flows,
  COALESCE(rec.any_enabled, false)                                           AS any_receptionist_enabled,
  COALESCE(tix.open_tickets, 0)::int                                         AS open_tickets,
  call_recent.last_call_at
FROM public.white_label_clients c
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)::bigint                                                                                      AS total_campaigns,
    COUNT(*) FILTER (WHERE k.published_version_id IS NOT NULL)::bigint                                    AS published_campaigns
  FROM public.campaigns k WHERE k.wl_client_id = c.id
) camp ON true
LEFT JOIN LATERAL (
  SELECT
    COUNT(*) FILTER (WHERE r.readiness_state = 'live')::bigint                                            AS live_flows,
    COUNT(*) FILTER (WHERE r.readiness_state IN ('configured_offline','awaiting_script_publish','awaiting_number','ready_to_activate'))::bigint AS pending_flows,
    bool_or(r.receptionist_enabled)                                                                       AS any_enabled
  FROM public.v_call_flow_receptionist_readiness r WHERE r.wl_client_id = c.id
) rec ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::bigint AS open_tickets
  FROM public.wl_client_tickets t WHERE t.wl_client_id = c.id AND t.status NOT IN ('resolved','closed')
) tix ON true
LEFT JOIN LATERAL (
  SELECT MAX(cl.created_at) AS last_call_at FROM public.wl_call_logs cl WHERE cl.wl_client_id = c.id
) call_recent ON true;

GRANT SELECT ON public.v_wl_client_service_status TO authenticated;

-- D. Lifecycle event triggers
CREATE OR REPLACE FUNCTION public.trg_wl_partners_emit_lifecycle_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event := 'wl.partner.created';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_event := CASE NEW.status
      WHEN 'active' THEN 'wl.partner.activated'
      WHEN 'suspended' THEN 'wl.partner.suspended'
      ELSE 'wl.partner.status_changed'
    END;
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.emit_dashboard_event(
    v_event, 'white_label', 'wl_partner', NEW.id::text, NEW.user_id,
    jsonb_build_object('partner_slug', NEW.partner_slug, 'status', NEW.status, 'tier', NEW.tier)
  );

  INSERT INTO public.audit_log (actor_id, action, target_table, target_id, metadata)
  VALUES (auth.uid(), v_event, 'white_label_partners', NEW.id::text,
          jsonb_build_object('partner_slug', NEW.partner_slug, 'status', NEW.status));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_wl_partners_emit_lifecycle ON public.white_label_partners;
CREATE TRIGGER trg_wl_partners_emit_lifecycle
AFTER INSERT OR UPDATE OF status ON public.white_label_partners
FOR EACH ROW EXECUTE FUNCTION public.trg_wl_partners_emit_lifecycle_fn();

CREATE OR REPLACE FUNCTION public.trg_wl_clients_emit_lifecycle_fn()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event := 'wl.client.created';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_event := CASE NEW.status
      WHEN 'active' THEN 'wl.client.activated'
      WHEN 'suspended' THEN 'wl.client.suspended'
      WHEN 'churned' THEN 'wl.client.churned'
      ELSE 'wl.client.status_changed'
    END;
  ELSIF NEW.user_id IS DISTINCT FROM OLD.user_id AND NEW.user_id IS NOT NULL THEN
    v_event := 'wl.client.portal_provisioned';
  ELSE
    RETURN NEW;
  END IF;

  PERFORM public.emit_dashboard_event(
    v_event, 'white_label', 'wl_client', NEW.id::text, NEW.user_id,
    jsonb_build_object('partner_id', NEW.partner_id, 'plan', NEW.plan, 'status', NEW.status, 'slug', NEW.client_portal_slug)
  );

  INSERT INTO public.audit_log (actor_id, action, target_table, target_id, tenant_context, metadata)
  VALUES (auth.uid(), v_event, 'white_label_clients', NEW.id::text,
          jsonb_build_object('partner_id', NEW.partner_id),
          jsonb_build_object('status', NEW.status, 'slug', NEW.client_portal_slug));
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_wl_clients_emit_lifecycle ON public.white_label_clients;
CREATE TRIGGER trg_wl_clients_emit_lifecycle
AFTER INSERT OR UPDATE OF status, user_id ON public.white_label_clients
FOR EACH ROW EXECUTE FUNCTION public.trg_wl_clients_emit_lifecycle_fn();

COMMENT ON VIEW public.v_wl_partner_readiness IS 'Phase 6: per-partner activation/readiness rollup (pending → configured → branded → domain_ready → live).';
COMMENT ON VIEW public.v_wl_client_directory_for_partner IS 'Phase 6: partner-scoped WL client directory with delivery + receptionist + ticket counts.';
COMMENT ON VIEW public.v_wl_client_service_status IS 'Phase 6: WL end-client service status (RLS via white_label_clients.user_id). No admin internals.';
