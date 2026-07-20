import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { computeUserAccountability } from "@/lib/accountability/compute";
import { localToday } from "@/lib/accountability/active-day";
import { fetchRecentSnapshots } from "@/lib/accountability/snapshot";
import {
  sanitizeForPrompt,
  wrapUntrusted,
  UNTRUSTED_CONTEXT_TAG,
} from "@/lib/prompts/sanitize";

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
    alerts.push(
      `ALERT: Score dropped from ${input.score - input.delta} to ${input.score} this week`
    );
  }
  if (input.currentStreak === 0 && input.previousStreak >= 3) {
    alerts.push(`ALERT: Streak broken after ${input.previousStreak} days`);
  }
  if (input.overdueTasks.length >= 3) {
    alerts.push(`ALERT: ${input.overdueTasks.length} tasks overdue`);
  }
  for (const t of input.chronicCarryOvers) {
    alerts.push(
      `ALERT: "${t.title}" carried over ${t.carryOverCount} times`
    );
  }
  for (const c of input.activeCommitmentsPastDue) {
    alerts.push(`ALERT: Commitment may be past due — "${c.content}"`);
  }
  if (input.goalsUnder50 >= 5) {
    alerts.push(
      `ALERT: ${input.goalsUnder50} active goals under 50% — overcommitment risk`
    );
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
  todayTasks: {
    title: string;
    status: string;
    priority: string;
    dueDate: string;
    isOverdue: boolean;
  }[];
  activeGoals: { title: string; completed: number; total: number }[];
  coachMemory: { category: string; content: string; createdAt: string }[];
  drivers: { top: string; drag: string | null };
}

export function formatCoachContext(input: FormatInput): string {
  const lines: string[] = ["=== CURRENT USER CONTEXT ===", ""];
  if (input.alerts.length > 0) {
    lines.push("ALERTS:");
    for (const a of input.alerts) lines.push(`- ${a}`);
    lines.push("");
  }
  const deltaStr = input.delta > 0 ? `+${input.delta}` : `${input.delta}`;
  lines.push(
    `ACCOUNTABILITY: Score ${input.score}/100 (${input.tierName}) | Streak: ${input.streak} days | Completion: ${input.completionRate}% | Consistency: ${input.consistencyRate}%`
  );
  lines.push(`Delta: ${deltaStr} from last week`);
  lines.push(
    `Driver: ${input.drivers.top}${input.drivers.drag ? ` | Drag: ${input.drivers.drag}` : ""}`
  );
  lines.push("");
  const today = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
  // User-authored fields (task/goal titles, coach-memory content) are untrusted:
  // sanitize each string and fence the whole section so injected instructions
  // are treated as data, not commands. Mirrors the weekly-roast pipeline.
  const todayBody: string[] = [];
  if (input.todayTasks.length === 0) {
    todayBody.push("- No tasks scheduled for today");
  } else {
    for (const t of input.todayTasks) {
      const label = t.isOverdue ? "overdue" : t.status;
      todayBody.push(
        `- [${label}] ${sanitizeForPrompt(t.title, 200)} (${t.priority} priority)`
      );
    }
  }
  lines.push(`TODAY (${today}):`);
  lines.push(wrapUntrusted(todayBody.join("\n"), UNTRUSTED_CONTEXT_TAG));
  lines.push("");

  const goalsBody: string[] = [];
  if (input.activeGoals.length === 0) {
    goalsBody.push("- No active goals");
  } else {
    for (const g of input.activeGoals) {
      const pct = g.total > 0 ? Math.round((g.completed / g.total) * 100) : 0;
      goalsBody.push(
        `- ${sanitizeForPrompt(g.title, 200)}: ${g.completed}/${g.total} tasks done (${pct}%)`
      );
    }
  }
  lines.push("ACTIVE GOALS:");
  lines.push(wrapUntrusted(goalsBody.join("\n"), UNTRUSTED_CONTEXT_TAG));
  lines.push("");

  const memoryBody: string[] = [];
  if (input.coachMemory.length === 0) {
    memoryBody.push("- No prior notes");
  } else {
    for (const m of input.coachMemory) {
      const dateStr = new Date(m.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      memoryBody.push(`- [${m.category}, ${dateStr}] ${sanitizeForPrompt(m.content, 500)}`);
    }
  }
  lines.push("COACH MEMORY (recent):");
  lines.push(wrapUntrusted(memoryBody.join("\n"), UNTRUSTED_CONTEXT_TAG));
  lines.push("");
  lines.push("=== END CONTEXT ===");
  lines.push("");
  lines.push(
    "When ALERTS are present, open the conversation by addressing the most critical one. When no alerts, stay quiet until the user engages."
  );
  return lines.join("\n");
}

export async function buildCoachContext(
  userId: string,
  supabase: SupabaseClient<Database>
): Promise<string> {
  const now = new Date();
  const snap = await computeUserAccountability(supabase, userId, now);
  const today = localToday(now, snap.timezone);

  // Yesterday's snapshot tells us if a streak just broke (current=0 but prior was >=3).
  const recent = await fetchRecentSnapshots(supabase, userId, 2);
  const yesterdaySnap = recent.find((r) => r.local_date < today);
  const previousStreak = yesterdaySnap?.streak ?? 0;

  // Today's tasks + overdue pending tasks for the AI to discuss directly.
  const { data: todayPending } = await supabase
    .from("tasks")
    .select("id, title, status, priority, due_date, carry_over_count")
    .eq("user_id", userId)
    .or(
      `and(due_date.gte.${today}T00:00:00.000Z,due_date.lt.${today}T23:59:59.999Z),and(due_date.lt.${today}T00:00:00.000Z,status.eq.pending)`
    )
    .order("due_date", { ascending: true });

  const todayTasks = todayPending || [];
  const overdueTasks = todayTasks.filter(
    (t) => t.status === "pending" && t.due_date && t.due_date < `${today}T00:00:00.000Z`
  );
  const chronicCarryOvers = todayTasks
    .filter((t) => (t.carry_over_count ?? 0) >= 3)
    .map((t) => ({ title: t.title, carryOverCount: t.carry_over_count ?? 0 }));

  // Active goals + simple progress.
  const { data: goals } = await supabase
    .from("goals")
    .select("id, title")
    .eq("user_id", userId)
    .eq("status", "active");
  const goalProgress = await Promise.all(
    (goals || []).map(async (g) => {
      const { count: total } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("goal_id", g.id);
      const { count: comp } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("goal_id", g.id)
        .eq("status", "completed");
      return { title: g.title, completed: comp ?? 0, total: total ?? 0 };
    })
  );
  const goalsUnder50 = goalProgress.filter(
    (g) => g.total > 0 && g.completed / g.total < 0.5
  ).length;

  // Coach memory and any past-due commitments.
  const { data: memory } = await supabase
    .from("coach_memory")
    .select("category, content, created_at, status, severity, related_to")
    .eq("user_id", userId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(20);
  const memoryRows = memory || [];
  const activeCommitmentsPastDue = memoryRows.filter(
    (m) =>
      m.category === "commitment" &&
      m.related_to &&
      typeof (m.related_to as Record<string, unknown>).deadline === "string" &&
      new Date(
        (m.related_to as Record<string, unknown>).deadline as string
      ) < now
  );

  const alerts = generateAlerts({
    score: snap.score,
    delta: snap.delta,
    currentStreak: snap.streak,
    previousStreak,
    overdueTasks: overdueTasks.map((t) => ({
      title: sanitizeForPrompt(t.title, 200),
    })),
    chronicCarryOvers: chronicCarryOvers.map((c) => ({
      title: sanitizeForPrompt(c.title, 200),
      carryOverCount: c.carryOverCount,
    })),
    activeCommitmentsPastDue: activeCommitmentsPastDue.map((m) => ({
      content: sanitizeForPrompt(m.content, 500),
    })),
    goalsUnder50,
  });

  const formattedToday = todayTasks.map((t) => ({
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.due_date ?? "",
    isOverdue:
      t.status === "pending" &&
      !!t.due_date &&
      t.due_date < `${today}T00:00:00.000Z`,
  }));

  return formatCoachContext({
    alerts,
    score: snap.score,
    tierName: snap.tier.name,
    streak: snap.streak,
    completionRate: snap.weightedCompletion,
    consistencyRate: Math.round(snap.consistencyRate),
    delta: snap.delta,
    todayTasks: formattedToday,
    activeGoals: goalProgress,
    coachMemory: memoryRows.map((m) => ({
      category: m.category,
      content: m.content,
      createdAt: m.created_at,
    })),
    drivers: snap.drivers,
  });
}
