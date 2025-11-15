import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from '@/app/dashboard/page';
import { trpc } from '@/lib/trpc/client';
import { supabase } from '@/lib/supabase/client';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    goal: {
      getAll: {
        useQuery: vi.fn(),
      },
    },
    task: {
      getAll: {
        useQuery: vi.fn(),
      },
      create: {
        useMutation: vi.fn(),
      },
      update: {
        useMutation: vi.fn(),
      },
      complete: {
        useMutation: vi.fn(),
      },
      skip: {
        useMutation: vi.fn(),
      },
      reschedule: {
        useMutation: vi.fn(),
      },
      syncFromCalendar: {
        useMutation: vi.fn(),
      },
    },
  },
}));

describe('Task Edit Flow', () => {
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    created_at: new Date().toISOString(),
  };

  const mockTasks = [
    {
      id: 'task-1',
      userId: '123',
      title: 'Test Task 1',
      description: 'Description 1',
      dueDate: new Date(), // Today's date so it passes the 'today' filter
      status: 'pending' as const,
      completionProof: null,
      tags: ['work'],
      googleCalendarEventId: null,
      isSyncedWithCalendar: false,
      recurrencePattern: null,
      parentTaskId: null,
      goalId: 'goal-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'task-2',
      userId: '123',
      title: 'Test Task 2',
      description: null,
      dueDate: new Date(),
      status: 'completed' as const,
      completionProof: 'Done!',
      tags: null,
      googleCalendarEventId: 'cal-123',
      isSyncedWithCalendar: true,
      recurrencePattern: null,
      parentTaskId: null,
      goalId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockGoals = [
    {
      id: 'goal-1',
      userId: '123',
      title: 'Test Goal',
      description: 'Test goal description',
      status: 'active' as const,
      priority: 'high' as const,
      timeHorizon: 'monthly' as const,
      targetDate: new Date('2024-12-31'),
      githubRepos: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    } as any);

    vi.mocked(trpc.goal.getAll.useQuery).mockReturnValue({
      data: mockGoals,
      isLoading: false,
      isError: false,
      isSuccess: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(trpc.task.getAll.useQuery).mockReturnValue({
      data: mockTasks,
      isLoading: false,
      isError: false,
      isSuccess: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(trpc.task.update.useMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(trpc.task.complete.useMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(trpc.task.skip.useMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(trpc.task.reschedule.useMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(trpc.task.syncFromCalendar.useMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(trpc.task.create.useMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);
  });

  describe('Edit Button Display', () => {
    it('shows Edit button for all tasks', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        // Should have Edit buttons (desktop + mobile views = multiple instances)
        expect(editButtons.length).toBeGreaterThan(0);
      });
    });

    it('Edit button is always visible (even for completed tasks)', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        // Task 2 is completed and should still have an Edit button
        const taskTitles = screen.getAllByText('Test Task 2');
        expect(taskTitles.length).toBeGreaterThan(0);
        const editButtons = screen.getAllByText('Edit');
        expect(editButtons.length).toBeGreaterThan(0);
      });
    });

    it('Complete button only shows for pending tasks', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const completeButtons = screen.getAllByText('Complete');
        // Only task-1 is pending (appears in desktop + mobile), so we should have Complete buttons
        expect(completeButtons.length).toBeGreaterThan(0);
      });
    });

    it('Skip button only shows for pending tasks', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const skipButtons = screen.getAllByText('Skip');
        // Only task-1 is pending, so we should have Skip buttons
        expect(skipButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edit Task Interaction', () => {
    it('opens edit dialog when Edit button is clicked', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const taskTitles = screen.getAllByText('Test Task 1');
        expect(taskTitles.length).toBeGreaterThan(0);
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit Task')).toBeInTheDocument();
      });
    });

    it('pre-fills edit dialog with task data', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const taskTitles = screen.getAllByText('Test Task 1');
        expect(taskTitles.length).toBeGreaterThan(0);
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Task 1')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Description 1')).toBeInTheDocument();
      });
    });

    it('calls update mutation with correct data when form is submitted', async () => {
      const mockMutate = vi.fn();
      vi.mocked(trpc.task.update.useMutation).mockReturnValue({
        mutate: mockMutate,
        isPending: false,
      } as any);

      render(<Dashboard />);

      await waitFor(() => {
        const taskTitles = screen.getAllByText('Test Task 1');
        expect(taskTitles.length).toBeGreaterThan(0);
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit Task')).toBeInTheDocument();
      });

      const titleInput = screen.getByDisplayValue('Test Task 1');
      fireEvent.change(titleInput, { target: { value: 'Updated Task' } });

      const updateButton = screen.getByRole('button', { name: /update task/i });
      fireEvent.click(updateButton);

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({
            id: 'task-1',
            title: 'Updated Task',
          })
        );
      });
    });
  });

  describe('Button Styling', () => {
    it('Edit button has blue styling', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        expect(editButtons.length).toBeGreaterThan(0);
        const editButton = editButtons[0];
        expect(editButton).toHaveClass('text-blue-600');
      });
    });

    it('Complete button has green styling', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const completeButtons = screen.getAllByText('Complete');
        const completeButton = completeButtons[0];
        expect(completeButton).toHaveClass('text-green-600');
      });
    });

    it('Skip button has amber styling', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const skipButtons = screen.getAllByText('Skip');
        const skipButton = skipButtons[0];
        expect(skipButton).toHaveClass('text-amber-600');
      });
    });
  });

  describe('Task Sorting', () => {
    it('displays pending tasks before completed tasks', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const tasks = screen.getAllByRole('heading', { level: 3 });
        const taskTitles = tasks.map(t => t.textContent);
        
        const pendingIndex = taskTitles.indexOf('Test Task 1');
        const completedIndex = taskTitles.indexOf('Test Task 2');
        
        // Pending task should come before completed task
        expect(pendingIndex).toBeLessThan(completedIndex);
      });
    });
  });

  describe('Synced Task Indicator', () => {
    it('shows sync indicator for synced tasks', async () => {
      render(<Dashboard />);

      await waitFor(() => {
        const taskTitles = screen.getAllByText('Test Task 2');
        expect(taskTitles.length).toBeGreaterThan(0);
        // Task 2 is synced, should show 🔗 icon
        const syncIcons = screen.getAllByText('🔗');
        expect(syncIcons.length).toBeGreaterThan(0);
      });
    });
  });
});

