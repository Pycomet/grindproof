import type { SupabaseClient } from "@supabase/supabase-js";

import { shiftLocalDate } from "@/lib/accountability/active-day";
import type { Database } from "@/lib/supabase/types";
import { getUserDateBounds } from "@/lib/timezone";

export interface LapseProfile {
  daysSinceLastActive: number;
  missedDaysLast7: number;
  isReturningFromBadWeek: boolean;
  hadActivityToday: boolean;
}

export const BAD_WEEK_THRESHOLD = 3;

interface DailyActivity {
  localDate: string;
  active: boolean;
}

async function getDailyActivity(
  db: SupabaseClient<Database>,
  userId: string,
  timezone: string,
  asOf: Date,
  days: number
): Promise<DailyActivity[]> {
  const oldest = shiftLocalDate(asOf, timezone, -(days - 1));
  const newest = shiftLocalDate(asOf, timezone, 0);

  const oldestBounds = getUserDateBounds(asOf, timezone, -(days - 1));
  const newestBounds = getUserDateBounds(asOf, timezone, 0);

  const [{ data: checks, error: checksError }, { data: completions, error: completionsError }] =
    await Promise.all([
      db
        .from("daily_checks")
        .select("created_at")
        .eq("user_id", userId)
        .gte("created_at", oldestBounds.start)
        .lte("created_at", newestBounds.end),
      db
        .from("tasks")
        .select("completed_at")
        .eq("user_id", userId)
        .eq("status", "completed")
        .gte("completed_at", oldestBounds.start)
        .lte("completed_at", newestBounds.end),
    ]);

  if (checksError) throw checksError;
  if (completionsError) throw completionsError;

  const activeDates = new Set<string>();

  for (const row of checks ?? []) {
    const localDate = shiftLocalDate(new Date(row.created_at), timezone, 0);
    activeDates.add(localDate);
  }

  for (const row of completions ?? []) {
    if (!row.completed_at) continue;
    const localDate = shiftLocalDate(new Date(row.completed_at), timezone, 0);
    activeDates.add(localDate);
  }

  const out: DailyActivity[] = [];

  let cursor = oldest;
  while (cursor <= newest) {
    out.push({ localDate: cursor, active: activeDates.has(cursor) });
    const next = new Date(`${cursor}T00:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    cursor = next.toISOString().slice(0, 10);
  }

  return out;
}

export async function getLapseProfile(
  db: SupabaseClient<Database>,
  userId: string,
  timezone: string,
  asOf = new Date()
): Promise<LapseProfile> {
  const days = 14;
  const activity = await getDailyActivity(db, userId, timezone, asOf, days);
  const todayLocal = shiftLocalDate(asOf, timezone, 0);

  const hadActivityToday =
    activity.find((d) => d.localDate === todayLocal)?.active ?? false;

  const missedDaysLast7 = activity
    .slice(-7)
    .filter((d) => !d.active).length;

  let daysSinceLastActive = activity.length;
  for (let i = activity.length - 1; i >= 0; i--) {
    if (activity[i].active) {
      daysSinceLastActive = activity.length - 1 - i;
      break;
    }
  }

  const isReturningFromBadWeek =
    daysSinceLastActive >= 1 && missedDaysLast7 >= BAD_WEEK_THRESHOLD;

  return {
    daysSinceLastActive,
    missedDaysLast7,
    isReturningFromBadWeek,
    hadActivityToday,
  };
}
