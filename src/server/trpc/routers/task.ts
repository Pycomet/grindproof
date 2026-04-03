import { z } from "zod";
import { router, protectedProcedure } from "../context";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  goalId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  recurrencePattern: z.any().optional(),
});

export const updateTaskSchema = z.object({
  id: z.string().min(1, "ID is required"),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  dueDate: z.date().optional().nullable(),
  startTime: z.date().optional().nullable(),
  endTime: z.date().optional().nullable(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  goalId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["pending", "completed", "skipped"]).optional(),
  reflection: z.string().optional().nullable(),
  recurrencePattern: z.any().optional().nullable(),
});

function mapTaskFromDb(task: any) {
  return {
    id: task.id,
    userId: task.user_id,
    goalId: task.goal_id || null,
    title: task.title,
    description: task.description || null,
    dueDate: task.due_date ? new Date(task.due_date) : null,
    startTime: task.start_time ? new Date(task.start_time) : null,
    endTime: task.end_time ? new Date(task.end_time) : null,
    priority: (task.priority as "high" | "medium" | "low") || "medium",
    status: task.status as "pending" | "completed" | "skipped",
    tags: task.tags || null,
    reflection: task.reflection || null,
    recurrencePattern: task.recurrence_pattern || null,
    createdAt: new Date(task.created_at),
    updatedAt: new Date(task.updated_at),
  };
}

export const taskRouter = router({
  getAll: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["pending", "completed", "skipped"]).optional(),
          goalId: z.string().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.db
        .from("tasks")
        .select("*")
        .eq("user_id", ctx.user.id)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (input?.status) query = query.eq("status", input.status);
      if (input?.goalId) query = query.eq("goal_id", input.goalId);
      if (input?.startDate)
        query = query.gte("due_date", input.startDate.toISOString());
      if (input?.endDate)
        query = query.lte("due_date", input.endDate.toISOString());

      const { data, error } = await query.limit(200);
      if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);
      return (data || []).map(mapTaskFromDb);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("tasks")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      if (error) throw new Error(`Failed to fetch task: ${error.message}`);
      if (!data) return null;
      return mapTaskFromDb(data);
    }),

  create: protectedProcedure
    .input(createTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("tasks")
        .insert({
          user_id: ctx.user.id,
          title: input.title,
          description: input.description || null,
          due_date: input.dueDate ? input.dueDate.toISOString() : null,
          start_time: input.startTime ? input.startTime.toISOString() : null,
          end_time: input.endTime ? input.endTime.toISOString() : null,
          priority: input.priority || "medium",
          goal_id: input.goalId || null,
          tags: input.tags || null,
          recurrence_pattern: input.recurrencePattern || null,
          status: "pending",
        })
        .select()
        .maybeSingle();

      if (error) throw new Error(`Failed to create task: ${error.message}`);
      if (!data) throw new Error("Failed to create task: No data returned");
      return mapTaskFromDb(data);
    }),

  update: protectedProcedure
    .input(updateTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {};

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined)
        updateData.description = input.description || null;
      if (input.dueDate !== undefined)
        updateData.due_date = input.dueDate
          ? input.dueDate.toISOString()
          : null;
      if (input.startTime !== undefined)
        updateData.start_time = input.startTime
          ? input.startTime.toISOString()
          : null;
      if (input.endTime !== undefined)
        updateData.end_time = input.endTime
          ? input.endTime.toISOString()
          : null;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.goalId !== undefined)
        updateData.goal_id = input.goalId || null;
      if (input.tags !== undefined) updateData.tags = input.tags || null;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.reflection !== undefined)
        updateData.reflection = input.reflection || null;
      if (input.recurrencePattern !== undefined)
        updateData.recurrence_pattern = input.recurrencePattern || null;

      const { data, error } = await ctx.db
        .from("tasks")
        .update(updateData)
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error) throw new Error(`Failed to update task: ${error.message}`);
      if (!data) throw new Error("Task not found or access denied");
      return mapTaskFromDb(data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from("tasks")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);

      if (error) throw new Error(`Failed to delete task: ${error.message}`);
      return { success: true, id: input.id };
    }),

  complete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("tasks")
        .update({ status: "completed" })
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error) throw new Error(`Failed to complete task: ${error.message}`);
      if (!data) throw new Error("Task not found or access denied");
      return mapTaskFromDb(data);
    }),

  skip: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reflection: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("tasks")
        .update({
          status: "skipped",
          reflection: input.reflection || null,
        })
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error) throw new Error(`Failed to skip task: ${error.message}`);
      if (!data) throw new Error("Task not found or access denied");
      return mapTaskFromDb(data);
    }),

  reschedule: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        newDueDate: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("tasks")
        .update({
          due_date: input.newDueDate.toISOString(),
          status: "pending",
        })
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error)
        throw new Error(`Failed to reschedule task: ${error.message}`);
      if (!data) throw new Error("Task not found or access denied");
      return mapTaskFromDb(data);
    }),
});
