-- GrindProof MVP v2 Schema Migration
-- Simplifies schema by removing unused columns and tables

-- Drop unused tables
DROP TABLE IF EXISTS routines CASCADE;
DROP TABLE IF EXISTS integrations CASCADE;

-- Simplify goals table
ALTER TABLE goals
  DROP COLUMN IF EXISTS github_repos,
  DROP COLUMN IF EXISTS target_date,
  DROP COLUMN IF EXISTS time_horizon;

-- Update goals status constraint to remove 'paused'
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_status_check;
ALTER TABLE goals ADD CONSTRAINT goals_status_check
  CHECK (status IN ('active', 'completed'));
-- Update any 'paused' goals to 'active'
UPDATE goals SET status = 'active' WHERE status = 'paused';

-- Simplify tasks table
ALTER TABLE tasks
  DROP COLUMN IF EXISTS completion_proof,
  DROP COLUMN IF EXISTS google_calendar_event_id,
  DROP COLUMN IF EXISTS is_synced_with_calendar,
  DROP COLUMN IF EXISTS parent_task_id,
  DROP COLUMN IF EXISTS reminders,
  DROP COLUMN IF EXISTS attachments,
  DROP COLUMN IF EXISTS recurring_event_id;

-- Add reflection column to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reflection TEXT;

-- Simplify profiles table
ALTER TABLE profiles
  DROP COLUMN IF EXISTS profile_pic_url;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update notification_settings: remove hourly, add email/push toggles
ALTER TABLE notification_settings
  DROP COLUMN IF EXISTS hourly_review_enabled,
  DROP COLUMN IF EXISTS hourly_review_start_time,
  DROP COLUMN IF EXISTS hourly_review_end_time;
ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true;

-- Add device tracking to push_subscriptions
ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS device_name TEXT,
  ADD COLUMN IF NOT EXISTS last_successful_push TIMESTAMPTZ;

-- Create weekly_roasts table
CREATE TABLE IF NOT EXISTS weekly_roasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  roast_data JSONB NOT NULL,
  task_stats JSONB,
  delivered_via TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_roasts_user_id ON weekly_roasts(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_roasts_week_start ON weekly_roasts(week_start DESC);

-- Create notification_log table for deduplication
CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'morning' or 'evening'
  sent_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_log_dedup
  ON notification_log(user_id, type, sent_date);

-- Drop unused indexes
DROP INDEX IF EXISTS idx_routines_goal_id;
DROP INDEX IF EXISTS idx_routines_is_active;
DROP INDEX IF EXISTS idx_routines_created_at;
DROP INDEX IF EXISTS idx_integrations_user_id;
DROP INDEX IF EXISTS idx_integrations_service_type;
DROP INDEX IF EXISTS idx_integrations_created_at;
DROP INDEX IF EXISTS idx_tasks_google_calendar_event_id;
DROP INDEX IF EXISTS idx_tasks_parent_task_id;

-- Drop unused triggers
DROP TRIGGER IF EXISTS update_routines_updated_at ON routines;
DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
