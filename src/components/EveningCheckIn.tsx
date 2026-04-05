"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useTaskContext } from "@/contexts/TaskContext";
import { useChatContext } from "@/contexts/ChatContext";

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

  if (isLoading || !data || submitted) return null;

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
    (t: any) => reflections[t.id]?.status
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
              <input
                placeholder="What happened? (one line)"
                value={reflections[task.id]?.reflection || ""}
                onChange={(e) => handleReflection(task.id, e.target.value)}
                className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            )}
          </div>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={!allReviewed || submitMutation.isPending}
        className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        Submit reality check
      </button>
    </div>
  );
}
