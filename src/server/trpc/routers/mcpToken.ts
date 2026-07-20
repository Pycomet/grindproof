import { z } from "zod";
import { router, protectedProcedure } from "../context";
import { generateMcpToken } from "@/lib/mcp/token";

/**
 * Management API for MCP personal access tokens, used by the "Connect an agent"
 * settings UI. All queries run through the cookie-scoped client, so RLS already
 * confines a user to their own rows; the explicit user_id filters are
 * belt-and-suspenders. The plaintext token is returned by `create` exactly once
 * and never stored (only its hash is).
 */

export const createMcpTokenSchema = z.object({
  name: z.string().min(1).max(100),
  // null / omitted = never expires. Capped at 10 years.
  expiresInDays: z.number().int().positive().max(3650).nullable().optional(),
});

export const mcpTokenRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("mcp_tokens")
      .select("id, name, token_prefix, scopes, last_used_at, expires_at, created_at")
      .eq("user_id", ctx.user.id)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to list tokens: ${error.message}`);

    return (data ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      prefix: t.token_prefix,
      scopes: t.scopes,
      lastUsedAt: t.last_used_at ? new Date(t.last_used_at) : null,
      expiresAt: t.expires_at ? new Date(t.expires_at) : null,
      createdAt: new Date(t.created_at),
    }));
  }),

  create: protectedProcedure
    .input(createMcpTokenSchema)
    .mutation(async ({ ctx, input }) => {
      const { token, hash, prefix } = generateMcpToken();
      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 86_400_000).toISOString()
        : null;

      const { data, error } = await ctx.db
        .from("mcp_tokens")
        .insert({
          user_id: ctx.user.id,
          name: input.name,
          token_hash: hash,
          token_prefix: prefix,
          scopes: ["*"],
          expires_at: expiresAt,
        })
        .select("id, name, token_prefix, expires_at, created_at")
        .single();

      if (error) throw new Error(`Failed to create token: ${error.message}`);

      // The one and only time the plaintext token leaves the server.
      return {
        token,
        id: data.id,
        name: data.name,
        prefix: data.token_prefix,
        expiresAt: data.expires_at ? new Date(data.expires_at) : null,
        createdAt: new Date(data.created_at),
      };
    }),

  revoke: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from("mcp_tokens")
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);

      if (error) throw new Error(`Failed to revoke token: ${error.message}`);
      return { success: true as const, id: input.id };
    }),
});
