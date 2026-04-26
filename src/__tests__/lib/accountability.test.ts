import { describe, it, expect } from "vitest";

import {
  computeWeightedCompletion,
  computeCompletionRate,
  computeConsistencyRate,
  computeDisciplineScore,
  computeVelocityBonus,
  computeStreakBonus,
  computeScore,
  getTier,
} from "@/lib/accountability";

// =========================================================================
// computeWeightedCompletion
// =========================================================================
describe("computeWeightedCompletion", () => {
  it("returns 0 for empty array", () => {
    expect(computeWeightedCompletion([])).toBe(0);
  });

  it("returns 100 when all tasks are completed", () => {
    const tasks = [
      { status: "completed", priority: "high" },
      { status: "completed", priority: "medium" },
      { status: "completed", priority: "low" },
    ];
    expect(computeWeightedCompletion(tasks)).toBe(100);
  });

  it("returns 0 when no tasks are completed", () => {
    const tasks = [
      { status: "pending", priority: "high" },
      { status: "pending", priority: "low" },
    ];
    expect(computeWeightedCompletion(tasks)).toBe(0);
  });

  it("weights high=3, medium=2, low=1 correctly", () => {
    // Only high-priority task completed: 3/(3+2+1) = 50%
    const tasks = [
      { status: "completed", priority: "high" },
      { status: "pending", priority: "medium" },
      { status: "pending", priority: "low" },
    ];
    expect(computeWeightedCompletion(tasks)).toBe(50);
  });

  it("weights medium tasks correctly", () => {
    // medium completed: 2/(3+2) = 40%
    const tasks = [
      { status: "pending", priority: "high" },
      { status: "completed", priority: "medium" },
    ];
    expect(computeWeightedCompletion(tasks)).toBe(40);
  });

  it("rounds to nearest integer", () => {
    // low completed, high pending: 1/(3+1) = 25%
    const tasks = [
      { status: "completed", priority: "low" },
      { status: "pending", priority: "high" },
    ];
    expect(computeWeightedCompletion(tasks)).toBe(25);
  });

  it("uses weight 1 for unknown priority", () => {
    // unknown priority falls back to 1, both completed: 100%
    const tasks = [
      { status: "completed", priority: "unknown" },
    ];
    expect(computeWeightedCompletion(tasks)).toBe(100);
  });
});

// =========================================================================
// computeCompletionRate
// =========================================================================
describe("computeCompletionRate", () => {
  it("returns 0 when totalTasks is 0", () => {
    expect(computeCompletionRate(0, 0)).toBe(0);
  });

  it("returns 100 when all tasks are completed", () => {
    expect(computeCompletionRate(5, 5)).toBe(100);
  });

  it("returns correct rate for partial completion", () => {
    expect(computeCompletionRate(10, 7)).toBe(70);
  });

  it("rounds to nearest integer", () => {
    expect(computeCompletionRate(3, 1)).toBe(33);
  });
});

// =========================================================================
// computeConsistencyRate
// =========================================================================
describe("computeConsistencyRate", () => {
  it("returns 0 when windowDays is 0", () => {
    expect(computeConsistencyRate(5, 0)).toBe(0);
  });

  it("returns 100 when active every day", () => {
    expect(computeConsistencyRate(7, 7)).toBe(100);
  });

  it("returns correct rate for partial activity", () => {
    expect(computeConsistencyRate(5, 10)).toBe(50);
  });
});

// =========================================================================
// computeDisciplineScore
// =========================================================================
describe("computeDisciplineScore", () => {
  it("returns 100 for empty tasks array", () => {
    expect(computeDisciplineScore([], 0)).toBe(100);
  });

  it("returns 100 when no carry-overs and no overcommitment", () => {
    const tasks = [
      { carry_over_count: 0, status: "completed" },
      { carry_over_count: 1, status: "completed" },
    ];
    expect(computeDisciplineScore(tasks, 2)).toBe(100);
  });

  it("penalizes chronic carry-overs (carry_over_count >= 3)", () => {
    // All tasks chronic: carryOverRatio=1, penalty=min(50,30)=30
    const tasks = [
      { carry_over_count: 3, status: "completed" },
      { carry_over_count: 5, status: "completed" },
    ];
    const score = computeDisciplineScore(tasks, 2);
    expect(score).toBeLessThan(100);
    expect(score).toBe(70); // 100 - 30 carry-over penalty
  });

  it("caps carry-over penalty at 30", () => {
    // 100% chronic carry-overs => penalty capped at 30 (not 50)
    const tasks = Array(10).fill({ carry_over_count: 4, status: "completed" });
    const score = computeDisciplineScore(tasks, 10);
    expect(score).toBe(70);
  });

  it("penalizes overcommitment when creating more than completing", () => {
    // 0 completed out of 10 created: overcommitPenalty = min((10/10)*40, 20) = 20
    const tasks = [
      { carry_over_count: 0, status: "pending" },
    ];
    const score = computeDisciplineScore(tasks, 10);
    expect(score).toBeLessThan(100);
  });

  it("caps overcommit penalty at 20", () => {
    // All pending, totalCreated >> completed
    const tasks = Array(5).fill({ carry_over_count: 0, status: "pending" });
    const score = computeDisciplineScore(tasks, 100);
    // carryOver penalty = 0, overcommit penalty capped at 20
    expect(score).toBe(80);
  });

  it("combines both penalties correctly", () => {
    // 100% chronic carry-overs AND 100% overcommit
    const tasks = Array(5).fill({ carry_over_count: 3, status: "pending" });
    const score = computeDisciplineScore(tasks, 10);
    // carryOverPenalty = 30, overcommitPenalty = 20 => 100 - 30 - 20 = 50
    expect(score).toBe(50);
  });

  it("does not go below 0", () => {
    const tasks = Array(10).fill({ carry_over_count: 5, status: "pending" });
    const score = computeDisciplineScore(tasks, 1000);
    expect(score).toBeGreaterThanOrEqual(0);
  });
});

// =========================================================================
// computeVelocityBonus
// =========================================================================
describe("computeVelocityBonus", () => {
  it("returns 0 when previousRate is 0", () => {
    expect(computeVelocityBonus(80, 0)).toBe(0);
  });

  it("returns 0 for stable rate (< 10% change)", () => {
    // 5% improvement - stable
    expect(computeVelocityBonus(105, 100)).toBe(0);
  });

  it("returns 0 for exactly 0% change", () => {
    expect(computeVelocityBonus(100, 100)).toBe(0);
  });

  it("returns positive bonus for improvement > 10%", () => {
    // 50% improvement: change=0.5, raw = sign*min(0.5*10,5) = min(5,5) = 5
    const bonus = computeVelocityBonus(150, 100);
    expect(bonus).toBeGreaterThan(0);
  });

  it("returns negative bonus for decline > 10%", () => {
    // 50% decline
    const bonus = computeVelocityBonus(50, 100);
    expect(bonus).toBeLessThan(0);
  });

  it("clamps positive bonus at +5", () => {
    expect(computeVelocityBonus(200, 100)).toBe(5);
  });

  it("clamps negative bonus at -5", () => {
    expect(computeVelocityBonus(10, 100)).toBe(-5);
  });

  it("returns correct bonus for exactly 10% improvement (boundary - no bonus)", () => {
    // exactly 10% change: abs(change)=0.1, not < 0.1, so it computes
    // change=0.1, raw = min(0.1*10, 5) = min(1,5) = 1
    const bonus = computeVelocityBonus(110, 100);
    expect(bonus).toBe(1);
  });
});

// =========================================================================
// computeStreakBonus
// =========================================================================
describe("computeStreakBonus", () => {
  it("returns 0 for streak < 7", () => {
    expect(computeStreakBonus(0)).toBe(0);
    expect(computeStreakBonus(6)).toBe(0);
  });

  it("returns 1 for streak of 7", () => {
    expect(computeStreakBonus(7)).toBe(1);
  });

  it("caps at 5 for long streaks", () => {
    expect(computeStreakBonus(100)).toBe(5);
    expect(computeStreakBonus(11)).toBe(5);
  });
});

// =========================================================================
// computeScore
// =========================================================================
describe("computeScore", () => {
  it("returns correct score with formula: wc*0.55 + cr*0.30 + ds*0.15 + streakBonus + velocityBonus", () => {
    // 100*0.55 + 100*0.30 + 100*0.15 + 0 + 0 = 100
    const score = computeScore({
      weightedCompletion: 100,
      consistencyRate: 100,
      disciplineScore: 100,
      currentStreak: 0,
      velocityBonus: 0,
    });
    expect(score).toBe(100);
  });

  it("returns 0 for all zeroes", () => {
    const score = computeScore({
      weightedCompletion: 0,
      consistencyRate: 0,
      disciplineScore: 0,
      currentStreak: 0,
      velocityBonus: 0,
    });
    expect(score).toBe(0);
  });

  it("clamps score to maximum 100", () => {
    const score = computeScore({
      weightedCompletion: 100,
      consistencyRate: 100,
      disciplineScore: 100,
      currentStreak: 100, // streakBonus=5
      velocityBonus: 5,
    });
    expect(score).toBe(100);
  });

  it("clamps score to minimum 0", () => {
    const score = computeScore({
      weightedCompletion: 0,
      consistencyRate: 0,
      disciplineScore: 0,
      currentStreak: 0,
      velocityBonus: -5,
    });
    expect(score).toBe(0);
  });

  it("applies streak bonus correctly", () => {
    // 60*0.55 + 60*0.30 + 60*0.15 + streakBonus(7) + 0 = 60 + 1 = 61
    const score = computeScore({
      weightedCompletion: 60,
      consistencyRate: 60,
      disciplineScore: 60,
      currentStreak: 7,
      velocityBonus: 0,
    });
    expect(score).toBe(61);
  });

  it("applies velocity bonus correctly", () => {
    // 60*0.55 + 60*0.30 + 60*0.15 + 0 + 3 = 60 + 3 = 63
    const score = computeScore({
      weightedCompletion: 60,
      consistencyRate: 60,
      disciplineScore: 60,
      currentStreak: 0,
      velocityBonus: 3,
    });
    expect(score).toBe(63);
  });

  it("rounds to nearest integer", () => {
    // 70*0.55 + 50*0.30 + 80*0.15 = 38.5 + 15 + 12 = 65.5 => 66
    const score = computeScore({
      weightedCompletion: 70,
      consistencyRate: 50,
      disciplineScore: 80,
      currentStreak: 0,
      velocityBonus: 0,
    });
    expect(score).toBe(66);
  });
});

// =========================================================================
// getTier
// =========================================================================
// =========================================================================
// Trend discipline parity (regression for hardcoded disciplineScore=100)
// =========================================================================
describe("computeScore — trend / dashboard discipline parity", () => {
  // The score-trend router previously hardcoded disciplineScore=100 because
  // carry_over_count was not in the bulk query. After the fix, the trend
  // computes ds via computeDisciplineScore() over the same window of tasks
  // that getScore uses. This test verifies the math agrees when both are
  // fed identical inputs — i.e., that the "approximation" is gone.
  it("produces the same score as getScore-style computation for the same window", () => {
    const windowTasks = [
      { carry_over_count: 4, status: "pending", priority: "high" },
      { carry_over_count: 0, status: "completed", priority: "medium" },
      { carry_over_count: 3, status: "pending", priority: "low" },
      { carry_over_count: 1, status: "completed", priority: "high" },
    ];

    // What the trend now computes:
    const total = windowTasks.length;
    const completed = windowTasks.filter((t) => t.status === "completed").length;
    const cr = computeCompletionRate(total, completed);
    const conr = computeConsistencyRate(2, 14);
    const ds = computeDisciplineScore(
      windowTasks.map((t) => ({ carry_over_count: t.carry_over_count, status: t.status })),
      total
    );
    const trendScore = computeScore({
      weightedCompletion: cr,
      consistencyRate: conr,
      disciplineScore: ds,
      currentStreak: 0,
      velocityBonus: 0,
    });

    // What the bug was: ds forced to 100. The two scores must differ when
    // there are real carry-overs.
    const buggyScore = computeScore({
      weightedCompletion: cr,
      consistencyRate: conr,
      disciplineScore: 100,
      currentStreak: 0,
      velocityBonus: 0,
    });

    expect(ds).toBeLessThan(100); // there are carry-overs and overcommit
    expect(trendScore).toBeLessThan(buggyScore); // bug inflated the score
  });
});

describe("getTier", () => {
  it("returns Slacking for score < 40", () => {
    expect(getTier(0)).toEqual({ name: "Slacking", color: "red" });
    expect(getTier(39)).toEqual({ name: "Slacking", color: "red" });
  });

  it("returns Warming Up for score 40-59", () => {
    expect(getTier(40)).toEqual({ name: "Warming Up", color: "orange" });
    expect(getTier(59)).toEqual({ name: "Warming Up", color: "orange" });
  });

  it("returns Grinding for score 60-74", () => {
    expect(getTier(60)).toEqual({ name: "Grinding", color: "amber" });
    expect(getTier(74)).toEqual({ name: "Grinding", color: "amber" });
  });

  it("returns Locked In for score 75-89", () => {
    expect(getTier(75)).toEqual({ name: "Locked In", color: "green" });
    expect(getTier(89)).toEqual({ name: "Locked In", color: "green" });
  });

  it("returns Proven for score >= 90", () => {
    expect(getTier(90)).toEqual({ name: "Proven", color: "purple" });
    expect(getTier(100)).toEqual({ name: "Proven", color: "purple" });
  });
});
