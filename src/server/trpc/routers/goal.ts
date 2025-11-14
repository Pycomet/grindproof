import { z } from "zod";
import { router, protectedProcedure } from "../context";

/**
 * Goal schemas
 */
export const goalSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  targetDate: z.date().optional(),
  status: z.enum(["active", "completed", "paused"]).default("active"),
  githubRepos: z.array(z.string()).optional(), // Array of "owner/repo" format
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  timeHorizon: z.enum(["daily", "weekly", "monthly", "annual"]).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createGoalSchema = goalSchema.omit({
  id: true,
  userId: true,
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
   * Get all goals for the authenticated user
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("goals")
      .select("*")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch goals: ${error.message}`);
    }

    return (data || []).map((goal: {
      id: string;
      user_id: string;
      title: string;
      description: string | null;
      target_date: string | null;
      status: string;
      github_repos: string[] | null;
      priority: string;
      time_horizon: string | null;
      created_at: string;
      updated_at: string;
    }) => ({
      id: goal.id,
      userId: goal.user_id,
      title: goal.title,
      description: goal.description || undefined,
      targetDate: goal.target_date ? new Date(goal.target_date) : undefined,
      status: goal.status as "active" | "completed" | "paused",
      githubRepos: goal.github_repos || undefined,
      priority: goal.priority as "high" | "medium" | "low",
      timeHorizon: goal.time_horizon as "daily" | "weekly" | "monthly" | "annual" | undefined,
      createdAt: new Date(goal.created_at),
      updatedAt: new Date(goal.updated_at),
    }));
  }),

  /**
   * Get a goal by ID (user can only get their own goals)
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("goals")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
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
        userId: goal.user_id,
        title: goal.title,
        description: goal.description || undefined,
        targetDate: goal.target_date ? new Date(goal.target_date) : undefined,
        status: goal.status as "active" | "completed" | "paused",
        githubRepos: goal.github_repos || undefined,
        priority: goal.priority as "high" | "medium" | "low",
        timeHorizon: goal.time_horizon as "daily" | "weekly" | "monthly" | "annual" | undefined,
        createdAt: new Date(goal.created_at),
        updatedAt: new Date(goal.updated_at),
      };
    }),

  /**
   * Create a new goal for the authenticated user
   */
  create: protectedProcedure
    .input(createGoalSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("goals")
        .insert({
          user_id: ctx.user.id,
          title: input.title,
          description: input.description || null,
          target_date: input.targetDate ? input.targetDate.toISOString() : null,
          status: input.status || "active",
          github_repos: input.githubRepos || null,
          priority: input.priority || "medium",
          time_horizon: input.timeHorizon || null,
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
        userId: goal.user_id,
        title: goal.title,
        description: goal.description || undefined,
        targetDate: goal.target_date ? new Date(goal.target_date) : undefined,
        status: goal.status as "active" | "completed" | "paused",
        githubRepos: goal.github_repos || undefined,
        priority: goal.priority as "high" | "medium" | "low",
        timeHorizon: goal.time_horizon as "daily" | "weekly" | "monthly" | "annual" | undefined,
        createdAt: new Date(goal.created_at),
        updatedAt: new Date(goal.updated_at),
      };
    }),

  /**
   * Update a goal (user can only update their own goals)
   */
  update: protectedProcedure
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
      if (input.githubRepos !== undefined) updateData.github_repos = input.githubRepos || null;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.timeHorizon !== undefined) updateData.time_horizon = input.timeHorizon || null;

      const { data, error } = await ctx.db
        .from("goals")
        .update(updateData)
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
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
        userId: goal.user_id,
        title: goal.title,
        description: goal.description || undefined,
        targetDate: goal.target_date ? new Date(goal.target_date) : undefined,
        status: goal.status as "active" | "completed" | "paused",
        githubRepos: goal.github_repos || undefined,
        priority: goal.priority as "high" | "medium" | "low",
        timeHorizon: goal.time_horizon as "daily" | "weekly" | "monthly" | "annual" | undefined,
        createdAt: new Date(goal.created_at),
        updatedAt: new Date(goal.updated_at),
      };
    }),

  /**
   * Delete a goal (user can only delete their own goals)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from("goals")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);

      if (error) {
        throw new Error(`Failed to delete goal: ${error.message}`);
      }

      return { success: true, id: input.id };
    }),
});

