-- Add wl_partner_id to profiles for zero-latency WL partner ID lookup
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wl_partner_id uuid REFERENCES public.white_label_partners(id) ON DELETE SET NULL;

-- Backfill existing WL partner users
UPDATE public.profiles
  SET wl_partner_id = wp.id
  FROM public.white_label_partners wp
  WHERE wp.user_id = profiles.id;

-- Trigger to keep it in sync when new partners are created
CREATE OR REPLACE FUNCTION public.sync_wl_partner_id()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles SET wl_partner_id = NEW.id WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_sync_wl_partner_id
  AFTER INSERT OR UPDATE OF user_id ON public.white_label_partners
  FOR EACH ROW EXECUTE FUNCTION public.sync_wl_partner_id();
