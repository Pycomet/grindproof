"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc/client";

export function WeeklyRoastCard() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const { data: roast, isLoading } = trpc.weeklyRoast.getLatest.useQuery(
    undefined,
    { enabled: !!user }
  );

  if (!user || dismissed || isLoading) return null;
  if (!roast) return null;

  // Only show if the roast is from the current week (within last 7 days)
  const roastAge = Date.now() - new Date(roast.createdAt).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (roastAge > sevenDays) return null;

  const { roastData, taskStats } = roast;

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-900 p-4 text-white dark:border-zinc-700">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Weekly Roast</h3>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-zinc-400 hover:text-zinc-200"
        >
          Dismiss
        </button>
      </div>

      {/* Stats bar */}
      {taskStats && (
        <div className="mb-3 flex gap-3 text-xs">
          <span className="text-green-400">
            {taskStats.completionRate}% done
          </span>
          <span className="text-zinc-400">
            {taskStats.completed}/{taskStats.total} tasks
          </span>
          {taskStats.skipped > 0 && (
            <span className="text-amber-400">{taskStats.skipped} skipped</span>
          )}
        </div>
      )}

      {/* Summary */}
      {roastData?.weekSummary && (
        <p className="mb-3 text-sm text-zinc-300">{roastData.weekSummary}</p>
      )}

      {/* Insights */}
      {roastData?.insights && roastData.insights.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {roastData.insights.map((insight, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span>{insight.emoji}</span>
              <span
                className={
                  insight.severity === "positive"
                    ? "text-green-400"
                    : insight.severity === "high"
                      ? "text-red-400"
                      : "text-amber-400"
                }
              >
                {insight.text}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {roastData?.recommendations && roastData.recommendations.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-zinc-400">Recommendations</p>
          {roastData.recommendations.map((rec, i) => (
            <p key={i} className="text-xs text-zinc-300">
              {rec}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
