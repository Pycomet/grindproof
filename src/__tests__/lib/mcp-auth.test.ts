/**
 * Tests for src/lib/mcp/auth.ts — the credential→identity boundary.
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateMcpToken, hashToken } from "@/lib/mcp/token";

const maybeSingleMock = vi.fn();
const selectEqMock = vi.fn(() => ({ maybeSingle: maybeSingleMock }));
const selectMock = vi.fn(() => ({ eq: selectEqMock }));
const updateEqMock = vi.fn(() => Promise.resolve({ data: null, error: null }));
const updateMock = vi.fn(() => ({ eq: updateEqMock }));
const fromMock = vi.fn((..._args: unknown[]) => ({
  select: selectMock,
  update: updateMock,
}));

vi.mock("@/lib/supabase/server", () => ({
  // Lazy indirection: the factory is hoisted above the const declarations, so
  // it must not read `fromMock` until `.from()` is actually invoked at runtime.
  supabaseAdmin: { from: (...args: unknown[]) => fromMock(...args) },
}));

import { resolveCredential } from "@/lib/mcp/auth";

const VALID = generateMcpToken().token;

const activeRow = {
  id: "tok-1",
  user_id: "user-1",
  scopes: ["*"],
  expires_at: null,
  revoked_at: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  updateEqMock.mockReturnValue(Promise.resolve({ data: null, error: null }));
});

describe("resolveCredential", () => {
  it("returns identity for a valid active token and stamps last_used_at", async () => {
    maybeSingleMock.mockResolvedValue({ data: activeRow, error: null });

    const identity = await resolveCredential(VALID);

    expect(identity).toEqual({ userId: "user-1", tokenId: "tok-1", scopes: ["*"] });
    // Looked up by hash of the presented token
    expect(selectEqMock).toHaveBeenCalledWith("token_hash", hashToken(VALID));
    // Fire-and-forget usage stamp issued
    expect(updateMock).toHaveBeenCalledTimes(1);
    expect(updateEqMock).toHaveBeenCalledWith("id", "tok-1");
  });

  it("returns null for an unknown token (no row)", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    expect(await resolveCredential(VALID)).toBeNull();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns null for a revoked token", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { ...activeRow, revoked_at: new Date().toISOString() },
      error: null,
    });
    expect(await resolveCredential(VALID)).toBeNull();
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("returns null for an expired token", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { ...activeRow, expires_at: new Date(Date.now() - 1000).toISOString() },
      error: null,
    });
    expect(await resolveCredential(VALID)).toBeNull();
  });

  it("accepts a token whose expiry is in the future", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { ...activeRow, expires_at: new Date(Date.now() + 60_000).toISOString() },
      error: null,
    });
    const identity = await resolveCredential(VALID);
    expect(identity?.userId).toBe("user-1");
  });

  it("returns null for a malformed token without hitting the DB", async () => {
    expect(await resolveCredential("not-a-real-token")).toBeNull();
    expect(await resolveCredential(undefined)).toBeNull();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("returns null when the lookup errors", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect(await resolveCredential(VALID)).toBeNull();
  });
});
