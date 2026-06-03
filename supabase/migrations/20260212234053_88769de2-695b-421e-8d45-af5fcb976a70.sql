
-- ===== ADMIN TABLES =====

-- Admin Social Snippets
CREATE TABLE public.admin_social_snippets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id UUID REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  platform TEXT NOT NULL, -- linkedin, facebook, x
  snippet_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.admin_social_snippets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage admin_social_snippets" ON public.admin_social_snippets
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Admin SEO Reports
CREATE TABLE public.admin_seo_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_month DATE NOT NULL,
  total_posts INT DEFAULT 0,
  total_keywords INT DEFAULT 0,
  keywords_covered INT DEFAULT 0,
  narrative TEXT,
  report_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.admin_seo_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage admin_seo_reports" ON public.admin_seo_reports
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Admin Newsletter Drafts
CREATE TABLE public.admin_newsletter_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_month DATE NOT NULL,
  subject_line TEXT,
  html_content TEXT,
  plain_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID
);
ALTER TABLE public.admin_newsletter_drafts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage admin_newsletter_drafts" ON public.admin_newsletter_drafts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Admin WordPress Connection
CREATE TABLE public.admin_wordpress_connection (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_url TEXT NOT NULL,
  username TEXT NOT NULL,
  app_password_encrypted TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_wordpress_connection ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage admin_wordpress_connection" ON public.admin_wordpress_connection
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Admin Email Connections (Resend)
CREATE TABLE public.admin_email_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'resend',
  api_key_encrypted TEXT NOT NULL,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_email_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage admin_email_connections" ON public.admin_email_connections
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Admin Email Contacts
CREATE TABLE public.admin_email_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  tags TEXT[] DEFAULT '{}',
  subscribed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_email_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage admin_email_contacts" ON public.admin_email_contacts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Admin Email Sends
CREATE TABLE public.admin_email_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  newsletter_draft_id UUID REFERENCES public.admin_newsletter_drafts(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  recipients_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  resend_batch_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_email_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage admin_email_sends" ON public.admin_email_sends
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ===== WL TABLES =====

-- WL Email Connections
CREATE TABLE public.wl_email_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'resend',
  api_key_encrypted TEXT NOT NULL,
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  last_tested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wl_email_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners manage own wl_email_connections" ON public.wl_email_connections
  FOR ALL USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins manage all wl_email_connections" ON public.wl_email_connections
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- WL Email Contacts
CREATE TABLE public.wl_email_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  tags TEXT[] DEFAULT '{}',
  subscribed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wl_email_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners manage own wl_email_contacts" ON public.wl_email_contacts
  FOR ALL USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins manage all wl_email_contacts" ON public.wl_email_contacts
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- WL Email Sends
CREATE TABLE public.wl_email_sends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  newsletter_draft_id UUID REFERENCES public.wl_newsletter_drafts(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  recipients_count INT DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  resend_batch_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wl_email_sends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Partners manage own wl_email_sends" ON public.wl_email_sends
  FOR ALL USING (
    partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid())
  );
CREATE POLICY "Admins manage all wl_email_sends" ON public.wl_email_sends
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
