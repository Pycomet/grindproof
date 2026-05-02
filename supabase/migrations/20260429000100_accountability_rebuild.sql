-- Accountability rebuild: completed_at, snapshots, score_events, atomic carry-over.
-- Depends on 20260429000000_add_rls_to_user_tables.sql (tasks RLS must exist
-- before the carry_over_tasks RPC is created with SECURITY INVOKER).

-- ---------------------------------------------------------------------------
-- tasks.completed_at — the timestamp at which a task transitioned to
-- 'completed'. The streak engine reads this column instead of due_date so
-- late completions and rescheduled-completed tasks are credited to the day
-- the work actually happened.
-- ---------------------------------------------------------------------------
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Backfill: for existing completed rows, use updated_at as the best available
-- proxy for when the task was completed. This is approximate for historical
-- data; new completions go through the application layer which sets it
-- precisely.
UPDATE tasks
SET completed_at = updated_at
WHERE status = 'completed' AND completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_user_completed_at
  ON tasks (user_id, completed_at DESC)
  WHERE completed_at IS NOT NULL;

-- ---------------------------------------------------------------------------
-- accountability_snapshots — one row per user per local calendar date,
-- written by the snapshot cron and by mutation hooks. Powers the trend chart
-- and the heatmap, replacing per-request recomputation.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accountability_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  local_date DATE NOT NULL,
  score INT NOT NULL,
  streak INT NOT NULL,
  weighted_completion INT NOT NULL,
  consistency_rate INT NOT NULL,
  discipline_score INT NOT NULL,
  velocity_bonus INT NOT NULL,
  streak_bonus INT NOT NULL,
  active BOOLEAN NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT accountability_snapshots_user_date_uniq UNIQUE (user_id, local_date)
);

CREATE INDEX IF NOT EXISTS idx_accountability_snapshots_user_date
  ON accountability_snapshots (user_id, local_date DESC);

ALTER TABLE accountability_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "accountability_snapshots_select_own"
  ON accountability_snapshots FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "accountability_snapshots_delete_own"
  ON accountability_snapshots FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- score_events — append-only audit log. Every score change records the cause
-- so the user can answer "why did my score drop?" via the stats page.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS score_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  score_before INT,
  score_after INT NOT NULL,
  reason TEXT NOT NULL,
  related_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_score_events_user_time
  ON score_events (user_id, occurred_at DESC);

ALTER TABLE score_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "score_events_select_own"
  ON score_events FOR SELECT
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- carry_over_tasks RPC — atomically rolls a set of tasks forward and
-- increments their carry_over_count in a single statement. Replaces the
-- read-then-write loop in dailyCheckRouter that races on concurrent submits.
--
-- SECURITY INVOKER means the function executes as the calling user, so the
-- tasks RLS policy filters out any IDs that don't belong to them. The
-- explicit user_id = auth.uid() in the WHERE clause is belt-and-braces.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION carry_over_tasks(
  p_task_ids UUID[],
  p_new_due TIMESTAMPTZ
) RETURNS INT
LANGUAGE sql
SECURITY INVOKER
AS $$
  WITH updated AS (
    UPDATE tasks
    SET due_date = p_new_due,
        status = 'pending',
        carry_over_count = carry_over_count + 1
    WHERE id = ANY(p_task_ids)
      AND user_id = auth.uid()
    RETURNING id
  )
  SELECT COUNT(*)::INT FROM updated;
$$;

GRANT EXECUTE ON FUNCTION carry_over_tasks(UUID[], TIMESTAMPTZ) TO authenticated;
