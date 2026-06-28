-- Retention events: explicit missed/re-entry reasons + re-engagement metadata.

ALTER TABLE score_events
  DROP CONSTRAINT IF EXISTS score_events_reason_check;

ALTER TABLE score_events
  ADD CONSTRAINT score_events_reason_check
  CHECK (
    reason IN (
      'task_completed',
      'task_skipped',
      'task_rescheduled',
      'task_carried_over',
      'evening_reflection',
      'snapshot_cron',
      'missed_day',
      'reengaged'
    )
  );

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS last_reengaged_date DATE;

ALTER TABLE notification_log
  ADD COLUMN IF NOT EXISTS variant TEXT;

CREATE INDEX IF NOT EXISTS idx_score_events_user_reason_time
  ON score_events (user_id, reason, occurred_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_log_user_type_date_variant
  ON notification_log (user_id, type, sent_date, COALESCE(variant, ''));
