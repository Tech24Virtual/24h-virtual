-- Tenant-scope the WL rollup views.
--
-- These views run as their owner (no security_invoker), so RLS on the base
-- tables never applied: any authenticated user — including a WL end-client —
-- could read every partner's readiness and every WL client's directory /
-- service-status row. Each view now filters explicitly:
--   * staff (admin / supervisor / billing) and service_role: all rows
--   * WL partner owner or active team member: their partner's rows
--   * WL end-client: only their own service-status row
--
-- v_wl_client_service_status also:
--   * appends total_scripts / active_scripts (wl_client_scripts — what the
--     client sees on the Scripts page) so the portal stops showing
--     "Active Scripts 3" next to "0/0 scripts published" (Campaign OS counts)
--   * computes last_call_at from call_date/call_time (when the call happened)
--     instead of created_at (import time)

CREATE OR REPLACE FUNCTION public.is_wl_staff_viewer()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.role() = 'service_role'
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        WHERE ur.user_id = auth.uid()
          AND ur.role IN ('admin'::app_role, 'supervisor'::app_role, 'billing'::app_role)
      );
$$;

REVOKE ALL ON FUNCTION public.is_wl_staff_viewer() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_wl_staff_viewer() TO authenticated, service_role;

CREATE OR REPLACE VIEW public.v_wl_partner_readiness AS
 SELECT p.id AS partner_id,
    p.partner_slug,
    p.company_name,
    p.status AS partner_status,
    p.tier,
    b.id IS NOT NULL AS has_branding,
    b.custom_domain IS NOT NULL AS has_custom_domain,
    COALESCE(b.cname_status, 'pending'::text) AS cname_status,
    COALESCE(b.cname_status, 'pending'::text) = 'verified'::text AS domain_verified,
    COALESCE(alias_counts.alias_count, 0::bigint)::integer AS alias_count,
    COALESCE(client_counts.total_clients, 0::bigint)::integer AS total_clients,
    COALESCE(client_counts.active_clients, 0::bigint)::integer AS active_clients,
    COALESCE(client_counts.portal_provisioned, 0::bigint)::integer AS clients_with_portal,
        CASE
            WHEN p.status <> 'active'::text THEN 'pending'::text
            WHEN b.id IS NULL THEN 'configured'::text
            WHEN b.custom_domain IS NULL THEN 'branded'::text
            WHEN COALESCE(b.cname_status, 'pending'::text) <> 'verified'::text THEN 'domain_pending'::text
            WHEN COALESCE(client_counts.active_clients, 0::bigint) = 0 THEN 'domain_ready'::text
            ELSE 'live'::text
        END AS readiness_state
   FROM white_label_partners p
     LEFT JOIN white_label_branding b ON b.partner_id = p.id
     LEFT JOIN LATERAL ( SELECT count(*) AS total_clients,
            count(*) FILTER (WHERE c.status = 'active'::text) AS active_clients,
            count(*) FILTER (WHERE c.user_id IS NOT NULL) AS portal_provisioned
           FROM white_label_clients c
          WHERE c.partner_id = p.id) client_counts ON true
     LEFT JOIN LATERAL ( SELECT count(*) AS alias_count
           FROM white_label_domain_aliases a
          WHERE a.partner_id = p.id) alias_counts ON true
  WHERE public.is_wl_staff_viewer() OR public.is_wl_partner_member(p.id);

CREATE OR REPLACE VIEW public.v_wl_client_directory_for_partner AS
 SELECT c.id AS wl_client_id,
    c.partner_id,
    c.client_name,
    c.contact_name,
    c.email,
    c.status,
    c.plan,
    c.service_type,
    c.client_portal_slug,
    c.user_id IS NOT NULL AS portal_provisioned,
    c.created_at,
    COALESCE(camp.total_campaigns, 0::bigint)::integer AS total_campaigns,
    COALESCE(camp.published_campaigns, 0::bigint)::integer AS published_campaigns,
    COALESCE(rec.live_flows, 0::bigint)::integer AS live_receptionist_flows,
    COALESCE(rec.pending_flows, 0::bigint)::integer AS pending_receptionist_flows,
    COALESCE(tix.open_tickets, 0::bigint)::integer AS open_tickets
   FROM white_label_clients c
     LEFT JOIN LATERAL ( SELECT count(*) AS total_campaigns,
            count(*) FILTER (WHERE k.published_version_id IS NOT NULL) AS published_campaigns
           FROM campaigns k
          WHERE k.wl_client_id = c.id) camp ON true
     LEFT JOIN LATERAL ( SELECT count(*) FILTER (WHERE r.readiness_state = 'live'::text) AS live_flows,
            count(*) FILTER (WHERE r.readiness_state = ANY (ARRAY['configured_offline'::text, 'awaiting_script_publish'::text, 'awaiting_number'::text, 'ready_to_activate'::text])) AS pending_flows
           FROM v_call_flow_receptionist_readiness r
          WHERE r.wl_client_id = c.id) rec ON true
     LEFT JOIN LATERAL ( SELECT count(*) AS open_tickets
           FROM wl_client_tickets t
          WHERE t.wl_client_id = c.id AND (t.status <> ALL (ARRAY['resolved'::text, 'closed'::text]))) tix ON true
  WHERE public.is_wl_staff_viewer() OR public.is_wl_partner_member(c.partner_id);

CREATE OR REPLACE VIEW public.v_wl_client_service_status AS
 SELECT c.id AS wl_client_id,
    c.user_id AS portal_user_id,
    c.partner_id,
    c.client_name,
    c.status AS account_status,
    COALESCE(camp.total_campaigns, 0::bigint)::integer AS total_campaigns,
    COALESCE(camp.published_campaigns, 0::bigint)::integer AS published_campaigns,
    COALESCE(rec.live_flows, 0::bigint)::integer AS live_receptionist_flows,
    COALESCE(rec.pending_flows, 0::bigint)::integer AS pending_receptionist_flows,
    COALESCE(rec.any_enabled, false) AS any_receptionist_enabled,
    COALESCE(tix.open_tickets, 0::bigint)::integer AS open_tickets,
    call_recent.last_call_at,
    COALESCE(scr.total_scripts, 0::bigint)::integer AS total_scripts,
    COALESCE(scr.active_scripts, 0::bigint)::integer AS active_scripts
   FROM white_label_clients c
     LEFT JOIN LATERAL ( SELECT count(*) AS total_campaigns,
            count(*) FILTER (WHERE k.published_version_id IS NOT NULL) AS published_campaigns
           FROM campaigns k
          WHERE k.wl_client_id = c.id) camp ON true
     LEFT JOIN LATERAL ( SELECT count(*) FILTER (WHERE r.readiness_state = 'live'::text) AS live_flows,
            count(*) FILTER (WHERE r.readiness_state = ANY (ARRAY['configured_offline'::text, 'awaiting_script_publish'::text, 'awaiting_number'::text, 'ready_to_activate'::text])) AS pending_flows,
            bool_or(r.receptionist_enabled) AS any_enabled
           FROM v_call_flow_receptionist_readiness r
          WHERE r.wl_client_id = c.id) rec ON true
     LEFT JOIN LATERAL ( SELECT count(*) AS open_tickets
           FROM wl_client_tickets t
          WHERE t.wl_client_id = c.id AND (t.status <> ALL (ARRAY['resolved'::text, 'closed'::text]))) tix ON true
     LEFT JOIN LATERAL ( SELECT max(
              CASE WHEN cl.call_date IS NOT NULL
                   THEN (cl.call_date + COALESCE(cl.call_time, '00:00'::time)) AT TIME ZONE 'America/Toronto'
                   ELSE cl.created_at
              END) AS last_call_at
           FROM wl_call_logs cl
          WHERE cl.wl_client_id = c.id) call_recent ON true
     LEFT JOIN LATERAL ( SELECT count(*) AS total_scripts,
            count(*) FILTER (WHERE s.is_active) AS active_scripts
           FROM wl_client_scripts s
          WHERE s.wl_client_id = c.id) scr ON true
  WHERE c.user_id = auth.uid()
     OR public.is_wl_staff_viewer()
     OR public.is_wl_partner_member(c.partner_id);
