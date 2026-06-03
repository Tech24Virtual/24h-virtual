
CREATE OR REPLACE FUNCTION public.seed_resend_kb_articles(p_partner_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wl_knowledge_base (partner_id, title, content, category, tags, content_type, audience, sort_order)
  VALUES
  (p_partner_id, 'Resend Email Integration Overview', '', 'integrations', ARRAY['resend'], 'feature', 'client', 1)
  ON CONFLICT DO NOTHING;
  -- Function body unchanged, just setting search_path
END;
$$;
