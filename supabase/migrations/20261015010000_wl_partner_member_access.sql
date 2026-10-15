-- WL partner team-member access.
--
-- 1. is_wl_partner_member(): true when the caller owns the partner
--    (white_label_partners.user_id) OR is an active wl_partner_members row.
--    wl_partner_members writes are restricted to owners/managers
--    (wl_pm_insert_managers / wl_pm_insert_own_partner), so users cannot
--    self-enrol.
-- 2. Critical WL dashboard tables switch from owner-only to the helper.
--    white_label_clients / white_label_branding also drop their
--    profiles.wl_partner_id branch: that column was user-writable, which let
--    any authenticated user point it at another partner.
-- 3. Guard trigger: only admins / service role may change
--    profiles.wl_partner_id (43 Campaign OS policies still read it).

CREATE OR REPLACE FUNCTION public.is_wl_partner_member(_partner_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.white_label_partners p
    WHERE p.id = _partner_id AND p.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.wl_partner_members m
    WHERE m.partner_id = _partner_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  );
$$;

REVOKE ALL ON FUNCTION public.is_wl_partner_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_wl_partner_member(uuid) TO authenticated, service_role;

-- ── Critical tables ──────────────────────────────────────────────────
ALTER POLICY "Partners can insert own branding" ON public.white_label_branding
  WITH CHECK ((public.is_wl_partner_member(partner_id)));
ALTER POLICY "Partners can update own branding" ON public.white_label_branding
  USING ((public.is_wl_partner_member(partner_id)));
ALTER POLICY "Partners can view own branding" ON public.white_label_branding
  USING ((public.is_wl_partner_member(partner_id)));
ALTER POLICY "Partners can delete own clients" ON public.white_label_clients
  USING ((public.is_wl_partner_member(partner_id)));
ALTER POLICY "Partners can insert own clients" ON public.white_label_clients
  WITH CHECK ((public.is_wl_partner_member(partner_id)));
ALTER POLICY "Partners can update own clients" ON public.white_label_clients
  USING ((public.is_wl_partner_member(partner_id)));
ALTER POLICY "Partners can view own clients" ON public.white_label_clients
  USING ((public.is_wl_partner_member(partner_id)));
ALTER POLICY "Partners manage own campaigns" ON public.wl_client_campaigns
  USING (public.is_wl_partner_member(partner_id));
ALTER POLICY "Partners manage own knowledge base" ON public.wl_knowledge_base
  USING (public.is_wl_partner_member(partner_id));
ALTER POLICY "Partners can delete own drafts" ON public.wl_newsletter_drafts
  USING (public.is_wl_partner_member(partner_id));
ALTER POLICY "Partners can insert own drafts" ON public.wl_newsletter_drafts
  WITH CHECK (public.is_wl_partner_member(partner_id));
ALTER POLICY "Partners can view own drafts" ON public.wl_newsletter_drafts
  USING (public.is_wl_partner_member(partner_id));
ALTER POLICY "wl_partner_leads partner delete" ON public.wl_partner_leads
  USING ((public.is_wl_partner_member(partner_id) OR has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "wl_partner_leads partner insert" ON public.wl_partner_leads
  WITH CHECK ((public.is_wl_partner_member(partner_id) OR has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "wl_partner_leads partner select" ON public.wl_partner_leads
  USING ((public.is_wl_partner_member(partner_id) OR has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "wl_partner_leads partner update" ON public.wl_partner_leads
  USING ((public.is_wl_partner_member(partner_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((public.is_wl_partner_member(partner_id) OR has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Partners can delete own proposals" ON public.wl_partner_proposals
  USING ((public.is_wl_partner_member(partner_id) OR has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Partners can insert own proposals" ON public.wl_partner_proposals
  WITH CHECK ((public.is_wl_partner_member(partner_id) OR has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Partners can update own proposals" ON public.wl_partner_proposals
  USING ((public.is_wl_partner_member(partner_id) OR has_role(auth.uid(), 'admin'::app_role))) WITH CHECK ((public.is_wl_partner_member(partner_id) OR has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Partners can view own proposals" ON public.wl_partner_proposals
  USING ((public.is_wl_partner_member(partner_id) OR has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "wl_tasks_partner_delete" ON public.wl_partner_tasks
  USING ((public.is_wl_partner_member(partner_id) OR has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "wl_tasks_partner_insert" ON public.wl_partner_tasks
  WITH CHECK ((public.is_wl_partner_member(partner_id) OR has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "wl_tasks_partner_select" ON public.wl_partner_tasks
  USING ((public.is_wl_partner_member(partner_id) OR has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "wl_tasks_partner_update" ON public.wl_partner_tasks
  USING ((public.is_wl_partner_member(partner_id) OR has_role(auth.uid(), 'admin'::app_role)));
ALTER POLICY "Partners can delete their own WP connection" ON public.wl_wordpress_connections
  USING (public.is_wl_partner_member(partner_id));
ALTER POLICY "Partners can insert their own WP connection" ON public.wl_wordpress_connections
  WITH CHECK (public.is_wl_partner_member(partner_id));
ALTER POLICY "Partners can update their own WP connection" ON public.wl_wordpress_connections
  USING (public.is_wl_partner_member(partner_id));
ALTER POLICY "Partners can view their own WP connection" ON public.wl_wordpress_connections
  USING (public.is_wl_partner_member(partner_id));

-- ── Lock down profiles.wl_partner_id ────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_profile_wl_partner_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- auth.uid() is NULL for service role, SQL editor, and auth signup triggers.
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.wl_partner_id := NULL;
  ELSIF NEW.wl_partner_id IS DISTINCT FROM OLD.wl_partner_id THEN
    RAISE EXCEPTION 'profiles.wl_partner_id can only be changed by an administrator'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_wl_partner_id ON public.profiles;
CREATE TRIGGER guard_profile_wl_partner_id
  BEFORE INSERT OR UPDATE OF wl_partner_id ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_wl_partner_id();
