"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useTaskContext } from "@/contexts/TaskContext";
import { AccountabilityScoreRing } from "@/components/AccountabilityScoreRing";
import { Sunrise, Moon, FileText, X } from "lucide-react";

export function Day1Orientation() {
  const { user } = useAuth();
  const { tasks } = useTaskContext();
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [celebrating, setCelebrating] = useState(false);
  const prevTaskCount = useRef(0);

  useEffect(() => {
    const stored = localStorage.getItem("grindproof:day1-dismissed");
    setDismissed(stored === "true");
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("grindproof:day1-dismissed", "true");
  };

  // Detect the moment the first task is added
  useEffect(() => {
    if (prevTaskCount.current === 0 && tasks.length > 0 && !dismissed) {
      setCelebrating(true);
      const timer = setTimeout(() => {
        setDismissed(true);
        localStorage.setItem("grindproof:day1-dismissed", "true");
      }, 2800);
      return () => clearTimeout(timer);
    }
    prevTaskCount.current = tasks.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks.length]);

  if (dismissed === null) return null;
  if (dismissed) return null;
  if (!user) return null;

  // Don't hide on tasks.length > 0 — let the celebration play first
  if (tasks.length > 0 && !celebrating) return null;

  if (celebrating) {
    return (
      <div className="flex items-center gap-4 rounded-md border border-tier-proven/30 bg-zinc-900 p-5 text-zinc-50">
        <AccountabilityScoreRing
          score={28}
          color="purple"
          size={72}
          animated
          label="—"
        />
        <div>
          <p className="text-sm font-semibold text-tier-proven">
            Score tracking started
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Complete tasks to build your accountability score. Consistency is
            everything.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative rounded-md border border-zinc-700 bg-zinc-900 p-5 text-zinc-50">
      <button
        onClick={handleDismiss}
        aria-label="Dismiss orientation"
        className="absolute right-3 top-3 text-zinc-400 transition-colors duration-150 hover:text-zinc-50"
      >
        <X className="h-4 w-4" />
      </button>
      <h2 className="mb-3 text-lg font-semibold tracking-tight">
        Welcome. Here&apos;s how this works.
      </h2>
      <ul className="space-y-3 text-sm text-zinc-300">
        <li className="flex gap-3">
          <Sunrise className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          <span>
            <strong className="text-zinc-50">Each morning</strong>, anything
            you didn&apos;t finish yesterday surfaces. Carry it forward or drop
            it — no quiet forgetting.
          </span>
        </li>
        <li className="flex gap-3">
          <Moon className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          <span>
            <strong className="text-zinc-50">Each evening</strong>, every
            pending task gets reviewed. Done or skipped — and if you skipped,
            you say why. One line.
          </span>
        </li>
        <li className="flex gap-3">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
          <span>
            <strong className="text-zinc-50">Each Sunday</strong>, you get the
            full week back as a roast: what you shipped, what you skipped, what
            pattern you&apos;d rather ignore.
          </span>
        </li>
      </ul>
      <p className="mt-4 text-sm text-zinc-400">
        Add your first task below. We&apos;ll take it from there.
      </p>
    </div>
  );
}
