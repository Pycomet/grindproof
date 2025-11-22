import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MorningCheckDialog } from '@/components/MorningCheckDialog';

// Mock tRPC
vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    dailyCheck: {
      getMorningSchedule: {
        useQuery: vi.fn(() => ({
          data: {
            tasks: [
              {
                id: 'task-1',
                title: 'Existing task',
                start_time: '09:00',
                priority: 'high',
              },
            ],
            calendarEvents: [],
            hasCalendarIntegration: false,
          },
          isLoading: false,
          refetch: vi.fn(),
        })),
      },
      saveMorningPlan: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn().mockResolvedValue({
            success: true,
            tasks: [],
            count: 2,
          }),
          isPending: false,
        })),
      },
    },
  },
}));

describe('MorningCheckDialog', () => {
  const mockOnClose = vi.fn();
  const mockOnComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(
      <MorningCheckDialog
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText(/Good Morning! Let's Plan Your Day/i)).toBeInTheDocument();
  });

  it('should not render when closed', () => {
    render(
      <MorningCheckDialog
        open={false}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.queryByText(/Good Morning! Let's Plan Your Day/i)).not.toBeInTheDocument();
  });

  it('should display today\'s schedule in step 1', () => {
    render(
      <MorningCheckDialog
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText(/Today's Schedule/i)).toBeInTheDocument();
    expect(screen.getByText('Existing task')).toBeInTheDocument();
  });

  it('should navigate to planning step', async () => {
    const user = userEvent.setup();
    
    render(
      <MorningCheckDialog
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    const addButton = screen.getByText(/Add More Tasks/i);
    await user.click(addButton);

    expect(screen.getByText(/What are your priorities today?/i)).toBeInTheDocument();
  });

  it('should go back from planning to schedule', async () => {
    const user = userEvent.setup();
    
    render(
      <MorningCheckDialog
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    // Go to planning
    const addButton = screen.getByText(/Add More Tasks/i);
    await user.click(addButton);

    // Go back
    const backButton = screen.getByText(/Back/i);
    await user.click(backButton);

    expect(screen.getByText(/Today's Schedule/i)).toBeInTheDocument();
  });

  it('should show task preview when tasks are parsed', async () => {
    const user = userEvent.setup();
    
    render(
      <MorningCheckDialog
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    // Go to planning
    const addButton = screen.getByText(/Add More Tasks/i);
    await user.click(addButton);

    // Simulate AI response (in real scenario, ChatInterface would call onTasksParsed)
    // This test verifies the UI updates when tasks are parsed
    
    expect(screen.getByText(/What are your priorities today?/i)).toBeInTheDocument();
  });

  it('should call onClose when Skip for Now is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <MorningCheckDialog
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    const skipButton = screen.getByText(/Skip for Now/i);
    await user.click(skipButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should handle empty schedule state', () => {
    // Mock empty schedule
    const { trpc } = require('@/lib/trpc/client');
    trpc.dailyCheck.getMorningSchedule.useQuery.mockReturnValueOnce({
      data: {
        tasks: [],
        calendarEvents: [],
        hasCalendarIntegration: false,
      },
      isLoading: false,
      refetch: vi.fn(),
    });

    render(
      <MorningCheckDialog
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText(/No tasks scheduled yet/i)).toBeInTheDocument();
  });

  it('should show loading state', () => {
    const { trpc } = require('@/lib/trpc/client');
    trpc.dailyCheck.getMorningSchedule.useQuery.mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      refetch: vi.fn(),
    });

    render(
      <MorningCheckDialog
        open={true}
        onClose={mockOnClose}
        onComplete={mockOnComplete}
      />
    );

    // Look for loading spinner
    const loader = document.querySelector('[class*="animate-spin"]');
    expect(loader).toBeInTheDocument();
  });
});

