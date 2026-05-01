-- Enable Row Level Security on the core tables that have been protected only
-- by application-layer filters since the project began. The tRPC layer already
-- scopes every query by user_id; this migration adds defense-in-depth so a
-- forgotten filter or a successful prompt-injection on AI tools cannot leak
-- data between users at the database boundary.
--
-- profiles uses `id` as the FK to auth.users (no separate user_id column);
-- every other table here uses `user_id`. Policies reflect that.

-- ---------------------------------------------------------------------------
-- tasks
-- ---------------------------------------------------------------------------
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tasks_select_own"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "tasks_insert_own"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_update_own"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tasks_delete_own"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goals_select_own"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "goals_insert_own"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals_update_own"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "goals_delete_own"
  ON goals FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- profiles (uses `id` as FK to auth.users, no separate user_id column)
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "profiles_insert_own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_own"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- conversations
-- ---------------------------------------------------------------------------
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "conversations_select_own"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "conversations_insert_own"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations_update_own"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations_delete_own"
  ON conversations FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- coach_memory
-- ---------------------------------------------------------------------------
ALTER TABLE coach_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_memory_select_own"
  ON coach_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "coach_memory_insert_own"
  ON coach_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "coach_memory_update_own"
  ON coach_memory FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "coach_memory_delete_own"
  ON coach_memory FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- weekly_roasts (read-only for users; writes happen via service role in cron)
-- ---------------------------------------------------------------------------
ALTER TABLE weekly_roasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_roasts_select_own"
  ON weekly_roasts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "weekly_roasts_delete_own"
  ON weekly_roasts FOR DELETE
  USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- notification_log (read-only for users; writes happen via service role)
-- ---------------------------------------------------------------------------
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_log_select_own"
  ON notification_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "notification_log_delete_own"
  ON notification_log FOR DELETE
  USING (auth.uid() = user_id);
