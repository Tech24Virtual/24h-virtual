-- Merges the standalone WL client "Feedback" page into Support Tickets: a
-- ticket now carries a type (Feedback / Bug Report / Need Assistance) so the
-- single New Ticket flow can replace the separate feedback submission form.
ALTER TABLE public.wl_client_tickets
  ADD COLUMN ticket_type text NOT NULL DEFAULT 'assistance'
  CHECK (ticket_type IN ('feedback', 'bug_report', 'assistance'));
