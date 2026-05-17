import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";

const WEEKLY_DISPLAY_THRESHOLD = 10;
const LIFETIME_DISPLAY_THRESHOLD = 25;

export type RoastCountDisplay =
  | { mode: "weekly"; count: number }
  | { mode: "lifetime"; count: number }
  | { mode: "hidden" };

export interface RoastCountResult {
  display: RoastCountDisplay;
  weekly: number;
  lifetime: number;
  generatedAt: string;
}

function startOfThisWeekUtc(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dow = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() - dow);
  return d;
}

export function pickDisplay(weekly: number, lifetime: number): RoastCountDisplay {
  if (lifetime < LIFETIME_DISPLAY_THRESHOLD) return { mode: "hidden" };
  if (weekly >= WEEKLY_DISPLAY_THRESHOLD) return { mode: "weekly", count: weekly };
  return { mode: "lifetime", count: lifetime };
}

// weekly_roasts is created by an MVP v2 migration whose types aren't yet
// regenerated into Database. Narrow the surface we depend on.
interface CountQuery {
  gte: (column: string, value: string) => Promise<{ count: number | null; error: unknown }>;
  then: Promise<{ count: number | null; error: unknown }>["then"];
}
type CountableFrom = {
  from: (table: string) => {
    select: (columns: string, opts: { count: "exact"; head: true }) => CountQuery & Promise<{ count: number | null; error: unknown }>;
  };
};

export async function getRoastCount(now: Date = new Date()): Promise<RoastCountResult> {
  const weekStart = startOfThisWeekUtc(now);
  const db = supabaseAdmin as unknown as CountableFrom;

  const [weeklyRes, lifetimeRes] = await Promise.all([
    db
      .from("weekly_roasts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekStart.toISOString()),
    db
      .from("weekly_roasts")
      .select("id", { count: "exact", head: true }),
  ]);

  if (weeklyRes.error) throw weeklyRes.error;
  if (lifetimeRes.error) throw lifetimeRes.error;

  const weekly = weeklyRes.count ?? 0;
  const lifetime = lifetimeRes.count ?? 0;

  return {
    display: pickDisplay(weekly, lifetime),
    weekly,
    lifetime,
    generatedAt: now.toISOString(),
  };
}
