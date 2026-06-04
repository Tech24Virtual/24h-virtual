-- Grant table-level access on Campaign OS knowledge tables to authenticated.
--
-- campaign_faq_entries and campaign_policy_blocks were created without explicit
-- GRANTs. Plain INSERT worked (INSERT privilege alone is enough), but
-- INSERT ... RETURNING * (added by the versioning snapshot logic) also requires
-- SELECT privilege on the returned columns. Without SELECT, PostgREST rejects
-- the RETURNING clause before RLS even fires — causing a silent 403 that keeps
-- the Create/Edit dialog open and swallows the success toast.
--
-- campaign_knowledge_versions was handled in 20260604000004; including here for
-- completeness is safe (re-granting existing privileges is a no-op in Postgres).

GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_faq_entries    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_policy_blocks  TO authenticated;
GRANT SELECT, INSERT               ON public.campaign_knowledge_versions TO authenticated;
