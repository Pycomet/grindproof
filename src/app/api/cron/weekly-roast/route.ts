import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { env } from "@/lib/env";
import { WEEKLY_ROAST_PROMPT } from "@/lib/prompts/weekly-roast-prompt";
import { sanitizeForPrompt, wrapUntrustedBlock } from "@/lib/prompts/sanitize";
import { sendWeeklyRoastEmail } from "@/lib/notifications/email-service";
import { verifyCronSecret } from "@/lib/cron-auth";
import { getUserLocalTime } from "@/lib/timezone";
import {
  computeWeightedCompletion,
  computeCompletionRate,
  computeConsistencyRate,
  computeDisciplineScore,
  computeVelocityBonus,
  computeScore,
  getTier,
} from "@/lib/accountability";

const google = createGoogleGenerativeAI({ apiKey: env.NEXT_GOOGLE_GEMINI_API_KEY });

const roastSchema = z.object({
  insights: z.array(
    z.object({
      emoji: z.string(),
      text: z.string(),
      severity: z.enum(["high", "medium", "positive"]),
    })
  ),
  recommendations: z.array(z.string()),
  weekSummary: z.string(),
});

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const now = new Date();

  // Get users whose local time is ~9am on Sunday
  const { data: settings } = await supabase
    .from("notification_settings")
    .select("user_id, timezone, email_notifications_enabled");

  if (!settings) {
    return NextResponse.json({ error: "No settings found" }, { status: 500 });
  }

  let roastsGenerated = 0;

  for (const setting of settings) {
    if (!setting.email_notifications_enabled) continue;

    try {
      const userLocal = getUserLocalTime(now, setting.timezone);
      const userHour = userLocal.hour;
      const userDay = userLocal.day; // 0 = Sunday

      // Only process users whose local time is ~9am on Sunday
      if (userDay !== 0 || userHour !== 9) continue;

      // Calculate week range
      const weekEnd = new Date(now);
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      const weekStartDate = weekStart.toISOString().split("T")[0];
      const weekEndDate = weekEnd.toISOString().split("T")[0];

      // Idempotency guard — skip users who already have a roast for this week.
      // The weekly_roasts row is only inserted after a successful email send
      // (see end of loop), so its presence is a true delivery marker.
      const { data: existingRoast } = await supabase
        .from("weekly_roasts")
        .select("id")
        .eq("user_id", setting.user_id)
        .eq("week_start", weekStartDate)
        .limit(1);
      if (existingRoast && existingRoast.length > 0) continue;

      // Fetch week's tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", setting.user_id)
        .gte("due_date", weekStart.toISOString())
        .lte("due_date", weekEnd.toISOString());

      if (!tasks || tasks.length === 0) continue;

      const completed = tasks.filter((t) => t.status === "completed").length;
      const skipped = tasks.filter((t) => t.status === "skipped").length;
      const pending = tasks.filter((t) => t.status === "pending").length;
      const total = tasks.length;
      const completionRate = Math.round((completed / total) * 100);

      // Get reflections from skipped tasks. Sanitize and fence the user-supplied
      // strings so they can't escape the prompt envelope (CVE-class prompt injection).
      const reflectionLines = tasks
        .filter((t) => t.reflection)
        .map((t) => {
          const title = sanitizeForPrompt(t.title, 200);
          const reflection = sanitizeForPrompt(t.reflection, 1000);
          return `- title: "${title}" | reflection: "${reflection}"`;
        });

      const reflectionsBlock =
        reflectionLines.length > 0
          ? wrapUntrustedBlock(reflectionLines.join("\n"))
          : "None provided.";

      const weekData = `
Tasks this week: ${total} total, ${completed} completed, ${skipped} skipped, ${pending} still pending.
Completion rate: ${completionRate}%.
Reflections on skipped tasks:
${reflectionsBlock}
      `.trim();

      // Compute accountability score for context
      const windowStart14 = new Date(now);
      windowStart14.setDate(windowStart14.getDate() - 13);

      const { data: recentTasks } = await supabase
        .from("tasks")
        .select("status, due_date, priority, carry_over_count")
        .eq("user_id", setting.user_id)
        .gte("due_date", windowStart14.toISOString())
        .lte("due_date", now.toISOString());

      const recentAll = recentTasks || [];
      const activeDaysSet = new Set(
        recentAll
          .filter((t) => t.status === "completed")
          .map((t) => new Date(t.due_date).toISOString().split("T")[0])
      );

      const cr = computeWeightedCompletion(
        recentAll.map((t: any) => ({ status: t.status, priority: t.priority ?? "medium" }))
      );
      const conr = computeConsistencyRate(activeDaysSet.size, 14);
      const ds = computeDisciplineScore(
        recentAll.map((t: any) => ({ carry_over_count: t.carry_over_count ?? 0, status: t.status })),
        recentAll.length
      );
      const accountScore = computeScore({
        weightedCompletion: cr,
        consistencyRate: conr,
        disciplineScore: ds,
        currentStreak: 0,
        velocityBonus: 0,
      });
      const accountTier = getTier(accountScore);

      const scoreContext = `
Accountability Score: ${accountScore}/100 (Tier: ${accountTier.name})
Completion Rate (14d): ${cr}%
Consistency Rate (14d): ${Math.round(conr)}%
Active Days (14d): ${activeDaysSet.size}/14
      `.trim();

      // Fetch coach memory for context
      const { data: coachMemory } = await supabase
        .from("coach_memory")
        .select("category, content, severity, created_at")
        .eq("user_id", setting.user_id)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20);

      const memoryContext = (coachMemory || []).length > 0
        ? `\nCoach Memory:\n${(coachMemory || []).map(
            (m: any) => `- [${m.category}] ${m.content}`
          ).join("\n")}`
        : "";

      // Fetch previous roast for continuity
      const { data: prevRoast } = await supabase
        .from("weekly_roasts")
        .select("roast_data")
        .eq("user_id", setting.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const prevContext = prevRoast?.roast_data
        ? `\nPrevious week's summary: ${wrapUntrustedBlock(
            sanitizeForPrompt((prevRoast.roast_data as any).weekSummary, 500)
          )}`
        : "";

      // Generate roast with AI
      const { output: roast } = await generateText({
        model: google(env.AI_MODEL),
        system: WEEKLY_ROAST_PROMPT,
        prompt: weekData + "\n\n" + scoreContext + memoryContext + prevContext,
        output: Output.object({ schema: roastSchema }),
      });

      if (!roast) {
        console.error(`Failed to generate roast for user ${setting.user_id}: AI returned no structured output`);
        continue;
      }

      // Send email FIRST. The weekly_roasts row is the idempotency record,
      // so we only persist after a successful delivery — otherwise a Resend
      // failure would leave a phantom row and the user would never get retried.
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, name")
        .eq("id", setting.user_id)
        .maybeSingle();

      if (!profile?.email) {
        console.warn(`Skipping weekly roast for user ${setting.user_id}: no email on profile`);
        continue;
      }

      await sendWeeklyRoastEmail(profile.email, {
        name: profile.name,
        weekSummary: roast.weekSummary,
        insights: roast.insights,
        recommendations: roast.recommendations,
        completionRate,
        tasksCompleted: completed,
        tasksTotal: total,
      });

      // Persist roast — only reached after a successful send.
      await supabase.from("weekly_roasts").insert({
        user_id: setting.user_id,
        week_start: weekStartDate,
        week_end: weekEndDate,
        roast_data: roast,
        task_stats: { total, completed, skipped, pending, completionRate },
        delivered_via: ["email"],
      });

      // Write high-severity insights back to coach_memory.
      if (roast.insights) {
        for (const insight of roast.insights) {
          if (insight.severity === "high") {
            const expiresAt = new Date(now);
            expiresAt.setDate(expiresAt.getDate() + 14);
            await supabase.from("coach_memory").insert({
              user_id: setting.user_id,
              category: "observation",
              content: insight.text,
              source: "weekly_roast",
              severity: "warning",
              status: "active",
              expires_at: expiresAt.toISOString(),
            });
          }
        }
      }

      roastsGenerated++;
    } catch (err) {
      console.error(`Error generating roast for user ${setting.user_id}:`, err);
    }
  }

  return NextResponse.json({ success: true, roastsGenerated });
}
