"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useTaskContext } from "@/contexts/TaskContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { AddGoalForm } from "./AddGoalForm";
import { GoalDetailModal } from "./GoalDetailModal";

export function GoalList() {
  const { goals, tasks, isLoading, refreshGoals, refreshTasks } = useTaskContext();
  const [collapsed, setCollapsed] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const deleteMutation = trpc.goal.delete.useMutation({
    onSuccess: () => {
      refreshGoals();
      refreshTasks();
      setDeleteConfirmId(null);
    },
  });

  const activeGoals = goals.filter((g) => g.status === "active");

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          <span>Goals ({activeGoals.length})</span>
          <span className="text-zinc-400">{collapsed ? "+" : "-"}</span>
        </button>
        <button
          onClick={() => { setShowAddForm(true); setCollapsed(false); }}
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          + Add Goal
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-2">
          {showAddForm && (
            <AddGoalForm onClose={() => setShowAddForm(false)} />
          )}

          {activeGoals.length === 0 && !showAddForm && (
            <div className="rounded-lg border border-dashed border-zinc-300 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
              No goals yet — set one to stay focused.
            </div>
          )}

          {activeGoals.map((goal) => {
            const goalTasks = tasks.filter((t) => t.goalId === goal.id);
            const completed = goalTasks.filter((t) => t.status === "completed").length;
            const total = goalTasks.length;
            const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <div
                key={goal.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                {/* Clickable title */}
                <button
                  onClick={() => setSelectedGoalId(goal.id)}
                  className="flex-1 text-left text-sm text-zinc-900 hover:underline dark:text-zinc-50"
                >
                  {goal.title}
                </button>

                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div
                      className="h-full rounded-full bg-zinc-900 transition-all dark:bg-zinc-50"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500">
                    {completed}/{total}
                  </span>
                </div>

                {/* Delete confirmation inline */}
                {deleteConfirmId === goal.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">Delete?</span>
                    <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setDeleteConfirmId(null)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" size="sm" className="h-6 text-xs" onClick={() => deleteMutation.mutate({ id: goal.id })}>
                      Delete
                    </Button>
                  </div>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedGoalId(null); setEditGoalId(goal.id); }}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => setDeleteConfirmId(goal.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Goal Detail Modal — view mode */}
      {selectedGoalId && (
        <GoalDetailModal
          goalId={selectedGoalId}
          open={!!selectedGoalId}
          onOpenChange={(open) => { if (!open) setSelectedGoalId(null); }}
        />
      )}

      {/* Goal Detail Modal — edit mode */}
      {editGoalId && (
        <GoalDetailModal
          goalId={editGoalId}
          open={!!editGoalId}
          onOpenChange={(open) => { if (!open) setEditGoalId(null); }}
          initialEditMode
        />
      )}
    </div>
  );
}
