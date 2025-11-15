import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateTaskDialog } from '@/components/TaskDialogs';

describe('CreateTaskDialog - Priority Field', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSubmit = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders priority dropdown', () => {
    render(
      <CreateTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
      />
    );

    const priorityLabel = screen.getByLabelText(/Priority/i);
    expect(priorityLabel).toBeInTheDocument();
  });

  it('defaults to medium priority', () => {
    render(
      <CreateTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
      />
    );

    const prioritySelect = screen.getByLabelText(/Priority/i);
    expect(prioritySelect).toHaveValue('medium');
  });

  it('shows all priority options', () => {
    render(
      <CreateTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
      />
    );

    const prioritySelect = screen.getByLabelText(/Priority/i);
    const options = prioritySelect.querySelectorAll('option');
    
    expect(options).toHaveLength(3);
    expect(options[0]).toHaveTextContent(/High Priority/i);
    expect(options[1]).toHaveTextContent(/Medium Priority/i);
    expect(options[2]).toHaveTextContent(/Low Priority/i);
  });

  it('allows changing priority to high', () => {
    render(
      <CreateTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
      />
    );

    const prioritySelect = screen.getByLabelText(/Priority/i) as HTMLSelectElement;
    fireEvent.change(prioritySelect, { target: { value: 'high' } });

    expect(prioritySelect.value).toBe('high');
  });

  it('allows changing priority to low', () => {
    render(
      <CreateTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
      />
    );

    const prioritySelect = screen.getByLabelText(/Priority/i) as HTMLSelectElement;
    fireEvent.change(prioritySelect, { target: { value: 'low' } });

    expect(prioritySelect.value).toBe('low');
  });

  it('includes priority in form submission', async () => {
    render(
      <CreateTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
      />
    );

    // Fill in required fields
    const titleInput = screen.getByLabelText(/Title/i);
    fireEvent.change(titleInput, { target: { value: 'Test Task' } });

    // Change priority
    const prioritySelect = screen.getByLabelText(/Priority/i);
    fireEvent.change(prioritySelect, { target: { value: 'high' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: /Create Task/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Task',
          priority: 'high',
        })
      );
    });
  });

  it('submits with default medium priority when not changed', async () => {
    render(
      <CreateTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
      />
    );

    const titleInput = screen.getByLabelText(/Title/i);
    fireEvent.change(titleInput, { target: { value: 'Test Task' } });

    const submitButton = screen.getByRole('button', { name: /Create Task/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: 'medium',
        })
      );
    });
  });

  it('shows priority dropdown with emoji indicators', () => {
    render(
      <CreateTaskDialog
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        isPending={false}
      />
    );

    const prioritySelect = screen.getByLabelText(/Priority/i);
    const highOption = Array.from(prioritySelect.querySelectorAll('option')).find(
      opt => opt.value === 'high'
    );
    const mediumOption = Array.from(prioritySelect.querySelectorAll('option')).find(
      opt => opt.value === 'medium'
    );
    const lowOption = Array.from(prioritySelect.querySelectorAll('option')).find(
      opt => opt.value === 'low'
    );

    expect(highOption?.textContent).toContain('🔴');
    expect(mediumOption?.textContent).toContain('🟡');
    expect(lowOption?.textContent).toContain('🟢');
  });
});

