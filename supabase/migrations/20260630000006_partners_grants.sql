-- Grants for Admin Partners pages
-- white_label_domain_aliases: needed by WL Health (scores) and WL Preview (live host button)
GRANT SELECT ON public.white_label_domain_aliases TO authenticated;

-- white_label_partners: add UPDATE/DELETE so AdminPartners can approve/suspend partners
GRANT UPDATE, DELETE ON public.white_label_partners TO authenticated;

-- AdminPartnerDetail — Wholesale Pricing tab
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wl_wholesale_pricing TO authenticated;

-- AdminPartnerDetail — Clients & Verification tab (billing_verified toggle)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wl_client_service_config TO authenticated;

-- AdminPartnerDetail — Agreements tab
GRANT SELECT ON public.wl_terms_agreements TO authenticated;

-- AdminPartnerDetail — Usage & Billing tab (per-client usage records)
GRANT SELECT ON public.wl_usage_records TO authenticated;

-- AdminPartnerDetail — Add-on Pricing tab
GRANT SELECT ON public.addon_products TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wl_addon_pricing TO authenticated;

-- AdminPartners — Affiliates tab
GRANT SELECT, INSERT, UPDATE, DELETE ON public.affiliates TO authenticated;

-- AdminPartners — Referrals tab
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referral_partners TO authenticated;
