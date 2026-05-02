"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useTaskContext } from "@/contexts/TaskContext";
import { useChatContext } from "@/contexts/ChatContext";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronLeft } from "lucide-react";

const PRIORITY_BAR: Record<string, string> = {
  high: "bg-tier-slacking",
  medium: "bg-tier-grinding",
  low: "bg-zinc-300 dark:bg-zinc-600",
};

const RATINGS = [
  { value: 1, emoji: "😩", label: "Rough" },
  { value: 2, emoji: "😕", label: "Meh" },
  { value: 3, emoji: "😐", label: "Okay" },
  { value: 4, emoji: "😊", label: "Good" },
  { value: 5, emoji: "🔥", label: "Crushed it" },
] as const;

export function EveningCheckIn() {
  const { refreshTasks } = useTaskContext();
  const { sendMessage, setIsOpen } = useChatContext();
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.dailyCheck.getEveningSchedule.useQuery();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [reflections, setReflections] = useState<
    Record<string, { status: "completed" | "skipped"; reflection: string }>
  >({});
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [proud, setProud] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = trpc.dailyCheck.submitEveningReflections.useMutation({
    onSuccess: () => {
      refreshTasks();
      utils.accountabilityScore.getScore.invalidate();
      utils.accountabilityScore.getScoreTrend.invalidate();
      utils.accountabilityScore.getActivityHeatmap.invalidate();
      setSubmitted(true);
    },
  });

  if (isLoading) {
    return (
      <div className="h-28 animate-pulse rounded-md border border-indigo-200 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-950/20" />
    );
  }
  if (!data || submitted) return null;

  const pendingTasks = (data.todayTasks as any[]).filter(
    (t) => t.status === "pending"
  );
  if (pendingTasks.length === 0) return null;

  const handleStatusChange = (taskId: string, status: "completed" | "skipped") =>
    setReflections((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], status, reflection: prev[taskId]?.reflection ?? "" },
    }));

  const handleReflectionText = (taskId: string, text: string) =>
    setReflections((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], reflection: text },
    }));

  const allReviewed = pendingTasks.every((t) => {
    const r = reflections[t.id];
    if (!r?.status) return false;
    if (r.status === "skipped" && !r.reflection?.trim()) return false;
    return true;
  });

  const dispatchChat = () => {
    const completed = pendingTasks
      .filter((t) => reflections[t.id]?.status === "completed")
      .map((t) => t.title);
    const skipped = pendingTasks
      .filter((t) => reflections[t.id]?.status === "skipped")
      .map((t) => {
        const r = reflections[t.id]?.reflection;
        return r ? `${t.title} (${r})` : t.title;
      });

    const ratingLabel = rating ? RATINGS.find((r) => r.value === rating)?.label : null;
    const parts: string[] = [];
    if (completed.length > 0) parts.push(`Completed: ${completed.join(", ")}`);
    if (skipped.length > 0) parts.push(`Skipped: ${skipped.join(", ")}`);
    if (ratingLabel) parts.push(`Day rating: ${ratingLabel}`);
    if (proud.trim()) parts.push(`Proud of: ${proud.trim()}`);

    sendMessage(`[Evening reality check] ${parts.join(". ")}. Call out patterns, give credit where due, be brief.`);
    setIsOpen(true);
  };

  const handleSubmit = () => {
    const items = Object.entries(reflections).map(([taskId, d]) => ({
      taskId,
      status: d.status,
      reflection: d.status === "skipped" ? d.reflection : undefined,
    }));
    if (items.length === 0) {
      setSubmitted(true);
      dispatchChat();
      return;
    }
    submitMutation.mutate(
      { reflections: items },
      { onSuccess: () => dispatchChat() },
    );
  };

  const selectedRating = rating ? RATINGS.find((r) => r.value === rating) : null;

  return (
    <div className="overflow-hidden rounded-md border border-indigo-200 bg-indigo-50 dark:border-indigo-900/50 dark:bg-indigo-950/20">
      {/* Step indicator */}
      <div className="flex items-center justify-between border-b border-indigo-200/60 px-4 py-2 dark:border-indigo-900/30">
        <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">
          Evening reality check
        </span>
        <div className="flex items-center gap-1">
          {([1, 2, 3] as const).map((s) => (
            <div
              key={s}
              className={`h-1.5 w-4 rounded-full transition-all ${
                s === step
                  ? "bg-indigo-500"
                  : s < step
                    ? "bg-indigo-400/60"
                    : "bg-indigo-200 dark:bg-indigo-900/50"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="p-4">
        {/* Step 1: What happened? */}
        {step === 1 && (
          <>
            <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              What happened?
            </p>
            <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-400">
              {pendingTasks.length} task{pendingTasks.length > 1 ? "s" : ""} still
              pending. Mark each one honestly.
            </p>
            <div className="mb-4 space-y-3">
              {pendingTasks.map((task) => (
                <div key={task.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`h-3.5 w-[3px] rounded-full shrink-0 ${PRIORITY_BAR[task.priority] ?? "bg-zinc-300"}`}
                      />
                      <span className="truncate text-sm text-zinc-700 dark:text-zinc-300">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => handleStatusChange(task.id, "completed")}
                        className={`rounded-sm px-2 py-1 text-xs transition-colors ${
                          reflections[task.id]?.status === "completed"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-zinc-100 text-zinc-500 hover:bg-green-50 dark:bg-zinc-800"
                        }`}
                      >
                        Done
                      </button>
                      <button
                        onClick={() => handleStatusChange(task.id, "skipped")}
                        className={`rounded-sm px-2 py-1 text-xs transition-colors ${
                          reflections[task.id]?.status === "skipped"
                            ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            : "bg-zinc-100 text-zinc-500 hover:bg-red-50 dark:bg-zinc-800"
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
                        value={reflections[task.id]?.reflection ?? ""}
                        onChange={(e) => handleReflectionText(task.id, e.target.value)}
                        className={cn(
                          "w-full rounded-sm border bg-white/60 px-2 py-1 text-xs outline-none dark:bg-zinc-900/60 dark:text-zinc-50",
                          reflections[task.id]?.reflection?.trim()
                            ? "border-zinc-300 dark:border-zinc-700"
                            : "border-red-400 dark:border-red-700"
                        )}
                      />
                      {!reflections[task.id]?.reflection?.trim() && (
                        <p className="text-[10px] text-red-500">Required.</p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!allReviewed}
                className="flex items-center gap-1 rounded-sm bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-40 transition-colors"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}

        {/* Step 2: How do you feel? */}
        {step === 2 && (
          <>
            <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              How do you feel about today?
            </p>
            <div className="mb-4 flex gap-1.5">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRating(r.value)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-sm py-2.5 text-center transition-all",
                    rating === r.value
                      ? "bg-indigo-100 ring-1 ring-indigo-400 dark:bg-indigo-900/40 dark:ring-indigo-600"
                      : "bg-white/60 hover:bg-indigo-50 dark:bg-zinc-900/40 dark:hover:bg-indigo-900/20"
                  )}
                >
                  <span className="text-xl leading-none">{r.emoji}</span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    {r.label}
                  </span>
                </button>
              ))}
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-xs text-zinc-500">
                One thing you&apos;re proud of{" "}
                <span className="text-zinc-400">(optional)</span>
              </label>
              <input
                type="text"
                value={proud}
                onChange={(e) => setProud(e.target.value)}
                placeholder="Even something small counts"
                maxLength={80}
                className="w-full rounded-sm border border-indigo-200 bg-white/60 px-3 py-1.5 text-sm outline-none placeholder:text-zinc-400 focus:border-indigo-400 dark:border-indigo-900/50 dark:bg-zinc-900/60 dark:text-zinc-100"
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
                disabled={rating === null}
                className="flex items-center gap-1 rounded-sm bg-indigo-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-40 transition-colors"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}

        {/* Step 3: Wrap up */}
        {step === 3 && (
          <>
            <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Wrapping up
            </p>
            <div className="mb-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
              {/* Completed summary */}
              {(() => {
                const done = pendingTasks.filter(
                  (t) => reflections[t.id]?.status === "completed"
                );
                const skipped = pendingTasks.filter(
                  (t) => reflections[t.id]?.status === "skipped"
                );
                return (
                  <>
                    {done.length > 0 && (
                      <div className="rounded-sm bg-green-100/60 px-3 py-2 dark:bg-green-900/20">
                        <span className="font-medium text-green-700 dark:text-green-400">
                          ✓ {done.length} completed
                        </span>
                      </div>
                    )}
                    {skipped.length > 0 && (
                      <div className="rounded-sm bg-red-100/40 px-3 py-2 dark:bg-red-900/10">
                        <span className="font-medium text-red-600 dark:text-red-400">
                          ✗ {skipped.length} skipped
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
              {selectedRating && (
                <div className="rounded-sm bg-white/60 px-3 py-2 dark:bg-zinc-900/40">
                  <span className="font-medium">Day rating:</span>{" "}
                  {selectedRating.emoji} {selectedRating.label}
                </div>
              )}
              {proud.trim() && (
                <div className="rounded-sm border border-indigo-200/60 px-3 py-2 dark:border-indigo-800/30">
                  &ldquo;{proud.trim()}&rdquo;
                </div>
              )}
              <p className="text-xs text-zinc-400">
                Your coach will weigh in on this.
              </p>
            </div>
            {submitMutation.isError && (
              <p className="mb-2 rounded-sm border border-red-300 bg-red-50 px-2 py-1 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
                Couldn&apos;t save your reflections. Try again.
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
                disabled={submitMutation.isPending}
                className="rounded-sm bg-indigo-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-600 disabled:opacity-50 transition-colors"
              >
                {submitMutation.isPending ? "Saving…" : "Submit reality check"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
