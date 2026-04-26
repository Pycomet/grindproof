-- Patterns table
-- Stores detected user behavior patterns
CREATE TABLE IF NOT EXISTS patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pattern_type TEXT NOT NULL,
  description TEXT,
  confidence FLOAT NOT NULL DEFAULT 0.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  occurrences INTEGER NOT NULL DEFAULT 1 CHECK (occurrences >= 0),
  first_detected TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_occurred TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_patterns_user_id ON patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_patterns_pattern_type ON patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_patterns_last_occurred ON patterns(last_occurred DESC);
CREATE INDEX IF NOT EXISTS idx_patterns_confidence ON patterns(confidence DESC);

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER update_patterns_updated_at 
  BEFORE UPDATE ON patterns
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments to explain the fields
COMMENT ON TABLE patterns IS 'Stores detected user behavior patterns';
COMMENT ON COLUMN patterns.pattern_type IS 'Type of pattern (e.g., thursday_new_project, gym_skip_after_meetings)';
COMMENT ON COLUMN patterns.confidence IS 'Confidence score between 0.0 and 1.0';
COMMENT ON COLUMN patterns.occurrences IS 'Number of times this pattern has been observed';

