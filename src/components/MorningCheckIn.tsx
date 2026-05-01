"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useTaskContext } from "@/contexts/TaskContext";
import { useChatContext } from "@/contexts/ChatContext";

export function MorningCheckIn() {
  const { refreshTasks } = useTaskContext();
  const { sendMessage, setIsOpen } = useChatContext();
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.dailyCheck.getMorningSchedule.useQuery();
  const carryOverMutation = trpc.dailyCheck.carryOverTasks.useMutation({
    onSuccess: () => {
      refreshTasks();
      utils.accountabilityScore.getScore.invalidate();
      utils.accountabilityScore.getScoreTrend.invalidate();
    },
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  if (isLoading) {
    return (
      <div className="h-28 animate-pulse rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20" />
    );
  }
  if (!data || submitted) return null;
  if (data.yesterdayIncomplete.length === 0) return null;

  const toggleTask = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (selectedIds.length > 0) {
      carryOverMutation.mutate({ taskIds: selectedIds });
    }
    setSubmitted(true);

    // Send context to AI coach for commentary
    const total = data.yesterdayIncomplete.length;
    const carriedOver = selectedIds.length;
    const skipped = total - carriedOver;
    const taskNames = data.yesterdayIncomplete
      .filter((t: any) => selectedIds.includes(t.id))
      .map((t: any) => t.title)
      .join(", ");

    const prompt =
      carriedOver > 0
        ? `[Morning check-in] I had ${total} unfinished tasks from yesterday. I'm carrying over ${carriedOver}: ${taskNames}.${skipped > 0 ? ` Dropping ${skipped}.` : ""} React to my plan — am I overcommitting? Be brief and direct.`
        : `[Morning check-in] I had ${total} unfinished tasks from yesterday and I'm starting fresh — dropping them all. React to this decision briefly.`;

    sendMessage(prompt);
    setIsOpen(true);
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
      <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Morning Check-in
      </h3>
      <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-400">
        You left {data.yesterdayIncomplete.length} task
        {data.yesterdayIncomplete.length > 1 ? "s" : ""} unfinished yesterday.
        Carry over?
      </p>
      <div className="mb-3 space-y-2">
        {data.yesterdayIncomplete.map((task: any) => (
          <label
            key={task.id}
            className="flex cursor-pointer items-center gap-2 text-sm"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(task.id)}
              onChange={() => toggleTask(task.id)}
              className="rounded border-zinc-300"
            />
            <span className="text-zinc-700 dark:text-zinc-300">
              {task.title}
            </span>
          </label>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={carryOverMutation.isPending}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
      >
        {selectedIds.length > 0
          ? `Carry over ${selectedIds.length} task${selectedIds.length > 1 ? "s" : ""}`
          : "Skip, fresh start"}
      </button>
    </div>
  );
}
