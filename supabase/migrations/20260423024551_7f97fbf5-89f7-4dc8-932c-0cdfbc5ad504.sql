
DROP VIEW IF EXISTS public.campaign_training_coverage;

CREATE VIEW public.campaign_training_coverage
WITH (security_invoker = true) AS
SELECT
  c.id AS campaign_id,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'published') AS published_modules,
  COUNT(DISTINCT m.id) FILTER (WHERE m.status = 'published' AND m.required) AS required_modules,
  COUNT(DISTINCT comp.id) AS total_completions,
  COUNT(DISTINCT so.id) AS total_signoffs,
  COUNT(DISTINCT comp.agent_id) AS agents_started
FROM public.campaigns c
LEFT JOIN public.campaign_training_modules m ON m.campaign_id = c.id
LEFT JOIN public.campaign_training_completions comp ON comp.module_id = m.id
LEFT JOIN public.campaign_training_signoffs so ON so.completion_id = comp.id
GROUP BY c.id;

GRANT SELECT ON public.campaign_training_coverage TO authenticated;
