import { describe, it, expect } from "vitest";
import { getUserDateBounds, getUserLocalTime } from "@/lib/timezone";

const MS_PER_HOUR = 60 * 60 * 1000;

function hours(ms: number): number {
  return Math.round(ms / MS_PER_HOUR);
}

describe("getUserDateBounds — DST safety", () => {
  // 2026-03-08: US spring-forward. America/New_York jumps from EST (UTC-5)
  // to EDT (UTC-4) at 02:00 local. The day is 23h long.
  it("produces a 23h day on US spring-forward (America/New_York, 2026-03-08)", () => {
    const now = new Date("2026-03-08T12:00:00Z"); // 07:00 EST → 08:00 EDT (post-jump)
    const { start, end } = getUserDateBounds(now, "America/New_York", 0);
    const len = new Date(end).getTime() - new Date(start).getTime() + 1;
    expect(hours(len)).toBe(23);
  });

  // 2026-11-01: US fall-back. America/New_York drops from EDT (UTC-4) to
  // EST (UTC-5) at 02:00 local. The day is 25h long.
  it("produces a 25h day on US fall-back (America/New_York, 2026-11-01)", () => {
    const now = new Date("2026-11-01T12:00:00Z");
    const { start, end } = getUserDateBounds(now, "America/New_York", 0);
    const len = new Date(end).getTime() - new Date(start).getTime() + 1;
    expect(hours(len)).toBe(25);
  });

  it("returns yesterday's bounds correctly across a DST boundary (offsetDays=-1)", () => {
    // Cron fires at 09:00 EDT on the day after spring-forward (2026-03-09).
    // Yesterday (2026-03-08) was the 23h DST-jump day. The bounds should
    // span exactly that 23h, not a buggy 22h or 24h.
    const now = new Date("2026-03-09T13:00:00Z"); // 09:00 EDT
    const { start, end } = getUserDateBounds(now, "America/New_York", -1);
    const len = new Date(end).getTime() - new Date(start).getTime() + 1;
    expect(hours(len)).toBe(23);
    // Sanity: start should be the prior local midnight (in UTC, that's 05:00 EST = 10:00Z).
    expect(start).toBe("2026-03-08T05:00:00.000Z");
  });

  it("returns a normal 24h day for a non-DST date", () => {
    const now = new Date("2026-04-15T12:00:00Z");
    const { start, end } = getUserDateBounds(now, "America/New_York", 0);
    const len = new Date(end).getTime() - new Date(start).getTime() + 1;
    expect(hours(len)).toBe(24);
  });

  it("handles UTC timezone (no offset, 24h)", () => {
    const now = new Date("2026-04-26T12:34:56Z");
    const { start, end } = getUserDateBounds(now, "UTC", 0);
    expect(start).toBe("2026-04-26T00:00:00.000Z");
    expect(end).toBe("2026-04-26T23:59:59.999Z");
  });

  it("handles a positive-offset zone (Asia/Tokyo, +09:00)", () => {
    const now = new Date("2026-04-26T03:00:00Z"); // 12:00 JST
    const { start } = getUserDateBounds(now, "Asia/Tokyo", 0);
    // Local midnight in Tokyo on 2026-04-26 is 2026-04-25T15:00:00Z.
    expect(start).toBe("2026-04-25T15:00:00.000Z");
  });
});

describe("getUserLocalTime — sanity", () => {
  it("returns 00:00 on Sunday for 2026-04-26 UTC", () => {
    const now = new Date("2026-04-26T00:00:00Z");
    const local = getUserLocalTime(now, "UTC");
    expect(local.day).toBe(0); // Sunday
    expect(local.hour).toBe(0);
    expect(local.year).toBe(2026);
    expect(local.month).toBe(4);
    expect(local.date).toBe(26);
  });
});
