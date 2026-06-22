-- Fix 403s on agent profile page — these tables had no grants for the authenticated role.
GRANT SELECT ON public.agent_performance_reviews TO authenticated;
GRANT SELECT ON public.agent_banking TO authenticated;
