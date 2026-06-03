-- Grant necessary table permissions to authenticated role
-- RLS policies control what rows are visible
-- These grants allow the role to attempt queries (RLS then filters)

GRANT SELECT, INSERT, UPDATE ON public.wl_client_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.wl_client_ticket_replies TO authenticated;
GRANT SELECT, INSERT ON public.wl_partner_feedback_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT SELECT, INSERT ON public.ticket_replies TO authenticated;
GRANT SELECT, INSERT ON public.wl_ticket_forwards TO authenticated;
GRANT SELECT ON public.wl_partner_feedback TO authenticated;
GRANT SELECT, INSERT ON public.feedback TO authenticated;
GRANT SELECT, INSERT ON public.feedback_messages TO authenticated;
GRANT SELECT ON public.notifications TO authenticated;
GRANT SELECT ON public.user_roles TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT SELECT ON public.white_label_partners TO authenticated;
GRANT SELECT ON public.white_label_clients TO authenticated;
GRANT SELECT ON public.wl_partner_members TO authenticated;