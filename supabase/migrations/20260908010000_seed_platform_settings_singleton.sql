-- Fix: Mission Control's Emergency Simulation Mode kill switch was permanently
-- disabled because no row existed in public.platform_settings (a singleton
-- settings table: id, force_simulation_mode, updated_at, updated_by — not a
-- key/value table). Seed the missing row so the toggle becomes usable.

INSERT INTO public.platform_settings (force_simulation_mode)
SELECT false
WHERE NOT EXISTS (SELECT 1 FROM public.platform_settings);
