/**
 * Tests for src/server/trpc/routers/mcpToken.ts
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { mcpTokenRouter } from "@/server/trpc/routers/mcpToken";

function makeCaller(result: { single?: unknown; awaited?: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["insert", "update", "select", "eq", "is", "order"]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.single = vi.fn(() =>
    Promise.resolve(result.single ?? { data: null, error: null })
  );
  (builder as any).then = (onF: any, onR: any) =>
    Promise.resolve(result.awaited ?? { data: [], error: null }).then(onF, onR);
  const db = { from: vi.fn(() => builder) };
  const ctx = { db, user: { id: "u1" } } as any;
  return { caller: mcpTokenRouter.createCaller(ctx), builder, db };
}

beforeEach(() => vi.clearAllMocks());

describe("mcpToken.create", () => {
  it("returns the plaintext token once and stores only its hash", async () => {
    const { caller, builder } = makeCaller({
      single: {
        data: {
          id: "tok-1",
          name: "laptop",
          token_prefix: "gp_mcp_ab12",
          expires_at: null,
          created_at: "2026-07-20T00:00:00Z",
        },
        error: null,
      },
    });

    const res = await caller.create({ name: "laptop" });

    expect(res.token).toMatch(/^gp_mcp_/);
    expect(res.id).toBe("tok-1");

    const insertArg = builder.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArg).toMatchObject({ user_id: "u1", name: "laptop", scopes: ["*"] });
    // Stored value is the hash, never the plaintext.
    expect(insertArg.token_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(insertArg.token_hash).not.toBe(res.token);
    expect(insertArg).not.toHaveProperty("token");
  });

  it("sets expires_at when expiresInDays is provided", async () => {
    const { caller, builder } = makeCaller({
      single: {
        data: {
          id: "tok-2",
          name: "ci",
          token_prefix: "gp_mcp_cd34",
          expires_at: "2026-10-18T00:00:00Z",
          created_at: "2026-07-20T00:00:00Z",
        },
        error: null,
      },
    });

    await caller.create({ name: "ci", expiresInDays: 90 });
    const insertArg = builder.insert.mock.calls[0][0] as Record<string, unknown>;
    expect(insertArg.expires_at).toEqual(expect.any(String));
  });
});

describe("mcpToken.revoke", () => {
  it("stamps revoked_at scoped to id + user", async () => {
    const { caller, builder } = makeCaller({});
    const res = await caller.revoke({ id: "tok-1" });

    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ revoked_at: expect.any(String) })
    );
    expect(builder.eq).toHaveBeenCalledWith("id", "tok-1");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(res).toEqual({ success: true, id: "tok-1" });
  });
});

describe("mcpToken.list", () => {
  it("returns non-revoked tokens mapped for display", async () => {
    const { caller, builder } = makeCaller({
      awaited: {
        data: [
          {
            id: "tok-1",
            name: "laptop",
            token_prefix: "gp_mcp_ab12",
            scopes: ["*"],
            last_used_at: null,
            expires_at: null,
            created_at: "2026-07-20T00:00:00Z",
          },
        ],
        error: null,
      },
    });

    const res = await caller.list();
    expect(res).toHaveLength(1);
    expect(res[0]).toMatchObject({ id: "tok-1", name: "laptop", prefix: "gp_mcp_ab12" });
    // Filtered to active tokens only.
    expect(builder.is).toHaveBeenCalledWith("revoked_at", null);
  });
});
