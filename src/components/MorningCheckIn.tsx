"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useTaskContext } from "@/contexts/TaskContext";
import { useChatContext } from "@/contexts/ChatContext";
import { ChevronRight, ChevronLeft } from "lucide-react";

const PRIORITY_BAR: Record<string, string> = {
  high: "bg-tier-slacking",
  medium: "bg-tier-grinding",
  low: "bg-zinc-300 dark:bg-zinc-600",
};

export function MorningCheckIn() {
  const { refreshTasks } = useTaskContext();
  const { sendMessage, setIsOpen } = useChatContext();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.dailyCheck.getMorningSchedule.useQuery();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [theme, setTheme] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const dispatchChat = (carriedOver: number) => {
    if (!data) return;
    const total = data.yesterdayIncomplete.length;
    const dropped = total - carriedOver;
    const taskNames = data.yesterdayIncomplete
      .filter((t: any) => selectedIds.includes(t.id))
      .map((t: any) => t.title)
      .join(", ");
    const todayCount = data.todayTasks?.length ?? 0;
    const themePart = theme.trim() ? ` Today's theme: "${theme.trim()}".` : "";

    const prompt =
      carriedOver > 0
        ? `[Morning check-in] Carrying over ${carriedOver}/${total} from yesterday: ${taskNames}.${dropped > 0 ? ` Dropping ${dropped}.` : ""} ${todayCount} tasks on the board today.${themePart} Am I overcommitting? Be brief.`
        : `[Morning check-in] Dropping all ${total} unfinished tasks, starting fresh. ${todayCount} tasks on the board today.${themePart} React briefly.`;

    sendMessage(prompt);
    setIsOpen(true);
  };

  const carryOverMutation = trpc.dailyCheck.carryOverTasks.useMutation({
    onSuccess: () => {
      refreshTasks();
      utils.accountabilityScore.getScore.invalidate();
      utils.accountabilityScore.getScoreTrend.invalidate();
      setSubmitted(true);
      dispatchChat(selectedIds.length);
    },
  });

  if (isLoading) {
    return (
      <div className="h-28 animate-pulse rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20" />
    );
  }
  if (!data || submitted || data.alreadySubmitted) return null;
  if (data.yesterdayIncomplete.length === 0) return null;

  const toggleTask = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );

  const handleSubmit = () => {
    if (selectedIds.length > 0) {
      carryOverMutation.mutate({ taskIds: selectedIds });
    } else {
      setSubmitted(true);
      dispatchChat(0);
    }
  };

  const incomplete = data.yesterdayIncomplete as any[];
  const todayTasks = (data.todayTasks ?? []) as any[];

  return (
    <div className="overflow-hidden rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
      {/* Step indicator */}
      <div className="flex items-center justify-between border-b border-amber-200/60 px-4 py-2 dark:border-amber-900/30">
        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
          Morning check-in
        </span>
        <div className="flex items-center gap-1">
          {([1, 2, 3] as const).map((s) => (
            <div
              key={s}
              className={`h-1.5 w-4 rounded-full transition-all ${
                s === step
                  ? "bg-amber-500"
                  : s < step
                    ? "bg-amber-400/60"
                    : "bg-amber-200 dark:bg-amber-900/50"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="p-4">
        {/* Step 1: Yesterday's unfinished */}
        {step === 1 && (
          <>
            <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              What didn&apos;t get done?
            </p>
            <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-400">
              {incomplete.length} task{incomplete.length > 1 ? "s" : ""} left
              over from yesterday. Check what you&apos;re carrying forward.
            </p>
            <div className="mb-4 space-y-1.5">
              {incomplete.map((task) => (
                <label
                  key={task.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-sm p-1.5 hover:bg-amber-100/60 dark:hover:bg-amber-900/20"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(task.id)}
                    onChange={() => toggleTask(task.id)}
                    className="rounded border-zinc-300"
                  />
                  <div
                    className={`h-3.5 w-[3px] rounded-full shrink-0 ${PRIORITY_BAR[task.priority] ?? "bg-zinc-300"}`}
                  />
                  <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {task.title}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                {selectedIds.length === 0
                  ? "None selected — fresh start"
                  : `${selectedIds.length} carrying over`}
              </span>
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1 rounded-sm bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}

        {/* Step 2: Today's plan */}
        {step === 2 && (
          <>
            <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              What are you committing to today?
            </p>
            {todayTasks.length > 0 ? (
              <div className="mb-4 space-y-1.5">
                {todayTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2.5 rounded-sm p-1.5"
                  >
                    <div
                      className={`h-3.5 w-[3px] rounded-full shrink-0 ${PRIORITY_BAR[task.priority] ?? "bg-zinc-300"}`}
                    />
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">
                      {task.title}
                    </span>
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-zinc-400">
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mb-4 text-xs text-zinc-500">
                No tasks added yet — you can add them from the dashboard.
              </p>
            )}
            <div className="mb-4">
              <label className="mb-1 block text-xs text-zinc-500">
                One word or phrase for today&apos;s theme{" "}
                <span className="text-zinc-400">(optional)</span>
              </label>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g. deep work, shipping, recovery"
                maxLength={50}
                className="w-full rounded-sm border border-amber-200 bg-white/60 px-3 py-1.5 text-sm outline-none placeholder:text-zinc-400 focus:border-amber-400 dark:border-amber-900/50 dark:bg-zinc-900/60 dark:text-zinc-100"
              />
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="flex items-center gap-1 rounded-sm bg-amber-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}

        {/* Step 3: Confirm & commit */}
        {step === 3 && (
          <>
            <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Your plan
            </p>
            <div className="mb-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              {selectedIds.length > 0 ? (
                <div className="rounded-sm bg-amber-100/60 px-3 py-2 dark:bg-amber-900/20">
                  <span className="font-medium">Carrying over:</span>{" "}
                  {incomplete
                    .filter((t) => selectedIds.includes(t.id))
                    .map((t) => t.title)
                    .join(", ")}
                </div>
              ) : (
                <div className="rounded-sm bg-zinc-100/60 px-3 py-2 text-zinc-500 dark:bg-zinc-800/40">
                  Fresh start — dropping all {incomplete.length} leftover task
                  {incomplete.length > 1 ? "s" : ""}
                </div>
              )}
              {todayTasks.length > 0 && (
                <div className="rounded-sm bg-white/60 px-3 py-2 dark:bg-zinc-900/40">
                  <span className="font-medium">{todayTasks.length} on deck</span>{" "}
                  for today
                </div>
              )}
              {theme.trim() && (
                <div className="rounded-sm border border-amber-300/50 px-3 py-2 dark:border-amber-700/30">
                  <span className="font-medium">Theme:</span> &ldquo;{theme.trim()}&rdquo;
                </div>
              )}
            </div>
            {carryOverMutation.isError && (
              <p className="mb-2 rounded-sm border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
                Couldn&apos;t save your check-in. Try again.
              </p>
            )}
            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={carryOverMutation.isPending}
                className="rounded-sm bg-amber-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
              >
                {carryOverMutation.isPending ? "Saving…" : "🔥 Let's go"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
