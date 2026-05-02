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
    <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-white/[0.08] dark:bg-zinc-900">
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
    <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-white/[0.08] dark:bg-zinc-900">
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

const EVENT_META: Record<string, { glyph: string; cls: string; label: string }> = {
  task_completed:   { glyph: "✓", cls: "text-tier-locked",   label: "completed"       },
  task_skipped:     { glyph: "✗", cls: "text-tier-slacking", label: "skipped"         },
  task_rescheduled: { glyph: "↻", cls: "text-zinc-400",      label: "rescheduled"     },
  task_carried_over:{ glyph: "→", cls: "text-tier-grinding", label: "carried over"    },
  evening_reflection:{ glyph: "◎", cls: "text-tier-proven",  label: "evening check-in"},
  snapshot_cron:    { glyph: "◆", cls: "text-zinc-400",      label: "daily snapshot"  },
};

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function RecentEvents({ events }: { events: ScoreEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-md border border-zinc-200 bg-white p-4 font-mono text-xs text-zinc-400 dark:border-white/[0.08] dark:bg-zinc-900">
        <span className="text-zinc-300">$</span> git log --score
        <br />
        <span className="text-zinc-500">
          fatal: no score events yet — complete a task
        </span>
      </div>
    );
  }

  // Personal best: highest score_after across the list
  const peakScore = Math.max(...events.map((e) => e.score_after));

  return (
    <div className="rounded-md border border-zinc-200 bg-white dark:border-white/[0.08] dark:bg-zinc-900">
      {/* header bar */}
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2 dark:border-white/[0.06]">
        <span className="font-mono text-[11px] text-zinc-400">
          $ git log --score --oneline
        </span>
        <span className="font-mono text-[11px] text-zinc-500">
          {events.length} events
        </span>
      </div>

      {/* log rows */}
      <ul className="divide-y divide-zinc-50 dark:divide-white/[0.04]">
        {events.map((e, i) => {
          const meta = EVENT_META[e.reason] ?? {
            glyph: "·",
            cls: "text-zinc-400",
            label: e.reason.replace(/_/g, " "),
          };
          const delta =
            e.score_before === null ? null : e.score_after - e.score_before;
          const isPB = e.score_after === peakScore && delta !== null && delta > 0;
          const isLast = i === events.length - 1;

          return (
            <li key={e.id} className="flex items-stretch gap-0">
              {/* connector line + sigil */}
              <div className="flex w-8 shrink-0 flex-col items-center py-2.5">
                <span className={`font-mono text-sm font-bold leading-none ${meta.cls}`}>
                  {meta.glyph}
                </span>
                {!isLast && (
                  <div className="mt-1 flex-1 w-px bg-zinc-100 dark:bg-white/[0.06]" />
                )}
              </div>

              {/* content */}
              <div className="flex flex-1 items-center justify-between gap-2 py-2.5 pr-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs text-zinc-700 dark:text-zinc-200">
                      {meta.label}
                    </span>
                    {isPB && (
                      <span className="rounded-sm bg-tier-proven/10 px-1 py-px font-mono text-[9px] font-semibold uppercase tracking-wide text-tier-proven">
                        ★ PB
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 font-mono text-[10px] text-zinc-400">
                    {fmtTime(e.occurred_at)}
                  </div>
                </div>

                <div className="flex items-baseline gap-1 whitespace-nowrap font-mono tabular-nums text-xs">
                  <span className="text-zinc-400">
                    {e.score_before ?? "·"}&nbsp;→&nbsp;{e.score_after}
                  </span>
                  {delta !== null && delta !== 0 && (
                    <span
                      className={
                        delta > 0
                          ? "text-tier-locked"
                          : "text-tier-slacking"
                      }
                    >
                      ({delta > 0 ? "+" : ""}{delta})
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const ALL_BADGES = [
  { id: "streak-3",  icon: "🔥", label: "3-Day Run",    desc: "3 consecutive days",  check: (s: number, k: number) => k >= 3  },
  { id: "streak-7",  icon: "⚡", label: "Week Warrior",  desc: "7 consecutive days",  check: (s: number, k: number) => k >= 7  },
  { id: "streak-14", icon: "💎", label: "Fortnight",     desc: "14 consecutive days", check: (s: number, k: number) => k >= 14 },
  { id: "streak-30", icon: "👑", label: "Month Locked",  desc: "30 consecutive days", check: (s: number, k: number) => k >= 30 },
  { id: "score-40",  icon: "🌡", label: "Warming Up",   desc: "Score reaches 40",    check: (s: number, k: number) => s >= 40 },
  { id: "score-60",  icon: "⚙", label: "Grinding",      desc: "Score reaches 60",    check: (s: number, k: number) => s >= 60 },
  { id: "score-75",  icon: "🔒", label: "Locked In",    desc: "Score reaches 75",    check: (s: number, k: number) => s >= 75 },
  { id: "score-90",  icon: "🏆", label: "Proven",        desc: "Score reaches 90",    check: (s: number, k: number) => s >= 90 },
] as const;

function BadgesSection({ score, streak }: { score: number; streak: number }) {
  const badges = ALL_BADGES.map((b) => ({ ...b, earned: b.check(score, streak) }));
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="rounded-md border border-zinc-200 bg-white dark:border-white/[0.08] dark:bg-zinc-900">
      <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-2.5 dark:border-white/[0.06]">
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
          Badges
        </h3>
        <span className="font-mono text-xs tabular-nums text-zinc-500">
          {earnedCount}/{badges.length}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-px bg-zinc-100 dark:bg-white/[0.04]">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={`flex items-center gap-2.5 bg-white px-3 py-3 dark:bg-zinc-900 ${
              badge.earned ? "" : "opacity-30"
            }`}
          >
            <span className="text-xl leading-none">{badge.icon}</span>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-zinc-900 dark:text-white">
                {badge.label}
              </p>
              <p className="truncate text-[10px] text-zinc-500">{badge.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
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
            <div className="h-24 animate-pulse rounded-md bg-white dark:bg-zinc-900" />
            <div className="h-40 animate-pulse rounded-md bg-white dark:bg-zinc-900" />
            <div className="h-32 animate-pulse rounded-md bg-white dark:bg-zinc-900" />
          </div>
        ) : (
          <>
            {scoreData && (
              <div className="rounded-md border border-zinc-200 bg-white p-4 dark:border-white/[0.08] dark:bg-zinc-900">
                <div className="flex items-center gap-4">
                  <AccountabilityScoreRing
                    score={scoreData.score}
                    color={scoreData.tier.color}
                    size={72}
                    showNextTier
                  />
                  <div className="min-w-0">
                    <div
                      className={`text-xs font-semibold uppercase tracking-wide ${TIER_COLORS[scoreData.tier.color] || "text-tier-proven"}`}
                    >
                      {scoreData.tier.name}
                    </div>
                    <div className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">
                      <span className="font-mono font-semibold tabular-nums">
                        {scoreData.currentStreak}
                      </span>{" "}
                      day streak ·{" "}
                      <span className="font-mono font-semibold tabular-nums">
                        {scoreData.weightedCompletion}%
                      </span>{" "}
                      completion ·{" "}
                      <span className="font-mono font-semibold tabular-nums">
                        {Math.round(scoreData.consistencyRate)}%
                      </span>{" "}
                      consistency
                    </div>
                    <div className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {scoreData.delta > 0 && (
                        <span className="font-mono tabular-nums text-green-600 dark:text-green-400">
                          +{scoreData.delta} from last week
                        </span>
                      )}
                      {scoreData.delta < 0 && (
                        <span className="font-mono tabular-nums text-red-600 dark:text-red-400">
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
            {scoreData && (
              <BadgesSection
                score={scoreData.score}
                streak={scoreData.currentStreak}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
