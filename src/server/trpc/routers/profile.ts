import { z } from "zod";
import { router, protectedProcedure } from "../context";

/**
 * Profile schemas
 */
export const profileSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  profilePicUrl: z.string().nullable(),
  email: z.string(), // Always from auth user, never null
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const updateProfileSchema = z.object({
  name: z.string().optional(),
  profilePicUrl: z.string().optional(),
});

/**
 * Profile router
 * Handles all profile-related procedures
 */
export const profileRouter = router({
  /**
   * Get current user's profile
   */
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("profiles")
      .select("*")
      .eq("id", ctx.user.id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch profile: ${error.message}`);
    }

    // Get email from auth user (immutable)
    const email = ctx.user.email || "";

    if (!data) {
      // Return profile with default values from user
      return {
        id: ctx.user.id,
        name: ctx.user.user_metadata?.name || ctx.user.user_metadata?.full_name || null,
        profilePicUrl: null,
        email,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return {
      id: data.id,
      name: data.name || undefined,
      profilePicUrl: data.profile_pic_url || undefined,
      email, // Always from auth user
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }),

  /**
   * Update current user's profile
   * Creates profile if it doesn't exist
   */
  update: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      // First, check if profile exists
      const { data: existingProfile } = await ctx.db
        .from("profiles")
        .select("*")
        .eq("id", ctx.user.id)
        .maybeSingle();

      const updateData: Record<string, unknown> = {};

      if (input.name !== undefined) updateData.name = input.name || null;
      if (input.profilePicUrl !== undefined)
        updateData.profile_pic_url = input.profilePicUrl || null;

      // If profile doesn't exist, create it
      if (!existingProfile) {
        // Initialize name from user metadata if not provided
        const initialName = updateData.name as string | null || 
          ctx.user.user_metadata?.name || 
          ctx.user.user_metadata?.full_name || 
          null;

        const { data, error } = await ctx.db
          .from("profiles")
          .insert({
            id: ctx.user.id,
            name: initialName,
            profile_pic_url: updateData.profile_pic_url as string | null,
          })
          .select()
          .maybeSingle();

        if (error) {
          throw new Error(`Failed to create profile: ${error.message}`);
        }

        if (!data) {
          throw new Error("Failed to create profile: No data returned");
        }

        return {
          id: data.id,
          name: data.name || undefined,
          profilePicUrl: data.profile_pic_url || undefined,
          email: ctx.user.email || "", // Always from auth user
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        };
      }

      // Update existing profile
      const { data, error } = await ctx.db
        .from("profiles")
        .update(updateData)
        .eq("id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to update profile: ${error.message}`);
      }

      if (!data) {
        throw new Error("Failed to update profile: No data returned");
      }

      return {
        id: data.id,
        name: data.name || undefined,
        profilePicUrl: data.profile_pic_url || undefined,
        email: ctx.user.email || "", // Always from auth user
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    }),
});



