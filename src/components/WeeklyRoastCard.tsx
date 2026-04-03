"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function WeeklyRoastCard() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  const today = new Date();
  const isSunday = today.getDay() === 0;

  if (!isSunday || dismissed || !user) return null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-900 p-4 text-white dark:border-zinc-700">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Weekly Roast</h3>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-zinc-400 hover:text-zinc-200"
        >
          Dismiss
        </button>
      </div>
      <p className="text-xs text-zinc-400">
        Your weekly roast has been delivered to your email. Check your inbox for
        the full report.
      </p>
    </div>
  );
}
