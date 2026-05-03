"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useTaskContext } from "@/contexts/TaskContext";
import { useChatContext } from "@/contexts/ChatContext";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  ChevronLeft,
  Frown,
  Meh,
  Smile,
  SmilePlus,
  Flame,
  Check,
  X,
  type LucideIcon,
} from "lucide-react";

const PRIORITY_BAR: Record<string, string> = {
  high: "bg-tier-slacking",
  medium: "bg-tier-grinding",
  low: "bg-zinc-300 dark:bg-zinc-600",
};

const RATINGS: Array<{
  value: 1 | 2 | 3 | 4 | 5;
  Icon: LucideIcon;
  label: string;
}> = [
  { value: 1, Icon: Frown, label: "Rough" },
  { value: 2, Icon: Meh, label: "Meh" },
  { value: 3, Icon: Smile, label: "Okay" },
  { value: 4, Icon: SmilePlus, label: "Good" },
  { value: 5, Icon: Flame, label: "Crushed it" },
];

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
      <div className="h-28 animate-pulse rounded-md border border-border bg-card" />
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
      [taskId]: {
        ...prev[taskId],
        status,
        reflection: prev[taskId]?.reflection ?? "",
      },
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

    const ratingLabel = rating
      ? RATINGS.find((r) => r.value === rating)?.label
      : null;
    const parts: string[] = [];
    if (completed.length > 0) parts.push(`Completed: ${completed.join(", ")}`);
    if (skipped.length > 0) parts.push(`Skipped: ${skipped.join(", ")}`);
    if (ratingLabel) parts.push(`Day rating: ${ratingLabel}`);
    if (proud.trim()) parts.push(`Proud of: ${proud.trim()}`);

    sendMessage(
      `[Evening reality check] ${parts.join(". ")}. Call out patterns, give credit where due, be brief.`
    );
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
      { onSuccess: () => dispatchChat() }
    );
  };

  const selectedRating = rating ? RATINGS.find((r) => r.value === rating) : null;

  return (
    <div className="overflow-hidden rounded-md border border-border bg-card">
      {/* Step indicator */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="gp-eyebrow">Evening Reality Check</span>
        <div className="flex items-center gap-1">
          {([1, 2, 3] as const).map((s) => (
            <div
              key={s}
              className={`h-1.5 w-4 rounded-full transition-colors ${
                s === step
                  ? "bg-foreground"
                  : s < step
                    ? "bg-muted-foreground"
                    : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="p-4">
        {/* Step 1: What happened? */}
        {step === 1 && (
          <>
            <p className="mb-3 text-sm font-semibold text-foreground">
              What happened?
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              {pendingTasks.length} task{pendingTasks.length > 1 ? "s" : ""}{" "}
              still pending. Mark each one honestly.
            </p>
            <div className="mb-4 space-y-3">
              {pendingTasks.map((task) => (
                <div key={task.id} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`h-3.5 w-[3px] rounded-full shrink-0 ${PRIORITY_BAR[task.priority] ?? "bg-zinc-300"}`}
                      />
                      <span className="truncate text-sm text-foreground">
                        {task.title}
                      </span>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() =>
                          handleStatusChange(task.id, "completed")
                        }
                        className={cn(
                          "rounded-sm px-2 py-1 text-xs transition-colors",
                          reflections[task.id]?.status === "completed"
                            ? "bg-green-500/15 text-green-400"
                            : "bg-accent text-muted-foreground hover:text-foreground"
                        )}
                      >
                        Done
                      </button>
                      <button
                        onClick={() => handleStatusChange(task.id, "skipped")}
                        className={cn(
                          "rounded-sm px-2 py-1 text-xs transition-colors",
                          reflections[task.id]?.status === "skipped"
                            ? "bg-red-500/15 text-red-400"
                            : "bg-accent text-muted-foreground hover:text-foreground"
                        )}
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
                        onChange={(e) =>
                          handleReflectionText(task.id, e.target.value)
                        }
                        className={cn(
                          "w-full rounded-sm border bg-transparent px-2 py-1 text-xs text-foreground outline-none placeholder:text-muted-foreground transition-colors",
                          reflections[task.id]?.reflection?.trim()
                            ? "border-input focus:border-zinc-500"
                            : "border-red-500/60 focus:border-red-400"
                        )}
                      />
                      {!reflections[task.id]?.reflection?.trim() && (
                        <p className="text-[10px] text-red-400">Required.</p>
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
                className="flex items-center gap-1 rounded-full bg-zinc-50 px-4 py-1.5 text-sm font-medium text-zinc-900 transition-opacity hover:opacity-90 active:opacity-85 disabled:opacity-40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}

        {/* Step 2: How do you feel? */}
        {step === 2 && (
          <>
            <p className="mb-3 text-sm font-semibold text-foreground">
              How do you feel about today?
            </p>
            <div className="mb-4 flex gap-1.5">
              {RATINGS.map(({ value, Icon, label }) => {
                const active = rating === value;
                return (
                  <button
                    key={value}
                    onClick={() => setRating(value)}
                    aria-pressed={active}
                    aria-label={label}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-1 rounded-sm border py-2.5 text-center transition-colors",
                      active
                        ? "border-foreground bg-accent text-foreground"
                        : "border-border bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-[10px]">{label}</span>
                  </button>
                );
              })}
            </div>
            <div className="mb-4">
              <label className="mb-1 block text-xs text-muted-foreground">
                One thing you&apos;re proud of{" "}
                <span className="text-zinc-400">(optional)</span>
              </label>
              <input
                type="text"
                value={proud}
                onChange={(e) => setProud(e.target.value)}
                placeholder="Even something small counts"
                maxLength={80}
                className="w-full rounded-sm border border-input bg-transparent px-3 py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-zinc-500 transition-colors"
              />
            </div>
            <div className="flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={rating === null}
                className="flex items-center gap-1 rounded-full bg-zinc-50 px-4 py-1.5 text-sm font-medium text-zinc-900 transition-opacity hover:opacity-90 active:opacity-85 disabled:opacity-40"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}

        {/* Step 3: Wrap up */}
        {step === 3 && (
          <>
            <p className="mb-3 text-sm font-semibold text-foreground">
              Wrapping up
            </p>
            <div className="mb-4 space-y-2 text-sm text-foreground">
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
                      <div className="flex items-center gap-2 rounded-sm border border-border bg-green-500/10 px-3 py-2 text-green-400">
                        <Check className="h-3.5 w-3.5" />
                        <span className="font-medium">
                          {done.length} completed
                        </span>
                      </div>
                    )}
                    {skipped.length > 0 && (
                      <div className="flex items-center gap-2 rounded-sm border border-border bg-red-500/10 px-3 py-2 text-red-400">
                        <X className="h-3.5 w-3.5" />
                        <span className="font-medium">
                          {skipped.length} skipped
                        </span>
                      </div>
                    )}
                  </>
                );
              })()}
              {selectedRating && (
                <div className="flex items-center gap-2 rounded-sm border border-border px-3 py-2">
                  <selectedRating.Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="font-medium">Day rating:</span>{" "}
                  {selectedRating.label}
                </div>
              )}
              {proud.trim() && (
                <div className="rounded-sm border border-border px-3 py-2">
                  &ldquo;{proud.trim()}&rdquo;
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Your coach will weigh in on this.
              </p>
            </div>
            {submitMutation.isError && (
              <p className="mb-2 rounded-sm border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-400">
                Couldn&apos;t save your reflections. Try again.
              </p>
            )}
            <div className="flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitMutation.isPending}
                className="rounded-full bg-zinc-50 px-5 py-1.5 text-sm font-medium text-zinc-900 transition-opacity hover:opacity-90 active:opacity-85 disabled:opacity-50"
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
