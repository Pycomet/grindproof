/**
 * Tests for src/server/trpc/routers/goal.ts.
 *
 * Regression cover: goal progress percentages were computed on the client by
 * filtering the dashboard's task array, which is capped at 200 rows. On a
 * long-lived account the counts silently described only the tasks that
 * survived the cap, so a goal with 400 finished tasks could render as "0%".
 * Counts now come from the database, which sees every row.
 *
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { goalRouter } from "@/server/trpc/routers/goal";

const goalRows = [
  {
    id: "g1",
    user_id: "u1",
    title: "Ship MCP",
    description: null,
    status: "active",
    priority: "high",
    created_at: "2026-07-20T00:00:00Z",
    updated_at: "2026-07-20T00:00:00Z",
  },
  {
    id: "g2",
    user_id: "u1",
    title: "Run a half",
    description: null,
    status: "active",
    priority: "medium",
    created_at: "2026-07-21T00:00:00Z",
    updated_at: "2026-07-21T00:00:00Z",
  },
];

/**
 * Fake Supabase that answers `count: exact, head: true` probes from a fixture
 * of per-goal totals, so the router's counting logic is exercised rather than
 * mocked away.
 */
function makeDb(counts: Record<string, { total: number; completed: number }>) {
  const from = (table: string) => {
    if (table === "goals") {
      const b: any = {
        select: () => b,
        eq: () => b,
        order: () => Promise.resolve({ data: goalRows, error: null }),
      };
      return b;
    }

    // tasks: collect filters, then resolve to the matching count.
    const filters: Record<string, string> = {};
    const b: any = {
      select: () => b,
      eq: (col: string, val: string) => {
        filters[col] = val;
        return b;
      },
      then: (onF: any, onR: any) => {
        const goalId = filters.goal_id;
        const entry = counts[goalId] ?? { total: 0, completed: 0 };
        const count =
          filters.status === "completed" ? entry.completed : entry.total;
        return Promise.resolve({ count, error: null }).then(onF, onR);
      },
    };
    return b;
  };

  return { from } as any;
}

function caller(counts: Record<string, { total: number; completed: number }>) {
  return goalRouter.createCaller({
    db: makeDb(counts),
    user: { id: "u1" } as any,
  } as any);
}

describe("goal.getAll progress counts", () => {
  it("reports counts from the database, not from a capped task page", async () => {
    const goals = await caller({
      g1: { total: 400, completed: 300 },
      g2: { total: 10, completed: 0 },
    }).getAll();

    expect(goals).toHaveLength(2);
    expect(goals[0]).toMatchObject({
      id: "g1",
      taskTotal: 400,
      taskCompleted: 300,
    });
    expect(goals[1]).toMatchObject({
      id: "g2",
      taskTotal: 10,
      taskCompleted: 0,
    });
  });

  it("reports zeroes for a goal with no linked tasks", async () => {
    const goals = await caller({}).getAll();
    expect(goals[0]).toMatchObject({ taskTotal: 0, taskCompleted: 0 });
  });

  it("preserves the existing goal fields", async () => {
    const goals = await caller({ g1: { total: 1, completed: 1 } }).getAll();
    expect(goals[0]).toMatchObject({
      id: "g1",
      userId: "u1",
      title: "Ship MCP",
      status: "active",
      priority: "high",
    });
    expect(goals[0].createdAt).toBeInstanceOf(Date);
  });
});
