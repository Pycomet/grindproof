"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc/client";
import { AccountabilityScoreRing } from "@/components/AccountabilityScoreRing";

const TIER_COLORS: Record<string, string> = {
  red: "text-tier-slacking",
  orange: "text-tier-warming",
  amber: "text-tier-grinding",
  green: "text-tier-locked",
  purple: "text-tier-proven",
};

type TimeRange = "14" | "30" | "all";

interface TrendPoint {
  date: string;
  score: number;
  completed: number;
  total: number;
  active: boolean;
}

function ScoreTrendChart({ trend }: { trend: TrendPoint[] }) {
  const maxScore = 100;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-white">
        Score Trend
      </h3>
      <div className="flex items-end gap-1" style={{ height: 120 }}>
        {trend.map((day, i) => {
          const isToday = i === trend.length - 1;
          const barHeight =
            day.score === 0
              ? 0
              : Math.max((day.score / maxScore) * 100, (4 / 120) * 100);
          return (
            <div
              key={day.date}
              className="flex flex-1 flex-col items-center gap-1"
              title={`${day.date}: Score ${day.score} (${day.completed}/${day.total} tasks)`}
            >
              <div
                className={`w-full rounded-t transition-all ${
                  day.score === 0
                    ? "bg-zinc-200 dark:bg-zinc-800"
                    : isToday
                      ? "bg-tier-proven"
                      : "bg-tier-proven/60"
                }`}
                style={{ height: `${barHeight}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-zinc-500 dark:text-zinc-500">
        <span>{trend[0]?.date.slice(5)}</span>
        <span>{trend[trend.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

interface HeatmapPoint {
  date: string;
  count: number;
  intensity: number;
  active: boolean;
}

function ActivityHeatmap({ heatmap }: { heatmap: HeatmapPoint[] }) {
  function getColor(point: HeatmapPoint): string {
    if (!point.active) return "bg-zinc-200 dark:bg-zinc-800";
    if (point.intensity >= 90) return "bg-tier-proven";
    if (point.intensity >= 75) return "bg-tier-locked";
    if (point.intensity >= 60) return "bg-tier-grinding";
    if (point.intensity >= 40) return "bg-tier-warming";
    return "bg-tier-slacking";
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">
        Activity (weighted by priority)
      </h3>
      <div className="grid grid-cols-7 gap-1">
        {heatmap.map((day) => (
          <div
            key={day.date}
            className={`aspect-square rounded-sm ${getColor(day)}`}
            title={`${day.date}: weighted completion ${day.intensity}%`}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-500">
        <span>Inactive</span>
        <div className="flex gap-1">
          <div className="h-2.5 w-2.5 rounded-sm bg-zinc-200 dark:bg-zinc-800" />
          <div className="h-2.5 w-2.5 rounded-sm bg-tier-slacking" title="Slacking (0-39)" />
          <div className="h-2.5 w-2.5 rounded-sm bg-tier-warming" title="Warming Up (40-59)" />
          <div className="h-2.5 w-2.5 rounded-sm bg-tier-grinding" title="Grinding (60-74)" />
          <div className="h-2.5 w-2.5 rounded-sm bg-tier-locked" title="Locked In (75-89)" />
          <div className="h-2.5 w-2.5 rounded-sm bg-tier-proven" title="Proven (90+)" />
        </div>
        <span>Proven</span>
      </div>
    </div>
  );
}

interface ScoreEvent {
  id: string;
  occurred_at: string;
  score_before: number | null;
  score_after: number;
  reason: string;
  related_task_id: string | null;
}

function RecentEvents({ events }: { events: ScoreEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
        No score changes yet. Complete or skip a task to see it here.
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">
        Recent score changes
      </h3>
      <ul className="space-y-2 text-xs">
        {events.map((e) => {
          const delta =
            e.score_before === null ? null : e.score_after - e.score_before;
          const deltaClass =
            delta === null
              ? "text-zinc-500"
              : delta > 0
                ? "text-green-600 dark:text-green-400"
                : delta < 0
                  ? "text-red-600 dark:text-red-400"
                  : "text-zinc-500";
          return (
            <li
              key={e.id}
              className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-2 last:border-0 last:pb-0 dark:border-zinc-800"
            >
              <div className="min-w-0">
                <div className="font-medium text-zinc-800 dark:text-zinc-200">
                  {humanReason(e.reason)}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {new Date(e.occurred_at).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>
              </div>
              <div className="flex items-baseline gap-1 whitespace-nowrap">
                <span className="text-zinc-500">
                  {e.score_before ?? "·"} → {e.score_after}
                </span>
                {delta !== null && delta !== 0 && (
                  <span className={deltaClass}>
                    ({delta > 0 ? "+" : ""}
                    {delta})
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function humanReason(reason: string): string {
  switch (reason) {
    case "task_completed":
      return "Task completed";
    case "task_skipped":
      return "Task skipped";
    case "task_rescheduled":
      return "Task rescheduled";
    case "task_carried_over":
      return "Carried over to today";
    case "evening_reflection":
      return "Evening reflection";
    case "snapshot_cron":
      return "Daily snapshot";
    default:
      return reason.replace(/_/g, " ");
  }
}

export default function StatsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [range, setRange] = useState<TimeRange>("14");

  useEffect(() => {
    if (!authLoading && !user) router.push("/auth/login");
  }, [user, authLoading, router]);

  const { data: scoreData, isLoading: scoreLoading } =
    trpc.accountabilityScore.getScore.useQuery(undefined, {
      enabled: !!user,
    });

  const { data: trendData, isLoading: trendLoading } =
    trpc.accountabilityScore.getScoreTrend.useQuery(
      { days: range },
      { enabled: !!user }
    );

  const { data: heatmapData, isLoading: heatmapLoading } =
    trpc.accountabilityScore.getActivityHeatmap.useQuery(
      { days: range },
      { enabled: !!user }
    );

  const { data: eventsData, isLoading: eventsLoading } =
    trpc.accountabilityScore.getRecentEvents.useQuery(
      { limit: 10 },
      { enabled: !!user }
    );

  const isLoading =
    authLoading || scoreLoading || trendLoading || heatmapLoading || eventsLoading;

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-50" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-zinc-900 dark:text-white">
                Your Progress
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Last {range === "all" ? "90" : range} days
              </p>
            </div>
          </div>
          <div className="flex gap-1">
            {(["14", "30", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                  range === r
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700"
                }`}
              >
                {r === "all" ? "All" : `${r}d`}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="h-24 animate-pulse rounded-lg bg-white dark:bg-zinc-900" />
            <div className="h-40 animate-pulse rounded-lg bg-white dark:bg-zinc-900" />
            <div className="h-32 animate-pulse rounded-lg bg-white dark:bg-zinc-900" />
          </div>
        ) : (
          <>
            {scoreData && (
              <div className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-center gap-4">
                  <AccountabilityScoreRing
                    score={scoreData.score}
                    color={scoreData.tier.color}
                    size={72}
                  />
                  <div className="min-w-0">
                    <div
                      className={`text-xs font-semibold uppercase tracking-wide ${TIER_COLORS[scoreData.tier.color] || "text-tier-proven"}`}
                    >
                      {scoreData.tier.name}
                    </div>
                    <div className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                      <span className="font-semibold">
                        {scoreData.currentStreak}
                      </span>{" "}
                      day streak ·{" "}
                      <span className="font-semibold">
                        {scoreData.weightedCompletion}%
                      </span>{" "}
                      completion ·{" "}
                      <span className="font-semibold">
                        {Math.round(scoreData.consistencyRate)}%
                      </span>{" "}
                      consistency
                    </div>
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {scoreData.delta > 0 && (
                        <span className="text-green-600 dark:text-green-400">
                          +{scoreData.delta} from last week
                        </span>
                      )}
                      {scoreData.delta < 0 && (
                        <span className="text-red-600 dark:text-red-400">
                          {scoreData.delta} from last week
                        </span>
                      )}
                      {scoreData.delta === 0 && (
                        <span>No change from last week</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {trendData && <ScoreTrendChart trend={trendData.trend} />}
            {heatmapData && <ActivityHeatmap heatmap={heatmapData.heatmap} />}
            {eventsData && (
              <RecentEvents events={eventsData.events as ScoreEvent[]} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
