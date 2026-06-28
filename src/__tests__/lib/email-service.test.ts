/**
 * Tests for src/lib/notifications/email-service.ts
 *
 * The Resend SDK client is created at module load time, so we mock the
 * entire "resend" package before the module under test is imported.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Resend mock ---------------------------------------------------------
const { mockEmailsSend } = vi.hoisted(() => ({
  mockEmailsSend: vi.fn().mockResolvedValue({ id: "mock-email-id" }),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: mockEmailsSend };
  },
}));

// Import after mocking so the module picks up the mock
import {
  sendMorningEmail,
  sendEveningEmail,
  sendWeeklyRoastEmail,
  sendReengagementEmail,
} from "@/lib/notifications/email-service";

// -------------------------------------------------------------------------

const FROM = "GrindProof <notifications@grindproof.co>";

beforeEach(() => {
  mockEmailsSend.mockClear();
});

// =========================================================================
// sendMorningEmail
// =========================================================================
describe("sendMorningEmail", () => {
  it("calls resend.emails.send with the correct from address and subject", async () => {
    await sendMorningEmail("user@example.com", {
      name: "Alice",
      carriedOverCount: 0,
    });

    expect(mockEmailsSend).toHaveBeenCalledOnce();
    const call = mockEmailsSend.mock.calls[0][0];
    expect(call.from).toBe(FROM);
    expect(call.to).toBe("user@example.com");
    expect(call.subject).toBe("Time to plan your day");
  });

  it("uses personalised greeting when name is provided", async () => {
    await sendMorningEmail("user@example.com", {
      name: "Alice",
      carriedOverCount: 0,
    });

    const { html } = mockEmailsSend.mock.calls[0][0];
    expect(html).toContain("Hey Alice");
  });

  it("uses generic greeting when name is null", async () => {
    await sendMorningEmail("user@example.com", {
      name: null,
      carriedOverCount: 0,
    });

    const { html } = mockEmailsSend.mock.calls[0][0];
    // Should start with "Hey," with no name appended
    expect(html).toContain("<h2");
    expect(html).toContain("Hey,");
    expect(html).not.toContain("Hey null");
  });

  it("shows clean-slate message when carriedOverCount is 0", async () => {
    await sendMorningEmail("user@example.com", {
      name: "Alice",
      carriedOverCount: 0,
    });

    const { html } = mockEmailsSend.mock.calls[0][0];
    expect(html).toContain("Clean slate today.");
  });

  it("shows singular task wording when carriedOverCount is 1", async () => {
    await sendMorningEmail("user@example.com", {
      name: "Alice",
      carriedOverCount: 1,
    });

    const { html } = mockEmailsSend.mock.calls[0][0];
    expect(html).toContain("1 task carried over");
    expect(html).not.toContain("1 tasks");
  });

  it("shows plural task wording when carriedOverCount is greater than 1", async () => {
    await sendMorningEmail("user@example.com", {
      name: "Alice",
      carriedOverCount: 3,
    });

    const { html } = mockEmailsSend.mock.calls[0][0];
    expect(html).toContain("3 tasks carried over");
  });

  it("includes a link to /dashboard", async () => {
    await sendMorningEmail("user@example.com", {
      name: "Alice",
      carriedOverCount: 0,
    });

    const { html } = mockEmailsSend.mock.calls[0][0];
    expect(html).toContain("/dashboard");
  });
});

// =========================================================================
// sendEveningEmail
// =========================================================================
describe("sendEveningEmail", () => {
  it("calls resend.emails.send with the correct from address", async () => {
    await sendEveningEmail("user@example.com", {
      name: "Bob",
      pendingCount: 2,
    });

    expect(mockEmailsSend).toHaveBeenCalledOnce();
    expect(mockEmailsSend.mock.calls[0][0].from).toBe(FROM);
  });

  it("includes pendingCount in the subject line", async () => {
    await sendEveningEmail("user@example.com", {
      name: "Bob",
      pendingCount: 4,
    });

    const { subject } = mockEmailsSend.mock.calls[0][0];
    expect(subject).toContain("4");
    expect(subject).toContain("tasks");
  });

  it("uses singular 'task' in subject when pendingCount is 1", async () => {
    await sendEveningEmail("user@example.com", {
      name: "Bob",
      pendingCount: 1,
    });

    const { subject } = mockEmailsSend.mock.calls[0][0];
    expect(subject).toMatch(/1 task[^s]/); // "1 task " not "1 tasks"
  });

  it("uses plural 'tasks' in subject when pendingCount is 0", async () => {
    await sendEveningEmail("user@example.com", {
      name: "Bob",
      pendingCount: 0,
    });

    const { subject } = mockEmailsSend.mock.calls[0][0];
    expect(subject).toContain("tasks");
  });

  it("uses personalised greeting when name is provided", async () => {
    await sendEveningEmail("user@example.com", {
      name: "Bob",
      pendingCount: 2,
    });

    const { html } = mockEmailsSend.mock.calls[0][0];
    expect(html).toContain("Evening, Bob.");
  });

  it("uses generic greeting when name is null", async () => {
    await sendEveningEmail("user@example.com", {
      name: null,
      pendingCount: 2,
    });

    const { html } = mockEmailsSend.mock.calls[0][0];
    expect(html).toContain("Evening, Hey.");
    expect(html).not.toContain("Evening, null.");
  });

  it("includes a link to /dashboard", async () => {
    await sendEveningEmail("user@example.com", {
      name: "Bob",
      pendingCount: 2,
    });

    const { html } = mockEmailsSend.mock.calls[0][0];
    expect(html).toContain("/dashboard");
  });
});

// =========================================================================
// sendWeeklyRoastEmail
// =========================================================================
describe("sendWeeklyRoastEmail", () => {
  const BASE_DATA = {
    name: "Carol",
    weekSummary: "You had a mediocre week at best.",
    insights: [
      { emoji: "🔥", text: "You completed 80% of high-priority tasks", severity: "positive" as const },
      { emoji: "😬", text: "3 tasks were skipped without explanation", severity: "medium" as const },
      { emoji: "🚨", text: "You missed your daily goal 4 days in a row", severity: "high" as const },
    ],
    recommendations: ["Set fewer tasks each day", "Block time on your calendar"],
    completionRate: 72,
    tasksCompleted: 18,
    tasksTotal: 25,
  };

  it("calls resend.emails.send once", async () => {
    await sendWeeklyRoastEmail("user@example.com", BASE_DATA);
    expect(mockEmailsSend).toHaveBeenCalledOnce();
  });

  it("includes the completion rate in the subject", async () => {
    await sendWeeklyRoastEmail("user@example.com", BASE_DATA);
    const { subject } = mockEmailsSend.mock.calls[0][0];
    expect(subject).toContain("72%");
  });

  it("renders completion rate and task counts in the email body", async () => {
    await sendWeeklyRoastEmail("user@example.com", BASE_DATA);
    const { html } = mockEmailsSend.mock.calls[0][0];
    expect(html).toContain("72%");
    expect(html).toContain("18/25");
  });

  it("renders all insights in the email body", async () => {
    await sendWeeklyRoastEmail("user@example.com", BASE_DATA);
    const { html } = mockEmailsSend.mock.calls[0][0];
    for (const insight of BASE_DATA.insights) {
      expect(html).toContain(insight.text);
      expect(html).toContain(insight.emoji);
    }
  });

  it("renders all recommendations in the email body", async () => {
    await sendWeeklyRoastEmail("user@example.com", BASE_DATA);
    const { html } = mockEmailsSend.mock.calls[0][0];
    for (const rec of BASE_DATA.recommendations) {
      expect(html).toContain(rec);
    }
  });

  it("renders high-severity insights in red (#dc2626)", async () => {
    await sendWeeklyRoastEmail("user@example.com", BASE_DATA);
    const { html } = mockEmailsSend.mock.calls[0][0];
    // The high-severity insight text should appear near the red color
    expect(html).toContain("#dc2626");
    expect(html).toContain("missed your daily goal");
  });

  it("renders positive insights in green (#16a34a)", async () => {
    await sendWeeklyRoastEmail("user@example.com", BASE_DATA);
    const { html } = mockEmailsSend.mock.calls[0][0];
    expect(html).toContain("#16a34a");
    expect(html).toContain("completed 80%");
  });

  it("uses generic greeting when name is null", async () => {
    await sendWeeklyRoastEmail("user@example.com", { ...BASE_DATA, name: null });
    const { html } = mockEmailsSend.mock.calls[0][0];
    expect(html).not.toContain("null,");
    expect(html).toContain("Hey,");
  });

  it("includes the weekSummary text in the body", async () => {
    await sendWeeklyRoastEmail("user@example.com", BASE_DATA);
    const { html } = mockEmailsSend.mock.calls[0][0];
    expect(html).toContain(BASE_DATA.weekSummary);
  });

  it("includes a link to /dashboard", async () => {
    await sendWeeklyRoastEmail("user@example.com", BASE_DATA);
    const { html } = mockEmailsSend.mock.calls[0][0];
    expect(html).toContain("/dashboard");
  });

  it("handles empty insights array without crashing", async () => {
    await expect(
      sendWeeklyRoastEmail("user@example.com", { ...BASE_DATA, insights: [] })
    ).resolves.not.toThrow();
  });

  it("handles empty recommendations array without crashing", async () => {
    await expect(
      sendWeeklyRoastEmail("user@example.com", { ...BASE_DATA, recommendations: [] })
    ).resolves.not.toThrow();
  });
});

describe("sendReengagementEmail", () => {
  it("sends email with provided subject and CTA link", async () => {
    await sendReengagementEmail("user@example.com", {
      name: "Alex",
      subject: "Brutal week. Don't disappear now.",
      title: "Brutal stretch: 4 missed days.",
      body: "Most people quit right here.",
      cta: "Plan tomorrow",
      url: "https://grindproof.co/dashboard?uid=u1&day=2026-06-28&sig=abc",
    });

    expect(mockEmailsSend).toHaveBeenCalledOnce();
    const { subject, html } = mockEmailsSend.mock.calls[0][0];
    expect(subject).toContain("Brutal week");
    expect(html).toContain("Plan tomorrow");
    expect(html).toContain("uid=u1");
  });
});
