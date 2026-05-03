"use client";

import { useState, useEffect } from "react";
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
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("grindproof:goals-expanded");
    if (stored !== null) {
      setExpanded(stored === "true");
    } else {
      setExpanded(goals.length <= 3);
    }
  }, [goals.length]);

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    localStorage.setItem("grindproof:goals-expanded", String(next));
  };

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
            className="h-12 animate-pulse rounded-md border border-border bg-card"
          />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      {expanded !== null && (
        <div className="mb-2 flex items-center justify-between">
          <button
            onClick={toggle}
            className="flex items-center gap-1 text-sm font-semibold text-foreground"
          >
            <span>Goals ({activeGoals.length})</span>
            <span className="text-muted-foreground">{expanded ? "-" : "+"}</span>
          </button>
          <button
            onClick={() => { setShowAddForm(true); setExpanded(true); }}
            className="text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            + Add Goal
          </button>
        </div>
      )}

      {expanded && (
        <div className="space-y-2">
          {showAddForm && (
            <AddGoalForm onClose={() => setShowAddForm(false)} />
          )}

          {activeGoals.length === 0 && !showAddForm && (
            <div className="rounded-md border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
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
                className="flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3"
              >
                {/* Clickable title */}
                <button
                  onClick={() => setSelectedGoalId(goal.id)}
                  className="flex-1 text-left text-sm text-foreground hover:underline"
                >
                  {goal.title}
                </button>

                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-border">
                    <div
                      className="h-full rounded-full bg-foreground transition-all"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground gp-num">
                    {completed}/{total}
                  </span>
                </div>

                {/* Delete confirmation inline */}
                {deleteConfirmId === goal.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Delete?</span>
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
                      <button className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setSelectedGoalId(null); setEditGoalId(goal.id); }}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-400 focus:text-red-400"
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
