
-- WordPress Connections for White Label Partners
CREATE TABLE public.wl_wordpress_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  site_url text NOT NULL,
  wp_username text NOT NULL,
  app_password text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  last_tested_at timestamptz,
  auto_publish boolean NOT NULL DEFAULT false,
  default_category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(partner_id)
);

ALTER TABLE public.wl_wordpress_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view their own WP connection"
  ON public.wl_wordpress_connections FOR SELECT
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can insert their own WP connection"
  ON public.wl_wordpress_connections FOR INSERT
  WITH CHECK (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can update their own WP connection"
  ON public.wl_wordpress_connections FOR UPDATE
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can delete their own WP connection"
  ON public.wl_wordpress_connections FOR DELETE
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

-- Keyword Tracker for White Label Partners
CREATE TABLE public.wl_keyword_tracker (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  category text NOT NULL DEFAULT 'service',
  content_status text NOT NULL DEFAULT 'not_started',
  sort_priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wl_keyword_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view their own keywords"
  ON public.wl_keyword_tracker FOR SELECT
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can insert their own keywords"
  ON public.wl_keyword_tracker FOR INSERT
  WITH CHECK (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can update their own keywords"
  ON public.wl_keyword_tracker FOR UPDATE
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can delete their own keywords"
  ON public.wl_keyword_tracker FOR DELETE
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

-- Blog Queue for White Label Partners
CREATE TABLE public.wl_blog_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id uuid NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  keyword_id uuid REFERENCES public.wl_keyword_tracker(id) ON DELETE SET NULL,
  keyword_text text NOT NULL,
  content_length text NOT NULL DEFAULT 'medium',
  tone text NOT NULL DEFAULT 'professional',
  angle text,
  status text NOT NULL DEFAULT 'queued',
  generated_title text,
  generated_content text,
  generated_meta_title text,
  generated_meta_description text,
  generated_excerpt text,
  wp_post_id integer,
  wp_post_url text,
  error_message text,
  priority integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wl_blog_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view their own blog queue"
  ON public.wl_blog_queue FOR SELECT
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can insert into their own blog queue"
  ON public.wl_blog_queue FOR INSERT
  WITH CHECK (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can update their own blog queue"
  ON public.wl_blog_queue FOR UPDATE
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "Partners can delete from their own blog queue"
  ON public.wl_blog_queue FOR DELETE
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

-- Triggers for updated_at
CREATE TRIGGER update_wl_wordpress_connections_updated_at
  BEFORE UPDATE ON public.wl_wordpress_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wl_keyword_tracker_updated_at
  BEFORE UPDATE ON public.wl_keyword_tracker
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_wl_blog_queue_updated_at
  BEFORE UPDATE ON public.wl_blog_queue
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_wl_keyword_tracker_partner ON public.wl_keyword_tracker(partner_id);
CREATE INDEX idx_wl_blog_queue_partner ON public.wl_blog_queue(partner_id);
CREATE INDEX idx_wl_blog_queue_status ON public.wl_blog_queue(status);
