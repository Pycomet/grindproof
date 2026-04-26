-- Add columns for daily check-in data to accountability_scores
-- These columns store daily task metrics

ALTER TABLE accountability_scores 
ADD COLUMN IF NOT EXISTS completed_tasks INTEGER DEFAULT 0 CHECK (completed_tasks >= 0),
ADD COLUMN IF NOT EXISTS total_tasks INTEGER DEFAULT 0 CHECK (total_tasks >= 0),
ADD COLUMN IF NOT EXISTS roast_metadata JSONB DEFAULT '{}'::jsonb;

-- Add comments to explain the new fields
COMMENT ON COLUMN accountability_scores.completed_tasks IS 'Number of tasks completed (for daily check-ins)';
COMMENT ON COLUMN accountability_scores.total_tasks IS 'Total number of tasks planned (for daily check-ins)';
COMMENT ON COLUMN accountability_scores.roast_metadata IS 'Metadata for daily check-ins: reflections, checkInType, completedAt';
