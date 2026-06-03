DROP POLICY IF EXISTS "Admins and supervisors insert retraining events" ON public.campaign_training_retraining_events;
CREATE POLICY "Admins and supervisors insert retraining events"
  ON public.campaign_training_retraining_events FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'supervisor'));