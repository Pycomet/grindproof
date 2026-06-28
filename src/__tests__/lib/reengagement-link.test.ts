import { describe, expect, it } from "vitest";

import {
  createReengagementLink,
  verifyReengagementSignature,
} from "@/lib/notifications/reengagement-link";

describe("reengagement link", () => {
  it("builds a signed URL with required params", () => {
    const link = createReengagementLink("user-1", "2026-06-28");

    expect(link).toContain("uid=user-1");
    expect(link).toContain("day=2026-06-28");
    expect(link).toContain("sig=");
  });

  it("validates a generated signature", () => {
    const link = createReengagementLink("user-1", "2026-06-28");
    const url = new URL(link);

    const uid = url.searchParams.get("uid")!;
    const day = url.searchParams.get("day")!;
    const sig = url.searchParams.get("sig")!;

    expect(verifyReengagementSignature(uid, day, sig)).toBe(true);
    expect(verifyReengagementSignature(uid, day, "wrong")).toBe(false);
  });
});
