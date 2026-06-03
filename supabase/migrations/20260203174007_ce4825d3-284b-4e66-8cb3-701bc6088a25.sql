-- Allow anyone (including anonymous users) to submit leads via public forms
-- This enables: Onboarding Wizard, Demo Form, Chat Widget, Exit Intent
CREATE POLICY "Anyone can submit leads"
ON public.leads
FOR INSERT
WITH CHECK (true);