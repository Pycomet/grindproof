import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EveningCheckDialog } from '@/components/EveningCheckDialog';

// Mock tRPC
vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    dailyCheck: {
      getEveningComparison: {
        useQuery: vi.fn(() => ({
          data: {
            tasks: [
              {
                id: 'task-1',
                title: 'Completed task',
                status: 'completed',
                description: 'Task 1 description',
              },
              {
                id: 'task-2',
                title: 'Pending task',
                status: 'pending',
                description: 'Task 2 description',
              },
              {
                id: 'task-3',
                title: 'Skipped task',
                status: 'skipped',
                description: 'Task 3 description',
              },
            ],
            stats: {
              total: 3,
              completed: 1,
              pending: 1,
              skipped: 1,
              alignmentScore: 33,
            },
            integrations: {
              hasGitHub: false,
              hasCalendar: false,
            },
          },
          isLoading: false,
          refetch: vi.fn(),
        })),
      },
      saveEveningReflection: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn().mockResolvedValue({
            success: true,
            score: {},
          }),
          isPending: false,
        })),
      },
    },
  },
}));

// Mock AppContext
vi.mock('@/contexts/AppContext', () => ({
  useApp: () => ({
    user: {
      id: 'user-123',
      email: 'test@example.com',
    },
  }),
}));

describe('EveningCheckDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(
      <EveningCheckDialog
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText(/Evening Reality Check/i)).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <EveningCheckDialog
        open={false}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.queryByText(/Evening Reality Check/i)).not.toBeInTheDocument();
  });

  it('should display alignment score', () => {
    render(
      <EveningCheckDialog
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText(/Today's Alignment Score/i)).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
    expect(screen.getByText(/1 of 3 tasks completed/i)).toBeInTheDocument();
  });

  it('should display all today\'s tasks', () => {
    render(
      <EveningCheckDialog
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('Completed task')).toBeInTheDocument();
    expect(screen.getByText('Pending task')).toBeInTheDocument();
    expect(screen.getByText('Skipped task')).toBeInTheDocument();
  });

  it('should show task statuses with correct styling', () => {
    render(
      <EveningCheckDialog
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    const badges = screen.getAllByText(/completed|pending|skipped/i);
    expect(badges).toHaveLength(3);
  });

  it('should navigate to reflection step', async () => {
    const user = userEvent.setup();
    
    render(
      <EveningCheckDialog
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    const reflectButton = screen.getByText(/Reflect on Incomplete Tasks/i);
    await user.click(reflectButton);

    expect(screen.getByText(/What happened?/i)).toBeInTheDocument();
  });

  it('should go back from reflection to overview', async () => {
    const user = userEvent.setup();
    
    render(
      <EveningCheckDialog
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    // Go to reflection
    const reflectButton = screen.getByText(/Reflect on Incomplete Tasks/i);
    await user.click(reflectButton);

    // Go back
    const backButton = screen.getByText(/Back to Overview/i);
    await user.click(backButton);

    expect(screen.getByText(/Today's Alignment Score/i)).toBeInTheDocument();
  });

  it('should display reflection inputs for incomplete tasks', async () => {
    const user = userEvent.setup();
    
    render(
      <EveningCheckDialog
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    const reflectButton = screen.getByText(/Reflect on Incomplete Tasks/i);
    await user.click(reflectButton);

    // Should show inputs for pending and skipped tasks (not completed)
    expect(screen.getByText('Pending task')).toBeInTheDocument();
    expect(screen.getByText('Skipped task')).toBeInTheDocument();
    
    const textareas = screen.getAllByPlaceholderText(/Be honest/i);
    expect(textareas).toHaveLength(2); // One for pending, one for skipped
  });

  it('should allow typing reflections', async () => {
    const user = userEvent.setup();
    
    render(
      <EveningCheckDialog
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    const reflectButton = screen.getByText(/Reflect on Incomplete Tasks/i);
    await user.click(reflectButton);

    const textareas = screen.getAllByPlaceholderText(/Be honest/i);
    await user.type(textareas[0], 'Got distracted by meetings');

    expect(textareas[0]).toHaveValue('Got distracted by meetings');
  });

  it('should call saveEveningReflection on complete', async () => {
    const user = userEvent.setup();
    const { trpc } = require('@/lib/trpc/client');
    const mockSave = vi.fn().mockResolvedValue({ success: true, score: {} });
    
    trpc.dailyCheck.saveEveningReflection.useMutation.mockReturnValueOnce({
      mutateAsync: mockSave,
      isPending: false,
    });
    
    render(
      <EveningCheckDialog
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    const completeButton = screen.getByText(/Complete Check-in/i);
    await user.click(completeButton);

    await waitFor(() => {
      expect(mockSave).toHaveBeenCalled();
    });
  });

  it('should show integration activity when available', () => {
    const { trpc } = require('@/lib/trpc/client');
    trpc.dailyCheck.getEveningComparison.useQuery.mockReturnValueOnce({
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
          hasGitHub: true,
          hasCalendar: true,
        },
      },
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <EveningCheckDialog
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText(/GitHub activity tracked/i)).toBeInTheDocument();
    expect(screen.getByText(/Calendar events synced/i)).toBeInTheDocument();
  });

  it('should handle no tasks for today', () => {
    const { trpc } = require('@/lib/trpc/client');
    trpc.dailyCheck.getEveningComparison.useQuery.mockReturnValueOnce({
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
      },
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <EveningCheckDialog
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText(/No tasks for today/i)).toBeInTheDocument();
  });

  it('should show loading state', () => {
    const { trpc } = require('@/lib/trpc/client');
    trpc.dailyCheck.getEveningComparison.useQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    });

    render(
      <EveningCheckDialog
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    const loader = document.querySelector('[class*="animate-spin"]');
    expect(loader).toBeInTheDocument();
  });
});

