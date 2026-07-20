import { createHash, randomBytes } from "crypto";

/**
 * Personal access tokens for the MCP server.
 *
 * A token is a high-entropy random secret with a recognizable prefix. Only its
 * SHA-256 hash is persisted (see the mcp_tokens migration); the plaintext is
 * shown to the user exactly once. Because the token carries full entropy, a
 * fast exact-match hash (SHA-256, GitHub-PAT style) is the correct choice — the
 * indexed lookup is O(1) and there is nothing low-entropy to brute-force, so
 * bcrypt's work factor would only slow the auth hot path.
 */

/** Human-recognizable prefix so a leaked token is obviously a GrindProof MCP key. */
export const MCP_TOKEN_PREFIX = "gp_mcp_";

/** Chars stored/displayed for identifying a token without revealing it. */
const DISPLAY_PREFIX_LENGTH = 12;

export interface GeneratedToken {
  /** Full plaintext token — returned to the user once, never stored. */
  token: string;
  /** SHA-256 hex hash, stored in mcp_tokens.token_hash. */
  hash: string;
  /** Leading chars stored in mcp_tokens.token_prefix for display. */
  prefix: string;
}

/** SHA-256 hex of a token. Used at generation and on every auth lookup. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Generate a new MCP token plus its stored hash and display prefix. */
export function generateMcpToken(): GeneratedToken {
  const secret = randomBytes(32).toString("base64url");
  const token = `${MCP_TOKEN_PREFIX}${secret}`;
  return {
    token,
    hash: hashToken(token),
    prefix: token.slice(0, DISPLAY_PREFIX_LENGTH),
  };
}

/** Cheap shape check to reject obviously-invalid bearer strings before a DB hit. */
export function looksLikeMcpToken(value: string): boolean {
  return value.startsWith(MCP_TOKEN_PREFIX) && value.length > MCP_TOKEN_PREFIX.length + 20;
}
