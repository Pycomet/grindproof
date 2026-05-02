-- Enforce one daily_checks row per (user_id, type, day) at the DB level so
-- retried submits / network hiccups can no longer create duplicate rows that
-- would inflate streak / active-day counts.
--
-- Use a UTC day bucket — daily check eligibility is computed at the app
-- layer using the user's timezone, but for de-dup purposes we want a stable
-- key that any two concurrent inserts will collide on. The app-layer guard
-- already blocks same-day duplicate submissions; this constraint catches the
-- network-retry race that the guard cannot.

-- Drop any existing duplicate rows before adding the constraint, keeping the
-- earliest row per (user_id, type, day).
DELETE FROM daily_checks dc
USING daily_checks older
WHERE dc.user_id = older.user_id
  AND dc.type = older.type
  AND date_trunc('day', dc.created_at) = date_trunc('day', older.created_at)
  AND dc.created_at > older.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS daily_checks_user_type_day_uniq
  ON daily_checks (user_id, type, (date_trunc('day', created_at)));
