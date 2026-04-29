import { describe, it, expect } from "vitest";
import { formatCoachContext, generateAlerts } from "@/lib/ai/context";

describe("generateAlerts", () => {
  it("returns empty array when no issues", () => {
    const alerts = generateAlerts({
      score: 75, delta: 2, currentStreak: 5, previousStreak: 4,
      overdueTasks: [], chronicCarryOvers: [], activeCommitmentsPastDue: [], goalsUnder50: 0,
    });
    expect(alerts).toEqual([]);
  });

  it("alerts on score drop >= 10", () => {
    const alerts = generateAlerts({
      score: 60, delta: -12, currentStreak: 5, previousStreak: 5,
      overdueTasks: [], chronicCarryOvers: [], activeCommitmentsPastDue: [], goalsUnder50: 0,
    });
    expect(alerts.some(a => a.includes("Score dropped"))).toBe(true);
  });

  it("alerts on broken streak", () => {
    const alerts = generateAlerts({
      score: 70, delta: 0, currentStreak: 0, previousStreak: 5,
      overdueTasks: [], chronicCarryOvers: [], activeCommitmentsPastDue: [], goalsUnder50: 0,
    });
    expect(alerts.some(a => a.includes("Streak broken"))).toBe(true);
  });

  it("alerts on 3+ overdue tasks", () => {
    const alerts = generateAlerts({
      score: 70, delta: 0, currentStreak: 3, previousStreak: 3,
      overdueTasks: [{ title: "A" }, { title: "B" }, { title: "C" }],
      chronicCarryOvers: [], activeCommitmentsPastDue: [], goalsUnder50: 0,
    });
    expect(alerts.some(a => a.includes("3 tasks overdue"))).toBe(true);
  });

  it("alerts on chronic carry-overs", () => {
    const alerts = generateAlerts({
      score: 70, delta: 0, currentStreak: 3, previousStreak: 3,
      overdueTasks: [],
      chronicCarryOvers: [{ title: "Design homepage", carryOverCount: 5 }],
      activeCommitmentsPastDue: [], goalsUnder50: 0,
    });
    expect(alerts.some(a => a.includes("Design homepage"))).toBe(true);
  });

  it("alerts on 5+ goals under 50%", () => {
    const alerts = generateAlerts({
      score: 70, delta: 0, currentStreak: 3, previousStreak: 3,
      overdueTasks: [], chronicCarryOvers: [], activeCommitmentsPastDue: [], goalsUnder50: 6,
    });
    expect(alerts.some(a => a.includes("6 active goals under 50%"))).toBe(true);
  });
});

describe("formatCoachContext", () => {
  it("includes all sections", () => {
    const ctx = formatCoachContext({
      alerts: ["ALERT: Score dropped from 72 to 61"],
      score: 61, tierName: "Grinding", streak: 3,
      completionRate: 58, consistencyRate: 43, delta: -11,
      todayTasks: [{ title: "Fix auth bug", status: "pending", priority: "high", dueDate: "2026-04-16", isOverdue: false }],
      activeGoals: [{ title: "Ship v2", completed: 6, total: 10 }],
      coachMemory: [{ category: "commitment", content: "Finish auth by Friday", createdAt: "2026-04-14T10:00:00Z" }],
      drivers: { top: "3-day streak", drag: "\"Fix auth bug\" carried 3×" },
    });
    expect(ctx).toContain("=== CURRENT USER CONTEXT ===");
    expect(ctx).toContain("ALERTS:");
    expect(ctx).toContain("Score dropped");
    expect(ctx).toContain("61/100");
    expect(ctx).toContain("Fix auth bug");
    expect(ctx).toContain("Ship v2");
    expect(ctx).toContain("Finish auth by Friday");
    expect(ctx).toContain("Driver: 3-day streak");
    expect(ctx).toContain("=== END CONTEXT ===");
  });

  it("omits ALERTS section when no alerts", () => {
    const ctx = formatCoachContext({
      alerts: [], score: 75, tierName: "Locked In", streak: 5,
      completionRate: 80, consistencyRate: 60, delta: 3,
      todayTasks: [], activeGoals: [], coachMemory: [],
      drivers: { top: "5-day streak", drag: null },
    });
    expect(ctx).not.toContain("ALERTS:");
  });
});
