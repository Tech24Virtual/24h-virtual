-- Break type system: rename old integer column, add text discriminator, create settings table

-- 1. Rename existing break_type (integer = allowed duration in minutes) to break_duration_minutes
ALTER TABLE public.agent_shift_breaks RENAME COLUMN break_type TO break_duration_minutes;
ALTER TABLE public.agent_shift_breaks ALTER COLUMN break_duration_minutes SET DEFAULT 0;

-- 2. Add break_type text discriminator with enum check
ALTER TABLE public.agent_shift_breaks
  ADD COLUMN IF NOT EXISTS break_type text DEFAULT 'general'
    CHECK (break_type IN ('lunch', 'bathroom', 'general'));

-- 3. Shift break settings table (admin-configurable)
CREATE TABLE IF NOT EXISTS public.shift_break_settings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key   text UNIQUE NOT NULL,
  setting_value text NOT NULL,
  updated_by    uuid REFERENCES auth.users(id),
  updated_at    timestamptz DEFAULT now()
);

-- 4. Grants
GRANT SELECT ON public.shift_break_settings TO authenticated;
GRANT INSERT, UPDATE ON public.shift_break_settings TO authenticated;

-- 5. RLS
ALTER TABLE public.shift_break_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can read break settings"
  ON public.shift_break_settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage break settings"
  ON public.shift_break_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- 6. Default settings
INSERT INTO public.shift_break_settings (setting_key, setting_value) VALUES
  ('lunch_break_minutes',              '30'),
  ('bathroom_break_allowance_minutes', '5')
ON CONFLICT (setting_key) DO NOTHING;
