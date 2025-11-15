-- Add priority field to tasks table
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS priority TEXT CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium';

-- Add recurrence fields to tasks table for Google Calendar recurring events
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,
  ADD COLUMN IF NOT EXISTS recurring_event_id TEXT;

-- Add index for recurring_event_id to optimize queries
CREATE INDEX IF NOT EXISTS idx_tasks_recurring_event_id ON tasks(recurring_event_id) WHERE recurring_event_id IS NOT NULL;

-- Add comment to explain the fields
COMMENT ON COLUMN tasks.priority IS 'Task priority level: high, medium, or low';
COMMENT ON COLUMN tasks.recurrence_rule IS 'RFC 5545 RRULE from Google Calendar for recurring events';
COMMENT ON COLUMN tasks.recurring_event_id IS 'Google Calendar recurring event ID to group instances together';

