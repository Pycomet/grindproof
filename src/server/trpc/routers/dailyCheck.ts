import { z } from "zod";
import { router, protectedProcedure } from "../context";
import { computeUserPatterns } from "@/lib/ai/patterns";
import { fireAndForgetScoreChange } from "@/lib/accountability/hooks";

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
    .mutation(async ({ ctx, input }) => {
      const today = new Date();
      today.setHours(12, 0, 0, 0);

      // Atomic single-statement carry-over via Postgres RPC. Replaces the
      // read-then-write loop that raced on concurrent submits and double-
      // incremented carry_over_count. RLS enforces user_id scoping.
      const { data: count, error } = await ctx.db.rpc("carry_over_tasks", {
        p_task_ids: input.taskIds,
        p_new_due: today.toISOString(),
      });

      if (error)
        throw new Error(`Failed to carry over tasks: ${error.message}`);

      // Idempotent: unique index on (user_id, type, day) — swallow 23505
      // (unique_violation) so retries don't surface as errors to the client.
      const { error: morningErr } = await ctx.db
        .from("daily_checks")
        .insert({ user_id: ctx.user.id, type: "morning" });
      if (morningErr && morningErr.code !== "23505") {
        throw new Error(`Failed to record check-in: ${morningErr.message}`);
      }

      fireAndForgetScoreChange(ctx.db, ctx.user.id, "task_carried_over");

      return { success: true, count: count ?? 0 };
    }),

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
      const failures: string[] = [];

      const tomorrow = new Date();
      tomorrow.setHours(0, 0, 0, 0);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(12, 0, 0, 0);

      // Bucket reflections so carry-overs can hit the atomic RPC in one shot.
      const skipIds: string[] = [];
      const skipReflections: Record<string, string> = {};
      const completedIds: string[] = [];
      const completedReflections: Record<string, string> = {};

      for (const item of input.reflections) {
        if (item.status === "skipped") {
          skipIds.push(item.taskId);
          if (item.reflection) skipReflections[item.taskId] = item.reflection;
        } else {
          completedIds.push(item.taskId);
          if (item.reflection)
            completedReflections[item.taskId] = item.reflection;
        }
      }

      // Carry-over: atomic increment + reschedule via RPC. Reflections are
      // applied separately because the RPC's signature only handles the
      // shared rollover fields.
      if (skipIds.length > 0) {
        const { error: rpcErr } = await ctx.db.rpc("carry_over_tasks", {
          p_task_ids: skipIds,
          p_new_due: tomorrow.toISOString(),
        });
        if (rpcErr) {
          throw new Error(`Failed to carry over tasks: ${rpcErr.message}`);
        }
        for (const id of skipIds) {
          if (skipReflections[id]) {
            const { error } = await ctx.db
              .from("tasks")
              .update({ reflection: skipReflections[id] })
              .eq("id", id)
              .eq("user_id", ctx.user.id);
            if (error) failures.push(id);
          }
        }
      }

      // Completed: set status + completed_at + optional reflection.
      const nowIso = new Date().toISOString();
      for (const id of completedIds) {
        const update: Record<string, unknown> = {
          status: "completed",
          completed_at: nowIso,
        };
        if (completedReflections[id]) update.reflection = completedReflections[id];
        const { error } = await ctx.db
          .from("tasks")
          .update(update)
          .eq("id", id)
          .eq("user_id", ctx.user.id);
        if (error) failures.push(id);
      }

      if (failures.length > 0) {
        throw new Error(`Failed to update tasks: ${failures.join(", ")}`);
      }

      // Idempotent: unique index on (user_id, type, day) — swallow 23505
      // (unique_violation) so retries don't surface as errors to the client.
      const { error: eveningErr } = await ctx.db
        .from("daily_checks")
        .insert({ user_id: ctx.user.id, type: "evening" });
      if (eveningErr && eveningErr.code !== "23505") {
        throw new Error(`Failed to record check-in: ${eveningErr.message}`);
      }

      fireAndForgetScoreChange(ctx.db, ctx.user.id, "evening_reflection");

      // Fire pattern engine (non-blocking)
      computeUserPatterns(ctx.db, ctx.user.id).catch((err) =>
        console.error("Pattern engine error:", err)
      );

      return { success: true, count: input.reflections.length };
    }),
});
