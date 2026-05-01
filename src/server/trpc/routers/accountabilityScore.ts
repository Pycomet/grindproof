import { z } from "zod";
import { router, protectedProcedure } from "../context";
import { computeUserAccountability } from "@/lib/accountability/compute";
import {
  fetchSnapshotRange,
  fetchRecentSnapshots,
} from "@/lib/accountability/snapshot";
import { fetchRecentScoreEvents } from "@/lib/accountability/events";
import {
  getTierWithHysteresis,
} from "@/lib/accountability/primitives";
import { localDateRange, localToday } from "@/lib/accountability/active-day";

/**
 * Router responsibilities:
 *  - getScore: compute the live snapshot for "now", apply tier hysteresis
 *    using the last 4 daily snapshots, return everything the widget needs.
 *  - getScoreTrend: read snapshots for the requested window. Today's row
 *    may not exist yet, so we recompute it live to avoid a missing data
 *    point at the trailing edge.
 *  - getActivityHeatmap: same — read weighted_completion per day from the
 *    snapshot table.
 *  - getRecentEvents: drive the "why did my score change?" feed on stats.
 *
 * Deliberately does no math itself: math lives in @/lib/accountability/*.
 */

export const accountabilityScoreRouter = router({
  getScore: protectedProcedure.query(async ({ ctx }) => {
    const snap = await computeUserAccountability(ctx.db, ctx.user.id);

    // Pull a few prior snapshots for tier hysteresis. If the user has none,
    // we degrade gracefully to the naive tier inside the helper.
    const recent = await fetchRecentSnapshots(ctx.db, ctx.user.id, 4);
    const priorScores = recent
      .filter((r) => r.local_date < snap.localDate)
      .map((r) => r.score);
    const tier = getTierWithHysteresis(snap.score, priorScores);

    return { ...snap, tier, currentStreak: snap.streak };
  }),

  getScoreTrend: protectedProcedure
    .input(
      z.object({
        days: z.enum(["14", "30", "all"]).default("14"),
      })
    )
    .query(async ({ ctx, input }) => {
      const numDays = input.days === "all" ? 90 : parseInt(input.days, 10);
      const liveSnap = await computeUserAccountability(ctx.db, ctx.user.id);
      const today = localToday(new Date(), liveSnap.timezone);
      const dates = localDateRange(new Date(), liveSnap.timezone, numDays);
      const snapshots = await fetchSnapshotRange(
        ctx.db,
        ctx.user.id,
        dates[0],
        dates[dates.length - 1]
      );
      const byDate: Record<string, (typeof snapshots)[number]> = {};
      for (const s of snapshots) byDate[s.local_date] = s;

      const trend = dates.map((d) => {
        if (d === today) {
          return {
            date: d,
            score: liveSnap.score,
            completed: liveSnap.today.completed,
            total: liveSnap.today.total,
            active: liveSnap.active,
          };
        }
        const row = byDate[d];
        return {
          date: d,
          score: row?.score ?? 0,
          completed: 0,
          total: 0,
          active: row?.active ?? false,
        };
      });

      return { trend, currentStreak: liveSnap.streak };
    }),

  getActivityHeatmap: protectedProcedure
    .input(
      z.object({
        days: z.enum(["14", "30", "all"]).default("14"),
      })
    )
    .query(async ({ ctx, input }) => {
      const numDays = input.days === "all" ? 90 : parseInt(input.days, 10);
      const liveSnap = await computeUserAccountability(ctx.db, ctx.user.id);
      const dates = localDateRange(new Date(), liveSnap.timezone, numDays);
      const snapshots = await fetchSnapshotRange(
        ctx.db,
        ctx.user.id,
        dates[0],
        dates[dates.length - 1]
      );
      const byDate: Record<string, (typeof snapshots)[number]> = {};
      for (const s of snapshots) byDate[s.local_date] = s;

      const heatmap = dates.map((d) => {
        if (d === liveSnap.localDate) {
          return {
            date: d,
            count: liveSnap.today.completed,
            intensity: liveSnap.today.weightedCompletion,
            active: liveSnap.active,
          };
        }
        const row = byDate[d];
        return {
          date: d,
          count: row?.active ? 1 : 0, // legacy field for back-compat
          intensity: row?.weighted_completion ?? 0,
          active: row?.active ?? false,
        };
      });

      return { heatmap };
    }),

  getRecentEvents: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      const events = await fetchRecentScoreEvents(
        ctx.db,
        ctx.user.id,
        input.limit
      );
      return { events };
    }),
});
