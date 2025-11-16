import { z } from "zod";
import { router, protectedProcedure } from "../context";

/**
 * Conversation schemas
 */
export const conversationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  messages: z.array(z.any()), // JSONB array
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createConversationSchema = z.object({
  messages: z.array(z.any()).default([]),
});

export const updateConversationSchema = z.object({
  id: z.string().min(1, "ID is required"),
  messages: z.array(z.any()),
});

/**
 * Helper function to convert DB row to conversation object
 */
function mapConversationFromDb(conversation: any): z.infer<typeof conversationSchema> {
  return {
    id: conversation.id,
    userId: conversation.user_id,
    messages: Array.isArray(conversation.messages) ? conversation.messages : [],
    createdAt: new Date(conversation.created_at),
    updatedAt: new Date(conversation.updated_at),
  };
}

/**
 * Conversation router
 * Handles all conversation-related procedures
 */
export const conversationRouter = router({
  /**
   * Get all conversations for the authenticated user
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await (ctx.db as any)
      .from("conversations")
      .select("*")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch conversations: ${error.message}`);
    }

    return (data || []).map(mapConversationFromDb);
  }),

  /**
   * Get conversation by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await (ctx.db as any)
        .from("conversations")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch conversation: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      return mapConversationFromDb(data);
    }),

  /**
   * Create new conversation
   */
  create: protectedProcedure
    .input(createConversationSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await (ctx.db as any)
        .from("conversations")
        .insert({
          user_id: ctx.user.id,
          messages: input.messages || [],
        })
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to create conversation: ${error.message}`);
      }

      if (!data) {
        throw new Error("Failed to create conversation: No data returned");
      }

      return mapConversationFromDb(data);
    }),

  /**
   * Update conversation messages
   */
  update: protectedProcedure
    .input(updateConversationSchema)
    .mutation(async ({ ctx, input }) => {
      // Verify the conversation belongs to the user
      const { data: existingConversation } = await (ctx.db as any)
        .from("conversations")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      if (!existingConversation) {
        throw new Error("Conversation not found or access denied");
      }

      const { data, error } = await (ctx.db as any)
        .from("conversations")
        .update({
          messages: input.messages,
        })
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to update conversation: ${error.message}`);
      }

      if (!data) {
        throw new Error("Failed to update conversation: No data returned");
      }

      return mapConversationFromDb(data);
    }),

  /**
   * Delete conversation
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the conversation belongs to the user
      const { data: existingConversation } = await (ctx.db as any)
        .from("conversations")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      if (!existingConversation) {
        throw new Error("Conversation not found or access denied");
      }

      const { error } = await (ctx.db as any)
        .from("conversations")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);

      if (error) {
        throw new Error(`Failed to delete conversation: ${error.message}`);
      }

      return { success: true, id: input.id };
    }),
});

