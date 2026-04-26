-- Daily check-ins: append-only events recording when a user completed a
-- morning or evening check-in. Read by accountabilityScore.ts to compute
-- streaks and active days.

CREATE TABLE IF NOT EXISTS daily_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('morning', 'evening')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_checks_user_created
  ON daily_checks (user_id, created_at DESC);

ALTER TABLE daily_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily checks"
  ON daily_checks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily checks"
  ON daily_checks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily checks"
  ON daily_checks FOR DELETE
  USING (auth.uid() = user_id);
