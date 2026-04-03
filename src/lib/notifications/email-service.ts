import { Resend } from "resend";
import { env } from "@/lib/env";
import { APP_CONFIG } from "@/lib/config";

const resend = new Resend(env.RESEND_API_KEY);

const FROM_EMAIL = "GrindProof <notifications@grindproof.co>";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendMorningEmail(
  to: string,
  data: { name: string | null; carriedOverCount: number }
) {
  const greeting = data.name ? `Hey ${escapeHtml(data.name)}` : "Hey";
  const carryLine =
    data.carriedOverCount > 0
      ? `You have ${data.carriedOverCount} task${data.carriedOverCount > 1 ? "s" : ""} carried over from yesterday.`
      : "Clean slate today.";

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Time to plan your day",
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="margin: 0 0 16px;">${greeting},</h2>
        <p style="color: #52525b; margin: 0 0 24px;">${carryLine} What are you tackling today?</p>
        <a href="${APP_CONFIG.BASE_URL}/dashboard" style="display: inline-block; background: #18181b; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">Plan my day</a>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 32px;">GrindProof - Track what you plan. Prove what you did.</p>
      </div>
    `,
  });
}

export async function sendEveningEmail(
  to: string,
  data: { name: string | null; pendingCount: number }
) {
  const greeting = data.name ? `${escapeHtml(data.name)}` : "Hey";

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Reality check: ${data.pendingCount} task${data.pendingCount !== 1 ? "s" : ""} waiting`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="margin: 0 0 16px;">Evening, ${greeting}.</h2>
        <p style="color: #52525b; margin: 0 0 24px;">You have ${data.pendingCount} task${data.pendingCount !== 1 ? "s" : ""} still pending. How did today actually go?</p>
        <a href="${APP_CONFIG.BASE_URL}/dashboard" style="display: inline-block; background: #18181b; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">Submit reality check</a>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 32px;">GrindProof - The accountability app that calls out your BS.</p>
      </div>
    `,
  });
}

export async function sendWeeklyRoastEmail(
  to: string,
  data: {
    name: string | null;
    weekSummary: string;
    insights: Array<{ emoji: string; text: string; severity: string }>;
    recommendations: string[];
    completionRate: number;
    tasksCompleted: number;
    tasksTotal: number;
  }
) {
  const greeting = data.name ? `${escapeHtml(data.name)}` : "Hey";
  const insightsHtml = data.insights
    .map(
      (i) =>
        `<li style="margin: 8px 0; color: ${i.severity === "high" ? "#dc2626" : i.severity === "positive" ? "#16a34a" : "#ca8a04"};">${escapeHtml(i.emoji)} ${escapeHtml(i.text)}</li>`
    )
    .join("");
  const recsHtml = data.recommendations
    .map((r) => `<li style="margin: 8px 0; color: #52525b;">${escapeHtml(r)}</li>`)
    .join("");

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Weekly Roast: ${data.completionRate}% completion rate`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="margin: 0 0 8px;">Weekly Roast</h2>
        <p style="color: #a1a1aa; margin: 0 0 24px; font-size: 14px;">${greeting}, here's how your week went.</p>

        <div style="background: #f4f4f5; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; color: #52525b;">${escapeHtml(data.weekSummary)}</p>
        </div>

        <div style="margin-bottom: 24px;">
          <div style="display: flex; gap: 16px; text-align: center;">
            <div style="flex: 1; background: #f4f4f5; border-radius: 8px; padding: 12px;">
              <div style="font-size: 24px; font-weight: 700;">${data.completionRate}%</div>
              <div style="font-size: 12px; color: #a1a1aa;">Completion</div>
            </div>
            <div style="flex: 1; background: #f4f4f5; border-radius: 8px; padding: 12px;">
              <div style="font-size: 24px; font-weight: 700;">${data.tasksCompleted}/${data.tasksTotal}</div>
              <div style="font-size: 12px; color: #a1a1aa;">Tasks Done</div>
            </div>
          </div>
        </div>

        <h3 style="margin: 0 0 8px; font-size: 16px;">Key Observations</h3>
        <ul style="list-style: none; padding: 0; margin: 0 0 24px;">${insightsHtml}</ul>

        <h3 style="margin: 0 0 8px; font-size: 16px;">Next Week</h3>
        <ul style="list-style: disc; padding-left: 20px; margin: 0 0 24px;">${recsHtml}</ul>

        <a href="${APP_CONFIG.BASE_URL}/dashboard" style="display: inline-block; background: #18181b; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">Open Dashboard</a>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 32px;">GrindProof - Track what you plan. Prove what you did.</p>
      </div>
    `,
  });
}
