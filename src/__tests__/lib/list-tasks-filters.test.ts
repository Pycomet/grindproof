/**
 * Tests for the list_tasks date filters in src/lib/tools/specs.ts.
 *
 * Regression cover: the tool advertised dateFilter values "tomorrow" and
 * "this_week" in its input schema but implemented neither, so both fell
 * through to NO date filter at all. The coach answered "what's on for
 * tomorrow?" with an unfiltered task list and no indication anything was off.
 *
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { coreToolDefs, type ToolContext } from "@/lib/tools/specs";

/** Records the range predicates a tool applies so we can assert on them. */
function makeDb(timezone: string | null) {
  const calls: { method: string; col: string; val: string }[] = [];

  const taskBuilder: any = {
    select: () => taskBuilder,
    eq: (col: string, val: string) => {
      calls.push({ method: "eq", col, val });
      return taskBuilder;
    },
    gte: (col: string, val: string) => {
      calls.push({ method: "gte", col, val });
      return taskBuilder;
    },
    lte: (col: string, val: string) => {
      calls.push({ method: "lte", col, val });
      return taskBuilder;
    },
    lt: (col: string, val: string) => {
      calls.push({ method: "lt", col, val });
      return taskBuilder;
    },
    order: () => taskBuilder,
    limit: () => Promise.resolve({ data: [], error: null }),
  };

  const settingsBuilder: any = {
    select: () => settingsBuilder,
    eq: () => settingsBuilder,
    maybeSingle: () => Promise.resolve({ data: timezone ? { timezone } : null }),
  };

  const db = {
    from: (table: string) =>
      table === "notification_settings" ? settingsBuilder : taskBuilder,
  };

  return { db: db as any, calls };
}

function listTasks() {
  const def = coreToolDefs().find((d) => d.name === "list_tasks");
  if (!def) throw new Error("list_tasks tool not found");
  return def;
}

async function runFilter(
  dateFilter: string,
  timezone: string | null = "America/New_York"
) {
  const { db, calls } = makeDb(timezone);
  const ctx: ToolContext = { userId: "u1", supabase: db };
  await listTasks().execute(ctx, { status: "all", dateFilter } as any);
  return {
    gte: calls.find((c) => c.method === "gte" && c.col === "due_date")?.val,
    lte: calls.find((c) => c.method === "lte" && c.col === "due_date")?.val,
    lt: calls.find((c) => c.method === "lt" && c.col === "due_date")?.val,
    calls,
  };
}

// 2026-08-05 is a Wednesday. 16:00 UTC is 12:00 in America/New_York (EDT),
// so the UTC date and the user's local date agree — any off-by-one in the
// bounds shows up as a wrong calendar day rather than a timezone artifact.
const NOW = new Date("2026-08-05T16:00:00.000Z");

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe("list_tasks dateFilter", () => {
  it("bounds 'today' to the user's local day", async () => {
    const { gte, lte } = await runFilter("today");
    // EDT is UTC-4, so local midnight Aug 5 is 04:00Z and the day ends at
    // 03:59:59.999Z on Aug 6.
    expect(gte).toBe("2026-08-05T04:00:00.000Z");
    expect(lte).toBe("2026-08-06T03:59:59.999Z");
  });

  it("bounds 'tomorrow' to the user's next local day", async () => {
    const { gte, lte } = await runFilter("tomorrow");
    expect(gte).toBe("2026-08-06T04:00:00.000Z");
    expect(lte).toBe("2026-08-07T03:59:59.999Z");
  });

  it("bounds 'this_week' to the local Monday-through-Sunday week", async () => {
    const { gte, lte } = await runFilter("this_week");
    // Wednesday Aug 5 sits in the week of Mon Aug 3 .. Sun Aug 9.
    expect(gte).toBe("2026-08-03T04:00:00.000Z");
    expect(lte).toBe("2026-08-10T03:59:59.999Z");
  });

  it("treats Sunday as the last day of the current week, not the first", async () => {
    vi.setSystemTime(new Date("2026-08-09T16:00:00.000Z")); // Sunday
    const { gte, lte } = await runFilter("this_week");
    expect(gte).toBe("2026-08-03T04:00:00.000Z");
    expect(lte).toBe("2026-08-10T03:59:59.999Z");
  });

  it("respects a timezone far from UTC", async () => {
    // Pacific/Auckland is UTC+12 in August, so at 16:00Z the user is already
    // on Aug 6 — their "today" is a day ahead of the UTC date, and its
    // midnight lands at 12:00Z on Aug 5.
    const { gte, lte } = await runFilter("today", "Pacific/Auckland");
    expect(gte).toBe("2026-08-05T12:00:00.000Z");
    expect(lte).toBe("2026-08-06T11:59:59.999Z");
  });

  it("falls back to UTC when the user has no timezone set", async () => {
    const { gte, lte } = await runFilter("today", null);
    expect(gte).toBe("2026-08-05T00:00:00.000Z");
    expect(lte).toBe("2026-08-05T23:59:59.999Z");
  });

  it("filters 'overdue' to pending tasks before now", async () => {
    const { lt, calls } = await runFilter("overdue");
    expect(lt).toBe(NOW.toISOString());
    expect(calls).toContainEqual({ method: "eq", col: "status", val: "pending" });
  });

  it("applies no date bounds for 'all'", async () => {
    const { gte, lte, lt } = await runFilter("all");
    expect(gte).toBeUndefined();
    expect(lte).toBeUndefined();
    expect(lt).toBeUndefined();
  });
});
