/**
 * QA-ONLY tRPC mock link.
 *
 * Renders the real dashboard components with deterministic fixture data so a
 * design review can inspect actual pixels without authenticating against the
 * hosted Supabase project. Activated only when NEXT_PUBLIC_QA_MOCK === "1".
 *
 * Scenario is chosen with the `qa` query param: ?qa=full (default) | empty.
 */

import { observable } from "@trpc/server/observable";
import type { TRPCLink } from "@trpc/client";

function scenario(): string {
  if (typeof window === "undefined") return "full";
  return new URLSearchParams(window.location.search).get("qa") || "full";
}

// Anchored to the current day so "today's tasks" fixtures never go stale.
const now = (() => {
  const d = new Date();
  d.setHours(9, 15, 0, 0);
  return d;
})();

function at(h: number, m = 0) {
  const d = new Date(now);
  d.setHours(h, m, 0, 0);
  return d;
}

function daysAgo(n: number) {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d;
}

const GOALS = [
  {
    id: "g1",
    userId: "u1",
    title: "Ship GrindProof v1 to 100 paying users",
    description: "Public launch, billing live, first cohort onboarded.",
    status: "active" as const,
    priority: "high" as const,
    taskTotal: 42,
    taskCompleted: 27,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(1),
  },
  {
    id: "g2",
    userId: "u1",
    title: "Run a sub-40 10K",
    description: "Base building block, then speed work.",
    status: "active" as const,
    priority: "medium" as const,
    taskTotal: 18,
    taskCompleted: 11,
    createdAt: daysAgo(45),
    updatedAt: daysAgo(2),
  },
  {
    id: "g3",
    userId: "u1",
    title: "Read 24 books this year",
    description: null,
    status: "active" as const,
    priority: "low" as const,
    taskTotal: 24,
    taskCompleted: 9,
    createdAt: daysAgo(120),
    updatedAt: daysAgo(5),
  },
];

const TASKS = [
  {
    id: "t1",
    userId: "u1",
    goalId: "g1",
    title: "Fix the goal progress counter on the dashboard",
    description: "Counting off a capped page undercounts goals.",
    dueDate: at(9),
    startTime: at(9),
    endTime: at(10, 30),
    priority: "high" as const,
    status: "completed" as const,
    tags: ["eng"],
    reflection: null,
    recurrencePattern: null,
    createdAt: daysAgo(1),
    updatedAt: now,
  },
  {
    id: "t2",
    userId: "u1",
    goalId: "g1",
    title: "Write launch email to the waitlist",
    description: null,
    dueDate: at(11),
    startTime: at(11),
    endTime: at(12),
    priority: "high" as const,
    status: "pending" as const,
    tags: ["growth"],
    reflection: null,
    recurrencePattern: null,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "t3",
    userId: "u1",
    goalId: "g2",
    title: "Easy 8K recovery run",
    description: null,
    dueDate: at(18),
    startTime: at(18),
    endTime: at(19),
    priority: "medium" as const,
    status: "pending" as const,
    tags: ["health"],
    reflection: null,
    recurrencePattern: null,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  {
    id: "t4",
    userId: "u1",
    goalId: null,
    title: "Review the Q3 accountability metrics doc that finance sent over",
    description: null,
    dueDate: at(15),
    startTime: null,
    endTime: null,
    priority: "low" as const,
    status: "pending" as const,
    tags: null,
    reflection: null,
    recurrencePattern: null,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    id: "t5",
    userId: "u1",
    goalId: "g3",
    title: "Read 30 pages of Meditations",
    description: null,
    dueDate: at(21),
    startTime: null,
    endTime: null,
    priority: "low" as const,
    status: "skipped" as const,
    tags: null,
    reflection: "Fell asleep.",
    recurrencePattern: null,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];

const TREND = Array.from({ length: 14 }, (_, i) => {
  const d = daysAgo(13 - i);
  const iso = d.toISOString().slice(0, 10);
  const scores = [41, 44, 40, 52, 58, 55, 61, 64, 60, 66, 71, 68, 72, 68];
  return {
    date: iso,
    score: scores[i],
    completed: i === 13 ? 1 : 2,
    total: i === 13 ? 3 : 3,
    active: i !== 2 && i !== 8,
  };
});

function fullFixtures(): Record<string, unknown> {
  return {
    "profile.getSetupState": { setupState: "completed" },
    "profile.getCurrent": {
      id: "u1",
      email: "you@example.com",
      timezone: "Africa/Lagos",
      displayName: "Alfred",
      createdAt: daysAgo(60),
    },
    "retention.getReentryState": {
      shouldShowReentry: false,
      isReturningFromBadWeek: false,
      daysSinceLastActive: 0,
    },
    "accountabilityScore.getScore": {
      score: 68,
      tier: { name: "Grinding", color: "amber" },
      currentStreak: 6,
      streak: 6,
      delta: -4,
      today: { completed: 1, total: 3 },
      drivers: {
        top: "6-day streak and a 74% completion rate on high-priority tasks",
        drag: "three evening tasks skipped in the last week",
      },
      localDate: now.toISOString().slice(0, 10),
      active: true,
      timezone: "Africa/Lagos",
    },
    "accountabilityScore.getScoreTrend": { trend: TREND, currentStreak: 6 },
    "accountabilityScore.getActivityHeatmap": {
      heatmap: TREND.map((t) => ({ date: t.date, value: t.active ? 0.7 : 0 })),
    },
    "accountabilityScore.getRecentEvents": { events: [] },
    "weeklyRoast.getLatest": {
      id: "r1",
      createdAt: daysAgo(2),
      roastData: {
        weekSummary:
          "You planned fourteen things and finished eight. Every single one you dropped was scheduled after 6pm, which means your evenings are where your plans go to die.",
        insights: [
          {
            text: "High-priority work shipped at 86% — your mornings are working.",
            severity: "positive",
          },
          {
            text: "Every skipped task this week was scheduled after 6pm.",
            severity: "high",
          },
          {
            text: "You rescheduled 'Read 30 pages' four times.",
            severity: "medium",
          },
        ],
        recommendations: [
          "Move the reading block to 7am, before the day gets a vote.",
          "Cap evening commitments at one task until you close two full weeks.",
        ],
      },
      taskStats: { completionRate: 57, completed: 8, total: 14, skipped: 3 },
    },
    "dailyCheck.getMorningSchedule": {
      alreadySubmitted: false,
      yesterdayIncomplete: [
        { id: "y1", title: "Draft the pricing page copy", priority: "high" },
        { id: "y2", title: "Read 30 pages of Meditations", priority: "low" },
      ],
      todayTasks: TASKS.filter((t) => t.status !== "skipped").map((t) => ({
        id: t.id,
        title: t.title,
        startTime: t.startTime,
        priority: t.priority,
      })),
    },
    "dailyCheck.getEveningSchedule": {
      alreadySubmitted: false,
      todayTasks: TASKS.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
      })),
    },
    "task.getAll": TASKS,
    "goal.getAll": GOALS,
    "notification.getSettings": {
      pushEnabled: true,
      morningTime: "07:00",
      eveningTime: "21:00",
    },
    "mcpToken.list": [],
  };
}

function emptyFixtures(): Record<string, unknown> {
  const full = fullFixtures();
  return {
    ...full,
    "accountabilityScore.getScore": {
      score: 0,
      tier: { name: "Slacking", color: "red" },
      currentStreak: 0,
      streak: 0,
      delta: 0,
      today: { completed: 0, total: 0 },
      drivers: { top: "Nothing yet", drag: null },
      localDate: now.toISOString().slice(0, 10),
      active: false,
      timezone: "Africa/Lagos",
    },
    "accountabilityScore.getScoreTrend": {
      trend: TREND.map((t) => ({ ...t, score: 0, active: false })),
      currentStreak: 0,
    },
    "weeklyRoast.getLatest": null,
    "task.getAll": [],
    "goal.getAll": [],
    "dailyCheck.getMorningSchedule": {
      alreadySubmitted: false,
      yesterdayIncomplete: [],
      todayTasks: [],
    },
  };
}

function resolve(path: string): unknown {
  const table = scenario() === "empty" ? emptyFixtures() : fullFixtures();
  if (path in table) return table[path];
  // Unknown query: return null so components fall through to empty states
  // instead of hanging in a permanent skeleton.
  return null;
}

export const qaMockLink: TRPCLink<any> =
  () =>
  ({ op }) =>
    observable((observer) => {
      // Mutations resolve to null; this harness is for visual review only.
      const data = op.type === "query" ? resolve(op.path) : null;
      observer.next({ result: { type: "data", data } });
      observer.complete();
    });
