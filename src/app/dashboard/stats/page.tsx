"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

const TIER_COLORS: Record<string, string> = {
  red: "text-tier-slacking",
  orange: "text-tier-warming",
  amber: "text-tier-grinding",
  green: "text-tier-locked",
  purple: "text-tier-proven",
};

type TimeRange = "14" | "30" | "all";

function FilterPills({
  range,
  onRangeChange,
}: {
  range: TimeRange;
  onRangeChange: (r: TimeRange) => void;
}) {
  return (
    <div className="flex gap-1">
      {(["14", "30", "all"] as const).map((r) => (
        <button
          key={r}
          onClick={() => onRangeChange(r)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-medium transition-colors duration-150",
            range === r
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-zinc-200 dark:hover:bg-zinc-700"
          )}
        >
          {r === "all" ? "All" : `${r}d`}
        </button>
      ))}
    </div>
  );
}

function ScoreTrendChart({
  trend,
}: {
  trend: { date: string; score: number; completed: number; total: number }[];
}) {
  const maxScore = 100;
  const chartHeight = 120;
  const minBarHeight = 4;

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <h3 className="mb-4 text-sm font-semibold">Score Trend</h3>
      <div className="flex items-end gap-1" style={{ height: chartHeight }}>
        {trend.map((day, i) => {
          const isToday = i === trend.length - 1;
          const barHeightPercent = (day.score / maxScore) * 100;
          // Apply minimum visible height for non-zero scores
          const finalHeightPercent = day.score === 0 ? 0 : Math.max(barHeightPercent, (minBarHeight / chartHeight) * 100);
          return (
            <div
              key={day.date}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div
                className={`w-full rounded-t transition-all ${
                  day.score === 0
                    ? "bg-zinc-700 dark:bg-zinc-800"
                    : isToday
                      ? "bg-tier-proven"
                      : "bg-tier-proven/60"
                }`}
                style={{ height: `${finalHeightPercent}%` }}
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
  heatmap: { date: string; count: number; score?: number }[];
}) {
  const maxCount = Math.max(...heatmap.map((d) => d.count), 1);

  // Map score to tier color for heatmap
  function getColorByScore(score?: number): string {
    if (!score) return "bg-zinc-700 dark:bg-zinc-800";
    if (score <= 39) return "bg-tier-slacking";
    if (score <= 59) return "bg-tier-warming";
    if (score <= 74) return "bg-tier-grinding";
    if (score <= 89) return "bg-tier-locked";
    return "bg-tier-proven";
  }

  // Organize heatmap into weeks (7 rows for days, N cols for weeks)
  const weeks: { date: string; count: number; score?: number }[][] = [];
  let currentWeek: { date: string; count: number; score?: number }[] = [];

  heatmap.forEach((day, idx) => {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });
  if (currentWeek.length > 0) {
    weeks.push(currentWeek);
  }

  const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="rounded-md border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">Activity</h3>
      <div className="flex gap-3">
        {/* Weekday labels */}
        <div className="flex flex-col justify-start gap-1">
          {weekdayLabels.map((label, i) => (
            <div
              key={label}
              className="text-2xs font-medium text-zinc-500 h-5 flex items-center"
            >
              {i % 2 === 0 ? label : ""}
            </div>
          ))}
        </div>
        {/* Grid of weeks */}
        <div className="flex gap-1">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="flex flex-col gap-1">
              {week.map((day, dayIdx) => (
                <div
                  key={day.date}
                  className={`aspect-square rounded-sm ${getColorByScore(day.score)}`}
                  title={`${day.date}: Score ${day.score || 0}`}
                />
              ))}
              {/* Pad incomplete week */}
              {weekIdx === weeks.length - 1 &&
                week.length < 7 &&
                Array.from({ length: 7 - week.length }).map((_, i) => (
                  <div
                    key={`pad-${i}`}
                    className="aspect-square rounded-sm bg-zinc-700 dark:bg-zinc-800 opacity-20"
                  />
                ))}
            </div>
          ))}
        </div>
      </div>
      {/* Legend */}
      <div className="mt-4 flex items-center justify-between text-[10px] text-zinc-500">
        <span>Inactive</span>
        <div className="flex gap-1">
          <div className="h-2.5 w-2.5 rounded-sm bg-tier-slacking" title="Slacking (0-39)" />
          <div className="h-2.5 w-2.5 rounded-sm bg-tier-warming" title="Warming (40-59)" />
          <div className="h-2.5 w-2.5 rounded-sm bg-tier-grinding" title="Grinding (60-74)" />
          <div className="h-2.5 w-2.5 rounded-sm bg-tier-locked" title="Locked (75-89)" />
          <div className="h-2.5 w-2.5 rounded-sm bg-tier-proven" title="Proven (90+)" />
        </div>
        <span>Proven</span>
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
      {/* Page Header (T-031) */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Your stats</h1>
        <FilterPills range={range} onRangeChange={setRange} />
      </div>

      {/* Back link and subtext */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <p className="text-xs text-zinc-500">
          Last {range === "all" ? "90" : range} days
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-20 animate-pulse rounded-md bg-card border border-border" />
          <div className="h-40 animate-pulse rounded-md bg-card border border-border" />
          <div className="h-32 animate-pulse rounded-md bg-card border border-border" />
        </div>
      ) : (
        <>
          {/* Summary Cards (T-017, T-018, T-032) */}
          {scoreData && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {/* Score - keep tier color */}
              <div className="rounded-md border border-border bg-card p-3 text-center">
                <div
                  className={`text-2xl font-bold font-[family-name:var(--font-geist-mono)] ${TIER_COLORS[scoreData.tier.color] || "text-tier-proven"}`}
                >
                  {scoreData.score}
                </div>
                <div className="text-xs text-zinc-500">Score</div>
                {scoreData.delta !== 0 && (
                  <div className="text-[10px] text-zinc-500">
                    {scoreData.delta > 0 ? "↑" : "↓"} {Math.abs(scoreData.delta)}
                  </div>
                )}
              </div>
              {/* Day Streak - neutral (T-032) */}
              <div
                className="rounded-md border border-border bg-card p-3 text-center"
                title="Consecutive days with at least one completed task."
              >
                <div className="text-2xl font-bold font-[family-name:var(--font-geist-mono)] text-zinc-50">
                  {scoreData.currentStreak}
                </div>
                <div className="text-xs text-zinc-400">Day Streak</div>
              </div>
              {/* Tasks Done % - neutral (T-018) */}
              <div
                className="rounded-md border border-border bg-card p-3 text-center"
                title="Completed tasks divided by total tasks in the window."
              >
                <div className="text-2xl font-bold font-[family-name:var(--font-geist-mono)] text-zinc-50">
                  {scoreData.weightedCompletion}%
                </div>
                <div className="text-xs text-zinc-400">Tasks Done %</div>
              </div>
              {/* Active Days % - neutral (T-018) */}
              <div
                className="rounded-md border border-border bg-card p-3 text-center"
                title="Days with at least one logged action divided by total days in the window."
              >
                <div className="text-2xl font-bold font-[family-name:var(--font-geist-mono)] text-zinc-50">
                  {Math.round(scoreData.consistencyRate)}%
                </div>
                <div className="text-xs text-zinc-400">Active Days %</div>
              </div>
            </div>
          )}

          {/* Score Trend (T-010) */}
          {trendData && <ScoreTrendChart trend={trendData.trend} />}

          {/* Activity Heatmap (T-019) */}
          {heatmapData && <ActivityHeatmap heatmap={heatmapData.heatmap} />}
        </>
      )}
    </div>
  );
}
