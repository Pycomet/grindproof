/**
 * Feedback Router
 * Handles feedback submission to Supabase
 */

import { z } from 'zod';
import { router, protectedProcedure } from '../context';

export const feedbackRouter = router({
  /**
   * Submit user feedback
   */
  submit: protectedProcedure
    .input(
      z.object({
        triggerType: z.enum(['chat', 'eveningCheck', 'taskMilestone']),
        feedbackType: z.enum(['star', 'emoji', 'thumbs']),
        rating: z.number().min(1).max(5).optional(),
        emoji: z.string().optional(),
        thumb: z.enum(['up', 'down']).optional(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Validate that appropriate rating is provided based on feedback type
      if (input.feedbackType === 'star' && !input.rating) {
        throw new Error('Rating is required for star feedback');
      }
      if (input.feedbackType === 'emoji' && !input.emoji) {
        throw new Error('Emoji is required for emoji feedback');
      }
      if (input.feedbackType === 'thumbs' && !input.thumb) {
        throw new Error('Thumb is required for thumbs feedback');
      }

      const { data, error } = await ctx.db
        .from('user_feedback')
        .insert({
          user_id: userId,
          trigger_type: input.triggerType,
          feedback_type: input.feedbackType,
          rating: input.rating || null,
          emoji: input.emoji || null,
          thumb: input.thumb || null,
          comment: input.comment || null,
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to submit feedback: ${error.message}`);
      }

      return {
        success: true,
        feedback: data,
      };
    }),

  /**
   * Get user's feedback history (optional - for viewing past feedback)
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const { data, error } = await ctx.db
        .from('user_feedback')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(input.limit);

      if (error) {
        throw new Error(`Failed to fetch feedback history: ${error.message}`);
      }

      return data || [];
    }),
});

