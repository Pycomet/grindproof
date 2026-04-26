import { z } from "zod";
import { router, protectedProcedure } from "../context";
import { computeUserPatterns } from "@/lib/ai/patterns";

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

    return {
      yesterdayIncomplete: yesterdayTasks || [],
      todayTasks: todayTasks || [],
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

      const { data: currentTasks } = await ctx.db
        .from("tasks")
        .select("id, carry_over_count")
        .in("id", input.taskIds)
        .eq("user_id", ctx.user.id);

      for (const task of currentTasks || []) {
        const { error } = await ctx.db
          .from("tasks")
          .update({
            due_date: today.toISOString(),
            status: "pending",
            carry_over_count: (task.carry_over_count ?? 0) + 1,
          })
          .eq("id", task.id)
          .eq("user_id", ctx.user.id);

        if (error)
          throw new Error(`Failed to carry over task ${task.id}: ${error.message}`);
      }

      await ctx.db
        .from("daily_checks")
        .insert({ user_id: ctx.user.id, type: "morning" });

      return { success: true, count: input.taskIds.length };
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

      for (const item of input.reflections) {
        const updateData: Record<string, unknown> = {};
        if (item.status === "skipped") {
          const { data: current } = await ctx.db
            .from("tasks")
            .select("carry_over_count")
            .eq("id", item.taskId)
            .eq("user_id", ctx.user.id)
            .single();

          updateData.status = "pending";
          updateData.due_date = tomorrow.toISOString();
          updateData.carry_over_count = ((current?.carry_over_count as number) ?? 0) + 1;
        } else {
          updateData.status = item.status;
        }
        if (item.reflection) {
          updateData.reflection = item.reflection;
        }
        const { error } = await ctx.db
          .from("tasks")
          .update(updateData)
          .eq("id", item.taskId)
          .eq("user_id", ctx.user.id);

        if (error) failures.push(item.taskId);
      }

      if (failures.length > 0) {
        throw new Error(`Failed to update tasks: ${failures.join(", ")}`);
      }

      await ctx.db
        .from("daily_checks")
        .insert({ user_id: ctx.user.id, type: "evening" });

      // Fire pattern engine (non-blocking)
      computeUserPatterns(ctx.db, ctx.user.id).catch((err) =>
        console.error("Pattern engine error:", err)
      );

      return { success: true, count: input.reflections.length };
    }),
});
