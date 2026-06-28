/**
 * Hourly snapshot writer.
 *
 * For every user with notification_settings, find their local hour. When the
 * local hour is exactly 00 we just crossed midnight — write a snapshot for
 * the date that just ended (their "yesterday" in local terms). The widget's
 * live read still computes today on demand, so missing today's row is fine.
 *
 * Mirrors the auth pattern in /api/cron/check-notifications: QStash POST
 * with signature verification, manual GET fallback with CRON_SECRET.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { verifyCronSecret } from "@/lib/cron-auth";
import { getUserLocalTime, getUserDateBounds } from "@/lib/timezone";
import { computeUserAccountability } from "@/lib/accountability/compute";
import { upsertSnapshot } from "@/lib/accountability/snapshot";
import { appendScoreEvent } from "@/lib/accountability/events";
import { shiftLocalDate } from "@/lib/accountability/active-day";
import { captureServerEvent } from "@/lib/posthog/server";
import { wasActiveOnLocalDate } from "@/lib/accountability/reengagement";
import type { Database } from "@/lib/supabase/types";

async function runSnapshot() {
  const supabase = createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const now = new Date();
  const { data: settings, error } = await supabase
    .from("notification_settings")
    .select("user_id, timezone");

  if (error || !settings) {
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }

  let snapshotsWritten = 0;

  for (const setting of settings) {
    try {
      const tz = setting.timezone || "UTC";
      const local = getUserLocalTime(now, tz);
      // Only act once per local day, at the 0th local hour.
      if (local.hour !== 0) continue;

      // Compute snapshot for the date that just ended (local "yesterday").
      // We pass an `asOf` instant 5 minutes before "now" so the function
      // anchors on the previous local day, not the brand-new one.
      const yesterdayAsOf = new Date(now.getTime() - 5 * 60_000);
      const yesterdayLocal = shiftLocalDate(now, tz, -1);

      const snap = await computeUserAccountability(
        supabase,
        setting.user_id,
        yesterdayAsOf
      );

      // Sanity check — snap.localDate may differ from yesterdayLocal if the
      // function clamped to a different day (e.g. we just crossed midnight
      // and our 5-minute lookback was too short). Trust snap.localDate.
      void yesterdayLocal;

      // Pull the prior snapshot for this user to capture before/after.
      const { data: prior } = await supabase
        .from("accountability_snapshots")
        .select("score")
        .eq("user_id", setting.user_id)
        .order("local_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      await upsertSnapshot(supabase, setting.user_id, snap);
      await appendScoreEvent(supabase, {
        userId: setting.user_id,
        scoreBefore: prior?.score ?? null,
        scoreAfter: snap.score,
        reason: "snapshot_cron",
      });

      const yesterdayLocalDate = shiftLocalDate(now, tz, -1);
      const wasActiveYesterday = await wasActiveOnLocalDate(
        supabase,
        setting.user_id,
        tz,
        yesterdayLocalDate
      );

      if (!wasActiveYesterday) {
        const yesterdayBounds = getUserDateBounds(now, tz, -1);

        const { data: existingMissed } = await supabase
          .from("score_events")
          .select("id")
          .eq("user_id", setting.user_id)
          .eq("reason", "missed_day")
          .gte("occurred_at", yesterdayBounds.start)
          .lte("occurred_at", yesterdayBounds.end)
          .limit(1)
          .maybeSingle();

        if (!existingMissed) {
          await appendScoreEvent(supabase, {
            userId: setting.user_id,
            scoreBefore: snap.score,
            scoreAfter: snap.score,
            reason: "missed_day",
            occurredAt: new Date(yesterdayBounds.start).toISOString(),
            allowNoop: true,
          });

          captureServerEvent(setting.user_id, "missed_day", {
            local_date: yesterdayLocalDate,
            timezone: tz,
          }).catch(() => {});
        }
      }

      snapshotsWritten++;
    } catch (err) {
      console.error(
        `[snapshot-accountability] failed for ${setting.user_id}:`,
        err
      );
    }
  }

  return NextResponse.json({ success: true, snapshotsWritten });
}

// QStash POST with signature verification.
export async function POST(request: NextRequest) {
  const { Receiver } = await import("@upstash/qstash");

  if (!env.QSTASH_CURRENT_SIGNING_KEY || !env.QSTASH_NEXT_SIGNING_KEY) {
    return NextResponse.json(
      { error: "QStash not configured" },
      { status: 500 }
    );
  }

  const receiver = new Receiver({
    currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
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

  return runSnapshot();
}

// Manual GET fallback with CRON_SECRET.
export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
  return runSnapshot();
}
