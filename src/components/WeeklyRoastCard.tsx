"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { trpc } from "@/lib/trpc/client";
import { Check, AlertTriangle, Info, type LucideIcon } from "lucide-react";

const SEVERITY_ICON: Record<string, { Icon: LucideIcon; color: string }> = {
  positive: { Icon: Check, color: "text-green-400" },
  high: { Icon: AlertTriangle, color: "text-red-400" },
  medium: { Icon: Info, color: "text-muted-foreground" },
};

export function WeeklyRoastCard() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const { data: roast, isLoading } = trpc.weeklyRoast.getLatest.useQuery(
    undefined,
    { enabled: !!user }
  );

  if (isLoading) {
    return (
      <div className="h-32 animate-pulse rounded-md border border-border bg-card p-4" />
    );
  }
  if (!user || dismissed) return null;
  if (!roast) return null;

  // Only show if the roast is from the current week (within last 7 days)
  const roastAge = Date.now() - new Date(roast.createdAt).getTime();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  if (roastAge > sevenDays) return null;

  const { roastData, taskStats } = roast;

  return (
    <div className="rounded-md border border-border bg-card p-5 text-foreground">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="gp-eyebrow">Weekly Roast</h3>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Dismiss
        </button>
      </div>

      {/* Stats bar */}
      {taskStats && (
        <div className="mb-3 flex gap-3 text-xs">
          <span className="text-green-400 gp-num">
            {taskStats.completionRate}% done
          </span>
          <span className="text-muted-foreground gp-num">
            {taskStats.completed}/{taskStats.total} tasks
          </span>
          {taskStats.skipped > 0 && (
            <span className="text-muted-foreground gp-num">
              {taskStats.skipped} skipped
            </span>
          )}
        </div>
      )}

      {/* Summary */}
      {roastData?.weekSummary && (
        <p className="mb-3 text-sm text-foreground/80">{roastData.weekSummary}</p>
      )}

      {/* Insights */}
      {roastData?.insights && roastData.insights.length > 0 && (
        <div className="mb-3 space-y-1.5">
          {roastData.insights.map((insight, i) => {
            const sev =
              SEVERITY_ICON[insight.severity] ?? SEVERITY_ICON.medium;
            const { Icon, color } = sev;
            return (
              <div key={i} className="flex items-start gap-2 text-xs">
                <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${color}`} />
                <span className={color}>{insight.text}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Recommendations */}
      {roastData?.recommendations && roastData.recommendations.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            Recommendations
          </p>
          {roastData.recommendations.map((rec, i) => (
            <p key={i} className="text-xs text-foreground/80">
              {rec}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
