"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTaskContext } from "@/contexts/TaskContext";
import { Sunrise, Moon, FileText, X } from "lucide-react";

export function Day1Orientation() {
  const { user } = useAuth();
  const { tasks } = useTaskContext();
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("grindproof:day1-dismissed");
    setDismissed(stored === "true");
  }, []);

  // Hide if user has any task history (signal they've started)
  if (dismissed === null) return null;
  if (dismissed) return null;
  if (tasks.length > 0) return null;
  if (!user) return null;

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("grindproof:day1-dismissed", "true");
  };

  return (
    <div className="rounded-md border border-zinc-700 bg-zinc-900 text-zinc-50 p-5 relative">
      <button
        onClick={handleDismiss}
        aria-label="Dismiss orientation"
        className="absolute top-3 right-3 text-zinc-400 hover:text-zinc-50 transition-colors duration-150"
      >
        <X className="h-4 w-4" />
      </button>
      <h2 className="text-lg font-semibold tracking-tight mb-3">
        Welcome. Here's how this works.
      </h2>
      <ul className="space-y-3 text-sm text-zinc-300">
        <li className="flex gap-3">
          <Sunrise className="h-5 w-5 shrink-0 text-brand mt-0.5" />
          <span>
            <strong className="text-zinc-50">Tomorrow at 9am</strong>, we surface anything you don't finish today. You decide: carry over or drop. No quiet forgetting.
          </span>
        </li>
        <li className="flex gap-3">
          <Moon className="h-5 w-5 shrink-0 text-brand mt-0.5" />
          <span>
            <strong className="text-zinc-50">Tonight at 6pm</strong>, every pending task gets reviewed. Done or skipped — and if you skipped it, you say why. One line. No excuses.
          </span>
        </li>
        <li className="flex gap-3">
          <FileText className="h-5 w-5 shrink-0 text-brand mt-0.5" />
          <span>
            <strong className="text-zinc-50">Sunday at 9am</strong>, you get the full week back as a roast: what you shipped, what you skipped, what pattern you'd rather ignore.
          </span>
        </li>
      </ul>
      <p className="text-sm text-zinc-400 mt-4">
        Add your first task below. We'll take it from there.
      </p>
    </div>
  );
}
