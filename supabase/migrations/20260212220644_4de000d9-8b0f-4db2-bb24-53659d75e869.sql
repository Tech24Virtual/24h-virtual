
-- Social Media Snippets
CREATE TABLE public.wl_social_snippets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  blog_queue_id UUID NOT NULL REFERENCES public.wl_blog_queue(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('linkedin', 'facebook', 'twitter')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wl_social_snippets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own snippets" ON public.wl_social_snippets
  FOR SELECT USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can insert own snippets" ON public.wl_social_snippets
  FOR INSERT WITH CHECK (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can delete own snippets" ON public.wl_social_snippets
  FOR DELETE USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

-- SEO Reports
CREATE TABLE public.wl_seo_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  report_month DATE NOT NULL,
  stats_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  narrative TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(partner_id, report_month)
);

ALTER TABLE public.wl_seo_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own reports" ON public.wl_seo_reports
  FOR SELECT USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can insert own reports" ON public.wl_seo_reports
  FOR INSERT WITH CHECK (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can delete own reports" ON public.wl_seo_reports
  FOR DELETE USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

-- Newsletter Drafts
CREATE TABLE public.wl_newsletter_drafts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  draft_month DATE NOT NULL,
  subject_line TEXT,
  html_content TEXT,
  plain_text TEXT,
  post_ids UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.wl_newsletter_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view own drafts" ON public.wl_newsletter_drafts
  FOR SELECT USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can insert own drafts" ON public.wl_newsletter_drafts
  FOR INSERT WITH CHECK (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can delete own drafts" ON public.wl_newsletter_drafts
  FOR DELETE USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

-- Service role policies for edge functions
CREATE POLICY "Service role full access snippets" ON public.wl_social_snippets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access reports" ON public.wl_seo_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access drafts" ON public.wl_newsletter_drafts FOR ALL USING (true) WITH CHECK (true);
