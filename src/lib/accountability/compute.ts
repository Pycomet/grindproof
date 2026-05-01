/**
 * The single source of truth for "what is this user's accountability score
 * right now?" Every consumer (tRPC widget, stats page, weekly-roast cron, AI
 * context builder, snapshot writer) calls this function. Removing the four
 * independent reimplementations is the entire point.
 *
 * The function is pure with respect to its inputs (db, userId, asOf) — same
 * inputs at the same wall-clock instant produce the same output. Snapshots
 * derived from this function will therefore agree with the live score that
 * powers the widget, by construction.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import {
  computeWeightedCompletion,
  computeConsistencyRate,
  computeDisciplineScore,
  computeVelocityBonus,
  computeStreakBonus,
  computeScore,
  getTier,
  type Tier,
} from "./primitives";
import {
  countStreak,
  localDatesWithCompletions,
  localToday,
  shiftLocalDate,
} from "./active-day";

const WINDOW_DAYS = 14;
const STREAK_LOOKBACK_DAYS = 365;
const DEFAULT_TIMEZONE = "UTC";

export interface AccountabilitySnapshot {
  score: number;
  tier: Tier;
  streak: number;
  weightedCompletion: number;
  consistencyRate: number;
  disciplineScore: number;
  velocityBonus: number;
  streakBonus: number;
  delta: number;
  today: { completed: number; total: number; weightedCompletion: number };
  drivers: { top: string; drag: string | null };
  weakSignals: WeakSignal[];
  active: boolean; // did the user complete anything today?
  timezone: string;
  asOf: string; // ISO instant
  localDate: string; // user-local YYYY-MM-DD
}

export interface WeakSignal {
  kind:
    | "chronic_carry_over"
    | "low_completion"
    | "broken_streak"
    | "overcommit"
    | "no_activity";
  detail: string;
}

interface TaskRow {
  id: string;
  title: string;
  status: "pending" | "completed" | "skipped";
  priority: "high" | "medium" | "low";
  due_date: string | null;
  completed_at: string | null;
  carry_over_count: number;
}

export async function computeUserAccountability(
  db: SupabaseClient<Database>,
  userId: string,
  asOf: Date = new Date()
): Promise<AccountabilitySnapshot> {
  const timezone = await fetchUserTimezone(db, userId);
  const localDate = localToday(asOf, timezone);

  // One bulk query covers the longest lookback (streak); the smaller windows
  // are filtered in memory. This is deliberate: it keeps the network round
  // trips at one for the hot read path.
  const lookbackStart = shiftLocalDate(
    asOf,
    timezone,
    -(STREAK_LOOKBACK_DAYS - 1)
  );
  const { data: rawTasks } = await db
    .from("tasks")
    .select(
      "id, title, status, priority, due_date, completed_at, carry_over_count"
    )
    .eq("user_id", userId)
    .or(
      `completed_at.gte.${lookbackStart},due_date.gte.${lookbackStart}`
    );

  const tasks: TaskRow[] = (rawTasks || []) as TaskRow[];

  // -- Streak: walk backwards from today over completion-only buckets.
  const streak = countStreak(
    localDatesWithCompletions(tasks, timezone),
    asOf,
    timezone,
    STREAK_LOOKBACK_DAYS
  );

  // -- 14-day window for the score itself.
  const windowStart = shiftLocalDate(asOf, timezone, -(WINDOW_DAYS - 1));
  const windowTasks = tasks.filter((t) => isInWindow(t, windowStart, localDate));

  const weightedCompletion = computeWeightedCompletion(
    windowTasks.map((t) => ({ status: t.status, priority: t.priority }))
  );

  const completionDates = localDatesWithCompletions(
    windowTasks.filter((t) => t.status === "completed"),
    timezone
  );
  const consistencyRate = computeConsistencyRate(
    completionDates.size,
    WINDOW_DAYS
  );

  const disciplineScore = computeDisciplineScore(
    windowTasks.map((t) => ({
      carry_over_count: t.carry_over_count,
      status: t.status,
    }))
  );

  // -- Velocity: this-week vs last-week completion rate, weighted by priority
  // for consistency with the rest of the score.
  const midPoint = shiftLocalDate(asOf, timezone, -7);
  const thisWeek = windowTasks.filter((t) =>
    bucketDate(t, timezone) > midPoint
  );
  const lastWeek = windowTasks.filter((t) =>
    bucketDate(t, timezone) <= midPoint
  );
  const thisWeekRate = computeWeightedCompletion(
    thisWeek.map((t) => ({ status: t.status, priority: t.priority }))
  );
  const lastWeekRate = computeWeightedCompletion(
    lastWeek.map((t) => ({ status: t.status, priority: t.priority }))
  );
  const velocityBonus = computeVelocityBonus(thisWeekRate, lastWeekRate);
  const streakBonus = computeStreakBonus(streak);

  // No signal at all → don't fake a baseline score. A brand-new user with
  // zero tasks should see 0/Slacking, not 10/Slacking just because the
  // empty-tasks discipline default of 100 is leaking through the formula.
  const score =
    windowTasks.length === 0 && streak === 0
      ? 0
      : computeScore({
          weightedCompletion,
          consistencyRate,
          disciplineScore,
          currentStreak: streak,
          velocityBonus,
        });

  // -- Delta: same window 7 days ago, recomputed without streak/velocity
  // bonuses so the delta isolates "real" performance change rather than
  // bonus-arrival spikes.
  const pastEnd = shiftLocalDate(asOf, timezone, -7);
  const pastStart = shiftLocalDate(asOf, timezone, -(7 + WINDOW_DAYS - 1));
  const pastTasks = tasks.filter((t) =>
    isInWindow(t, pastStart, pastEnd)
  );
  const pastScore = computeScore({
    weightedCompletion: computeWeightedCompletion(
      pastTasks.map((t) => ({ status: t.status, priority: t.priority }))
    ),
    consistencyRate: computeConsistencyRate(
      localDatesWithCompletions(
        pastTasks.filter((t) => t.status === "completed"),
        timezone
      ).size,
      WINDOW_DAYS
    ),
    disciplineScore: computeDisciplineScore(
      pastTasks.map((t) => ({
        carry_over_count: t.carry_over_count,
        status: t.status,
      }))
    ),
    currentStreak: 0,
    velocityBonus: 0,
  });
  const baselineScore = computeScore({
    weightedCompletion,
    consistencyRate,
    disciplineScore,
    currentStreak: 0,
    velocityBonus: 0,
  });
  const delta = baselineScore - pastScore;

  // -- Today's tile: tasks bucketed to today (by completed_at OR due_date).
  const todayTasks = tasks.filter(
    (t) => bucketDate(t, timezone) === localDate
  );
  const todayCompleted = todayTasks.filter((t) => t.status === "completed");
  const todayWeighted = computeWeightedCompletion(
    todayTasks.map((t) => ({ status: t.status, priority: t.priority }))
  );

  const active = todayCompleted.length > 0;

  const { drivers, weakSignals } = explain(
    windowTasks,
    todayTasks,
    {
      weightedCompletion,
      consistencyRate,
      disciplineScore,
      streak,
      active,
    }
  );

  return {
    score,
    tier: getTier(score),
    streak,
    weightedCompletion,
    consistencyRate: Math.round(consistencyRate),
    disciplineScore,
    velocityBonus,
    streakBonus,
    delta,
    today: {
      completed: todayCompleted.length,
      total: todayTasks.length,
      weightedCompletion: todayWeighted,
    },
    drivers,
    weakSignals,
    active,
    timezone,
    asOf: asOf.toISOString(),
    localDate,
  };
}

async function fetchUserTimezone(
  db: SupabaseClient<Database>,
  userId: string
): Promise<string> {
  const { data } = await db
    .from("notification_settings")
    .select("timezone")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.timezone || DEFAULT_TIMEZONE;
}

/** Bucket a task to a local date: prefer completed_at when present, else due_date. */
function bucketDate(t: TaskRow, timezone: string): string {
  const ts = t.completed_at ?? t.due_date;
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  return shiftLocalDate(d, timezone, 0);
}

/** Window inclusion: the task's bucket date is in [start, end] inclusive. */
function isInWindow(t: TaskRow, start: string, end: string): boolean {
  const bucket = bucketDateUtc(t);
  if (!bucket) return false;
  return bucket >= start && bucket <= end;
}

/** Lossy UTC bucket for inclusion checks where we only need ordinal comparison. */
function bucketDateUtc(t: TaskRow): string {
  const ts = t.completed_at ?? t.due_date;
  if (!ts) return "";
  // Cheap UTC slice — the exact local boundary is enforced upstream by
  // localToday/shiftLocalDate. This gets used only for inclusion comparisons
  // which need a stable ordering, not exact local-day membership.
  return ts.slice(0, 10);
}

/**
 * Build the human-readable "why" — one line for the widget plus a list of
 * weak signals the AI coach can lean on. We pick the highest-signal driver
 * and drag from the window.
 */
function explain(
  windowTasks: TaskRow[],
  todayTasks: TaskRow[],
  inputs: {
    weightedCompletion: number;
    consistencyRate: number;
    disciplineScore: number;
    streak: number;
    active: boolean;
  }
): { drivers: { top: string; drag: string | null }; weakSignals: WeakSignal[] } {
  const weakSignals: WeakSignal[] = [];

  // Driver — what's pulling the score up.
  let top = "Working on it.";
  const completedHigh = windowTasks.filter(
    (t) => t.status === "completed" && t.priority === "high"
  ).length;
  const completedTotal = windowTasks.filter(
    (t) => t.status === "completed"
  ).length;
  if (inputs.streak >= 7) {
    top = `${inputs.streak}-day streak`;
  } else if (completedHigh > 0) {
    top = `${completedHigh} high-priority ${completedHigh === 1 ? "task" : "tasks"} completed`;
  } else if (completedTotal > 0) {
    top = `${completedTotal} completed in the last 14 days`;
  } else if (todayTasks.length > 0) {
    top = `${todayTasks.length} ${todayTasks.length === 1 ? "task" : "tasks"} planned today`;
  }

  // Drag — what's pulling it down. Surfaces the worst chronic carry-over,
  // else low completion, else a recent streak break.
  let drag: string | null = null;
  const chronic = windowTasks
    .filter((t) => t.carry_over_count >= 3 && t.status !== "completed")
    .sort((a, b) => b.carry_over_count - a.carry_over_count);
  if (chronic.length > 0) {
    const worst = chronic[0];
    drag = `"${worst.title}" carried ${worst.carry_over_count}×`;
    weakSignals.push({
      kind: "chronic_carry_over",
      detail: `${chronic.length} chronic carry-over${chronic.length > 1 ? "s" : ""}; worst is "${worst.title}" at ${worst.carry_over_count}`,
    });
  } else if (inputs.weightedCompletion < 40 && windowTasks.length > 0) {
    drag = `Only ${inputs.weightedCompletion}% completion in the last 14 days`;
    weakSignals.push({
      kind: "low_completion",
      detail: `Weighted completion is ${inputs.weightedCompletion}% over the last 14 days`,
    });
  } else if (inputs.streak === 0 && windowTasks.length > 0) {
    drag = "No completions today";
    weakSignals.push({
      kind: "broken_streak",
      detail: "No tasks completed today",
    });
  }

  if (windowTasks.length === 0) {
    weakSignals.push({
      kind: "no_activity",
      detail: "No tasks in the last 14 days",
    });
  }

  return { drivers: { top, drag }, weakSignals };
}
