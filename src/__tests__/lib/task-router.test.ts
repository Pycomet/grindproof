/**
 * Tests for src/server/trpc/routers/task.ts — the dashboard's task feed.
 *
 * Regression cover for the production bug where Today's Tasks and This Week
 * both rendered empty: getAll() capped at 200 rows while sorted due_date
 * ASCENDING, so once an account accumulated more than 200 tasks the window
 * held only the OLDEST ones and every recent task fell off the end.
 *
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { taskRouter } from "@/server/trpc/routers/task";

const ROW_CAP = 200;

interface Row {
  id: string;
  user_id: string;
  title: string;
  due_date: string | null;
  status: string;
  goal_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * In-memory stand-in for the Supabase query builder that honours the parts of
 * the contract this bug lives in: eq/gte/lte filtering, order() direction and
 * null placement, and limit() truncating AFTER the sort — exactly how PostgREST
 * behaves. A mock that ignored ordering would not reproduce the bug.
 */
function makeDb(rows: Row[]) {
  const state = {
    filters: [] as ((r: Row) => boolean)[],
    orderCol: null as keyof Row | null,
    ascending: true,
    nullsFirst: false,
    limit: Infinity,
  };

  const builder: any = {
    select: () => builder,
    eq: (col: keyof Row, val: unknown) => {
      state.filters.push((r) => r[col] === val);
      return builder;
    },
    gte: (col: keyof Row, val: string) => {
      state.filters.push((r) => r[col] !== null && String(r[col]) >= val);
      return builder;
    },
    lte: (col: keyof Row, val: string) => {
      state.filters.push((r) => r[col] !== null && String(r[col]) <= val);
      return builder;
    },
    order: (
      col: keyof Row,
      opts?: { ascending?: boolean; nullsFirst?: boolean }
    ) => {
      state.orderCol = col;
      state.ascending = opts?.ascending ?? true;
      state.nullsFirst = opts?.nullsFirst ?? false;
      return builder;
    },
    limit: (n: number) => {
      state.limit = n;
      return Promise.resolve(resolve());
    },
    then: (onF: any, onR: any) => Promise.resolve(resolve()).then(onF, onR),
  };

  function resolve() {
    let out = rows.filter((r) => state.filters.every((f) => f(r)));
    if (state.orderCol) {
      const col = state.orderCol;
      out = [...out].sort((a, b) => {
        const av = a[col];
        const bv = b[col];
        if (av === null && bv === null) return 0;
        if (av === null) return state.nullsFirst ? -1 : 1;
        if (bv === null) return state.nullsFirst ? 1 : -1;
        const cmp = String(av) < String(bv) ? -1 : String(av) > String(bv) ? 1 : 0;
        return state.ascending ? cmp : -cmp;
      });
    }
    return { data: out.slice(0, state.limit), error: null };
  }

  return { from: () => builder } as any;
}

function row(id: string, dueDate: string | null): Row {
  return {
    id,
    user_id: "u1",
    title: `task ${id}`,
    due_date: dueDate,
    status: "pending",
    goal_id: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

/** A long-lived account: 250 historical tasks, then today's and this week's. */
function buildBacklog(now: Date) {
  const rows: Row[] = [];
  for (let i = 0; i < 250; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - (400 - i));
    rows.push(row(`old-${i}`, d.toISOString()));
  }
  const today = new Date(now);
  today.setHours(9, 0, 0, 0);
  rows.push(row("today", today.toISOString()));

  const laterThisWeek = new Date(now);
  laterThisWeek.setDate(laterThisWeek.getDate() + 1);
  rows.push(row("this-week", laterThisWeek.toISOString()));

  return rows;
}

function caller(rows: Row[]) {
  return taskRouter.createCaller({
    db: makeDb(rows),
    user: { id: "u1" } as any,
  } as any);
}

describe("task.getAll row cap", () => {
  it("keeps today's and this week's tasks on an account with a long backlog", async () => {
    const now = new Date();
    const result = await caller(buildBacklog(now)).getAll();

    const ids = result.map((t) => t.id);
    expect(ids).toContain("today");
    expect(ids).toContain("this-week");
  });

  it("never returns more than the row cap", async () => {
    const result = await caller(buildBacklog(new Date())).getAll();
    expect(result.length).toBeLessThanOrEqual(ROW_CAP);
  });

  it("returns tasks in ascending due-date order, nulls last", async () => {
    const rows = [
      row("c", "2026-03-03T00:00:00.000Z"),
      row("undated", null),
      row("a", "2026-01-01T00:00:00.000Z"),
      row("b", "2026-02-02T00:00:00.000Z"),
    ];
    const result = await caller(rows).getAll();
    expect(result.map((t) => t.id)).toEqual(["a", "b", "c", "undated"]);
  });

  it("still honours an explicit date range filter", async () => {
    const rows = [
      row("before", "2026-01-01T00:00:00.000Z"),
      row("inside", "2026-06-15T00:00:00.000Z"),
      row("after", "2026-12-31T00:00:00.000Z"),
    ];
    const result = await caller(rows).getAll({
      startDate: new Date("2026-06-01T00:00:00.000Z"),
      endDate: new Date("2026-07-01T00:00:00.000Z"),
    });
    expect(result.map((t) => t.id)).toEqual(["inside"]);
  });
});
