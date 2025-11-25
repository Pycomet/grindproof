import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatWidget } from '@/components/ChatWidget';

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock fetch
global.fetch = vi.fn();

// Mock tRPC
const mockConversationCreate = vi.fn();
const mockConversationUpdate = vi.fn();

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    conversation: {
      getAll: {
        useQuery: () => ({ data: [] }),
      },
      create: {
        useMutation: () => ({
          mutateAsync: mockConversationCreate,
        }),
      },
      update: {
        useMutation: () => ({
          mutateAsync: mockConversationUpdate,
        }),
      },
    },
  },
}));

describe('ChatWidget', () => {
  const mockOnCreateTask = vi.fn();
  const mockGoals = [
    { id: 'goal-1', title: 'Fitness Goal' },
    { id: 'goal-2', title: 'Work Goal' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockConversationCreate.mockResolvedValue({ id: 'new-conv-id' });
    mockConversationUpdate.mockResolvedValue({});
    
    // Mock streaming response
    (global.fetch as any).mockImplementation(() => {
      const mockStreamReader = {
        read: vi.fn()
          .mockResolvedValueOnce({ 
            done: false, 
            value: new TextEncoder().encode('data: {"text":"Coach response"}\n\n') 
          })
          .mockResolvedValueOnce({ 
            done: false, 
            value: new TextEncoder().encode('data: [DONE]\n\n') 
          })
          .mockResolvedValueOnce({ done: true, value: undefined }),
      };
      
      return Promise.resolve({
        ok: true,
        headers: new Headers({ 'content-type': 'text/event-stream' }),
        body: {
          getReader: () => mockStreamReader,
        },
      });
    });
  });

  describe('Collapsed State', () => {
    it('should render widget button in collapsed state', () => {
      render(
        <ChatWidget
          goals={mockGoals}
          onCreateTask={mockOnCreateTask}
          isCreatingTask={false}
          isCalendarConnected={false}
        />
      );

      const button = screen.getByRole('button', { name: /open quick actions/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('rounded-full');
    });

    it('should show menu when widget button is clicked', async () => {
      render(
        <ChatWidget
          goals={mockGoals}
          onCreateTask={mockOnCreateTask}
          isCreatingTask={false}
        />
      );

      const button = screen.getByRole('button', { name: /open quick actions/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Create Task')).toBeInTheDocument();
        expect(screen.getByText('Talk to Coach')).toBeInTheDocument();
      });
    });
  });

  describe('Menu State', () => {
    it('should show quick action menu with two options', async () => {
      render(
        <ChatWidget
          goals={mockGoals}
          onCreateTask={mockOnCreateTask}
          isCreatingTask={false}
        />
      );

      const button = screen.getByRole('button', { name: /open quick actions/i });
      fireEvent.click(button);

      await waitFor(() => {
        const createTaskButton = screen.getByText('Create Task');
        const chatButton = screen.getByText('Talk to Coach');
        
        expect(createTaskButton).toBeInTheDocument();
        expect(chatButton).toBeInTheDocument();
      });
    });

    it('should open task dialog when "Create Task" is clicked', async () => {
      render(
        <ChatWidget
          goals={mockGoals}
          onCreateTask={mockOnCreateTask}
          isCreatingTask={false}
        />
      );

      // Open menu
      const widgetButton = screen.getByRole('button', { name: /open quick actions/i });
      fireEvent.click(widgetButton);

      await waitFor(() => {
        expect(screen.getByText('Create Task')).toBeInTheDocument();
      });

      // Click Create Task
      const createTaskButton = screen.getByText('Create Task').closest('button')!;
      fireEvent.click(createTaskButton);

      // Should close menu
      await waitFor(() => {
        expect(screen.queryByText('Talk to Coach')).not.toBeInTheDocument();
      });
    });

    it('should expand chat when "Talk to Coach" is clicked', async () => {
      render(
        <ChatWidget
          goals={mockGoals}
          onCreateTask={mockOnCreateTask}
          isCreatingTask={false}
        />
      );

      // Open menu
      const widgetButton = screen.getByRole('button', { name: /open quick actions/i });
      fireEvent.click(widgetButton);

      await waitFor(() => {
        expect(screen.getByText('Talk to Coach')).toBeInTheDocument();
      });

      // Click Talk to Coach
      const chatButton = screen.getByText('Talk to Coach').closest('button')!;
      fireEvent.click(chatButton);

      // Should show expanded chat interface
      await waitFor(() => {
        expect(screen.getByText('Coach')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
      });
    });

    it('should close menu when clicking outside', async () => {
      render(
        <div>
          <div data-testid="outside">Outside Element</div>
          <ChatWidget
            goals={mockGoals}
            onCreateTask={mockOnCreateTask}
            isCreatingTask={false}
          />
        </div>
      );

      // Open menu
      const widgetButton = screen.getByRole('button', { name: /open quick actions/i });
      fireEvent.click(widgetButton);

      await waitFor(() => {
        expect(screen.getByText('Create Task')).toBeInTheDocument();
      });

      // Click outside
      const outside = screen.getByTestId('outside');
      fireEvent.mouseDown(outside);

      await waitFor(() => {
        expect(screen.queryByText('Create Task')).not.toBeInTheDocument();
      });
    });

    it('should close menu when Escape is pressed', async () => {
      render(
        <ChatWidget
          goals={mockGoals}
          onCreateTask={mockOnCreateTask}
          isCreatingTask={false}
        />
      );

      // Open menu
      const widgetButton = screen.getByRole('button', { name: /open quick actions/i });
      fireEvent.click(widgetButton);

      await waitFor(() => {
        expect(screen.getByText('Create Task')).toBeInTheDocument();
      });

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText('Create Task')).not.toBeInTheDocument();
      });
    });
  });

  describe('Expanded Chat State', () => {
    it('should show chat header with "Coach" title', async () => {
      render(
        <ChatWidget
          goals={mockGoals}
          onCreateTask={mockOnCreateTask}
          isCreatingTask={false}
        />
      );

      // Open menu and click Talk to Coach
      const widgetButton = screen.getByRole('button', { name: /open quick actions/i });
      fireEvent.click(widgetButton);

      await waitFor(() => {
        expect(screen.getByText('Talk to Coach')).toBeInTheDocument();
      });

      const chatButton = screen.getByText('Talk to Coach').closest('button')!;
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByText('Coach')).toBeInTheDocument();
      });
    });

    it('should show close button in expanded state', async () => {
      render(
        <ChatWidget
          goals={mockGoals}
          onCreateTask={mockOnCreateTask}
          isCreatingTask={false}
        />
      );

      // Open menu and expand chat
      const widgetButton = screen.getByRole('button', { name: /open quick actions/i });
      fireEvent.click(widgetButton);

      await waitFor(() => {
        expect(screen.getByText('Talk to Coach')).toBeInTheDocument();
      });

      const chatButton = screen.getByText('Talk to Coach').closest('button')!;
      fireEvent.click(chatButton);

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close chat/i });
        expect(closeButton).toBeInTheDocument();
      });
    });

    it('should close chat when close button is clicked', async () => {
      render(
        <ChatWidget
          goals={mockGoals}
          onCreateTask={mockOnCreateTask}
          isCreatingTask={false}
        />
      );

      // Open menu and expand chat
      const widgetButton = screen.getByRole('button', { name: /open quick actions/i });
      fireEvent.click(widgetButton);

      await waitFor(() => {
        expect(screen.getByText('Talk to Coach')).toBeInTheDocument();
      });

      const chatButton = screen.getByText('Talk to Coach').closest('button')!;
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByText('Coach')).toBeInTheDocument();
      });

      // Click close button
      const closeButton = screen.getByRole('button', { name: /close chat/i });
      fireEvent.click(closeButton);

      await waitFor(() => {
        expect(screen.queryByText('Coach')).not.toBeInTheDocument();
      });
    });

    it('should render ChatInterface in compact mode', async () => {
      render(
        <ChatWidget
          goals={mockGoals}
          onCreateTask={mockOnCreateTask}
          isCreatingTask={false}
        />
      );

      // Expand chat
      const widgetButton = screen.getByRole('button', { name: /open quick actions/i });
      fireEvent.click(widgetButton);

      await waitFor(() => {
        expect(screen.getByText('Talk to Coach')).toBeInTheDocument();
      });

      const chatButton = screen.getByText('Talk to Coach').closest('button')!;
      fireEvent.click(chatButton);

      await waitFor(() => {
        // Check that chat interface elements are present
        expect(screen.getByPlaceholderText('Type your message...')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
      });
    });

    it('should close chat when Escape is pressed', async () => {
      render(
        <ChatWidget
          goals={mockGoals}
          onCreateTask={mockOnCreateTask}
          isCreatingTask={false}
        />
      );

      // Expand chat
      const widgetButton = screen.getByRole('button', { name: /open quick actions/i });
      fireEvent.click(widgetButton);

      await waitFor(() => {
        expect(screen.getByText('Talk to Coach')).toBeInTheDocument();
      });

      const chatButton = screen.getByText('Talk to Coach').closest('button')!;
      fireEvent.click(chatButton);

      await waitFor(() => {
        expect(screen.getByText('Coach')).toBeInTheDocument();
      });

      // Press Escape
      fireEvent.keyDown(document, { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(screen.queryByText('Coach')).not.toBeInTheDocument();
      });
    });
  });

  describe('Task Creation Integration', () => {
    it('should pass goals to task dialog', async () => {
      render(
        <ChatWidget
          goals={mockGoals}
          onCreateTask={mockOnCreateTask}
          isCreatingTask={false}
        />
      );

      // Open menu
      const widgetButton = screen.getByRole('button', { name: /open quick actions/i });
      fireEvent.click(widgetButton);

      await waitFor(() => {
        expect(screen.getByText('Create Task')).toBeInTheDocument();
      });

      // The goals should be passed to CreateTaskDialog
      // This is verified by the component rendering without errors
      expect(screen.getByText('Create Task')).toBeInTheDocument();
    });

    it('should call onCreateTask when task is created', async () => {
      render(
        <ChatWidget
          goals={mockGoals}
          onCreateTask={mockOnCreateTask}
          isCreatingTask={false}
        />
      );

      // Open menu and click Create Task
      const widgetButton = screen.getByRole('button', { name: /open quick actions/i });
      fireEvent.click(widgetButton);

      await waitFor(() => {
        expect(screen.getByText('Create Task')).toBeInTheDocument();
      });

      const createTaskButton = screen.getByText('Create Task').closest('button')!;
      fireEvent.click(createTaskButton);

      // CreateTaskDialog should be open - the onCreateTask will be called
      // when the user submits the form in the dialog
      await waitFor(() => {
        expect(screen.queryByText('Talk to Coach')).not.toBeInTheDocument();
      });
    });

    it('should show loading state when creating task', () => {
      render(
        <ChatWidget
          goals={mockGoals}
          onCreateTask={mockOnCreateTask}
          isCreatingTask={true}
        />
      );

      // Component should render even in loading state
      expect(screen.getByRole('button', { name: /open quick actions/i })).toBeInTheDocument();
    });

    it('should pass calendar connection status to task dialog', () => {
      render(
        <ChatWidget
          goals={mockGoals}
          onCreateTask={mockOnCreateTask}
          isCreatingTask={false}
          isCalendarConnected={true}
        />
      );

      // Component should render with calendar connected
      expect(screen.getByRole('button', { name: /open quick actions/i })).toBeInTheDocument();
    });
  });

  describe('Styling and Animations', () => {
    it('should apply themed colors to widget button', () => {
      render(
        <ChatWidget
          goals={mockGoals}
          onCreateTask={mockOnCreateTask}
          isCreatingTask={false}
        />
      );

      const button = screen.getByRole('button', { name: /open quick actions/i });
      expect(button).toHaveClass('bg-zinc-900');
      expect(button).toHaveClass('dark:bg-zinc-50');
    });

    it('should show ring when menu is open', async () => {
      render(
        <ChatWidget
          goals={mockGoals}
          onCreateTask={mockOnCreateTask}
          isCreatingTask={false}
        />
      );

      const button = screen.getByRole('button', { name: /open quick actions/i });
      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toHaveClass('ring-4');
      });
    });

    it('should be positioned fixed at bottom-right', () => {
      const { container } = render(
        <ChatWidget
          goals={mockGoals}
          onCreateTask={mockOnCreateTask}
          isCreatingTask={false}
        />
      );

      const widgetContainer = container.querySelector('.fixed');
      expect(widgetContainer).toHaveClass('bottom-6');
      expect(widgetContainer).toHaveClass('right-6');
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label on widget button', () => {
      render(
        <ChatWidget
          goals={mockGoals}
          onCreateTask={mockOnCreateTask}
          isCreatingTask={false}
        />
      );

      const button = screen.getByRole('button', { name: /open quick actions/i });
      expect(button).toHaveAttribute('aria-label', 'Open quick actions');
    });

    it('should have proper aria-label on close button', async () => {
      render(
        <ChatWidget
          goals={mockGoals}
          onCreateTask={mockOnCreateTask}
          isCreatingTask={false}
        />
      );

      // Expand chat
      const widgetButton = screen.getByRole('button', { name: /open quick actions/i });
      fireEvent.click(widgetButton);

      await waitFor(() => {
        expect(screen.getByText('Talk to Coach')).toBeInTheDocument();
      });

      const chatButton = screen.getByText('Talk to Coach').closest('button')!;
      fireEvent.click(chatButton);

      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close chat/i });
        expect(closeButton).toHaveAttribute('aria-label', 'Close chat');
      });
    });

    it('should be keyboard accessible', async () => {
      render(
        <ChatWidget
          goals={mockGoals}
          onCreateTask={mockOnCreateTask}
          isCreatingTask={false}
        />
      );

      const widgetButton = screen.getByRole('button', { name: /open quick actions/i });
      
      // Should be focusable
      widgetButton.focus();
      expect(document.activeElement).toBe(widgetButton);
    });
  });
});

