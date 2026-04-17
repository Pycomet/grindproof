import { describe, it, expect } from "vitest";

import {
  clusterReflection,
  analyzeCarryOverFrequency,
  analyzeExcuseTrends,
  analyzeGoalStagnation,
  analyzeCompletionVelocity,
  analyzeTimePatterns,
} from "@/lib/ai/patterns";

// =========================================================================
// clusterReflection
// =========================================================================
describe("clusterReflection", () => {
  it("maps 'distracted' to focus", () => {
    expect(clusterReflection("I was distracted all day")).toBe("focus");
  });

  it("maps 'lost focus' to focus", () => {
    expect(clusterReflection("I lost focus during the afternoon")).toBe("focus");
  });

  it("maps 'sidetracked' to focus", () => {
    expect(clusterReflection("Got sidetracked by emails")).toBe("focus");
  });

  it("maps 'couldn't concentrate' to focus", () => {
    expect(clusterReflection("I couldn't concentrate on the task")).toBe("focus");
  });

  it("maps 'tired' to energy", () => {
    expect(clusterReflection("I was too tired to finish")).toBe("energy");
  });

  it("maps 'exhausted' to energy", () => {
    expect(clusterReflection("Felt exhausted after the meeting")).toBe("energy");
  });

  it("maps 'burnout' to energy", () => {
    expect(clusterReflection("Experiencing burnout this week")).toBe("energy");
  });

  it("maps 'energy' to energy", () => {
    expect(clusterReflection("Low energy levels today")).toBe("energy");
  });

  it("maps 'fatigue' to energy", () => {
    expect(clusterReflection("Mental fatigue caught up with me")).toBe("energy");
  });

  it("maps 'underestimated' to planning", () => {
    expect(clusterReflection("I underestimated the task complexity")).toBe("planning");
  });

  it("maps 'took longer' to planning", () => {
    expect(clusterReflection("Everything took longer than expected")).toBe("planning");
  });

  it("maps 'not enough time' to planning", () => {
    expect(clusterReflection("There was not enough time to finish")).toBe("planning");
  });

  it("maps 'ran out of time' to planning", () => {
    expect(clusterReflection("I ran out of time before the deadline")).toBe("planning");
  });

  it("maps 'priorities changed' to commitment", () => {
    expect(clusterReflection("My priorities changed unexpectedly")).toBe("commitment");
  });

  it("maps 'something came up' to commitment", () => {
    expect(clusterReflection("Something came up at the last minute")).toBe("commitment");
  });

  it("maps 'urgent' to commitment", () => {
    expect(clusterReflection("An urgent request came in")).toBe("commitment");
  });

  it("maps 'emergency' to commitment", () => {
    expect(clusterReflection("There was a family emergency")).toBe("commitment");
  });

  it("maps 'forgot' to systems", () => {
    expect(clusterReflection("I simply forgot to do it")).toBe("systems");
  });

  it("maps 'didn't remember' to systems", () => {
    expect(clusterReflection("I didn't remember about the task")).toBe("systems");
  });

  it("maps 'slipped my mind' to systems", () => {
    expect(clusterReflection("It completely slipped my mind")).toBe("systems");
  });

  it("returns null for unrecognized text", () => {
    expect(clusterReflection("Everything went well today")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(clusterReflection("")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(clusterReflection("I was DISTRACTED")).toBe("focus");
    expect(clusterReflection("TIRED all day")).toBe("energy");
  });
});

// =========================================================================
// analyzeCarryOverFrequency
// =========================================================================
describe("analyzeCarryOverFrequency", () => {
  it("returns null when no tasks have carry_over_count >= 3", () => {
    const tasks = [
      { title: "Task A", carry_over_count: 0, status: "completed", due_date: null },
      { title: "Task B", carry_over_count: 2, status: "pending", due_date: null },
    ];
    expect(analyzeCarryOverFrequency(tasks)).toBeNull();
  });

  it("returns null for empty task list", () => {
    expect(analyzeCarryOverFrequency([])).toBeNull();
  });

  it("returns warning when more than 20% of tasks are chronic carry-overs", () => {
    const tasks = [
      { title: "Task A", carry_over_count: 3, status: "pending", due_date: null },
      { title: "Task B", carry_over_count: 3, status: "pending", due_date: null },
      { title: "Task C", carry_over_count: 0, status: "completed", due_date: null },
      { title: "Task D", carry_over_count: 0, status: "completed", due_date: null },
      { title: "Task E", carry_over_count: 1, status: "pending", due_date: null },
    ];
    const result = analyzeCarryOverFrequency(tasks);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("warning");
    expect(result!.patternKey).toBe("carry_over");
  });

  it("returns critical when any task has carry_over_count >= 5", () => {
    const tasks = [
      { title: "Fix the bug", carry_over_count: 5, status: "pending", due_date: null },
      { title: "Task B", carry_over_count: 0, status: "completed", due_date: null },
    ];
    const result = analyzeCarryOverFrequency(tasks);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("critical");
    expect(result!.content).toContain("Fix the bug");
    expect(result!.patternKey).toBe("carry_over");
  });

  it("critical result names the most carried-over task", () => {
    const tasks = [
      { title: "Important Report", carry_over_count: 7, status: "pending", due_date: null },
      { title: "Other Task", carry_over_count: 5, status: "pending", due_date: null },
    ];
    const result = analyzeCarryOverFrequency(tasks);
    expect(result!.severity).toBe("critical");
    expect(result!.content).toContain("Important Report");
  });

  it("warning result has meaningful content", () => {
    const tasks = [
      { title: "Task A", carry_over_count: 3, status: "pending", due_date: null },
      { title: "Task B", carry_over_count: 3, status: "pending", due_date: null },
      { title: "Task C", carry_over_count: 4, status: "pending", due_date: null },
      { title: "Task D", carry_over_count: 0, status: "completed", due_date: null },
      { title: "Task E", carry_over_count: 0, status: "completed", due_date: null },
    ];
    const result = analyzeCarryOverFrequency(tasks);
    expect(result!.severity).toBe("warning");
    expect(result!.content.length).toBeGreaterThan(0);
  });
});

// =========================================================================
// analyzeExcuseTrends
// =========================================================================
describe("analyzeExcuseTrends", () => {
  it("returns null when no cluster appears 3+ times", () => {
    const reflections = [
      { reflection: "I was distracted" },
      { reflection: "I was tired" },
      { reflection: "Something came up" },
    ];
    expect(analyzeExcuseTrends(reflections)).toBeNull();
  });

  it("returns null for empty reflections", () => {
    expect(analyzeExcuseTrends([])).toBeNull();
  });

  it("returns null when text doesn't match any cluster", () => {
    const reflections = [
      { reflection: "All went well" },
      { reflection: "Great day" },
      { reflection: "Productive session" },
      { reflection: "Feeling good" },
    ];
    expect(analyzeExcuseTrends(reflections)).toBeNull();
  });

  it("flags cluster appearing 3+ times", () => {
    const reflections = [
      { reflection: "I was distracted by notifications" },
      { reflection: "Lost focus during work" },
      { reflection: "Got sidetracked again" },
      { reflection: "I was tired" },
    ];
    const result = analyzeExcuseTrends(reflections);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("focus");
    expect(result!.patternKey).toBe("excuse_trends");
  });

  it("names the dominant cluster in content", () => {
    const reflections = [
      { reflection: "Too tired to work" },
      { reflection: "Exhausted after meetings" },
      { reflection: "Burnout is hitting hard" },
      { reflection: "Low energy all day" },
    ];
    const result = analyzeExcuseTrends(reflections);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("energy");
  });

  it("returns a PatternResult with correct shape", () => {
    const reflections = [
      { reflection: "I forgot to do it" },
      { reflection: "It slipped my mind" },
      { reflection: "I didn't remember the task" },
    ];
    const result = analyzeExcuseTrends(reflections);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("severity");
    expect(result).toHaveProperty("patternKey");
  });
});

// =========================================================================
// analyzeGoalStagnation
// =========================================================================
describe("analyzeGoalStagnation", () => {
  it("returns null when all active goals have recent completions (< 14 days)", () => {
    const goals = [
      { title: "Goal A", daysSinceLastCompletion: 5, pendingTasks: 3, status: "active" },
      { title: "Goal B", daysSinceLastCompletion: 10, pendingTasks: 1, status: "active" },
    ];
    expect(analyzeGoalStagnation(goals, 0)).toBeNull();
  });

  it("returns null for empty goals", () => {
    expect(analyzeGoalStagnation([], 0)).toBeNull();
  });

  it("returns warning for goals stagnant 14+ days", () => {
    const goals = [
      { title: "Learn Spanish", daysSinceLastCompletion: 14, pendingTasks: 5, status: "active" },
    ];
    const result = analyzeGoalStagnation(goals, 0);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("warning");
    expect(result!.patternKey).toBe("goal_stagnation");
  });

  it("returns critical for goals stagnant 30+ days", () => {
    const goals = [
      { title: "Write a book", daysSinceLastCompletion: 30, pendingTasks: 10, status: "active" },
    ];
    const result = analyzeGoalStagnation(goals, 0);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("critical");
  });

  it("returns critical for goals stagnant more than 30 days", () => {
    const goals = [
      { title: "Fitness goal", daysSinceLastCompletion: 45, pendingTasks: 8, status: "active" },
    ];
    const result = analyzeGoalStagnation(goals, 0);
    expect(result!.severity).toBe("critical");
  });

  it("flags new-project addiction when stagnant goals exist AND new goals created recently", () => {
    const goals = [
      { title: "Old Goal", daysSinceLastCompletion: 20, pendingTasks: 5, status: "active" },
    ];
    const result = analyzeGoalStagnation(goals, 3);
    expect(result).not.toBeNull();
    expect(result!.content.toLowerCase()).toMatch(/new.*goal|goal.*new|addiction|shiny/i);
  });

  it("ignores non-active goals", () => {
    const goals = [
      { title: "Done Goal", daysSinceLastCompletion: 60, pendingTasks: 0, status: "completed" },
      { title: "Active Goal", daysSinceLastCompletion: 5, pendingTasks: 2, status: "active" },
    ];
    expect(analyzeGoalStagnation(goals, 0)).toBeNull();
  });

  it("handles null daysSinceLastCompletion as stagnant", () => {
    const goals = [
      { title: "Never Started", daysSinceLastCompletion: null, pendingTasks: 5, status: "active" },
    ];
    const result = analyzeGoalStagnation(goals, 0);
    expect(result).not.toBeNull();
  });
});

// =========================================================================
// analyzeCompletionVelocity
// =========================================================================
describe("analyzeCompletionVelocity", () => {
  it("returns null when previousAvgPerDay is 0", () => {
    expect(analyzeCompletionVelocity(5, 0)).toBeNull();
  });

  it("returns null when change is less than 30%", () => {
    // 10% drop — not significant
    expect(analyzeCompletionVelocity(0.9, 1.0)).toBeNull();
  });

  it("returns null when change is exactly 29%", () => {
    expect(analyzeCompletionVelocity(0.71, 1.0)).toBeNull();
  });

  it("returns warning for 30%+ drop", () => {
    const result = analyzeCompletionVelocity(0.7, 1.0);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("warning");
    expect(result!.patternKey).toBe("velocity");
  });

  it("returns warning for large drop", () => {
    const result = analyzeCompletionVelocity(0.1, 2.0);
    expect(result!.severity).toBe("warning");
  });

  it("returns info for 30%+ improvement", () => {
    const result = analyzeCompletionVelocity(1.3, 1.0);
    expect(result).not.toBeNull();
    expect(result!.severity).toBe("info");
    expect(result!.patternKey).toBe("velocity");
  });

  it("returns info for large improvement", () => {
    const result = analyzeCompletionVelocity(3.0, 1.0);
    expect(result!.severity).toBe("info");
  });

  it("returns null when change is exactly 0", () => {
    expect(analyzeCompletionVelocity(1.0, 1.0)).toBeNull();
  });

  it("result has meaningful content", () => {
    const result = analyzeCompletionVelocity(0.5, 1.0);
    expect(result!.content.length).toBeGreaterThan(0);
  });
});

// =========================================================================
// analyzeTimePatterns
// =========================================================================
describe("analyzeTimePatterns", () => {
  it("returns null when skip rate is uniform across days", () => {
    const dayStats = [
      { day: 0, completed: 8, skipped: 2 },
      { day: 1, completed: 8, skipped: 2 },
      { day: 2, completed: 8, skipped: 2 },
      { day: 3, completed: 8, skipped: 2 },
      { day: 4, completed: 8, skipped: 2 },
    ];
    expect(analyzeTimePatterns(dayStats)).toBeNull();
  });

  it("returns null for empty day stats", () => {
    expect(analyzeTimePatterns([])).toBeNull();
  });

  it("returns null when no tasks exist", () => {
    const dayStats = [
      { day: 1, completed: 0, skipped: 0 },
      { day: 2, completed: 0, skipped: 0 },
    ];
    expect(analyzeTimePatterns(dayStats)).toBeNull();
  });

  it("flags days where skip rate is 2x+ the average", () => {
    const dayStats = [
      { day: 0, completed: 9, skipped: 1 },   // 10% skip rate
      { day: 1, completed: 9, skipped: 1 },   // 10% skip rate
      { day: 2, completed: 9, skipped: 1 },   // 10% skip rate
      { day: 3, completed: 9, skipped: 1 },   // 10% skip rate
      { day: 4, completed: 9, skipped: 1 },   // 10% skip rate
      { day: 5, completed: 9, skipped: 1 },   // 10% skip rate
      { day: 6, completed: 0, skipped: 10 },  // 100% skip rate — 10x avg
    ];
    const result = analyzeTimePatterns(dayStats);
    expect(result).not.toBeNull();
    expect(result!.content).toContain("Saturday");
    expect(result!.patternKey).toBe("time_patterns");
  });

  it("uses correct day names from index", () => {
    const dayStats = [
      { day: 1, completed: 9, skipped: 1 },  // Monday — 10%
      { day: 2, completed: 9, skipped: 1 },  // Tuesday — 10%
      { day: 3, completed: 9, skipped: 1 },  // Wednesday — 10%
      { day: 0, completed: 0, skipped: 10 }, // Sunday — 100%
    ];
    const result = analyzeTimePatterns(dayStats);
    expect(result!.content).toContain("Sunday");
  });

  it("returns a PatternResult with correct shape", () => {
    const dayStats = [
      { day: 1, completed: 9, skipped: 1 },
      { day: 2, completed: 9, skipped: 1 },
      { day: 3, completed: 9, skipped: 1 },
      { day: 4, completed: 0, skipped: 10 },
    ];
    const result = analyzeTimePatterns(dayStats);
    expect(result).not.toBeNull();
    expect(result).toHaveProperty("content");
    expect(result).toHaveProperty("severity");
    expect(result).toHaveProperty("patternKey", "time_patterns");
  });
});
