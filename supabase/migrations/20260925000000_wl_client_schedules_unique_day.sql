-- Fixes a "repeated days" bug in the WL client portal Schedule page: with no
-- unique constraint, a stale/duplicate save could insert two rows for the
-- same (wl_client_id, day_of_week), which then both rendered in the UI.
-- Keep the most recently created row per (wl_client_id, day_of_week) before
-- adding the constraint, since existing duplicates would violate it.
DELETE FROM public.wl_client_schedules a
USING public.wl_client_schedules b
WHERE a.wl_client_id = b.wl_client_id
  AND a.day_of_week = b.day_of_week
  AND a.created_at < b.created_at;

ALTER TABLE public.wl_client_schedules
  ADD CONSTRAINT wl_client_schedules_client_day_unique UNIQUE (wl_client_id, day_of_week);
