import { vi } from 'vitest';
import type { AppTask, AppGoal, AppIntegration } from '@/contexts/AppContext';

export interface MockAppContextOptions {
  tasks?: AppTask[];
  goals?: AppGoal[];
  integrations?: AppIntegration[];
  user?: any;
  isLoading?: boolean;
  isHydrated?: boolean;
  syncStatus?: 'idle' | 'syncing' | 'synced' | 'error';
}

export function mockAppContext(options: MockAppContextOptions = {}) {
  const {
    tasks = [],
    goals = [],
    integrations = [],
    user = { id: '123', email: 'test@test.com' },
    isLoading = false,
    isHydrated = true,
    syncStatus = 'idle',
  } = options;

  return {
    tasks,
    goals,
    integrations,
    user,
    isLoading,
    isHydrated,
    syncStatus,
    refreshAll: vi.fn().mockResolvedValue(undefined),
    refreshTasks: vi.fn().mockResolvedValue(undefined),
    refreshGoals: vi.fn().mockResolvedValue(undefined),
    refreshIntegrations: vi.fn().mockResolvedValue(undefined),
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
    isGoogleCalendarConnected: vi.fn(() => false),
  };
}

export function setupTRPCMocks(options: {
  tasks?: any[];
  goals?: any[];
  integrations?: any[];
} = {}) {
  const { tasks = [], goals = [], integrations = [] } = options;

  return {
    taskQuery: {
      data: tasks,
      isLoading: false,
      error: null,
      refetch: vi.fn().mockResolvedValue({ data: tasks }),
    },
    goalQuery: {
      data: goals,
      isLoading: false,
      error: null,
      refetch: vi.fn().mockResolvedValue({ data: goals }),
    },
    integrationQuery: {
      data: integrations,
      isLoading: false,
      error: null,
      refetch: vi.fn().mockResolvedValue({ data: integrations }),
    },
    taskMutations: {
      create: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
      update: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
      complete: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
      skip: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
      reschedule: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
      delete: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
      syncFromCalendar: { mutate: vi.fn(), mutateAsync: vi.fn(), isPending: false },
    },
  };
}

