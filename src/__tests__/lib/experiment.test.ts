import { describe, expect, it, vi, beforeEach } from "vitest";

const getFeatureFlagMock = vi.fn();
const captureMock = vi.fn();
const shutdownMock = vi.fn();

vi.mock("posthog-node", () => ({
  PostHog: class {
    getFeatureFlag = getFeatureFlagMock;
    capture = captureMock;
    shutdown = shutdownMock;
  },
}));

describe("getRetentionNudgeVariant", () => {
  beforeEach(() => {
    vi.resetModules();
    getFeatureFlagMock.mockReset();
    captureMock.mockReset();
    shutdownMock.mockReset();
  });

  it("returns treatment when feature flag resolves treatment", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
    getFeatureFlagMock.mockResolvedValue("treatment");

    const { getRetentionNudgeVariant } = await import("@/lib/posthog/experiment");

    const variant = await getRetentionNudgeVariant("user-1");

    expect(variant).toBe("treatment");
    expect(captureMock).toHaveBeenCalled();
  });

  it("falls back to control on errors", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "phc_test";
    getFeatureFlagMock.mockRejectedValue(new Error("network"));

    const { getRetentionNudgeVariant } = await import("@/lib/posthog/experiment");

    const variant = await getRetentionNudgeVariant("user-1");

    expect(variant).toBe("control");
  });
});
