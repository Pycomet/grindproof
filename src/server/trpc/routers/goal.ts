import { z } from "zod";
import { router, protectedProcedure } from "../context";

export const createGoalSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  status: z.enum(["active", "completed"]).default("active"),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
});

export const updateGoalSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(["active", "completed"]).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
});

function mapGoalFromDb(goal: any) {
  return {
    id: goal.id,
    userId: goal.user_id,
    title: goal.title,
    description: goal.description || null,
    status: goal.status as "active" | "completed",
    priority: goal.priority as "high" | "medium" | "low",
    createdAt: new Date(goal.created_at),
    updatedAt: new Date(goal.updated_at),
  };
}

export const goalRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("goals")
      .select("*")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch goals: ${error.message}`);
    return (data || []).map(mapGoalFromDb);
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
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("goals")
        .insert({
          user_id: ctx.user.id,
          title: input.title,
          description: input.description || null,
          status: input.status || "active",
          priority: input.priority || "medium",
        })
        .select()
        .maybeSingle();

      if (error) throw new Error(`Failed to create goal: ${error.message}`);
      if (!data) throw new Error("Failed to create goal: No data returned");
      return mapGoalFromDb(data);
    }),

  update: protectedProcedure
    .input(updateGoalSchema)
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined)
        updateData.description = input.description || null;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.priority !== undefined) updateData.priority = input.priority;

      const { data, error } = await ctx.db
        .from("goals")
        .update(updateData)
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error) throw new Error(`Failed to update goal: ${error.message}`);
      if (!data) throw new Error("Goal not found or access denied");
      return mapGoalFromDb(data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from("goals")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);

      if (error) throw new Error(`Failed to delete goal: ${error.message}`);
      return { success: true, id: input.id };
    }),
});
