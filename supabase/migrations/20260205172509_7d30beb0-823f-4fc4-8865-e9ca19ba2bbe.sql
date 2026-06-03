-- Make lead_id optional for multi-use tasks
ALTER TABLE crm_tasks ALTER COLUMN lead_id DROP NOT NULL;