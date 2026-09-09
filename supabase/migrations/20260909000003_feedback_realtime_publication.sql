-- Client Dashboard QA: the "My Feedback" list
-- (src/pages/client-dashboard/Feedback.tsx) sets up a Supabase Realtime
-- subscription to auto-refresh on any change to public.feedback, but new
-- feedback never appeared until a manual page reload. The subscription
-- code itself is correct (right table, right user_id filter), but the
-- feedback table was never added to the supabase_realtime publication, so
-- Postgres never broadcasts WAL changes for it and the subscription can
-- never receive an event no matter how it's wired up client-side.
ALTER PUBLICATION supabase_realtime ADD TABLE public.feedback;
