-- Add attachments column to tasks table
-- Stores an array of image URLs for task attachments

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS attachments TEXT[];

-- Create GIN index for array search
CREATE INDEX IF NOT EXISTS idx_tasks_attachments ON tasks USING GIN(attachments);

-- Add comment for documentation
COMMENT ON COLUMN tasks.attachments IS 'Array of image URLs for task attachments from Supabase Storage';

