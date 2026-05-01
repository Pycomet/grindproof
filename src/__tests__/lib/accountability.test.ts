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
  getTierWithHysteresis,
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
    const tasks = [
      { status: "completed", priority: "high" },
      { status: "pending", priority: "medium" },
      { status: "pending", priority: "low" },
    ];
    expect(computeWeightedCompletion(tasks)).toBe(50);
  });

  it("weights medium tasks correctly", () => {
    const tasks = [
      { status: "pending", priority: "high" },
      { status: "completed", priority: "medium" },
    ];
    expect(computeWeightedCompletion(tasks)).toBe(40);
  });

  it("rounds to nearest integer", () => {
    const tasks = [
      { status: "completed", priority: "low" },
      { status: "pending", priority: "high" },
    ];
    expect(computeWeightedCompletion(tasks)).toBe(25);
  });

  it("uses weight 1 for unknown priority", () => {
    const tasks = [{ status: "completed", priority: "unknown" }];
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
// computeDisciplineScore — chronic-carry-over only (overcommit branch
// removed; it was algebraically a duplicate of weightedCompletion's penalty)
// =========================================================================
describe("computeDisciplineScore", () => {
  it("returns 100 for empty tasks array", () => {
    expect(computeDisciplineScore([])).toBe(100);
  });

  it("returns 100 when no chronic carry-overs", () => {
    const tasks = [
      { carry_over_count: 0, status: "completed" },
      { carry_over_count: 1, status: "completed" },
      { carry_over_count: 2, status: "pending" },
    ];
    expect(computeDisciplineScore(tasks)).toBe(100);
  });

  it("penalizes chronic carry-overs (carry_over_count >= 3)", () => {
    const tasks = [
      { carry_over_count: 3, status: "completed" },
      { carry_over_count: 5, status: "completed" },
    ];
    expect(computeDisciplineScore(tasks)).toBe(70);
  });

  it("caps carry-over penalty at 30", () => {
    const tasks = Array(10).fill({ carry_over_count: 4, status: "completed" });
    expect(computeDisciplineScore(tasks)).toBe(70);
  });

  it("does not change when overcommit-style inputs are given", () => {
    // Previous formula penalized "lots of pending tasks". Now this only
    // matters if those pending tasks are also chronic carry-overs.
    const tasks = Array(5).fill({ carry_over_count: 0, status: "pending" });
    expect(computeDisciplineScore(tasks)).toBe(100);
  });

  it("does not go below 0", () => {
    const tasks = Array(10).fill({ carry_over_count: 5, status: "pending" });
    expect(computeDisciplineScore(tasks)).toBeGreaterThanOrEqual(0);
  });

  it("ignores the legacy second argument", () => {
    const tasks = [{ carry_over_count: 3, status: "pending" }];
    expect(computeDisciplineScore(tasks, 999)).toBe(computeDisciplineScore(tasks));
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
    expect(computeVelocityBonus(105, 100)).toBe(0);
  });

  it("returns 0 for exactly 0% change", () => {
    expect(computeVelocityBonus(100, 100)).toBe(0);
  });

  it("returns positive bonus for improvement > 10%", () => {
    const bonus = computeVelocityBonus(150, 100);
    expect(bonus).toBeGreaterThan(0);
  });

  it("returns negative bonus for decline > 10%", () => {
    const bonus = computeVelocityBonus(50, 100);
    expect(bonus).toBeLessThan(0);
  });

  it("clamps positive bonus at +5", () => {
    expect(computeVelocityBonus(200, 100)).toBe(5);
  });

  it("clamps negative bonus at -5", () => {
    expect(computeVelocityBonus(10, 100)).toBe(-5);
  });

  it("returns correct bonus for exactly 10% improvement (boundary)", () => {
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
// computeScore — formula is wc·0.60 + cr·0.30 + ds·0.10 + streakBonus +
// velocityBonus, clamped to [0,100]. Reweighted from the old 0.55/0.30/0.15
// when the disciplineScore overcommit branch was removed.
// =========================================================================
describe("computeScore", () => {
  it("returns 100 when all components are 100", () => {
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
      currentStreak: 100,
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

  it("applies streak bonus correctly (60·0.6 + 60·0.3 + 60·0.1 + 1 = 61)", () => {
    const score = computeScore({
      weightedCompletion: 60,
      consistencyRate: 60,
      disciplineScore: 60,
      currentStreak: 7,
      velocityBonus: 0,
    });
    expect(score).toBe(61);
  });

  it("applies velocity bonus correctly (60 + 3 = 63)", () => {
    const score = computeScore({
      weightedCompletion: 60,
      consistencyRate: 60,
      disciplineScore: 60,
      currentStreak: 0,
      velocityBonus: 3,
    });
    expect(score).toBe(63);
  });

  it("rounds to nearest integer (70·0.6 + 50·0.3 + 80·0.1 = 65 → 65)", () => {
    const score = computeScore({
      weightedCompletion: 70,
      consistencyRate: 50,
      disciplineScore: 80,
      currentStreak: 0,
      velocityBonus: 0,
    });
    expect(score).toBe(65);
  });

  it("weights weightedCompletion most heavily (drops from 100 to 60 → score drops 24)", () => {
    const high = computeScore({
      weightedCompletion: 100,
      consistencyRate: 60,
      disciplineScore: 60,
      currentStreak: 0,
      velocityBonus: 0,
    });
    const low = computeScore({
      weightedCompletion: 60,
      consistencyRate: 60,
      disciplineScore: 60,
      currentStreak: 0,
      velocityBonus: 0,
    });
    expect(high - low).toBe(24);
  });
});

// =========================================================================
// getTier
// =========================================================================
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

// =========================================================================
// getTierWithHysteresis — only drop a tier after 3 consecutive snapshots
// below the threshold; upward moves are immediate.
// =========================================================================
describe("getTierWithHysteresis", () => {
  it("returns naive tier when no priors are available", () => {
    expect(getTierWithHysteresis(85, [])).toEqual(getTier(85));
  });

  it("upgrades immediately on a single high score", () => {
    // Was Locked In (80), today 92 → upgrade to Proven straight away.
    expect(getTierWithHysteresis(92, [80, 80, 80]).name).toBe("Proven");
  });

  it("holds previous tier on a single dip below threshold", () => {
    // Yesterday Proven (92), today 88 → stay Proven (only 1 below).
    expect(getTierWithHysteresis(88, [92]).name).toBe("Proven");
  });

  it("holds previous tier when only the most recent prior is below threshold", () => {
    // Priors: [yesterday=92, day-before=92] → previous tier was Proven.
    // Today's score 88 is one dip; needs three consecutive to drop.
    expect(getTierWithHysteresis(88, [92, 92]).name).toBe("Proven");
  });

  it("drops on the third consecutive dip", () => {
    // Today + two prior days all below 90 → drop to Locked In.
    expect(getTierWithHysteresis(88, [88, 88]).name).toBe("Locked In");
  });

  it("ignores prior streak when score recovers", () => {
    // Today back at 92 → naive Proven, regardless of priors.
    expect(getTierWithHysteresis(92, [88, 88]).name).toBe("Proven");
  });
});
