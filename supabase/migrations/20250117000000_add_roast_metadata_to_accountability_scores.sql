-- Add columns to store AI-generated roast metadata
ALTER TABLE accountability_scores
ADD COLUMN IF NOT EXISTS insights JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS recommendations JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS week_summary TEXT;

-- Add comments
COMMENT ON COLUMN accountability_scores.insights IS 'AI-generated insights array with emoji, text, and severity';
COMMENT ON COLUMN accountability_scores.recommendations IS 'AI-generated recommendations array';
COMMENT ON COLUMN accountability_scores.week_summary IS 'AI-generated week summary text';

