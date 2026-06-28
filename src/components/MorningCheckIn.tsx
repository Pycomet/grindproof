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
      <div className="h-28 animate-pulse rounded-md border border-border bg-card" />
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
    <div
      id="morning-checkin"
      className="overflow-hidden rounded-md border border-border bg-card"
    >
      {/* Step indicator */}
      <div className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="gp-eyebrow">Morning Check-in</span>
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
        {/* Step 1: Yesterday's unfinished */}
        {step === 1 && (
          <>
            <p className="mb-3 text-sm font-semibold text-foreground">
              What didn&apos;t get done?
            </p>
            <p className="mb-3 text-xs text-muted-foreground">
              {incomplete.length} task{incomplete.length > 1 ? "s" : ""} left
              over from yesterday. Check what you&apos;re carrying forward.
            </p>
            <div className="mb-4 space-y-1.5">
              {incomplete.map((task) => (
                <label
                  key={task.id}
                  className="flex cursor-pointer items-center gap-2.5 rounded-sm p-1.5 hover:bg-accent transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(task.id)}
                    onChange={() => toggleTask(task.id)}
                    className="rounded border-border"
                  />
                  <div
                    className={`h-3.5 w-[3px] rounded-full shrink-0 ${PRIORITY_BAR[task.priority] ?? "bg-zinc-300"}`}
                  />
                  <span className="text-sm text-foreground">{task.title}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {selectedIds.length === 0
                  ? "None selected — fresh start"
                  : `${selectedIds.length} carrying over`}
              </span>
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1 rounded-full bg-zinc-50 px-4 py-1.5 text-sm font-medium text-zinc-900 transition-opacity hover:opacity-90 active:opacity-85"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}

        {/* Step 2: Today's plan */}
        {step === 2 && (
          <>
            <p className="mb-3 text-sm font-semibold text-foreground">
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
                    <span className="text-sm text-foreground">
                      {task.title}
                    </span>
                    <span className="ml-auto text-[10px] uppercase tracking-wide text-muted-foreground">
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mb-4 text-xs text-muted-foreground">
                No tasks added yet — you can add them from the dashboard.
              </p>
            )}
            <div className="mb-4">
              <label className="mb-1 block text-xs text-muted-foreground">
                One word or phrase for today&apos;s theme{" "}
                <span className="text-zinc-400">(optional)</span>
              </label>
              <input
                type="text"
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                placeholder="e.g. deep work, shipping, recovery"
                maxLength={50}
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
                className="flex items-center gap-1 rounded-full bg-zinc-50 px-4 py-1.5 text-sm font-medium text-zinc-900 transition-opacity hover:opacity-90 active:opacity-85"
              >
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        )}

        {/* Step 3: Confirm & commit */}
        {step === 3 && (
          <>
            <p className="mb-3 text-sm font-semibold text-foreground">
              Your plan
            </p>
            <div className="mb-4 space-y-2 text-sm text-foreground">
              {selectedIds.length > 0 ? (
                <div className="rounded-sm border border-border bg-accent/50 px-3 py-2">
                  <span className="font-medium">Carrying over:</span>{" "}
                  {incomplete
                    .filter((t) => selectedIds.includes(t.id))
                    .map((t) => t.title)
                    .join(", ")}
                </div>
              ) : (
                <div className="rounded-sm border border-border bg-accent/30 px-3 py-2 text-muted-foreground">
                  Fresh start — dropping all {incomplete.length} leftover task
                  {incomplete.length > 1 ? "s" : ""}
                </div>
              )}
              {todayTasks.length > 0 && (
                <div className="rounded-sm border border-border px-3 py-2">
                  <span className="font-medium">{todayTasks.length} on deck</span>{" "}
                  for today
                </div>
              )}
              {theme.trim() && (
                <div className="rounded-sm border border-border px-3 py-2">
                  <span className="font-medium">Theme:</span> &ldquo;
                  {theme.trim()}&rdquo;
                </div>
              )}
            </div>
            {carryOverMutation.isError && (
              <p className="mb-2 rounded-sm border border-red-500/40 bg-red-500/10 px-2 py-1 text-xs text-red-400">
                Couldn&apos;t save your check-in. Try again.
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
                disabled={carryOverMutation.isPending}
                className="rounded-full bg-zinc-50 px-5 py-1.5 text-sm font-medium text-zinc-900 transition-opacity hover:opacity-90 active:opacity-85 disabled:opacity-50"
              >
                {carryOverMutation.isPending ? "Saving…" : "Let's go"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
