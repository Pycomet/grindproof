import { describe, it, expect, vi } from "vitest";
import { upsertSnapshot } from "@/lib/accountability/snapshot";
import { appendScoreEvent } from "@/lib/accountability/events";

function spyDb() {
  const upsert = vi.fn(
    (..._args: unknown[]) =>
      Promise.resolve({ data: null, error: null }) as Promise<{
        data: null;
        error: null;
      }>
  );
  const insert = vi.fn(
    (..._args: unknown[]) =>
      Promise.resolve({ data: null, error: null }) as Promise<{
        data: null;
        error: null;
      }>
  );
  return {
    db: {
      from: (table: string) => ({
        _table: table,
        upsert,
        insert,
      }),
    } as any,
    upsert,
    insert,
  };
}

describe("upsertSnapshot", () => {
  it("sends the right shape with onConflict on user_id,local_date", async () => {
    const { db, upsert } = spyDb();
    await upsertSnapshot(db, "u1", {
      score: 67,
      tier: { name: "Grinding", color: "amber" },
      streak: 3,
      weightedCompletion: 60,
      consistencyRate: 71.428,
      disciplineScore: 90,
      velocityBonus: 1,
      streakBonus: 0,
      delta: 4,
      today: { completed: 2, total: 3, weightedCompletion: 50 },
      drivers: { top: "x", drag: null },
      weakSignals: [],
      active: true,
      timezone: "UTC",
      asOf: new Date().toISOString(),
      localDate: "2026-04-29",
    });
    expect(upsert).toHaveBeenCalledTimes(1);
    const call = upsert.mock.calls[0] as unknown as [Record<string, unknown>, { onConflict: string }];
    const row = call[0];
    const opts = call[1];
    expect(row.user_id).toBe("u1");
    expect(row.local_date).toBe("2026-04-29");
    expect(row.score).toBe(67);
    expect(row.streak).toBe(3);
    expect(row.consistency_rate).toBe(71); // rounded
    expect(row.active).toBe(true);
    expect(opts.onConflict).toBe("user_id,local_date");
  });

  it("calling twice for the same day still upserts twice (DB-level idempotency)", async () => {
    const { db, upsert } = spyDb();
    const fixture = {
      score: 50,
      tier: { name: "Warming Up" as const, color: "orange" as const },
      streak: 1,
      weightedCompletion: 50,
      consistencyRate: 50,
      disciplineScore: 100,
      velocityBonus: 0,
      streakBonus: 0,
      delta: 0,
      today: { completed: 1, total: 2, weightedCompletion: 50 },
      drivers: { top: "x", drag: null },
      weakSignals: [] as Array<{ kind: never; detail: string }>,
      active: true,
      timezone: "UTC",
      asOf: new Date().toISOString(),
      localDate: "2026-04-29",
    };
    await upsertSnapshot(db, "u1", fixture);
    await upsertSnapshot(db, "u1", fixture);
    expect(upsert).toHaveBeenCalledTimes(2);
    // Both calls use the same onConflict key, so the DB will collapse to one
    // row. We can't assert that here without a real DB, but the contract is
    // upheld by the call shape.
  });
});

describe("appendScoreEvent", () => {
  it("inserts a row when score moves", async () => {
    const { db, insert } = spyDb();
    await appendScoreEvent(db, {
      userId: "u1",
      scoreBefore: 60,
      scoreAfter: 65,
      reason: "task_completed",
      relatedTaskId: "task-abc",
      occurredAt: "2026-06-28T00:00:00.000Z",
    });
    expect(insert).toHaveBeenCalledTimes(1);
    const call = insert.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(call[0]).toMatchObject({
      user_id: "u1",
      score_before: 60,
      score_after: 65,
      reason: "task_completed",
      related_task_id: "task-abc",
      occurred_at: "2026-06-28T00:00:00.000Z",
    });
  });

  it("skips no-op recomputes (same before/after, no task)", async () => {
    const { db, insert } = spyDb();
    await appendScoreEvent(db, {
      userId: "u1",
      scoreBefore: 60,
      scoreAfter: 60,
      reason: "snapshot_cron",
    });
    expect(insert).not.toHaveBeenCalled();
  });

  it("records no-op events when allowNoop is true", async () => {
    const { db, insert } = spyDb();
    await appendScoreEvent(db, {
      userId: "u1",
      scoreBefore: 60,
      scoreAfter: 60,
      reason: "missed_day",
      allowNoop: true,
    });
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it("still records events on first compute (scoreBefore=null)", async () => {
    const { db, insert } = spyDb();
    await appendScoreEvent(db, {
      userId: "u1",
      scoreBefore: null,
      scoreAfter: 50,
      reason: "snapshot_cron",
    });
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
