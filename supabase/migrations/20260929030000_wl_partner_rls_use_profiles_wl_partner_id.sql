-- WL partner RLS on white_label_clients / white_label_branding was keyed only to
-- white_label_partners.user_id = auth.uid(). Since a partner can now be accessed by
-- any user tied to it via profiles.wl_partner_id (the canonical relationship the
-- app's useWLPartnerId() hook reads — team members, or an owner account swap),
-- extend these policies to also match on that column so RLS doesn't silently
-- empty-out queries for those users while white_label_partners itself (readable
-- via the separate "Anyone can resolve partner by slug" policy) still resolves.

-- white_label_clients
DROP POLICY IF EXISTS "Partners can view own clients" ON public.white_label_clients;
CREATE POLICY "Partners can view own clients" ON public.white_label_clients
FOR SELECT USING (
  partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
  OR partner_id = (SELECT wl_partner_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Partners can update own clients" ON public.white_label_clients;
CREATE POLICY "Partners can update own clients" ON public.white_label_clients
FOR UPDATE USING (
  partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
  OR partner_id = (SELECT wl_partner_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Partners can delete own clients" ON public.white_label_clients;
CREATE POLICY "Partners can delete own clients" ON public.white_label_clients
FOR DELETE USING (
  partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
  OR partner_id = (SELECT wl_partner_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Partners can insert own clients" ON public.white_label_clients;
CREATE POLICY "Partners can insert own clients" ON public.white_label_clients
FOR INSERT WITH CHECK (
  partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
  OR partner_id = (SELECT wl_partner_id FROM public.profiles WHERE id = auth.uid())
);

-- white_label_branding
DROP POLICY IF EXISTS "Partners can view own branding" ON public.white_label_branding;
CREATE POLICY "Partners can view own branding" ON public.white_label_branding
FOR SELECT USING (
  partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
  OR partner_id = (SELECT wl_partner_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Partners can update own branding" ON public.white_label_branding;
CREATE POLICY "Partners can update own branding" ON public.white_label_branding
FOR UPDATE USING (
  partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
  OR partner_id = (SELECT wl_partner_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Partners can insert own branding" ON public.white_label_branding;
CREATE POLICY "Partners can insert own branding" ON public.white_label_branding
FOR INSERT WITH CHECK (
  partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
  OR partner_id = (SELECT wl_partner_id FROM public.profiles WHERE id = auth.uid())
);
