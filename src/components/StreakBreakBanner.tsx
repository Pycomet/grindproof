"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  /** The streak length that was lost. Banner only shows when >= 3. */
  brokenStreak: number;
  /** ISO date or local-date string for when it ended. */
  endedOn: string;
}

const DISMISS_KEY = "grindproof:streak-break-dismissed";

/**
 * Honest streak-break acknowledgment. The widget silently zeroing the streak
 * after 12 days is the kind of UX failure the audit flagged — broken
 * streaks need a moment of recognition to stay motivating.
 *
 * Dismissal is persisted by streak length + end date so the banner can
 * resurface after a future, different break.
 */
export function StreakBreakBanner({ brokenStreak, endedOn }: Props) {
  const dismissValue = `${brokenStreak}:${endedOn}`;
  // Lazy initializer reads localStorage once, on mount, without an effect.
  // SSR-safe because the function only runs on the client (after hydration
  // setState is permitted via user interaction).
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(DISMISS_KEY) === dismissValue;
  });

  function handleDismiss() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISMISS_KEY, dismissValue);
    }
    setDismissed(true);
  }

  if (brokenStreak < 3 || dismissed) return null;

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">
            Your {brokenStreak}-day streak ended {formatEnd(endedOn)}.
          </div>
          <div className="mt-0.5 text-xs opacity-80">
            Streaks count completed work, not check-ins. Show up today to start
            a new one.
          </div>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss streak-break notice"
          className="shrink-0 rounded p-1 hover:bg-amber-100 dark:hover:bg-amber-900"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function formatEnd(iso: string): string {
  // Accept "YYYY-MM-DD" or full ISO; format as "Apr 28".
  const d = new Date(iso.length <= 10 ? `${iso}T00:00:00Z` : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
