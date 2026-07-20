import { createMcpHandler } from "mcp-handler";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import { resolveCredential } from "@/lib/mcp/auth";
import { createUserScopedClient } from "@/lib/supabase/scoped";
import { supabaseAdmin } from "@/lib/supabase/server";
import { registerMcpTools } from "@/lib/tools/to-mcp";
import { allToolDefs, type ToolContext } from "@/lib/tools/specs";

/**
 * Remote MCP server. Users connect their own AI agent (Claude Code, Cursor,
 * custom agents) by pasting a personal access token; the agent then drives
 * their GrindProof data as them.
 *
 * The dynamic [transport] segment is required because `/api/[trpc]` already
 * occupies a sibling dynamic segment directly under /api. With basePath
 * "/api/mcp", the Streamable-HTTP endpoint users paste is `/api/mcp/mcp`.
 *
 * Auth + rate limiting run in a thin wrapper (not withMcpAuth) so we can return
 * proper 401 vs 429 status codes. On success we set `req.auth` — the shape the
 * MCP SDK reads and exposes to each tool handler as `extra.authInfo`.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

// Fixed-window per-token limit. Generous for interactive agent use; the real
// backstop is that only an authenticated token holder can reach this at all.
const RATE_LIMIT_WINDOW_SECONDS = 60;
const RATE_LIMIT_MAX = 120;

/**
 * Per-call context resolution: read the userId the wrapper stamped into
 * req.auth, and build a fresh RLS-scoped client for exactly this call. This is
 * the only identity→context step; OAuth later would change only how req.auth is
 * populated, not this.
 */
async function resolveToolContext(extra: unknown): Promise<ToolContext> {
  const authInfo = (extra as { authInfo?: AuthInfo } | undefined)?.authInfo;
  const userId = (authInfo?.extra as { userId?: string } | undefined)?.userId;
  if (!userId) throw new Error("Unauthenticated MCP tool call");
  const supabase = await createUserScopedClient(userId);
  return { userId, supabase };
}

const baseHandler = createMcpHandler(
  (server) => {
    registerMcpTools(server, allToolDefs(), resolveToolContext);
  },
  { serverInfo: { name: "grindproof", version: "1.0.0" } },
  { basePath: "/api/mcp", maxDuration: 60, verboseLogs: false }
);

function bearerFrom(req: Request): string | undefined {
  const header = req.headers.get("authorization");
  if (!header) return undefined;
  const [scheme, ...rest] = header.split(" ");
  if (scheme.toLowerCase() !== "bearer") return undefined;
  return rest.join(" ").trim() || undefined;
}

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function handler(req: Request): Promise<Response> {
  const bearer = bearerFrom(req);
  const identity = await resolveCredential(bearer);
  if (!identity) {
    return jsonError(401, "Invalid or missing GrindProof access token");
  }

  const { data: allowed, error } = await supabaseAdmin.rpc("mcp_touch_rate_limit", {
    p_token_id: identity.tokenId,
    p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
    p_max: RATE_LIMIT_MAX,
  });
  // Fail open on limiter errors (availability over strictness for v1); block
  // only on an explicit "not allowed".
  if (!error && allowed === false) {
    return jsonError(429, "Rate limit exceeded. Try again shortly.");
  }

  // The MCP SDK reads req.auth and surfaces it to tool handlers as
  // extra.authInfo. We stash userId/tokenId in `extra` for resolveToolContext.
  (req as Request & { auth?: AuthInfo }).auth = {
    token: bearer as string,
    clientId: identity.userId,
    scopes: identity.scopes,
    extra: { userId: identity.userId, tokenId: identity.tokenId },
  };

  return baseHandler(req);
}

export { handler as GET, handler as POST };
