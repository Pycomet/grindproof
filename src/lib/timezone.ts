/**
 * Reliable timezone utilities for cron routes.
 * Uses Intl.DateTimeFormat parts extraction instead of toLocaleString parsing,
 * which is fragile across serverless runtimes.
 */

interface UserLocalTime {
  hour: number;
  minute: number;
  day: number; // 0 = Sunday
  year: number;
  month: number; // 1-indexed
  date: number;
}

/** Get a user's current local time components from a timezone string. */
export function getUserLocalTime(now: Date, timezone: string): UserLocalTime {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "0";

  const weekdayStr = get("weekday");
  const dayMap: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };

  return {
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    day: dayMap[weekdayStr] ?? 0,
    year: Number(get("year")),
    month: Number(get("month")),
    date: Number(get("day")),
  };
}

/**
 * Return the offset (UTC minus zone, in minutes) for a given instant in a
 * given IANA timezone. e.g. "America/New_York" during EST returns 300.
 *
 * Uses Intl.DateTimeFormat's longOffset (e.g. "GMT-05:00") so it correctly
 * reflects the offset *at the supplied instant*, including DST transitions.
 */
function getZoneOffsetMinutes(at: Date, timezone: string): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    timeZoneName: "longOffset",
  });
  const part = fmt
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;

  // longOffset is "GMT", "GMT+HH:MM", or "GMT-HH:MM".
  if (!part || part === "GMT") return 0;
  const m = /^GMT([+-])(\d{1,2}):?(\d{2})?$/.exec(part);
  if (!m) return 0;
  const sign = m[1] === "+" ? 1 : -1;
  const hours = Number(m[2]);
  const mins = Number(m[3] ?? "0");
  // longOffset is "zone minus UTC" (e.g. EST = GMT-05:00).
  // We return "UTC minus zone" so callers can do `utc = local + offset`.
  return -sign * (hours * 60 + mins);
}

/**
 * Compute the UTC instant of midnight on `dateStr` (YYYY-MM-DD) in `timezone`.
 *
 * The naive trick — apply `now`'s offset to the target date — fails on DST
 * transition days because the offset at `now` may differ from the offset at
 * the target midnight. We resolve this by computing a candidate UTC instant
 * using the offset at `now`, then querying the offset at *that candidate*
 * and adjusting once. One iteration suffices except in the ambiguous-hour
 * window during fall-back, which we resolve to the later instant (matching
 * how most calendar apps handle it).
 */
function midnightInZoneToUtc(
  dateStr: string,
  timezone: string,
  hint: Date
): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  // Treat the date components as UTC to compute a stable wall-clock anchor.
  const wallClockUtcMs = Date.UTC(y, m - 1, d, 0, 0, 0, 0);

  // First guess uses hint's offset.
  const offset1 = getZoneOffsetMinutes(hint, timezone);
  const candidate1 = new Date(wallClockUtcMs + offset1 * 60_000);

  // Re-query the offset at the candidate and adjust if it differs.
  const offset2 = getZoneOffsetMinutes(candidate1, timezone);
  if (offset2 === offset1) return candidate1;
  return new Date(wallClockUtcMs + offset2 * 60_000);
}

/**
 * Get start-of-day and end-of-day as UTC ISO strings for a given date
 * in the user's timezone. Useful for querying tasks "due today" relative
 * to the user's local calendar.
 *
 * DST-safe: end-of-day is computed as `nextDayMidnight - 1ms`, so the day
 * is correctly 23h or 25h on transition dates.
 */
export function getUserDateBounds(
  now: Date,
  timezone: string,
  offsetDays = 0
): { start: string; end: string } {
  const local = getUserLocalTime(now, timezone);

  // Build the target date and the day after, normalized via Date.UTC so
  // month/day rollover is handled by the JS engine.
  const targetUtc = new Date(
    Date.UTC(local.year, local.month - 1, local.date + offsetDays)
  );
  const nextUtc = new Date(
    Date.UTC(local.year, local.month - 1, local.date + offsetDays + 1)
  );

  const targetStr = targetUtc.toISOString().split("T")[0];
  const nextStr = nextUtc.toISOString().split("T")[0];

  const startUtc = midnightInZoneToUtc(targetStr, timezone, now);
  const nextMidnightUtc = midnightInZoneToUtc(nextStr, timezone, now);

  // End-of-day = next-day-midnight minus 1 ms. On DST days this naturally
  // produces a 23h or 25h day length.
  const endUtc = new Date(nextMidnightUtc.getTime() - 1);

  return {
    start: startUtc.toISOString(),
    end: endUtc.toISOString(),
  };
}
