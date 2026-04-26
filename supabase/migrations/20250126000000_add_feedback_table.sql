-- User Feedback Table Migration
-- Stores user feedback for product improvement

CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('chat', 'eveningCheck', 'taskMilestone')),
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('star', 'emoji', 'thumbs')),
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- for star ratings
  emoji TEXT, -- for emoji feedback
  thumb TEXT CHECK (thumb IN ('up', 'down')), -- for thumbs feedback
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_trigger_type ON user_feedback(trigger_type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at DESC);

-- Add RLS policies
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can only insert their own feedback
CREATE POLICY "Users can insert their own feedback"
  ON user_feedback
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only read their own feedback
CREATE POLICY "Users can read their own feedback"
  ON user_feedback
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only admins can read all feedback (optional - for analytics)
-- CREATE POLICY "Admins can read all feedback"
--   ON user_feedback
--   FOR SELECT
--   USING (auth.jwt() ->> 'role' = 'admin');

