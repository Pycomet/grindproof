"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc/client";
import { AccountabilityScoreRing } from "./AccountabilityScoreRing";
import { StreakBreakBanner } from "./StreakBreakBanner";

const TIER_TEXT_COLORS: Record<string, string> = {
  red: "text-red-600 dark:text-red-400",
  orange: "text-orange-600 dark:text-orange-400",
  amber: "text-amber-600 dark:text-amber-400",
  green: "text-green-600 dark:text-green-400",
  purple: "text-purple-600 dark:text-purple-400",
};

export function AccountabilityWidget() {
  const { user } = useAuth();
  const { data, isLoading } = trpc.accountabilityScore.getScore.useQuery(
    undefined,
    { enabled: !!user }
  );
  // Tail of recent snapshots — enough to detect a streak break.
  const { data: trendData } =
    trpc.accountabilityScore.getScoreTrend.useQuery(
      { days: "14" },
      { enabled: !!user }
    );

  if (!user) return null;

  if (isLoading || !data) {
    return (
      <div className="h-28 animate-pulse rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
    );
  }

  const { score, tier, currentStreak, delta, today, drivers } = data;
  const tierColor = TIER_TEXT_COLORS[tier.color] || TIER_TEXT_COLORS.purple;

  // Streak-break detection: today's streak is 0 but yesterday's was meaningful.
  // The trend is sorted ascending (oldest first); the second-to-last entry is
  // yesterday's snapshot.
  const yesterdayScore =
    trendData && trendData.trend.length >= 2
      ? trendData.trend[trendData.trend.length - 2]
      : null;
  // We don't have yesterday's streak in the trend, so we infer: if today's
  // streak is 0 but yesterday was an active day, surface the banner with the
  // best-known length from the live snapshot's history.
  const showBreakBanner =
    currentStreak === 0 &&
    yesterdayScore?.active === true &&
    (trendData?.currentStreak ?? 0) === 0;

  return (
    <div className="space-y-2">
      {showBreakBanner && yesterdayScore && (
        <StreakBreakBanner
          brokenStreak={inferBrokenStreak(trendData?.trend ?? [])}
          endedOn={yesterdayScore.date}
        />
      )}

      <div className="rounded-lg border border-zinc-200 bg-white p-4 text-zinc-900 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <AccountabilityScoreRing score={score} color={tier.color} />
            <div className="min-w-0">
              <div
                className={`text-xs font-semibold uppercase tracking-wide ${tierColor}`}
              >
                {tier.name}
              </div>
              <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                {delta > 0 && (
                  <span className="text-green-600 dark:text-green-400">
                    +{delta} from last week
                  </span>
                )}
                {delta < 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    {delta} from last week
                  </span>
                )}
                {delta === 0 && <span>No change from last week</span>}
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="text-xl font-bold">{currentStreak}</div>
            <div className="text-xs text-amber-600 dark:text-amber-400">
              day streak {currentStreak > 0 ? "🔥" : ""}
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              Today
            </div>
            <div className="text-base font-semibold text-green-600 dark:text-green-400">
              {today.completed}/{today.total} done
            </div>
            <Link
              href="/dashboard/stats"
              className="text-xs text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 transition-colors"
            >
              View stats →
            </Link>
          </div>
        </div>

        <div className="mt-3 border-t border-zinc-100 pt-2 text-xs leading-relaxed text-zinc-600 dark:border-zinc-800 dark:text-zinc-400">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">
            Driven by:
          </span>{" "}
          {drivers.top}
          {drivers.drag && (
            <>
              {" · "}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                Held back by:
              </span>{" "}
              {drivers.drag}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Walk backwards through the trend looking for the longest run of `active`
 * days that ended yesterday. This is a UX-only inference; the real streak
 * lived in yesterday's snapshot which we don't pull separately on this
 * surface.
 */
function inferBrokenStreak(
  trend: { date: string; active: boolean }[]
): number {
  if (trend.length < 2) return 0;
  let count = 0;
  for (let i = trend.length - 2; i >= 0; i--) {
    if (trend[i].active) count++;
    else break;
  }
  return count;
}
