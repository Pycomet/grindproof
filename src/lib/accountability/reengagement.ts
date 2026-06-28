import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/types";
import { shiftLocalDate } from "@/lib/accountability/active-day";

function localDateFromIso(iso: string, timezone: string): string {
  return shiftLocalDate(new Date(iso), timezone, 0);
}

function toUtcStart(localDate: string): string {
  return `${localDate}T00:00:00.000Z`;
}

function toUtcEnd(localDate: string): string {
  return `${localDate}T23:59:59.999Z`;
}

export async function wasActiveOnLocalDate(
  db: SupabaseClient<Database>,
  userId: string,
  timezone: string,
  localDate: string
): Promise<boolean> {
  const [checksRes, completionsRes] = await Promise.all([
    db
      .from("daily_checks")
      .select("created_at")
      .eq("user_id", userId)
      .gte("created_at", toUtcStart(localDate))
      .lte("created_at", toUtcEnd(localDate)),
    db
      .from("tasks")
      .select("completed_at")
      .eq("user_id", userId)
      .eq("status", "completed")
      .gte("completed_at", toUtcStart(localDate))
      .lte("completed_at", toUtcEnd(localDate)),
  ]);

  if (checksRes.error) throw checksRes.error;
  if (completionsRes.error) throw completionsRes.error;

  const hadCheckIn = (checksRes.data ?? []).some(
    (row) => localDateFromIso(row.created_at, timezone) === localDate
  );

  const hadCompletion = (completionsRes.data ?? []).some(
    (row) =>
      !!row.completed_at &&
      localDateFromIso(row.completed_at, timezone) === localDate
  );

  return hadCheckIn || hadCompletion;
}

export async function countMissedDaysInRange(
  db: SupabaseClient<Database>,
  userId: string,
  timezone: string,
  days: number,
  asOf: Date
): Promise<number> {
  let missed = 0;

  for (let i = 0; i < days; i++) {
    const date = shiftLocalDate(asOf, timezone, -i);
    const active = await wasActiveOnLocalDate(db, userId, timezone, date);
    if (!active) missed += 1;
  }

  return missed;
}
