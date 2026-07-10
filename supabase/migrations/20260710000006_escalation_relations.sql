-- Foreign keys so the escalation detail view can embed related agent/client
-- names via PostgREST (profiles!related_agent_id / leads!related_client_id).
ALTER TABLE public.supervisor_escalations
  ADD CONSTRAINT supervisor_escalations_related_agent_id_fkey
    FOREIGN KEY (related_agent_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.supervisor_escalations
  ADD CONSTRAINT supervisor_escalations_related_client_id_fkey
    FOREIGN KEY (related_client_id) REFERENCES public.leads(id) ON DELETE SET NULL;
