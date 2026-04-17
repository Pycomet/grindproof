"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc/client";

const TIER_COLORS: Record<string, string> = {
  red: "text-red-400",
  orange: "text-orange-400",
  amber: "text-amber-400",
  green: "text-green-400",
  purple: "text-purple-400",
};

type TimeRange = "14" | "30" | "all";

function ScoreTrendChart({
  trend,
}: {
  trend: { date: string; score: number; completed: number; total: number }[];
}) {
  const maxScore = 100;

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <h3 className="mb-4 text-sm font-semibold text-white">Score Trend</h3>
      <div className="flex items-end gap-1" style={{ height: 120 }}>
        {trend.map((day, i) => {
          const height = (day.score / maxScore) * 100;
          const isToday = i === trend.length - 1;
          return (
            <div
              key={day.date}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div
                className={`w-full rounded-t transition-all ${
                  day.score === 0
                    ? "bg-zinc-800"
                    : isToday
                      ? "bg-purple-500"
                      : "bg-purple-500/60"
                }`}
                style={{ height: `${Math.max(height, 2)}%` }}
                title={`${day.date}: Score ${day.score} (${day.completed}/${day.total} tasks)`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-zinc-500">
        <span>{trend[0]?.date.slice(5)}</span>
        <span>{trend[trend.length - 1]?.date.slice(5)}</span>
      </div>
    </div>
  );
}

function ActivityHeatmap({
  heatmap,
}: {
  heatmap: { date: string; count: number }[];
}) {
  const maxCount = Math.max(...heatmap.map((d) => d.count), 1);

  function getColor(count: number): string {
    if (count === 0) return "bg-zinc-800";
    const ratio = count / maxCount;
    if (ratio > 0.75) return "bg-purple-500";
    if (ratio > 0.5) return "bg-green-400";
    if (ratio > 0.25) return "bg-green-600";
    return "bg-green-800";
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">Activity</h3>
      <div className="grid grid-cols-7 gap-1">
        {heatmap.map((day) => (
          <div
            key={day.date}
            className={`aspect-square rounded-sm ${getColor(day.count)}`}
            title={`${day.date}: ${day.count} tasks`}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-zinc-500">
        <span>Less</span>
        <div className="flex gap-1">
          <div className="h-2.5 w-2.5 rounded-sm bg-zinc-800" />
          <div className="h-2.5 w-2.5 rounded-sm bg-green-800" />
          <div className="h-2.5 w-2.5 rounded-sm bg-green-400" />
          <div className="h-2.5 w-2.5 rounded-sm bg-purple-500" />
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const { user } = useAuth();
  const [range, setRange] = useState<TimeRange>("14");

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

  const isLoading = scoreLoading || trendLoading || heatmapLoading;

  if (!user) return null;

  return (
    <div className="mx-auto max-w-xl space-y-4 px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white">Your Progress</h1>
            <p className="text-xs text-zinc-400">
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
                  ? "bg-purple-600 text-white"
                  : "bg-zinc-800 text-zinc-400 hover:text-white"
              }`}
            >
              {r === "all" ? "All" : `${r}d`}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-20 animate-pulse rounded-lg bg-zinc-900" />
          <div className="h-40 animate-pulse rounded-lg bg-zinc-900" />
          <div className="h-32 animate-pulse rounded-lg bg-zinc-900" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {scoreData && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-center">
                <div
                  className={`text-2xl font-bold ${TIER_COLORS[scoreData.tier.color] || "text-purple-400"}`}
                >
                  {scoreData.score}
                </div>
                <div className="text-xs text-zinc-400">Score</div>
                {scoreData.delta !== 0 && (
                  <div
                    className={`text-[10px] ${scoreData.delta > 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {scoreData.delta > 0 ? "↑" : "↓"} {Math.abs(scoreData.delta)}
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-center">
                <div className="text-2xl font-bold text-amber-400">
                  {scoreData.currentStreak}
                </div>
                <div className="text-xs text-zinc-400">Day Streak</div>
                {trendData && (
                  <div className="text-[10px] text-zinc-500">
                    Current: {trendData.currentStreak}
                  </div>
                )}
              </div>
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-center">
                <div className="text-2xl font-bold text-green-400">
                  {scoreData.weightedCompletion}%
                </div>
                <div className="text-xs text-zinc-400">Completion</div>
              </div>
              <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-center">
                <div className="text-2xl font-bold text-blue-400">
                  {Math.round(scoreData.consistencyRate)}%
                </div>
                <div className="text-xs text-zinc-400">Consistency</div>
              </div>
            </div>
          )}

          {/* Score Trend */}
          {trendData && <ScoreTrendChart trend={trendData.trend} />}

          {/* Activity Heatmap */}
          {heatmapData && <ActivityHeatmap heatmap={heatmapData.heatmap} />}
        </>
      )}
    </div>
  );
}
