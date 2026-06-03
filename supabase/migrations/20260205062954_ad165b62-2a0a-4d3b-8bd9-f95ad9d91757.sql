-- Add input validation trigger for leads table to prevent spam/abuse
-- This validates email format and limits text field lengths

CREATE OR REPLACE FUNCTION public.validate_lead_submission()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate email format (required field)
  IF NEW.email IS NULL OR NEW.email !~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$' THEN
    RAISE EXCEPTION 'Invalid email format';
  END IF;
  
  -- Limit email length
  IF length(NEW.email) > 254 THEN
    RAISE EXCEPTION 'Email too long (max 254 characters)';
  END IF;
  
  -- Validate name (required field)
  IF NEW.name IS NULL OR length(trim(NEW.name)) = 0 THEN
    RAISE EXCEPTION 'Name is required';
  END IF;
  
  -- Limit name length
  IF length(NEW.name) > 200 THEN
    RAISE EXCEPTION 'Name too long (max 200 characters)';
  END IF;
  
  -- Limit phone length if provided
  IF NEW.phone IS NOT NULL AND length(NEW.phone) > 30 THEN
    RAISE EXCEPTION 'Phone number too long (max 30 characters)';
  END IF;
  
  -- Limit company name length if provided
  IF NEW.company IS NOT NULL AND length(NEW.company) > 200 THEN
    RAISE EXCEPTION 'Company name too long (max 200 characters)';
  END IF;
  
  -- Limit notes length if provided
  IF NEW.notes IS NOT NULL AND length(NEW.notes) > 5000 THEN
    RAISE EXCEPTION 'Notes too long (max 5000 characters)';
  END IF;
  
  -- Limit source length if provided
  IF NEW.source IS NOT NULL AND length(NEW.source) > 100 THEN
    RAISE EXCEPTION 'Source too long (max 100 characters)';
  END IF;
  
  -- Validate phone format if provided (basic validation)
  IF NEW.phone IS NOT NULL AND NEW.phone !~ '^[0-9+\-\s\(\)\.]+$' THEN
    RAISE EXCEPTION 'Invalid phone number format';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS validate_lead_before_insert ON public.leads;

-- Create trigger for INSERT operations only
CREATE TRIGGER validate_lead_before_insert
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.validate_lead_submission();