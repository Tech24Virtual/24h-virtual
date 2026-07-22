ALTER TABLE public.hr_communications
  ADD CONSTRAINT hr_communications_to_user_fk
    FOREIGN KEY (to_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD CONSTRAINT hr_communications_from_user_fk
    FOREIGN KEY (from_user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
