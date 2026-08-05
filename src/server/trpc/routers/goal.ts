import { z } from "zod";
import { router, protectedProcedure } from "../context";
import {
  createGoalSchema,
  updateGoalSchema,
  mapGoalFromDb,
  createGoal,
  updateGoal,
  deleteGoal,
} from "@/lib/actions/goals";

// Re-exported for consumers that import the schemas from the router (e.g. tests).
export { createGoalSchema, updateGoalSchema };

export const goalRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("goals")
      .select("*")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch goals: ${error.message}`);
    const goals = (data || []).map(mapGoalFromDb);

    // Progress is counted in the database rather than derived on the client
    // from the dashboard's task array — that array is capped at a page of
    // rows, so a goal whose tasks fell outside the cap reported a wrong (often
    // zero) percentage. These are head-only count probes: no rows come back,
    // and all goals are counted concurrently.
    return Promise.all(
      goals.map(async (goal) => {
        const [{ count: total }, { count: completed }] = await Promise.all([
          ctx.db
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("user_id", ctx.user.id)
            .eq("goal_id", goal.id),
          ctx.db
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("user_id", ctx.user.id)
            .eq("goal_id", goal.id)
            .eq("status", "completed"),
        ]);

        return { ...goal, taskTotal: total ?? 0, taskCompleted: completed ?? 0 };
      })
    );
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("goals")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      if (error) throw new Error(`Failed to fetch goal: ${error.message}`);
      if (!data) return null;
      return mapGoalFromDb(data);
    }),

  create: protectedProcedure
    .input(createGoalSchema)
    .mutation(({ ctx, input }) => createGoal(ctx.db, ctx.user.id, input)),

  update: protectedProcedure
    .input(updateGoalSchema)
    .mutation(({ ctx, input }) => updateGoal(ctx.db, ctx.user.id, input)),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(({ ctx, input }) => deleteGoal(ctx.db, ctx.user.id, input.id)),
});
