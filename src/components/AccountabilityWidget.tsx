"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
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

const RING_STROKE_COLORS: Record<string, string> = {
  red: "var(--tier-slacking)",
  orange: "var(--tier-warming)",
  amber: "var(--tier-grinding)",
  green: "var(--tier-locked)",
  purple: "var(--tier-proven)",
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
    <div className="rounded-md border border-zinc-700 bg-zinc-900 p-5 text-white">
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
                <span className="text-tier-locked">+{delta} from last week</span>
              )}
              {delta === 0 && <span>No change from last week</span>}
              {delta < 0 && delta > -20 && (
                <span className="text-tier-warming">{delta} from last week</span>
              )}
              {delta <= -20 && (
                <span className="text-zinc-300">Last week was a write-off. New week starts now.</span>
              )}
            </div>
          </div>
        </div>

        {/* Streak */}
        <div className="text-center">
          {currentStreak > 0 ? (
            <>
              <div className="text-xl font-bold">{currentStreak}</div>
              <div className="text-xs text-warning flex items-center justify-center gap-1">
                day streak <Flame className="h-3 w-3" />
              </div>
            </>
          ) : (
            <>
              <div className="text-xs text-zinc-500">No streak</div>
              <div className="text-xs text-zinc-400 mt-1">Start one today</div>
            </>
          )}
        </div>

        {/* Today's Progress */}
        <div className="text-right">
          <div className="text-xs text-zinc-400">Today</div>
          <div className={cn(
            "text-base font-semibold font-[family-name:var(--font-geist-mono)]",
            today.total === 0 || today.completed === 0
              ? "text-zinc-300"
              : today.completed === today.total
              ? "text-tier-locked"
              : "text-tier-warming"
          )}>
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
