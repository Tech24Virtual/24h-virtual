-- Migration: add_ticket_dispatcher_columns
-- Date: 2026-05-20
-- Purpose: Ensure all columns needed by update-ticket-status dispatcher exist

-- Add is_escalated_to_24h to wl_client_tickets if missing
ALTER TABLE public.wl_client_tickets 
ADD COLUMN IF NOT EXISTS is_escalated_to_24h boolean NOT NULL DEFAULT false;

-- Add mask_24h_from_client to wl_client_tickets if missing
ALTER TABLE public.wl_client_tickets 
ADD COLUMN IF NOT EXISTS mask_24h_from_client boolean NOT NULL DEFAULT true;

-- Add linked_support_ticket_id to wl_client_tickets if missing
ALTER TABLE public.wl_client_tickets 
ADD COLUMN IF NOT EXISTS linked_support_ticket_id uuid 
  REFERENCES public.support_tickets(id) ON DELETE SET NULL;

-- Add resolved_at to wl_client_tickets if missing
ALTER TABLE public.wl_client_tickets 
ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone;

-- Add resolved_at to support_tickets if missing
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS resolved_at timestamp with time zone;

-- Add metadata column to audit_log if missing
ALTER TABLE public.audit_log 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Add actor_email to audit_log metadata (handled in jsonb, no column needed)
-- Ensure target_id column exists as text
ALTER TABLE public.audit_log 
ADD COLUMN IF NOT EXISTS target_id text;

-- Add author_role to ticket_replies if missing
ALTER TABLE public.ticket_replies 
ADD COLUMN IF NOT EXISTS author_role text;

-- Add visible_to_partner to ticket_replies if missing  
ALTER TABLE public.ticket_replies 
ADD COLUMN IF NOT EXISTS visible_to_partner boolean DEFAULT true;

-- Add author_role to wl_client_ticket_replies if missing
ALTER TABLE public.wl_client_ticket_replies 
ADD COLUMN IF NOT EXISTS author_role text;

-- Add author_type to wl_client_ticket_replies if missing
ALTER TABLE public.wl_client_ticket_replies 
ADD COLUMN IF NOT EXISTS author_type text;

-- Add is_internal to ticket_replies if missing
ALTER TABLE public.ticket_replies 
ADD COLUMN IF NOT EXISTS is_internal boolean DEFAULT false;

-- Add is_internal to wl_client_ticket_replies if missing
ALTER TABLE public.wl_client_ticket_replies 
ADD COLUMN IF NOT EXISTS is_internal boolean DEFAULT false;