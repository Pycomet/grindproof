"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useTaskContext } from "@/contexts/TaskContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TaskItem } from "./TaskItem";

interface GoalDetailModalProps {
  goalId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialEditMode?: boolean;
}

const priorityColors = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export function GoalDetailModal({ goalId, open, onOpenChange, initialEditMode = false }: GoalDetailModalProps) {
  const { tasks, goals, refreshGoals, refreshTasks } = useTaskContext();
  const goal = goals.find((g) => g.id === goalId);

  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [editTitle, setEditTitle] = useState(goal?.title || "");
  const [editDescription, setEditDescription] = useState(goal?.description || "");
  const [editPriority, setEditPriority] = useState<"high" | "medium" | "low">(goal?.priority || "medium");
  const [editStatus, setEditStatus] = useState<"active" | "completed">(goal?.status || "active");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const updateMutation = trpc.goal.update.useMutation({
    onSuccess: (data) => {
      refreshGoals();
      if (data) {
        setEditTitle(data.title);
        setEditDescription(data.description || "");
        setEditPriority(data.priority);
        setEditStatus(data.status);
      }
      setIsEditing(false);
    },
  });

  const deleteMutation = trpc.goal.delete.useMutation({
    onSuccess: () => {
      refreshGoals();
      refreshTasks();
      onOpenChange(false);
    },
  });

  if (!goal) return null;

  const linkedTasks = tasks.filter((t) => t.goalId === goalId);
  const completedCount = linkedTasks.filter((t) => t.status === "completed").length;

  const handleSave = () => {
    if (!editTitle.trim()) return;
    updateMutation.mutate({
      id: goal.id,
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      priority: editPriority,
      status: editStatus,
    });
  };

  const handleCancelEdit = () => {
    setEditTitle(goal.title);
    setEditDescription(goal.description || "");
    setEditPriority(goal.priority);
    setEditStatus(goal.status);
    setIsEditing(false);
  };

  const handleDelete = () => {
    deleteMutation.mutate({ id: goal.id });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && goal) {
      setEditTitle(goal.title);
      setEditDescription(goal.description || "");
      setEditPriority(goal.priority);
      setEditStatus(goal.status);
      setIsEditing(initialEditMode);
      setShowDeleteConfirm(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Goal" : goal.title}
          </DialogTitle>
        </DialogHeader>

        {isEditing ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Title</label>
              <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="text-sm" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-zinc-500">Description</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Optional description..."
                className="min-h-[60px] text-xs"
              />
            </div>
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
                <label className="mb-1 block text-xs text-zinc-500">Status</label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as "active" | "completed")}>
                  <SelectTrigger className="h-8 w-full text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleCancelEdit}>Cancel</Button>
              <Button size="sm" onClick={handleSave} disabled={!editTitle.trim() || updateMutation.isPending}>Save</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`text-xs ${priorityColors[goal.priority]}`}>
                {goal.priority}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {goal.status}
              </Badge>
            </div>

            {goal.description && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{goal.description}</p>
            )}

            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-zinc-500">
                  Linked Tasks ({completedCount}/{linkedTasks.length} completed)
                </span>
              </div>
              {linkedTasks.length === 0 ? (
                <p className="text-xs text-zinc-400">No tasks linked to this goal.</p>
              ) : (
                <div className="max-h-60 space-y-1 overflow-y-auto">
                  {linkedTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {!isEditing && (
          <DialogFooter>
            {showDeleteConfirm ? (
              <div className="flex w-full items-center justify-between">
                <span className="text-xs text-zinc-500">Delete this goal? Tasks linked to it will be unlinked.</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
                  <Button variant="destructive" size="sm" onClick={handleDelete}>Delete</Button>
                </div>
              </div>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={() => {
                  setEditTitle(goal.title);
                  setEditDescription(goal.description || "");
                  setEditPriority(goal.priority);
                  setEditStatus(goal.status);
                  setIsEditing(true);
                }}>Edit</Button>
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
