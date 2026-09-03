-- agent_configs was seeded with CallReportAgent and PayrollAgent in migration
-- 20260305204107, but the table is empty on staging (0 rows) — all 6 agents
-- pre-launch-checks / Mission Control expect are missing, not just the 4
-- added since. All 6 have working Run<X>Agent buttons in the app but no
-- config row, so Launch Checklist reports every one as "FAIL — Missing
-- agent_configs row". Re-seed all 6 idempotently.

INSERT INTO public.agent_configs (agent_name, enabled, mode)
VALUES
  ('CallReportAgent', true, 'simulation'),
  ('PayrollAgent', true, 'simulation'),
  ('HiringAgent', true, 'simulation'),
  ('LeadsAgent', true, 'simulation'),
  ('FabricIdentitySyncAgent', true, 'simulation'),
  ('LifecycleAgent', true, 'simulation')
ON CONFLICT (agent_name) DO NOTHING;
