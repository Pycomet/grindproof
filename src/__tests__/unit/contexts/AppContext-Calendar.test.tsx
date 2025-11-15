import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { AppProvider, useApp } from '@/contexts/AppContext';
import { useState, useEffect } from 'react';

// Mock dependencies
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: '123', email: 'test@test.com' } },
        error: null,
      }),
    },
  },
}));

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    task: {
      getAll: {
        useQuery: vi.fn(() => ({
          data: [],
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        })),
      },
    },
    goal: {
      getAll: {
        useQuery: vi.fn(() => ({
          data: [],
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        })),
      },
    },
    integration: {
      getAll: {
        useQuery: vi.fn(() => ({
          data: [],
          isLoading: false,
          error: null,
          refetch: vi.fn(),
        })),
      },
    },
  },
}));

describe('AppContext - Google Calendar Connection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('isGoogleCalendarConnected returns false when no integrations', async () => {
    let calendarConnected: boolean | undefined;

    function TestComponent() {
      const { isGoogleCalendarConnected } = useApp();
      const [result, setResult] = useState<boolean>();

      useEffect(() => {
        setResult(isGoogleCalendarConnected());
      }, [isGoogleCalendarConnected]);

      calendarConnected = result;
      return null;
    }

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(calendarConnected).toBe(false);
    });
  });

  it('isGoogleCalendarConnected returns true when Google Calendar is connected', async () => {
    const { trpc } = await import('@/lib/trpc/client');
    
    vi.mocked(trpc.integration.getAll.useQuery).mockReturnValue({
      data: [
        {
          id: '1',
          user_id: '123',
          service_type: 'google_calendar',
          status: 'connected',
          credentials: {},
          metadata: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    let calendarConnected: boolean | undefined;

    function TestComponent() {
      const { isGoogleCalendarConnected, isHydrated } = useApp();
      const [result, setResult] = useState<boolean>();

      useEffect(() => {
        if (isHydrated) {
          setResult(isGoogleCalendarConnected());
        }
      }, [isGoogleCalendarConnected, isHydrated]);

      calendarConnected = result;
      return null;
    }

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(calendarConnected).toBe(true);
    }, { timeout: 3000 });
  });

  it('isGoogleCalendarConnected returns false when Google Calendar is disconnected', async () => {
    const { trpc } = await import('@/lib/trpc/client');
    
    vi.mocked(trpc.integration.getAll.useQuery).mockReturnValue({
      data: [
        {
          id: '1',
          user_id: '123',
          service_type: 'google_calendar',
          status: 'disconnected',
          credentials: {},
          metadata: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    let calendarConnected: boolean | undefined;

    function TestComponent() {
      const { isGoogleCalendarConnected, isHydrated } = useApp();
      const [result, setResult] = useState<boolean>();

      useEffect(() => {
        if (isHydrated) {
          setResult(isGoogleCalendarConnected());
        }
      }, [isGoogleCalendarConnected, isHydrated]);

      calendarConnected = result;
      return null;
    }

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(calendarConnected).toBe(false);
    });
  });

  it('isGoogleCalendarConnected returns false when only GitHub is connected', async () => {
    const { trpc } = await import('@/lib/trpc/client');
    
    vi.mocked(trpc.integration.getAll.useQuery).mockReturnValue({
      data: [
        {
          id: '1',
          user_id: '123',
          service_type: 'github',
          status: 'connected',
          credentials: {},
          metadata: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    let calendarConnected: boolean | undefined;

    function TestComponent() {
      const { isGoogleCalendarConnected, isHydrated } = useApp();
      const [result, setResult] = useState<boolean>();

      useEffect(() => {
        if (isHydrated) {
          setResult(isGoogleCalendarConnected());
        }
      }, [isGoogleCalendarConnected, isHydrated]);

      calendarConnected = result;
      return null;
    }

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(calendarConnected).toBe(false);
    });
  });

  it('isGoogleCalendarConnected returns true when multiple integrations include connected Google Calendar', async () => {
    const { trpc } = await import('@/lib/trpc/client');
    
    vi.mocked(trpc.integration.getAll.useQuery).mockReturnValue({
      data: [
        {
          id: '1',
          user_id: '123',
          service_type: 'github',
          status: 'connected',
          credentials: {},
          metadata: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          id: '2',
          user_id: '123',
          service_type: 'google_calendar',
          status: 'connected',
          credentials: {},
          metadata: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    let calendarConnected: boolean | undefined;

    function TestComponent() {
      const { isGoogleCalendarConnected, isHydrated } = useApp();
      const [result, setResult] = useState<boolean>();

      useEffect(() => {
        if (isHydrated) {
          setResult(isGoogleCalendarConnected());
        }
      }, [isGoogleCalendarConnected, isHydrated]);

      calendarConnected = result;
      return null;
    }

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(calendarConnected).toBe(true);
    }, { timeout: 3000 });
  });

  it('isGoogleCalendarConnected is a function that can be called multiple times', async () => {
    let isConnectedFn: (() => boolean) | undefined;
    let callCount = 0;

    function TestComponent() {
      const { isGoogleCalendarConnected } = useApp();
      isConnectedFn = isGoogleCalendarConnected;
      return null;
    }

    render(
      <AppProvider>
        <TestComponent />
      </AppProvider>
    );

    await waitFor(() => {
      expect(isConnectedFn).toBeDefined();
    });

    // Should be callable multiple times
    callCount++;
    expect(isConnectedFn!()).toBe(false);
    callCount++;
    expect(isConnectedFn!()).toBe(false);
    callCount++;
    expect(isConnectedFn!()).toBe(false);

    expect(callCount).toBe(3);
  });
});

