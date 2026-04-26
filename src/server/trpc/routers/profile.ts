import { z } from "zod";
import { router, protectedProcedure } from "../context";
import { supabaseAdmin } from "@/lib/supabase/server";

export const updateProfileSchema = z.object({
  name: z.string().optional(),
});

export const profileRouter = router({
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("profiles")
      .select("*")
      .eq("id", ctx.user.id)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch profile: ${error.message}`);

    const email = ctx.user.email || "";

    if (!data) {
      return {
        id: ctx.user.id,
        name:
          ctx.user.user_metadata?.name ||
          ctx.user.user_metadata?.full_name ||
          null,
        email,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return {
      id: data.id,
      name: data.name || null,
      email: (data as any).email || email,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }),

  update: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const { data: existing } = await ctx.db
        .from("profiles")
        .select("*")
        .eq("id", ctx.user.id)
        .maybeSingle();

      const email = ctx.user.email || "";

      if (!existing) {
        const initialName =
          input.name ||
          ctx.user.user_metadata?.name ||
          ctx.user.user_metadata?.full_name ||
          null;

        const { data, error } = await ctx.db
          .from("profiles")
          .insert({ id: ctx.user.id, name: initialName, email })
          .select()
          .maybeSingle();

        if (error) throw new Error(`Failed to create profile: ${error.message}`);
        if (!data) throw new Error("Failed to create profile");

        return {
          id: data.id,
          name: data.name || null,
          email: (data as any).email || email,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        };
      }

      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name || null;

      const { data, error } = await ctx.db
        .from("profiles")
        .update(updateData)
        .eq("id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error) throw new Error(`Failed to update profile: ${error.message}`);
      if (!data) throw new Error("Failed to update profile");

      return {
        id: data.id,
        name: data.name || null,
        email: (data as any).email || email,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    }),

  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id;

    const tables = [
      "push_subscriptions",
      "notification_settings",
      "daily_checks",
      "coach_memory",
      "conversations",
      "weekly_roasts",
      "notification_log",
      "tasks",
      "goals",
    ] as const;

    const errors: string[] = [];

    for (const table of tables) {
      const { error } = await ctx.db.from(table).delete().eq("user_id", userId);
      if (error) {
        errors.push(`${table}: ${error.message}`);
      }
    }

    // profiles uses 'id' not 'user_id'
    const { error: profileError } = await ctx.db.from("profiles").delete().eq("id", userId);
    if (profileError) {
      errors.push(`profiles: ${profileError.message}`);
    }

    if (errors.length > 0) {
      throw new Error(`Failed to delete user data: ${errors.join(", ")}`);
    }

    // Delete the auth user via admin API
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (authError) {
      throw new Error(`Failed to delete auth user: ${authError.message}`);
    }

    return { success: true };
  }),
});
