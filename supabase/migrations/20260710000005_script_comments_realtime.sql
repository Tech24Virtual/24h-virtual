-- Enable realtime for script_change_comments so cross-user messages
-- (client vs supervisor in different browser tabs) appear instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.script_change_comments;

-- script_change_requests was also missing from the publication, so status
-- changes (approve/reject/needs_more_info) don't reflect immediately either
ALTER PUBLICATION supabase_realtime ADD TABLE public.script_change_requests;
