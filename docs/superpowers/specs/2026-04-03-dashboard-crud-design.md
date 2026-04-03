# Dashboard CRUD Features Design Spec

**Goal:** Add full task and goal management to the GrindProof dashboard — create, edit, delete, reschedule, link tasks to goals, and view tasks by week.

**Architecture:** Enhance existing dashboard components. No new pages or routes. All interactions stay on `/dashboard`. Uses existing UI primitives (dialog, select, calendar, input, textarea, badge). Backend tRPC mutations already exist for all operations — this is purely a frontend buildout.

**Tech Stack:** React 19, Tailwind CSS, Radix UI (via shadcn), tRPC client mutations

---

## 1. Enhanced AddTaskForm

**File:** `src/components/AddTaskForm.tsx`

**Current state:** Title-only input, always defaults due date to today. No priority, description, goal, or date picker.

**New behavior:**

- Default state unchanged: title input + "Add" button for fast task creation
- Below the title input: a "More options" text link
- Clicking "More options" expands to reveal additional fields:
  - **Priority** — `<Select>` dropdown: High / Medium / Low. Default: Medium
  - **Due date** — Date picker using existing `calendar.tsx`. Default: today
  - **Goal** — `<Select>` dropdown populated from `useTaskContext().goals` (active goals only). Options: "No goal" (default) + goal titles. Passes `goalId` to `task.create`
  - **Description** — `<Textarea>` for optional notes
- Submit: Enter key or "Add" button. Submits with all filled fields. Unfilled optional fields use defaults.
- Escape: collapses expanded section, keeps title value
- After successful create: all fields reset, expanded section collapses
- Tags: deferred to post-MVP

---

## 2. TaskItem with Three-Dot Menu

**File:** `src/components/TaskItem.tsx`

**Current state:** Checkbox + title + priority badge + date label. Can toggle complete/uncomplete. No edit, delete, or other actions.

**New behavior:**

- Layout: checkbox | title | priority badge | due date | `...` button
- `...` button opens a dropdown menu (Radix `DropdownMenu` or custom) with these actions:

### Edit
- Switches TaskItem to inline edit mode
- Title becomes an editable `<Input>`
- Below the title row: priority select, date picker, goal select, description textarea (same fields as AddTaskForm expanded)
- Save / Cancel buttons
- Save calls `task.update` with changed fields
- Cancel restores original values

### Reschedule
- Opens a small date picker popover
- Selecting a date calls `task.update` with the new `dueDate`

### Move to Goal
- Opens a select popover listing active goals + "Remove from goal" option
- Selecting a goal calls `task.update` with the new `goalId`
- "Remove from goal" sets `goalId` to `null`

### Change Priority
- Submenu: High / Medium / Low
- Selecting calls `task.update` with the new `priority`

### Delete
- Shows inline confirmation: "Delete this task?" with Cancel / Delete buttons
- Delete calls `task.delete` mutation
- After delete: task list refreshes

After any action, dropdown closes and task list refreshes via `refreshTasks()`.

---

## 3. TaskList with Today/Week Toggle

**File:** `src/components/TaskList.tsx`

**Current state:** Shows only today's tasks filtered client-side. No date navigation.

**New behavior:**

- Header row: task count label on left, toggle button on right: `Today | This Week`
- State: `viewMode: "today" | "week"` (default: "today")

### Today View (default)
- Identical to current behavior
- Shows pending tasks, then completed section with count
- Header: "Today's Tasks (N)"

### Week View
- Header: "This Week (N)"
- Shows 7 days from Monday to Sunday of the current week
- Each day renders as a section:
  - Day header: `Monday, Apr 6` — today's header gets a visual accent (bold text or colored dot)
  - Under the header: that day's tasks using `TaskItem` component
  - Days with no tasks: subtle "No tasks" text (not the full empty state card)
- `AddTaskForm` appears at the bottom of today's day section only
- Empty state for entire week: "No tasks this week. Add one below."

### Filtering
- All tasks come from `useTaskContext().tasks` (already fetched via `task.getAll`)
- Today view: filter where `dueDate` is today (existing logic)
- Week view: filter where `dueDate` falls within Monday-Sunday of current week, group by day

---

## 4. Goal Management

### GoalList Changes

**File:** `src/components/GoalList.tsx`

**Current state:** Read-only. Shows active goals with completed/total count. Returns `null` if no goals.

**New behavior:**

- Always renders, even with 0 goals
- Empty state: "No goals yet. Create one to organize your tasks."
- Header: "Goals (N)" on left, "+ Add Goal" button on right
- Each goal row:
  - Left: goal title (clickable — opens Goal Detail Modal)
  - Center: small progress bar showing completed/total
  - Right: `...` menu with Edit (opens modal in edit mode) and Delete (with confirmation)
- Collapsible section behavior preserved (expand/collapse toggle)

### AddGoalForm

**New file:** `src/components/AddGoalForm.tsx`

- Triggered by "+ Add Goal" button in GoalList header
- Expands inline below header (same pattern as AddTaskForm)
- Fields:
  - Title — `<Input>` (required)
  - Description — `<Textarea>` (optional)
  - Priority — `<Select>`: High / Medium / Low (default: Medium)
- Save / Cancel buttons
- Save calls `goal.create` mutation, then `refreshGoals()`
- Cancel collapses form

### Goal Detail Modal

**New file:** `src/components/GoalDetailModal.tsx`

- Uses existing `dialog.tsx` component
- Opened by: clicking a goal title in GoalList, or "Edit" from goal's `...` menu

**Read mode (default):**
- Header: goal title + status badge (active/completed)
- Body:
  - Description paragraph (if set)
  - Priority badge
  - Linked tasks section: list of tasks where `goalId === goal.id`, rendered as `TaskItem` components
  - Summary: "X/Y tasks completed"
- Footer: Edit button, Delete button (with confirmation), Close button

**Edit mode:**
- Triggered by Edit button or "Edit" from `...` menu
- Title becomes `<Input>`, description becomes `<Textarea>`, priority becomes `<Select>`, status becomes `<Select>` (active/completed)
- Save / Cancel buttons
- Save calls `goal.update` mutation, then `refreshGoals()`
- Cancel returns to read mode

**Delete:**
- Confirmation dialog: "Delete this goal? Tasks linked to it will be unlinked."
- Calls `goal.delete` mutation
- After delete: modal closes, goal list refreshes

---

## 5. Task-to-Goal Linking

### At Creation
- AddTaskForm expanded options include a "Goal" `<Select>` dropdown
- Options: "No goal" (default) + active goals listed by title
- Selected goal's ID passed as `goalId` to `task.create`

### After Creation (Three-Dot Menu)
- "Move to Goal" option in TaskItem dropdown
- Opens a select popover with active goals + "Remove from goal"
- Selecting a goal: calls `task.update` with `goalId`
- "Remove from goal": calls `task.update` with `goalId: null`

---

## 6. Components Summary

| Component | Action | Status |
|-----------|--------|--------|
| `AddTaskForm.tsx` | Modify | Add expandable options (priority, date, goal, description) |
| `TaskItem.tsx` | Modify | Add three-dot menu with edit/delete/reschedule/priority/goal actions |
| `TaskList.tsx` | Modify | Add Today/Week toggle, week view with day grouping |
| `GoalList.tsx` | Modify | Add "+ Add Goal" button, clickable goals, `...` menu, empty state |
| `AddGoalForm.tsx` | Create | Inline goal creation form |
| `GoalDetailModal.tsx` | Create | Modal with read/edit modes, linked tasks, delete |

**No new pages or routes.** Everything lives on `/dashboard`.

**No backend changes needed.** All tRPC mutations (`task.create`, `task.update`, `task.delete`, `task.reschedule`, `goal.create`, `goal.update`, `goal.delete`) already exist with the required parameters.

---

## 7. Out of Scope

- Tags (post-MVP)
- Drag-to-reorder tasks
- Task search
- Recurring tasks UI
- Start/end time fields
- Bulk operations
- Task history / activity log
- Notification settings UI
