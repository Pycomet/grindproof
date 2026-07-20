/**
 * Tests for src/lib/mcp/token.ts
 *
 * @vitest-environment node
 */
import { createHash } from "crypto";
import {
  MCP_TOKEN_PREFIX,
  generateMcpToken,
  hashToken,
  looksLikeMcpToken,
} from "@/lib/mcp/token";

describe("generateMcpToken", () => {
  it("produces a prefixed token whose hash and prefix match", () => {
    const { token, hash, prefix } = generateMcpToken();

    expect(token.startsWith(MCP_TOKEN_PREFIX)).toBe(true);
    expect(hash).toBe(createHash("sha256").update(token).digest("hex"));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(token.startsWith(prefix)).toBe(true);
    expect(prefix.length).toBe(12);
  });

  it("generates unique tokens across calls", () => {
    const seen = new Set(
      Array.from({ length: 200 }, () => generateMcpToken().token)
    );
    expect(seen.size).toBe(200);
  });
});

describe("hashToken", () => {
  it("is deterministic", () => {
    expect(hashToken("gp_mcp_abc")).toBe(hashToken("gp_mcp_abc"));
    expect(hashToken("gp_mcp_abc")).not.toBe(hashToken("gp_mcp_abd"));
  });
});

describe("looksLikeMcpToken", () => {
  it("accepts real generated tokens", () => {
    expect(looksLikeMcpToken(generateMcpToken().token)).toBe(true);
  });

  it("rejects wrong prefix or too-short strings", () => {
    expect(looksLikeMcpToken("sk_live_1234567890abcdef")).toBe(false);
    expect(looksLikeMcpToken("gp_mcp_short")).toBe(false);
    expect(looksLikeMcpToken("")).toBe(false);
  });
});
