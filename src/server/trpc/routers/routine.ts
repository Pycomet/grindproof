import { z } from "zod";
import { router, publicProcedure } from "../context";

/**
 * Routine schemas
 */
export const routineSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "custom"]).default("daily"),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(), // 0 = Sunday, 6 = Saturday
  timeOfDay: z.string().optional(), // e.g., "09:00"
  isActive: z.boolean().default(true),
  goalId: z.string().optional(), // Link to a goal if applicable
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createRoutineSchema = routineSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateRoutineSchema = createRoutineSchema.partial().extend({
  id: z.string(),
});

/**
 * Routine router
 * Handles all routine-related procedures
 */
export const routineRouter = router({
  /**
   * Get all routines
   */
  getAll: publicProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("routines")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch routines: ${error.message}`);
    }

    return (data || []).map((routine: {
      id: string;
      name: string;
      description: string | null;
      frequency: string;
      days_of_week: number[] | null;
      time_of_day: string | null;
      is_active: boolean;
      goal_id: string | null;
      created_at: string;
      updated_at: string;
    }) => ({
      id: routine.id,
      name: routine.name,
      description: routine.description || undefined,
      frequency: routine.frequency as "daily" | "weekly" | "custom",
      daysOfWeek: routine.days_of_week || undefined,
      timeOfDay: routine.time_of_day || undefined,
      isActive: routine.is_active,
      goalId: routine.goal_id || undefined,
      createdAt: new Date(routine.created_at),
      updatedAt: new Date(routine.updated_at),
    }));
  }),

  /**
   * Get a routine by ID
   */
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("routines")
        .select("*")
        .eq("id", input.id)
        .single();

      if (error) {
        throw new Error(`Failed to fetch routine: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        frequency: data.frequency as "daily" | "weekly" | "custom",
        daysOfWeek: data.days_of_week || undefined,
        timeOfDay: data.time_of_day || undefined,
        isActive: data.is_active,
        goalId: data.goal_id || undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    }),

  /**
   * Get routines by goal ID
   */
  getByGoalId: publicProcedure
    .input(z.object({ goalId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("routines")
        .select("*")
        .eq("goal_id", input.goalId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch routines: ${error.message}`);
      }

      return (data || []).map((routine: {
      id: string;
      name: string;
      description: string | null;
      frequency: string;
      days_of_week: number[] | null;
      time_of_day: string | null;
      is_active: boolean;
      goal_id: string | null;
      created_at: string;
      updated_at: string;
    }) => ({
        id: routine.id,
        name: routine.name,
        description: routine.description || undefined,
        frequency: routine.frequency as "daily" | "weekly" | "custom",
        daysOfWeek: routine.days_of_week || undefined,
        timeOfDay: routine.time_of_day || undefined,
        isActive: routine.is_active,
        goalId: routine.goal_id || undefined,
        createdAt: new Date(routine.created_at),
        updatedAt: new Date(routine.updated_at),
      }));
    }),

  /**
   * Create a new routine
   */
  create: publicProcedure
    .input(createRoutineSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("routines")
        .insert({
          name: input.name,
          description: input.description || null,
          frequency: input.frequency || "daily",
          days_of_week: input.daysOfWeek || null,
          time_of_day: input.timeOfDay || null,
          is_active: input.isActive !== undefined ? input.isActive : true,
          goal_id: input.goalId || null,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create routine: ${error.message}`);
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        frequency: data.frequency as "daily" | "weekly" | "custom",
        daysOfWeek: data.days_of_week || undefined,
        timeOfDay: data.time_of_day || undefined,
        isActive: data.is_active,
        goalId: data.goal_id || undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    }),

  /**
   * Update a routine
   */
  update: publicProcedure
    .input(updateRoutineSchema)
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {};

      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined)
        updateData.description = input.description || null;
      if (input.frequency !== undefined) updateData.frequency = input.frequency;
      if (input.daysOfWeek !== undefined)
        updateData.days_of_week = input.daysOfWeek || null;
      if (input.timeOfDay !== undefined)
        updateData.time_of_day = input.timeOfDay || null;
      if (input.isActive !== undefined) updateData.is_active = input.isActive;
      if (input.goalId !== undefined) updateData.goal_id = input.goalId || null;

      const { data, error } = await ctx.db
        .from("routines")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update routine: ${error.message}`);
      }

      return {
        id: data.id,
        name: data.name,
        description: data.description || undefined,
        frequency: data.frequency as "daily" | "weekly" | "custom",
        daysOfWeek: data.days_of_week || undefined,
        timeOfDay: data.time_of_day || undefined,
        isActive: data.is_active,
        goalId: data.goal_id || undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    }),

  /**
   * Delete a routine
   */
  delete: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from("routines")
        .delete()
        .eq("id", input.id);

      if (error) {
        throw new Error(`Failed to delete routine: ${error.message}`);
      }

      return { success: true, id: input.id };
    }),

  /**
   * Toggle routine active status
   */
  toggleActive: publicProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // First get the current routine
      const { data: routine, error: fetchError } = await ctx.db
        .from("routines")
        .select("is_active")
        .eq("id", input.id)
        .single();

      if (fetchError || !routine) {
        throw new Error(`Failed to fetch routine: ${fetchError?.message || "Routine not found"}`);
      }

      // Toggle the status
      const { data, error } = await ctx.db
        .from("routines")
        .update({ is_active: !routine.is_active })
        .eq("id", input.id)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to toggle routine status: ${error.message}`);
      }

      return {
        id: data.id,
        isActive: data.is_active,
      };
    }),
});

