import { z } from "zod";
import { router, protectedProcedure } from "../context";
import { captureServerEvent } from "@/lib/posthog/server";
import {
  recordMorningCheckIn,
  recordEveningReflections,
} from "@/lib/actions/daily-checks";

export const dailyCheckRouter = router({
  getMorningSchedule: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get yesterday's incomplete tasks
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: yesterdayTasks } = await ctx.db
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .gte("due_date", yesterday.toISOString())
      .lt("due_date", today.toISOString())
      .eq("status", "pending");

    // Get today's existing tasks
    const { data: todayTasks } = await ctx.db
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .gte("due_date", today.toISOString())
      .lt("due_date", tomorrow.toISOString())
      .order("start_time", { ascending: true });

    // Guard against duplicate submissions across page reloads
    const { data: existingCheck } = await ctx.db
      .from("daily_checks")
      .select("id")
      .eq("user_id", userId)
      .eq("type", "morning")
      .gte("created_at", today.toISOString())
      .lt("created_at", tomorrow.toISOString())
      .maybeSingle();

    // GRI-6 funnel event: user returns 24-48h after signup and reaches a
    // meaningful surface (the dashboard's morning view). Fired server-side
    // because client-side day-2 detection is unreliable across devices.
    // PostHog funnel deduplication handles repeated fires inside the window.
    const signupAt = Date.parse(ctx.user.created_at ?? "");
    if (Number.isFinite(signupAt)) {
      const hoursSinceSignup = (Date.now() - signupAt) / 3_600_000;
      if (hoursSinceSignup >= 24 && hoursSinceSignup <= 48) {
        captureServerEvent(userId, "returned_day_2", {
          user_id: userId,
          hours_since_signup: Math.round(hoursSinceSignup * 10) / 10,
        }).catch(() => {});
      }
    }

    return {
      yesterdayIncomplete: yesterdayTasks || [],
      todayTasks: todayTasks || [],
      alreadySubmitted: !!existingCheck,
    };
  }),

  getEveningSchedule: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: todayTasks } = await ctx.db
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending")
      .gte("due_date", today.toISOString())
      .lt("due_date", tomorrow.toISOString())
      .order("start_time", { ascending: true });

    return {
      todayTasks: todayTasks || [],
    };
  }),

  carryOverTasks: protectedProcedure
    .input(
      z.object({
        taskIds: z.array(z.string()).max(100),
      })
    )
    .mutation(({ ctx, input }) =>
      recordMorningCheckIn(ctx.db, ctx.user.id, { taskIds: input.taskIds })
    ),

  submitEveningReflections: protectedProcedure
    .input(
      z.object({
        reflections: z.array(
          z.object({
            taskId: z.string(),
            status: z.enum(["completed", "skipped"]),
            reflection: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Core writes + accountability side effects (carry-over, markers, score
      // recompute, pattern engine) live in the shared action so MCP-driven
      // check-ins behave identically.
      const { completedCount, skippedCount } = await recordEveningReflections(
        ctx.db,
        ctx.user.id,
        input
      );

      // Server-side funnel event — GRI-6 requires this fires from the server,
      // not the client, so it can't be blocked by ad-blockers. Per the spec
      // this event is the *first* check-in only — gate the capture, don't just
      // tag a property. Kept in the router because it needs the full user
      // session (created_at) and is analytics, not accountability state.
      const { count: previousEveningCheckins } = await ctx.db
        .from("daily_checks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", ctx.user.id)
        .eq("type", "evening");

      if ((previousEveningCheckins ?? 0) <= 1) {
        const signupAtMs = ctx.user.created_at
          ? Date.parse(ctx.user.created_at)
          : NaN;
        const timeToFirstCheckin = Number.isFinite(signupAtMs)
          ? Math.max(0, Math.round((Date.now() - signupAtMs) / 1000))
          : null;

        captureServerEvent(ctx.user.id, "first_checkin_completed", {
          user_id: ctx.user.id,
          time_to_first_checkin_seconds: timeToFirstCheckin,
          tasks_completed: completedCount,
          tasks_skipped: skippedCount,
        }).catch(() => {}); // fire-and-forget
      }

      return { success: true, count: input.reflections.length };
    }),
});
