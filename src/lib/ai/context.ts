import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  computeWeightedCompletion,
  computeConsistencyRate,
  computeDisciplineScore,
  computeVelocityBonus,
  computeScore,
  getTier,
} from "@/lib/accountability";

interface AlertInput {
  score: number;
  delta: number;
  currentStreak: number;
  previousStreak: number;
  overdueTasks: { title: string }[];
  chronicCarryOvers: { title: string; carryOverCount: number }[];
  activeCommitmentsPastDue: { content: string }[];
  goalsUnder50: number;
}

export function generateAlerts(input: AlertInput): string[] {
  const alerts: string[] = [];
  if (input.delta <= -10) {
    alerts.push(`ALERT: Score dropped from ${input.score - input.delta} to ${input.score} this week`);
  }
  if (input.currentStreak === 0 && input.previousStreak >= 3) {
    alerts.push(`ALERT: Streak broken after ${input.previousStreak} days`);
  }
  if (input.overdueTasks.length >= 3) {
    alerts.push(`ALERT: ${input.overdueTasks.length} tasks overdue`);
  }
  for (const t of input.chronicCarryOvers) {
    alerts.push(`ALERT: "${t.title}" carried over ${t.carryOverCount} times`);
  }
  for (const c of input.activeCommitmentsPastDue) {
    alerts.push(`ALERT: Commitment may be past due — "${c.content}"`);
  }
  if (input.goalsUnder50 >= 5) {
    alerts.push(`ALERT: ${input.goalsUnder50} active goals under 50% — overcommitment risk`);
  }
  return alerts;
}

interface FormatInput {
  alerts: string[];
  score: number;
  tierName: string;
  streak: number;
  completionRate: number;
  consistencyRate: number;
  delta: number;
  todayTasks: { title: string; status: string; priority: string; dueDate: string; isOverdue: boolean }[];
  activeGoals: { title: string; completed: number; total: number }[];
  coachMemory: { category: string; content: string; createdAt: string }[];
}

export function formatCoachContext(input: FormatInput): string {
  const lines: string[] = ["=== CURRENT USER CONTEXT ===", ""];
  if (input.alerts.length > 0) {
    lines.push("ALERTS:");
    for (const a of input.alerts) lines.push(`- ${a}`);
    lines.push("");
  }
  const deltaStr = input.delta > 0 ? `+${input.delta}` : `${input.delta}`;
  lines.push(`ACCOUNTABILITY: Score ${input.score}/100 (${input.tierName}) | Streak: ${input.streak} days | Completion: ${input.completionRate}% | Consistency: ${input.consistencyRate}%`);
  lines.push(`Delta: ${deltaStr} from last week`);
  lines.push("");
  const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" });
  lines.push(`TODAY (${today}):`);
  if (input.todayTasks.length === 0) {
    lines.push("- No tasks scheduled for today");
  } else {
    for (const t of input.todayTasks) {
      const label = t.isOverdue ? "overdue" : t.status;
      lines.push(`- [${label}] ${t.title} (${t.priority} priority)`);
    }
  }
  lines.push("");
  lines.push("ACTIVE GOALS:");
  if (input.activeGoals.length === 0) {
    lines.push("- No active goals");
  } else {
    for (const g of input.activeGoals) {
      const pct = g.total > 0 ? Math.round((g.completed / g.total) * 100) : 0;
      lines.push(`- ${g.title}: ${g.completed}/${g.total} tasks done (${pct}%)`);
    }
  }
  lines.push("");
  lines.push("COACH MEMORY (recent):");
  if (input.coachMemory.length === 0) {
    lines.push("- No prior notes");
  } else {
    for (const m of input.coachMemory) {
      const dateStr = new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      lines.push(`- [${m.category}, ${dateStr}] ${m.content}`);
    }
  }
  lines.push("");
  lines.push("=== END CONTEXT ===");
  lines.push("");
  lines.push("When ALERTS are present, open the conversation by addressing the most critical one. When no alerts, stay quiet until the user engages.");
  return lines.join("\n");
}

export async function buildCoachContext(
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<string> {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - 13);

  const [tasksResult, todayResult, memoryResult, goalsResult] = await Promise.all([
    supabase
      .from("tasks")
      .select("status, due_date, priority, carry_over_count")
      .eq("user_id", userId)
      .gte("due_date", windowStart.toISOString())
      .lte("due_date", now.toISOString()),
    supabase
      .from("tasks")
      .select("id, title, status, priority, due_date, carry_over_count")
      .eq("user_id", userId)
      .or(`and(due_date.gte.${todayStart.toISOString()},due_date.lte.${todayEnd.toISOString()}),and(due_date.lt.${todayStart.toISOString()},status.eq.pending)`)
      .order("due_date", { ascending: true }),
    supabase
      .from("coach_memory")
      .select("category, content, created_at, status, severity, related_to")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("goals")
      .select("id, title")
      .eq("user_id", userId)
      .eq("status", "active"),
  ]);

  const windowTasks = tasksResult.data || [];
  const todayTasks = todayResult.data || [];
  const memory = memoryResult.data || [];
  const goals = goalsResult.data || [];

  const activeDaysSet = new Set(
    windowTasks
      .filter((t) => t.status === "completed" && t.due_date)
      .map((t) => new Date(t.due_date!).toISOString().split("T")[0])
  );

  const weightedCompletion = computeWeightedCompletion(
    windowTasks.map((t) => ({ status: t.status, priority: t.priority }))
  );
  const consistencyRate = computeConsistencyRate(activeDaysSet.size, 14);
  const disciplineScore = computeDisciplineScore(
    windowTasks.map((t) => ({ carry_over_count: t.carry_over_count ?? 0, status: t.status })),
    windowTasks.length
  );

  let streak = 0;
  const checkDate = new Date(now);
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().split("T")[0];
    if (activeDaysSet.has(dateStr)) { streak++; } else if (i > 0) { break; }
    checkDate.setDate(checkDate.getDate() - 1);
  }

  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const thisWeek = windowTasks.filter((t) => t.due_date && new Date(t.due_date) > oneWeekAgo);
  const lastWeek = windowTasks.filter((t) => t.due_date && new Date(t.due_date) <= oneWeekAgo);
  const thisRate = thisWeek.length > 0 ? (thisWeek.filter((t) => t.status === "completed").length / thisWeek.length) * 100 : 0;
  const lastRate = lastWeek.length > 0 ? (lastWeek.filter((t) => t.status === "completed").length / lastWeek.length) * 100 : 0;
  const velocityBonus = computeVelocityBonus(thisRate, lastRate);

  const score = computeScore({ weightedCompletion, consistencyRate, disciplineScore, currentStreak: streak, velocityBonus });
  const tier = getTier(score);

  const pastWindowEnd = new Date(now);
  pastWindowEnd.setDate(pastWindowEnd.getDate() - 7);
  const pastWindowStart = new Date(pastWindowEnd);
  pastWindowStart.setDate(pastWindowStart.getDate() - 13);
  const { data: pastTasks } = await supabase
    .from("tasks")
    .select("status, priority, carry_over_count, due_date")
    .eq("user_id", userId)
    .gte("due_date", pastWindowStart.toISOString())
    .lte("due_date", pastWindowEnd.toISOString());
  const pastAll = pastTasks || [];
  const pastActiveDays = new Set(
    pastAll
      .filter((t) => t.status === "completed" && t.due_date)
      .map((t) => new Date(t.due_date!).toISOString().split("T")[0])
  ).size;
  const pastScore = computeScore({
    weightedCompletion: computeWeightedCompletion(pastAll.map((t) => ({ status: t.status, priority: t.priority }))),
    consistencyRate: computeConsistencyRate(pastActiveDays, 14),
    disciplineScore: computeDisciplineScore(pastAll.map((t) => ({ carry_over_count: t.carry_over_count ?? 0, status: t.status })), pastAll.length),
    currentStreak: 0,
    velocityBonus: 0,
  });
  const delta = score - pastScore;

  const goalProgress = await Promise.all(
    goals.map(async (g) => {
      const { count: total } = await supabase.from("tasks").select("*", { count: "exact", head: true }).eq("goal_id", g.id);
      const { count: comp } = await supabase.from("tasks").select("*", { count: "exact", head: true }).eq("goal_id", g.id).eq("status", "completed");
      return { title: g.title, completed: comp ?? 0, total: total ?? 0 };
    })
  );

  const overdueTasks = todayTasks.filter((t) => t.status === "pending" && t.due_date && new Date(t.due_date) < todayStart);
  const chronicCarryOvers = todayTasks.filter((t) => (t.carry_over_count ?? 0) >= 3).map((t) => ({ title: t.title, carryOverCount: t.carry_over_count ?? 0 }));
  const activeCommitmentsPastDue = memory.filter(
    (m) => m.category === "commitment" && m.related_to &&
      typeof (m.related_to as any).deadline === "string" &&
      new Date((m.related_to as any).deadline) < now
  );
  const goalsUnder50 = goalProgress.filter((g) => g.total > 0 && g.completed / g.total < 0.5).length;

  const alerts = generateAlerts({
    score, delta, currentStreak: streak,
    // Estimate previous streak: if current is 0, check if yesterday was active (implies broken)
    previousStreak: streak === 0
      ? (activeDaysSet.has(new Date(now.getTime() - 86400000).toISOString().split("T")[0]) ? 3 : 0)
      : streak,
    overdueTasks: overdueTasks.map((t) => ({ title: t.title })),
    chronicCarryOvers,
    activeCommitmentsPastDue: activeCommitmentsPastDue.map((m) => ({ content: m.content })),
    goalsUnder50,
  });

  const formattedToday = todayTasks.map((t) => ({
    title: t.title, status: t.status, priority: t.priority,
    dueDate: t.due_date ?? "",
    isOverdue: t.status === "pending" && !!t.due_date && new Date(t.due_date) < todayStart,
  }));

  return formatCoachContext({
    alerts, score, tierName: tier.name, streak,
    completionRate: weightedCompletion, consistencyRate: Math.round(consistencyRate),
    delta, todayTasks: formattedToday, activeGoals: goalProgress,
    coachMemory: memory.map((m) => ({ category: m.category, content: m.content, createdAt: m.created_at })),
  });
}
