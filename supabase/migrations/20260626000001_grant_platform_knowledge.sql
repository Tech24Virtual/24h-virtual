-- platform_knowledge was created without SELECT grant to authenticated.
-- Edge Function uses service role so no prior breakage, but client-side
-- reads (and the support-assistant function context lookup) need this.
GRANT SELECT ON public.platform_knowledge TO authenticated;
