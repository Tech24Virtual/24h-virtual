
-- Drop overly permissive service role policies
DROP POLICY "Service role full access snippets" ON public.wl_social_snippets;
DROP POLICY "Service role full access reports" ON public.wl_seo_reports;
DROP POLICY "Service role full access drafts" ON public.wl_newsletter_drafts;
