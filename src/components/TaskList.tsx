"use client";

import { useTaskContext } from "@/contexts/TaskContext";
import { TaskItem } from "./TaskItem";

export function TaskList() {
  const { tasks, isLoading } = useTaskContext();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due >= today && due < tomorrow;
  });

  const pendingTasks = todayTasks.filter((t) => t.status === "pending");
  const completedTasks = todayTasks.filter((t) => t.status === "completed");

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
          />
        ))}
      </div>
    );
  }

  if (todayTasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
        No tasks for today. Add one or use the morning check-in.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {pendingTasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
      {completedTasks.length > 0 && (
        <>
          <div className="pt-2 text-xs font-medium text-zinc-400">
            Completed ({completedTasks.length})
          </div>
          {completedTasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </>
      )}
    </div>
  );
}
