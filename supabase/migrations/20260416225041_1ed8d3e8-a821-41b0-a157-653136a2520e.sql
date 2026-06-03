-- =========================================================
-- Discoverability Engine — Phase 1 Schema
-- =========================================================

-- A. Templates
CREATE TABLE public.disc_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug_pattern TEXT NOT NULL,
  page_type TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  title_template TEXT,
  meta_title_template TEXT,
  meta_description_template TEXT,
  og_title_template TEXT,
  og_description_template TEXT,
  breadcrumb_template TEXT,
  h1_template TEXT,
  hero_template TEXT,
  direct_answer_template TEXT,
  local_overview_template TEXT,
  problem_section_template TEXT,
  solution_section_template TEXT,
  feature_section_template TEXT,
  faq_intro_template TEXT,
  cta_template TEXT,
  schema_type_defaults JSONB DEFAULT '[]'::jsonb,
  internal_link_defaults JSONB DEFAULT '[]'::jsonb,
  min_word_count INTEGER NOT NULL DEFAULT 400,
  min_faq_count INTEGER NOT NULL DEFAULT 3,
  quality_threshold INTEGER NOT NULL DEFAULT 70,
  requires_location_specific_content BOOLEAN NOT NULL DEFAULT false,
  requires_keyword_specific_content BOOLEAN NOT NULL DEFAULT false,
  requires_audience_specific_content BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- B. Locations
CREATE TABLE public.disc_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  city TEXT NOT NULL,
  city_slug TEXT NOT NULL,
  state_or_province TEXT,
  state_or_province_slug TEXT,
  state_or_province_abbr TEXT,
  country TEXT NOT NULL,
  country_slug TEXT NOT NULL,
  metro TEXT,
  region TEXT,
  nearby_cities JSONB DEFAULT '[]'::jsonb,
  priority_score INTEGER NOT NULL DEFAULT 50,
  active BOOLEAN NOT NULL DEFAULT true,
  custom_city_intro TEXT,
  local_challenge TEXT,
  local_benefit TEXT,
  service_boundary_note TEXT,
  custom_cta_override TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_slug, state_or_province_slug, city_slug)
);

CREATE INDEX idx_disc_locations_country ON public.disc_locations(country_slug);
CREATE INDEX idx_disc_locations_active ON public.disc_locations(active);
CREATE INDEX idx_disc_locations_priority ON public.disc_locations(priority_score DESC);

-- C. Keywords / Topics
CREATE TABLE public.disc_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword TEXT NOT NULL,
  keyword_slug TEXT NOT NULL UNIQUE,
  keyword_plural TEXT,
  topic_cluster TEXT,
  search_intent TEXT,
  audience_default UUID,
  product_category TEXT,
  primary_cta_type TEXT,
  default_direct_answer TEXT,
  default_problem_angle TEXT,
  default_solution_angle TEXT,
  default_feature_set JSONB DEFAULT '[]'::jsonb,
  default_faq_set_id UUID,
  active BOOLEAN NOT NULL DEFAULT true,
  priority_score INTEGER NOT NULL DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disc_keywords_active ON public.disc_keywords(active);
CREATE INDEX idx_disc_keywords_cluster ON public.disc_keywords(topic_cluster);

-- D. Audiences
CREATE TABLE public.disc_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audience_name TEXT NOT NULL,
  audience_slug TEXT NOT NULL UNIQUE,
  audience_type TEXT NOT NULL DEFAULT 'industry',
  description TEXT,
  primary_needs JSONB DEFAULT '[]'::jsonb,
  messaging_angle TEXT,
  default_cta TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disc_audiences_active ON public.disc_audiences(active);

-- E. FAQ Sets
CREATE TABLE public.disc_faq_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  topic_cluster TEXT,
  audience TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- F. FAQs
CREATE TABLE public.disc_faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_set_id UUID NOT NULL REFERENCES public.disc_faq_sets(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  answer_short TEXT,
  answer_full TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  applicable_page_types JSONB DEFAULT '[]'::jsonb,
  applicable_keywords JSONB DEFAULT '[]'::jsonb,
  applicable_countries JSONB DEFAULT '[]'::jsonb,
  applicable_audiences JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disc_faqs_set ON public.disc_faqs(faq_set_id);

-- G. Internal Link Sets
CREATE TABLE public.disc_internal_link_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  link_group_type TEXT NOT NULL DEFAULT 'cluster',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- H. Internal Link Items
CREATE TABLE public.disc_internal_link_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_set_id UUID NOT NULL REFERENCES public.disc_internal_link_sets(id) ON DELETE CASCADE,
  anchor_text TEXT NOT NULL,
  target_url TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT 'pillar',
  display_order INTEGER NOT NULL DEFAULT 0,
  conditions_json JSONB DEFAULT '{}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disc_link_items_set ON public.disc_internal_link_items(link_set_id);

-- I. Generated Pages
CREATE TABLE public.disc_generated_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES public.disc_templates(id) ON DELETE SET NULL,
  location_id UUID REFERENCES public.disc_locations(id) ON DELETE SET NULL,
  keyword_id UUID REFERENCES public.disc_keywords(id) ON DELETE SET NULL,
  audience_id UUID REFERENCES public.disc_audiences(id) ON DELETE SET NULL,
  page_type TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  full_url TEXT,
  page_title TEXT,
  meta_title TEXT,
  meta_description TEXT,
  canonical_url TEXT,
  og_title TEXT,
  og_description TEXT,
  breadcrumb_title TEXT,
  h1 TEXT,
  hero_content TEXT,
  direct_answer_content TEXT,
  local_overview_content TEXT,
  problem_section_content TEXT,
  solution_section_content TEXT,
  feature_section_content TEXT,
  faq_content JSONB DEFAULT '[]'::jsonb,
  faq_set_id UUID REFERENCES public.disc_faq_sets(id) ON DELETE SET NULL,
  internal_links_payload JSONB DEFAULT '[]'::jsonb,
  schema_payload JSONB DEFAULT '{}'::jsonb,
  word_count INTEGER NOT NULL DEFAULT 0,
  quality_score INTEGER NOT NULL DEFAULT 0,
  duplicate_warning_score INTEGER NOT NULL DEFAULT 0,
  readiness_state TEXT NOT NULL DEFAULT 'draft',
  publish_status TEXT NOT NULL DEFAULT 'unpublished',
  indexation_status TEXT NOT NULL DEFAULT 'index',
  include_in_sitemap BOOLEAN NOT NULL DEFAULT false,
  manual_override BOOLEAN NOT NULL DEFAULT false,
  source_combination_hash TEXT,
  last_updated_display TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

CREATE INDEX idx_disc_pages_publish ON public.disc_generated_pages(publish_status);
CREATE INDEX idx_disc_pages_readiness ON public.disc_generated_pages(readiness_state);
CREATE INDEX idx_disc_pages_template ON public.disc_generated_pages(template_id);
CREATE INDEX idx_disc_pages_location ON public.disc_generated_pages(location_id);
CREATE INDEX idx_disc_pages_keyword ON public.disc_generated_pages(keyword_id);
CREATE INDEX idx_disc_pages_combo_hash ON public.disc_generated_pages(source_combination_hash);

-- J. Publish / Audit Log
CREATE TABLE public.disc_publish_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generated_page_id UUID NOT NULL REFERENCES public.disc_generated_pages(id) ON DELETE CASCADE,
  actor_user_id UUID,
  action_type TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_disc_publish_log_page ON public.disc_publish_log(generated_page_id);
CREATE INDEX idx_disc_publish_log_created ON public.disc_publish_log(created_at DESC);

-- =========================================================
-- updated_at triggers (reuse existing public.update_updated_at_column)
-- =========================================================
CREATE TRIGGER tr_disc_templates_updated BEFORE UPDATE ON public.disc_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_disc_locations_updated BEFORE UPDATE ON public.disc_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_disc_keywords_updated BEFORE UPDATE ON public.disc_keywords
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_disc_audiences_updated BEFORE UPDATE ON public.disc_audiences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_disc_faq_sets_updated BEFORE UPDATE ON public.disc_faq_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_disc_faqs_updated BEFORE UPDATE ON public.disc_faqs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_disc_link_sets_updated BEFORE UPDATE ON public.disc_internal_link_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_disc_link_items_updated BEFORE UPDATE ON public.disc_internal_link_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER tr_disc_pages_updated BEFORE UPDATE ON public.disc_generated_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- RLS — admin-only across the board
-- =========================================================
ALTER TABLE public.disc_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disc_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disc_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disc_audiences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disc_faq_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disc_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disc_internal_link_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disc_internal_link_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disc_generated_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disc_publish_log ENABLE ROW LEVEL SECURITY;

-- Helper macro pattern: 4 policies per table (select/insert/update/delete) restricted to admins
CREATE POLICY "disc_templates admin all" ON public.disc_templates
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "disc_locations admin all" ON public.disc_locations
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "disc_keywords admin all" ON public.disc_keywords
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "disc_audiences admin all" ON public.disc_audiences
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "disc_faq_sets admin all" ON public.disc_faq_sets
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "disc_faqs admin all" ON public.disc_faqs
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "disc_link_sets admin all" ON public.disc_internal_link_sets
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "disc_link_items admin all" ON public.disc_internal_link_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "disc_pages admin all" ON public.disc_generated_pages
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "disc_publish_log admin all" ON public.disc_publish_log
  FOR ALL USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));