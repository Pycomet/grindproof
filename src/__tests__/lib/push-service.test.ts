import { beforeEach, describe, expect, it, vi } from "vitest";

const sendNotificationMock = vi.fn();
const setVapidDetailsMock = vi.fn();

const selectEqMock = vi.fn();
const selectMock = vi.fn(() => ({
  eq: selectEqMock,
}));

const updateEqMock = vi.fn();
const updateMock = vi.fn(() => ({
  eq: updateEqMock,
}));

const fromMock = vi.fn((table: string) => {
  if (table === "push_subscriptions") {
    return {
      select: selectMock,
      update: updateMock,
    };
  }
  return {
    select: selectMock,
    update: updateMock,
  };
});

vi.mock("web-push", () => ({
  default: {
    sendNotification: sendNotificationMock,
    setVapidDetails: setVapidDetailsMock,
  },
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: fromMock,
  })),
}));

describe("push-service", () => {
  beforeEach(() => {
    vi.resetModules();
    sendNotificationMock.mockReset();
    setVapidDetailsMock.mockReset();
    selectEqMock.mockReset();
    updateEqMock.mockReset();
    fromMock.mockClear();

    selectEqMock.mockReturnThis();
    updateEqMock.mockResolvedValue({ data: null, error: null });
  });

  it("sends push payload to each subscription for a user", async () => {
    selectEqMock.mockImplementationOnce(() => ({
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            endpoint: "https://push-1",
            p256dh_key: "p256-1",
            auth_key: "auth-1",
          },
          {
            endpoint: "https://push-2",
            p256dh_key: "p256-2",
            auth_key: "auth-2",
          },
        ],
        error: null,
      }),
    }));

    const mod = await import("@/lib/notifications/push-service");

    const result = await mod.sendPushToUser("user-1", {
      title: "Plan tomorrow",
      body: "Brutal week. Plan tomorrow.",
      url: "/dashboard#morning-checkin",
      tag: "reengagement",
    });

    expect(sendNotificationMock).toHaveBeenCalledTimes(2);
    expect(result.successful).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.expired).toEqual([]);

    const payloadArg = sendNotificationMock.mock.calls[0][1] as string;
    expect(payloadArg).toContain("Plan tomorrow");
    expect(payloadArg).toContain("/dashboard#morning-checkin");

    const optionsArg = sendNotificationMock.mock.calls[0][2] as {
      urgency?: string;
      TTL?: number;
    };
    expect(optionsArg.urgency).toBe("high");
    expect(optionsArg.TTL).toBe(3600);
  });

  it("allows overriding urgency and TTL per notification", async () => {
    selectEqMock.mockImplementationOnce(() => ({
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            endpoint: "https://push-1",
            p256dh_key: "p256-1",
            auth_key: "auth-1",
          },
        ],
        error: null,
      }),
    }));

    const mod = await import("@/lib/notifications/push-service");

    await mod.sendPushToUser("user-1", {
      title: "Weekly Roast",
      body: "The receipts are in.",
      urgency: "normal",
      ttl: 86400,
    });

    const optionsArg = sendNotificationMock.mock.calls[0][2] as {
      urgency?: string;
      TTL?: number;
    };
    expect(optionsArg.urgency).toBe("normal");
    expect(optionsArg.TTL).toBe(86400);
  });

  it("deactivates expired subscriptions on 410", async () => {
    selectEqMock.mockImplementationOnce(() => ({
      eq: vi.fn().mockResolvedValue({
        data: [
          {
            endpoint: "https://expired-endpoint",
            p256dh_key: "p256",
            auth_key: "auth",
          },
        ],
        error: null,
      }),
    }));

    sendNotificationMock.mockRejectedValue({ statusCode: 410 });

    const mod = await import("@/lib/notifications/push-service");

    const result = await mod.sendPushToUser("user-1", {
      title: "Time to plan",
      body: "Plan your day",
      url: "/dashboard",
    });

    expect(result.successful).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.expired).toEqual(["https://expired-endpoint"]);
    expect(updateMock).toHaveBeenCalled();
    expect(updateEqMock).toHaveBeenCalledWith(
      "endpoint",
      "https://expired-endpoint"
    );
  });
});
