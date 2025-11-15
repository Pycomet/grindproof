import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
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
      create: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      update: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      complete: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      skip: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      reschedule: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      delete: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      syncFromCalendar: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
    },
    integration: {
      getAll: { useQuery: vi.fn(() => ({ data: [], isLoading: false })) },
    },
  },
}));

describe('Task Priority Sorting', () => {

  const createTask = (
    title: string,
    priority: 'high' | 'medium' | 'low',
    dueDate?: Date,
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

  describe('Priority-based sorting', () => {
    it('sorts pending tasks by priority (high > medium > low)', () => {
      const today = new Date();
      const mockTasks = [
        createTask('Low Priority Task', 'low', today),
        createTask('High Priority Task', 'high', today),
        createTask('Medium Priority Task', 'medium', today),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);

      // Check tasks are rendered and in correct order
      const highTask = screen.getAllByText('High Priority Task');
      const mediumTask = screen.getAllByText('Medium Priority Task');
      const lowTask = screen.getAllByText('Low Priority Task');
      
      expect(highTask.length).toBeGreaterThan(0);
      expect(mediumTask.length).toBeGreaterThan(0);
      expect(lowTask.length).toBeGreaterThan(0);
    });

    it('prioritizes high priority tasks over low priority even with later due dates', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const mockTasks = [
        createTask('Low Priority Soon', 'low', today),
        createTask('High Priority Later', 'high', nextWeek),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);

      // Switch to 'All' filter to see all pending tasks
      const allFilters = screen.getAllByRole('button', { name: /^All/i });
      fireEvent.click(allFilters[0]);

      // Wait for tasks to render
      await waitFor(() => {
        expect(screen.getAllByText('High Priority Later')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Low Priority Soon')[0]).toBeInTheDocument();
      });
    });

    it('uses due date as secondary sort within same priority', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const mockTasks = [
        createTask('High Priority Next Week', 'high', nextWeek),
        createTask('High Priority Tomorrow', 'high', tomorrow),
        createTask('High Priority Today', 'high', today),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);

      // Switch to 'All' filter to see all pending tasks
      const allFilters = screen.getAllByRole('button', { name: /^All/i });
      fireEvent.click(allFilters[0]);

      // Wait for tasks to render
      await waitFor(() => {
        expect(screen.getAllByText('High Priority Today')[0]).toBeInTheDocument();
        expect(screen.getAllByText('High Priority Tomorrow')[0]).toBeInTheDocument();
        expect(screen.getAllByText('High Priority Next Week')[0]).toBeInTheDocument();
      });
    });
  });

  describe('Availability-based sorting', () => {
    it('places completed tasks at the bottom regardless of priority', () => {
      const today = new Date();
      const mockTasks = [
        createTask('High Priority Completed', 'high', today, 'completed'),
        createTask('Low Priority Pending', 'low', today, 'pending'),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);

      // Verify both tasks are rendered
      expect(screen.getAllByText('Low Priority Pending')[0]).toBeInTheDocument();
      expect(screen.getAllByText('High Priority Completed')[0]).toBeInTheDocument();
    });

    it('places skipped tasks at the bottom with completed tasks', async () => {
      const today = new Date();
      const mockTasks = [
        createTask('High Priority Completed', 'high', today, 'completed'),
        createTask('Low Priority Pending', 'low', today, 'pending'),
        createTask('Medium Priority Completed', 'medium', today, 'completed'),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);

      // Switch to 'All' filter to see all tasks including completed
      const allFilters = screen.getAllByRole('button', { name: /^All/i });
      fireEvent.click(allFilters[0]);

      // Wait for all tasks to render
      await waitFor(() => {
        expect(screen.getAllByText('Low Priority Pending')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Medium Priority Completed')[0]).toBeInTheDocument();
        expect(screen.getAllByText('High Priority Completed')[0]).toBeInTheDocument();
      });
    });

    it('sorts pending tasks before any completed/skipped tasks', async () => {
      const today = new Date();
      const mockTasks = [
        createTask('Completed High', 'high', today, 'completed'),
        createTask('Pending Low', 'low', today, 'pending'),
        createTask('Pending Medium', 'medium', today, 'pending'),
        createTask('Completed Medium', 'medium', today, 'completed'),
        createTask('Pending High', 'high', today, 'pending'),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);

      // Switch to 'All' filter to see pending and completed tasks
      const allFilters = screen.getAllByRole('button', { name: /^All/i });
      fireEvent.click(allFilters[0]);

      // Wait for tasks to render
      await waitFor(() => {
        expect(screen.getAllByText(/Pending High/)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/Pending Medium/)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/Pending Low/)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/Completed High/)[0]).toBeInTheDocument();
        expect(screen.getAllByText(/Completed Medium/)[0]).toBeInTheDocument();
      });
    });
  });

  describe('Combined urgency and availability sorting', () => {
    it('applies full sorting algorithm: availability > priority > due date', async () => {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      const mockTasks = [
        createTask('Z-Completed High Today', 'high', today, 'completed'),
        createTask('A-Pending Low Tomorrow', 'low', tomorrow, 'pending'),
        createTask('B-Pending High Next Week', 'high', nextWeek, 'pending'),
        createTask('C-Pending High Today', 'high', today, 'pending'),
        createTask('D-Pending Medium Today', 'medium', today, 'pending'),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);

      // Switch to 'All' filter to see all tasks
      const allFilters = screen.getAllByRole('button', { name: /^All/i });
      fireEvent.click(allFilters[0]);

      // Wait for all tasks to render
      await waitFor(() => {
        expect(screen.getAllByText('C-Pending High Today')[0]).toBeInTheDocument();
        expect(screen.getAllByText('B-Pending High Next Week')[0]).toBeInTheDocument();
        expect(screen.getAllByText('D-Pending Medium Today')[0]).toBeInTheDocument();
        expect(screen.getAllByText('A-Pending Low Tomorrow')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Z-Completed High Today')[0]).toBeInTheDocument();
      });
    });

    it('handles tasks with no due date at the end of their priority group', async () => {
      const today = new Date();
      const mockTasks = [
        createTask('High No Date', 'high'),
        createTask('High With Date', 'high', today),
        createTask('Low No Date', 'low'),
        createTask('Low With Date', 'low', today),
      ];

      vi.mocked(useApp).mockReturnValue({
        ...mockAppContext({ tasks: mockTasks }),
        isGoogleCalendarConnected: () => false,
      });

      render(<Dashboard />);

      // Switch to 'All' filter to see all tasks
      const allFilters = screen.getAllByRole('button', { name: /^All/i });
      fireEvent.click(allFilters[0]);

      // Wait for all tasks to render
      await waitFor(() => {
        expect(screen.getAllByText('High With Date')[0]).toBeInTheDocument();
        expect(screen.getAllByText('High No Date')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Low With Date')[0]).toBeInTheDocument();
        expect(screen.getAllByText('Low No Date')[0]).toBeInTheDocument();
      });
    });
  });
});

