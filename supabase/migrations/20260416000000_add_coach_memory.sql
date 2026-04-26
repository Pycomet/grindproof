-- Coach memory: unified storage for coach notes, patterns, and roast insights
CREATE TABLE coach_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('commitment', 'recommendation', 'pattern', 'observation', 'excuse_flagged')),
  content TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('coach_inline', 'pattern_engine', 'weekly_roast')),
  severity TEXT CHECK (severity IN ('info', 'warning', 'critical')),
  related_to JSONB,
  pattern_key TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'fulfilled', 'broken', 'expired', 'superseded')),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_coach_memory_user_active
  ON coach_memory (user_id, status, created_at DESC);

CREATE INDEX idx_coach_memory_pattern_dedup
  ON coach_memory (user_id, source, pattern_key)
  WHERE pattern_key IS NOT NULL;

-- Add carry-over tracking to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS carry_over_count INTEGER NOT NULL DEFAULT 0;

-- Add updated_at trigger for coach_memory
CREATE TRIGGER update_coach_memory_updated_at
  BEFORE UPDATE ON coach_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
