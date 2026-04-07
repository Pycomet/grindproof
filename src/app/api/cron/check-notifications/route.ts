import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { sendMorningEmail, sendEveningEmail } from "@/lib/notifications/email-service";
import { verifyCronSecret } from "@/lib/cron-auth";
import { getUserLocalTime, getUserDateBounds } from "@/lib/timezone";

async function checkNotifications() {
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
      const userLocal = getUserLocalTime(now, setting.timezone);
      const userHour = userLocal.hour;
      const userMinute = userLocal.minute;

      // Check morning
      if (setting.morning_check_enabled && setting.morning_check_time) {
        const [targetHour, targetMinute] = setting.morning_check_time.split(":").map(Number);
        if (userHour === targetHour && Math.abs(userMinute - targetMinute) < 5) {
          const todayStr = `${userLocal.year}-${String(userLocal.month).padStart(2, "0")}-${String(userLocal.date).padStart(2, "0")}`;
          const { data: existing } = await supabase
            .from("notification_log")
            .select("id")
            .eq("user_id", setting.user_id)
            .eq("type", "morning")
            .eq("sent_date", todayStr)
            .limit(1);
          if (existing && existing.length > 0) continue;

          const { data: profile } = await supabase
            .from("profiles")
            .select("email, name")
            .eq("id", setting.user_id)
            .single();

          if (profile?.email) {
            const yesterdayBounds = getUserDateBounds(now, setting.timezone, -1);

            const { count } = await supabase
              .from("tasks")
              .select("*", { count: "exact", head: true })
              .eq("user_id", setting.user_id)
              .eq("status", "pending")
              .gte("due_date", yesterdayBounds.start)
              .lt("due_date", yesterdayBounds.end);

            await sendMorningEmail(profile.email, {
              name: profile.name,
              carriedOverCount: count || 0,
            });

            await supabase.from("notification_log").insert({
              user_id: setting.user_id,
              type: "morning",
              sent_date: todayStr,
            });

            emailsSent++;
          }
        }
      }

      // Check evening
      if (setting.evening_check_enabled && setting.evening_check_time) {
        const [targetHour, targetMinute] = setting.evening_check_time.split(":").map(Number);
        if (userHour === targetHour && Math.abs(userMinute - targetMinute) < 5) {
          const todayStr = `${userLocal.year}-${String(userLocal.month).padStart(2, "0")}-${String(userLocal.date).padStart(2, "0")}`;
          const { data: existing } = await supabase
            .from("notification_log")
            .select("id")
            .eq("user_id", setting.user_id)
            .eq("type", "evening")
            .eq("sent_date", todayStr)
            .limit(1);
          if (existing && existing.length > 0) continue;

          const { data: profile } = await supabase
            .from("profiles")
            .select("email, name")
            .eq("id", setting.user_id)
            .single();

          if (profile?.email) {
            const todayBounds = getUserDateBounds(now, setting.timezone, 0);

            const { count } = await supabase
              .from("tasks")
              .select("*", { count: "exact", head: true })
              .eq("user_id", setting.user_id)
              .eq("status", "pending")
              .gte("due_date", todayBounds.start)
              .lt("due_date", todayBounds.end);

            await sendEveningEmail(profile.email, {
              name: profile.name,
              pendingCount: count || 0,
            });

            await supabase.from("notification_log").insert({
              user_id: setting.user_id,
              type: "evening",
              sent_date: todayStr,
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

// QStash sends POST — verify signature at runtime to avoid build-time key requirement
export async function POST(request: NextRequest) {
  const { Receiver } = await import("@upstash/qstash");

  const receiver = new Receiver({
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY!,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY!,
  });

  const body = await request.text();
  const signature = request.headers.get("upstash-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  try {
    await receiver.verify({ signature, body });
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  return checkNotifications();
}

// Keep GET for manual testing / fallback with CRON_SECRET
export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  return checkNotifications();
}
