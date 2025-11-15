-- Evidence table
-- Stores task completion evidence (photos, screenshots, text, links)
CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('photo', 'screenshot', 'text', 'link')),
  content TEXT NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ai_validated BOOLEAN NOT NULL DEFAULT false,
  validation_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_evidence_task_id ON evidence(task_id);
CREATE INDEX IF NOT EXISTS idx_evidence_submitted_at ON evidence(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_evidence_type ON evidence(type);
CREATE INDEX IF NOT EXISTS idx_evidence_ai_validated ON evidence(ai_validated);

-- Add trigger to automatically update updated_at timestamp
CREATE TRIGGER update_evidence_updated_at 
  BEFORE UPDATE ON evidence
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments to explain the fields
COMMENT ON TABLE evidence IS 'Stores evidence submissions for task completion';
COMMENT ON COLUMN evidence.type IS 'Type of evidence: photo, screenshot, text, or link';
COMMENT ON COLUMN evidence.content IS 'The actual evidence content (URL, text, etc.)';
COMMENT ON COLUMN evidence.ai_validated IS 'Whether AI has validated this evidence';
COMMENT ON COLUMN evidence.validation_notes IS 'Notes from AI validation process';

