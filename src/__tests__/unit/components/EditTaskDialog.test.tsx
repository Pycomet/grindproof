import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { EditTaskDialog } from '@/components/TaskDialogs';

describe('EditTaskDialog', () => {
  const mockOnSubmit = vi.fn();
  const mockOnOpenChange = vi.fn();
  
  const mockTask = {
    id: 'task-1',
    title: 'Test Task',
    description: 'Test Description',
    dueDate: new Date('2024-12-31'),
    goalId: 'goal-1',
    tags: ['work', 'urgent'],
    isSyncedWithCalendar: true,
  };

  const mockGoals = [
    { id: 'goal-1', title: 'Goal 1' },
    { id: 'goal-2', title: 'Goal 2' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with task data pre-filled', () => {
    render(
      <EditTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
        goals={mockGoals}
        task={mockTask}
      />
    );

    expect(screen.getByDisplayValue('Test Task')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
    // Tags appear multiple times (in tag list), so use getAllByText
    expect(screen.getAllByText('work').length).toBeGreaterThan(0);
    expect(screen.getAllByText('urgent').length).toBeGreaterThan(0);
  });

  it('allows editing title', () => {
    render(
      <EditTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
        goals={mockGoals}
        task={mockTask}
      />
    );

    const titleInput = screen.getByDisplayValue('Test Task');
    fireEvent.change(titleInput, { target: { value: 'Updated Task' } });

    expect(screen.getByDisplayValue('Updated Task')).toBeInTheDocument();
  });

  it('allows editing description', () => {
    render(
      <EditTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
        goals={mockGoals}
        task={mockTask}
      />
    );

    const descriptionInput = screen.getByDisplayValue('Test Description');
    fireEvent.change(descriptionInput, { target: { value: 'Updated Description' } });

    expect(screen.getByDisplayValue('Updated Description')).toBeInTheDocument();
  });

  it('allows adding tags', () => {
    render(
      <EditTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
        goals={mockGoals}
        task={mockTask}
      />
    );

    const tagInput = screen.getByPlaceholderText('Add a tag...');
    const addButton = screen.getByRole('button', { name: /add/i });

    fireEvent.change(tagInput, { target: { value: 'new-tag' } });
    fireEvent.click(addButton);

    expect(screen.getByText('new-tag')).toBeInTheDocument();
  });

  it('allows removing tags', () => {
    render(
      <EditTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
        goals={mockGoals}
        task={mockTask}
      />
    );

    const workTagRemoveButton = screen.getAllByText('×')[0];
    fireEvent.click(workTagRemoveButton);

    // Tag should be removed (though still in common tags)
    const workTags = screen.getAllByText('work');
    // Only the common tag button should remain
    expect(workTags.length).toBe(1);
  });

  it('allows selecting a goal', () => {
    render(
      <EditTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
        goals={mockGoals}
        task={mockTask}
      />
    );

    const goalSelect = screen.getByLabelText(/Link to Goal/i);
    fireEvent.change(goalSelect, { target: { value: 'goal-2' } });

    expect(goalSelect).toHaveValue('goal-2');
  });

  it('displays calendar sync checkbox when connected', () => {
    render(
      <EditTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
        goals={mockGoals}
        task={mockTask}
        isCalendarConnected={true}
      />
    );

    const checkbox = screen.getByLabelText(/sync with google calendar/i);
    expect(checkbox).toBeChecked();
  });

  it('hides calendar sync checkbox when not connected', () => {
    render(
      <EditTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
        goals={mockGoals}
        task={mockTask}
        isCalendarConnected={false}
      />
    );

    const checkbox = screen.queryByLabelText(/sync with google calendar/i);
    expect(checkbox).not.toBeInTheDocument();
  });

  it('submits form with updated data', async () => {
    render(
      <EditTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
        goals={mockGoals}
        task={mockTask}
      />
    );

    const titleInput = screen.getByDisplayValue('Test Task');
    fireEvent.change(titleInput, { target: { value: 'Updated Task' } });

    const updateButton = screen.getByRole('button', { name: /update task/i });
    fireEvent.click(updateButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Updated Task',
        })
      );
    });
  });

  it('disables submit button when title is empty', () => {
    render(
      <EditTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
        goals={mockGoals}
        task={mockTask}
      />
    );

    const titleInput = screen.getByDisplayValue('Test Task');
    fireEvent.change(titleInput, { target: { value: '' } });

    const updateButton = screen.getByRole('button', { name: /update task/i });
    expect(updateButton).toBeDisabled();
  });

  it('shows loading state when pending', () => {
    render(
      <EditTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={true}
        goals={mockGoals}
        task={mockTask}
      />
    );

    expect(screen.getByText('Updating...')).toBeInTheDocument();
  });

  it('calls onOpenChange when cancel is clicked', () => {
    render(
      <EditTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
        goals={mockGoals}
        task={mockTask}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('handles task with no description', () => {
    const taskWithoutDescription = {
      ...mockTask,
      description: null,
    };

    render(
      <EditTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
        goals={mockGoals}
        task={taskWithoutDescription}
      />
    );

    const descriptionInput = screen.getByPlaceholderText('Add more details...');
    expect(descriptionInput).toHaveValue('');
  });

  it('handles task with no tags', () => {
    const taskWithoutTags = {
      ...mockTask,
      tags: null,
    };

    render(
      <EditTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
        goals={mockGoals}
        task={taskWithoutTags}
      />
    );

    // Should show common tags but no selected tags
    expect(screen.getByText('work')).toBeInTheDocument();
    expect(screen.getByText('learning')).toBeInTheDocument();
  });

  it('handles task with no due date', () => {
    const taskWithoutDueDate = {
      ...mockTask,
      dueDate: null,
    };

    render(
      <EditTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
        goals={mockGoals}
        task={taskWithoutDueDate}
      />
    );

    expect(screen.getByText('Pick a date')).toBeInTheDocument();
  });

  it('handles task with no goal', () => {
    const taskWithoutGoal = {
      ...mockTask,
      goalId: null,
    };

    render(
      <EditTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
        goals={mockGoals}
        task={taskWithoutGoal}
      />
    );

    const goalSelect = screen.getByLabelText(/Link to Goal/i);
    expect(goalSelect).toHaveValue('');
  });

  it('toggles calendar picker visibility', () => {
    render(
      <EditTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
        goals={mockGoals}
        task={mockTask}
      />
    );

    // Date format is DD/MM/YYYY (31/12/2024)
    const dateButton = screen.getByText(/31\/12\/2024/);
    fireEvent.click(dateButton);

    // Calendar should appear (checking for month navigation buttons)
    expect(screen.getByRole('grid')).toBeInTheDocument();
  });

  it('allows clearing due date', () => {
    render(
      <EditTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
        goals={mockGoals}
        task={mockTask}
      />
    );

    const clearButton = screen.getByRole('button', { name: /clear date/i });
    fireEvent.click(clearButton);

    expect(screen.getByText('Pick a date')).toBeInTheDocument();
  });

  it('uses common tags for quick selection', () => {
    const taskWithNoTags = {
      ...mockTask,
      tags: [],
    };

    render(
      <EditTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
        goals={mockGoals}
        task={taskWithNoTags}
      />
    );

    const commonTags = ['work', 'learning', 'personal', 'health', 'urgent'];
    commonTags.forEach(tag => {
      expect(screen.getByText(tag)).toBeInTheDocument();
    });
  });

  it('toggles common tag selection on click', () => {
    const taskWithNoTags = {
      ...mockTask,
      tags: [],
    };

    render(
      <EditTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
        goals={mockGoals}
        task={taskWithNoTags}
      />
    );

    // Find all "work" buttons (one in common tags, possibly one in selected)
    const workButtons = screen.getAllByText('work');
    const workButton = workButtons[0];
    
    fireEvent.click(workButton);

    // After clicking, should see work in selected tags section
    const selectedTags = screen.getAllByText('work');
    expect(selectedTags.length).toBeGreaterThan(1); // In both common and selected
  });
});

