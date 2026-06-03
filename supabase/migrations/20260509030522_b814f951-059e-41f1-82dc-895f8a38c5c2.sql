-- Phase 27 — Checkout / Offer Delivery Architecture

-- =========================================================
-- offers: thin lens over canonical plans/prices
-- =========================================================
CREATE TABLE IF NOT EXISTS public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  surface text NOT NULL CHECK (surface IN ('signup', 'upgrade', 'wl_partner', 'in_app')),
  audience text NOT NULL DEFAULT 'all' CHECK (audience IN ('direct', 'wl_end_client', 'all')),
  plan_key text NOT NULL,
  stripe_price_id text,
  experiment_id uuid REFERENCES public.pricing_experiments(id) ON DELETE SET NULL,
  variant_key text,
  is_baseline boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  partner_id uuid REFERENCES public.white_label_partners(id) ON DELETE CASCADE,
  eligibility jsonb NOT NULL DEFAULT '{}'::jsonb,
  price_min_usd numeric,
  price_max_usd numeric,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offers_surface_active ON public.offers(surface, active);
CREATE INDEX IF NOT EXISTS idx_offers_experiment ON public.offers(experiment_id, variant_key);
CREATE INDEX IF NOT EXISTS idx_offers_partner ON public.offers(partner_id);

DROP TRIGGER IF EXISTS trg_offers_updated_at ON public.offers;
CREATE TRIGGER trg_offers_updated_at
  BEFORE UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offers admin all"
  ON public.offers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "offers wl partner read own"
  ON public.offers FOR SELECT
  USING (
    surface = 'wl_partner'
    AND active = true
    AND partner_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.white_label_partners wlp
      WHERE wlp.id = offers.partner_id AND wlp.user_id = auth.uid()
    )
  );

-- =========================================================
-- offer_exposures: append-only event log
-- =========================================================
CREATE TABLE IF NOT EXISTS public.offer_exposures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  offer_key text,
  experiment_id uuid,
  variant_key text,
  surface text NOT NULL,
  audience text,
  event text NOT NULL CHECK (event IN ('shown', 'accepted', 'completed', 'rejected')),
  plan_key text,
  stripe_price_id text,
  user_id uuid,
  lead_id uuid,
  visitor_key text,
  partner_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_offer_exposures_offer ON public.offer_exposures(offer_id, event);
CREATE INDEX IF NOT EXISTS idx_offer_exposures_experiment ON public.offer_exposures(experiment_id, variant_key);
CREATE INDEX IF NOT EXISTS idx_offer_exposures_created ON public.offer_exposures(created_at);

ALTER TABLE public.offer_exposures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "offer_exposures admin read"
  ON public.offer_exposures FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "offer_exposures auth insert"
  ON public.offer_exposures FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
  );

CREATE POLICY "offer_exposures anon insert visitor"
  ON public.offer_exposures FOR INSERT
  TO anon
  WITH CHECK (
    user_id IS NULL AND visitor_key IS NOT NULL
  );

-- =========================================================
-- v_offer_exposure_summary
-- =========================================================
CREATE OR REPLACE VIEW public.v_offer_exposure_summary
WITH (security_invoker = true)
AS
SELECT
  o.id AS offer_id,
  o.key AS offer_key,
  o.label,
  o.surface,
  o.audience,
  o.plan_key,
  o.stripe_price_id,
  o.experiment_id,
  o.variant_key,
  o.is_baseline,
  o.active,
  o.partner_id,
  COALESCE(SUM(CASE WHEN e.event = 'shown' THEN 1 ELSE 0 END), 0)::bigint AS shown_count,
  COALESCE(SUM(CASE WHEN e.event = 'accepted' THEN 1 ELSE 0 END), 0)::bigint AS accepted_count,
  COALESCE(SUM(CASE WHEN e.event = 'completed' THEN 1 ELSE 0 END), 0)::bigint AS completed_count,
  COALESCE(SUM(CASE WHEN e.event = 'rejected' THEN 1 ELSE 0 END), 0)::bigint AS rejected_count,
  MAX(e.created_at) AS last_exposure_at
FROM public.offers o
LEFT JOIN public.offer_exposures e ON e.offer_id = o.id
GROUP BY o.id;

-- =========================================================
-- v_bi_offer_exposures (BI mirror)
-- =========================================================
CREATE OR REPLACE VIEW public.v_bi_offer_exposures
WITH (security_invoker = true)
AS
SELECT
  e.id,
  e.offer_id,
  e.offer_key,
  e.experiment_id,
  e.variant_key,
  e.surface,
  e.audience,
  e.event,
  e.plan_key,
  e.stripe_price_id,
  e.partner_id,
  e.created_at
FROM public.offer_exposures e;