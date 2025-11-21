-- Add full-text search columns (regular columns, not generated)
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS search_vector tsvector;
ALTER TABLE goals ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Function to update task search vector
CREATE OR REPLACE FUNCTION tasks_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english'::regconfig, coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english'::regconfig, coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to update goal search vector
CREATE OR REPLACE FUNCTION goals_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english'::regconfig, coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english'::regconfig, coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create triggers to auto-update search vectors
CREATE TRIGGER tasks_search_vector_trigger
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION tasks_search_vector_update();

CREATE TRIGGER goals_search_vector_trigger
  BEFORE INSERT OR UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION goals_search_vector_update();

-- Update existing rows to populate search vectors
UPDATE tasks SET search_vector = 
  setweight(to_tsvector('english'::regconfig, coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english'::regconfig, coalesce(description, '')), 'B') ||
  setweight(to_tsvector('english'::regconfig, coalesce(array_to_string(tags, ' '), '')), 'C');

UPDATE goals SET search_vector = 
  setweight(to_tsvector('english'::regconfig, coalesce(title, '')), 'A') ||
  setweight(to_tsvector('english'::regconfig, coalesce(description, '')), 'B');

-- Create GIN indexes for fast search
CREATE INDEX IF NOT EXISTS idx_tasks_search_vector ON tasks USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_goals_search_vector ON goals USING GIN(search_vector);

-- Function to search tasks
CREATE OR REPLACE FUNCTION search_tasks(
  query_text TEXT,
  query_user_id UUID,
  match_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  goal_id UUID,
  title TEXT,
  description TEXT,
  due_date TIMESTAMPTZ,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  reminders JSONB,
  status TEXT,
  completion_proof TEXT,
  tags TEXT[],
  google_calendar_event_id TEXT,
  is_synced_with_calendar BOOLEAN,
  recurrence_pattern JSONB,
  parent_task_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.user_id,
    t.goal_id,
    t.title,
    t.description,
    t.due_date,
    t.start_time,
    t.end_time,
    t.reminders,
    t.status,
    t.completion_proof,
    t.tags,
    t.google_calendar_event_id,
    t.is_synced_with_calendar,
    t.recurrence_pattern,
    t.parent_task_id,
    t.created_at,
    t.updated_at,
    ts_rank(t.search_vector, websearch_to_tsquery('english', query_text)) AS rank
  FROM tasks t
  WHERE t.user_id = query_user_id
    AND t.search_vector @@ websearch_to_tsquery('english', query_text)
  ORDER BY rank DESC, t.created_at DESC
  LIMIT match_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to search goals
CREATE OR REPLACE FUNCTION search_goals(
  query_text TEXT,
  query_user_id UUID,
  match_limit INT DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  title TEXT,
  description TEXT,
  target_date TIMESTAMPTZ,
  status TEXT,
  github_repos JSONB,
  priority TEXT,
  time_horizon TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    g.id,
    g.user_id,
    g.title,
    g.description,
    g.target_date,
    g.status,
    g.github_repos,
    g.priority,
    g.time_horizon,
    g.created_at,
    g.updated_at,
    ts_rank(g.search_vector, websearch_to_tsquery('english', query_text)) AS rank
  FROM goals g
  WHERE g.user_id = query_user_id
    AND g.search_vector @@ websearch_to_tsquery('english', query_text)
  ORDER BY rank DESC, g.created_at DESC
  LIMIT match_limit;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON COLUMN tasks.search_vector IS 'Full-text search vector for tasks (auto-generated)';
COMMENT ON COLUMN goals.search_vector IS 'Full-text search vector for goals (auto-generated)';
COMMENT ON FUNCTION search_tasks IS 'Search tasks using full-text search with relevance ranking';
COMMENT ON FUNCTION search_goals IS 'Search goals using full-text search with relevance ranking';

