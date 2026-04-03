"use client";

import { useState } from "react";
import { useTaskContext } from "@/contexts/TaskContext";

export function GoalList() {
  const { goals, tasks, isLoading } = useTaskContext();
  const [collapsed, setCollapsed] = useState(false);

  const activeGoals = goals.filter((g) => g.status === "active");

  if (isLoading || activeGoals.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mb-2 flex w-full items-center justify-between text-sm font-semibold text-zinc-900 dark:text-zinc-50"
      >
        <span>Goals ({activeGoals.length})</span>
        <span className="text-zinc-400">{collapsed ? "+" : "-"}</span>
      </button>
      {!collapsed && (
        <div className="space-y-2">
          {activeGoals.map((goal) => {
            const goalTasks = tasks.filter((t) => t.goalId === goal.id);
            const completed = goalTasks.filter(
              (t) => t.status === "completed"
            ).length;
            const total = goalTasks.length;

            return (
              <div
                key={goal.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="text-sm text-zinc-900 dark:text-zinc-50">
                  {goal.title}
                </span>
                <span className="text-xs text-zinc-500">
                  {completed}/{total} done
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
