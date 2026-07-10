ALTER TABLE public.shift_invoices
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Separate rejection_reason from supervisor_notes (supervisor_notes = general notes, rejection_reason = specific rejection reason)
