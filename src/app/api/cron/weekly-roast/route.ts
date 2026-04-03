import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { env } from "@/lib/env";
import { WEEKLY_ROAST_PROMPT } from "@/lib/prompts/weekly-roast-prompt";
import { sendWeeklyRoastEmail } from "@/lib/notifications/email-service";

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
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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
      const userTime = new Date(
        now.toLocaleString("en-US", { timeZone: setting.timezone })
      );
      const userHour = userTime.getHours();
      const userDay = userTime.getDay(); // 0 = Sunday

      // Only process users whose local time is ~9am on Sunday
      if (userDay !== 0 || userHour !== 9) continue;

      // Calculate week range
      const weekEnd = new Date(now);
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);

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

      // Get reflections from skipped tasks
      const reflections = tasks
        .filter((t) => t.reflection)
        .map((t) => ({ title: t.title, reflection: t.reflection }));

      const weekData = `
Tasks this week: ${total} total, ${completed} completed, ${skipped} skipped, ${pending} still pending.
Completion rate: ${completionRate}%.
Reflections on skipped tasks: ${reflections.length > 0 ? JSON.stringify(reflections) : "None provided."}
      `.trim();

      // Generate roast with AI
      const { object: roast } = await generateText({
        model: google(env.AI_MODEL),
        system: WEEKLY_ROAST_PROMPT,
        prompt: weekData,
        output: Output.object({ schema: roastSchema }),
      });

      // Store roast
      await supabase.from("weekly_roasts").insert({
        user_id: setting.user_id,
        week_start: weekStart.toISOString().split("T")[0],
        week_end: weekEnd.toISOString().split("T")[0],
        roast_data: roast,
        task_stats: { total, completed, skipped, pending, completionRate },
        delivered_via: ["email"],
      });

      // Send email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, name")
        .eq("id", setting.user_id)
        .single();

      if (profile?.email) {
        await sendWeeklyRoastEmail(profile.email, {
          name: profile.name,
          weekSummary: roast.weekSummary,
          insights: roast.insights,
          recommendations: roast.recommendations,
          completionRate,
          tasksCompleted: completed,
          tasksTotal: total,
        });
      }

      roastsGenerated++;
    } catch (err) {
      console.error(`Error generating roast for user ${setting.user_id}:`, err);
    }
  }

  return NextResponse.json({ success: true, roastsGenerated });
}
