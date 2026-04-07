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
import { MoreHorizontal } from "lucide-react";

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
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export function TaskItem({ task }: TaskItemProps) {
  const { refreshTasks, goals } = useTaskContext();

  const completeMutation = trpc.task.complete.useMutation({
    onSuccess: () => refreshTasks(),
  });
  const updateMutation = trpc.task.update.useMutation({
    onSuccess: () => refreshTasks(),
  });
  const deleteMutation = trpc.task.delete.useMutation({
    onSuccess: () => refreshTasks(),
  });
  const rescheduleMutation = trpc.task.reschedule.useMutation({
    onSuccess: () => refreshTasks(),
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
      <div className="space-y-2 rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="text-sm"
          autoFocus
        />
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-xs text-zinc-500">Priority</label>
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
            <label className="mb-1 block text-xs text-zinc-500">Due date</label>
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
          <label className="mb-1 block text-xs text-zinc-500">Goal</label>
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
          <label className="mb-1 block text-xs text-zinc-500">Description</label>
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
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <button
        onClick={handleToggle}
        role="checkbox"
        aria-checked={isCompleted}
        aria-label={`Mark "${task.title}" as ${isCompleted ? "incomplete" : "complete"}`}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
          isCompleted
            ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
            : "border-zinc-300 hover:border-zinc-500 dark:border-zinc-600"
        }`}
      >
        {isCompleted && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <span
        className={`flex-1 text-sm ${isCompleted ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-50"}`}
      >
        {task.title}
      </span>
      <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>
        {task.priority}
      </Badge>
      {task.goalId && (
        <span title="Linked to a goal" className="text-amber-400 dark:text-amber-500">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
            <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
          </svg>
        </span>
      )}
      {task.dueDate && (
        <span className="text-xs text-zinc-500">{formatDate(task.dueDate)}</span>
      )}

      {showDeleteConfirm ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Delete?</span>
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
            <button className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300">
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
              className="text-red-600 focus:text-red-600"
              onClick={() => setShowDeleteConfirm(true)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
