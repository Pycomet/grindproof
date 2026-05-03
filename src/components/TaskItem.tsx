"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { useTaskContext } from "@/contexts/TaskContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Check, Link2 } from "lucide-react";

interface TaskItemProps {
  task: {
    id: string;
    title: string;
    description: string | null;
    priority: "high" | "medium" | "low";
    status: "pending" | "completed" | "skipped";
    dueDate: Date | null;
    goalId: string | null;
  };
}

const priorityColors = {
  high: "bg-red-500/10 text-red-400 border-red-500/30",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  low: "bg-accent text-muted-foreground border-border",
};

const priorityBarColors = {
  high: "bg-tier-slacking",
  medium: "bg-tier-grinding",
  low: "bg-zinc-300 dark:bg-zinc-600",
};

export function TaskItem({ task }: TaskItemProps) {
  const { refreshTasks, goals } = useTaskContext();
  const utils = trpc.useUtils();

  // After any mutation that can move the score, invalidate the
  // accountability widget queries so the dashboard updates without a refresh.
  const onTaskMutated = () => {
    refreshTasks();
    utils.accountabilityScore.getScore.invalidate();
    utils.accountabilityScore.getScoreTrend.invalidate();
    utils.accountabilityScore.getActivityHeatmap.invalidate();
  };

  const completeMutation = trpc.task.complete.useMutation({
    onSuccess: onTaskMutated,
  });
  const updateMutation = trpc.task.update.useMutation({
    onSuccess: onTaskMutated,
  });
  const deleteMutation = trpc.task.delete.useMutation({
    onSuccess: onTaskMutated,
  });
  const rescheduleMutation = trpc.task.reschedule.useMutation({
    onSuccess: onTaskMutated,
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editDueDate, setEditDueDate] = useState<Date | null>(task.dueDate ? new Date(task.dueDate) : null);
  const [editGoalId, setEditGoalId] = useState(task.goalId || "none");
  const [editDescription, setEditDescription] = useState(task.description || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isCompleted = task.status === "completed";

  const handleToggle = () => {
    if (isCompleted) {
      updateMutation.mutate({ id: task.id, status: "pending" });
    } else {
      completeMutation.mutate({ id: task.id });
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const startEditing = () => {
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate ? new Date(task.dueDate) : null);
    setEditGoalId(task.goalId || "none");
    setEditDescription(task.description || "");
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim()) return;
    updateMutation.mutate({
      id: task.id,
      title: editTitle.trim(),
      priority: editPriority,
      dueDate: editDueDate,
      goalId: editGoalId === "none" ? null : editGoalId,
      description: editDescription.trim() || null,
    });
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(task.title);
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate ? new Date(task.dueDate) : null);
    setEditGoalId(task.goalId || "none");
    setEditDescription(task.description || "");
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteMutation.mutate({ id: task.id });
    setShowDeleteConfirm(false);
  };

  if (isEditing) {
    return (
      <div className="space-y-2 rounded-md border border-border bg-card p-4">
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="text-sm"
          autoFocus
        />
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Priority</label>
            <Select value={editPriority} onValueChange={(v) => setEditPriority(v as "high" | "medium" | "low")}>
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
          <div className="flex-1">
            <label className="mb-1 block text-xs text-muted-foreground">Due date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="w-full justify-start text-xs font-normal">
                  {editDueDate
                    ? editDueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })
                    : "No date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={editDueDate ?? undefined}
                  onSelect={(d) => setEditDueDate(d ?? null)}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Goal</label>
          <Select value={editGoalId} onValueChange={setEditGoalId}>
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
        <div>
          <label className="mb-1 block text-xs text-muted-foreground">Description</label>
          <Textarea
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            placeholder="Optional notes..."
            className="min-h-[60px] text-xs"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleCancelEdit}>Cancel</Button>
          <Button size="sm" onClick={handleSaveEdit} disabled={!editTitle.trim()}>Save</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center overflow-hidden rounded-md border border-border bg-card">
      {/* Priority strip */}
      <div className={`w-[3px] self-stretch shrink-0 ${priorityBarColors[task.priority]}`} />
      <div className="flex flex-1 items-center gap-3 px-4 py-3">
      <button
        onClick={handleToggle}
        role="checkbox"
        aria-checked={isCompleted}
        aria-label={`Mark "${task.title}" as ${isCompleted ? "incomplete" : "complete"}`}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
          isCompleted
            ? "border-foreground bg-foreground text-background"
            : "border-border hover:border-muted-foreground"
        }`}
      >
        {isCompleted && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>
      <span
        className={`flex-1 text-sm ${isCompleted ? "text-muted-foreground line-through" : "text-foreground"}`}
      >
        {task.title}
      </span>
      <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>
        {task.priority}
      </Badge>
      {task.goalId && (
        <span title="Linked to a goal" className="text-muted-foreground">
          <Link2 className="h-3 w-3" />
        </span>
      )}
      {task.dueDate && (
        <span className="text-xs text-muted-foreground gp-num">{formatDate(task.dueDate)}</span>
      )}

      {showDeleteConfirm ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Delete?</span>
          <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setShowDeleteConfirm(false)}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" className="h-6 text-xs" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={startEditing}>
              Edit
            </DropdownMenuItem>

            {/* Reschedule submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Reschedule</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <div className="p-1">
                  <Calendar
                    mode="single"
                    selected={task.dueDate ? new Date(task.dueDate) : undefined}
                    onSelect={(d) => {
                      if (d) rescheduleMutation.mutate({ id: task.id, newDueDate: d });
                    }}
                  />
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Move to Goal submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Move to Goal</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => updateMutation.mutate({ id: task.id, goalId: null })}>
                  No goal{!task.goalId && " (current)"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {goals.filter((g) => g.status === "active").map((g) => (
                  <DropdownMenuItem key={g.id} onClick={() => updateMutation.mutate({ id: task.id, goalId: g.id })}>
                    {g.title}{task.goalId === g.id && " (current)"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            {/* Change Priority submenu */}
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>Change Priority</DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {(["high", "medium", "low"] as const).map((p) => (
                  <DropdownMenuItem key={p} onClick={() => updateMutation.mutate({ id: task.id, priority: p })}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                    {task.priority === p && " (current)"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>

            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-400 focus:text-red-400"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
      </div>
    </div>
  );
}
