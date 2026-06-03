-- Migration: implement_update_ticket_status_dispatcher
-- Date: 2026-05-20
-- Purpose: Document that update-ticket-status edge function is now
--          fully implemented (replaces T-0 skeleton that returned 501)
--
-- Actions implemented:
--   open, in_progress, resolve, close, assign, unassign, claim,
--   forward_to_24h, unlink_forward, post_message
--
-- Security rules enforced server-side:
--   open        → any staff role
--   in_progress → assigned staff or admin
--   resolve     → assigned staff or admin
--   close       → admin only
--   assign      → admin or supervisor
--   unassign    → admin or supervisor
--   claim       → staff in matching work_queue
--   forward_to_24h → white_label role only
--   unlink_forward → admin only
--   post_message   → assigned staff, ticket owner, or admin
--
-- All actions write to audit_log with:
--   actor_id, action, target_table, target_id, metadata

-- Add index on audit_log for faster actor lookups
CREATE INDEX IF NOT EXISTS idx_audit_log_actor_id 
  ON public.audit_log(actor_id);

CREATE INDEX IF NOT EXISTS idx_audit_log_target_table_id 
  ON public.audit_log(target_table, target_id);

-- Add index on wl_ticket_forwards for faster lookups
CREATE INDEX IF NOT EXISTS idx_wl_ticket_forwards_wl_ticket 
  ON public.wl_ticket_forwards(wl_client_ticket_id);

CREATE INDEX IF NOT EXISTS idx_wl_ticket_forwards_support_ticket 
  ON public.wl_ticket_forwards(support_ticket_id);

-- Add index on support_tickets for tenant_kind filtering
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_kind 
  ON public.support_tickets(tenant_kind);

-- Add index on support_tickets for work_queue filtering
CREATE INDEX IF NOT EXISTS idx_support_tickets_work_queue 
  ON public.support_tickets(work_queue);