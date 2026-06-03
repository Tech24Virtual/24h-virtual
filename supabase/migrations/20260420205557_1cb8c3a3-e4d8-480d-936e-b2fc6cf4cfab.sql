-- Drop broad staff policies on ticket_replies
DROP POLICY IF EXISTS "Staff can view ticket replies" ON public.ticket_replies;
DROP POLICY IF EXISTS "Staff can add ticket replies"  ON public.ticket_replies;

-- Queue-scoped SELECT: staff see replies only for tickets in their queue
CREATE POLICY "Staff can view replies in their queue"
ON public.ticket_replies FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = ticket_replies.ticket_id
      AND (
        st.assigned_to = auth.uid()
        OR (public.has_role(auth.uid(), 'agent'::app_role)      AND st.work_queue = 'agent')
        OR (public.has_role(auth.uid(), 'supervisor'::app_role) AND st.work_queue IN ('agent','supervisor'))
        OR (public.has_role(auth.uid(), 'sales'::app_role)      AND st.work_queue = 'sales')
        OR (public.has_role(auth.uid(), 'billing'::app_role)    AND st.work_queue = 'billing')
        OR (public.has_role(auth.uid(), 'tech'::app_role)       AND st.work_queue = 'tech')
        OR (public.has_role(auth.uid(), 'hr'::app_role)         AND st.work_queue = 'hr')
      )
  )
);

-- Queue-scoped INSERT: staff can only reply on tickets in their queue
CREATE POLICY "Staff can add replies in their queue"
ON public.ticket_replies FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = ticket_replies.ticket_id
      AND (
        st.assigned_to = auth.uid()
        OR (public.has_role(auth.uid(), 'agent'::app_role)      AND st.work_queue = 'agent')
        OR (public.has_role(auth.uid(), 'supervisor'::app_role) AND st.work_queue IN ('agent','supervisor'))
        OR (public.has_role(auth.uid(), 'sales'::app_role)      AND st.work_queue = 'sales')
        OR (public.has_role(auth.uid(), 'billing'::app_role)    AND st.work_queue = 'billing')
        OR (public.has_role(auth.uid(), 'tech'::app_role)       AND st.work_queue = 'tech')
        OR (public.has_role(auth.uid(), 'hr'::app_role)         AND st.work_queue = 'hr')
      )
  )
);