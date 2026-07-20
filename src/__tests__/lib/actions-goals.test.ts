/**
 * Tests for src/lib/actions/goals.ts
 *
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGoal, updateGoal, deleteGoal } from "@/lib/actions/goals";

/** Minimal chainable Supabase builder that resolves to `result`. */
function makeDb(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["insert", "update", "delete", "select", "eq", "order"]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  // Make the builder awaitable for chains that end without maybeSingle (delete).
  (builder as any).then = (onF: any, onR: any) =>
    Promise.resolve(result).then(onF, onR);
  const from = vi.fn(() => builder);
  return { db: { from } as any, builder, from };
}

const dbRow = {
  id: "g1",
  user_id: "u1",
  title: "Ship MCP",
  description: "desc",
  status: "active",
  priority: "high",
  created_at: "2026-07-20T00:00:00Z",
  updated_at: "2026-07-20T00:00:00Z",
};

beforeEach(() => vi.clearAllMocks());

describe("createGoal", () => {
  it("inserts with user_id and returns the mapped goal", async () => {
    const { db, builder, from } = makeDb({ data: dbRow, error: null });

    const goal = await createGoal(db, "u1", {
      title: "Ship MCP",
      status: "active",
      priority: "high",
    } as any);

    expect(from).toHaveBeenCalledWith("goals");
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: "u1", title: "Ship MCP", status: "active", priority: "high" })
    );
    expect(goal).toMatchObject({ id: "g1", userId: "u1", title: "Ship MCP", status: "active" });
    expect(goal.createdAt).toBeInstanceOf(Date);
  });

  it("throws when the insert errors", async () => {
    const { db } = makeDb({ data: null, error: { message: "nope" } });
    await expect(createGoal(db, "u1", { title: "x" } as any)).rejects.toThrow("Failed to create goal: nope");
  });
});

describe("updateGoal", () => {
  it("applies only provided fields, scoped by id + user_id", async () => {
    const { db, builder } = makeDb({ data: dbRow, error: null });

    await updateGoal(db, "u1", { id: "g1", title: "New" } as any);

    expect(builder.update).toHaveBeenCalledWith({ title: "New" });
    expect(builder.eq).toHaveBeenCalledWith("id", "g1");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "u1");
  });

  it("throws 'not found' when no row is returned", async () => {
    const { db } = makeDb({ data: null, error: null });
    await expect(updateGoal(db, "u1", { id: "missing" } as any)).rejects.toThrow(
      "Goal not found or access denied"
    );
  });
});

describe("deleteGoal", () => {
  it("deletes by id + user_id and returns the id", async () => {
    const { db, builder } = makeDb({ error: null });
    const res = await deleteGoal(db, "u1", "g1");
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith("id", "g1");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "u1");
    expect(res).toEqual({ success: true, id: "g1" });
  });
});
