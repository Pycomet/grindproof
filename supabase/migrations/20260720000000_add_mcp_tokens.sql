-- MCP personal access tokens.
--
-- Lets a user connect their own AI agent (Claude Code, Cursor, custom agents)
-- to their GrindProof account via a bearer token pasted into the MCP client.
-- The token itself is a high-entropy secret shown to the user exactly once;
-- only its SHA-256 hash is stored, so a leaked DB row cannot be replayed.
--
-- Auth flow: the MCP route resolves `Bearer <token>` -> sha256 -> user_id via
-- the service-role client (this lookup runs BEFORE a user context exists), then
-- mints a short-lived user-scoped JWT so every downstream query is subject to
-- the same RLS policies as the cookie-scoped app. See src/lib/mcp/auth.ts and
-- src/lib/supabase/scoped.ts.

CREATE TABLE mcp_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,                       -- user label, e.g. "Claude Code laptop"
  token_hash   TEXT NOT NULL UNIQUE,                -- SHA-256 hex of the full token
  token_prefix TEXT NOT NULL,                       -- first chars for display, e.g. "gp_mcp_ab12"
  scopes       TEXT[] NOT NULL DEFAULT '{}',        -- forward-compat; v1 grants '*'
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,                         -- NULL = never expires
  revoked_at   TIMESTAMPTZ,                         -- NULL = active
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auth hot path: exact-match lookup by hash (also enforced UNIQUE above).
CREATE INDEX idx_mcp_tokens_hash ON mcp_tokens (token_hash);

-- Settings list: a user's tokens, newest first.
CREATE INDEX idx_mcp_tokens_user_created ON mcp_tokens (user_id, created_at DESC);

-- ============================================================
-- RLS: owner-scoped, mirroring the uniform template used across
-- goals/tasks/etc. Lets the cookie-scoped settings UI (anon key +
-- protectedProcedure) manage a user's own tokens. The service-role
-- auth lookup bypasses RLS, which is required because it runs before
-- a user is known.
-- ============================================================
ALTER TABLE mcp_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mcp tokens"
  ON mcp_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mcp tokens"
  ON mcp_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mcp tokens"
  ON mcp_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own mcp tokens"
  ON mcp_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- Per-token rate limiting (lightweight fixed-window counter).
-- No external infra (repo has no Upstash Redis). A single atomic
-- UPSERT per request buckets by (token, window). Upstash sliding
-- window is the documented v2 upgrade.
-- ============================================================
CREATE TABLE mcp_rate_limits (
  token_id      UUID NOT NULL REFERENCES mcp_tokens(id) ON DELETE CASCADE,
  window_start  TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (token_id, window_start)
);

-- Locked down: only the SECURITY DEFINER RPC (and the service role) touch it.
ALTER TABLE mcp_rate_limits ENABLE ROW LEVEL SECURITY;

-- Atomically record one request against a token's current window and report
-- whether the token is still under its cap. Fixed-window: bucket = floor(now /
-- window). Returns TRUE when allowed, FALSE when the cap is exceeded.
CREATE OR REPLACE FUNCTION mcp_touch_rate_limit(
  p_token_id       UUID,
  p_window_seconds INTEGER,
  p_max            INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bucket TIMESTAMPTZ;
  v_count  INTEGER;
BEGIN
  v_bucket := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO mcp_rate_limits (token_id, window_start, request_count)
    VALUES (p_token_id, v_bucket, 1)
  ON CONFLICT (token_id, window_start)
    DO UPDATE SET request_count = mcp_rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN v_count <= p_max;
END;
$$;
