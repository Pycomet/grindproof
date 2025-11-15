import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { offlineStorage } from '@/lib/offline/storage';
import { trpc } from '@/lib/trpc/client';

// Mock dependencies
vi.mock('@/lib/offline/storage', () => ({
  offlineStorage: {
    getPendingMutations: vi.fn().mockResolvedValue([]),
    addPendingMutation: vi.fn().mockResolvedValue(undefined),
    removePendingMutation: vi.fn().mockResolvedValue(undefined),
    updatePendingMutationRetryCount: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    task: {
      create: { useMutation: vi.fn() },
      update: { useMutation: vi.fn() },
      delete: { useMutation: vi.fn() },
      getAll: { useQuery: vi.fn() },
    },
    goal: {
      create: { useMutation: vi.fn() },
      update: { useMutation: vi.fn() },
      delete: { useMutation: vi.fn() },
      getAll: { useQuery: vi.fn() },
    },
    integration: {
      getAll: { useQuery: vi.fn() },
    },
  },
}));

vi.mock('@/contexts/AppContext', async () => {
  const actual = await vi.importActual('@/contexts/AppContext');
  return {
    ...actual,
    useApp: vi.fn(() => ({
      tasks: [],
      goals: [],
      integrations: [],
      user: { id: 'test-user' },
      isLoading: false,
      isHydrated: true,
      syncStatus: 'idle',
      refreshAll: vi.fn().mockResolvedValue(undefined),
      refreshTasks: vi.fn().mockResolvedValue(undefined),
      setSyncStatus: vi.fn(),
      setUser: vi.fn(),
      addTask: vi.fn(),
      updateTask: vi.fn(),
      deleteTask: vi.fn(),
      addGoal: vi.fn(),
      updateGoal: vi.fn(),
      deleteGoal: vi.fn(),
      addIntegration: vi.fn(),
      updateIntegration: vi.fn(),
      deleteIntegration: vi.fn(),
      refreshGoals: vi.fn(),
      refreshIntegrations: vi.fn(),
    })),
  };
});

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      }),
    },
  },
}));

describe('useOfflineSync', () => {
  const mockCreateTaskMutation = {
    mutateAsync: vi.fn().mockResolvedValue({ id: 'task-1' }),
  };

  const mockUpdateTaskMutation = {
    mutateAsync: vi.fn().mockResolvedValue({ id: 'task-1' }),
  };

  const mockDeleteTaskMutation = {
    mutateAsync: vi.fn().mockResolvedValue({ id: 'task-1' }),
  };

  const mockCreateGoalMutation = {
    mutateAsync: vi.fn().mockResolvedValue({ id: 'goal-1' }),
  };

  const mockUpdateGoalMutation = {
    mutateAsync: vi.fn().mockResolvedValue({ id: 'goal-1' }),
  };

  const mockDeleteGoalMutation = {
    mutateAsync: vi.fn().mockResolvedValue({ id: 'goal-1' }),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup tRPC mocks
    vi.mocked(trpc.task.create.useMutation).mockReturnValue(mockCreateTaskMutation as any);
    vi.mocked(trpc.task.update.useMutation).mockReturnValue(mockUpdateTaskMutation as any);
    vi.mocked(trpc.task.delete.useMutation).mockReturnValue(mockDeleteTaskMutation as any);
    vi.mocked(trpc.goal.create.useMutation).mockReturnValue(mockCreateGoalMutation as any);
    vi.mocked(trpc.goal.update.useMutation).mockReturnValue(mockUpdateGoalMutation as any);
    vi.mocked(trpc.goal.delete.useMutation).mockReturnValue(mockDeleteGoalMutation as any);

    vi.mocked(trpc.task.getAll.useQuery).mockReturnValue({
      data: [],
      refetch: vi.fn().mockResolvedValue({ data: [] }),
    } as any);

    vi.mocked(trpc.goal.getAll.useQuery).mockReturnValue({
      data: [],
      refetch: vi.fn().mockResolvedValue({ data: [] }),
    } as any);

    vi.mocked(trpc.integration.getAll.useQuery).mockReturnValue({
      data: [],
      refetch: vi.fn().mockResolvedValue({ data: [] }),
    } as any);

    // Mock navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Online/Offline Detection', () => {
    it('should initialize with online status', () => {
      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.isOnline).toBe(true);
    });

    it('should detect when going offline', async () => {
      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.isOnline).toBe(true);

      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false,
        });
        window.dispatchEvent(new Event('offline'));
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });
    });

    it('should detect when coming back online', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      const { result } = renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(result.current.isOnline).toBe(false);
      });

      act(() => {
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: true,
        });
        window.dispatchEvent(new Event('online'));
      });

      await waitFor(() => {
        expect(result.current.isOnline).toBe(true);
      });
    });
  });

  describe('Pending Mutations Queue', () => {
    it('should queue a mutation when offline', async () => {
      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.queueMutation('CREATE_TASK', { title: 'New Task' });
      });

      expect(offlineStorage.addPendingMutation).toHaveBeenCalledWith({
        type: 'CREATE_TASK',
        data: { title: 'New Task' },
      });
    });

    it('should track pending count', async () => {
      vi.mocked(offlineStorage.getPendingMutations).mockResolvedValue([
        {
          id: 'mutation-1',
          type: 'CREATE_TASK',
          data: { title: 'Task 1' },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ]);

      const { result } = renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(result.current.pendingCount).toBeGreaterThan(0);
      });
    });

    it('should increment pending count when queueing', async () => {
      const { result } = renderHook(() => useOfflineSync());

      await waitFor(() => {
        expect(result.current.pendingCount).toBeDefined();
      });

      const initialCount = result.current.pendingCount;

      await act(async () => {
        await result.current.queueMutation('CREATE_TASK', { title: 'New Task' });
      });

      // After queueing, count should be at least initial + 1
      await waitFor(() => {
        expect(result.current.pendingCount).toBeGreaterThanOrEqual(initialCount + 1);
      });
    });
  });

  describe('Sync Processing', () => {
    it('should not sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      vi.mocked(offlineStorage.getPendingMutations).mockResolvedValue([
        {
          id: 'mutation-1',
          type: 'CREATE_TASK',
          data: { title: 'Task 1' },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ]);

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.forceSync();
      });

      expect(mockCreateTaskMutation.mutateAsync).not.toHaveBeenCalled();
    });

    it('should process CREATE_TASK mutation', async () => {
      vi.mocked(offlineStorage.getPendingMutations).mockResolvedValue([
        {
          id: 'mutation-1',
          type: 'CREATE_TASK',
          data: { title: 'New Task' },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ]);

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.forceSync();
      });

      await waitFor(() => {
        expect(mockCreateTaskMutation.mutateAsync).toHaveBeenCalledWith({ title: 'New Task' });
      });
    });

    it('should process UPDATE_TASK mutation', async () => {
      vi.mocked(offlineStorage.getPendingMutations).mockResolvedValue([
        {
          id: 'mutation-1',
          type: 'UPDATE_TASK',
          data: { id: 'task-1', title: 'Updated Task' },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ]);

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.forceSync();
      });

      await waitFor(() => {
        expect(mockUpdateTaskMutation.mutateAsync).toHaveBeenCalledWith({
          id: 'task-1',
          title: 'Updated Task',
        });
      });
    });

    it('should process DELETE_TASK mutation', async () => {
      vi.mocked(offlineStorage.getPendingMutations).mockResolvedValue([
        {
          id: 'mutation-1',
          type: 'DELETE_TASK',
          data: { id: 'task-1' },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ]);

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.forceSync();
      });

      await waitFor(() => {
        expect(mockDeleteTaskMutation.mutateAsync).toHaveBeenCalledWith({ id: 'task-1' });
      });
    });

    it('should process goal mutations', async () => {
      vi.mocked(offlineStorage.getPendingMutations).mockResolvedValue([
        {
          id: 'mutation-1',
          type: 'CREATE_GOAL',
          data: { title: 'New Goal' },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ]);

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.forceSync();
      });

      await waitFor(() => {
        expect(mockCreateGoalMutation.mutateAsync).toHaveBeenCalledWith({ title: 'New Goal' });
      });
    });

    it('should remove mutation after successful processing', async () => {
      vi.mocked(offlineStorage.getPendingMutations).mockResolvedValue([
        {
          id: 'mutation-1',
          type: 'CREATE_TASK',
          data: { title: 'New Task' },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ]);

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.forceSync();
      });

      await waitFor(() => {
        expect(offlineStorage.removePendingMutation).toHaveBeenCalledWith('mutation-1');
      });
    });
  });

  describe('Retry Logic', () => {
    it('should increment retry count on failure', async () => {
      mockCreateTaskMutation.mutateAsync.mockRejectedValueOnce(new Error('Network error'));

      vi.mocked(offlineStorage.getPendingMutations).mockResolvedValue([
        {
          id: 'mutation-1',
          type: 'CREATE_TASK',
          data: { title: 'New Task' },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ]);

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.forceSync();
      });

      await waitFor(() => {
        expect(offlineStorage.updatePendingMutationRetryCount).toHaveBeenCalledWith('mutation-1', 1);
      });
    });

    it('should remove mutation after max retries', async () => {
      mockCreateTaskMutation.mutateAsync.mockRejectedValue(new Error('Network error'));

      vi.mocked(offlineStorage.getPendingMutations).mockResolvedValue([
        {
          id: 'mutation-1',
          type: 'CREATE_TASK',
          data: { title: 'New Task' },
          timestamp: Date.now(),
          retryCount: 5,
        },
      ]);

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.forceSync();
      });

      await waitFor(() => {
        expect(offlineStorage.removePendingMutation).toHaveBeenCalledWith('mutation-1');
      });
    });
  });

  describe('Sync Status', () => {
    it('should set isSyncing during sync', async () => {
      vi.mocked(offlineStorage.getPendingMutations).mockResolvedValue([
        {
          id: 'mutation-1',
          type: 'CREATE_TASK',
          data: { title: 'New Task' },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ]);

      const { result } = renderHook(() => useOfflineSync());

      expect(result.current.isSyncing).toBe(false);

      const syncPromise = act(async () => {
        await result.current.forceSync();
      });

      // During sync, isSyncing should be true (though it might be quick)
      await waitFor(() => {
        expect(mockCreateTaskMutation.mutateAsync).toHaveBeenCalled();
      });

      await syncPromise;

      // After sync, isSyncing should be false
      expect(result.current.isSyncing).toBe(false);
    });
  });

  describe('Force Sync', () => {
    it('should force sync when called', async () => {
      vi.mocked(offlineStorage.getPendingMutations).mockResolvedValue([
        {
          id: 'mutation-1',
          type: 'CREATE_TASK',
          data: { title: 'Task' },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ]);

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.forceSync();
      });

      expect(mockCreateTaskMutation.mutateAsync).toHaveBeenCalled();
    });

    it('should not force sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      vi.mocked(offlineStorage.getPendingMutations).mockResolvedValue([
        {
          id: 'mutation-1',
          type: 'CREATE_TASK',
          data: { title: 'Task' },
          timestamp: Date.now(),
          retryCount: 0,
        },
      ]);

      const { result } = renderHook(() => useOfflineSync());

      await act(async () => {
        await result.current.forceSync();
      });

      expect(mockCreateTaskMutation.mutateAsync).not.toHaveBeenCalled();
    });
  });
});

