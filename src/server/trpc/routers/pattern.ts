import { z } from "zod";
import { router, protectedProcedure } from "../context";

/**
 * Pattern schemas
 */
export const patternSchema = z.object({
  id: z.string(),
  userId: z.string(),
  patternType: z.string(),
  description: z.string().nullable(),
  confidence: z.number().min(0).max(1),
  occurrences: z.number().int().min(0),
  firstDetected: z.date(),
  lastOccurred: z.date(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createPatternSchema = z.object({
  patternType: z.string().min(1, "Pattern type is required"),
  description: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0.0),
  occurrences: z.number().int().min(0).default(1),
  firstDetected: z.date().optional(),
  lastOccurred: z.date().optional(),
});

export const updatePatternSchema = z.object({
  id: z.string().min(1, "ID is required"),
  patternType: z.string().optional(),
  description: z.string().optional().nullable(),
  confidence: z.number().min(0).max(1).optional(),
  occurrences: z.number().int().min(0).optional(),
  lastOccurred: z.date().optional(),
});

/**
 * Helper function to convert DB row to pattern object
 */
function mapPatternFromDb(pattern: any): z.infer<typeof patternSchema> {
  return {
    id: pattern.id,
    userId: pattern.user_id,
    patternType: pattern.pattern_type,
    description: pattern.description || null,
    confidence: pattern.confidence,
    occurrences: pattern.occurrences,
    firstDetected: new Date(pattern.first_detected),
    lastOccurred: new Date(pattern.last_occurred),
    createdAt: new Date(pattern.created_at),
    updatedAt: new Date(pattern.updated_at),
  };
}

/**
 * Pattern router
 * Handles all pattern-related procedures
 */
export const patternRouter = router({
  /**
   * Get all patterns for the authenticated user
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await (ctx.db as any)
      .from("patterns")
      .select("*")
      .eq("user_id", ctx.user.id)
      .order("last_occurred", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch patterns: ${error.message}`);
    }

    return (data || []).map(mapPatternFromDb);
  }),

  /**
   * Get pattern by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await (ctx.db as any)
        .from("patterns")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch pattern: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      return mapPatternFromDb(data);
    }),

  /**
   * Get patterns by type
   */
  getByType: protectedProcedure
    .input(z.object({ patternType: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await (ctx.db as any)
        .from("patterns")
        .select("*")
        .eq("user_id", ctx.user.id)
        .eq("pattern_type", input.patternType)
        .order("last_occurred", { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch patterns: ${error.message}`);
      }

      return (data || []).map(mapPatternFromDb);
    }),

  /**
   * Create new pattern
   */
  create: protectedProcedure
    .input(createPatternSchema)
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      const { data, error } = await (ctx.db as any)
        .from("patterns")
        .insert({
          user_id: ctx.user.id,
          pattern_type: input.patternType,
          description: input.description || null,
          confidence: input.confidence ?? 0.0,
          occurrences: input.occurrences ?? 1,
          first_detected: input.firstDetected ? input.firstDetected.toISOString() : now.toISOString(),
          last_occurred: input.lastOccurred ? input.lastOccurred.toISOString() : now.toISOString(),
        })
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to create pattern: ${error.message}`);
      }

      if (!data) {
        throw new Error("Failed to create pattern: No data returned");
      }

      return mapPatternFromDb(data);
    }),

  /**
   * Update pattern
   */
  update: protectedProcedure
    .input(updatePatternSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify the pattern belongs to the user
      const { data: existingPattern } = await (ctx.db as any)
        .from("patterns")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      if (!existingPattern) {
        throw new Error("Pattern not found or access denied");
      }

      const updateData: Record<string, unknown> = {};

      if (input.patternType !== undefined) updateData.pattern_type = input.patternType;
      if (input.description !== undefined) updateData.description = input.description || null;
      if (input.confidence !== undefined) updateData.confidence = input.confidence;
      if (input.occurrences !== undefined) updateData.occurrences = input.occurrences;
      if (input.lastOccurred !== undefined) updateData.last_occurred = input.lastOccurred.toISOString();

      const { data, error } = await (ctx.db as any)
        .from("patterns")
        .update(updateData)
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to update pattern: ${error.message}`);
      }

      if (!data) {
        throw new Error("Failed to update pattern: No data returned");
      }

      return mapPatternFromDb(data);
    }),

  /**
   * Delete pattern
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the pattern belongs to the user
      const { data: existingPattern } = await (ctx.db as any)
        .from("patterns")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      if (!existingPattern) {
        throw new Error("Pattern not found or access denied");
      }

      const { error } = await (ctx.db as any)
        .from("patterns")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);

      if (error) {
        throw new Error(`Failed to delete pattern: ${error.message}`);
      }

      return { success: true, id: input.id };
    }),
});

