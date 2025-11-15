import { z } from "zod";
import { router, protectedProcedure } from "../context";

/**
 * Evidence schemas
 */
export const evidenceSchema = z.object({
  id: z.string(),
  taskId: z.string().nullable(),
  type: z.enum(["photo", "screenshot", "text", "link"]),
  content: z.string(),
  submittedAt: z.date(),
  aiValidated: z.boolean(),
  validationNotes: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createEvidenceSchema = z.object({
  taskId: z.string().optional(),
  type: z.enum(["photo", "screenshot", "text", "link"]),
  content: z.string().min(1, "Content is required"),
  aiValidated: z.boolean().optional().default(false),
  validationNotes: z.string().optional(),
});

export const updateEvidenceSchema = z.object({
  id: z.string().min(1, "ID is required"),
  taskId: z.string().optional().nullable(),
  type: z.enum(["photo", "screenshot", "text", "link"]).optional(),
  content: z.string().optional(),
  aiValidated: z.boolean().optional(),
  validationNotes: z.string().optional().nullable(),
});

/**
 * Helper function to convert DB row to evidence object
 */
function mapEvidenceFromDb(evidence: any): z.infer<typeof evidenceSchema> {
  return {
    id: evidence.id,
    taskId: evidence.task_id || null,
    type: evidence.type as "photo" | "screenshot" | "text" | "link",
    content: evidence.content,
    submittedAt: new Date(evidence.submitted_at),
    aiValidated: evidence.ai_validated,
    validationNotes: evidence.validation_notes || null,
    createdAt: new Date(evidence.created_at),
    updatedAt: new Date(evidence.updated_at),
  };
}

/**
 * Evidence router
 * Handles all evidence-related procedures
 */
export const evidenceRouter = router({
  /**
   * Get all evidence for the authenticated user with optional task_id filter
   */
  getAll: protectedProcedure
    .input(
      z.object({
        taskId: z.string().optional(),
        type: z.enum(["photo", "screenshot", "text", "link"]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      // First, get all tasks for the user to ensure we only get evidence for their tasks
      const { data: userTasks } = await ctx.db
        .from("tasks")
        .select("id")
        .eq("user_id", ctx.user.id);

      const taskIds = (userTasks || []).map(t => t.id);

      // If user has no tasks and no specific taskId filter, return empty array
      if (taskIds.length === 0 && !input?.taskId) {
        return [];
      }

      let query = (ctx.db as any)
        .from("evidence")
        .select("*");

      // Filter by task IDs - if specific taskId provided, use that; otherwise use all user's task IDs
      if (input?.taskId) {
        // Verify the task belongs to the user
        if (!taskIds.includes(input.taskId)) {
          return [];
        }
        query = query.eq("task_id", input.taskId);
      } else if (taskIds.length > 0) {
        query = query.in("task_id", taskIds);
      } else {
        // No tasks and no specific taskId - return empty
        return [];
      }

      if (input?.type) {
        query = query.eq("type", input.type);
      }

      query = query.order("submitted_at", { ascending: false });

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch evidence: ${error.message}`);
      }

      return (data || []).map(mapEvidenceFromDb);
    }),

  /**
   * Get evidence by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data: evidence, error } = await (ctx.db as any)
        .from("evidence")
        .select("*")
        .eq("id", input.id)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch evidence: ${error.message}`);
      }

      if (!evidence) {
        return null;
      }

      // Verify the evidence belongs to a task owned by the user
      if (evidence.task_id) {
        const { data: task } = await ctx.db
          .from("tasks")
          .select("user_id")
          .eq("id", evidence.task_id)
          .maybeSingle();

        if (!task || task.user_id !== ctx.user.id) {
          return null;
        }
      }

      return mapEvidenceFromDb(evidence);
    }),

  /**
   * Get all evidence for a specific task
   */
  getByTaskId: protectedProcedure
    .input(z.object({ taskId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify the task belongs to the user
      const { data: task } = await ctx.db
        .from("tasks")
        .select("user_id")
        .eq("id", input.taskId)
        .maybeSingle();

      if (!task || task.user_id !== ctx.user.id) {
        throw new Error("Task not found or access denied");
      }

      const { data, error } = await (ctx.db as any)
        .from("evidence")
        .select("*")
        .eq("task_id", input.taskId)
        .order("submitted_at", { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch evidence: ${error.message}`);
      }

      return (data || []).map(mapEvidenceFromDb);
    }),

  /**
   * Create new evidence
   */
  create: protectedProcedure
    .input(createEvidenceSchema)
    .mutation(async ({ ctx, input }) => {
      // If taskId is provided, verify the task belongs to the user
      if (input.taskId) {
        const { data: task } = await ctx.db
          .from("tasks")
          .select("user_id")
          .eq("id", input.taskId)
          .maybeSingle();

        if (!task || task.user_id !== ctx.user.id) {
          throw new Error("Task not found or access denied");
        }
      }

      const { data, error } = await (ctx.db as any)
        .from("evidence")
        .insert({
          task_id: input.taskId || null,
          type: input.type,
          content: input.content,
          ai_validated: input.aiValidated || false,
          validation_notes: input.validationNotes || null,
        })
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to create evidence: ${error.message}`);
      }

      if (!data) {
        throw new Error("Failed to create evidence: No data returned");
      }

      return mapEvidenceFromDb(data);
    }),

  /**
   * Update evidence
   */
  update: protectedProcedure
    .input(updateEvidenceSchema)
    .mutation(async ({ ctx, input }) => {
      // Get existing evidence
      const { data: existingEvidence } = await (ctx.db as any)
        .from("evidence")
        .select("*, tasks!inner(user_id)")
        .eq("id", input.id)
        .maybeSingle();

      if (!existingEvidence) {
        throw new Error("Evidence not found");
      }

      // Verify the evidence belongs to a task owned by the user
      if (existingEvidence.task_id) {
        const { data: task } = await ctx.db
          .from("tasks")
          .select("user_id")
          .eq("id", existingEvidence.task_id)
          .maybeSingle();

        if (!task || task.user_id !== ctx.user.id) {
          throw new Error("Evidence not found or access denied");
        }
      }

      // If taskId is being updated, verify the new task belongs to the user
      if (input.taskId !== undefined && input.taskId !== null) {
        const { data: task } = await ctx.db
          .from("tasks")
          .select("user_id")
          .eq("id", input.taskId)
          .maybeSingle();

        if (!task || task.user_id !== ctx.user.id) {
          throw new Error("Task not found or access denied");
        }
      }

      const updateData: Record<string, unknown> = {};

      if (input.taskId !== undefined) updateData.task_id = input.taskId;
      if (input.type !== undefined) updateData.type = input.type;
      if (input.content !== undefined) updateData.content = input.content;
      if (input.aiValidated !== undefined) updateData.ai_validated = input.aiValidated;
      if (input.validationNotes !== undefined) updateData.validation_notes = input.validationNotes || null;

      const { data, error } = await (ctx.db as any)
        .from("evidence")
        .update(updateData)
        .eq("id", input.id)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to update evidence: ${error.message}`);
      }

      if (!data) {
        throw new Error("Failed to update evidence: No data returned");
      }

      return mapEvidenceFromDb(data);
    }),

  /**
   * Delete evidence
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get existing evidence
      const { data: existingEvidence } = await (ctx.db as any)
        .from("evidence")
        .select("task_id")
        .eq("id", input.id)
        .maybeSingle();

      if (!existingEvidence) {
        throw new Error("Evidence not found");
      }

      // Verify the evidence belongs to a task owned by the user
      if (existingEvidence.task_id) {
        const { data: task } = await ctx.db
          .from("tasks")
          .select("user_id")
          .eq("id", existingEvidence.task_id)
          .maybeSingle();

        if (!task || task.user_id !== ctx.user.id) {
          throw new Error("Evidence not found or access denied");
        }
      }

      const { error } = await (ctx.db as any)
        .from("evidence")
        .delete()
        .eq("id", input.id);

      if (error) {
        throw new Error(`Failed to delete evidence: ${error.message}`);
      }

      return { success: true, id: input.id };
    }),
});

