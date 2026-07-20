import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { computeUserPatterns } from "@/lib/ai/patterns";
import { fireAndForgetScoreChange } from "@/lib/accountability/hooks";

/**
 * Check-in / reflection write actions, shared by the tRPC dailyCheck router and
 * the MCP server. These carry the accountability side effects — the carry-over
 * RPC, the daily_checks marker, score recompute, and the pattern engine — so
 * that an MCP-driven check-in keeps streaks and scores in sync exactly like the
 * in-app flow. (Analytics/funnel events stay in the router, where the full user
 * session is available.)
 */

export const eveningReflectionsSchema = z.object({
  reflections: z.array(
    z.object({
      taskId: z.string(),
      status: z.enum(["completed", "skipped"]),
      reflection: z.string().max(2000).optional(),
    })
  ),
});
export type EveningReflectionsInput = z.infer<typeof eveningReflectionsSchema>;

export const morningCheckInSchema = z.object({
  taskIds: z.array(z.string()).max(100).default([]),
});
export type MorningCheckInInput = z.infer<typeof morningCheckInSchema>;

export const taskReflectionSchema = z.object({
  taskId: z.string(),
  reflection: z.string().max(2000).optional(),
  status: z.enum(["completed", "skipped", "pending"]).optional(),
});
export type TaskReflectionInput = z.infer<typeof taskReflectionSchema>;

/** Swallow a unique-violation (idempotent daily_checks marker); rethrow else. */
function isUniqueViolation(err: { code?: string } | null): boolean {
  return err?.code === "23505";
}

/**
 * Morning check-in: carry yesterday's incomplete tasks forward (atomic RPC),
 * record the morning marker (idempotent), and nudge the score. Mirrors
 * dailyCheckRouter.carryOverTasks.
 */
export async function recordMorningCheckIn(
  db: SupabaseClient<Database>,
  userId: string,
  input: MorningCheckInInput
): Promise<{ success: true; count: number }> {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  // Atomic single-statement carry-over via Postgres RPC (RLS scopes user_id).
  // Called unconditionally — an empty task list is a no-op that returns 0.
  const { data: count, error } = await db.rpc("carry_over_tasks", {
    p_task_ids: input.taskIds,
    p_new_due: today.toISOString(),
  });
  if (error) throw new Error(`Failed to carry over tasks: ${error.message}`);
  const carriedOver = count ?? 0;

  const { error: morningErr } = await db
    .from("daily_checks")
    .insert({ user_id: userId, type: "morning" });
  if (morningErr && !isUniqueViolation(morningErr)) {
    throw new Error(`Failed to record check-in: ${morningErr.message}`);
  }

  fireAndForgetScoreChange(db, userId, "task_carried_over");

  return { success: true, count: carriedOver };
}

/**
 * Evening reality-check: apply per-task completed/skipped status + reflections,
 * carry skipped tasks forward, record the evening marker, recompute score, and
 * run the pattern engine. Mirrors dailyCheckRouter.submitEveningReflections
 * (minus the funnel analytics, which stay in the router).
 */
export async function recordEveningReflections(
  db: SupabaseClient<Database>,
  userId: string,
  input: EveningReflectionsInput
): Promise<{ success: true; completedCount: number; skippedCount: number }> {
  const failures: string[] = [];

  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(12, 0, 0, 0);

  const skipIds: string[] = [];
  const skipReflections: Record<string, string> = {};
  const completedIds: string[] = [];
  const completedReflections: Record<string, string> = {};

  for (const item of input.reflections) {
    if (item.status === "skipped") {
      skipIds.push(item.taskId);
      if (item.reflection) skipReflections[item.taskId] = item.reflection;
    } else {
      completedIds.push(item.taskId);
      if (item.reflection) completedReflections[item.taskId] = item.reflection;
    }
  }

  if (skipIds.length > 0) {
    const { error: rpcErr } = await db.rpc("carry_over_tasks", {
      p_task_ids: skipIds,
      p_new_due: tomorrow.toISOString(),
    });
    if (rpcErr) throw new Error(`Failed to carry over tasks: ${rpcErr.message}`);

    for (const id of skipIds) {
      if (skipReflections[id]) {
        const { error } = await db
          .from("tasks")
          .update({ reflection: skipReflections[id] })
          .eq("id", id)
          .eq("user_id", userId);
        if (error) failures.push(id);
      }
    }
  }

  const nowIso = new Date().toISOString();
  for (const id of completedIds) {
    const update: Record<string, unknown> = {
      status: "completed",
      completed_at: nowIso,
    };
    if (completedReflections[id]) update.reflection = completedReflections[id];
    const { error } = await db
      .from("tasks")
      .update(update)
      .eq("id", id)
      .eq("user_id", userId);
    if (error) failures.push(id);
  }

  if (failures.length > 0) {
    throw new Error(`Failed to update tasks: ${failures.join(", ")}`);
  }

  const { error: eveningErr } = await db
    .from("daily_checks")
    .insert({ user_id: userId, type: "evening" });
  if (eveningErr && !isUniqueViolation(eveningErr)) {
    throw new Error(`Failed to record check-in: ${eveningErr.message}`);
  }

  fireAndForgetScoreChange(db, userId, "evening_reflection");

  computeUserPatterns(db, userId).catch((err) =>
    console.error("Pattern engine error:", err)
  );

  return {
    success: true,
    completedCount: completedIds.length,
    skippedCount: skipIds.length,
  };
}

/**
 * Record a reflection (and optionally a new status) on a single task. A lighter
 * tool than the full evening flow — used when an agent logs one task at a time.
 * If a terminal status is set, the score is nudged to stay consistent.
 */
export async function recordTaskReflection(
  db: SupabaseClient<Database>,
  userId: string,
  input: TaskReflectionInput
): Promise<{ success: true; taskId: string }> {
  const update: Record<string, unknown> = {};
  if (input.reflection !== undefined) update.reflection = input.reflection;
  if (input.status !== undefined) {
    update.status = input.status;
    if (input.status === "completed") update.completed_at = new Date().toISOString();
  }

  if (Object.keys(update).length === 0) {
    return { success: true, taskId: input.taskId };
  }

  const { data, error } = await db
    .from("tasks")
    .update(update)
    .eq("id", input.taskId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error) throw new Error(`Failed to update task: ${error.message}`);
  if (!data) throw new Error("Task not found or access denied");

  if (input.status && input.status !== "pending") {
    fireAndForgetScoreChange(db, userId, "evening_reflection");
  }

  return { success: true, taskId: input.taskId };
}
