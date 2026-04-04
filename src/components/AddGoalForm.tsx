"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useTaskContext } from "@/contexts/TaskContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface AddGoalFormProps {
  onClose: () => void;
}

export function AddGoalForm({ onClose }: AddGoalFormProps) {
  const { refreshGoals } = useTaskContext();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");

  const createMutation = trpc.goal.create.useMutation({
    onSuccess: () => {
      refreshGoals();
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate({
      title: title.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      priority,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div>
        <label className="mb-1 block text-xs text-zinc-500">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Goal title"
          className="text-sm"
          autoFocus
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-zinc-500">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description..."
          className="min-h-[60px] text-xs"
        />
      </div>
      <div>
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
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>Cancel</Button>
        <Button size="sm" type="submit" disabled={!title.trim() || createMutation.isPending}>Save</Button>
      </div>
    </form>
  );
}
