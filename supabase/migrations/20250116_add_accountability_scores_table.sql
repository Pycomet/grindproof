-- Accountability scores table
-- Stores weekly accountability metrics per user
CREATE TABLE IF NOT EXISTS accountability_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  alignment_score FLOAT CHECK (alignment_score >= 0.0 AND alignment_score <= 1.0),
  honesty_score FLOAT CHECK (honesty_score >= 0.0 AND honesty_score <= 1.0),
  completion_rate FLOAT CHECK (completion_rate >= 0.0 AND completion_rate <= 1.0),
  new_projects_started INTEGER NOT NULL DEFAULT 0 CHECK (new_projects_started >= 0),
  evidence_submissions INTEGER NOT NULL DEFAULT 0 CHECK (evidence_submissions >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_accountability_scores_user_id ON accountability_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_accountability_scores_week_start ON accountability_scores(week_start DESC);
CREATE INDEX IF NOT EXISTS idx_accountability_scores_user_week ON accountability_scores(user_id, week_start DESC);

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER update_accountability_scores_updated_at 
  BEFORE UPDATE ON accountability_scores
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments to explain the fields
COMMENT ON TABLE accountability_scores IS 'Stores weekly accountability metrics per user';
COMMENT ON COLUMN accountability_scores.week_start IS 'Start date of the week (typically Monday)';
COMMENT ON COLUMN accountability_scores.alignment_score IS 'Score for planned vs done (0.0 to 1.0)';
COMMENT ON COLUMN accountability_scores.honesty_score IS 'Score for how truthful the user was (0.0 to 1.0)';
COMMENT ON COLUMN accountability_scores.completion_rate IS 'Task completion rate for the week (0.0 to 1.0)';

