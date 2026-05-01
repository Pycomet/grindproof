/**
 * Timezone-aware date utilities for the streak engine.
 *
 * The streak counts consecutive days where the user completed at least one
 * task, where "day" means the user's local calendar day — not the server's
 * UTC day. Composes the DST-correct primitives in src/lib/timezone.ts.
 */

import { getUserDateBounds, getUserLocalTime } from "@/lib/timezone";

export interface CompletionRow {
  /** Task.completed_at as ISO string. May be null for non-completed tasks. */
  completed_at: string | null;
}

/**
 * Build the set of local-date strings (YYYY-MM-DD) on which the user
 * completed at least one task. The grouping happens in the user's timezone,
 * so a completion at 11pm Tokyo on Monday lands on Monday — not Tuesday UTC.
 */
export function localDatesWithCompletions(
  completions: CompletionRow[],
  timezone: string
): Set<string> {
  const dates = new Set<string>();
  for (const row of completions) {
    if (!row.completed_at) continue;
    const local = getUserLocalTime(new Date(row.completed_at), timezone);
    dates.add(formatLocalDate(local.year, local.month, local.date));
  }
  return dates;
}

/**
 * Walk backwards from `asOf` (the user's "today") and count consecutive
 * local dates that appear in `activeDates`. Stops at the first gap. Caps at
 * `maxDays` to bound the loop on very long streaks.
 */
export function countStreak(
  activeDates: Set<string>,
  asOf: Date,
  timezone: string,
  maxDays = 365
): number {
  let streak = 0;
  for (let i = 0; i < maxDays; i++) {
    const candidate = shiftLocalDate(asOf, timezone, -i);
    if (activeDates.has(candidate)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Compute the local-date string (YYYY-MM-DD) for `asOf` shifted by
 * `offsetDays` in the user's timezone. DST-safe via getUserDateBounds, which
 * resolves the candidate by calling Intl with the correct offset at the
 * target instant.
 */
export function shiftLocalDate(
  asOf: Date,
  timezone: string,
  offsetDays: number
): string {
  const bounds = getUserDateBounds(asOf, timezone, offsetDays);
  // bounds.start is the UTC instant of local-midnight on the target date.
  // Asking Intl for the local date components at that instant gives us
  // back the date string we want, regardless of DST gymnastics.
  const local = getUserLocalTime(new Date(bounds.start), timezone);
  return formatLocalDate(local.year, local.month, local.date);
}

/** Today's local-date string in the given timezone. */
export function localToday(asOf: Date, timezone: string): string {
  return shiftLocalDate(asOf, timezone, 0);
}

/**
 * Inclusive list of local-date strings from `daysBack` ago through today.
 * Used to render trend axes and to seed snapshot lookups.
 */
export function localDateRange(
  asOf: Date,
  timezone: string,
  daysBack: number
): string[] {
  const out: string[] = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    out.push(shiftLocalDate(asOf, timezone, -i));
  }
  return out;
}

function formatLocalDate(year: number, month: number, date: number): string {
  return `${year}-${pad2(month)}-${pad2(date)}`;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
