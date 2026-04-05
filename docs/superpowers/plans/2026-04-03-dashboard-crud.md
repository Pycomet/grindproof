# Dashboard CRUD Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add full task and goal management to the GrindProof dashboard — create, edit, delete, reschedule, link tasks to goals, and view tasks by week.

**Architecture:** Enhance existing dashboard components on `/dashboard`. No new pages or routes. Uses existing UI primitives (dialog, select, calendar, input, textarea, badge, button) plus two new shadcn components (dropdown-menu, popover). All backend tRPC mutations already exist — this is purely a frontend buildout.

**Tech Stack:** React 19, Tailwind CSS, Radix UI (shadcn), tRPC client mutations, lucide-react icons

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/ui/dropdown-menu.tsx` | Create (shadcn) | Radix DropdownMenu primitive wrapper |
| `src/components/ui/popover.tsx` | Create (shadcn) | Radix Popover primitive wrapper |
| `src/components/AddTaskForm.tsx` | Modify | Add expandable options: priority, due date, goal, description |
| `src/components/TaskItem.tsx` | Modify | Add three-dot dropdown menu with edit/delete/reschedule/priority/goal actions |
| `src/components/TaskList.tsx` | Modify | Add Today/Week toggle, week view with day grouping |
| `src/components/GoalList.tsx` | Modify | Add "+ Add Goal" button, clickable goals, three-dot menu, empty state |
| `src/components/AddGoalForm.tsx` | Create | Inline goal creation form |
| `src/components/GoalDetailModal.tsx` | Create | Modal with read/edit modes, linked tasks, delete confirmation |
| `src/app/dashboard/page.tsx` | Modify | Remove hardcoded "Today's Tasks" heading (TaskList now owns its header) |

---

### Task 1: Add shadcn DropdownMenu and Popover components

**Files:**
- Create: `src/components/ui/dropdown-menu.tsx`
- Create: `src/components/ui/popover.tsx`

These are prerequisites for TaskItem's three-dot menu and date picker popovers.

- [ ] **Step 1: Install Radix dependencies**

Run:
```bash
npx shadcn@latest add dropdown-menu popover
```

If the interactive CLI causes issues, install the packages manually:

```bash
npm install @radix-ui/react-dropdown-menu @radix-ui/react-popover --legacy-peer-deps
```

Then create the component files in step 2 and 3.

- [ ] **Step 2: Verify dropdown-menu.tsx was created**

Run:
```bash
ls -la src/components/ui/dropdown-menu.tsx src/components/ui/popover.tsx
```

Expected: Both files exist. If the shadcn CLI created them, skip to step 4.

- [ ] **Step 3: Create components manually if shadcn CLI didn't work**

If the files weren't created by the CLI, fetch the latest component source from the shadcn docs:
- `dropdown-menu.tsx`: https://ui.shadcn.com/docs/components/dropdown-menu
- `popover.tsx`: https://ui.shadcn.com/docs/components/popover

Create each file following the existing project pattern (function components, `cn()` utility from `@/lib/utils`, `data-slot` attributes). The existing `select.tsx` and `dialog.tsx` files are good references for the pattern.

- [ ] **Step 4: Verify the build compiles**

Run:
```bash
npx next build --no-lint 2>&1 | tail -20
```

Expected: Build succeeds (or at least no errors from the new UI components).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/dropdown-menu.tsx src/components/ui/popover.tsx package.json package-lock.json
git commit -m "feat: add shadcn dropdown-menu and popover components"
```

---

### Task 2: Enhanced AddTaskForm with expandable options

**Files:**
- Modify: `src/components/AddTaskForm.tsx`

**Current state:** Title-only input, hardcodes `dueDate: new Date()`. No priority, description, goal, or date picker.

**Context:** `useTaskContext()` provides `goals` array with `{ id, title, status }`. The `task.create` mutation accepts `{ title, description?, dueDate?, priority?, goalId?, tags? }`. Active goals are those where `status === "active"`.

- [ ] **Step 1: Add state for expanded mode and form fields**

In `src/components/AddTaskForm.tsx`, add these state variables inside the `AddTaskForm` component, after the existing `title` and `isOpen` state:

```tsx
const [expanded, setExpanded] = useState(false);
const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
const [dueDate, setDueDate] = useState<Date>(new Date());
const [goalId, setGoalId] = useState<string>("");
const [description, setDescription] = useState("");
```

Add `goals` to the destructured `useTaskContext()`:

```tsx
const { refreshTasks, goals } = useTaskContext();
```

Add these imports at the top:

```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
```

- [ ] **Step 2: Update the submit handler to include all fields**

Replace the `handleSubmit` function:

```tsx
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
```

Update the `onSuccess` callback to reset all fields:

```tsx
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
```

- [ ] **Step 3: Add the expanded options UI below the title input**

Replace the entire `return` block for the `isOpen === true` case (the form). The new form keeps the same title input + Add button row, and adds "More options" toggle + expanded fields below:

```tsx
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
```

- [ ] **Step 4: Verify the build compiles**

Run:
```bash
npx next build --no-lint 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/AddTaskForm.tsx
git commit -m "feat: add expandable options to AddTaskForm (priority, date, goal, description)"
```

---

### Task 3: TaskItem with three-dot dropdown menu

**Files:**
- Modify: `src/components/TaskItem.tsx`

**Current state:** Checkbox + title + priority badge + date. Can toggle complete/uncomplete. No edit, delete, or other actions.

**Context:** The `TaskItemProps.task` interface already has `id`, `title`, `priority`, `status`, `dueDate`, `goalId`. The tRPC mutations `task.update`, `task.delete`, `task.reschedule` all exist. `useTaskContext()` provides `goals` and `refreshTasks()`.

- [ ] **Step 1: Add imports and state for the dropdown and edit mode**

Add these imports at the top of `src/components/TaskItem.tsx`:

```tsx
import { useState } from "react";
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
```

Add `description` and `tags` to the `TaskItemProps.task` interface:

```tsx
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
```

- [ ] **Step 2: Add state variables and additional mutations**

Inside the `TaskItem` component, after the existing mutations, add:

```tsx
const { refreshTasks, goals } = useTaskContext();

const deleteMutation = trpc.task.delete.useMutation({
  onSuccess: () => refreshTasks(),
});

const [isEditing, setIsEditing] = useState(false);
const [editTitle, setEditTitle] = useState(task.title);
const [editPriority, setEditPriority] = useState(task.priority);
const [editDueDate, setEditDueDate] = useState<Date | null>(task.dueDate ? new Date(task.dueDate) : null);
const [editGoalId, setEditGoalId] = useState(task.goalId || "");
const [editDescription, setEditDescription] = useState(task.description || "");
const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
```

Remove the duplicate `const { refreshTasks } = useTaskContext();` that's already at the top — replace it with the destructured version above that also gets `goals`.

- [ ] **Step 3: Add edit mode save/cancel handlers**

Add these handlers after the state variables:

```tsx
const handleSaveEdit = () => {
  updateMutation.mutate({
    id: task.id,
    title: editTitle.trim(),
    priority: editPriority,
    dueDate: editDueDate,
    goalId: editGoalId || null,
    description: editDescription.trim() || null,
  });
  setIsEditing(false);
};

const handleCancelEdit = () => {
  setEditTitle(task.title);
  setEditPriority(task.priority);
  setEditDueDate(task.dueDate ? new Date(task.dueDate) : null);
  setEditGoalId(task.goalId || "");
  setEditDescription(task.description || "");
  setIsEditing(false);
};

const handleDelete = () => {
  deleteMutation.mutate({ id: task.id });
  setShowDeleteConfirm(false);
};
```

- [ ] **Step 4: Add inline edit mode render**

Replace the component's return statement with this conditional render. When `isEditing` is true, show the edit form:

```tsx
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
            <SelectItem value="">No goal</SelectItem>
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
```

- [ ] **Step 5: Add the three-dot menu to the normal (non-editing) view**

Replace the existing return JSX with the following. Key changes: adds `...` button at the end, delete confirmation inline, and dropdown menu with Edit, Reschedule, Move to Goal, Change Priority, Delete:

```tsx
return (
  <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
    <button
      onClick={handleToggle}
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
          <DropdownMenuItem onClick={() => setIsEditing(true)}>
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
                    if (d) updateMutation.mutate({ id: task.id, dueDate: d });
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
                Remove from goal
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {goals.filter((g) => g.status === "active").map((g) => (
                <DropdownMenuItem key={g.id} onClick={() => updateMutation.mutate({ id: task.id, goalId: g.id })}>
                  {g.title}
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
```

- [ ] **Step 6: Verify the build compiles**

Run:
```bash
npx next build --no-lint 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/components/TaskItem.tsx
git commit -m "feat: add three-dot menu to TaskItem (edit, delete, reschedule, priority, goal)"
```

---

### Task 4: TaskList with Today/Week toggle

**Files:**
- Modify: `src/components/TaskList.tsx`
- Modify: `src/app/dashboard/page.tsx`

**Current state:** Shows only today's tasks. No date navigation. Dashboard page has hardcoded "Today's Tasks" heading above the TaskList.

**Context:** All tasks are already available via `useTaskContext().tasks`. Week view filters tasks where `dueDate` falls within Monday-Sunday of the current week, grouped by day.

- [ ] **Step 1: Add state and week date utilities to TaskList**

In `src/components/TaskList.tsx`, add the `useState` import and view mode state:

```tsx
import { useState } from "react";
import { useTaskContext } from "@/contexts/TaskContext";
import { TaskItem } from "./TaskItem";
import { AddTaskForm } from "./AddTaskForm";
```

Inside the `TaskList` component, add the view mode state and week calculation:

```tsx
const [viewMode, setViewMode] = useState<"today" | "week">("today");

// Current week: Monday to Sunday
const getWeekBounds = () => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7); // exclusive end
  return { monday, sunday };
};

const { monday, sunday } = getWeekBounds();
```

- [ ] **Step 2: Add week view filtering and grouping logic**

After the existing `pendingTasks` and `completedTasks` variables, add:

```tsx
// Week view: filter and group by day
const weekTasks = tasks.filter((t) => {
  if (!t.dueDate) return false;
  const due = new Date(t.dueDate);
  return due >= monday && due < sunday;
});

const weekDays: { date: Date; tasks: typeof tasks }[] = [];
for (let i = 0; i < 7; i++) {
  const dayStart = new Date(monday);
  dayStart.setDate(monday.getDate() + i);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayStart.getDate() + 1);

  weekDays.push({
    date: new Date(dayStart),
    tasks: weekTasks.filter((t) => {
      const due = new Date(t.dueDate!);
      return due >= dayStart && due < dayEnd;
    }),
  });
}

const isToday = (date: Date) => {
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
};

const formatDayHeader = (date: Date) =>
  date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
```

- [ ] **Step 3: Add header with toggle and week view render**

Replace the entire return statement with:

```tsx
if (isLoading) {
  return (
    <div className="space-y-2">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
        />
      ))}
    </div>
  );
}

return (
  <div className="space-y-2">
    {/* Header with toggle */}
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        {viewMode === "today"
          ? `Today's Tasks (${todayTasks.length})`
          : `This Week (${weekTasks.length})`}
      </h2>
      <div className="flex rounded-md border border-zinc-200 dark:border-zinc-700">
        <button
          onClick={() => setViewMode("today")}
          className={`px-3 py-1 text-xs font-medium transition-colors ${
            viewMode === "today"
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          } rounded-l-md`}
        >
          Today
        </button>
        <button
          onClick={() => setViewMode("week")}
          className={`px-3 py-1 text-xs font-medium transition-colors ${
            viewMode === "week"
              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
              : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          } rounded-r-md`}
        >
          Week
        </button>
      </div>
    </div>

    {/* Today view */}
    {viewMode === "today" && (
      <>
        {todayTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No tasks for today. Add one below.
          </div>
        ) : (
          <>
            {pendingTasks.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
            {completedTasks.length > 0 && (
              <>
                <div className="pt-2 text-xs font-medium text-zinc-400">
                  Completed ({completedTasks.length})
                </div>
                {completedTasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </>
            )}
          </>
        )}
        <div className="mt-2">
          <AddTaskForm />
        </div>
      </>
    )}

    {/* Week view */}
    {viewMode === "week" && (
      <>
        {weekTasks.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            No tasks this week. Add one below.
          </div>
        ) : (
          weekDays.map(({ date, tasks: dayTasks }) => (
            <div key={date.toISOString()}>
              <div
                className={`py-1 text-xs font-medium ${
                  isToday(date)
                    ? "text-zinc-900 dark:text-zinc-50"
                    : "text-zinc-400"
                }`}
              >
                {isToday(date) && (
                  <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-zinc-900 dark:bg-zinc-50" />
                )}
                {formatDayHeader(date)}
              </div>
              {dayTasks.length === 0 ? (
                <div className="py-2 text-xs text-zinc-400">No tasks</div>
              ) : (
                <div className="space-y-1">
                  {dayTasks.map((task) => (
                    <TaskItem key={task.id} task={task} />
                  ))}
                </div>
              )}
              {isToday(date) && (
                <div className="mt-1">
                  <AddTaskForm />
                </div>
              )}
            </div>
          ))
        )}
      </>
    )}
  </div>
);
```

- [ ] **Step 4: Update dashboard page to remove hardcoded heading and AddTaskForm**

In `src/app/dashboard/page.tsx`, the `DashboardContent` function currently wraps TaskList with a heading and an AddTaskForm below it. Since TaskList now owns its header and embeds AddTaskForm, simplify this section.

Replace this block in `DashboardContent`:

```tsx
<div>
  <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
    Today&apos;s Tasks
  </h2>
  <TaskList />
  <div className="mt-2">
    <AddTaskForm />
  </div>
</div>
```

With:

```tsx
<TaskList />
```

Remove the `AddTaskForm` import from the dashboard page since it's no longer used there directly:

```tsx
// Remove this line:
import { AddTaskForm } from "@/components/AddTaskForm";
```

- [ ] **Step 5: Verify the build compiles**

Run:
```bash
npx next build --no-lint 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/components/TaskList.tsx src/app/dashboard/page.tsx
git commit -m "feat: add Today/Week toggle to TaskList with day grouping"
```

---

### Task 5: AddGoalForm component

**Files:**
- Create: `src/components/AddGoalForm.tsx`

**Context:** The `goal.create` mutation accepts `{ title, description?, priority?, status? }`. `useTaskContext()` provides `refreshGoals()`.

- [ ] **Step 1: Create AddGoalForm component**

Create `src/components/AddGoalForm.tsx`:

```tsx
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
```

- [ ] **Step 2: Verify the build compiles**

Run:
```bash
npx next build --no-lint 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/AddGoalForm.tsx
git commit -m "feat: create AddGoalForm component"
```

---

### Task 6: GoalDetailModal component

**Files:**
- Create: `src/components/GoalDetailModal.tsx`

**Context:** Uses the existing `dialog.tsx` primitives. Shows a goal's details, linked tasks, and allows editing/deleting. The `goal.update` mutation accepts `{ id, title?, description?, status?, priority? }`. The `goal.delete` mutation accepts `{ id }`. `useTaskContext()` provides `tasks`, `goals`, `refreshGoals()`, `refreshTasks()`.

- [ ] **Step 1: Create GoalDetailModal component**

Create `src/components/GoalDetailModal.tsx`:

```tsx
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
    onSuccess: () => {
      refreshGoals();
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

  // Sync state when goal changes (e.g., after a linked task update)
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
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
                <Button variant="destructive" size="sm" onClick={() => setShowDeleteConfirm(true)}>Delete</Button>
              </>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run:
```bash
npx next build --no-lint 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/GoalDetailModal.tsx
git commit -m "feat: create GoalDetailModal with read/edit modes and linked tasks"
```

---

### Task 7: Enhanced GoalList with add button, clickable goals, and three-dot menu

**Files:**
- Modify: `src/components/GoalList.tsx`

**Current state:** Read-only. Returns `null` if no goals or loading. Shows active goals with completed/total count. No add, edit, or delete actions.

**Context:** `AddGoalForm` and `GoalDetailModal` were created in Tasks 5 and 6. This task wires them into GoalList.

- [ ] **Step 1: Rewrite GoalList with full management features**

Replace the entire contents of `src/components/GoalList.tsx`:

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useTaskContext } from "@/contexts/TaskContext";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { AddGoalForm } from "./AddGoalForm";
import { GoalDetailModal } from "./GoalDetailModal";

export function GoalList() {
  const { goals, tasks, isLoading, refreshGoals, refreshTasks } = useTaskContext();
  const [collapsed, setCollapsed] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const deleteMutation = trpc.goal.delete.useMutation({
    onSuccess: () => {
      refreshGoals();
      refreshTasks();
      setDeleteConfirmId(null);
    },
  });

  const activeGoals = goals.filter((g) => g.status === "active");

  if (isLoading) return null;

  return (
    <div>
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center gap-1 text-sm font-semibold text-zinc-900 dark:text-zinc-50"
        >
          <span>Goals ({activeGoals.length})</span>
          <span className="text-zinc-400">{collapsed ? "+" : "-"}</span>
        </button>
        <button
          onClick={() => { setShowAddForm(true); setCollapsed(false); }}
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
        >
          + Add Goal
        </button>
      </div>

      {!collapsed && (
        <div className="space-y-2">
          {showAddForm && (
            <AddGoalForm onClose={() => setShowAddForm(false)} />
          )}

          {activeGoals.length === 0 && !showAddForm && (
            <div className="rounded-lg border border-dashed border-zinc-300 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700">
              No goals yet. Create one to organize your tasks.
            </div>
          )}

          {activeGoals.map((goal) => {
            const goalTasks = tasks.filter((t) => t.goalId === goal.id);
            const completed = goalTasks.filter((t) => t.status === "completed").length;
            const total = goalTasks.length;
            const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;

            return (
              <div
                key={goal.id}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                {/* Clickable title */}
                <button
                  onClick={() => setSelectedGoalId(goal.id)}
                  className="flex-1 text-left text-sm text-zinc-900 hover:underline dark:text-zinc-50"
                >
                  {goal.title}
                </button>

                {/* Progress bar */}
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-16 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
                    <div
                      className="h-full rounded-full bg-zinc-900 transition-all dark:bg-zinc-50"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <span className="text-xs text-zinc-500">
                    {completed}/{total}
                  </span>
                </div>

                {/* Delete confirmation inline */}
                {deleteConfirmId === goal.id ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500">Delete?</span>
                    <Button variant="outline" size="sm" className="h-6 text-xs" onClick={() => setDeleteConfirmId(null)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" size="sm" className="h-6 text-xs" onClick={() => deleteMutation.mutate({ id: goal.id })}>
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
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditGoalId(goal.id)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => setDeleteConfirmId(goal.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Goal Detail Modal — view mode */}
      {selectedGoalId && (
        <GoalDetailModal
          goalId={selectedGoalId}
          open={!!selectedGoalId}
          onOpenChange={(open) => { if (!open) setSelectedGoalId(null); }}
        />
      )}

      {/* Goal Detail Modal — edit mode */}
      {editGoalId && (
        <GoalDetailModal
          goalId={editGoalId}
          open={!!editGoalId}
          onOpenChange={(open) => { if (!open) setEditGoalId(null); }}
          initialEditMode
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the build compiles**

Run:
```bash
npx next build --no-lint 2>&1 | tail -20
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/components/GoalList.tsx
git commit -m "feat: enhance GoalList with add button, clickable goals, three-dot menu, empty state"
```

---

### Task 8: Final integration verification

**Files:**
- No file changes — verification only

- [ ] **Step 1: Run the full build**

```bash
npx next build --no-lint 2>&1 | tail -30
```

Expected: Build succeeds with no errors.

- [ ] **Step 2: Run the test suite**

```bash
npx vitest run 2>&1 | tail -30
```

Expected: All existing tests pass. (No new tests are added in this plan — the components are pure frontend with no complex logic to unit test.)

- [ ] **Step 3: Manual smoke test checklist**

Start the dev server and verify on `/dashboard`:

```bash
npm run dev
```

1. **AddTaskForm:** Click "+ Add task", type a title, click "More options", verify priority/date/goal/description fields appear. Add a task with options. Verify it appears in the list.
2. **TaskItem three-dot menu:** Click `...` on a task. Verify Edit, Reschedule, Move to Goal, Change Priority, Delete options appear. Test each action.
3. **TaskList toggle:** Click "Week" button. Verify tasks are grouped by day (Monday-Sunday). Click "Today" to go back.
4. **GoalList:** Click "+ Add Goal". Create a goal. Verify it appears. Click the goal title — verify modal opens. Click `...` → Edit. Click `...` → Delete with confirmation.
5. **Task-Goal linking:** Create a task with a goal selected. Open the goal modal — verify the task appears under "Linked Tasks". Use three-dot menu → "Move to Goal" to reassign.

- [ ] **Step 4: Commit any fixes from smoke testing**

If any issues are found during smoke testing, fix them and commit:

```bash
git add -u
git commit -m "fix: address issues found during dashboard CRUD smoke testing"
```
