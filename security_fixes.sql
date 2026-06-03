-- FIX 1: Enable RLS on wl_wordpress_connections
ALTER TABLE public.wl_wordpress_connections ENABLE ROW LEVEL SECURITY;

-- FIX 2: Remove broad admin access to WL ticket conversations
DROP POLICY IF EXISTS "Admin full access on wl_client_tickets" 
  ON public.wl_client_tickets;

DROP POLICY IF EXISTS "Admin full access on wl_client_ticket_replies" 
  ON public.wl_client_ticket_replies;

-- FIX 3: Add narrow admin access (escalated tickets only)
CREATE POLICY admin_read_escalated_wl_tickets_only
ON public.wl_client_tickets 
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND is_escalated_to_24h = true
);

CREATE POLICY admin_read_escalated_wl_replies_only
ON public.wl_client_ticket_replies 
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND EXISTS (
    SELECT 1 FROM public.wl_client_tickets t
    WHERE t.id = wl_client_ticket_replies.ticket_id
    AND t.is_escalated_to_24h = true
  )
);