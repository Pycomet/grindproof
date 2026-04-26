-- Add hourly task review notification settings
-- This allows users to receive periodic task status updates throughout the day

ALTER TABLE notification_settings
ADD COLUMN IF NOT EXISTS hourly_review_enabled BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS hourly_review_start_time TEXT NOT NULL DEFAULT '09:00',
ADD COLUMN IF NOT EXISTS hourly_review_end_time TEXT NOT NULL DEFAULT '21:00';

-- Create index for hourly review enabled status
CREATE INDEX IF NOT EXISTS idx_notification_settings_hourly_enabled
  ON notification_settings(hourly_review_enabled)
  WHERE hourly_review_enabled = true;

-- Add comment for documentation
COMMENT ON COLUMN notification_settings.hourly_review_enabled IS 'Enable/disable hourly task review notifications';
COMMENT ON COLUMN notification_settings.hourly_review_start_time IS 'Start time for hourly notifications in HH:MM format (24-hour)';
COMMENT ON COLUMN notification_settings.hourly_review_end_time IS 'End time for hourly notifications in HH:MM format (24-hour)';
