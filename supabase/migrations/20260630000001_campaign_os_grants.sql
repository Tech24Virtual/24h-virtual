-- Reporting tab: v_campaign_rollup_30d view was never granted
GRANT SELECT ON public.v_campaign_rollup_30d TO authenticated;

-- Five9 Mappings tab: INSERT/UPDATE/DELETE were missing
GRANT SELECT, INSERT, UPDATE, DELETE ON public.five9_variable_mappings TO authenticated;

-- Fields tab: both tables had no grants at all
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_fields TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_field_groups TO authenticated;

-- Training modules: write access was missing
GRANT SELECT, INSERT, UPDATE ON public.campaign_training_modules TO authenticated;

-- Defaults tab: table has RLS but no table-level grant
GRANT SELECT, INSERT, UPDATE ON public.campaign_department_type_defaults TO authenticated;
