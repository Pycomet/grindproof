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
  const [goalId, setGoalId] = useState<string>("none");
  const [description, setDescription] = useState("");

  const createMutation = trpc.task.create.useMutation({
    onSuccess: () => {
      setTitle("");
      setPriority("medium");
      setDueDate(new Date());
      setGoalId("none");
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
      ...(goalId && goalId !== "none" ? { goalId } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-md border border-dashed border-border py-2 text-sm text-muted-foreground transition-colors hover:border-muted-foreground hover:text-foreground"
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
          className="flex-1 rounded-sm border border-input bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-zinc-500 transition-colors"
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
          className="rounded-full bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-900 transition-opacity hover:opacity-90 active:opacity-85 disabled:opacity-50"
        >
          Add
        </button>
      </div>

      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          More options
        </button>
      ) : (
        <div className="space-y-3 rounded-md border border-border bg-card p-3">
          <div className="flex gap-3">
            {/* Priority */}
            <div className="flex-1">
              <label className="mb-1 block text-xs text-muted-foreground">Priority</label>
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
              <label className="mb-1 block text-xs text-muted-foreground">Due date</label>
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
            <label className="mb-1 block text-xs text-muted-foreground">Goal</label>
            <Select value={goalId} onValueChange={setGoalId}>
              <SelectTrigger className="h-8 w-full text-xs">
                <SelectValue placeholder="No goal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No goal</SelectItem>
                {goals.filter((g) => g.status === "active").map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Description</label>
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
