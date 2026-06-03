CREATE TABLE public.wl_client_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID NOT NULL REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  wl_client_id UUID NOT NULL REFERENCES public.white_label_clients(id) ON DELETE CASCADE,
  reviewer_name TEXT,
  reviewer_email TEXT,
  rating INTEGER NOT NULL DEFAULT 5,
  title TEXT,
  content TEXT,
  source TEXT NOT NULL DEFAULT 'portal',
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_wl_client_reviews_partner ON public.wl_client_reviews(partner_id);
CREATE INDEX idx_wl_client_reviews_client ON public.wl_client_reviews(wl_client_id);

ALTER TABLE public.wl_client_reviews ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.validate_wl_review_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_wl_client_reviews_validate
  BEFORE INSERT OR UPDATE ON public.wl_client_reviews
  FOR EACH ROW EXECUTE FUNCTION public.validate_wl_review_rating();

CREATE POLICY "Admin full access on wl_client_reviews"
  ON public.wl_client_reviews FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Billing read wl_client_reviews"
  ON public.wl_client_reviews FOR SELECT
  USING (has_role(auth.uid(), 'billing'::app_role));

CREATE POLICY "Supervisor read wl_client_reviews"
  ON public.wl_client_reviews FOR SELECT
  USING (has_role(auth.uid(), 'supervisor'::app_role));

CREATE POLICY "Partners manage own client reviews"
  ON public.wl_client_reviews FOR ALL
  USING (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()))
  WITH CHECK (partner_id IN (SELECT id FROM public.white_label_partners WHERE user_id = auth.uid()));

CREATE POLICY "WL clients view own reviews"
  ON public.wl_client_reviews FOR SELECT
  TO authenticated
  USING (wl_client_id = get_wl_client_id(auth.uid()));

CREATE POLICY "WL clients create own reviews"
  ON public.wl_client_reviews FOR INSERT
  TO authenticated
  WITH CHECK (wl_client_id = get_wl_client_id(auth.uid()));