"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useTaskContext } from "@/contexts/TaskContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface AddTaskFormProps {
  defaultOpen?: boolean;
}

export function AddTaskForm({ defaultOpen = false }: AddTaskFormProps) {
  const [title, setTitle] = useState("");
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { refreshTasks, goals } = useTaskContext();

  const [expanded, setExpanded] = useState(false);
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [goalId, setGoalId] = useState<string>("");
  const [description, setDescription] = useState("");

  const createMutation = trpc.task.create.useMutation({
    onSuccess: () => {
      setTitle("");
      setPriority("medium");
      setDueDate(new Date());
      setGoalId("");
      setDescription("");
      setExpanded(false);
      setIsOpen(false);
      refreshTasks();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate({
      title: title.trim(),
      dueDate,
      priority,
      ...(goalId ? { goalId } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-lg border border-dashed border-zinc-300 py-2 text-sm text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
      >
        + Add task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex gap-2">
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to get done?"
          className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setExpanded(false);
              setIsOpen(false);
            }
          }}
        />
        <button
          type="submit"
          disabled={!title.trim() || createMutation.isPending}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
        >
          Add
        </button>
      </div>

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          More options
        </button>
      ) : (
        <div className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
          <div className="flex gap-3">
            {/* Priority */}
            <div className="flex-1">
              <label className="mb-1 block text-xs text-zinc-500">Priority</label>
              <Select value={priority} onValueChange={(v) => setPriority(v as "high" | "medium" | "low")}>
                <SelectTrigger className="h-8 w-full text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="flex-1">
              <label className="mb-1 block text-xs text-zinc-500">Due date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs font-normal">
                    {dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(d) => d && setDueDate(d)}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Goal */}
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Goal</label>
            <Select value={goalId} onValueChange={setGoalId}>
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue placeholder="No goal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No goal</SelectItem>
                {goals.filter((g) => g.status === "active").map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs text-zinc-500">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional notes..."
              className="min-h-[60px] text-xs"
            />
          </div>
        </div>
      )}
    </form>
  );
}
