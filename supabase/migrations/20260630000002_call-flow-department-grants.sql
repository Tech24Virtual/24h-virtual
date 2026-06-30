-- client_departments: table-level grant was never issued; only RLS policies existed.
-- Without GRANT the role can't even attempt access, so RLS never evaluates.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_departments TO authenticated;

-- department_numbers: same pattern — RLS policies exist but no table grant.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.department_numbers TO authenticated;

-- call_flow_receptionist_configs: created in 20260508041049 with RLS policies only.
-- v_call_flow_receptionist_readiness already has SELECT from that same migration.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.call_flow_receptionist_configs TO authenticated;
