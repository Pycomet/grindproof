import { z } from "zod";
import { router, protectedProcedure } from "../context";

/**
 * Accountability score schemas
 */
export const accountabilityScoreSchema = z.object({
  id: z.string(),
  userId: z.string(),
  weekStart: z.date(),
  alignmentScore: z.number().min(0).max(1).nullable(),
  honestyScore: z.number().min(0).max(1).nullable(),
  completionRate: z.number().min(0).max(1).nullable(),
  newProjectsStarted: z.number().int().min(0),
  evidenceSubmissions: z.number().int().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createAccountabilityScoreSchema = z.object({
  weekStart: z.date(),
  alignmentScore: z.number().min(0).max(1).optional().nullable(),
  honestyScore: z.number().min(0).max(1).optional().nullable(),
  completionRate: z.number().min(0).max(1).optional().nullable(),
  newProjectsStarted: z.number().int().min(0).default(0),
  evidenceSubmissions: z.number().int().min(0).default(0),
});

export const updateAccountabilityScoreSchema = z.object({
  id: z.string().min(1, "ID is required"),
  alignmentScore: z.number().min(0).max(1).optional().nullable(),
  honestyScore: z.number().min(0).max(1).optional().nullable(),
  completionRate: z.number().min(0).max(1).optional().nullable(),
  newProjectsStarted: z.number().int().min(0).optional(),
  evidenceSubmissions: z.number().int().min(0).optional(),
});

/**
 * Helper function to convert DB row to accountability score object
 */
function mapAccountabilityScoreFromDb(score: any): z.infer<typeof accountabilityScoreSchema> {
  return {
    id: score.id,
    userId: score.user_id,
    weekStart: new Date(score.week_start),
    alignmentScore: score.alignment_score !== null ? score.alignment_score : null,
    honestyScore: score.honesty_score !== null ? score.honesty_score : null,
    completionRate: score.completion_rate !== null ? score.completion_rate : null,
    newProjectsStarted: score.new_projects_started,
    evidenceSubmissions: score.evidence_submissions,
    createdAt: new Date(score.created_at),
    updatedAt: new Date(score.updated_at),
  };
}

/**
 * Accountability score router
 * Handles all accountability score-related procedures
 */
export const accountabilityScoreRouter = router({
  /**
   * Get all accountability scores for the authenticated user
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await (ctx.db as any)
      .from("accountability_scores")
      .select("*")
      .eq("user_id", ctx.user.id)
      .order("week_start", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch accountability scores: ${error.message}`);
    }

    return (data || []).map(mapAccountabilityScoreFromDb);
  }),

  /**
   * Get accountability score by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await (ctx.db as any)
        .from("accountability_scores")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch accountability score: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      return mapAccountabilityScoreFromDb(data);
    }),

  /**
   * Get accountability score for a specific week
   */
  getByWeek: protectedProcedure
    .input(z.object({ weekStart: z.date() }))
    .query(async ({ ctx, input }) => {
      // Format date as YYYY-MM-DD for comparison
      const weekStartStr = input.weekStart.toISOString().split('T')[0];

      const { data, error } = await (ctx.db as any)
        .from("accountability_scores")
        .select("*")
        .eq("user_id", ctx.user.id)
        .eq("week_start", weekStartStr)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch accountability score: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      return mapAccountabilityScoreFromDb(data);
    }),

  /**
   * Create new accountability score
   */
  create: protectedProcedure
    .input(createAccountabilityScoreSchema)
    .mutation(async ({ ctx, input }) => {
      // Format date as YYYY-MM-DD
      const weekStartStr = input.weekStart.toISOString().split('T')[0];

      // Check if score already exists for this week
      const { data: existing } = await (ctx.db as any)
        .from("accountability_scores")
        .select("id")
        .eq("user_id", ctx.user.id)
        .eq("week_start", weekStartStr)
        .maybeSingle();

      if (existing) {
        throw new Error("Accountability score already exists for this week");
      }

      const { data, error } = await (ctx.db as any)
        .from("accountability_scores")
        .insert({
          user_id: ctx.user.id,
          week_start: weekStartStr,
          alignment_score: input.alignmentScore ?? null,
          honesty_score: input.honestyScore ?? null,
          completion_rate: input.completionRate ?? null,
          new_projects_started: input.newProjectsStarted ?? 0,
          evidence_submissions: input.evidenceSubmissions ?? 0,
        })
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to create accountability score: ${error.message}`);
      }

      if (!data) {
        throw new Error("Failed to create accountability score: No data returned");
      }

      return mapAccountabilityScoreFromDb(data);
    }),

  /**
   * Update accountability score
   */
  update: protectedProcedure
    .input(updateAccountabilityScoreSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify the score belongs to the user
      const { data: existingScore } = await (ctx.db as any)
        .from("accountability_scores")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      if (!existingScore) {
        throw new Error("Accountability score not found or access denied");
      }

      const updateData: Record<string, unknown> = {};

      if (input.alignmentScore !== undefined) updateData.alignment_score = input.alignmentScore;
      if (input.honestyScore !== undefined) updateData.honesty_score = input.honestyScore;
      if (input.completionRate !== undefined) updateData.completion_rate = input.completionRate;
      if (input.newProjectsStarted !== undefined) updateData.new_projects_started = input.newProjectsStarted;
      if (input.evidenceSubmissions !== undefined) updateData.evidence_submissions = input.evidenceSubmissions;

      const { data, error } = await (ctx.db as any)
        .from("accountability_scores")
        .update(updateData)
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to update accountability score: ${error.message}`);
      }

      if (!data) {
        throw new Error("Failed to update accountability score: No data returned");
      }

      return mapAccountabilityScoreFromDb(data);
    }),

  /**
   * Delete accountability score
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the score belongs to the user
      const { data: existingScore } = await (ctx.db as any)
        .from("accountability_scores")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      if (!existingScore) {
        throw new Error("Accountability score not found or access denied");
      }

      const { error } = await (ctx.db as any)
        .from("accountability_scores")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);

      if (error) {
        throw new Error(`Failed to delete accountability score: ${error.message}`);
      }

      return { success: true, id: input.id };
    }),
});

