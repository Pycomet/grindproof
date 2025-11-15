'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';

interface TaskFormData {
  title: string;
  description: string;
  dueDate: Date | undefined;
  goalId: string;
  tags: string[];
  syncWithCalendar: boolean;
}

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TaskFormData) => void;
  isPending: boolean;
  goals?: Array<{ id: string; title: string }>;
  initialGoalId?: string;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  goals = [],
  initialGoalId,
}: CreateTaskDialogProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    dueDate: undefined,
    goalId: initialGoalId || '',
    tags: [],
    syncWithCalendar: true,
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = () => {
    onSubmit(formData);
    // Reset form
    setFormData({
      title: '',
      description: '',
      dueDate: undefined,
      goalId: initialGoalId || '',
      tags: [],
      syncWithCalendar: true,
    });
    setTagInput('');
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const commonTags = ['work', 'learning', 'personal', 'health', 'urgent'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to your list. Optionally sync with Google Calendar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Complete project report"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add details about your task..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <Button
              variant="outline"
              onClick={() => setShowCalendar(!showCalendar)}
              className="w-full justify-start text-left font-normal"
            >
              {formData.dueDate ? formData.dueDate.toLocaleDateString() : 'Pick a date'}
            </Button>
            {showCalendar && (
              <Calendar
                mode="single"
                selected={formData.dueDate}
                onSelect={(date) => {
                  setFormData({ ...formData, dueDate: date });
                  setShowCalendar(false);
                }}
                className="rounded-md border"
              />
            )}
          </div>

          {goals.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="goal">Link to Goal (Optional)</Label>
              <select
                id="goal"
                value={formData.goalId}
                onChange={(e) => setFormData({ ...formData, goalId: e.target.value })}
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">No goal</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                placeholder="Add a tag (e.g., work, learning)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {commonTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    if (formData.tags.includes(tag)) {
                      handleRemoveTag(tag);
                    } else {
                      setFormData({ ...formData, tags: [...formData.tags, tag] });
                    }
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    formData.tags.includes(tag)
                      ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                      : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="syncCalendar"
              checked={formData.syncWithCalendar}
              onChange={(e) =>
                setFormData({ ...formData, syncWithCalendar: e.target.checked })
              }
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
            />
            <Label htmlFor="syncCalendar" className="font-normal">
              Sync with Google Calendar
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setFormData({
                title: '',
                description: '',
                dueDate: undefined,
                goalId: initialGoalId || '',
                tags: [],
                syncWithCalendar: true,
              });
              setTagInput('');
            }}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.title || isPending}>
            {isPending ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CompleteTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (proof: string) => void;
  isPending: boolean;
  taskTitle: string;
}

export function CompleteTaskDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  taskTitle,
}: CompleteTaskDialogProps) {
  const [proof, setProof] = useState('');

  const handleSubmit = () => {
    onSubmit(proof);
    setProof('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Task</DialogTitle>
          <DialogDescription>
            Mark &quot;{taskTitle}&quot; as complete. Optionally add proof of completion.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="proof">Proof of Completion (Optional)</Label>
            <Textarea
              id="proof"
              placeholder="Add notes or proof that you completed this task..."
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? 'Completing...' : 'Mark Complete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<TaskFormData>) => void;
  isPending: boolean;
  goals?: Array<{ id: string; title: string }>;
  task: {
    id: string;
    title: string;
    description?: string | null;
    dueDate?: Date | null;
    goalId?: string | null;
    tags?: string[] | null;
    isSyncedWithCalendar: boolean;
  };
}

export function EditTaskDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  goals = [],
  task,
}: EditTaskDialogProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: task.title,
    description: task.description || '',
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    goalId: task.goalId || '',
    tags: task.tags || [],
    syncWithCalendar: task.isSyncedWithCalendar,
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [tagInput, setTagInput] = useState('');

  // Update form when task changes
  useState(() => {
    setFormData({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      goalId: task.goalId || '',
      tags: task.tags || [],
      syncWithCalendar: task.isSyncedWithCalendar,
    });
  });

  const handleSubmit = () => {
    onSubmit(formData);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...formData.tags, tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter(tag => tag !== tagToRemove),
    });
  };

  const commonTags = ['work', 'learning', 'personal', 'health', 'urgent'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>Update task details</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="What needs to be done?"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add more details..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Due Date</Label>
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCalendar(!showCalendar)}
                className="w-full justify-start text-left font-normal"
              >
                {formData.dueDate ? formData.dueDate.toLocaleDateString() : 'Pick a date'}
              </Button>
              {showCalendar && (
                <Calendar
                  mode="single"
                  selected={formData.dueDate}
                  onSelect={(date) => {
                    setFormData({ ...formData, dueDate: date });
                    setShowCalendar(false);
                  }}
                  className="rounded-md border"
                />
              )}
              {formData.dueDate && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFormData({ ...formData, dueDate: undefined })}
                  className="text-xs"
                >
                  Clear date
                </Button>
              )}
            </div>
          </div>

          {goals.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="edit-goal">Link to Goal</Label>
              <select
                id="edit-goal"
                value={formData.goalId}
                onChange={(e) => setFormData({ ...formData, goalId: e.target.value })}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              >
                <option value="">No goal</option>
                {goals.map((goal) => (
                  <option key={goal.id} value={goal.id}>
                    {goal.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add a tag..."
                className="flex-1"
              />
              <Button type="button" onClick={handleAddTag} variant="outline">
                Add
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {commonTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    if (formData.tags.includes(tag)) {
                      handleRemoveTag(tag);
                    } else {
                      setFormData({ ...formData, tags: [...formData.tags, tag] });
                    }
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    formData.tags.includes(tag)
                      ? 'bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900'
                      : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-syncCalendar"
              checked={formData.syncWithCalendar}
              onChange={(e) =>
                setFormData({ ...formData, syncWithCalendar: e.target.checked })
              }
              className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
            />
            <Label htmlFor="edit-syncCalendar" className="font-normal">
              Sync with Google Calendar
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!formData.title.trim() || isPending}>
            {isPending ? 'Updating...' : 'Update Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RescheduleTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSkip: () => void;
  onReschedule: (newDate: Date) => void;
  isPending: boolean;
  taskTitle: string;
}

export function RescheduleTaskDialog({
  open,
  onOpenChange,
  onSkip,
  onReschedule,
  isPending,
  taskTitle,
}: RescheduleTaskDialogProps) {
  const [newDate, setNewDate] = useState<Date | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState(true);

  const handleReschedule = () => {
    if (newDate) {
      onReschedule(newDate);
      setNewDate(undefined);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Skip or Reschedule Task</DialogTitle>
          <DialogDescription>
            &quot;{taskTitle}&quot; - Choose to skip this task or reschedule it for another day.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Pick a new date to reschedule</Label>
            {showCalendar && (
              <Calendar
                mode="single"
                selected={newDate}
                onSelect={(date) => {
                  setNewDate(date);
                }}
                className="rounded-md border"
              />
            )}
            {newDate && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Selected: {newDate.toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => {
              onSkip();
              setNewDate(undefined);
            }}
            disabled={isPending}
            className="w-full sm:w-auto"
          >
            Just Skip It
          </Button>
          <Button
            onClick={handleReschedule}
            disabled={!newDate || isPending}
            className="w-full sm:w-auto"
          >
            {isPending ? 'Rescheduling...' : 'Reschedule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

