
-- Public read policy: only fully published, indexable, sitemap-included pages
CREATE POLICY "disc_pages public read published"
ON public.disc_generated_pages
FOR SELECT
TO anon, authenticated
USING (
  publish_status = 'published'
  AND indexation_status = 'index'
  AND include_in_sitemap = true
);

-- Growth overview view (admin via RLS on underlying tables)
CREATE OR REPLACE VIEW public.v_growth_overview
WITH (security_invoker = true) AS
SELECT
  (SELECT count(*) FROM public.disc_generated_pages) AS disc_pages_total,
  (SELECT count(*) FROM public.disc_generated_pages WHERE publish_status = 'published') AS disc_pages_published,
  (SELECT count(*) FROM public.disc_generated_pages WHERE publish_status = 'draft') AS disc_pages_draft,
  (SELECT count(*) FROM public.disc_generated_pages WHERE readiness_state = 'approved' AND publish_status <> 'published') AS disc_pages_ready_to_publish,
  (SELECT count(*) FROM public.disc_generated_pages WHERE readiness_state = 'needs_rewrite') AS disc_pages_needs_rewrite,
  (SELECT count(*) FROM public.disc_templates WHERE status = 'active') AS disc_templates_active,
  (SELECT count(*) FROM public.disc_keywords WHERE active = true) AS disc_keywords_active,
  (SELECT count(*) FROM public.disc_locations WHERE active = true) AS disc_locations_active,
  (SELECT count(*) FROM public.disc_audiences WHERE active = true) AS disc_audiences_active,
  (SELECT count(*) FROM public.blog_posts WHERE status = 'published') AS blog_posts_published,
  (SELECT count(*) FROM public.blog_posts WHERE status = 'draft') AS blog_posts_draft,
  (SELECT count(*) FROM public.blog_posts) AS blog_posts_total,
  (SELECT count(*) FROM public.keyword_tracker) AS keywords_tracked;

GRANT SELECT ON public.v_growth_overview TO authenticated;

-- publish_disc_page RPC
CREATE OR REPLACE FUNCTION public.publish_disc_page(
  _page_id uuid,
  _action text,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_old_publish text;
  v_old_readiness text;
  v_new_publish text;
  v_new_readiness text;
  v_indexation text;
  v_sitemap boolean;
  v_slug text;
BEGIN
  IF v_user IS NULL OR NOT has_role(v_user, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT publish_status, readiness_state, indexation_status, include_in_sitemap, slug
  INTO v_old_publish, v_old_readiness, v_indexation, v_sitemap, v_slug
  FROM public.disc_generated_pages WHERE id = _page_id FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'page not found'; END IF;

  IF _action = 'approve' THEN
    v_new_readiness := 'approved'; v_new_publish := v_old_publish;
  ELSIF _action = 'request_rewrite' THEN
    v_new_readiness := 'needs_rewrite'; v_new_publish := v_old_publish;
  ELSIF _action = 'publish' THEN
    IF v_old_readiness <> 'approved' THEN RAISE EXCEPTION 'page must be approved before publish'; END IF;
    v_new_publish := 'published'; v_new_readiness := v_old_readiness;
    v_indexation := 'index'; v_sitemap := true;
  ELSIF _action = 'unpublish' THEN
    v_new_publish := 'draft'; v_new_readiness := v_old_readiness; v_sitemap := false;
  ELSE
    RAISE EXCEPTION 'unknown action: %', _action;
  END IF;

  UPDATE public.disc_generated_pages
  SET publish_status = v_new_publish,
      readiness_state = v_new_readiness,
      indexation_status = v_indexation,
      include_in_sitemap = v_sitemap,
      published_at = CASE WHEN _action='publish' THEN now() ELSE published_at END,
      updated_at = now()
  WHERE id = _page_id;

  INSERT INTO public.disc_publish_log (generated_page_id, actor_user_id, action_type, old_status, new_status, notes)
  VALUES (_page_id, v_user, _action, v_old_publish, v_new_publish, _notes);

  IF _action IN ('publish','unpublish') THEN
    INSERT INTO public.dashboard_events (event_type, surface, actor_user_id, payload)
    VALUES (
      CASE WHEN _action='publish' THEN 'growth.disc.page.published' ELSE 'growth.disc.page.unpublished' END,
      'admin.discoverability',
      v_user,
      jsonb_build_object('page_id', _page_id, 'slug', v_slug)
    );
  END IF;

  RETURN jsonb_build_object('id', _page_id, 'publish_status', v_new_publish, 'readiness_state', v_new_readiness);
END;
$$;

REVOKE ALL ON FUNCTION public.publish_disc_page(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_disc_page(uuid, text, text) TO authenticated;

-- blog_posts published event trigger
CREATE OR REPLACE FUNCTION public.trg_blog_posts_emit_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'published' AND COALESCE(OLD.status,'') <> 'published' THEN
    INSERT INTO public.dashboard_events (event_type, surface, actor_user_id, payload)
    VALUES ('growth.content.published', 'admin.blog', auth.uid(),
            jsonb_build_object('post_id', NEW.id, 'slug', NEW.slug, 'title', NEW.title));
  ELSIF TG_OP = 'INSERT' AND NEW.status = 'published' THEN
    INSERT INTO public.dashboard_events (event_type, surface, actor_user_id, payload)
    VALUES ('growth.content.published', 'admin.blog', auth.uid(),
            jsonb_build_object('post_id', NEW.id, 'slug', NEW.slug, 'title', NEW.title));
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.trg_blog_posts_emit_published() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_blog_posts_emit_published ON public.blog_posts;
CREATE TRIGGER trg_blog_posts_emit_published
AFTER INSERT OR UPDATE OF status ON public.blog_posts
FOR EACH ROW EXECUTE FUNCTION public.trg_blog_posts_emit_published();
