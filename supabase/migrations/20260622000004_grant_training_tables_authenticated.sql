-- Missing GRANTs on all campaign training tables.
-- RLS policies were present but PostgreSQL checks table-level GRANTs first.
-- Without these, any query by the 'authenticated' role is refused before RLS
-- even runs, causing PostgREST joins to fail silently (empty result instead
-- of a useful error).

GRANT SELECT ON public.campaign_training_modules     TO authenticated;
GRANT SELECT ON public.campaign_training_lessons     TO authenticated;
GRANT SELECT ON public.campaign_training_quiz_questions TO authenticated;

GRANT SELECT, INSERT ON public.campaign_training_quiz_attempts TO authenticated;

GRANT SELECT, INSERT, DELETE ON public.campaign_training_completions TO authenticated;

GRANT SELECT ON public.campaign_training_signoffs    TO authenticated;
