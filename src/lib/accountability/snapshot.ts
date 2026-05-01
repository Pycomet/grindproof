/**
 * Read/write helpers for accountability_snapshots. Upsert is keyed on
 * (user_id, local_date) so calling it twice for the same day overwrites
 * cleanly — mutation hooks fire many times per day; the cron writes at
 * local midnight; both must converge.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import type { AccountabilitySnapshot } from "./compute";

export type SnapshotRow =
  Database["public"]["Tables"]["accountability_snapshots"]["Row"];

export async function upsertSnapshot(
  db: SupabaseClient<Database>,
  userId: string,
  snap: AccountabilitySnapshot
): Promise<void> {
  await db
    .from("accountability_snapshots")
    .upsert(
      {
        user_id: userId,
        local_date: snap.localDate,
        score: snap.score,
        streak: snap.streak,
        weighted_completion: snap.weightedCompletion,
        consistency_rate: Math.round(snap.consistencyRate),
        discipline_score: snap.disciplineScore,
        velocity_bonus: snap.velocityBonus,
        streak_bonus: snap.streakBonus,
        active: snap.active,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "user_id,local_date" }
    );
}

/**
 * Fetch snapshots covering the requested local-date range. Caller passes
 * inclusive YYYY-MM-DD strings already computed in the user's timezone.
 */
export async function fetchSnapshotRange(
  db: SupabaseClient<Database>,
  userId: string,
  fromLocalDate: string,
  toLocalDate: string
): Promise<SnapshotRow[]> {
  const { data } = await db
    .from("accountability_snapshots")
    .select("*")
    .eq("user_id", userId)
    .gte("local_date", fromLocalDate)
    .lte("local_date", toLocalDate)
    .order("local_date", { ascending: true });
  return data || [];
}

/** Latest N snapshots for hysteresis lookups. */
export async function fetchRecentSnapshots(
  db: SupabaseClient<Database>,
  userId: string,
  limit = 5
): Promise<SnapshotRow[]> {
  const { data } = await db
    .from("accountability_snapshots")
    .select("*")
    .eq("user_id", userId)
    .order("local_date", { ascending: false })
    .limit(limit);
  return data || [];
}
