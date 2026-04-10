# Accountability Feedback System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a blended accountability score (completion + consistency), dashboard widget, stats page, and AI context injection to close the engagement gap between daily tasks and weekly roasts.

**Architecture:** New tRPC router computes scores on-the-fly from existing `tasks` and `daily_checks` tables. Dashboard gets a summary widget component. Stats page is a new route under `/dashboard/stats`. Weekly roast and AI coach get score data injected into their prompts/tools.

**Tech Stack:** Next.js App Router, tRPC, Supabase, shadcn/ui, Tailwind CSS, Vercel AI SDK

**Spec:** `docs/superpowers/specs/2026-04-09-accountability-feedback-system-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/server/trpc/routers/accountabilityScore.ts` | Score engine: getScore, getScoreTrend, getActivityHeatmap |
| `src/lib/accountability.ts` | Pure scoring functions (computeScore, computeStreak, getTier) — testable without DB |
| `src/lib/__tests__/accountability.test.ts` | Unit tests for scoring logic |
| `src/components/AccountabilityWidget.tsx` | Dashboard summary widget (score ring, streak, today's progress) |
| `src/app/dashboard/stats/page.tsx` | Full stats page |

### Modified Files
| File | Change |
|------|--------|
| `src/server/trpc/routers/_app.ts` | Register `accountabilityScore` router |
| `src/app/dashboard/page.tsx` | Add `AccountabilityWidget` above `StoicQuote` |
| `src/lib/prompts/weekly-roast-prompt.ts` | Add score/streak/tier context to prompt |
| `src/app/api/cron/weekly-roast/route.ts` | Compute and pass score data to roast prompt |
| `src/lib/ai/tools.ts` | Add `get_accountability_score` tool |

---

### Task 1: Pure Scoring Functions

**Files:**
- Create: `src/lib/accountability.ts`
- Create: `src/lib/__tests__/accountability.test.ts`

- [ ] **Step 1: Write failing tests for scoring functions**

Create the test file:

```typescript
// src/lib/__tests__/accountability.test.ts
import { describe, it, expect } from "vitest";
import {
  computeCompletionRate,
  computeConsistencyRate,
  computeStreakBonus,
  computeScore,
  getTier,
} from "../accountability";

describe("computeCompletionRate", () => {
  it("returns 0 when no tasks exist", () => {
    expect(computeCompletionRate(0, 0)).toBe(0);
  });

  it("returns 100 when all tasks completed", () => {
    expect(computeCompletionRate(5, 5)).toBe(100);
  });

  it("returns correct percentage", () => {
    expect(computeCompletionRate(10, 7)).toBe(70);
  });
});

describe("computeConsistencyRate", () => {
  it("returns 0 when no active days", () => {
    expect(computeConsistencyRate(0, 14)).toBe(0);
  });

  it("returns 100 when all days active", () => {
    expect(computeConsistencyRate(14, 14)).toBe(100);
  });

  it("returns correct percentage", () => {
    expect(computeConsistencyRate(10, 14)).toBeCloseTo(71.43, 1);
  });
});

describe("computeStreakBonus", () => {
  it("returns 0 for streaks under 7", () => {
    expect(computeStreakBonus(0)).toBe(0);
    expect(computeStreakBonus(6)).toBe(0);
  });

  it("returns 1 for 7-day streak", () => {
    expect(computeStreakBonus(7)).toBe(1);
  });

  it("caps at 5 for long streaks", () => {
    expect(computeStreakBonus(11)).toBe(5);
    expect(computeStreakBonus(100)).toBe(5);
  });
});

describe("computeScore", () => {
  it("blends completion (60%) and consistency (40%) with streak bonus", () => {
    // completion=80, consistency=90, streak=10
    // (80*0.6) + (90*0.4) + min(10-6, 5) = 48 + 36 + 4 = 88
    const score = computeScore({
      completionRate: 80,
      consistencyRate: 90,
      currentStreak: 10,
    });
    expect(score).toBe(88);
  });

  it("clamps to 100", () => {
    const score = computeScore({
      completionRate: 100,
      consistencyRate: 100,
      currentStreak: 20,
    });
    expect(score).toBe(100);
  });

  it("returns 0 for no activity", () => {
    const score = computeScore({
      completionRate: 0,
      consistencyRate: 0,
      currentStreak: 0,
    });
    expect(score).toBe(0);
  });
});

describe("getTier", () => {
  it("returns correct tier for each range", () => {
    expect(getTier(0)).toEqual({ name: "Slacking", color: "red" });
    expect(getTier(39)).toEqual({ name: "Slacking", color: "red" });
    expect(getTier(40)).toEqual({ name: "Warming Up", color: "orange" });
    expect(getTier(59)).toEqual({ name: "Warming Up", color: "orange" });
    expect(getTier(60)).toEqual({ name: "Grinding", color: "amber" });
    expect(getTier(74)).toEqual({ name: "Grinding", color: "amber" });
    expect(getTier(75)).toEqual({ name: "Locked In", color: "green" });
    expect(getTier(89)).toEqual({ name: "Locked In", color: "green" });
    expect(getTier(90)).toEqual({ name: "Proven", color: "purple" });
    expect(getTier(100)).toEqual({ name: "Proven", color: "purple" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/__tests__/accountability.test.ts`
Expected: FAIL — module `../accountability` not found

- [ ] **Step 3: Implement scoring functions**

```typescript
// src/lib/accountability.ts

export function computeCompletionRate(
  totalTasks: number,
  completedTasks: number
): number {
  if (totalTasks === 0) return 0;
  return Math.round((completedTasks / totalTasks) * 100);
}

export function computeConsistencyRate(
  activeDays: number,
  windowDays: number
): number {
  if (windowDays === 0) return 0;
  return (activeDays / windowDays) * 100;
}

export function computeStreakBonus(currentStreak: number): number {
  if (currentStreak < 7) return 0;
  return Math.min(currentStreak - 6, 5);
}

export function computeScore(input: {
  completionRate: number;
  consistencyRate: number;
  currentStreak: number;
}): number {
  const raw =
    input.completionRate * 0.6 +
    input.consistencyRate * 0.4 +
    computeStreakBonus(input.currentStreak);
  return Math.min(Math.round(raw), 100);
}

export type Tier = {
  name: "Slacking" | "Warming Up" | "Grinding" | "Locked In" | "Proven";
  color: "red" | "orange" | "amber" | "green" | "purple";
};

export function getTier(score: number): Tier {
  if (score >= 90) return { name: "Proven", color: "purple" };
  if (score >= 75) return { name: "Locked In", color: "green" };
  if (score >= 60) return { name: "Grinding", color: "amber" };
  if (score >= 40) return { name: "Warming Up", color: "orange" };
  return { name: "Slacking", color: "red" };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/accountability.test.ts`
Expected: All 12 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/accountability.ts src/lib/__tests__/accountability.test.ts
git commit -m "feat: add pure accountability scoring functions with tests"
```

---

### Task 2: Accountability Score tRPC Router

**Files:**
- Create: `src/server/trpc/routers/accountabilityScore.ts`
- Modify: `src/server/trpc/routers/_app.ts`

- [ ] **Step 1: Create the accountability score router**

```typescript
// src/server/trpc/routers/accountabilityScore.ts
import { z } from "zod";
import { router, protectedProcedure } from "../context";
import {
  computeCompletionRate,
  computeConsistencyRate,
  computeScore,
  getTier,
} from "@/lib/accountability";

const WINDOW_DAYS = 14;

/** Get the start of a day in ISO string */
function startOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/** Get the end of a day in ISO string */
function endOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

/** Compute streak by counting consecutive active days backwards from today */
async function computeStreak(
  db: any,
  userId: string,
  today: Date
): Promise<number> {
  let streak = 0;
  const checkDate = new Date(today);

  for (let i = 0; i < 365; i++) {
    const dayStart = startOfDay(checkDate);
    const dayEnd = endOfDay(checkDate);

    // Check for completed tasks on this day
    const { count: taskCount } = await db
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("due_date", dayStart)
      .lte("due_date", dayEnd);

    // Check for daily check-ins on this day
    const { count: checkInCount } = await db
      .from("daily_checks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", dayStart)
      .lte("created_at", dayEnd);

    if ((taskCount ?? 0) > 0 || (checkInCount ?? 0) > 0) {
      streak++;
    } else {
      break;
    }

    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}

/** Fetch task stats for a date window */
async function getWindowStats(
  db: any,
  userId: string,
  windowStart: Date,
  windowEnd: Date
) {
  const { data: tasks } = await db
    .from("tasks")
    .select("status, due_date")
    .eq("user_id", userId)
    .gte("due_date", startOfDay(windowStart))
    .lte("due_date", endOfDay(windowEnd));

  const allTasks = tasks || [];
  const total = allTasks.length;
  const completed = allTasks.filter(
    (t: any) => t.status === "completed"
  ).length;

  // Count active days (days with at least 1 completed task)
  const activeDaysFromTasks = new Set(
    allTasks
      .filter((t: any) => t.status === "completed")
      .map((t: any) => new Date(t.due_date).toISOString().split("T")[0])
  );

  // Also count days with check-ins
  const { data: checkIns } = await db
    .from("daily_checks")
    .select("created_at")
    .eq("user_id", userId)
    .gte("created_at", startOfDay(windowStart))
    .lte("created_at", endOfDay(windowEnd));

  const activeDaysFromCheckIns = new Set(
    (checkIns || []).map((c: any) =>
      new Date(c.created_at).toISOString().split("T")[0]
    )
  );

  const activeDays = new Set([
    ...activeDaysFromTasks,
    ...activeDaysFromCheckIns,
  ]).size;

  return { total, completed, activeDays };
}

export const accountabilityScoreRouter = router({
  getScore: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const today = new Date();

    // Current window
    const windowStart = new Date(today);
    windowStart.setDate(windowStart.getDate() - (WINDOW_DAYS - 1));
    const stats = await getWindowStats(ctx.db, userId, windowStart, today);

    // Streak
    const currentStreak = await computeStreak(ctx.db, userId, today);

    // Compute score
    const completionRate = computeCompletionRate(stats.total, stats.completed);
    const consistencyRate = computeConsistencyRate(
      stats.activeDays,
      WINDOW_DAYS
    );
    const score = computeScore({
      completionRate,
      consistencyRate,
      currentStreak,
    });
    const tier = getTier(score);

    // Delta: compute score from 7 days ago
    const pastEnd = new Date(today);
    pastEnd.setDate(pastEnd.getDate() - 7);
    const pastStart = new Date(pastEnd);
    pastStart.setDate(pastStart.getDate() - (WINDOW_DAYS - 1));
    const pastStats = await getWindowStats(ctx.db, userId, pastStart, pastEnd);
    const pastCompletionRate = computeCompletionRate(
      pastStats.total,
      pastStats.completed
    );
    const pastConsistencyRate = computeConsistencyRate(
      pastStats.activeDays,
      WINDOW_DAYS
    );
    const pastScore = computeScore({
      completionRate: pastCompletionRate,
      consistencyRate: pastConsistencyRate,
      currentStreak: 0, // don't factor streak into delta
    });
    const delta = score - pastScore;

    // Today's tasks
    const todayStart = startOfDay(today);
    const todayEnd = endOfDay(today);
    const { data: todayTasks } = await ctx.db
      .from("tasks")
      .select("status")
      .eq("user_id", userId)
      .gte("due_date", todayStart)
      .lte("due_date", todayEnd);

    const todayTotal = (todayTasks || []).length;
    const todayCompleted = (todayTasks || []).filter(
      (t: any) => t.status === "completed"
    ).length;

    return {
      score,
      tier,
      currentStreak,
      completionRate,
      consistencyRate,
      delta,
      today: { completed: todayCompleted, total: todayTotal },
    };
  }),

  getScoreTrend: protectedProcedure
    .input(
      z.object({
        days: z.enum(["14", "30", "all"]).default("14"),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const today = new Date();
      const numDays = input.days === "all" ? 90 : parseInt(input.days);

      const trend: {
        date: string;
        score: number;
        completed: number;
        total: number;
      }[] = [];

      for (let i = numDays - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);

        const { data: dayTasks } = await ctx.db
          .from("tasks")
          .select("status")
          .eq("user_id", userId)
          .gte("due_date", dayStart)
          .lte("due_date", dayEnd);

        const tasks = dayTasks || [];
        const total = tasks.length;
        const completed = tasks.filter(
          (t: any) => t.status === "completed"
        ).length;

        // Compute a rolling score up to this date
        const windowStart = new Date(date);
        windowStart.setDate(windowStart.getDate() - (WINDOW_DAYS - 1));
        const stats = await getWindowStats(
          ctx.db,
          userId,
          windowStart,
          date
        );
        const cr = computeCompletionRate(stats.total, stats.completed);
        const conr = computeConsistencyRate(stats.activeDays, WINDOW_DAYS);
        const dayScore = computeScore({
          completionRate: cr,
          consistencyRate: conr,
          currentStreak: 0,
        });

        trend.push({ date: dateStr, score: dayScore, completed, total });
      }

      // Best streak (simplified: just return current)
      const currentStreak = await computeStreak(ctx.db, userId, today);

      return { trend, currentStreak };
    }),

  getActivityHeatmap: protectedProcedure
    .input(
      z.object({
        days: z.enum(["14", "30", "all"]).default("14"),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const today = new Date();
      const numDays = input.days === "all" ? 90 : parseInt(input.days);

      const windowStart = new Date(today);
      windowStart.setDate(windowStart.getDate() - (numDays - 1));

      const { data: tasks } = await ctx.db
        .from("tasks")
        .select("status, due_date")
        .eq("user_id", userId)
        .eq("status", "completed")
        .gte("due_date", startOfDay(windowStart))
        .lte("due_date", endOfDay(today));

      // Group by date
      const countByDate: Record<string, number> = {};
      for (const task of tasks || []) {
        const dateStr = new Date(task.due_date).toISOString().split("T")[0];
        countByDate[dateStr] = (countByDate[dateStr] || 0) + 1;
      }

      // Build array for all days in range
      const heatmap: { date: string; count: number }[] = [];
      for (let i = numDays - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split("T")[0];
        heatmap.push({ date: dateStr, count: countByDate[dateStr] || 0 });
      }

      return { heatmap };
    }),
});
```

- [ ] **Step 2: Register the router in `_app.ts`**

In `src/server/trpc/routers/_app.ts`, add the import and register:

```typescript
// Add at the top with other imports:
import { accountabilityScoreRouter } from "./accountabilityScore";

// Add inside the router({}) call:
accountabilityScore: accountabilityScoreRouter,
```

The full file becomes:

```typescript
import { router } from "../context";
import { goalRouter } from "./goal";
import { profileRouter } from "./profile";
import { taskRouter } from "./task";
import { conversationRouter } from "./conversation";
import { notificationRouter } from "./notification";
import { dailyCheckRouter } from "./dailyCheck";
import { weeklyRoastRouter } from "./weeklyRoast";
import { accountabilityScoreRouter } from "./accountabilityScore";

export const appRouter = router({
  goal: goalRouter,
  profile: profileRouter,
  task: taskRouter,
  conversation: conversationRouter,
  notification: notificationRouter,
  dailyCheck: dailyCheckRouter,
  weeklyRoast: weeklyRoastRouter,
  accountabilityScore: accountabilityScoreRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 3: Verify the app builds**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds (or at least no errors from the new router)

- [ ] **Step 4: Commit**

```bash
git add src/server/trpc/routers/accountabilityScore.ts src/server/trpc/routers/_app.ts
git commit -m "feat: add accountability score tRPC router"
```

---

### Task 3: Dashboard Accountability Widget

**Files:**
- Create: `src/components/AccountabilityWidget.tsx`
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Create the AccountabilityWidget component**

```tsx
// src/components/AccountabilityWidget.tsx
"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc/client";

const TIER_COLORS: Record<string, string> = {
  red: "text-red-400",
  orange: "text-orange-400",
  amber: "text-amber-400",
  green: "text-green-400",
  purple: "text-purple-400",
};

const RING_STROKE_COLORS: Record<string, string> = {
  red: "#f87171",
  orange: "#fb923c",
  amber: "#fbbf24",
  green: "#4ade80",
  purple: "#a78bfa",
};

export function AccountabilityWidget() {
  const { user } = useAuth();
  const { data, isLoading } = trpc.accountabilityScore.getScore.useQuery(
    undefined,
    { enabled: !!user }
  );

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="h-24 animate-pulse rounded-lg border border-zinc-200 bg-zinc-900 dark:border-zinc-800" />
    );
  }

  if (!data) return null;

  const { score, tier, currentStreak, delta, today } = data;
  const circumference = 2 * Math.PI * 30;
  const offset = circumference - (score / 100) * circumference;
  const strokeColor = RING_STROKE_COLORS[tier.color] || "#a78bfa";

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-900 p-4 text-white dark:border-zinc-700">
      <div className="flex items-center justify-between">
        {/* Score Ring */}
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16">
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="30"
                fill="none"
                stroke="#27272a"
                strokeWidth="4"
              />
              <circle
                cx="32"
                cy="32"
                r="30"
                fill="none"
                stroke={strokeColor}
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 32 32)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-lg font-bold">
              {score}
            </div>
          </div>
          <div>
            <div
              className={`text-xs font-semibold uppercase tracking-wide ${TIER_COLORS[tier.color] || "text-purple-400"}`}
            >
              {tier.name}
            </div>
            <div className="text-xs text-zinc-400">
              {delta > 0 && (
                <span className="text-green-400">+{delta} from last week</span>
              )}
              {delta < 0 && (
                <span className="text-red-400">{delta} from last week</span>
              )}
              {delta === 0 && <span>No change from last week</span>}
            </div>
          </div>
        </div>

        {/* Streak */}
        <div className="text-center">
          <div className="text-xl font-bold">{currentStreak}</div>
          <div className="text-xs text-amber-400">
            day streak {currentStreak > 0 ? "🔥" : ""}
          </div>
        </div>

        {/* Today's Progress */}
        <div className="text-right">
          <div className="text-xs text-zinc-400">Today</div>
          <div className="text-base font-semibold text-green-400">
            {today.completed}/{today.total} done
          </div>
          <Link
            href="/dashboard/stats"
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            View Stats →
          </Link>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add widget to dashboard page**

In `src/app/dashboard/page.tsx`, add the import at the top:

```typescript
import { AccountabilityWidget } from "@/components/AccountabilityWidget";
```

Then in the `DashboardContent` function, add `<AccountabilityWidget />` as the first child, above `<StoicQuote />`:

```tsx
function DashboardContent() {
  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
      <AccountabilityWidget />
      <StoicQuote />
      <WeeklyRoastCard />

      {shouldShowMorning() && <MorningCheckIn />}
      {shouldShowEvening() && <EveningCheckIn />}

      <TaskList />

      <GoalList />
    </div>
  );
}
```

- [ ] **Step 3: Verify the app builds**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/components/AccountabilityWidget.tsx src/app/dashboard/page.tsx
git commit -m "feat: add accountability widget to dashboard"
```

---

### Task 4: Stats Page

**Files:**
- Create: `src/app/dashboard/stats/page.tsx`

- [ ] **Step 1: Create the stats page**

```tsx
// src/app/dashboard/stats/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc/client";

const TIER_COLORS: Record<string, string> = {
  red: "text-red-400",
  orange: "text-orange-400",
  amber: "text-amber-400",
  green: "text-green-400",
  purple: "text-purple-400",
};

type TimeRange = "14" | "30" | "all";

function ScoreTrendChart({
  trend,
}: {
  trend: { date: string; score: number; completed: number; total: number }[];
}) {
  const maxScore = 100;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <h3 className="mb-4 text-sm font-semibold text-white">Score Trend</h3>
      <div className="flex items-end gap-1" style={{ height: 120 }}>
        {trend.map((day, i) => {
          const height = (day.score / maxScore) * 100;
          const isToday = i === trend.length - 1;
          return (
            <div
              key={day.date}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div
                className={`w-full rounded-t transition-all ${
                  day.score === 0
                    ? "bg-zinc-800"
                    : isToday
                      ? "bg-purple-500"
                      : "bg-purple-500/60"
                }`}
                style={{ height: `${Math.max(height, 2)}%` }}
                title={`${day.date}: Score ${day.score} (${day.completed}/${day.total} tasks)`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-zinc-500">
        <span>{trend[0]?.date.slice(5)}</span>
        <span>{trend[trend.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

function ActivityHeatmap({
  heatmap,
}: {
  heatmap: { date: string; count: number }[];
}) {
  const maxCount = Math.max(...heatmap.map((d) => d.count), 1);

  function getColor(count: number): string {
    if (count === 0) return "bg-zinc-800";
    const ratio = count / maxCount;
    if (ratio > 0.75) return "bg-purple-500";
    if (ratio > 0.5) return "bg-green-400";
    if (ratio > 0.25) return "bg-green-600";
    return "bg-green-800";
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Activity</h3>
      <div className="grid grid-cols-7 gap-1">
        {heatmap.map((day) => (
          <div
            key={day.date}
            className={`aspect-square rounded-sm ${getColor(day.count)}`}
            title={`${day.date}: ${day.count} tasks`}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="h-2.5 w-2.5 rounded-sm bg-zinc-800" />
          <div className="h-2.5 w-2.5 rounded-sm bg-green-800" />
          <div className="h-2.5 w-2.5 rounded-sm bg-green-400" />
          <div className="h-2.5 w-2.5 rounded-sm bg-purple-500" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<TimeRange>("14");

  const { data: scoreData, isLoading: scoreLoading } =
    trpc.accountabilityScore.getScore.useQuery(undefined, {
      enabled: !!user,
    });

  const { data: trendData, isLoading: trendLoading } =
    trpc.accountabilityScore.getScoreTrend.useQuery(
      { days: range },
      { enabled: !!user }
    );

  const { data: heatmapData, isLoading: heatmapLoading } =
    trpc.accountabilityScore.getActivityHeatmap.useQuery(
      { days: range },
      { enabled: !!user }
    );

  const isLoading = scoreLoading || trendLoading || heatmapLoading;

  if (!user) return null;

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">Your Progress</h1>
            <p className="text-xs text-zinc-400">
              Last {range === "all" ? "90" : range} days
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          {(["14", "30", "all"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                range === r
                  ? "bg-purple-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {r === "all" ? "All" : `${r}d`}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-20 animate-pulse rounded-lg bg-zinc-900" />
          <div className="h-40 animate-pulse rounded-lg bg-zinc-900" />
          <div className="h-32 animate-pulse rounded-lg bg-zinc-900" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {scoreData && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-center">
                <div
                  className={`text-2xl font-bold ${TIER_COLORS[scoreData.tier.color] || "text-purple-400"}`}
                >
                  {scoreData.score}
                </div>
                <div className="text-xs text-zinc-400">Score</div>
                {scoreData.delta !== 0 && (
                  <div
                    className={`text-[10px] ${scoreData.delta > 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {scoreData.delta > 0 ? "↑" : "↓"} {Math.abs(scoreData.delta)}
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-center">
                <div className="text-2xl font-bold text-amber-400">
                  {scoreData.currentStreak}
                </div>
                <div className="text-xs text-zinc-400">Day Streak</div>
                {trendData && (
                  <div className="text-[10px] text-zinc-500">
                    Best: {trendData.currentStreak}
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {scoreData.completionRate}%
                </div>
                <div className="text-xs text-zinc-400">Completion</div>
              </div>
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {Math.round(scoreData.consistencyRate)}%
                </div>
                <div className="text-xs text-zinc-400">Consistency</div>
              </div>
            </div>
          )}

          {/* Score Trend */}
          {trendData && <ScoreTrendChart trend={trendData.trend} />}

          {/* Activity Heatmap */}
          {heatmapData && <ActivityHeatmap heatmap={heatmapData.heatmap} />}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the app builds**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/stats/page.tsx
git commit -m "feat: add accountability stats page"
```

---

### Task 5: AI Context Injection

**Files:**
- Modify: `src/lib/prompts/weekly-roast-prompt.ts`
- Modify: `src/app/api/cron/weekly-roast/route.ts`
- Modify: `src/lib/ai/tools.ts`

- [ ] **Step 1: Update the weekly roast prompt**

In `src/lib/prompts/weekly-roast-prompt.ts`, add score context to the prompt. Replace the existing `WEEKLY_ROAST_PROMPT` export with:

```typescript
export const WEEKLY_ROAST_PROMPT = `
You are GrindProof's accountability coach generating a Weekly Roast Report.

Based on the user's weekly data, generate a brutally honest but supportive assessment.

Provide insights as JSON with these fields:
- insights: Array of 3-5 key observations, each with:
  - emoji: Single emoji representing the insight
  - text: Concise observation (50-80 chars)
  - severity: 'high' (problem), 'medium' (warning), or 'positive' (win)
- recommendations: Array of 2-3 specific actions to improve next week (50-100 chars each)
- weekSummary: One sentence summary of their week (100-150 chars)

Focus on:
1. Actual vs planned (Did they do what they said?)
2. Pattern detection (What keeps happening?)
3. Real progress vs busy work
4. Evidence quality (Are they proving it?)
5. New project addiction (Starting more than finishing?)
6. Reflection analysis (What excuses are they making? Are they recurring?)
   - Look at their reflections for incomplete tasks
   - Call out if the same excuses appear multiple times
   - Identify if excuses are valid or self-sabotage patterns
   - Compare their stated reasons with actual behavior patterns
7. Accountability Score analysis:
   - Reference their current score and tier
   - Comment on score trend (improving, declining, stagnant)
   - If streak is long, acknowledge it; if broken recently, call it out
   - Tie the score into your overall assessment

Reflection Guidelines:
- If you see "distracted" more than once, call it out as a focus problem
- If you see "underestimated time" repeatedly, they're bad at planning
- If "tired/exhausted" appears often, they're overcommitting
- If "priorities changed" is common, they lack commitment
- Give credit for honest, specific reflections vs vague excuses

Be direct but supportive. Call out BS, celebrate real wins, and don't let them hide behind excuses.

Return ONLY valid JSON in this format:
{
  "insights": [
    {
      "emoji": "💻",
      "text": "Planned AI work 5x → Did it 1x",
      "severity": "high"
    }
  ],
  "recommendations": [
    "Finish one existing goal before starting a new one",
    "Set realistic daily task limits (you're overcommitting)"
  ],
  "weekSummary": "Mixed week: good intentions, but execution didn't match the plan."
}
`;
```

- [ ] **Step 2: Pass score data in the weekly roast cron route**

In `src/app/api/cron/weekly-roast/route.ts`, add the score computation. Add this import at the top:

```typescript
import {
  computeCompletionRate,
  computeConsistencyRate,
  computeScore,
  getTier,
} from "@/lib/accountability";
```

Then, inside the `for` loop, after the `weekData` string is built (after line 88), add accountability score context before the AI generation call:

```typescript
      // Compute accountability score for context
      const windowStart14 = new Date(now);
      windowStart14.setDate(windowStart14.getDate() - 13);
      
      // Count active days in the 14-day window
      const { data: recentTasks } = await supabase
        .from("tasks")
        .select("status, due_date")
        .eq("user_id", setting.user_id)
        .gte("due_date", windowStart14.toISOString())
        .lte("due_date", now.toISOString());

      const recentAll = recentTasks || [];
      const recentCompleted = recentAll.filter((t) => t.status === "completed").length;
      const activeDaysSet = new Set(
        recentAll
          .filter((t) => t.status === "completed")
          .map((t) => new Date(t.due_date).toISOString().split("T")[0])
      );

      const cr = computeCompletionRate(recentAll.length, recentCompleted);
      const conr = computeConsistencyRate(activeDaysSet.size, 14);
      const accountScore = computeScore({ completionRate: cr, consistencyRate: conr, currentStreak: 0 });
      const accountTier = getTier(accountScore);

      const scoreContext = `
Accountability Score: ${accountScore}/100 (Tier: ${accountTier.name})
Completion Rate (14d): ${cr}%
Consistency Rate (14d): ${Math.round(conr)}%
Active Days (14d): ${activeDaysSet.size}/14
      `.trim();
```

Then update the `prompt` in the `generateText` call to include the score context:

```typescript
      const { output: roast } = await generateText({
        model: google(env.AI_MODEL),
        system: WEEKLY_ROAST_PROMPT,
        prompt: weekData + "\n\n" + scoreContext,
        output: Output.object({ schema: roastSchema }),
      });
```

- [ ] **Step 3: Add `get_accountability_score` tool to AI tools**

In `src/lib/ai/tools.ts`, add a new tool inside the `createGrindproofTools` return object, after `list_goals`:

```typescript
    get_accountability_score: tool({
      description:
        "Get the user's current accountability score, tier, streak, and performance metrics. Use when the user asks about their progress, performance, or score.",
      inputSchema: z.object({}),
      execute: async () => {
        const now = new Date();
        const windowStart = new Date(now);
        windowStart.setDate(windowStart.getDate() - 13);

        const { data: tasks } = await supabase
          .from("tasks")
          .select("status, due_date")
          .eq("user_id", userId)
          .gte("due_date", windowStart.toISOString())
          .lte("due_date", now.toISOString());

        const allTasks = tasks || [];
        const total = allTasks.length;
        const completed = allTasks.filter((t) => t.status === "completed").length;
        const activeDaysSet = new Set(
          allTasks
            .filter((t) => t.status === "completed")
            .map((t) => new Date(t.due_date).toISOString().split("T")[0])
        );

        const completionRate = computeCompletionRate(total, completed);
        const consistencyRate = computeConsistencyRate(activeDaysSet.size, 14);
        const score = computeScore({
          completionRate,
          consistencyRate,
          currentStreak: 0,
        });
        const tier = getTier(score);

        return {
          success: true as const,
          score,
          tier: tier.name,
          completionRate,
          consistencyRate: Math.round(consistencyRate),
          activeDays: activeDaysSet.size,
          windowDays: 14,
        };
      },
    }),
```

Also add the import at the top of `src/lib/ai/tools.ts`:

```typescript
import {
  computeCompletionRate,
  computeConsistencyRate,
  computeScore,
  getTier,
} from "@/lib/accountability";
```

- [ ] **Step 4: Verify the app builds**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/lib/prompts/weekly-roast-prompt.ts src/app/api/cron/weekly-roast/route.ts src/lib/ai/tools.ts
git commit -m "feat: inject accountability score into weekly roast and AI coach"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 2: Run the build**

Run: `npx next build 2>&1 | tail -30`
Expected: Build succeeds with no errors

- [ ] **Step 3: Manual smoke test**

Start dev server: `npm run dev`

Verify:
1. Dashboard shows the accountability widget at the top (score ring, streak, today's progress)
2. "View Stats →" link navigates to `/dashboard/stats`
3. Stats page shows summary cards, score trend chart, and activity heatmap
4. Time range toggle (14d / 30d / All) switches the data
5. Back arrow returns to dashboard

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address any issues found during smoke test"
```
