-- Grant missing DML privileges on sales-related tables.
-- These tables were created with only structural grants (REFERENCES, TRIGGER, TRUNCATE)
-- which prevented all reads and writes from the authenticated role.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meetings           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_proposals    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_commissions  TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_targets      TO authenticated;
