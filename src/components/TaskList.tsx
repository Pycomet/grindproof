"use client";

import { useState } from "react";
import { useTaskContext } from "@/contexts/TaskContext";
import { TaskItem } from "./TaskItem";
import { AddTaskForm } from "./AddTaskForm";

export function TaskList() {
  const { tasks, isLoading } = useTaskContext();
  const [viewMode, setViewMode] = useState<"today" | "week">("today");

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
  const skippedTasks = todayTasks.filter((t) => t.status === "skipped");
  const completedTasks = todayTasks.filter((t) => t.status === "completed");

  // Current week: Monday to Sunday
  const getWeekBounds = () => {
    const now = new Date();
    const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((day + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 7); // exclusive end
    return { monday, sunday };
  };

  const { monday, sunday } = getWeekBounds();

  // Week view: filter and group by day
  const weekTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due >= monday && due < sunday;
  });

  const weekDays: { date: Date; tasks: typeof tasks }[] = [];
  for (let i = 0; i < 7; i++) {
    const dayStart = new Date(monday);
    dayStart.setDate(monday.getDate() + i);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayStart.getDate() + 1);

    weekDays.push({
      date: new Date(dayStart),
      tasks: weekTasks.filter((t) => {
        const due = new Date(t.dueDate!);
        return due >= dayStart && due < dayEnd;
      }),
    });
  }

  const isToday = (date: Date) => {
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  };

  const formatDayHeader = (date: Date) =>
    date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

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

  return (
    <div className="space-y-2">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          {viewMode === "today"
            ? `Today's Tasks (${todayTasks.length})`
            : `This Week (${weekTasks.length})`}
        </h2>
        <div className="flex rounded-md border border-border">
          <button
            onClick={() => setViewMode("today")}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === "today"
                ? "bg-primary text-primary-foreground"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            } rounded-l-md`}
          >
            Today
          </button>
          <button
            onClick={() => setViewMode("week")}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              viewMode === "week"
                ? "bg-primary text-primary-foreground"
                : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            } rounded-r-md`}
          >
            Week
          </button>
        </div>
      </div>

      {/* Today view */}
      {viewMode === "today" && (
        <>
          {todayTasks.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-300 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
              No tasks yet — add your first one below.
            </div>
          ) : (
            <>
              {pendingTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
              {skippedTasks.length > 0 && (
                <>
                  <div className="pt-2 text-xs font-medium text-zinc-400">
                    Skipped ({skippedTasks.length})
                  </div>
                  {skippedTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </>
              )}
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
            </>
          )}
          <div className="mt-2">
            <AddTaskForm defaultOpen={todayTasks.length === 0} />
          </div>
        </>
      )}

      {/* Week view */}
      {viewMode === "week" && (
        <>
          {weekTasks.length === 0 ? (
            <>
              <div className="rounded-lg border border-dashed border-zinc-300 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
                No tasks this week. Add one below.
              </div>
              <div className="mt-2">
                <AddTaskForm />
              </div>
            </>
          ) : (
            weekDays.map(({ date, tasks: dayTasks }) => (
              <div key={date.toISOString()}>
                <div
                  className={`py-1 text-xs font-medium ${
                    isToday(date)
                      ? "text-zinc-900 dark:text-zinc-50"
                      : "text-zinc-400"
                  }`}
                >
                  {isToday(date) && (
                    <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-brand" />
                  )}
                  {formatDayHeader(date)}
                </div>
                {dayTasks.length === 0 ? (
                  <div className="py-2 text-xs text-zinc-400">No tasks</div>
                ) : (
                  <div className="space-y-1">
                    {dayTasks.map((task) => (
                      <TaskItem key={task.id} task={task} />
                    ))}
                  </div>
                )}
                {isToday(date) && (
                  <div className="mt-1">
                    <AddTaskForm />
                  </div>
                )}
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}
