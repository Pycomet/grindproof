import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { sendMorningEmail, sendEveningEmail } from "@/lib/notifications/email-service";
import { verifyCronSecret } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const now = new Date();
  let emailsSent = 0;

  // Get all notification settings
  const { data: settings, error } = await supabase
    .from("notification_settings")
    .select("user_id, timezone, morning_check_enabled, morning_check_time, evening_check_enabled, evening_check_time, email_notifications_enabled");

  if (error || !settings) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }

  for (const setting of settings) {
    if (!setting.email_notifications_enabled) continue;

    try {
      // Calculate user's local time
      const userTime = new Date(
        now.toLocaleString("en-US", { timeZone: setting.timezone })
      );
      const userHour = userTime.getHours();
      const userMinute = userTime.getMinutes();

      // Check morning
      if (setting.morning_check_enabled && setting.morning_check_time) {
        const [targetHour, targetMinute] = setting.morning_check_time.split(":").map(Number);
        if (userHour === targetHour && Math.abs(userMinute - targetMinute) < 5) {
          // Get user profile for email + name
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, name")
            .eq("id", setting.user_id)
            .single();

          if (profile?.email) {
            // Count yesterday's incomplete tasks
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);

            const { count } = await supabase
              .from("tasks")
              .select("*", { count: "exact", head: true })
              .eq("user_id", setting.user_id)
              .eq("status", "pending")
              .gte("due_date", yesterday.toISOString())
              .lt("due_date", today.toISOString());

            await sendMorningEmail(profile.email, {
              name: profile.name,
              carriedOverCount: count || 0,
            });
            emailsSent++;
          }
        }
      }

      // Check evening
      if (setting.evening_check_enabled && setting.evening_check_time) {
        const [targetHour, targetMinute] = setting.evening_check_time.split(":").map(Number);
        if (userHour === targetHour && Math.abs(userMinute - targetMinute) < 5) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, name")
            .eq("id", setting.user_id)
            .single();

          if (profile?.email) {
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const { count } = await supabase
              .from("tasks")
              .select("*", { count: "exact", head: true })
              .eq("user_id", setting.user_id)
              .eq("status", "pending")
              .gte("due_date", today.toISOString())
              .lt("due_date", tomorrow.toISOString());

            await sendEveningEmail(profile.email, {
              name: profile.name,
              pendingCount: count || 0,
            });
            emailsSent++;
          }
        }
      }
    } catch (err) {
      console.error(`Error processing user ${setting.user_id}:`, err);
    }
  }

  return NextResponse.json({ success: true, emailsSent });
}
