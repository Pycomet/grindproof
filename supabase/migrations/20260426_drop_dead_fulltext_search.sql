-- Remove the unused full-text search apparatus from 20250121_add_fulltext_search.sql.
-- The search_tasks() and search_goals() RPCs reference columns dropped in
-- 20260403_mvp_v2_simplify (completion_proof, target_date, etc.) and would
-- error if called. Nothing in the app calls them, so we drop the whole stack
-- (functions + triggers + columns + GIN indexes) to remove dead weight.

DROP FUNCTION IF EXISTS search_tasks(TEXT, UUID, INT);
DROP FUNCTION IF EXISTS search_goals(TEXT, UUID, INT);

DROP TRIGGER IF EXISTS tasks_search_vector_trigger ON tasks;
DROP TRIGGER IF EXISTS goals_search_vector_trigger ON goals;

DROP FUNCTION IF EXISTS tasks_search_vector_update();
DROP FUNCTION IF EXISTS goals_search_vector_update();

DROP INDEX IF EXISTS idx_tasks_search_vector;
DROP INDEX IF EXISTS idx_goals_search_vector;

ALTER TABLE tasks DROP COLUMN IF EXISTS search_vector;
ALTER TABLE goals DROP COLUMN IF EXISTS search_vector;
