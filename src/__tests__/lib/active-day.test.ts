import { describe, it, expect } from "vitest";
import {
  localDatesWithCompletions,
  countStreak,
  shiftLocalDate,
  localToday,
  localDateRange,
} from "@/lib/accountability/active-day";

// =========================================================================
// localDatesWithCompletions — groups completion timestamps by USER-LOCAL day
// =========================================================================
describe("localDatesWithCompletions", () => {
  it("ignores rows with null completed_at", () => {
    const dates = localDatesWithCompletions(
      [{ completed_at: null }, { completed_at: null }],
      "UTC"
    );
    expect(dates.size).toBe(0);
  });

  it("buckets by Tokyo local day even when stored in UTC", () => {
    // 2026-04-29 14:00 UTC = 2026-04-29 23:00 Tokyo (still Monday local)
    // 2026-04-29 16:00 UTC = 2026-04-30 01:00 Tokyo (Tuesday local!)
    const dates = localDatesWithCompletions(
      [
        { completed_at: "2026-04-29T14:00:00Z" },
        { completed_at: "2026-04-29T16:00:00Z" },
      ],
      "Asia/Tokyo"
    );
    expect(dates.has("2026-04-29")).toBe(true);
    expect(dates.has("2026-04-30")).toBe(true);
    expect(dates.size).toBe(2);
  });

  it("buckets by LA local day across UTC midnight", () => {
    // 2026-04-29 02:00 UTC = 2026-04-28 19:00 LA (still Tuesday local)
    // 2026-04-29 23:00 UTC = 2026-04-29 16:00 LA (Wednesday local)
    const dates = localDatesWithCompletions(
      [
        { completed_at: "2026-04-29T02:00:00Z" },
        { completed_at: "2026-04-29T23:00:00Z" },
      ],
      "America/Los_Angeles"
    );
    expect(dates.has("2026-04-28")).toBe(true);
    expect(dates.has("2026-04-29")).toBe(true);
  });

  it("collapses multiple completions on the same local day to one entry", () => {
    const dates = localDatesWithCompletions(
      [
        { completed_at: "2026-04-29T08:00:00Z" },
        { completed_at: "2026-04-29T14:00:00Z" },
        { completed_at: "2026-04-29T20:00:00Z" },
      ],
      "UTC"
    );
    expect(dates.size).toBe(1);
    expect(dates.has("2026-04-29")).toBe(true);
  });
});

// =========================================================================
// countStreak — walks backwards from `asOf` in the user's timezone
// =========================================================================
describe("countStreak", () => {
  it("returns 0 when today is not in the active set", () => {
    const dates = new Set(["2026-04-27", "2026-04-28"]);
    const asOf = new Date("2026-04-29T12:00:00Z");
    expect(countStreak(dates, asOf, "UTC")).toBe(0);
  });

  it("counts a single-day streak", () => {
    const dates = new Set(["2026-04-29"]);
    const asOf = new Date("2026-04-29T12:00:00Z");
    expect(countStreak(dates, asOf, "UTC")).toBe(1);
  });

  it("counts a 5-day consecutive streak", () => {
    const dates = new Set([
      "2026-04-25",
      "2026-04-26",
      "2026-04-27",
      "2026-04-28",
      "2026-04-29",
    ]);
    const asOf = new Date("2026-04-29T12:00:00Z");
    expect(countStreak(dates, asOf, "UTC")).toBe(5);
  });

  it("stops at the first gap", () => {
    const dates = new Set([
      "2026-04-25", // gap before this
      "2026-04-27",
      "2026-04-28",
      "2026-04-29",
    ]);
    const asOf = new Date("2026-04-29T12:00:00Z");
    expect(countStreak(dates, asOf, "UTC")).toBe(3);
  });

  it("respects the user's timezone — Tokyo user at 11pm local has today active", () => {
    // 2026-04-29 14:00 UTC = 2026-04-29 23:00 Tokyo. The completion at this
    // instant should count for Monday (2026-04-29) in Tokyo, and the streak
    // walked from `now = same instant` should include today.
    const dates = localDatesWithCompletions(
      [{ completed_at: "2026-04-29T14:00:00Z" }],
      "Asia/Tokyo"
    );
    const asOf = new Date("2026-04-29T14:00:00Z");
    expect(countStreak(dates, asOf, "Asia/Tokyo")).toBe(1);
  });

  it("LA user at 11pm local on the day before UTC midnight still counts that local day", () => {
    // 2026-04-29 06:00 UTC = 2026-04-28 23:00 LA. completed_at at this
    // instant lives in the LA-local 2026-04-28 bucket, and walking the
    // streak from the same instant in LA also lands on 2026-04-28.
    const dates = localDatesWithCompletions(
      [{ completed_at: "2026-04-29T06:00:00Z" }],
      "America/Los_Angeles"
    );
    const asOf = new Date("2026-04-29T06:00:00Z");
    expect(countStreak(dates, asOf, "America/Los_Angeles")).toBe(1);
  });
});

// =========================================================================
// shiftLocalDate / localToday — DST safety
// =========================================================================
describe("shiftLocalDate (DST safety)", () => {
  it("today and tomorrow are exactly one calendar day apart on a normal day", () => {
    const asOf = new Date("2026-04-29T12:00:00Z");
    expect(shiftLocalDate(asOf, "UTC", 0)).toBe("2026-04-29");
    expect(shiftLocalDate(asOf, "UTC", 1)).toBe("2026-04-30");
    expect(shiftLocalDate(asOf, "UTC", -1)).toBe("2026-04-28");
  });

  it("US spring-forward (2026-03-08 in America/Los_Angeles) shifts cleanly", () => {
    // The night of Saturday 2026-03-07 → Sunday 2026-03-08 loses an hour
    // (2am→3am). Our day labels must still increment 1-by-1 across the
    // transition.
    const asOf = new Date("2026-03-09T12:00:00Z"); // Monday, after the jump
    expect(shiftLocalDate(asOf, "America/Los_Angeles", 0)).toBe("2026-03-09");
    expect(shiftLocalDate(asOf, "America/Los_Angeles", -1)).toBe("2026-03-08");
    expect(shiftLocalDate(asOf, "America/Los_Angeles", -2)).toBe("2026-03-07");
    expect(shiftLocalDate(asOf, "America/Los_Angeles", -3)).toBe("2026-03-06");
  });

  it("US fall-back (2026-11-01 in America/Los_Angeles) shifts cleanly", () => {
    // The night of Saturday 2026-10-31 → Sunday 2026-11-01 gains an hour
    // (2am→1am). Day labels still increment 1-by-1.
    const asOf = new Date("2026-11-02T12:00:00Z"); // Monday after fall-back
    expect(shiftLocalDate(asOf, "America/Los_Angeles", 0)).toBe("2026-11-02");
    expect(shiftLocalDate(asOf, "America/Los_Angeles", -1)).toBe("2026-11-01");
    expect(shiftLocalDate(asOf, "America/Los_Angeles", -2)).toBe("2026-10-31");
  });

  it("month rollover works", () => {
    const asOf = new Date("2026-05-01T12:00:00Z");
    expect(shiftLocalDate(asOf, "UTC", -1)).toBe("2026-04-30");
    expect(shiftLocalDate(asOf, "UTC", -2)).toBe("2026-04-29");
  });

  it("year rollover works", () => {
    const asOf = new Date("2026-01-01T12:00:00Z");
    expect(shiftLocalDate(asOf, "UTC", -1)).toBe("2025-12-31");
  });
});

describe("localToday", () => {
  it("returns the date in the user's timezone, not UTC", () => {
    // 2026-04-29 23:30 Tokyo = 2026-04-29 14:30 UTC. The Tokyo user is on
    // Monday 2026-04-29, even though it's the same UTC day.
    const asOf = new Date("2026-04-29T14:30:00Z");
    expect(localToday(asOf, "Asia/Tokyo")).toBe("2026-04-29");
    expect(localToday(asOf, "UTC")).toBe("2026-04-29");
  });

  it("LA at 11pm local is still 'today' for the user, not tomorrow", () => {
    // 2026-04-29 06:00 UTC = 2026-04-28 23:00 LA.
    const asOf = new Date("2026-04-29T06:00:00Z");
    expect(localToday(asOf, "America/Los_Angeles")).toBe("2026-04-28");
  });
});

// =========================================================================
// localDateRange — used to seed trend axes
// =========================================================================
describe("localDateRange", () => {
  it("returns the requested number of days, ending with today", () => {
    const asOf = new Date("2026-04-29T12:00:00Z");
    const range = localDateRange(asOf, "UTC", 5);
    expect(range).toEqual([
      "2026-04-25",
      "2026-04-26",
      "2026-04-27",
      "2026-04-28",
      "2026-04-29",
    ]);
  });

  it("correctly includes a DST transition day in the range", () => {
    const asOf = new Date("2026-03-10T12:00:00Z");
    const range = localDateRange(asOf, "America/Los_Angeles", 5);
    expect(range).toContain("2026-03-08"); // spring-forward day
    expect(range.length).toBe(5);
  });
});
