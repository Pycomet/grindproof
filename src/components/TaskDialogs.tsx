'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';

// Helper function to format date for datetime-local input (in local timezone)
function formatDateTimeLocal(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

interface TaskFormData {
  title: string;
  description: string;
  dueDate: Date | undefined;
  startTime: Date | undefined;
  endTime: Date | undefined;
  reminders: string[];
  priority: 'high' | 'medium' | 'low';
  goalId: string;
  tags: string[];
  syncWithCalendar: boolean;
  recurrenceRule?: string;
  recurringEventId?: string;
  completionProof?: string;
}

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TaskFormData) => void;
  isPending: boolean;
  goals?: Array<{ id: string; title: string }>;
  initialGoalId?: string;
  isCalendarConnected?: boolean;
}

export function CreateTaskDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  goals = [],
  initialGoalId,
  isCalendarConnected = false,
}: CreateTaskDialogProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    dueDate: undefined,
    startTime: undefined,
    endTime: undefined,
    reminders: [],
    priority: 'medium',
    goalId: initialGoalId || '',
    tags: [],
    syncWithCalendar: true,
    recurrenceRule: undefined,
    recurringEventId: undefined,
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [hasSchedule, setHasSchedule] = useState(false);
  const [tagInput, setTagInput] = useState('');

  const handleSubmit = () => {
    onSubmit(formData);
    // Reset form
    setFormData({
      title: '',
      description: '',
      dueDate: undefined,
      startTime: undefined,
      endTime: undefined,
      reminders: [],
      priority: 'medium',
      goalId: initialGoalId || '',
      tags: [],
      syncWithCalendar: true,
      recurrenceRule: undefined,
      recurringEventId: undefined,
    });
    setTagInput('');
    setHasSchedule(false);
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] md:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription>
            Add a new task to your list. Optionally sync with Google Calendar.
          </DialogDescription>
        </DialogHeader>
        <motion.div 
          className="space-y-4 py-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="space-y-2" variants={itemVariants}>
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Complete project report"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </motion.div>

          <motion.div className="space-y-2" variants={itemVariants}>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Add details about your task..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </motion.div>

          <motion.div className="space-y-2" variants={itemVariants}>
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
          </motion.div>

          <motion.div className="space-y-2" variants={itemVariants}>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="hasSchedule"
                checked={hasSchedule}
                onChange={(e) => {
                  setHasSchedule(e.target.checked);
                  if (!e.target.checked) {
                    setFormData({ ...formData, startTime: undefined, endTime: undefined });
                  }
                }}
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
              />
              <Label htmlFor="hasSchedule" className="font-normal">
                Schedule specific time block
              </Label>
            </div>
            {hasSchedule && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Start Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.startTime ? formatDateTimeLocal(formData.startTime) : ''}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value ? new Date(e.target.value) : undefined })}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">End Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.endTime ? formatDateTimeLocal(formData.endTime) : ''}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value ? new Date(e.target.value) : undefined })}
                    className="text-sm"
                  />
                </div>
              </div>
            )}
          </motion.div>

          <motion.div className="space-y-2" variants={itemVariants}>
            <Label>Reminders</Label>
            <div className="flex flex-wrap gap-2">
              {['15min', '1hour', '1day'].map((reminder) => {
                const label = reminder === '15min' ? '15 minutes' : reminder === '1hour' ? '1 hour' : '1 day';
                const isSelected = formData.reminders.includes(reminder);
                return (
                  <button
                    key={reminder}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setFormData({ ...formData, reminders: formData.reminders.filter(r => r !== reminder) });
                      } else {
                        setFormData({ ...formData, reminders: [...formData.reminders, reminder] });
                      }
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white dark:bg-blue-500'
                        : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                  >
                    🔔 {label} before
                  </button>
                );
              })}
            </div>
          </motion.div>

          <motion.div className="space-y-2" variants={itemVariants}>
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'high' | 'medium' | 'low' })}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="high">🔴 High Priority</option>
              <option value="medium">🟡 Medium Priority</option>
              <option value="low">🟢 Low Priority</option>
            </select>
          </motion.div>

          {goals.length > 0 && (
            <motion.div className="space-y-2" variants={itemVariants}>
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
            </motion.div>
          )}

          <motion.div className="space-y-2" variants={itemVariants}>
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
              {commonTags.map((tag, index) => (
                <button
                  key={`common-tag-${index}-${tag}`}
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
                {formData.tags.map((tag, index) => (
                  <span
                    key={`selected-tag-${index}-${tag}`}
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
          </motion.div>

          {isCalendarConnected && (
            <>
              <motion.div className="space-y-2" variants={itemVariants}>
                <Label htmlFor="recurrenceRule">Recurrence Rule (RRULE - Optional)</Label>
                <Input
                  id="recurrenceRule"
                  placeholder="e.g., FREQ=DAILY;INTERVAL=1 or FREQ=WEEKLY;BYDAY=MO,WE,FR"
                  value={formData.recurrenceRule || ''}
                  onChange={(e) => setFormData({ ...formData, recurrenceRule: e.target.value || undefined })}
                  className="text-sm"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Leave empty for one-time tasks. Use RRULE format for recurring tasks.
                </p>
              </motion.div>
              <motion.div className="flex items-center gap-2" variants={itemVariants}>
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
              </motion.div>
            </>
          )}
        </motion.div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setFormData({
                title: '',
                description: '',
                dueDate: undefined,
                startTime: undefined,
                endTime: undefined,
                reminders: [],
                priority: 'medium',
                goalId: initialGoalId || '',
                tags: [],
                syncWithCalendar: true,
                recurrenceRule: undefined,
                recurringEventId: undefined
              });
              setTagInput('');
              setHasSchedule(false);
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
  isCalendarConnected?: boolean;
  task: {
    id: string;
    title: string;
    description?: string | null;
    dueDate?: Date | null;
    startTime?: Date | null;
    endTime?: Date | null;
    reminders?: string[] | null;
    priority?: 'high' | 'medium' | 'low';
    goalId?: string | null;
    tags?: string[] | null;
    isSyncedWithCalendar: boolean;
    recurrenceRule?: string | null;
    recurringEventId?: string | null;
    completionProof?: string | null;
    status?: 'pending' | 'completed' | 'skipped';
  };
}

export function EditTaskDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  goals = [],
  isCalendarConnected = false,
  task,
}: EditTaskDialogProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    title: task.title,
    description: task.description || '',
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    startTime: task.startTime ? new Date(task.startTime) : undefined,
    endTime: task.endTime ? new Date(task.endTime) : undefined,
    reminders: task.reminders || [],
    priority: task.priority || 'medium',
    goalId: task.goalId || '',
    tags: task.tags || [],
    syncWithCalendar: task.isSyncedWithCalendar,
    recurrenceRule: task.recurrenceRule || undefined,
    recurringEventId: task.recurringEventId || undefined,
    completionProof: task.completionProof || undefined,
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [hasSchedule, setHasSchedule] = useState(!!(task.startTime && task.endTime));
  const [tagInput, setTagInput] = useState('');

  // Update form when task changes
  useEffect(() => {
    setFormData({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      startTime: task.startTime ? new Date(task.startTime) : undefined,
      endTime: task.endTime ? new Date(task.endTime) : undefined,
      reminders: task.reminders || [],
      priority: task.priority || 'medium',
      goalId: task.goalId || '',
      tags: task.tags || [],
      syncWithCalendar: task.isSyncedWithCalendar,
      recurrenceRule: task.recurrenceRule || undefined,
      recurringEventId: task.recurringEventId || undefined,
      completionProof: task.completionProof || undefined,
    });
    setHasSchedule(!!(task.startTime && task.endTime));
  }, [task]);

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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] md:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
          <DialogDescription>Update task details</DialogDescription>
        </DialogHeader>
        <motion.div 
          className="space-y-4 py-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="space-y-2" variants={itemVariants}>
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="What needs to be done?"
              autoFocus
            />
          </motion.div>

          <motion.div className="space-y-2" variants={itemVariants}>
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add more details..."
              rows={3}
            />
          </motion.div>

          <motion.div className="space-y-2" variants={itemVariants}>
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
        </motion.div>

        <motion.div className="space-y-2" variants={itemVariants}>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="edit-hasSchedule"
                checked={hasSchedule}
                onChange={(e) => {
                  setHasSchedule(e.target.checked);
                  if (!e.target.checked) {
                    setFormData({ ...formData, startTime: undefined, endTime: undefined });
                  }
                }}
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-700"
              />
              <Label htmlFor="edit-hasSchedule" className="font-normal">
                Schedule specific time block
              </Label>
            </div>
            {hasSchedule && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Start Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.startTime ? formatDateTimeLocal(formData.startTime) : ''}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value ? new Date(e.target.value) : undefined })}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">End Time</Label>
                  <Input
                    type="datetime-local"
                    value={formData.endTime ? formatDateTimeLocal(formData.endTime) : ''}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value ? new Date(e.target.value) : undefined })}
                    className="text-sm"
                  />
                </div>
              </div>
            )}
          </motion.div>

          <motion.div className="space-y-2" variants={itemVariants}>
            <Label>Reminders</Label>
            <div className="flex flex-wrap gap-2">
              {['15min', '1hour', '1day'].map((reminder) => {
                const label = reminder === '15min' ? '15 minutes' : reminder === '1hour' ? '1 hour' : '1 day';
                const isSelected = formData.reminders.includes(reminder);
                return (
                  <button
                    key={reminder}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setFormData({ ...formData, reminders: formData.reminders.filter(r => r !== reminder) });
                      } else {
                        setFormData({ ...formData, reminders: [...formData.reminders, reminder] });
                      }
                    }}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white dark:bg-blue-500'
                        : 'border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                  >
                    🔔 {label} before
                  </button>
                );
              })}
            </div>
          </motion.div>

          <motion.div className="space-y-2" variants={itemVariants}>
            <Label htmlFor="edit-priority">Priority</Label>
            <select
              id="edit-priority"
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'high' | 'medium' | 'low' })}
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              <option value="high">🔴 High Priority</option>
              <option value="medium">🟡 Medium Priority</option>
              <option value="low">🟢 Low Priority</option>
            </select>
          </motion.div>

          {goals.length > 0 && (
            <motion.div className="space-y-2" variants={itemVariants}>
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
            </motion.div>
          )}

          <motion.div className="space-y-2" variants={itemVariants}>
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
              {commonTags.map((tag, index) => (
                <button
                  key={`edit-common-tag-${index}-${tag}`}
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
                {formData.tags.map((tag, index) => (
                  <span
                    key={`edit-selected-tag-${index}-${tag}`}
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
            </motion.div>

            {isCalendarConnected && (
              <>
                <motion.div className="space-y-2" variants={itemVariants}>
                  <Label htmlFor="edit-recurrenceRule">Recurrence Rule (RRULE - Optional)</Label>
                  <Input
                    id="edit-recurrenceRule"
                    placeholder="e.g., FREQ=DAILY;INTERVAL=1 or FREQ=WEEKLY;BYDAY=MO,WE,FR"
                    value={formData.recurrenceRule || ''}
                    onChange={(e) => setFormData({ ...formData, recurrenceRule: e.target.value || undefined })}
                    className="text-sm"
                  />
                  {formData.recurringEventId && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Series ID: {formData.recurringEventId}
                    </p>
                  )}
                </motion.div>
                <motion.div className="flex items-center gap-2" variants={itemVariants}>
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
                </motion.div>
              </>
            )}
            
            {task.status === 'completed' && (
              <motion.div className="space-y-2" variants={itemVariants}>
                <Label htmlFor="completionProof">Proof of Completion</Label>
                <Textarea
                  id="completionProof"
                  placeholder="Add or update proof of completion..."
                  value={formData.completionProof || ''}
                  onChange={(e) => setFormData({ ...formData, completionProof: e.target.value || undefined })}
                  rows={3}
                  className="text-sm"
                />
              </motion.div>
            )}
          </motion.div>
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

interface RecurringTaskEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditSingle: () => void;
  onEditAll: () => void;
  taskTitle: string;
}

export function RecurringTaskEditDialog({
  open,
  onOpenChange,
  onEditSingle,
  onEditAll,
  taskTitle,
}: RecurringTaskEditDialogProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] md:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Recurring Task</DialogTitle>
          <DialogDescription>
            This is a recurring event. Choose how you want to apply your changes.
          </DialogDescription>
        </DialogHeader>
        <motion.div 
          className="space-y-4 py-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <p className="text-sm text-zinc-700 dark:text-zinc-300">
              Task: <span className="font-medium">{taskTitle}</span>
            </p>
          </motion.div>

          <motion.div className="space-y-2" variants={itemVariants}>
            <Button
              onClick={() => {
                onEditSingle();
                onOpenChange(false);
              }}
              className="w-full justify-start"
              variant="outline"
            >
              <div className="flex flex-col items-start text-left">
                <span className="font-medium">This event only</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Only modify this instance of the recurring task
                </span>
              </div>
            </Button>

            <Button
              onClick={() => {
                onEditAll();
                onOpenChange(false);
              }}
              className="w-full justify-start"
              variant="outline"
            >
              <div className="flex flex-col items-start text-left">
                <span className="font-medium">All events in the series</span>
                <span className="text-xs text-zinc-500 dark:text-zinc-400">
                  Apply changes to all recurring instances
                </span>
              </div>
            </Button>
          </motion.div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
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

