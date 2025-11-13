import { z } from "zod";
import { router, publicProcedure } from "../context";

/**
 * Goal schemas
 */
export const goalSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  targetDate: z.date().optional(),
  status: z.enum(["active", "completed", "paused"]).default("active"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createGoalSchema = goalSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateGoalSchema = createGoalSchema.partial().extend({
  id: z.string(),
});

/**
 * Goal router
 * Handles all goal-related procedures
 */
export const goalRouter = router({
  /**
   * Get all goals
   */
  getAll: publicProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("goals")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch goals: ${error.message}`);
    }

    return (data || []).map((goal: {
      id: string;
      title: string;
      description: string | null;
      target_date: string | null;
      status: string;
      created_at: string;
      updated_at: string;
    }) => ({
      id: goal.id,
      title: goal.title,
      description: goal.description || undefined,
      targetDate: goal.target_date ? new Date(goal.target_date) : undefined,
      status: goal.status as "active" | "completed" | "paused",
      createdAt: new Date(goal.created_at),
      updatedAt: new Date(goal.updated_at),
    }));
  }),

  /**
   * Get a goal by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("goals")
        .select("*")
        .eq("id", input.id)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch goal: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      // Type assertion to help TypeScript understand the data structure
      const goal = data as any;

      return {
        id: goal.id,
        title: goal.title,
        description: goal.description || undefined,
        targetDate: goal.target_date ? new Date(goal.target_date) : undefined,
        status: goal.status as "active" | "completed" | "paused",
        createdAt: new Date(goal.created_at),
        updatedAt: new Date(goal.updated_at),
      };
    }),

  /**
   * Create a new goal
   */
  create: publicProcedure
    .input(createGoalSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("goals")
        .insert({
          title: input.title,
          description: input.description || null,
          target_date: input.targetDate ? input.targetDate.toISOString() : null,
          status: input.status || "active",
        })
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to create goal: ${error.message}`);
      }

      if (!data) {
        throw new Error("Failed to create goal: No data returned");
      }

      const goal = data as any;

      return {
        id: goal.id,
        title: goal.title,
        description: goal.description || undefined,
        targetDate: goal.target_date ? new Date(goal.target_date) : undefined,
        status: goal.status as "active" | "completed" | "paused",
        createdAt: new Date(goal.created_at),
        updatedAt: new Date(goal.updated_at),
      };
    }),

  /**
   * Update a goal
   */
  update: publicProcedure
    .input(updateGoalSchema)
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {};

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined)
        updateData.description = input.description || null;
      if (input.targetDate !== undefined)
        updateData.target_date = input.targetDate
          ? input.targetDate.toISOString()
          : null;
      if (input.status !== undefined) updateData.status = input.status;

      const { data, error } = await ctx.db
        .from("goals")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to update goal: ${error.message}`);
      }

      if (!data) {
        throw new Error("Failed to update goal: No data returned");
      }

      const goal = data as any;

      return {
        id: goal.id,
        title: goal.title,
        description: goal.description || undefined,
        targetDate: goal.target_date ? new Date(goal.target_date) : undefined,
        status: goal.status as "active" | "completed" | "paused",
        createdAt: new Date(goal.created_at),
        updatedAt: new Date(goal.updated_at),
      };
    }),

  /**
   * Delete a goal
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db.from("goals").delete().eq("id", input.id);

      if (error) {
        throw new Error(`Failed to delete goal: ${error.message}`);
      }

      return { success: true, id: input.id };
    }),
});

