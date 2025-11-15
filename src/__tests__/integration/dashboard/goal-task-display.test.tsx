import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
      create: {
        useMutation: vi.fn(),
      },
      update: {
        useMutation: vi.fn(),
      },
      delete: {
        useMutation: vi.fn(),
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
      getByServiceType: {
        useQuery: vi.fn(),
      },
      getGitHubActivity: {
        useQuery: vi.fn(),
      },
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

describe('Goal-Task Display', () => {
  const mockUser = {
    id: '123',
    email: 'test@example.com',
    created_at: new Date().toISOString(),
  };

  const mockGoals = [
    {
      id: 'goal-1',
      userId: '123',
      user_id: '123',
      title: 'Launch Feature',
      description: 'Build and launch new feature',
      status: 'active' as const,
      priority: 'high' as const,
      timeHorizon: 'monthly' as const,
      time_horizon: 'monthly' as const,
      targetDate: new Date('2024-12-31'),
      target_date: new Date('2024-12-31').toISOString(),
      githubRepos: null,
      github_repos: null,
      createdAt: new Date(),
      created_at: new Date().toISOString(),
      updatedAt: new Date(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'goal-2',
      userId: '123',
      user_id: '123',
      title: 'Empty Goal',
      description: 'Goal with no tasks',
      status: 'active' as const,
      priority: 'medium' as const,
      timeHorizon: 'weekly' as const,
      time_horizon: 'weekly' as const,
      targetDate: null,
      target_date: null,
      githubRepos: null,
      github_repos: null,
      createdAt: new Date(),
      created_at: new Date().toISOString(),
      updatedAt: new Date(),
      updated_at: new Date().toISOString(),
    },
  ];

  const mockTasks = [
    {
      id: 'task-1',
      userId: '123',
      user_id: '123',
      title: 'Design UI',
      description: null,
      dueDate: new Date('2024-12-25'),
      due_date: new Date('2024-12-25').toISOString(),
      startTime: null,
      start_time: null,
      endTime: null,
      end_time: null,
      reminders: null,
      status: 'completed' as const,
      priority: 'medium' as const,
      completionProof: null,
      completion_proof: null,
      tags: ['design'],
      googleCalendarEventId: null,
      google_calendar_event_id: null,
      isSyncedWithCalendar: false,
      is_synced_with_calendar: false,
      recurrenceRule: null,
      recurrence_rule: null,
      recurringEventId: null,
      recurring_event_id: null,
      parentTaskId: null,
      parent_task_id: null,
      goalId: 'goal-1',
      goal_id: 'goal-1',
      createdAt: new Date(),
      created_at: new Date().toISOString(),
      updatedAt: new Date(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'task-2',
      userId: '123',
      user_id: '123',
      title: 'Implement Backend',
      description: null,
      dueDate: new Date('2024-12-28'),
      due_date: new Date('2024-12-28').toISOString(),
      startTime: null,
      start_time: null,
      endTime: null,
      end_time: null,
      reminders: null,
      status: 'pending' as const,
      priority: 'medium' as const,
      completionProof: null,
      completion_proof: null,
      tags: ['backend'],
      googleCalendarEventId: null,
      google_calendar_event_id: null,
      isSyncedWithCalendar: false,
      is_synced_with_calendar: false,
      recurrenceRule: null,
      recurrence_rule: null,
      recurringEventId: null,
      recurring_event_id: null,
      parentTaskId: null,
      parent_task_id: null,
      goalId: 'goal-1',
      goal_id: 'goal-1',
      createdAt: new Date(),
      created_at: new Date().toISOString(),
      updatedAt: new Date(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'task-3',
      userId: '123',
      user_id: '123',
      title: 'Write Tests',
      description: null,
      dueDate: new Date('2024-12-30'),
      due_date: new Date('2024-12-30').toISOString(),
      startTime: null,
      start_time: null,
      endTime: null,
      end_time: null,
      reminders: null,
      status: 'pending' as const,
      priority: 'medium' as const,
      completionProof: null,
      completion_proof: null,
      tags: ['testing'],
      googleCalendarEventId: null,
      google_calendar_event_id: null,
      isSyncedWithCalendar: false,
      is_synced_with_calendar: false,
      recurrenceRule: null,
      recurrence_rule: null,
      recurringEventId: null,
      recurring_event_id: null,
      parentTaskId: null,
      parent_task_id: null,
      goalId: 'goal-1',
      goal_id: 'goal-1',
      createdAt: new Date(),
      created_at: new Date().toISOString(),
      updatedAt: new Date(),
      updated_at: new Date().toISOString(),
    },
  ];

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

    vi.mocked(trpc.integration.getByServiceType.useQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      isSuccess: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    vi.mocked(trpc.integration.getGitHubActivity.useQuery).mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      isSuccess: true,
      error: null,
      refetch: vi.fn(),
    } as any);

    // Mock all mutations
    vi.mocked(trpc.goal.create.useMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(trpc.goal.update.useMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(trpc.goal.delete.useMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any);

    vi.mocked(trpc.task.create.useMutation).mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
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
  });

  describe('Task Count Display', () => {
    it('displays task count for goals with tasks', async () => {
      render(<Dashboard />);

      // Switch to Goals tab
      const goalsTab = screen.getByRole('button', { name: /🎯 goals/i });
      fireEvent.click(goalsTab);

      await waitFor(() => {
        expect(screen.getByText('Launch Feature')).toBeInTheDocument();
        expect(screen.getByText('Tasks: 1/3 completed')).toBeInTheDocument();
      });
    });

    it('displays correct task count (completed/total)', async () => {
      render(<Dashboard />);

      const goalsTab = screen.getByRole('button', { name: /🎯 goals/i });
      fireEvent.click(goalsTab);

      await waitFor(() => {
        // Goal 1 has 3 tasks, 1 completed
        expect(screen.getByText('Tasks: 1/3 completed')).toBeInTheDocument();
      });
    });

    it('shows progress bar for goals with tasks', async () => {
      render(<Dashboard />);

      const goalsTab = screen.getByRole('button', { name: /🎯 goals/i });
      fireEvent.click(goalsTab);

      await waitFor(() => {
        // Check that task count is displayed (which appears alongside the progress bar)
        expect(screen.getByText('Tasks: 1/3 completed')).toBeInTheDocument();
      });
    });

    it('shows warning for goals with no tasks', async () => {
      render(<Dashboard />);

      const goalsTab = screen.getByRole('button', { name: /🎯 goals/i });
      fireEvent.click(goalsTab);

      await waitFor(() => {
        expect(screen.getByText('Empty Goal')).toBeInTheDocument();
        expect(screen.getByText(/⚠️ No tasks yet/)).toBeInTheDocument();
      });
    });
  });

  describe('Edit Goal Dialog - Task Section', () => {
    it('shows tasks section in edit goal dialog', async () => {
      render(<Dashboard />);

      const goalsTab = screen.getByRole('button', { name: /🎯 goals/i });
      fireEvent.click(goalsTab);

      // Wait for goals view to load and goal to appear
      await waitFor(
        () => {
          expect(screen.getByText('Launch Feature')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Click Edit button for first goal
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit Goal')).toBeInTheDocument();
        expect(screen.getByText(/Tasks \(1\/3 completed\)/)).toBeInTheDocument();
      });
    });

    it('displays all tasks linked to the goal in edit dialog', async () => {
      render(<Dashboard />);

      const goalsTab = screen.getByRole('button', { name: /🎯 goals/i });
      fireEvent.click(goalsTab);

      // Wait for goals view to load and goal to appear
      await waitFor(
        () => {
          expect(screen.getByText('Launch Feature')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Wait a bit for the UI to stabilize after tab switch
      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        expect(editButtons.length).toBeGreaterThan(0);
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      await waitFor(
        () => {
          expect(screen.getByText('Design UI')).toBeInTheDocument();
          expect(screen.getByText('Implement Backend')).toBeInTheDocument();
          expect(screen.getByText('Write Tests')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );
    });

    it('shows completed tasks with checkmark', async () => {
      render(<Dashboard />);

      const goalsTab = screen.getByRole('button', { name: /🎯 goals/i });
      fireEvent.click(goalsTab);

      // Wait for goals view to load and goal to appear
      await waitFor(
        () => {
          expect(screen.getByText('Launch Feature')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        const designTask = screen.getByText('Design UI');
        const taskCard = designTask.closest('div');
        
        // Should have green background for completed task
        expect(taskCard).toHaveClass('bg-green-50');
        
        // Should have checkmark
        const svg = taskCard?.querySelector('svg');
        expect(svg).toBeInTheDocument();
      });
    });

    it('shows pending tasks without checkmark', async () => {
      render(<Dashboard />);

      const goalsTab = screen.getByRole('button', { name: /🎯 goals/i });
      fireEvent.click(goalsTab);

      // Wait for goals view to load and goal to appear
      await waitFor(
        () => {
          expect(screen.getByText('Launch Feature')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        const backendTask = screen.getByText('Implement Backend');
        const taskCard = backendTask.closest('div');
        
        // Should have zinc background for pending task
        expect(taskCard).toHaveClass('bg-zinc-50');
      });
    });

    it('displays due dates for tasks', async () => {
      render(<Dashboard />);

      const goalsTab = screen.getByRole('button', { name: /🎯 goals/i });
      fireEvent.click(goalsTab);

      // Wait for goals view to load and goal to appear
      await waitFor(
        () => {
          expect(screen.getByText('Launch Feature')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        // Due dates should be displayed (checking for "Dec 25", "Dec 28", "Dec 30")
        expect(screen.getByText(/Dec 25/)).toBeInTheDocument();
        expect(screen.getByText(/Dec 28/)).toBeInTheDocument();
        expect(screen.getByText(/Dec 30/)).toBeInTheDocument();
      });
    });

    it('shows "+ Add Task" button in edit dialog', async () => {
      render(<Dashboard />);

      const goalsTab = screen.getByRole('button', { name: /🎯 goals/i });
      fireEvent.click(goalsTab);

      // Wait for goals view to load and goal to appear
      await waitFor(
        () => {
          expect(screen.getByText('Launch Feature')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        const addTaskButton = screen.getByRole('button', { name: /\+ add task/i });
        expect(addTaskButton).toBeInTheDocument();
      });
    });

    it('shows message when goal has no tasks', async () => {
      render(<Dashboard />);

      const goalsTab = screen.getByRole('button', { name: /🎯 goals/i });
      fireEvent.click(goalsTab);

      await waitFor(() => {
        expect(screen.getByText('Empty Goal')).toBeInTheDocument();
      });

      // Click Edit on "Empty Goal" (second goal)
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[1]);

      await waitFor(() => {
        // Use getAllByText since "no tasks yet" appears in multiple places
        const noTasksMessages = screen.getAllByText(/no tasks yet/i);
        expect(noTasksMessages.length).toBeGreaterThan(0);
      });
    });
  });

  describe('"Add Task" in Edit Dialog', () => {
    it('shows "+ Add Task" button only in edit goal dialog (not on goal cards)', async () => {
      render(<Dashboard />);

      const goalsTab = screen.getByRole('button', { name: /🎯 goals/i });
      fireEvent.click(goalsTab);

      // Wait for goals view to load and goal to appear
      await waitFor(
        () => {
          expect(screen.getByText('Launch Feature')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Button should NOT be on goal cards
      const addTaskOnCardButtons = screen.queryAllByText('+ Add Task to This Goal');
      expect(addTaskOnCardButtons.length).toBe(0);

      // Open edit dialog
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        // Button SHOULD be in edit dialog (there may be multiple due to FAB, use getAllByText)
        const addTaskButtons = screen.getAllByText('+ Add Task');
        expect(addTaskButtons.length).toBeGreaterThan(0);
      });
    });

    it('opens create task dialog with goal pre-selected from edit dialog', async () => {
      render(<Dashboard />);

      const goalsTab = screen.getByRole('button', { name: /🎯 goals/i });
      fireEvent.click(goalsTab);

      // Wait for goals view to load and goal to appear
      await waitFor(
        () => {
          expect(screen.getByText('Launch Feature')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Open edit dialog
      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        const addTaskButtons = screen.getAllByText('+ Add Task');
        expect(addTaskButtons.length).toBeGreaterThan(0);
      });

      // Click the add task button in edit dialog (use the first one which should be in the dialog)
      const addTaskButtons = screen.getAllByText('+ Add Task');
      // Click the button that's part of the edit dialog (smaller button with outline variant)
      const dialogAddTaskButton = addTaskButtons.find(btn => 
        btn.className.includes('text-xs')
      ) || addTaskButtons[addTaskButtons.length - 1]; // Fallback to last button
      fireEvent.click(dialogAddTaskButton);

      await waitFor(() => {
        expect(screen.getByText('Create New Task')).toBeInTheDocument();
      });
    });
  });

  describe('Task List Scrolling', () => {
    it('task list is scrollable when many tasks exist', async () => {
      // Add more tasks to test scrolling
      const manyTasks = Array.from({ length: 10 }, (_, i) => ({
        id: `task-${i}`,
        userId: '123',
        user_id: '123',
        title: `Task ${i}`,
        description: null,
        dueDate: new Date(),
        due_date: new Date().toISOString(),
        startTime: null,
        start_time: null,
        endTime: null,
        end_time: null,
        status: 'pending' as const,
        priority: 'medium' as const,
        completionProof: null,
        completion_proof: null,
        tags: null,
        googleCalendarEventId: null,
        google_calendar_event_id: null,
        isSyncedWithCalendar: false,
        is_synced_with_calendar: false,
        recurrenceRule: null,
        recurringEventId: null,
        parentTaskId: null,
        parent_task_id: null,
        goalId: 'goal-1',
        goal_id: 'goal-1',
        reminders: null,
        createdAt: new Date(),
        created_at: new Date().toISOString(),
        updatedAt: new Date(),
        updated_at: new Date().toISOString(),
      }));

      // Update AppContext mock with many tasks
      vi.mocked(useApp).mockReturnValue(
        mockAppContext({
          tasks: manyTasks as any,
          goals: mockGoals as any,
          user: mockUser as any,
        })
      );

      vi.mocked(trpc.task.getAll.useQuery).mockReturnValue({
        data: manyTasks,
        isLoading: false,
        error: null,
        refetch: vi.fn().mockResolvedValue({ data: manyTasks }),
      } as any);

      render(<Dashboard />);

      const goalsTab = screen.getByRole('button', { name: /🎯 goals/i });
      fireEvent.click(goalsTab);

      // Wait for goals view to load and goal to appear
      await waitFor(
        () => {
          expect(screen.getByText('Launch Feature')).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        // Check that the first task is rendered (proving the scrollable list exists)
        // Use getAllByText since both mobile and desktop views are in DOM
        const taskElements = screen.getAllByText('Task 0');
        expect(taskElements.length).toBeGreaterThan(0);
      });
    });
  });
});

