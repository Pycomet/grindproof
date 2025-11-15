import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '@/app/dashboard/page';
import { supabase } from '@/lib/supabase/client';
import { trpc } from '@/lib/trpc/client';

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

// Mock tRPC
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
  },
}));

describe('Protected Routes - Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard when user is authenticated', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: '123',
          email: 'test@test.com',
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    } as any);

    // Mock tRPC queries
    vi.mocked(trpc.goal.getAll.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(trpc.task.getAll.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    // Mock tRPC mutations
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

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Grindproof')).toBeInTheDocument();
      expect(screen.getByText('✓ Tasks')).toBeInTheDocument();
      expect(screen.getByText('🌙 Reality Check')).toBeInTheDocument();
      expect(screen.getByText('📊 Weekly Roast')).toBeInTheDocument();
    });
  });

  it('shows sign out button when authenticated', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: '123',
          email: 'test@test.com',
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    } as any);

    // Mock tRPC queries
    vi.mocked(trpc.goal.getAll.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(trpc.task.getAll.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    // Mock tRPC mutations
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

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });
  });

  it('handles sign out', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: '123',
          email: 'test@test.com',
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    } as any);

    vi.mocked(supabase.auth.signOut).mockResolvedValue({
      error: null,
    });

    // Mock tRPC queries
    vi.mocked(trpc.goal.getAll.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(trpc.task.getAll.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    // Mock tRPC mutations
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

    render(<Dashboard />);

    await waitFor(() => {
      const signOutButton = screen.getByText('Sign Out');
      signOutButton.click();
    });

    await waitFor(() => {
      expect(supabase.auth.signOut).toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith('/');
    });
  });

  it('displays tasks view', async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: {
        user: {
          id: '123',
          email: 'test@test.com',
          created_at: new Date().toISOString(),
        },
      },
      error: null,
    } as any);

    // Mock tRPC queries with some tasks
    vi.mocked(trpc.goal.getAll.useQuery).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
    } as any);

    vi.mocked(trpc.task.getAll.useQuery).mockReturnValue({
      data: [
        {
          id: 'task-1',
          userId: '123',
          title: 'Complete testing',
          description: 'Finish all unit tests',
          dueDate: new Date(),
          status: 'pending' as const,
          completionProof: null,
          tags: ['work'],
          googleCalendarEventId: null,
          isSyncedWithCalendar: false,
          recurrencePattern: null,
          parentTaskId: null,
          goalId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      isLoading: false,
      error: null,
    } as any);

    // Mock tRPC mutations
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

    render(<Dashboard />);

    await waitFor(() => {
      // Check for the Tasks tab
      expect(screen.getByText('✓ Tasks')).toBeInTheDocument();
      
      // Check for task title (appears in both desktop and mobile views)
      const taskElements = screen.getAllByText('Complete testing');
      expect(taskElements.length).toBeGreaterThan(0);
    });
  });
});

