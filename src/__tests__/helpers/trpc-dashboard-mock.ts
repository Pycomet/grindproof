import { vi } from 'vitest';

/**
 * Comprehensive tRPC mock for dashboard tests
 * Includes all routers including the new dailyCheck router
 */
export const createTrpcDashboardMock = () => ({
  trpc: {
    goal: {
      getAll: {
        useQuery: vi.fn(),
      },
      search: {
        useQuery: vi.fn(() => ({ data: [] })),
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
      search: {
        useQuery: vi.fn(() => ({ data: [] })),
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
        useQuery: vi.fn(() => ({ data: null })),
      },
      getGoogleCalendarActivity: {
        useQuery: vi.fn(() => ({ data: null })),
      },
    },
    accountabilityScore: {
      getAll: {
        useQuery: vi.fn(() => ({ data: [] })),
      },
      getByWeek: {
        useQuery: vi.fn(),
      },
    },
    pattern: {
      getAll: {
        useQuery: vi.fn(() => ({ data: [] })),
      },
    },
    conversation: {
      create: {
        useMutation: vi.fn(),
      },
    },
    // NEW: Daily Check router mock
    dailyCheck: {
      getMorningSchedule: {
        useQuery: vi.fn(() => ({
          data: {
            tasks: [],
            calendarEvents: [],
            hasCalendarIntegration: false,
          },
        })),
      },
      saveMorningPlan: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn().mockResolvedValue({ success: true }),
        })),
      },
      getEveningComparison: {
        useQuery: vi.fn(() => ({
          data: {
            tasks: [],
            stats: {
              total: 0,
              completed: 0,
              pending: 0,
              skipped: 0,
              alignmentScore: 0,
            },
            integrations: {
              hasGitHub: false,
              hasCalendar: false,
            },
            existingReflection: null,
          },
        })),
      },
      saveEveningReflection: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn().mockResolvedValue({ success: true }),
        })),
      },
      refineTasks: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn().mockResolvedValue({ tasks: [] }),
        })),
      },
    },
    // NEW: Notification router mock
    notification: {
      getPublicKey: {
        useQuery: vi.fn(() => ({ data: { publicKey: 'test-key' } })),
      },
      subscribe: {
        useMutation: vi.fn(),
      },
      unsubscribe: {
        useMutation: vi.fn(),
      },
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
      updateSettings: {
        useMutation: vi.fn(),
      },
      getSubscriptions: {
        useQuery: vi.fn(() => ({ data: [] })),
      },
      sendTest: {
        useMutation: vi.fn(),
      },
    },
  },
});

