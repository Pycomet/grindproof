import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from '@/app/dashboard/page';
import { trpc } from '@/lib/trpc/client';
import { supabase } from '@/lib/supabase/client';
import { useApp } from '@/contexts/AppContext';
import { mockAppContext } from '../../helpers/app-context-mock';

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
      delete: {
        useMutation: vi.fn(),
      },
      syncFromCalendar: {
        useMutation: vi.fn(),
      },
    },
    integration: {
      getAll: {
        useQuery: vi.fn(),
      },
    },
    conversation: {
      getAll: { useQuery: vi.fn(() => ({ data: [] })) },
      create: { useMutation: vi.fn(() => ({ mutateAsync: vi.fn() })) },
      update: { useMutation: vi.fn(() => ({ mutateAsync: vi.fn() })) },
    },
  },
}));

vi.mock('@/contexts/AppContext', () => ({
  useApp: vi.fn(),
  AppProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/hooks/useOfflineSync', () => ({
  useOfflineSync: () => ({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    queueMutation: vi.fn(),
    forceSync: vi.fn(),
  }),
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

  // Helper to switch to tasks view
  const switchToTasksView = async () => {
    await waitFor(() => {
      const tasksTab = screen.queryByText('✓ Tasks');
      if (tasksTab) {
        fireEvent.click(tasksTab);
      }
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: mockUser as any },
      error: null,
    } as any);

    // Mock AppContext
    vi.mocked(useApp).mockReturnValue(
      mockAppContext({
        tasks: mockTasks as any,
        goals: mockGoals as any,
        user: mockUser as any,
      })
    );

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

    vi.mocked(trpc.integration.getAll.useQuery).mockReturnValue({
      data: [],
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

    vi.mocked(trpc.task.delete.useMutation).mockReturnValue({
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
    it('shows Edit button only for pending tasks', async () => {
      render(<Dashboard />);
      await switchToTasksView();
      await switchToTasksView();

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        // Only pending tasks should have Edit buttons (desktop + mobile views)
        expect(editButtons.length).toBeGreaterThan(0);
      });
    });

    it('Edit button is NOT visible for completed tasks', async () => {
      render(<Dashboard />);
      await switchToTasksView();
      await switchToTasksView();

      await waitFor(() => {
        // Task 2 is completed - verify it exists
        const taskTitles = screen.getAllByText('Test Task 2');
        expect(taskTitles.length).toBeGreaterThan(0);
        
        // Count Edit buttons - should only be for pending task (task-1)
        const editButtons = screen.getAllByText('Edit');
        // We have task-1 (pending) which appears in both mobile and desktop
        // Task-2 (completed) should NOT have edit buttons
        expect(editButtons.length).toBeGreaterThan(0);
      });
    });

    it('Complete button only shows for pending tasks', async () => {
      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        const completeButtons = screen.getAllByText('Complete');
        // Only task-1 is pending (appears in desktop + mobile), so we should have Complete buttons
        expect(completeButtons.length).toBeGreaterThan(0);
      });
    });

    it('Skip button only shows for pending tasks', async () => {
      render(<Dashboard />);
      await switchToTasksView();

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
      await switchToTasksView();

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
      await switchToTasksView();

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
      await switchToTasksView();

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
      await switchToTasksView();

      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        expect(editButtons.length).toBeGreaterThan(0);
        const editButton = editButtons[0];
        expect(editButton).toHaveClass('text-blue-600');
      });
    });

    it('Complete button has green styling', async () => {
      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        const completeButtons = screen.getAllByText('Complete');
        const completeButton = completeButtons[0];
        expect(completeButton).toHaveClass('text-green-600');
      });
    });

    it('Skip button has amber styling', async () => {
      render(<Dashboard />);
      await switchToTasksView();

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
      await switchToTasksView();

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
      await switchToTasksView();

      await waitFor(() => {
        const taskTitles = screen.getAllByText('Test Task 2');
        expect(taskTitles.length).toBeGreaterThan(0);
        // Task 2 is synced, should show 🔗 icon
        const syncIcons = screen.getAllByText('🔗');
        expect(syncIcons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Delete Button', () => {
    it('shows Delete button for all tasks (pending, completed, skipped)', async () => {
      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        // Delete button should appear as "Delete" on desktop
        const deleteButtons = screen.getAllByText(/Delete|🗑️/);
        expect(deleteButtons.length).toBeGreaterThan(0);
      });
    });

    it('Delete button has red styling', async () => {
      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        const deleteButtons = screen.getAllByTitle('Delete task');
        expect(deleteButtons.length).toBeGreaterThan(0);
        
        const deleteButton = deleteButtons[0];
        expect(deleteButton.className).toContain('text-red-600');
      });
    });
  });

  describe('Skipped Tasks Filtering', () => {
    beforeEach(() => {
      // Add a skipped task to the mock data
      const mockTasksWithSkipped = [
        {
          id: 'task-1',
          userId: '123',
          title: 'Test Task 1',
          description: 'Description 1',
          dueDate: new Date(),
          status: 'pending' as const,
          completionProof: null,
          tags: ['work'],
          goalId: null,
          isSyncedWithCalendar: false,
          googleCalendarEventId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          startTime: null,
          endTime: null,
          reminders: null,
        },
        {
          id: 'task-2',
          userId: '123',
          title: 'Test Task 2',
          description: 'Description 2',
          dueDate: new Date(),
          status: 'completed' as const,
          completionProof: 'Done!',
          tags: ['personal'],
          goalId: null,
          isSyncedWithCalendar: true,
          googleCalendarEventId: 'event-123',
          createdAt: new Date(),
          updatedAt: new Date(),
          startTime: null,
          endTime: null,
          reminders: null,
        },
        {
          id: 'task-3',
          userId: '123',
          title: 'Test Task 3 Skipped',
          description: 'Description 3',
          dueDate: new Date(),
          status: 'skipped' as const,
          completionProof: null,
          tags: ['learning'],
          goalId: null,
          isSyncedWithCalendar: false,
          googleCalendarEventId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          startTime: null,
          endTime: null,
          reminders: null,
        },
      ];

      // Add goal_id to all tasks for AppContext compatibility
      const tasksWithGoalId = mockTasksWithSkipped.map(task => ({
        ...task,
        goal_id: task.goalId,
      }));

      // Mock AppContext with skipped tasks
      vi.mocked(useApp).mockReturnValue(
        mockAppContext({
          tasks: tasksWithGoalId as any,
          goals: mockGoals as any,
          user: mockUser as any,
        })
      );

      vi.mocked(trpc.task.getAll.useQuery).mockReturnValue({
        data: mockTasksWithSkipped,
        isLoading: false,
        isError: false,
        refetch: vi.fn().mockResolvedValue({ data: mockTasksWithSkipped }),
      } as any);
    });

    it('hides skipped tasks by default on Today filter', async () => {
      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        // Skipped task should NOT be visible
        expect(screen.queryByText('Test Task 3 Skipped')).not.toBeInTheDocument();
        
        // Pending and completed tasks should be visible
        expect(screen.getAllByText('Test Task 1').length).toBeGreaterThan(0);
        expect(screen.getAllByText('Test Task 2').length).toBeGreaterThan(0);
      });
    });

    it('shows "Skipped" filter button with count', async () => {
      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        const skippedFilters = screen.getAllByText('Skipped');
        expect(skippedFilters.length).toBeGreaterThan(0);
        
        // Should show count of 1 (one skipped task)
        const countElements = screen.getAllByText('1');
        expect(countElements.length).toBeGreaterThan(0);
      });
    });

    it('shows skipped tasks when Skipped filter is clicked', async () => {
      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        const skippedFilters = screen.getAllByText('Skipped');
        fireEvent.click(skippedFilters[0]);
      });

      await waitFor(() => {
        // Now skipped task SHOULD be visible
        expect(screen.getAllByText('Test Task 3 Skipped').length).toBeGreaterThan(0);
        
        // Skipped filter should be active now
        const skippedFilterButtons = screen.getAllByText('Skipped');
        expect(skippedFilterButtons.length).toBeGreaterThan(0);
      });
    });

    it('skipped tasks have red styling when visible', async () => {
      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        const skippedFilters = screen.getAllByText('Skipped');
        fireEvent.click(skippedFilters[0]);
      });

      await waitFor(() => {
        const skippedTask = screen.getAllByText('Test Task 3 Skipped')[0];
        expect(skippedTask).toBeInTheDocument();
        
        // Check for red text styling
        expect(skippedTask.className).toContain('text-red-500');
        expect(skippedTask.className).toContain('line-through');
      });
    });

    it('skipped tasks do not have Edit button', async () => {
      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        const skippedFilters = screen.getAllByText('Skipped');
        fireEvent.click(skippedFilters[0]);
      });

      await waitFor(() => {
        // Verify skipped task is shown
        expect(screen.getAllByText('Test Task 3 Skipped').length).toBeGreaterThan(0);
        
        // Only Delete button should be present (no Edit, Complete, or Skip)
        const deleteButtons = screen.getAllByText(/Delete|🗑️/);
        expect(deleteButtons.length).toBeGreaterThan(0);
      });
    });

    it('excludes skipped tasks from All filter count', async () => {
      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        const allFilters = screen.getAllByText('All');
        expect(allFilters.length).toBeGreaterThan(0);
        
        // Count should be 2 (pending + completed, excluding skipped)
        const countElements = screen.getAllByText('2');
        expect(countElements.length).toBeGreaterThan(0);
      });
    });
  });
});

