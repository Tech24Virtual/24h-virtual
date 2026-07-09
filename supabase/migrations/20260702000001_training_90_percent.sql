-- Correction #11: raise the training quiz passing threshold to 90%.

-- Update passing score threshold to 90% for all training lessons
ALTER TABLE public.campaign_training_lessons
  ALTER COLUMN passing_score SET DEFAULT 90;

-- Update existing lessons to 90% minimum
UPDATE public.campaign_training_lessons
  SET passing_score = 90
  WHERE passing_score < 90;
