import { describe, expect, it, vi } from "vitest";

import { BAD_WEEK_THRESHOLD, getLapseProfile } from "@/lib/accountability/lapse";

function makeDb(checkRows: Array<{ created_at: string }>, completionRows: Array<{ completed_at: string | null }>) {
  const dailyChecksBuilder = {
    select: vi.fn(() => dailyChecksBuilder),
    eq: vi.fn(() => dailyChecksBuilder),
    gte: vi.fn(() => dailyChecksBuilder),
    lte: vi.fn(async () => ({ data: checkRows, error: null })),
  };

  const tasksBuilder = {
    select: vi.fn(() => tasksBuilder),
    eq: vi.fn(() => tasksBuilder),
    gte: vi.fn(() => tasksBuilder),
    lte: vi.fn(async () => ({ data: completionRows, error: null })),
  };

  return {
    from: vi.fn((table: string) => {
      if (table === "daily_checks") return dailyChecksBuilder;
      if (table === "tasks") return tasksBuilder;
      throw new Error(`Unexpected table ${table}`);
    }),
  } as any;
}

describe("getLapseProfile", () => {
  it("marks active user as zero days since active", async () => {
    const db = makeDb([{ created_at: "2026-06-28T09:00:00.000Z" }], []);

    const profile = await getLapseProfile(
      db,
      "user-1",
      "UTC",
      new Date("2026-06-28T12:00:00.000Z")
    );

    expect(profile.daysSinceLastActive).toBe(0);
    expect(profile.hadActivityToday).toBe(true);
    expect(profile.isReturningFromBadWeek).toBe(false);
  });

  it("marks bad-week returner when threshold crossed", async () => {
    const db = makeDb([], []);

    const profile = await getLapseProfile(
      db,
      "user-1",
      "UTC",
      new Date("2026-06-28T12:00:00.000Z")
    );

    expect(profile.daysSinceLastActive).toBeGreaterThanOrEqual(1);
    expect(profile.missedDaysLast7).toBeGreaterThanOrEqual(BAD_WEEK_THRESHOLD);
    expect(profile.isReturningFromBadWeek).toBe(true);
  });
});
