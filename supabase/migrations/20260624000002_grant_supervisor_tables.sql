-- Fix missing SELECT grants for supervisor dashboard tables
GRANT SELECT ON public.supervisor_escalations TO authenticated;
GRANT SELECT ON public.email_followups TO authenticated;
GRANT SELECT, INSERT ON public.ticket_views TO authenticated;
GRANT SELECT ON public.wl_partner_onboarding_handoffs TO authenticated;
GRANT SELECT ON public.missions TO authenticated;

-- Workspace: supervisors need UPDATE/INSERT to resolve/create escalations
GRANT UPDATE, INSERT ON public.supervisor_escalations TO authenticated;

-- Agents page: Slack mapping lookup
GRANT SELECT ON public.slack_user_mappings TO authenticated;

-- Agents page: supervisors need to read all user_roles rows (agent + sales).
-- Without this, the RLS-gated query returns [] silently and the page is blank.
CREATE POLICY "Supervisors can view all roles" ON public.user_roles
  FOR SELECT USING (has_role(auth.uid(), 'supervisor'::app_role));

-- Agent Detail page: supervisors sign off on training completions
GRANT INSERT ON public.campaign_training_signoffs TO authenticated;

-- Agent Onboarding page: audit log + training templates + job applicants
GRANT SELECT, INSERT ON public.agent_onboarding_log TO authenticated;
GRANT SELECT ON public.training_templates TO authenticated;
GRANT SELECT ON public.job_applications TO authenticated;
GRANT SELECT ON public.job_postings TO authenticated;
GRANT SELECT ON public.onboarding_templates TO authenticated;
