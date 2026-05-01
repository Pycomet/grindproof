/**
 * Append a row to score_events whenever the score changes meaningfully.
 *
 * Why: when a user asks "why did my score drop?", the stats page reads back
 * the most recent N events and renders them. The append is fire-and-forget
 * from mutation hooks; we never block the user's request on it.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export type ScoreEventReason =
  | "task_completed"
  | "task_skipped"
  | "task_rescheduled"
  | "task_carried_over"
  | "evening_reflection"
  | "snapshot_cron";

export interface ScoreEventInput {
  userId: string;
  scoreBefore: number | null;
  scoreAfter: number;
  reason: ScoreEventReason;
  relatedTaskId?: string | null;
}

export async function appendScoreEvent(
  db: SupabaseClient<Database>,
  input: ScoreEventInput
): Promise<void> {
  // Skip the noise: identical before/after with no related task id is just a
  // recompute that didn't move the needle.
  if (
    input.scoreBefore !== null &&
    input.scoreBefore === input.scoreAfter &&
    !input.relatedTaskId
  ) {
    return;
  }

  await db.from("score_events").insert({
    user_id: input.userId,
    score_before: input.scoreBefore,
    score_after: input.scoreAfter,
    reason: input.reason,
    related_task_id: input.relatedTaskId ?? null,
  });
}

export async function fetchRecentScoreEvents(
  db: SupabaseClient<Database>,
  userId: string,
  limit = 10
) {
  const { data } = await db
    .from("score_events")
    .select("*")
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .limit(limit);
  return data || [];
}
