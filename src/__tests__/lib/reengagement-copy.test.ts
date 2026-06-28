import { describe, expect, it } from "vitest";

import {
  getReengagementCopy,
  SAFE_REENTRY_THRESHOLD_DAYS,
} from "@/lib/notifications/reengagement-copy";

describe("reengagement copy", () => {
  it("returns standard nudge for a single missed day", () => {
    const copy = getReengagementCopy(1);

    expect(copy.subject).toContain("Yesterday");
    expect(copy.cta).toBe("Plan today");
  });

  it("returns safe re-entry copy at threshold", () => {
    const copy = getReengagementCopy(SAFE_REENTRY_THRESHOLD_DAYS);

    expect(copy.subject).toContain("Brutal week");
    expect(copy.cta).toBe("Plan tomorrow");
  });

  it("returns safe re-entry copy beyond threshold", () => {
    const copy = getReengagementCopy(6);

    expect(copy.title).toContain("missed days");
    expect(copy.body).toContain("door open");
  });
});
