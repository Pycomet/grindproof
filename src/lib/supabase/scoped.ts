import { SignJWT } from "jose";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "./types";

/**
 * User-scoped Supabase client for non-cookie contexts (the MCP server).
 *
 * The app normally obtains a user-scoped client from GoTrue cookies, which
 * carries a JWT whose `sub` claim drives `auth.uid()` in RLS policies. MCP
 * requests arrive with a personal access token, not cookies — so we synthesize
 * an equivalent JWT: a short-lived HS256 token signed with the project's legacy
 * `SUPABASE_JWT_SECRET`, with `sub = userId`. PostgREST validates it exactly
 * like a real session token, so `auth.uid() = userId` and every existing RLS
 * policy applies unchanged. This is defense-in-depth: even if a tool forgets a
 * `.eq("user_id", …)` filter, RLS still scopes the query to the token's owner.
 *
 * Never use `supabaseAdmin` (service role) to execute MCP tools — it bypasses
 * RLS. Use it only for the pre-auth token lookup (see src/lib/mcp/auth.ts).
 */

const jwtSecret = new TextEncoder().encode(env.SUPABASE_JWT_SECRET);

/** Access-token lifetime. Long enough to cover a single MCP request/tool run. */
const TOKEN_TTL_SECONDS = 300;

/**
 * Mint a short-lived Supabase-compatible access token for `userId`.
 * Exported for testing (claim assertions); the route uses the client below.
 */
export async function mintUserAccessToken(
  userId: string,
  nowSeconds: number = Math.floor(Date.now() / 1000)
): Promise<string> {
  return new SignJWT({ role: "authenticated" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userId)
    .setAudience("authenticated")
    .setIssuedAt(nowSeconds)
    .setExpirationTime(nowSeconds + TOKEN_TTL_SECONDS)
    .sign(jwtSecret);
}

/**
 * Create a Supabase client that acts as `userId` under RLS. The minted token is
 * attached as the `Authorization` header so it reaches PostgREST/RPC on every
 * query. The client holds no session and never refreshes.
 */
export async function createUserScopedClient(
  userId: string
): Promise<SupabaseClient<Database>> {
  const accessToken = await mintUserAccessToken(userId);

  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    }
  );
}
