import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecurringTaskEditDialog } from '@/components/TaskDialogs';

describe('RecurringTaskEditDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnEditSingle = vi.fn();
  const mockOnEditAll = vi.fn();
  const mockTaskTitle = 'Weekly Team Meeting';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog when open', () => {
    render(
      <RecurringTaskEditDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onEditSingle={mockOnEditSingle}
        onEditAll={mockOnEditAll}
        taskTitle={mockTaskTitle}
      />
    );

    expect(screen.getByText('Edit Recurring Task')).toBeInTheDocument();
    expect(screen.getByText(/This is a recurring event/i)).toBeInTheDocument();
  });

  it('does not render dialog when closed', () => {
    render(
      <RecurringTaskEditDialog
        open={false}
        onOpenChange={mockOnOpenChange}
        onEditSingle={mockOnEditSingle}
        onEditAll={mockOnEditAll}
        taskTitle={mockTaskTitle}
      />
    );

    expect(screen.queryByText('Edit Recurring Task')).not.toBeInTheDocument();
  });

  it('displays the task title', () => {
    render(
      <RecurringTaskEditDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onEditSingle={mockOnEditSingle}
        onEditAll={mockOnEditAll}
        taskTitle={mockTaskTitle}
      />
    );

    expect(screen.getByText(mockTaskTitle)).toBeInTheDocument();
  });

  it('shows both edit options', () => {
    render(
      <RecurringTaskEditDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onEditSingle={mockOnEditSingle}
        onEditAll={mockOnEditAll}
        taskTitle={mockTaskTitle}
      />
    );

    expect(screen.getByText('This event only')).toBeInTheDocument();
    expect(screen.getByText(/Only modify this instance/i)).toBeInTheDocument();
    expect(screen.getByText('All events in the series')).toBeInTheDocument();
    expect(screen.getByText(/Apply changes to all recurring instances/i)).toBeInTheDocument();
  });

  it('calls onEditSingle and closes dialog when "This event only" is clicked', () => {
    render(
      <RecurringTaskEditDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onEditSingle={mockOnEditSingle}
        onEditAll={mockOnEditAll}
        taskTitle={mockTaskTitle}
      />
    );

    const singleButton = screen.getByRole('button', { name: /This event only/i });
    fireEvent.click(singleButton);

    expect(mockOnEditSingle).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onEditAll and closes dialog when "All events in the series" is clicked', () => {
    render(
      <RecurringTaskEditDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onEditSingle={mockOnEditSingle}
        onEditAll={mockOnEditAll}
        taskTitle={mockTaskTitle}
      />
    );

    const allButton = screen.getByRole('button', { name: /All events in the series/i });
    fireEvent.click(allButton);

    expect(mockOnEditAll).toHaveBeenCalledTimes(1);
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not call handlers before button clicks', () => {
    render(
      <RecurringTaskEditDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onEditSingle={mockOnEditSingle}
        onEditAll={mockOnEditAll}
        taskTitle={mockTaskTitle}
      />
    );

    expect(mockOnEditSingle).not.toHaveBeenCalled();
    expect(mockOnEditAll).not.toHaveBeenCalled();
  });

  it('renders with motion components', () => {
    render(
      <RecurringTaskEditDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onEditSingle={mockOnEditSingle}
        onEditAll={mockOnEditAll}
        taskTitle={mockTaskTitle}
      />
    );

    // Verify the dialog renders with all key elements
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('This event only')).toBeInTheDocument();
    expect(screen.getByText('All events in the series')).toBeInTheDocument();
  });
});

