-- Adds Row Level Security + owner-scoped policies to the seven user-data
-- tables that were created without RLS:
--
--   goals, tasks, profiles, conversations, coach_memory,
--   weekly_roasts, notification_log
--
-- Every one of these tables has a `user_id UUID REFERENCES auth.users(id)`
-- column (profiles uses `id` itself, which is the auth user id), so the
-- policy template is uniform: a row is visible / writable only when
-- auth.uid() matches the row's user reference.
--
-- The cron routes (weekly-roast, check-notifications) and the trpc admin
-- client connect with SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS, so
-- those workloads are unaffected. RLS only constrains the anon-key,
-- cookie-scoped client used by trpc protectedProcedure handlers and any
-- direct browser-side queries.

-- ============================================================
-- goals
-- ============================================================
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own goals"
  ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
  ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
  ON goals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
  ON goals FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- tasks
-- ============================================================
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- profiles  (note: PK `id` IS the auth user id, no separate user_id column)
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- ============================================================
-- conversations
-- ============================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversations"
  ON conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversations"
  ON conversations FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- coach_memory
-- ============================================================
ALTER TABLE coach_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coach memory"
  ON coach_memory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own coach memory"
  ON coach_memory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coach memory"
  ON coach_memory FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own coach memory"
  ON coach_memory FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- weekly_roasts  (read-only for users; writes happen via service role
-- in the weekly-roast cron, which bypasses RLS)
-- ============================================================
ALTER TABLE weekly_roasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own weekly roasts"
  ON weekly_roasts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly roasts"
  ON weekly_roasts FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- notification_log  (write-only audit trail; only the cron writes here.
-- We still allow users to read their own rows for transparency / debugging,
-- but no INSERT/UPDATE/DELETE policy — the service role handles writes.)
-- ============================================================
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notification log"
  ON notification_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notification log"
  ON notification_log FOR DELETE
  USING (auth.uid() = user_id);
