"use client";

import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { useTaskContext } from "@/contexts/TaskContext";

interface TaskItemProps {
  task: {
    id: string;
    title: string;
    priority: "high" | "medium" | "low";
    status: "pending" | "completed" | "skipped";
    dueDate: Date | null;
    goalId: string | null;
  };
}

const priorityColors = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export function TaskItem({ task }: TaskItemProps) {
  const { refreshTasks } = useTaskContext();
  const completeMutation = trpc.task.complete.useMutation({
    onSuccess: () => refreshTasks(),
  });
  const updateMutation = trpc.task.update.useMutation({
    onSuccess: () => refreshTasks(),
  });

  const isCompleted = task.status === "completed";

  const handleToggle = () => {
    if (isCompleted) {
      updateMutation.mutate({ id: task.id, status: "pending" });
    } else {
      completeMutation.mutate({ id: task.id });
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <button
        onClick={handleToggle}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
          isCompleted
            ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
            : "border-zinc-300 hover:border-zinc-500 dark:border-zinc-600"
        }`}
      >
        {isCompleted && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <span
        className={`flex-1 text-sm ${isCompleted ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-50"}`}
      >
        {task.title}
      </span>
      <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>
        {task.priority}
      </Badge>
      {task.dueDate && (
        <span className="text-xs text-zinc-500">{formatDate(task.dueDate)}</span>
      )}
    </div>
  );
}
