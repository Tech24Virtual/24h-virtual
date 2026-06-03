ALTER TABLE public.call_logs DROP CONSTRAINT call_logs_client_id_fkey;
ALTER TABLE public.call_logs ADD CONSTRAINT call_logs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.leads(id);