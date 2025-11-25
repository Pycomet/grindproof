import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import Dashboard from '@/app/dashboard/page';
import { mockAppContext } from '../../helpers/app-context-mock';
import type { AppTask } from '@/contexts/AppContext';
import { useApp } from '@/contexts/AppContext';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: '123', email: 'test@test.com' } },
        error: null,
      }),
      signOut: vi.fn(),
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
    syncPendingMutations: vi.fn(),
  }),
}));

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    task: {
      search: { useQuery: vi.fn(() => ({ data: [] })) },
      create: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      update: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      complete: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      skip: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      reschedule: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      delete: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      syncFromCalendar: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
    },
    goal: {
      search: { useQuery: vi.fn(() => ({ data: [] })) },
    },
    integration: {
      getAll: { useQuery: vi.fn(() => ({ data: [], isLoading: false })) },
      getGitHubActivity: { useQuery: vi.fn(() => ({ data: null })) },
      getGoogleCalendarActivity: { useQuery: vi.fn(() => ({ data: null })) },
    },
    conversation: {
      getAll: { useQuery: vi.fn(() => ({ data: [] })) },
      create: { useMutation: vi.fn(() => ({ mutateAsync: vi.fn() })) },
      update: { useMutation: vi.fn(() => ({ mutateAsync: vi.fn() })) },
    },
    accountabilityScore: {
      getAll: { useQuery: vi.fn(() => ({ data: [] })) },
    },
    pattern: {
      getAll: { useQuery: vi.fn(() => ({ data: [] })) },
    },
    dailyCheck: {
      getMorningSchedule: {
        useQuery: vi.fn(() => ({
          data: { tasks: [], calendarEvents: [], hasCalendarIntegration: false },
        })),
      },
      getEveningComparison: {
        useQuery: vi.fn(() => ({
          data: {
            tasks: [],
            stats: { total: 0, completed: 0, pending: 0, skipped: 0, alignmentScore: 0 },
            integrations: { hasGitHub: false, hasCalendar: false },
            existingReflection: null,
          },
        })),
      },
      saveMorningPlan: {
        useMutation: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({ success: true }) })),
      },
      saveEveningReflection: {
        useMutation: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({ success: true }) })),
      },
      refineTasks: {
        useMutation: vi.fn(() => ({ mutateAsync: vi.fn().mockResolvedValue({ tasks: [] }) })),
      },
    },
    notification: {
      getPublicKey: { useQuery: vi.fn(() => ({ data: { publicKey: 'test-key' } })) },
      getSettings: {
        useQuery: vi.fn(() => ({
          data: {
            morningCheckEnabled: true,
            morningCheckTime: '09:00',
            eveningCheckEnabled: true,
            eveningCheckTime: '18:00',
            timezone: 'UTC',
          },
        })),
      },
      getSubscriptions: { useQuery: vi.fn(() => ({ data: [] })) },
      subscribe: { useMutation: vi.fn() },
      unsubscribe: { useMutation: vi.fn() },
      updateSettings: { useMutation: vi.fn() },
      sendTest: { useMutation: vi.fn() },
    },
  },
}));

describe('Task Filters - Next Week and This Month', () => {
  // Helper to switch to tasks view
  const switchToTasksView = async () => {
    await waitFor(() => {
      const tasksTab = screen.queryByText('✓ Tasks');
      if (tasksTab) {
        fireEvent.click(tasksTab);
      }
    });
  };

  const createTask = (title: string, dueDate: Date, status: 'pending' | 'completed' | 'skipped' = 'pending'): AppTask => ({
    id: `task-${title}`,
    user_id: '123',
    title,
    description: null,
    dueDate,
    due_date: dueDate.toISOString(),
    startTime: null,
    start_time: null,
    endTime: null,
    end_time: null,
    reminders: null,
    status,
    priority: 'medium',
    completion_proof: null,
    tags: null,
    google_calendar_event_id: null,
    isSyncedWithCalendar: false,
    is_synced_with_calendar: false,
    recurrenceRule: null,
    recurringEventId: null,
    recurring_event_id: null,
    parent_task_id: null,
    goalId: null,
    goal_id: null,
    createdAt: new Date(),
    created_at: new Date().toISOString(),
    updatedAt: new Date(),
    updated_at: new Date().toISOString(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Next Week Filter', () => {
    it('displays "Next Week" filter option in dropdown', async () => {
      const today = new Date();
      const mockTasks = [createTask('Today Task', today)];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      // Open filter dropdown
      await waitFor(() => {
        const filterButton = screen.getByText(/Filters:/);
        expect(filterButton).toBeInTheDocument();
      });

      const filterButton = screen.getByText(/Filters:/);
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Next Week/)).toBeInTheDocument();
      });
    });

    it('shows correct count for next week tasks in dropdown', async () => {
      const today = new Date();
      const nextWeekStart = new Date(today);
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);
      const nextWeekTask = new Date(nextWeekStart);
      nextWeekTask.setDate(nextWeekTask.getDate() + 2); // 9 days from today

      const mockTasks = [
        createTask('Today', today),
        createTask('Next Week 1', nextWeekTask),
        createTask('Next Week 2', new Date(nextWeekStart.getTime() + 3 * 24 * 60 * 60 * 1000)),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      // Open filter dropdown
      const filterButton = screen.getByText(/Filters:/);
      fireEvent.click(filterButton);

      await waitFor(() => {
        const nextWeekLabel = screen.getByLabelText(/Next Week/);
        expect(nextWeekLabel).toBeInTheDocument();
        // Check that the count "2" appears in the label's parent element
        const labelParent = nextWeekLabel.closest('label');
        expect(labelParent?.textContent).toContain('2');
      });
    });

    it('filters tasks for next week when selected in dropdown', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const nextWeekStart = new Date(today);
      nextWeekStart.setDate(nextWeekStart.getDate() + 7);
      
      const nextWeekTask = new Date(nextWeekStart);
      nextWeekTask.setDate(nextWeekTask.getDate() + 2);

      const mockTasks = [
        createTask('Today Task', today),
        createTask('Next Week Task', nextWeekTask),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      // Open filter dropdown
      const filterButton = screen.getByText(/Filters:/);
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Next Week/)).toBeInTheDocument();
      });

      // Uncheck "All Tasks" first
      const allTasksCheckbox = screen.getByLabelText(/All Tasks/);
      fireEvent.click(allTasksCheckbox);

      // Check "Next Week"
      const nextWeekCheckbox = screen.getByLabelText(/Next Week/);
      fireEvent.click(nextWeekCheckbox);

      // Close dropdown
      fireEvent.click(document.body);

      // Wait for the filter to apply and verify Next Week tasks are shown
      await waitFor(() => {
        expect(screen.getByText('Next Week Task')).toBeInTheDocument();
      });
      
      // Today task should not be visible
      expect(screen.queryByText('Today Task')).not.toBeInTheDocument();
    });

    it('excludes skipped tasks from next week count', async () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 9);

      const mockTasks = [
        createTask('Pending Next Week', nextWeek, 'pending'),
        createTask('Skipped Next Week', nextWeek, 'skipped'),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      // Open filter dropdown
      const filterButton = screen.getByText(/Filters:/);
      fireEvent.click(filterButton);

      await waitFor(() => {
        const nextWeekLabel = screen.getByLabelText(/Next Week/);
        const labelParent = nextWeekLabel.closest('label');
        expect(labelParent?.textContent).toContain('1');
      });
    });
  });

  describe('This Month Filter', () => {
    it('displays "This Month" filter option in dropdown', async () => {
      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: [] }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      // Open filter dropdown
      const filterButton = screen.getByText(/Filters:/);
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/This Month/)).toBeInTheDocument();
      });
    });

    it('shows correct count for this month tasks', async () => {
      const today = new Date();
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      const mockTasks = [
        createTask('Today', today),
        createTask('End of Month', endOfMonth),
        createTask('Next Month', new Date(today.getFullYear(), today.getMonth() + 1, 5)),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      // Open filter dropdown
      const filterButton = screen.getByText(/Filters:/);
      fireEvent.click(filterButton);

      await waitFor(() => {
        const monthLabel = screen.getByLabelText(/This Month/);
        const labelParent = monthLabel.closest('label');
        // Should count tasks from today until end of month (2 tasks)
        expect(labelParent?.textContent).toContain('2');
      });
    });

    it('filters tasks for this month when selected in dropdown', async () => {
      const today = new Date();
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 5);

      const mockTasks = [
        createTask('This Month Task', endOfMonth),
        createTask('Next Month Task', nextMonth),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      // Open filter dropdown
      const filterButton = screen.getByText(/Filters:/);
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/This Month/)).toBeInTheDocument();
      });

      // Uncheck "All Tasks"
      const allTasksCheckbox = screen.getByLabelText(/All Tasks/);
      fireEvent.click(allTasksCheckbox);

      // Check "This Month"
      const monthCheckbox = screen.getByLabelText(/This Month/);
      fireEvent.click(monthCheckbox);

      // Close dropdown
      fireEvent.click(document.body);

      await waitFor(() => {
        expect(screen.getByText('This Month Task')).toBeInTheDocument();
      });
      expect(screen.queryByText('Next Month Task')).not.toBeInTheDocument();
    });

    it('includes all remaining days of current month', async () => {
      const today = new Date(2024, 0, 15); // January 15, 2024
      const jan20 = new Date(2024, 0, 20);
      const jan31 = new Date(2024, 0, 31);
      const feb1 = new Date(2024, 1, 1);

      const mockTasks = [
        createTask('Jan 20', jan20),
        createTask('Jan 31', jan31),
        createTask('Feb 1', feb1),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      // Mock Date.now() to return our test date
      const originalDate = global.Date;
      global.Date = class extends originalDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(2024, 0, 15);
          } else {
            super(...args);
          }
        }
        static now() {
          return new originalDate(2024, 0, 15).getTime();
        }
      } as any;

      render(<Dashboard />);
      await switchToTasksView();

      // Open filter dropdown
      const filterButton = screen.getByText(/Filters:/);
      fireEvent.click(filterButton);

      await waitFor(() => {
        const monthLabel = screen.getByLabelText(/This Month/);
        const labelParent = monthLabel.closest('label');
        // Should count only January tasks (2)
        expect(labelParent?.textContent).toContain('2');
      });

      global.Date = originalDate;
    });

    it('excludes skipped tasks from month count', async () => {
      const today = new Date();
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      const mockTasks = [
        createTask('Pending This Month', endOfMonth, 'pending'),
        createTask('Skipped This Month', endOfMonth, 'skipped'),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      // Open filter dropdown
      const filterButton = screen.getByText(/Filters:/);
      fireEvent.click(filterButton);

      await waitFor(() => {
        const monthLabel = screen.getByLabelText(/This Month/);
        const labelParent = monthLabel.closest('label');
        expect(labelParent?.textContent).toContain('1');
      });
    });
  });

  describe('Filter Combination', () => {
    it('shows all filters in correct order in dropdown', async () => {
      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: [] }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      // Open filter dropdown
      const filterButton = screen.getByText(/Filters:/);
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/All Tasks/)).toBeInTheDocument();
        expect(screen.getByLabelText(/^Today/)).toBeInTheDocument();
        expect(screen.getByLabelText(/This Week/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Next Week/)).toBeInTheDocument();
        expect(screen.getByLabelText(/This Month/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Overdue/)).toBeInTheDocument();
        expect(screen.getByLabelText(/Skipped/)).toBeInTheDocument();
      });
    });

    it('switches between filters correctly using dropdown', async () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 9);

      const mockTasks = [
        createTask('Today Task', today),
        createTask('Next Week Task', nextWeek),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      // Initially should show all tasks (default "All" filter)
      await waitFor(() => {
        expect(screen.getByText('Today Task')).toBeInTheDocument();
        expect(screen.getByText('Next Week Task')).toBeInTheDocument();
      });

      // Open dropdown and switch to Next Week only
      const filterButton = screen.getByText(/Filters:/);
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByLabelText(/Next Week/)).toBeInTheDocument();
      });

      // Uncheck "All Tasks"
      const allTasksCheckbox = screen.getByLabelText(/All Tasks/);
      fireEvent.click(allTasksCheckbox);

      // Check "Next Week"
      const nextWeekCheckbox = screen.getByLabelText(/Next Week/);
      fireEvent.click(nextWeekCheckbox);

      // Close dropdown
      fireEvent.click(document.body);

      // Wait for the filter to apply and verify Next Week tasks are shown
      await waitFor(() => {
        expect(screen.getByText('Next Week Task')).toBeInTheDocument();
      });
      
      // Today task should not be visible
      expect(screen.queryByText('Today Task')).not.toBeInTheDocument();
    });
  });
});

