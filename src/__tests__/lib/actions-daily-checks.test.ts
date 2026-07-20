/**
 * Tests for src/lib/actions/daily-checks.ts
 *
 * @vitest-environment node
 *
 * The load-bearing assertions here are the accountability side effects: an
 * MCP-driven check-in MUST still fire the carry-over RPC, the daily_checks
 * marker, the score recompute, and the pattern engine — otherwise streaks and
 * scores silently drift.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/accountability/hooks", () => ({
  fireAndForgetScoreChange: vi.fn(),
}));
vi.mock("@/lib/ai/patterns", () => ({
  computeUserPatterns: vi.fn(() => Promise.resolve()),
}));

import {
  recordMorningCheckIn,
  recordEveningReflections,
  recordTaskReflection,
} from "@/lib/actions/daily-checks";
import { fireAndForgetScoreChange } from "@/lib/accountability/hooks";
import { computeUserPatterns } from "@/lib/ai/patterns";

function makeDb(rpcResult: { data?: unknown; error?: unknown } = { data: 0, error: null }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["insert", "update", "select", "eq"]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve({ data: { id: "ok" }, error: null }));
  (builder as any).then = (onF: any, onR: any) =>
    Promise.resolve({ data: null, error: null }).then(onF, onR);
  const rpc = vi.fn(() => Promise.resolve(rpcResult));
  const from = vi.fn(() => builder);
  return { db: { from, rpc } as any, builder, rpc, from };
}

beforeEach(() => vi.clearAllMocks());

describe("recordMorningCheckIn", () => {
  it("carries tasks over, records the marker, and nudges the score", async () => {
    const { db, builder, rpc } = makeDb({ data: 2, error: null });

    const res = await recordMorningCheckIn(db, "u1", { taskIds: ["t1", "t2"] });

    expect(rpc).toHaveBeenCalledWith(
      "carry_over_tasks",
      expect.objectContaining({ p_task_ids: ["t1", "t2"] })
    );
    expect(builder.insert).toHaveBeenCalledWith({ user_id: "u1", type: "morning" });
    expect(fireAndForgetScoreChange).toHaveBeenCalledWith(db, "u1", "task_carried_over");
    expect(res).toEqual({ success: true, count: 2 });
  });

  it("swallows a unique-violation on the marker (idempotent)", async () => {
    const { db, builder } = makeDb();
    builder.insert.mockReturnValueOnce({
      then: (onF: any) => Promise.resolve({ error: { code: "23505" } }).then(onF),
    } as any);
    await expect(recordMorningCheckIn(db, "u1", { taskIds: [] })).resolves.toMatchObject({
      success: true,
    });
  });
});

describe("recordEveningReflections", () => {
  it("buckets completed/skipped, carries skips, marks evening, recomputes, and runs patterns", async () => {
    const { db, builder, rpc } = makeDb({ data: 1, error: null });

    const res = await recordEveningReflections(db, "u1", {
      reflections: [
        { taskId: "t1", status: "completed", reflection: "did it" },
        { taskId: "t2", status: "skipped", reflection: "no time" },
      ],
    });

    // Skipped task carried over via RPC
    expect(rpc).toHaveBeenCalledWith(
      "carry_over_tasks",
      expect.objectContaining({ p_task_ids: ["t2"] })
    );
    // Task rows updated (completion + reflections) and evening marker inserted
    expect(builder.update).toHaveBeenCalled();
    expect(builder.insert).toHaveBeenCalledWith({ user_id: "u1", type: "evening" });
    // Accountability side effects fired
    expect(fireAndForgetScoreChange).toHaveBeenCalledWith(db, "u1", "evening_reflection");
    expect(computeUserPatterns).toHaveBeenCalledWith(db, "u1");
    expect(res).toEqual({ success: true, completedCount: 1, skippedCount: 1 });
  });

  it("throws if carry-over fails", async () => {
    const { db } = makeDb({ data: null, error: { message: "rpc down" } });
    await expect(
      recordEveningReflections(db, "u1", {
        reflections: [{ taskId: "t2", status: "skipped" }],
      })
    ).rejects.toThrow("Failed to carry over tasks: rpc down");
  });
});

describe("recordTaskReflection", () => {
  it("updates a single task and nudges score when a terminal status is set", async () => {
    const { db, builder } = makeDb();
    const res = await recordTaskReflection(db, "u1", {
      taskId: "t1",
      reflection: "done",
      status: "completed",
    });
    expect(builder.update).toHaveBeenCalledWith(
      expect.objectContaining({ reflection: "done", status: "completed" })
    );
    expect(fireAndForgetScoreChange).toHaveBeenCalledWith(db, "u1", "evening_reflection");
    expect(res).toEqual({ success: true, taskId: "t1" });
  });

  it("is a no-op (no write) when nothing is provided", async () => {
    const { db, from } = makeDb();
    const res = await recordTaskReflection(db, "u1", { taskId: "t1" });
    expect(from).not.toHaveBeenCalled();
    expect(res).toEqual({ success: true, taskId: "t1" });
  });
});
