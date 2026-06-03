CREATE OR REPLACE FUNCTION public.validate_wl_review_rating()
RETURNS TRIGGER LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.rating < 1 OR NEW.rating > 5 THEN
    RAISE EXCEPTION 'rating must be between 1 and 5';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END; $$;