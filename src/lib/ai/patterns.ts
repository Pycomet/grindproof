import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PatternResult = {
  content: string;
  severity: "info" | "warning" | "critical";
  patternKey: string;
  relatedTo?: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// Keyword clustering
// ---------------------------------------------------------------------------

const REFLECTION_CLUSTERS: Record<string, RegExp> = {
  focus: /distracted|lost focus|sidetracked|couldn't concentrate/i,
  energy: /tired|exhausted|burnout|energy|fatigue/i,
  planning: /underestimated|took longer|not enough time|ran out of time/i,
  commitment: /priorities changed|something came up|urgent|emergency/i,
  systems: /forgot|didn't remember|slipped my mind/i,
};

export function clusterReflection(reflection: string): string | null {
  for (const [cluster, pattern] of Object.entries(REFLECTION_CLUSTERS)) {
    if (pattern.test(reflection)) {
      return cluster;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Analysis functions
// ---------------------------------------------------------------------------

type TaskInput = {
  title: string;
  carry_over_count: number;
  status: string;
  due_date: string | null;
};

export function analyzeCarryOverFrequency(tasks: TaskInput[]): PatternResult | null {
  if (tasks.length === 0) return null;

  const chronicTasks = tasks.filter((t) => t.carry_over_count >= 3);
  if (chronicTasks.length === 0) return null;

  // Check for critical: any task with carry_over_count >= 5
  const criticalTask = chronicTasks
    .filter((t) => t.carry_over_count >= 5)
    .sort((a, b) => b.carry_over_count - a.carry_over_count)[0];

  if (criticalTask) {
    return {
      content: `"${criticalTask.title}" has been carried over ${criticalTask.carry_over_count} times and may need to be broken down, delegated, or removed.`,
      severity: "critical",
      patternKey: "carry_over",
      relatedTo: { taskTitle: criticalTask.title, carryOverCount: criticalTask.carry_over_count },
    };
  }

  // Check for warning: >20% of tasks are chronic carry-overs
  const ratio = chronicTasks.length / tasks.length;
  if (ratio > 0.2) {
    return {
      content: `${chronicTasks.length} of ${tasks.length} tasks (${Math.round(ratio * 100)}%) have been carried over 3+ times. Consider revisiting your task planning approach.`,
      severity: "warning",
      patternKey: "carry_over",
      relatedTo: { chronicCount: chronicTasks.length, totalCount: tasks.length },
    };
  }

  return null;
}

// ---------------------------------------------------------------------------

type ReflectionInput = { reflection: string };

export function analyzeExcuseTrends(reflections: ReflectionInput[]): PatternResult | null {
  if (reflections.length === 0) return null;

  const clusterCounts: Record<string, number> = {};
  for (const { reflection } of reflections) {
    const cluster = clusterReflection(reflection);
    if (cluster) {
      clusterCounts[cluster] = (clusterCounts[cluster] ?? 0) + 1;
    }
  }

  const dominant = Object.entries(clusterCounts)
    .filter(([, count]) => count >= 3)
    .sort(([, a], [, b]) => b - a)[0];

  if (!dominant) return null;

  const [cluster, count] = dominant;
  return {
    content: `Your reflections frequently mention "${cluster}" issues (${count} times). This pattern may be worth addressing directly.`,
    severity: "warning",
    patternKey: "excuse_trends",
    relatedTo: { dominantCluster: cluster, occurrences: count },
  };
}

// ---------------------------------------------------------------------------

type GoalInput = {
  title: string;
  daysSinceLastCompletion: number | null;
  pendingTasks: number;
  status: string;
};

export function analyzeGoalStagnation(
  goals: GoalInput[],
  newGoalsCreatedRecently: number
): PatternResult | null {
  const activeGoals = goals.filter((g) => g.status === "active");
  if (activeGoals.length === 0) return null;

  // Treat null daysSinceLastCompletion as heavily stagnant (never had a completion)
  const stagnantGoals = activeGoals.filter(
    (g) => g.daysSinceLastCompletion === null || g.daysSinceLastCompletion >= 14
  );

  if (stagnantGoals.length === 0) return null;

  const maxDays = Math.max(
    ...stagnantGoals.map((g) => g.daysSinceLastCompletion ?? 999)
  );

  const severity: PatternResult["severity"] = maxDays >= 30 ? "critical" : "warning";

  let content =
    `${stagnantGoals.length} active goal${stagnantGoals.length > 1 ? "s have" : " has"} seen no progress for ${maxDays >= 999 ? "a long time" : `${maxDays}+ days`}. ` +
    `Consider breaking them into smaller tasks or archiving goals that no longer serve you.`;

  if (newGoalsCreatedRecently > 0) {
    content +=
      ` You've also created ${newGoalsCreatedRecently} new goal${newGoalsCreatedRecently > 1 ? "s" : ""} recently — watch out for new goal addiction where shiny new goals distract from existing ones.`;
  }

  return {
    content,
    severity,
    patternKey: "goal_stagnation",
    relatedTo: { stagnantCount: stagnantGoals.length, maxDaysSinceProgress: maxDays },
  };
}

// ---------------------------------------------------------------------------

export function analyzeCompletionVelocity(
  currentAvgPerDay: number,
  previousAvgPerDay: number
): PatternResult | null {
  if (previousAvgPerDay === 0) return null;

  const change = (currentAvgPerDay - previousAvgPerDay) / previousAvgPerDay;
  const absChange = Math.abs(change);

  if (absChange < 0.3) return null;

  if (change < 0) {
    return {
      content: `Your task completion rate has dropped by ${Math.round(absChange * 100)}% compared to the previous period. Try to identify what's changed and address it.`,
      severity: "warning",
      patternKey: "velocity",
      relatedTo: { changePercent: Math.round(change * 100), currentAvgPerDay, previousAvgPerDay },
    };
  }

  return {
    content: `Great momentum! Your task completion rate has improved by ${Math.round(absChange * 100)}% compared to the previous period. Keep it up.`,
    severity: "info",
    patternKey: "velocity",
    relatedTo: { changePercent: Math.round(change * 100), currentAvgPerDay, previousAvgPerDay },
  };
}

// ---------------------------------------------------------------------------

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type DayStat = { day: number; completed: number; skipped: number };

export function analyzeTimePatterns(dayStats: DayStat[]): PatternResult | null {
  if (dayStats.length === 0) return null;

  // Compute skip rate per day (only days with tasks)
  const ratedDays = dayStats
    .map((d) => {
      const total = d.completed + d.skipped;
      return { day: d.day, skipRate: total > 0 ? d.skipped / total : null, total };
    })
    .filter((d) => d.skipRate !== null) as { day: number; skipRate: number; total: number }[];

  if (ratedDays.length === 0) return null;

  const avgSkipRate = ratedDays.reduce((sum, d) => sum + d.skipRate, 0) / ratedDays.length;
  if (avgSkipRate === 0) return null;

  const problematicDays = ratedDays.filter((d) => d.skipRate >= avgSkipRate * 2);

  if (problematicDays.length === 0) return null;

  const dayNames = problematicDays.map((d) => DAY_NAMES[d.day]).join(", ");

  return {
    content: `You tend to skip tasks significantly more on ${dayNames}. Consider planning lighter or more flexible tasks on those days.`,
    severity: "warning",
    patternKey: "time_patterns",
    relatedTo: {
      problematicDays: problematicDays.map((d) => DAY_NAMES[d.day]),
      avgSkipRate: Math.round(avgSkipRate * 100),
    },
  };
}

// ---------------------------------------------------------------------------
// DB Orchestrator (not unit-tested — DB-dependent)
// ---------------------------------------------------------------------------

export async function computeUserPatterns(
  db: SupabaseClient<Database>,
  userId: string
): Promise<void> {
  // Expire stale memories for this user only
  await db
    .from("coach_memory")
    .update({ status: "expired", updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "active")
    .lt("expires_at", new Date().toISOString());

  // Fetch tasks from the last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: tasks } = await db
    .from("tasks")
    .select("id, title, carry_over_count, status, due_date, created_at, reflection")
    .eq("user_id", userId)
    .gte("due_date", thirtyDaysAgo);

  // Extract reflections from tasks (not a separate table)
  const reflections = (tasks ?? [])
    .filter((t) => t.reflection != null)
    .map((t) => ({ reflection: t.reflection as string }));

  // Fetch active goals with last completion info
  const { data: goals } = await db
    .from("goals")
    .select("id, title, status, created_at")
    .eq("user_id", userId)
    .eq("status", "active");

  // Count new goals created in the last 14 days
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const newGoalsCreatedRecently =
    goals?.filter((g) => g.created_at >= fourteenDaysAgo).length ?? 0;

  // Build day stats from tasks
  const dayStatsMap: Record<number, { completed: number; skipped: number }> = {};
  for (const task of tasks ?? []) {
    if (!task.due_date) continue;
    const day = new Date(task.due_date).getDay();
    if (!dayStatsMap[day]) dayStatsMap[day] = { completed: 0, skipped: 0 };
    if (task.status === "completed") dayStatsMap[day].completed++;
    else if (task.status === "skipped" || (task.carry_over_count ?? 0) >= 1)
      dayStatsMap[day].skipped++;
  }
  const dayStats = Object.entries(dayStatsMap).map(([day, stats]) => ({
    day: Number(day),
    ...stats,
  }));

  // Compute completion velocity (compare last 7 days vs prior days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const currentTasks = tasks?.filter((t) => t.due_date && t.due_date >= sevenDaysAgo) ?? [];
  const previousTasks = tasks?.filter((t) => t.due_date && t.due_date < sevenDaysAgo) ?? [];
  const currentAvg =
    currentTasks.filter((t) => t.status === "completed").length / 7;
  const lastWeekDays = Math.max(1, Math.ceil(
    (new Date(sevenDaysAgo).getTime() - new Date(thirtyDaysAgo).getTime()) / (1000 * 60 * 60 * 24)
  ));
  const previousAvg =
    previousTasks.filter((t) => t.status === "completed").length / lastWeekDays;

  // Build goal stagnation inputs using actual last completed task per goal
  const now = new Date();
  const goalInputs = await Promise.all(
    (goals ?? []).map(async (g) => {
      const { data: lastCompleted } = await db
        .from("tasks")
        .select("due_date")
        .eq("goal_id", g.id)
        .eq("status", "completed")
        .order("due_date", { ascending: false })
        .limit(1);
      const lastDate = lastCompleted?.[0]?.due_date;
      const { count: pending } = await db
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("goal_id", g.id)
        .eq("status", "pending");
      return {
        title: g.title,
        daysSinceLastCompletion: lastDate
          ? Math.floor((now.getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
          : null,
        pendingTasks: pending ?? 0,
        status: g.status,
      };
    })
  );

  // Run analyzers
  const results: PatternResult[] = [
    analyzeCarryOverFrequency(
      (tasks ?? []).map((t) => ({
        title: t.title,
        carry_over_count: t.carry_over_count ?? 0,
        status: t.status,
        due_date: t.due_date,
      }))
    ),
    analyzeExcuseTrends(reflections),
    analyzeGoalStagnation(goalInputs, newGoalsCreatedRecently),
    analyzeCompletionVelocity(currentAvg, previousAvg),
    analyzeTimePatterns(dayStats),
  ].filter((r): r is PatternResult => r !== null);

  // Persist results to coach_memory
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  for (const result of results) {
    // Supersede old memory with same pattern_key
    await db
      .from("coach_memory")
      .update({ status: "superseded", updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("pattern_key", result.patternKey)
      .eq("status", "active");

    // Insert fresh row
    await db.from("coach_memory").insert({
      user_id: userId,
      content: result.content,
      severity: result.severity,
      pattern_key: result.patternKey,
      related_to: result.relatedTo ?? null,
      source: "pattern_engine",
      category: "pattern",
      expires_at: expiresAt,
      status: "active",
    });
  }
}
