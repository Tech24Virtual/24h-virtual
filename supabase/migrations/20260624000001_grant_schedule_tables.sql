-- Fix missing grants that caused shift_invoices and agent_schedules to 403
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_invoices TO authenticated;
GRANT INSERT, UPDATE ON public.agent_schedules TO authenticated;

-- Allow users to mark their own notifications as read and delete them
-- SELECT was already granted; UPDATE/DELETE were missing, causing silent 403s in NotificationBell
GRANT UPDATE, DELETE ON public.notifications TO authenticated;
