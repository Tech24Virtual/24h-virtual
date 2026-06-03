-- Grant sequence permissions to authenticated role
-- Required for INSERT operations on tables with auto-increment columns
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;