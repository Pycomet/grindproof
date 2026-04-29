import { describe, it, expect } from "vitest";
import { computeUserAccountability } from "@/lib/accountability/compute";

/**
 * Minimal Supabase chainable mock. We capture which table is being read and
 * return canned rows. The functions under test only need from/select/eq/or/
 * maybeSingle to resolve to a Promise<{ data, error }>, so we don't need a
 * full client.
 */
function mockDb(state: { tasks: any[]; timezone?: string }) {
  return {
    from: (table: string) => {
      const builder: any = {
        _table: table,
        select() {
          return builder;
        },
        eq() {
          return builder;
        },
        or() {
          if (table === "tasks") return Promise.resolve({ data: state.tasks });
          return Promise.resolve({ data: [] });
        },
        maybeSingle() {
          if (table === "notification_settings") {
            return Promise.resolve({
              data: state.timezone
                ? { timezone: state.timezone }
                : null,
            });
          }
          return Promise.resolve({ data: null });
        },
      };
      return builder;
    },
  } as any;
}

const USER = "user-123";

describe("computeUserAccountability", () => {
  it("returns a no-activity snapshot for a user with no tasks", async () => {
    const db = mockDb({ tasks: [], timezone: "UTC" });
    const snap = await computeUserAccountability(
      db,
      USER,
      new Date("2026-04-29T12:00:00Z")
    );
    expect(snap.score).toBe(0);
    expect(snap.streak).toBe(0);
    expect(snap.tier.name).toBe("Slacking");
    expect(snap.weakSignals.some((s) => s.kind === "no_activity")).toBe(true);
    expect(snap.localDate).toBe("2026-04-29");
  });

  it("counts streak from completed_at, not due_date", async () => {
    // Three completions on three consecutive days, all due far in the past.
    // The streak engine must look at completed_at and award a 3-day streak.
    const tasks = [
      {
        id: "t1",
        title: "T1",
        status: "completed",
        priority: "medium",
        due_date: "2025-01-01T00:00:00Z",
        completed_at: "2026-04-27T10:00:00Z",
        carry_over_count: 0,
      },
      {
        id: "t2",
        title: "T2",
        status: "completed",
        priority: "medium",
        due_date: "2025-01-01T00:00:00Z",
        completed_at: "2026-04-28T10:00:00Z",
        carry_over_count: 0,
      },
      {
        id: "t3",
        title: "T3",
        status: "completed",
        priority: "medium",
        due_date: "2025-01-01T00:00:00Z",
        completed_at: "2026-04-29T10:00:00Z",
        carry_over_count: 0,
      },
    ];
    const db = mockDb({ tasks, timezone: "UTC" });
    const snap = await computeUserAccountability(
      db,
      USER,
      new Date("2026-04-29T12:00:00Z")
    );
    expect(snap.streak).toBe(3);
    expect(snap.active).toBe(true);
  });

  it("does NOT count a day as streak-active when only skipped tasks exist", async () => {
    // The behavioral-only streak rule: skips don't keep the streak alive.
    const tasks = [
      {
        id: "t1",
        title: "T1",
        status: "skipped",
        priority: "medium",
        due_date: "2026-04-29T00:00:00Z",
        completed_at: null,
        carry_over_count: 0,
      },
    ];
    const db = mockDb({ tasks, timezone: "UTC" });
    const snap = await computeUserAccountability(
      db,
      USER,
      new Date("2026-04-29T12:00:00Z")
    );
    expect(snap.streak).toBe(0);
    expect(snap.active).toBe(false);
  });

  it("surfaces a chronic carry-over as the 'drag' driver", async () => {
    const tasks = [
      {
        id: "t1",
        title: "Fix the bug",
        status: "pending",
        priority: "high",
        due_date: "2026-04-29T00:00:00Z",
        completed_at: null,
        carry_over_count: 5,
      },
      {
        id: "t2",
        title: "Other",
        status: "completed",
        priority: "medium",
        due_date: "2026-04-29T00:00:00Z",
        completed_at: "2026-04-29T10:00:00Z",
        carry_over_count: 0,
      },
    ];
    const db = mockDb({ tasks, timezone: "UTC" });
    const snap = await computeUserAccountability(
      db,
      USER,
      new Date("2026-04-29T12:00:00Z")
    );
    expect(snap.drivers.drag).toContain("Fix the bug");
    expect(snap.drivers.drag).toContain("5×");
    expect(
      snap.weakSignals.some((s) => s.kind === "chronic_carry_over")
    ).toBe(true);
  });

  it("today tile reflects only tasks bucketed to local today", async () => {
    const tasks = [
      // Yesterday's completion — not in today's tile.
      {
        id: "y1",
        title: "Y",
        status: "completed",
        priority: "medium",
        due_date: "2026-04-28T00:00:00Z",
        completed_at: "2026-04-28T10:00:00Z",
        carry_over_count: 0,
      },
      // Today's completion.
      {
        id: "t1",
        title: "A",
        status: "completed",
        priority: "high",
        due_date: "2026-04-29T00:00:00Z",
        completed_at: "2026-04-29T10:00:00Z",
        carry_over_count: 0,
      },
      // Today's pending.
      {
        id: "t2",
        title: "B",
        status: "pending",
        priority: "medium",
        due_date: "2026-04-29T00:00:00Z",
        completed_at: null,
        carry_over_count: 0,
      },
    ];
    const db = mockDb({ tasks, timezone: "UTC" });
    const snap = await computeUserAccountability(
      db,
      USER,
      new Date("2026-04-29T12:00:00Z")
    );
    expect(snap.today.total).toBe(2);
    expect(snap.today.completed).toBe(1);
  });

  it("respects the user's timezone for 'today'", async () => {
    // 2026-04-29 16:00 UTC = 2026-04-30 01:00 Tokyo. The Tokyo user's "today"
    // is Tuesday 2026-04-30; the task completed on 2026-04-29 18:00 Tokyo
    // (= 09:00 UTC) lives in YESTERDAY for that user.
    const tasks = [
      {
        id: "t1",
        title: "T",
        status: "completed",
        priority: "medium",
        due_date: "2026-04-29T09:00:00Z",
        completed_at: "2026-04-29T09:00:00Z",
        carry_over_count: 0,
      },
    ];
    const db = mockDb({ tasks, timezone: "Asia/Tokyo" });
    const snap = await computeUserAccountability(
      db,
      USER,
      new Date("2026-04-29T16:00:00Z")
    );
    expect(snap.localDate).toBe("2026-04-30");
    expect(snap.today.total).toBe(0);
    expect(snap.streak).toBe(0); // today is empty for the Tokyo user
  });

  it("falls back to UTC when no timezone is configured", async () => {
    const tasks: any[] = [];
    const db = mockDb({ tasks });
    const snap = await computeUserAccountability(
      db,
      USER,
      new Date("2026-04-29T12:00:00Z")
    );
    expect(snap.timezone).toBe("UTC");
  });
});
