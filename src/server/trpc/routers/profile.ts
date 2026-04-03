import { z } from "zod";
import { router, protectedProcedure } from "../context";

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
      email: data.email || email,
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
          email: data.email || email,
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
        email: data.email || email,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    }),
});
