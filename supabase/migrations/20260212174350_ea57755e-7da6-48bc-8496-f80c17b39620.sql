
-- =============================================
-- WHITE LABEL INFRASTRUCTURE: FULL MIGRATION
-- =============================================

-- 1. wl_wholesale_pricing (Admin sets per-partner wholesale rates)
CREATE TABLE public.wl_wholesale_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  campaign_setup_fee NUMERIC NOT NULL DEFAULT 100,
  additional_campaign_fee NUMERIC NOT NULL DEFAULT 25,
  tier_under_100_rate NUMERIC NOT NULL DEFAULT 1.95,
  tier_under_500_rate NUMERIC NOT NULL DEFAULT 1.75,
  tier_under_1000_rate NUMERIC NOT NULL DEFAULT 1.55,
  tier_over_1000_rate NUMERIC NOT NULL DEFAULT 1.35,
  secretary_surcharge NUMERIC NOT NULL DEFAULT 0.05,
  spanish_surcharge NUMERIC NOT NULL DEFAULT 0.05,
  french_surcharge NUMERIC NOT NULL DEFAULT 0.05,
  both_languages_surcharge NUMERIC NOT NULL DEFAULT 0.07,
  volume_discount_min_minutes INTEGER NOT NULL DEFAULT 10000,
  volume_discount_min_clients INTEGER NOT NULL DEFAULT 10,
  volume_discount_fixed_rate NUMERIC,
  volume_discount_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_id)
);

ALTER TABLE public.wl_wholesale_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on wl_wholesale_pricing"
  ON public.wl_wholesale_pricing FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Billing full access on wl_wholesale_pricing"
  ON public.wl_wholesale_pricing FOR ALL
  USING (public.has_role(auth.uid(), 'billing'));

CREATE POLICY "Partners can view own pricing"
  ON public.wl_wholesale_pricing FOR SELECT
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

-- 2. wl_addon_pricing (wholesale add-on prices per partner)
CREATE TABLE public.wl_addon_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  addon_product_id UUID NOT NULL REFERENCES public.addon_products(id) ON DELETE CASCADE,
  wholesale_price NUMERIC NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_id, addon_product_id)
);

ALTER TABLE public.wl_addon_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on wl_addon_pricing"
  ON public.wl_addon_pricing FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners can view own addon pricing"
  ON public.wl_addon_pricing FOR SELECT
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

-- 3. Alter white_label_clients: add service config + portal columns
ALTER TABLE public.white_label_clients
  ADD COLUMN service_type TEXT NOT NULL DEFAULT 'virtual_receptionist',
  ADD COLUMN language_support TEXT NOT NULL DEFAULT 'english_only',
  ADD COLUMN num_campaigns INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN billing_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN verified_by UUID,
  ADD COLUMN client_portal_slug TEXT;

-- 4. wl_client_campaigns (campaigns per WL client)
CREATE TABLE public.wl_client_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wl_client_id UUID NOT NULL REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  campaign_name TEXT NOT NULL,
  department TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wl_client_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on wl_client_campaigns"
  ON public.wl_client_campaigns FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Billing access on wl_client_campaigns"
  ON public.wl_client_campaigns FOR ALL
  USING (public.has_role(auth.uid(), 'billing'));

CREATE POLICY "Partners manage own campaigns"
  ON public.wl_client_campaigns FOR ALL
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

-- 5. wl_client_service_config (per-client service configuration)
CREATE TABLE public.wl_client_service_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wl_client_id UUID NOT NULL REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL DEFAULT 'virtual_receptionist',
  language_support TEXT NOT NULL DEFAULT 'english_only',
  estimated_monthly_minutes INTEGER DEFAULT 0,
  partner_retail_rate NUMERIC,
  billing_verified BOOLEAN NOT NULL DEFAULT false,
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(wl_client_id)
);

ALTER TABLE public.wl_client_service_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on wl_client_service_config"
  ON public.wl_client_service_config FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Billing full access on wl_client_service_config"
  ON public.wl_client_service_config FOR ALL
  USING (public.has_role(auth.uid(), 'billing'));

CREATE POLICY "Partners manage own service configs"
  ON public.wl_client_service_config FOR ALL
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

-- 6. wl_terms_agreements (TOS between 24H and partner)
CREATE TABLE public.wl_terms_agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  agreement_version TEXT NOT NULL,
  agreement_content TEXT NOT NULL,
  wholesale_pricing_snapshot JSONB,
  signed_at TIMESTAMPTZ,
  signed_by UUID,
  ip_address TEXT,
  is_current BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wl_terms_agreements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on wl_terms_agreements"
  ON public.wl_terms_agreements FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners view and sign own agreements"
  ON public.wl_terms_agreements FOR SELECT
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can sign agreements"
  ON public.wl_terms_agreements FOR INSERT
  WITH CHECK (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can update own agreements"
  ON public.wl_terms_agreements FOR UPDATE
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

-- 7. wl_knowledge_base (partner's own isolated KB)
CREATE TABLE public.wl_knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  tags TEXT[],
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wl_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on wl_knowledge_base"
  ON public.wl_knowledge_base FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners manage own knowledge base"
  ON public.wl_knowledge_base FOR ALL
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

-- 8. wl_client_tickets (partner <-> their client communication)
CREATE TABLE public.wl_client_tickets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  wl_client_id UUID NOT NULL REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  ticket_number SERIAL,
  subject TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  submitted_by_type TEXT NOT NULL DEFAULT 'partner',
  submitted_by_name TEXT,
  submitted_by_email TEXT,
  assigned_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

ALTER TABLE public.wl_client_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage own client tickets"
  ON public.wl_client_tickets FOR ALL
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Admin full access on wl_client_tickets"
  ON public.wl_client_tickets FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 9. wl_client_ticket_replies
CREATE TABLE public.wl_client_ticket_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES public.wl_client_tickets(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  author_type TEXT NOT NULL DEFAULT 'partner',
  author_name TEXT,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wl_client_ticket_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners manage own ticket replies"
  ON public.wl_client_ticket_replies FOR ALL
  USING (ticket_id IN (
    SELECT id FROM public.wl_client_tickets
    WHERE partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
  ));

CREATE POLICY "Admin full access on wl_client_ticket_replies"
  ON public.wl_client_ticket_replies FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- 10. wl_call_logs (call data isolated for WL clients)
CREATE TABLE public.wl_call_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  wl_client_id UUID NOT NULL REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  external_call_id TEXT,
  caller_name TEXT,
  caller_phone TEXT,
  caller_email TEXT,
  caller_number TEXT,
  call_date DATE,
  call_time TIME,
  call_duration INTEGER DEFAULT 0,
  talk_time_seconds INTEGER DEFAULT 0,
  acw_seconds INTEGER DEFAULT 0,
  handle_time_seconds INTEGER DEFAULT 0,
  billable_minutes NUMERIC DEFAULT 0,
  call_direction TEXT DEFAULT 'inbound',
  call_type TEXT DEFAULT 'inbound',
  status TEXT DEFAULT 'completed',
  campaign_name TEXT,
  disposition TEXT,
  dnis TEXT,
  agent_name TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_wl_call_logs_external_call_id ON public.wl_call_logs(external_call_id) WHERE external_call_id IS NOT NULL;

ALTER TABLE public.wl_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners view own call logs"
  ON public.wl_call_logs FOR SELECT
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Admin full access on wl_call_logs"
  ON public.wl_call_logs FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Billing full access on wl_call_logs"
  ON public.wl_call_logs FOR ALL
  USING (public.has_role(auth.uid(), 'billing'));

CREATE POLICY "Supervisor view wl_call_logs"
  ON public.wl_call_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'supervisor'));

-- 11. wl_usage_records (per WL client per billing period)
CREATE TABLE public.wl_usage_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  wl_client_id UUID NOT NULL REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  total_minutes_used NUMERIC NOT NULL DEFAULT 0,
  total_calls INTEGER NOT NULL DEFAULT 0,
  base_rate_applied NUMERIC NOT NULL DEFAULT 0,
  secretary_surcharge_applied NUMERIC NOT NULL DEFAULT 0,
  language_surcharge_applied NUMERIC NOT NULL DEFAULT 0,
  effective_rate NUMERIC NOT NULL DEFAULT 0,
  wholesale_cost NUMERIC NOT NULL DEFAULT 0,
  partner_retail_revenue NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_id, wl_client_id, billing_period_start)
);

ALTER TABLE public.wl_usage_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners view own usage records"
  ON public.wl_usage_records FOR SELECT
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Admin full access on wl_usage_records"
  ON public.wl_usage_records FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Billing full access on wl_usage_records"
  ON public.wl_usage_records FOR ALL
  USING (public.has_role(auth.uid(), 'billing'));

-- 12. wl_partner_usage_summary (monthly aggregate per partner)
CREATE TABLE public.wl_partner_usage_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  total_minutes_all_clients NUMERIC NOT NULL DEFAULT 0,
  total_calls_all_clients INTEGER NOT NULL DEFAULT 0,
  active_client_count INTEGER NOT NULL DEFAULT 0,
  volume_discount_active BOOLEAN NOT NULL DEFAULT false,
  volume_discount_rate NUMERIC,
  total_campaign_fees NUMERIC NOT NULL DEFAULT 0,
  total_wholesale_cost NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_id, billing_period_start)
);

ALTER TABLE public.wl_partner_usage_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners view own usage summary"
  ON public.wl_partner_usage_summary FOR SELECT
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Admin full access on wl_partner_usage_summary"
  ON public.wl_partner_usage_summary FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Billing full access on wl_partner_usage_summary"
  ON public.wl_partner_usage_summary FOR ALL
  USING (public.has_role(auth.uid(), 'billing'));

-- 13. Alter client_report_mappings: add WL routing columns
ALTER TABLE public.client_report_mappings
  ADD COLUMN wl_client_id UUID REFERENCES public.white_label_clients(id),
  ADD COLUMN partner_id UUID REFERENCES public.white_label_partners(id);

-- 14. Alter white_label_branding: add client-facing branding fields
ALTER TABLE public.white_label_branding
  ADD COLUMN company_name TEXT,
  ADD COLUMN support_email TEXT,
  ADD COLUMN support_phone TEXT,
  ADD COLUMN favicon_url TEXT,
  ADD COLUMN login_page_title TEXT DEFAULT 'Client Portal',
  ADD COLUMN welcome_message TEXT;

-- 15. Triggers for updated_at
CREATE TRIGGER update_wl_wholesale_pricing_updated_at
  BEFORE UPDATE ON public.wl_wholesale_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wl_client_service_config_updated_at
  BEFORE UPDATE ON public.wl_client_service_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wl_knowledge_base_updated_at
  BEFORE UPDATE ON public.wl_knowledge_base
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wl_client_tickets_updated_at
  BEFORE UPDATE ON public.wl_client_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wl_usage_records_updated_at
  BEFORE UPDATE ON public.wl_usage_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wl_partner_usage_summary_updated_at
  BEFORE UPDATE ON public.wl_partner_usage_summary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
