import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from '@/app/dashboard/page';
import { mockAppContext } from '../../helpers/app-context-mock';
import type { AppTask } from '@/contexts/AppContext';
import { useApp } from '@/contexts/AppContext';
import { useNotificationsMock, useOfflineSyncMock } from '../../helpers/dashboard-mocks';

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

// Use shared dashboard mocks
vi.mock('@/hooks/useOfflineSync', () => ({
  useOfflineSync: () => useOfflineSyncMock,
}));

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => useNotificationsMock,
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
      create: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      update: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      delete: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
    },
    integration: {
      getAll: { useQuery: vi.fn(() => ({ data: [], isLoading: false })) },
      getByServiceType: { useQuery: vi.fn(() => ({ data: null })) },
      getGitHubActivity: { useQuery: vi.fn(() => ({ data: null })) },
      getGoogleCalendarActivity: { useQuery: vi.fn(() => ({ data: null })) },
    },
    evidence: {
      getByTaskId: { useQuery: vi.fn(() => ({ data: [], refetch: vi.fn() })) },
      create: { useMutation: vi.fn(() => ({ mutateAsync: vi.fn() })) },
      validateEvidence: { useMutation: vi.fn(() => ({ mutateAsync: vi.fn() })) },
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

describe('Task UX Improvements', () => {
  const switchToTasksView = async () => {
    await waitFor(() => {
      const tasksTab = screen.queryByText('✓ Tasks');
      if (tasksTab) {
        fireEvent.click(tasksTab);
      }
    });
  };

  const createTask = (
    title: string,
    priority: 'high' | 'medium' | 'low' = 'medium',
    dueDate?: Date | null,
    status: 'pending' | 'completed' | 'skipped' = 'pending'
  ): AppTask => ({
    id: `task-${title}`,
    user_id: '123',
    title,
    description: null,
    dueDate: dueDate || null,
    due_date: dueDate?.toISOString() || null,
    startTime: null,
    start_time: null,
    endTime: null,
    end_time: null,
    reminders: null,
    status,
    priority,
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

  describe('Default "All" Filter', () => {
    it('shows all tasks by default including tasks without due dates', async () => {
      const today = new Date();
      const mockTasks = [
        createTask('Task with date', 'medium', today),
        createTask('Task without date', 'medium', null),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        expect(screen.getByText('Task with date')).toBeInTheDocument();
        expect(screen.getByText('Task without date')).toBeInTheDocument();
      });
    });

    it('displays "All Tasks" in the filter dropdown by default', async () => {
      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: [] }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        expect(screen.getByText(/Filters: All Tasks/)).toBeInTheDocument();
      });
    });
  });

  describe('Priority Visual Indicators', () => {
    it('displays HIGH badge for high priority tasks', async () => {
      const mockTasks = [
        createTask('High Priority Task', 'high', new Date()),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        expect(screen.getByText('HIGH')).toBeInTheDocument();
      });
    });

    it('displays MED badge for medium priority tasks', async () => {
      const mockTasks = [
        createTask('Medium Priority Task', 'medium', new Date()),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        expect(screen.getByText('MED')).toBeInTheDocument();
      });
    });

    it('displays LOW badge for low priority tasks', async () => {
      const mockTasks = [
        createTask('Low Priority Task', 'low', new Date()),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        expect(screen.getByText('LOW')).toBeInTheDocument();
      });
    });

    it('does not display priority badges for completed tasks', async () => {
      const mockTasks = [
        createTask('Completed High Task', 'high', new Date(), 'completed'),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        expect(screen.getByText('Completed High Task')).toBeInTheDocument();
      });
      expect(screen.queryByText('HIGH')).not.toBeInTheDocument();
    });
  });

  describe('No Due Date Badge', () => {
    it('displays "No due date" badge for tasks without due dates', async () => {
      const mockTasks = [
        createTask('Task without date', 'medium', null),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        expect(screen.getByText('📌 No due date')).toBeInTheDocument();
      });
    });

    it('does not display "No due date" badge for tasks with due dates', async () => {
      const mockTasks = [
        createTask('Task with date', 'medium', new Date()),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        expect(screen.getByText('Task with date')).toBeInTheDocument();
      });
      expect(screen.queryByText('📌 No due date')).not.toBeInTheDocument();
    });
  });

  describe('Multi-Select Filter Dropdown', () => {
    it('opens filter dropdown when clicked', async () => {
      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: [] }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        const filterButton = screen.getByText(/Filters:/);
        expect(filterButton).toBeInTheDocument();
      });

      const filterButton = screen.getByText(/Filters:/);
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText('Select filters (multiple allowed)')).toBeInTheDocument();
      });
    });

    it('displays all filter options with counts', async () => {
      const today = new Date();
      const mockTasks = [
        createTask('Today Task', 'medium', today),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

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

    it('allows selecting multiple filters', async () => {
      const today = new Date();
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 9);

      const mockTasks = [
        createTask('Today Task', 'medium', today),
        createTask('Next Week Task', 'medium', nextWeek),
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
        expect(screen.getByLabelText(/^Today/)).toBeInTheDocument();
      });

      // Uncheck "All Tasks"
      const allTasksCheckbox = screen.getByLabelText(/All Tasks/);
      fireEvent.click(allTasksCheckbox);

      // Check "Today" and "Next Week"
      const todayCheckbox = screen.getByLabelText(/^Today/);
      const nextWeekCheckbox = screen.getByLabelText(/Next Week/);
      fireEvent.click(todayCheckbox);
      fireEvent.click(nextWeekCheckbox);

      // Close dropdown by clicking outside
      fireEvent.click(document.body);

      await waitFor(() => {
        expect(screen.getByText(/Filters: 2 Filters/)).toBeInTheDocument();
      });
    });
  });

  describe('Focus Mode', () => {
    it('displays focus mode toggle button', async () => {
      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: [] }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        expect(screen.getByText(/Show All Tasks/)).toBeInTheDocument();
      });
    });

    it('changes button text when focus mode is activated', async () => {
      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: [] }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      const focusButton = screen.getByText(/Show All Tasks/);
      fireEvent.click(focusButton);

      await waitFor(() => {
        expect(screen.getByText(/Focus: High Priority & Today/)).toBeInTheDocument();
      });
    });

    it('shows only high priority and today tasks when focus mode is active', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const mockTasks = [
        createTask('High Priority Task', 'high', tomorrow),
        createTask('Today Low Priority', 'low', today),
        createTask('Tomorrow Low Priority', 'low', tomorrow),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      // Activate focus mode
      const focusButton = screen.getByText(/Show All Tasks/);
      fireEvent.click(focusButton);

      await waitFor(() => {
        expect(screen.getByText('High Priority Task')).toBeInTheDocument();
        expect(screen.getByText('Today Low Priority')).toBeInTheDocument();
      });

      // Tomorrow low priority should not be visible
      expect(screen.queryByText('Tomorrow Low Priority')).not.toBeInTheDocument();
    });
  });

  describe('Add Task Button', () => {
    it('displays "+ Add Task" button in header', async () => {
      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: [] }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Add Task/ })).toBeInTheDocument();
      });
    });

    it('opens create task dialog when "+ Add Task" is clicked', async () => {
      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: [] }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      const addButton = screen.getByRole('button', { name: /Add Task/ });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText('Create New Task')).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('opens create task dialog when Cmd+K is pressed', async () => {
      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: [] }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      // Simulate Cmd+K keypress
      fireEvent.keyDown(document, { key: 'k', metaKey: true });

      await waitFor(() => {
        expect(screen.getByText('Create New Task')).toBeInTheDocument();
      });
    });

    it('focuses search input when Cmd+/ is pressed', async () => {
      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: [] }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      const searchInput = screen.getByPlaceholderText('Search tasks...');

      // Simulate Cmd+/ keypress
      fireEvent.keyDown(document, { key: '/', metaKey: true });

      await waitFor(() => {
        expect(document.activeElement).toBe(searchInput);
      });
    });

    it('does not trigger shortcuts when typing in input', async () => {
      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: [] }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      const searchInput = screen.getByPlaceholderText('Search tasks...');
      searchInput.focus();

      // Simulate Cmd+K while focused on input
      fireEvent.keyDown(searchInput, { key: 'k', metaKey: true });

      // Dialog should not open
      await waitFor(() => {
        expect(screen.queryByText('Create New Task')).not.toBeInTheDocument();
      });
    });
  });

  describe('Mobile Responsive Layout', () => {
    it('renders task list without errors on mobile viewport', async () => {
      // Set mobile viewport
      global.innerWidth = 375;
      global.innerHeight = 667;

      const mockTasks = [
        createTask('Mobile Task', 'high', new Date()),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        expect(screen.getByText('Mobile Task')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('displays empty state when no tasks exist', async () => {
      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: [] }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        expect(screen.getByText('No tasks yet')).toBeInTheDocument();
        expect(screen.getByText(/Add your first task to get started/)).toBeInTheDocument();
      });
    });

    it('shows "+ Add Task" button in empty state', async () => {
      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: [] }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);
      await switchToTasksView();

      await waitFor(() => {
        const addButtons = screen.getAllByRole('button', { name: /Add Task/ });
        expect(addButtons.length).toBeGreaterThan(0);
      });
    });
  });
});

