-- Phase 4: Add new roles to app_role enum
-- This must be run separately before using the new values

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'billing';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'supervisor';