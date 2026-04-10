"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc/client";

const TIER_COLORS: Record<string, string> = {
  red: "text-red-400",
  orange: "text-orange-400",
  amber: "text-amber-400",
  green: "text-green-400",
  purple: "text-purple-400",
};

const RING_STROKE_COLORS: Record<string, string> = {
  red: "#f87171",
  orange: "#fb923c",
  amber: "#fbbf24",
  green: "#4ade80",
  purple: "#a78bfa",
};

export function AccountabilityWidget() {
  const { user } = useAuth();
  const { data, isLoading } = trpc.accountabilityScore.getScore.useQuery(
    undefined,
    { enabled: !!user }
  );

  if (!user) return null;

  if (isLoading) {
    return (
      <div className="h-24 animate-pulse rounded-lg border border-zinc-200 bg-zinc-900 dark:border-zinc-800" />
    );
  }

  if (!data) return null;

  const { score, tier, currentStreak, delta, today } = data;
  const circumference = 2 * Math.PI * 30;
  const offset = circumference - (score / 100) * circumference;
  const strokeColor = RING_STROKE_COLORS[tier.color] || "#a78bfa";

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-900 p-4 text-white dark:border-zinc-700">
      <div className="flex items-center justify-between">
        {/* Score Ring */}
        <div className="flex items-center gap-3">
          <div className="relative h-16 w-16">
            <svg width="64" height="64" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="30"
                fill="none"
                stroke="#27272a"
                strokeWidth="4"
              />
              <circle
                cx="32"
                cy="32"
                r="30"
                fill="none"
                stroke={strokeColor}
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 32 32)"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-lg font-bold">
              {score}
            </div>
          </div>
          <div>
            <div
              className={`text-xs font-semibold uppercase tracking-wide ${TIER_COLORS[tier.color] || "text-purple-400"}`}
            >
              {tier.name}
            </div>
            <div className="text-xs text-zinc-400">
              {delta > 0 && (
                <span className="text-green-400">+{delta} from last week</span>
              )}
              {delta < 0 && (
                <span className="text-red-400">{delta} from last week</span>
              )}
              {delta === 0 && <span>No change from last week</span>}
            </div>
          </div>
        </div>

        {/* Streak */}
        <div className="text-center">
          <div className="text-xl font-bold">{currentStreak}</div>
          <div className="text-xs text-amber-400">
            day streak {currentStreak > 0 ? "🔥" : ""}
          </div>
        </div>

        {/* Today's Progress */}
        <div className="text-right">
          <div className="text-xs text-zinc-400">Today</div>
          <div className="text-base font-semibold text-green-400">
            {today.completed}/{today.total} done
          </div>
          <Link
            href="/dashboard/stats"
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            View Stats →
          </Link>
        </div>
      </div>
    </div>
  );
}
