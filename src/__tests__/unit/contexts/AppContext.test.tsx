import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { trpc } from '@/lib/trpc/client';
import * as offlineStorageModule from '@/lib/offline/storage';

// Mock dependencies
vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    task: {
      getAll: {
        useQuery: vi.fn(),
      },
    },
    goal: {
      getAll: {
        useQuery: vi.fn(),
      },
    },
    integration: {
      getAll: {
        useQuery: vi.fn(),
      },
    },
  },
}));

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      }),
    },
  },
}));

vi.mock('@/lib/offline/storage', () => ({
  offlineStorage: {
    saveTasks: vi.fn().mockResolvedValue(undefined),
    saveGoals: vi.fn().mockResolvedValue(undefined),
    saveIntegrations: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('AppContext', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();

    // Mock tRPC queries to return empty data initially
    vi.mocked(trpc.task.getAll.useQuery).mockReturnValue({
      data: undefined,
      refetch: vi.fn().mockResolvedValue({ data: [] }),
    } as any);

    vi.mocked(trpc.goal.getAll.useQuery).mockReturnValue({
      data: undefined,
      refetch: vi.fn().mockResolvedValue({ data: [] }),
    } as any);

    vi.mocked(trpc.integration.getAll.useQuery).mockReturnValue({
      data: undefined,
      refetch: vi.fn().mockResolvedValue({ data: [] }),
    } as any);
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Initialization and Hydration', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      expect(result.current.tasks).toEqual([]);
      expect(result.current.goals).toEqual([]);
      expect(result.current.integrations).toEqual([]);
      expect(result.current.user).toBeDefined(); // User might be null initially
      expect(result.current.syncStatus).toBe('idle');
    });

    it('should hydrate from localStorage on mount', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Test Task',
          status: 'pending',
          dueDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      localStorage.setItem('grindproof_tasks', JSON.stringify(mockTasks));

      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      expect(result.current.tasks.length).toBeGreaterThan(0);
    });

    it('should set isLoading to false after hydration', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('Task Management', () => {
    it('should add a task optimistically', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      const newTask = {
        id: 'new-task',
        title: 'New Task',
        status: 'pending' as const,
        dueDate: new Date(),
        startTime: null,
        endTime: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isSyncedWithCalendar: false,
        reminders: null,
        goalId: null,
        goal_id: null,
      } as any;

      act(() => {
        result.current.addTask(newTask);
      });

      expect(result.current.tasks).toContainEqual(expect.objectContaining({ id: 'new-task' }));
      expect(localStorage.getItem('grindproof_tasks')).toContain('new-task');
    });

    it('should update a task optimistically', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      const task = {
        id: 'task-1',
        title: 'Original Title',
        status: 'pending' as const,
        dueDate: null,
        startTime: null,
        endTime: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isSyncedWithCalendar: false,
        reminders: null,
        goalId: null,
        goal_id: null,
      } as any;

      act(() => {
        result.current.addTask(task);
      });

      act(() => {
        result.current.updateTask('task-1', { title: 'Updated Title' });
      });

      const updatedTask = result.current.tasks.find(t => t.id === 'task-1');
      expect(updatedTask?.title).toBe('Updated Title');
    });

    it('should delete a task optimistically', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      const task = {
        id: 'task-to-delete',
        title: 'Task to Delete',
        status: 'pending' as const,
        dueDate: null,
        startTime: null,
        endTime: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isSyncedWithCalendar: false,
        reminders: null,
        goalId: null,
        goal_id: null,
      } as any;

      act(() => {
        result.current.addTask(task);
      });

      expect(result.current.tasks).toContainEqual(expect.objectContaining({ id: 'task-to-delete' }));

      act(() => {
        result.current.deleteTask('task-to-delete');
      });

      expect(result.current.tasks).not.toContainEqual(expect.objectContaining({ id: 'task-to-delete' }));
    });

    it('should return rollback function for addTask', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      const task = {
        id: 'rollback-task',
        title: 'Rollback Task',
        status: 'pending' as const,
        dueDate: null,
        startTime: null,
        endTime: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isSyncedWithCalendar: false,
        reminders: null,
        goalId: null,
        goal_id: null,
      } as any;

      let rollback: (() => void) | undefined;

      act(() => {
        rollback = result.current.addTask(task);
      });

      expect(result.current.tasks).toContainEqual(expect.objectContaining({ id: 'rollback-task' }));

      act(() => {
        rollback?.();
      });

      expect(result.current.tasks).not.toContainEqual(expect.objectContaining({ id: 'rollback-task' }));
    });
  });

  describe('Goal Management', () => {
    it('should add a goal optimistically', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      const newGoal = {
        id: 'new-goal',
        title: 'New Goal',
        status: 'active' as const,
        priority: 'high' as const,
        targetDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      act(() => {
        result.current.addGoal(newGoal);
      });

      expect(result.current.goals).toContainEqual(expect.objectContaining({ id: 'new-goal' }));
      expect(localStorage.getItem('grindproof_goals')).toContain('new-goal');
    });

    it('should update a goal optimistically', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      const goal = {
        id: 'goal-1',
        title: 'Original Goal',
        status: 'active' as const,
        priority: 'medium' as const,
        targetDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      act(() => {
        result.current.addGoal(goal);
      });

      act(() => {
        result.current.updateGoal('goal-1', { title: 'Updated Goal' });
      });

      const updatedGoal = result.current.goals.find(g => g.id === 'goal-1');
      expect(updatedGoal?.title).toBe('Updated Goal');
    });

    it('should delete a goal optimistically', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      const goal = {
        id: 'goal-to-delete',
        title: 'Goal to Delete',
        status: 'active' as const,
        priority: 'low' as const,
        targetDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any;

      act(() => {
        result.current.addGoal(goal);
      });

      act(() => {
        result.current.deleteGoal('goal-to-delete');
      });

      expect(result.current.goals).not.toContainEqual(expect.objectContaining({ id: 'goal-to-delete' }));
    });
  });

  describe('Sync Status Management', () => {
    it('should update sync status', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      expect(result.current.syncStatus).toBe('idle');

      act(() => {
        result.current.setSyncStatus('syncing');
      });

      expect(result.current.syncStatus).toBe('syncing');

      act(() => {
        result.current.setSyncStatus('synced');
      });

      expect(result.current.syncStatus).toBe('synced');
    });

    it('should handle refreshAll and update sync status', async () => {
      const mockRefetchTasks = vi.fn().mockResolvedValue({ data: [] });
      const mockRefetchGoals = vi.fn().mockResolvedValue({ data: [] });
      const mockRefetchIntegrations = vi.fn().mockResolvedValue({ data: [] });

      vi.mocked(trpc.task.getAll.useQuery).mockReturnValue({
        data: [],
        refetch: mockRefetchTasks,
      } as any);

      vi.mocked(trpc.goal.getAll.useQuery).mockReturnValue({
        data: [],
        refetch: mockRefetchGoals,
      } as any);

      vi.mocked(trpc.integration.getAll.useQuery).mockReturnValue({
        data: [],
        refetch: mockRefetchIntegrations,
      } as any);

      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      await act(async () => {
        await result.current.refreshAll();
      });

      expect(mockRefetchTasks).toHaveBeenCalled();
      expect(mockRefetchGoals).toHaveBeenCalled();
      expect(mockRefetchIntegrations).toHaveBeenCalled();
    });
  });

  describe('localStorage Persistence', () => {
    it('should persist tasks to localStorage on add', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      const task = {
        id: 'persist-task',
        title: 'Persist Task',
        status: 'pending' as const,
        dueDate: null,
        startTime: null,
        endTime: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isSyncedWithCalendar: false,
        reminders: null,
        goalId: null,
        goal_id: null,
      } as any;

      act(() => {
        result.current.addTask(task);
      });

      const storedTasks = localStorage.getItem('grindproof_tasks');
      expect(storedTasks).toBeTruthy();
      expect(storedTasks).toContain('persist-task');
    });

    it('should clear localStorage on user sign out', async () => {
      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      // Add some data
      const task = {
        id: 'task-1',
        title: 'Task 1',
        status: 'pending' as const,
        dueDate: null,
        startTime: null,
        endTime: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        isSyncedWithCalendar: false,
        reminders: null,
        goalId: null,
        goal_id: null,
      } as any;

      act(() => {
        result.current.addTask(task);
      });

      expect(localStorage.getItem('grindproof_tasks')).toBeTruthy();

      // Sign out
      act(() => {
        result.current.setUser(null);
      });

      expect(localStorage.getItem('grindproof_tasks')).toBeNull();
      expect(localStorage.getItem('grindproof_goals')).toBeNull();
      expect(localStorage.getItem('grindproof_integrations')).toBeNull();
    });
  });

  describe('Data Transformation', () => {
    it('should handle tasks from tRPC with camelCase fields', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Test Task',
          status: 'pending',
          dueDate: '2024-01-01',
          startTime: '2024-01-01T10:00:00Z',
          endTime: '2024-01-01T11:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          isSyncedWithCalendar: true,
          reminders: ['15min'],
          goalId: 'goal-1',
        },
      ];

      vi.mocked(trpc.task.getAll.useQuery).mockReturnValue({
        data: mockTasks,
        refetch: vi.fn().mockResolvedValue({ data: mockTasks }),
      } as any);

      const { result } = renderHook(() => useApp(), {
        wrapper: AppProvider,
      });

      await waitFor(() => {
        expect(result.current.isHydrated).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.tasks.length).toBeGreaterThan(0);
      });

      const task = result.current.tasks[0];
      expect(task.dueDate).toBeInstanceOf(Date);
      expect(task.isSyncedWithCalendar).toBe(true);
      expect(task.goalId).toBe('goal-1');
    });
  });
});

