-- Monthly pay option for agent banking (hourly stays the default)
ALTER TABLE public.agent_banking
  ADD COLUMN IF NOT EXISTS pay_type text NOT NULL DEFAULT 'hourly' CHECK (pay_type IN ('hourly', 'monthly')),
  ADD COLUMN IF NOT EXISTS monthly_rate numeric(10,2),
  ADD COLUMN IF NOT EXISTS hours_per_month integer,
  ADD COLUMN IF NOT EXISTS overtime_hourly_rate numeric(10,4);
