
-- =============================================
-- Blog System: Tables, RLS, Realtime, Keywords
-- =============================================

-- 1. blog_posts
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT,
  featured_image_url TEXT,
  author TEXT DEFAULT '24H Virtual',
  category TEXT DEFAULT 'Tips & Guides',
  tags TEXT[] DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  scheduled_publish_at TIMESTAMPTZ,
  meta_title TEXT,
  meta_description TEXT,
  old_wordpress_url TEXT,
  reading_time INTEGER DEFAULT 5,
  content_word_count INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0,
  ai_generated BOOLEAN DEFAULT false,
  internal_link_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "Published blog posts are publicly readable"
  ON public.blog_posts FOR SELECT
  USING (status = 'published');

-- Admins can do everything
CREATE POLICY "Admins can manage all blog posts"
  ON public.blog_posts FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Updated_at trigger
CREATE TRIGGER update_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 2. keyword_tracker
CREATE TABLE public.keyword_tracker (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'primary',
  search_volume INTEGER DEFAULT 0,
  difficulty TEXT DEFAULT 'medium',
  target_page TEXT,
  target_blog_post_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  content_status TEXT NOT NULL DEFAULT 'no_content',
  ranking_position INTEGER,
  monthly_impressions INTEGER,
  monthly_clicks INTEGER,
  ctr NUMERIC,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.keyword_tracker ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage keyword tracker"
  ON public.keyword_tracker FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_keyword_tracker_updated_at
  BEFORE UPDATE ON public.keyword_tracker
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 3. autoblog_queue
CREATE TABLE public.autoblog_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id UUID REFERENCES public.keyword_tracker(id) ON DELETE SET NULL,
  keyword_text TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'queued',
  content_length TEXT NOT NULL DEFAULT 'medium',
  tone TEXT NOT NULL DEFAULT 'professional',
  angle TEXT,
  generated_post_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.autoblog_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage autoblog queue"
  ON public.autoblog_queue FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_autoblog_queue_updated_at
  BEFORE UPDATE ON public.autoblog_queue
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.autoblog_queue;

-- 4. blog_internal_links
CREATE TABLE public.blog_internal_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  target_url TEXT NOT NULL,
  anchor_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blog_internal_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage blog internal links"
  ON public.blog_internal_links FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =============================================
-- Seed 100 Keywords
-- =============================================

INSERT INTO public.keyword_tracker (keyword, category, search_volume, difficulty, target_page, content_status) VALUES
-- Service keywords (20)
('virtual receptionist', 'primary', 12100, 'high', '/services/virtual-receptionist', 'no_content'),
('answering service', 'primary', 9900, 'high', '/services/virtual-receptionist', 'no_content'),
('virtual receptionist service', 'primary', 6600, 'high', '/services/virtual-receptionist', 'no_content'),
('live answering service', 'primary', 4400, 'medium', '/services/virtual-receptionist', 'no_content'),
('phone answering service', 'primary', 3600, 'medium', '/services/virtual-receptionist', 'no_content'),
('24 hour answering service', 'primary', 2900, 'medium', '/services/virtual-receptionist', 'no_content'),
('after hours answering service', 'primary', 2400, 'medium', '/services/virtual-receptionist', 'no_content'),
('virtual secretary', 'primary', 1900, 'medium', '/services/virtual-secretary', 'no_content'),
('message taking service', 'primary', 1600, 'low', '/services/message-assistant', 'no_content'),
('business answering service', 'primary', 1300, 'medium', '/services/virtual-receptionist', 'no_content'),
('remote receptionist', 'primary', 1100, 'medium', '/services/virtual-receptionist', 'no_content'),
('telephone answering service', 'primary', 880, 'medium', '/services/virtual-receptionist', 'no_content'),
('call answering service', 'primary', 720, 'medium', '/services/virtual-receptionist', 'no_content'),
('virtual assistant services', 'primary', 5400, 'high', '/services/virtual-assistants', 'no_content'),
('bilingual answering service', 'primary', 590, 'low', '/services/virtual-receptionist', 'no_content'),
('overflow call handling', 'primary', 480, 'low', '/services/virtual-receptionist', 'no_content'),
('appointment scheduling service', 'primary', 1000, 'medium', '/services/virtual-secretary', 'no_content'),
('call screening service', 'primary', 390, 'low', '/services/virtual-receptionist', 'no_content'),
('small business answering service', 'primary', 2100, 'medium', '/services/virtual-receptionist', 'no_content'),
('professional answering service', 'primary', 1400, 'medium', '/services/virtual-receptionist', 'no_content'),
-- Comparison/Decision keywords (15)
('best virtual receptionist service', 'secondary', 1600, 'high', '/pricing', 'no_content'),
('ruby receptionist alternative', 'secondary', 720, 'medium', '/pricing', 'no_content'),
('smith ai vs ruby receptionist', 'secondary', 480, 'medium', '/pricing', 'no_content'),
('answering service pricing', 'secondary', 2400, 'medium', '/pricing', 'no_content'),
('virtual receptionist cost', 'secondary', 1900, 'medium', '/pricing', 'no_content'),
('answering service comparison', 'secondary', 880, 'medium', '/pricing', 'no_content'),
('best answering service for small business', 'secondary', 1300, 'medium', '/pricing', 'no_content'),
('abby connect alternative', 'secondary', 390, 'low', '/pricing', 'no_content'),
('receptionist service reviews', 'secondary', 590, 'medium', '/pricing', 'no_content'),
('cheap answering service', 'secondary', 1600, 'medium', '/pricing', 'no_content'),
('answering service free trial', 'secondary', 720, 'low', '/pricing', 'no_content'),
('virtual receptionist vs in house', 'secondary', 480, 'low', '/pricing', 'no_content'),
('outsourced receptionist', 'secondary', 590, 'low', '/pricing', 'no_content'),
('lex reception alternative', 'secondary', 260, 'low', '/pricing', 'no_content'),
('receptionhq alternative', 'secondary', 210, 'low', '/pricing', 'no_content'),
-- Industry-specific keywords (20)
('answering service for doctors', 'long-tail', 1600, 'medium', '/industries/medical-practices', 'no_content'),
('legal answering service', 'long-tail', 1900, 'high', '/industries/legal-services', 'no_content'),
('medical answering service', 'long-tail', 2400, 'high', '/industries/medical-practices', 'no_content'),
('HIPAA compliant answering service', 'long-tail', 1300, 'medium', '/industries/medical-practices', 'no_content'),
('answering service for law firms', 'long-tail', 1100, 'medium', '/industries/legal-services', 'no_content'),
('real estate answering service', 'long-tail', 880, 'medium', '/industries/real-estate', 'no_content'),
('HVAC answering service', 'long-tail', 720, 'low', '/industries/home-services', 'no_content'),
('plumber answering service', 'long-tail', 590, 'low', '/industries/home-services', 'no_content'),
('dental office answering service', 'long-tail', 720, 'medium', '/industries/medical-practices', 'no_content'),
('veterinary answering service', 'long-tail', 480, 'low', '/industries/veterinary', 'no_content'),
('salon receptionist service', 'long-tail', 390, 'low', '/industries/beauty-wellness', 'no_content'),
('financial advisor answering service', 'long-tail', 480, 'low', '/industries/financial-services', 'no_content'),
('property management answering service', 'long-tail', 590, 'low', '/industries/real-estate', 'no_content'),
('IT support answering service', 'long-tail', 390, 'low', '/industries/it-tech-support', 'no_content'),
('nonprofit answering service', 'long-tail', 320, 'low', '/industries/nonprofits', 'no_content'),
('emergency answering service', 'long-tail', 880, 'medium', '/industries/emergency-services', 'no_content'),
('contractor answering service', 'long-tail', 590, 'low', '/industries/home-services', 'no_content'),
('therapy practice answering service', 'long-tail', 480, 'low', '/industries/counseling-therapy', 'no_content'),
('event planner answering service', 'long-tail', 260, 'low', '/industries/event-planning', 'no_content'),
('trucking company answering service', 'long-tail', 390, 'low', '/industries/transportation-logistics', 'no_content'),
-- Problem/Question keywords (20)
('how does a virtual receptionist work', 'long-tail', 1300, 'low', '/how-it-works', 'no_content'),
('cost of missed calls for business', 'long-tail', 590, 'low', '/cost-calculator', 'no_content'),
('how much does an answering service cost', 'long-tail', 1900, 'medium', '/pricing', 'no_content'),
('benefits of a virtual receptionist', 'long-tail', 720, 'low', '/services/virtual-receptionist', 'no_content'),
('do i need an answering service', 'long-tail', 480, 'low', '/how-it-works', 'no_content'),
('how to stop missing business calls', 'long-tail', 320, 'low', '/services/virtual-receptionist', 'no_content'),
('what is a virtual receptionist', 'long-tail', 2400, 'low', '/services/virtual-receptionist', 'no_content'),
('answering service vs voicemail', 'long-tail', 590, 'low', '/how-it-works', 'no_content'),
('how to improve customer service phone', 'long-tail', 720, 'low', '/services/virtual-receptionist', 'no_content'),
('virtual receptionist vs chatbot', 'long-tail', 480, 'low', '/services/ai-receptionist', 'no_content'),
('how to handle after hours calls', 'long-tail', 390, 'low', '/services/virtual-receptionist', 'no_content'),
('when to hire a receptionist', 'long-tail', 590, 'low', '/how-it-works', 'no_content'),
('ROI of answering service', 'long-tail', 320, 'low', '/cost-calculator', 'no_content'),
('can a virtual receptionist schedule appointments', 'long-tail', 390, 'low', '/services/virtual-secretary', 'no_content'),
('how to reduce missed calls', 'long-tail', 480, 'low', '/services/virtual-receptionist', 'no_content'),
('live receptionist vs automated', 'long-tail', 590, 'low', '/services/virtual-receptionist', 'no_content'),
('virtual receptionist for solopreneur', 'long-tail', 320, 'low', '/pricing', 'no_content'),
('answering service HIPAA requirements', 'long-tail', 480, 'low', '/industries/medical-practices', 'no_content'),
('how to choose an answering service', 'long-tail', 720, 'low', '/pricing', 'no_content'),
('missed call statistics small business', 'long-tail', 260, 'low', '/cost-calculator', 'no_content'),
-- Location keywords (15)
('virtual receptionist new york', 'local', 880, 'high', '/locations/new-york', 'no_content'),
('answering service los angeles', 'local', 720, 'high', '/locations/los-angeles', 'no_content'),
('answering service chicago', 'local', 590, 'medium', '/locations/chicago', 'no_content'),
('virtual receptionist houston', 'local', 480, 'medium', '/locations/houston', 'no_content'),
('answering service miami', 'local', 590, 'medium', '/locations/miami', 'no_content'),
('virtual receptionist dallas', 'local', 390, 'medium', '/locations/dallas', 'no_content'),
('answering service atlanta', 'local', 480, 'medium', '/locations/atlanta', 'no_content'),
('virtual receptionist san francisco', 'local', 390, 'medium', '/locations/san-francisco', 'no_content'),
('answering service toronto', 'local', 720, 'medium', '/locations/toronto', 'no_content'),
('virtual receptionist vancouver', 'local', 480, 'medium', '/locations/vancouver', 'no_content'),
('answering service denver', 'local', 320, 'low', '/locations/denver', 'no_content'),
('virtual receptionist seattle', 'local', 390, 'medium', '/locations/seattle', 'no_content'),
('answering service phoenix', 'local', 320, 'low', '/locations/phoenix', 'no_content'),
('virtual receptionist boston', 'local', 390, 'medium', '/locations/boston', 'no_content'),
('answering service austin', 'local', 320, 'low', '/locations/austin', 'no_content'),
-- AI-Era keywords (10)
('AI receptionist', 'primary', 3600, 'high', '/services/ai-receptionist', 'no_content'),
('AI answering service', 'primary', 2400, 'high', '/services/ai-receptionist', 'no_content'),
('AI phone answering', 'primary', 1600, 'medium', '/services/ai-receptionist', 'no_content'),
('voice AI for business', 'primary', 880, 'medium', '/services/ai-receptionist', 'no_content'),
('AI vs human receptionist', 'primary', 720, 'low', '/services/ai-receptionist', 'no_content'),
('conversational AI for business calls', 'primary', 480, 'medium', '/services/ai-receptionist', 'no_content'),
('hybrid AI receptionist', 'primary', 320, 'low', '/services/hybrid-receptionist', 'no_content'),
('AI call handling', 'primary', 590, 'medium', '/services/ai-receptionist', 'no_content'),
('automated receptionist vs live', 'primary', 480, 'low', '/services/hybrid-receptionist', 'no_content'),
('future of receptionist services', 'primary', 260, 'low', '/services/ai-receptionist', 'no_content');
