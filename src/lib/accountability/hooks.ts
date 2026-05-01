/**
 * Mutation hook: after a write that could move the score, recompute the
 * snapshot, upsert it, and append a score_events row. Always fire-and-forget
 * from the caller — it must not block the user's request.
 *
 * Usage:
 *   recordScoreChange(ctx.db, ctx.user.id, "task_completed", taskId).catch(...)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { computeUserAccountability } from "./compute";
import { upsertSnapshot, fetchRecentSnapshots } from "./snapshot";
import { appendScoreEvent, type ScoreEventReason } from "./events";

export async function recordScoreChange(
  db: SupabaseClient<Database>,
  userId: string,
  reason: ScoreEventReason,
  relatedTaskId?: string | null
): Promise<void> {
  // Capture the most recent snapshot's score as the "before" reading. If we
  // can't read it, the event still records (scoreBefore = null is acceptable).
  let scoreBefore: number | null = null;
  try {
    const recent = await fetchRecentSnapshots(db, userId, 1);
    if (recent.length > 0) scoreBefore = recent[0].score;
  } catch {
    // Non-fatal — snapshot table might not exist on a partially migrated DB.
  }

  const snap = await computeUserAccountability(db, userId);
  await upsertSnapshot(db, userId, snap);
  await appendScoreEvent(db, {
    userId,
    scoreBefore,
    scoreAfter: snap.score,
    reason,
    relatedTaskId: relatedTaskId ?? null,
  });
}

/** Convenience wrapper that swallows errors and logs — for fire-and-forget callers. */
export function fireAndForgetScoreChange(
  db: SupabaseClient<Database>,
  userId: string,
  reason: ScoreEventReason,
  relatedTaskId?: string | null
): void {
  recordScoreChange(db, userId, reason, relatedTaskId).catch((err) => {
    console.error("[accountability] hook failed", { userId, reason, err });
  });
}
