import { z } from "zod";

import { router, protectedProcedure } from "../context";
import { getLapseProfile } from "@/lib/accountability/lapse";
import { verifyReengagementSignature } from "@/lib/notifications/reengagement-link";
import { shiftLocalDate } from "@/lib/accountability/active-day";
import { appendScoreEvent } from "@/lib/accountability/events";
import { captureServerEvent } from "@/lib/posthog/server";
import { getUserDateBounds } from "@/lib/timezone";

export const retentionRouter = router({
  getReentryState: protectedProcedure.query(async ({ ctx }) => {
    const { data: settings } = await ctx.db
      .from("notification_settings")
      .select("timezone")
      .eq("user_id", ctx.user.id)
      .maybeSingle();

    const timezone = settings?.timezone ?? "UTC";
    const profile = await getLapseProfile(
      ctx.db,
      ctx.user.id,
      timezone,
      new Date()
    );

    const shouldShowReentry =
      profile.daysSinceLastActive >= 1 || profile.isReturningFromBadWeek;

    return {
      ...profile,
      shouldShowReentry,
    };
  }),

  markReengagedFromLink: protectedProcedure
    .input(
      z.object({
        uid: z.string(),
        day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        sig: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id !== input.uid) {
        return { success: false, reason: "user_mismatch" as const };
      }

      const valid = verifyReengagementSignature(input.uid, input.day, input.sig);
      if (!valid) {
        return { success: false, reason: "invalid_signature" as const };
      }

      const { data: settings } = await ctx.db
        .from("notification_settings")
        .select("timezone")
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      const timezone = settings?.timezone ?? "UTC";
      const todayLocal = shiftLocalDate(new Date(), timezone, 0);

      const [todayBounds, { data: priorSnapshot }] = await Promise.all([
        Promise.resolve(getUserDateBounds(new Date(), timezone, 0)),
        ctx.db
          .from("accountability_snapshots")
          .select("score")
          .eq("user_id", ctx.user.id)
          .order("local_date", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const { data: existing } = await ctx.db
        .from("score_events")
        .select("id")
        .eq("user_id", ctx.user.id)
        .eq("reason", "reengaged")
        .gte("occurred_at", todayBounds.start)
        .lte("occurred_at", todayBounds.end)
        .limit(1)
        .maybeSingle();

      const { error } = await ctx.db
        .from("profiles")
        .update({ last_reengaged_date: todayLocal })
        .eq("id", ctx.user.id);

      if (error) {
        throw new Error(`Failed to record re-engagement: ${error.message}`);
      }

      if (!existing) {
        await appendScoreEvent(ctx.db, {
          userId: ctx.user.id,
          scoreBefore: priorSnapshot?.score ?? null,
          scoreAfter: priorSnapshot?.score ?? 0,
          reason: "reengaged",
          allowNoop: true,
        });

        captureServerEvent(ctx.user.id, "reengaged", {
          local_date: todayLocal,
        }).catch(() => {});
      }

      return { success: true as const };
    }),
});
