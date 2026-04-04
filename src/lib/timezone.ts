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
 * Get start-of-day and end-of-day as UTC ISO strings for a given date
 * in the user's timezone. Useful for querying tasks "due today" relative
 * to the user's local calendar.
 */
export function getUserDateBounds(
  now: Date,
  timezone: string,
  offsetDays = 0
): { start: string; end: string } {
  const local = getUserLocalTime(now, timezone);

  // Build a date string in the user's local timezone
  const targetDate = new Date(
    Date.UTC(local.year, local.month - 1, local.date + offsetDays)
  );

  // Create midnight and end-of-day in the user's timezone using Intl
  // We construct ISO date strings and let the timezone offset do the work
  const dateStr = targetDate.toISOString().split("T")[0]; // YYYY-MM-DD

  // Use a temporary date at midnight in the target timezone
  const midnightLocal = new Date(
    new Date(`${dateStr}T00:00:00`).toLocaleString("en-US", { timeZone: "UTC" })
  );

  // Calculate the offset between UTC and user timezone at this moment
  const utcFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const tzFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });

  const utcParts = utcFormatter.formatToParts(now);
  const tzParts = tzFormatter.formatToParts(now);
  const utcHour = Number(utcParts.find((p) => p.type === "hour")?.value ?? 0);
  const utcMin = Number(utcParts.find((p) => p.type === "minute")?.value ?? 0);
  const tzHour = Number(tzParts.find((p) => p.type === "hour")?.value ?? 0);
  const tzMin = Number(tzParts.find((p) => p.type === "minute")?.value ?? 0);

  const offsetMs =
    (utcHour * 60 + utcMin - (tzHour * 60 + tzMin)) * 60 * 1000;

  // Midnight in user's timezone, expressed as UTC
  const startUtc = new Date(midnightLocal.getTime() + offsetMs);
  // End of day in user's timezone, expressed as UTC
  const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000 - 1);

  return {
    start: startUtc.toISOString(),
    end: endUtc.toISOString(),
  };
}
