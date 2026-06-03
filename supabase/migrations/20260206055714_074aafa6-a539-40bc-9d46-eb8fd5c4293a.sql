-- Add visibility to tasks for self vs universal
ALTER TABLE crm_tasks 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'universal';

-- Add constraint for visibility values
ALTER TABLE crm_tasks 
ADD CONSTRAINT crm_tasks_visibility_check 
CHECK (visibility IN ('self', 'universal'));

-- Add tech role to app_role enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'tech';