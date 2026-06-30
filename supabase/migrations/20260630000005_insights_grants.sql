-- Blog / Growth Hub
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.keyword_tracker TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.autoblog_queue TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_wordpress_connection TO authenticated;

-- Analytics
GRANT SELECT ON public.wl_partner_usage_summary TO authenticated;

-- Discoverability (all 10 tables)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.disc_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.disc_locations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.disc_keywords TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.disc_audiences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.disc_faq_sets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.disc_faqs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.disc_internal_link_sets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.disc_internal_link_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.disc_generated_pages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.disc_publish_log TO authenticated;
