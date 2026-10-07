-- Tech could not create chat deployments: "permission denied for table chat_deployments".
-- The RLS policies already exist ("Tech manages all deployments", "Tech manages all brand configs",
-- "Tech manages all ai configs": FOR ALL, has_role(auth.uid(), 'tech')), but `authenticated` only had
-- SELECT on these tables, so the write was rejected at the privilege layer before RLS was evaluated.
-- Creating a deployment inserts into all three tables (TechChatDeployments.tsx), so grant all three.
-- RLS still restricts who can actually write.
GRANT INSERT, UPDATE, DELETE ON public.chat_deployments TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chat_brand_configs TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.chat_ai_configs TO authenticated;
