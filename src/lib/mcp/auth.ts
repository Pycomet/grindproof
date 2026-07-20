import { supabaseAdmin } from "@/lib/supabase/server";
import { hashToken, looksLikeMcpToken } from "./token";

/**
 * Resolved MCP caller identity. Everything downstream (RLS-scoped client, tool
 * dispatch, rate limiting) consumes this — it is the single credential→identity
 * boundary. Layering OAuth on later means changing only this file: the rest of
 * the transport and tools stay identical.
 */
export interface McpIdentity {
  userId: string;
  tokenId: string;
  scopes: string[];
}

/**
 * Resolve a bearer token to an identity, or null if it is missing, malformed,
 * unknown, revoked, or expired.
 *
 * This is the one place that runs BEFORE a user context exists, so it uses the
 * service-role client (which bypasses RLS). It only ever reads a token row by
 * its hash and stamps last_used_at — it never touches user data. Everything
 * after resolution runs through the RLS-scoped client (src/lib/supabase/scoped).
 */
export async function resolveCredential(
  bearerToken: string | undefined
): Promise<McpIdentity | null> {
  if (!bearerToken || !looksLikeMcpToken(bearerToken)) return null;

  const { data, error } = await supabaseAdmin
    .from("mcp_tokens")
    .select("id, user_id, scopes, expires_at, revoked_at")
    .eq("token_hash", hashToken(bearerToken))
    .maybeSingle();

  if (error || !data) return null;
  if (data.revoked_at) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() <= Date.now()) {
    return null;
  }

  // Fire-and-forget: recording usage must never block or fail the request.
  void supabaseAdmin
    .from("mcp_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(
      () => {},
      () => {}
    );

  return {
    userId: data.user_id,
    tokenId: data.id,
    scopes: data.scopes ?? [],
  };
}
