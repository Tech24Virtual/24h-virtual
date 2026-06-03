
-- Create trigger to auto-seed Resend KB articles when a new partner is created
CREATE OR REPLACE FUNCTION public.trigger_seed_resend_kb()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_resend_kb_articles(NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER seed_resend_kb_on_partner_insert
  AFTER INSERT ON public.white_label_partners
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_seed_resend_kb();
