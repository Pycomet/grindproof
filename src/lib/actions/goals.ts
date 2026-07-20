import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Goal write actions, shared by the tRPC goal router and the MCP server so both
 * surfaces stay in lockstep. Each takes an explicit (db, userId) — the caller
 * supplies a client already scoped to the user (cookie-based for tRPC, minted
 * JWT for MCP), and every query additionally filters by user_id as belt-and-
 * suspenders alongside RLS.
 */

export const createGoalSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  description: z.string().max(1000).optional(),
  status: z.enum(["active", "completed"]).default("active"),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
});

export const updateGoalSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(["active", "completed"]).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
});

export type CreateGoalInput = z.infer<typeof createGoalSchema>;
export type UpdateGoalInput = z.infer<typeof updateGoalSchema>;

type GoalRow = Database["public"]["Tables"]["goals"]["Row"];

export function mapGoalFromDb(goal: GoalRow) {
  return {
    id: goal.id,
    userId: goal.user_id,
    title: goal.title,
    description: goal.description || null,
    status: goal.status as "active" | "completed",
    priority: goal.priority as "high" | "medium" | "low",
    createdAt: new Date(goal.created_at),
    updatedAt: new Date(goal.updated_at),
  };
}

export async function createGoal(
  db: SupabaseClient<Database>,
  userId: string,
  input: CreateGoalInput
) {
  const { data, error } = await db
    .from("goals")
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description || null,
      status: input.status || "active",
      priority: input.priority || "medium",
    })
    .select()
    .maybeSingle();

  if (error) throw new Error(`Failed to create goal: ${error.message}`);
  if (!data) throw new Error("Failed to create goal: No data returned");
  return mapGoalFromDb(data);
}

export async function updateGoal(
  db: SupabaseClient<Database>,
  userId: string,
  input: UpdateGoalInput
) {
  const updateData: Record<string, unknown> = {};
  if (input.title !== undefined) updateData.title = input.title;
  if (input.description !== undefined)
    updateData.description = input.description || null;
  if (input.status !== undefined) updateData.status = input.status;
  if (input.priority !== undefined) updateData.priority = input.priority;

  const { data, error } = await db
    .from("goals")
    .update(updateData)
    .eq("id", input.id)
    .eq("user_id", userId)
    .select()
    .maybeSingle();

  if (error) throw new Error(`Failed to update goal: ${error.message}`);
  if (!data) throw new Error("Goal not found or access denied");
  return mapGoalFromDb(data);
}

export async function deleteGoal(
  db: SupabaseClient<Database>,
  userId: string,
  id: string
) {
  const { error } = await db
    .from("goals")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) throw new Error(`Failed to delete goal: ${error.message}`);
  return { success: true as const, id };
}
