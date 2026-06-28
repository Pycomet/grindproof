import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import {
  sendMorningEmail,
  sendEveningEmail,
  sendReengagementEmail,
} from "@/lib/notifications/email-service";
import { sendPushToUser } from "@/lib/notifications/push-service";
import { verifyCronSecret } from "@/lib/cron-auth";
import { getUserLocalTime, getUserDateBounds } from "@/lib/timezone";
import { getLapseProfile } from "@/lib/accountability/lapse";
import { getReengagementCopy } from "@/lib/notifications/reengagement-copy";
import { getRetentionNudgeVariant } from "@/lib/posthog/experiment";
import { createReengagementLink } from "@/lib/notifications/reengagement-link";
import { captureServerEvent } from "@/lib/posthog/server";
import type { Database } from "@/lib/supabase/types";

const REENGAGEMENT_LOG_TYPE = "reengagement";
const TIME_WINDOW_MINUTES = 5;

function toLocalDateString(local: {
  year: number;
  month: number;
  date: number;
}): string {
  return `${local.year}-${String(local.month).padStart(2, "0")}-${String(
    local.date
  ).padStart(2, "0")}`;
}

function withinTimeWindow(
  userHour: number,
  userMinute: number,
  target: string | null
): boolean {
  if (!target) return false;
  const [targetHour, targetMinute] = target.split(":").map(Number);
  return userHour === targetHour && Math.abs(userMinute - targetMinute) < TIME_WINDOW_MINUTES;
}

async function hasNotificationLog(
  supabase: ReturnType<typeof createClient<Database>>,
  userId: string,
  type: string,
  sentDate: string,
  variant?: string
): Promise<boolean> {
  let query = supabase
    .from("notification_log")
    .select("id")
    .eq("user_id", userId)
    .eq("type", type)
    .eq("sent_date", sentDate)
    .limit(1);

  if (variant) {
    query = query.eq("variant", variant);
  } else {
    query = query.is("variant", null);
  }

  const { data } = await query;
  return !!data && data.length > 0;
}

async function insertNotificationLog(
  supabase: ReturnType<typeof createClient<Database>>,
  userId: string,
  type: string,
  sentDate: string,
  variant?: string
): Promise<void> {
  await supabase.from("notification_log").insert({
    user_id: userId,
    type,
    sent_date: sentDate,
    variant: variant ?? null,
  });
}

async function checkNotifications() {
  const supabase = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );

  const now = new Date();
  let emailsSent = 0;
  let pushesSent = 0;
  let reengagementSent = 0;

  const { data: settings, error } = await supabase.from("notification_settings")
    .select(
      "user_id, timezone, morning_check_enabled, morning_check_time, evening_check_enabled, evening_check_time, email_notifications_enabled, push_notifications_enabled"
    );

  if (error || !settings) {
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }

  for (const setting of settings) {
    const emailEnabled = setting.email_notifications_enabled;
    const pushEnabled = setting.push_notifications_enabled;

    if (!emailEnabled && !pushEnabled) continue;

    try {
      const userLocal = getUserLocalTime(now, setting.timezone);
      const userHour = userLocal.hour;
      const userMinute = userLocal.minute;
      const todayStr = toLocalDateString(userLocal);

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, name")
        .eq("id", setting.user_id)
        .maybeSingle();

      if (
        setting.morning_check_enabled &&
        withinTimeWindow(userHour, userMinute, setting.morning_check_time)
      ) {
        const alreadySentMorning = await hasNotificationLog(
          supabase,
          setting.user_id,
          "morning",
          todayStr
        );

        if (!alreadySentMorning) {
          let sentAny = false;

          const yesterdayBounds = getUserDateBounds(now, setting.timezone, -1);
          const { count } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("user_id", setting.user_id)
            .eq("status", "pending")
            .gte("due_date", yesterdayBounds.start)
            .lt("due_date", yesterdayBounds.end);

          if (emailEnabled && profile?.email) {
            await sendMorningEmail(profile.email, {
              name: profile.name,
              carriedOverCount: count || 0,
            });
            sentAny = true;
            emailsSent += 1;
          }

          if (pushEnabled) {
            const pushResult = await sendPushToUser(setting.user_id, {
              title: "Time to plan your day",
              body:
                count && count > 0
                  ? `${count} carried over from yesterday. Plan today.`
                  : "Clean slate today. Plan your work.",
              url: "/dashboard#morning-checkin",
              tag: `morning-${todayStr}`,
            });

            if (pushResult.successful > 0) {
              sentAny = true;
              pushesSent += pushResult.successful;
            }
          }

          if (sentAny) {
            await insertNotificationLog(
              supabase,
              setting.user_id,
              "morning",
              todayStr
            );
          }
        }

        const lapse = await getLapseProfile(
          supabase,
          setting.user_id,
          setting.timezone,
          now
        );

        if (lapse.daysSinceLastActive >= 1) {
          const variant = await getRetentionNudgeVariant(setting.user_id);

          if (variant === "treatment") {
            const alreadySentReengagement = await hasNotificationLog(
              supabase,
              setting.user_id,
              REENGAGEMENT_LOG_TYPE,
              todayStr,
              variant
            );

            if (!alreadySentReengagement) {
              const copy = getReengagementCopy(lapse.daysSinceLastActive);
              const reengagementUrl = createReengagementLink(
                setting.user_id,
                todayStr
              );

              let sentAny = false;

              if (emailEnabled && profile?.email) {
                await sendReengagementEmail(profile.email, {
                  name: profile.name,
                  subject: copy.subject,
                  title: copy.title,
                  body: copy.body,
                  cta: copy.cta,
                  url: reengagementUrl,
                });
                sentAny = true;
              }

              if (pushEnabled) {
                const pushResult = await sendPushToUser(setting.user_id, {
                  title: copy.title,
                  body: copy.body,
                  url: reengagementUrl,
                  tag: `reengagement-${todayStr}`,
                });

                if (pushResult.successful > 0) {
                  sentAny = true;
                }
              }

              if (sentAny) {
                await insertNotificationLog(
                  supabase,
                  setting.user_id,
                  REENGAGEMENT_LOG_TYPE,
                  todayStr,
                  variant
                );

                reengagementSent += 1;

                captureServerEvent(setting.user_id, "reengagement_nudge_sent", {
                  variant,
                  days_since_last_active: lapse.daysSinceLastActive,
                  missed_days_last_7: lapse.missedDaysLast7,
                }).catch(() => {});
              }
            }
          } else {
            captureServerEvent(setting.user_id, "reengagement_nudge_suppressed", {
              variant,
              days_since_last_active: lapse.daysSinceLastActive,
            }).catch(() => {});
          }
        }
      }

      if (
        setting.evening_check_enabled &&
        withinTimeWindow(userHour, userMinute, setting.evening_check_time)
      ) {
        const alreadySentEvening = await hasNotificationLog(
          supabase,
          setting.user_id,
          "evening",
          todayStr
        );

        if (!alreadySentEvening) {
          let sentAny = false;

          const todayBounds = getUserDateBounds(now, setting.timezone, 0);
          const { count } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("user_id", setting.user_id)
            .eq("status", "pending")
            .gte("due_date", todayBounds.start)
            .lt("due_date", todayBounds.end);

          if (emailEnabled && profile?.email) {
            await sendEveningEmail(profile.email, {
              name: profile.name,
              pendingCount: count || 0,
            });
            sentAny = true;
            emailsSent += 1;
          }

          if (pushEnabled) {
            const pushResult = await sendPushToUser(setting.user_id, {
              title: "Evening reality check",
              body: `${count || 0} task${count === 1 ? "" : "s"} still pending. Close the loop honestly.`,
              url: "/dashboard",
              tag: `evening-${todayStr}`,
            });

            if (pushResult.successful > 0) {
              sentAny = true;
              pushesSent += pushResult.successful;
            }
          }

          if (sentAny) {
            await insertNotificationLog(
              supabase,
              setting.user_id,
              "evening",
              todayStr
            );
          }
        }
      }
    } catch (err) {
      console.error(`Error processing user ${setting.user_id}:`, err);
    }
  }

  return NextResponse.json({
    success: true,
    emailsSent,
    pushesSent,
    reengagementSent,
  });
}

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

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  return checkNotifications();
}
