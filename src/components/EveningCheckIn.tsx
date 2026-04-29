"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useTaskContext } from "@/contexts/TaskContext";
import { useChatContext } from "@/contexts/ChatContext";
import { cn } from "@/lib/utils";

export function EveningCheckIn() {
  const { refreshTasks } = useTaskContext();
  const { sendMessage, setIsOpen } = useChatContext();
  const { data, isLoading } = trpc.dailyCheck.getEveningSchedule.useQuery();
  const submitMutation = trpc.dailyCheck.submitEveningReflections.useMutation({
    onSuccess: () => refreshTasks(),
  });
  const [reflections, setReflections] = useState<
    Record<string, { status: "completed" | "skipped"; reflection: string }>
  >({});
  const [submitted, setSubmitted] = useState(false);

  if (isLoading) {
    return (
      <div className="h-28 animate-pulse rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20" />
    );
  }
  if (!data || submitted) return null;

  const pendingTasks = data.todayTasks.filter(
    (t: any) => t.status === "pending"
  );
  if (pendingTasks.length === 0) return null;

  const handleStatusChange = (
    taskId: string,
    status: "completed" | "skipped"
  ) => {
    setReflections((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], status, reflection: prev[taskId]?.reflection || "" },
    }));
  };

  const handleReflection = (taskId: string, reflection: string) => {
    setReflections((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], reflection },
    }));
  };

  const handleSubmit = () => {
    const items = Object.entries(reflections).map(([taskId, data]) => ({
      taskId,
      status: data.status,
      reflection: data.status === "skipped" ? data.reflection : undefined,
    }));

    if (items.length > 0) {
      submitMutation.mutate({ reflections: items });
    }
    setSubmitted(true);

    // Send context to AI coach for commentary
    const completedTasks = pendingTasks
      .filter((t: any) => reflections[t.id]?.status === "completed")
      .map((t: any) => t.title);
    const skippedTasks = pendingTasks
      .filter((t: any) => reflections[t.id]?.status === "skipped")
      .map((t: any) => {
        const r = reflections[t.id]?.reflection;
        return r ? `${t.title} (reason: ${r})` : t.title;
      });

    const parts: string[] = [];
    if (completedTasks.length > 0)
      parts.push(`Completed: ${completedTasks.join(", ")}`);
    if (skippedTasks.length > 0)
      parts.push(`Skipped: ${skippedTasks.join(", ")}`);

    const prompt = `[Evening reality check] ${parts.join(". ")}. Call out patterns, give credit where due, and be brief.`;

    sendMessage(prompt);
    setIsOpen(true);
  };

  const allReviewed = pendingTasks.every(
    (t: any) => {
      const r = reflections[t.id];
      if (!r?.status) return false;
      if (r.status === "skipped" && (!r.reflection || r.reflection.trim().length === 0)) return false;
      return true;
    }
  );

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
      <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Evening Reality Check
      </h3>
      <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-400">
        {pendingTasks.length} task{pendingTasks.length > 1 ? "s" : ""} still
        pending. What happened?
      </p>
      <div className="mb-3 space-y-3">
        {pendingTasks.map((task: any) => (
          <div key={task.id} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {task.title}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => handleStatusChange(task.id, "completed")}
                  className={`rounded px-2 py-1 text-xs ${
                    reflections[task.id]?.status === "completed"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                  }`}
                >
                  Done
                </button>
                <button
                  onClick={() => handleStatusChange(task.id, "skipped")}
                  className={`rounded px-2 py-1 text-xs ${
                    reflections[task.id]?.status === "skipped"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                  }`}
                >
                  Skipped
                </button>
              </div>
            </div>
            {reflections[task.id]?.status === "skipped" && (
              <>
                <input
                  placeholder="What happened? (one line)"
                  value={reflections[task.id]?.reflection || ""}
                  onChange={(e) => handleReflection(task.id, e.target.value)}
                  className={cn(
                    "w-full rounded-sm border bg-white px-2 py-1 text-xs outline-none dark:bg-zinc-900 dark:text-zinc-50",
                    reflections[task.id]?.reflection?.trim() ? "border-zinc-300 dark:border-zinc-700" : "border-error"
                  )}
                />
                {!reflections[task.id]?.reflection?.trim() && (
                  <p className="text-2xs text-error mt-0.5">Required.</p>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={!allReviewed || submitMutation.isPending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        Submit reality check
      </button>
    </div>
  );
}
