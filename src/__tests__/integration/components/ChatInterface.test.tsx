import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatInterface } from '@/components/ChatInterface';

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock fetch
global.fetch = vi.fn();

// Mock tRPC
const mockConversationGetAll = vi.fn();
const mockConversationCreate = vi.fn();
const mockConversationUpdate = vi.fn();

vi.mock('@/lib/trpc/client', () => ({
  trpc: {
    conversation: {
      getAll: {
        useQuery: () => mockConversationGetAll(),
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

describe('ChatInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConversationGetAll.mockReturnValue({ data: [] });
    mockConversationCreate.mockResolvedValue({ id: 'new-conv-id' });
    mockConversationUpdate.mockResolvedValue({});
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'AI response' }),
    });
  });

  it('should render empty state with welcome message', () => {
    render(<ChatInterface />);
    
    expect(screen.getByText('Your Accountability Coach')).toBeInTheDocument();
    expect(screen.getByText(/I'm here to help you stay on track/i)).toBeInTheDocument();
    expect(screen.getByText(/Task Management/i)).toBeInTheDocument();
    expect(screen.getByText(/Analysis & Insights/i)).toBeInTheDocument();
    expect(screen.getByText(/General Chat/i)).toBeInTheDocument();
  });

  it('should display messages after sending', async () => {
    render(<ChatInterface />);

    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('AI response')).toBeInTheDocument();
    });
  });

  it('should send message when Send button is clicked', async () => {
    render(<ChatInterface />);

    const input = screen.getByPlaceholderText('Type your message...');
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/ai/chat', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: expect.stringContaining('Test message'),
      }));
    });
  });

  it('should display user message immediately', async () => {
    render(<ChatInterface />);

    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'My message' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    expect(screen.getByText('My message')).toBeInTheDocument();
  });

  it('should display AI response after successful API call', async () => {
    render(<ChatInterface />);

    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Hello AI' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText('AI response')).toBeInTheDocument();
    });
  });

  it('should show loading indicator while waiting for response', async () => {
    (global.fetch as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ text: 'Response' }),
      }), 100))
    );

    render(<ChatInterface />);

    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    // Should show loading animation
    await waitFor(() => {
      const loadingDots = screen.getAllByRole('generic').filter(el => 
        el.className.includes('animate-bounce')
      );
      expect(loadingDots.length).toBeGreaterThan(0);
    });
  });

  it('should display error message on API failure', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'API Error', retryable: true }),
    });

    render(<ChatInterface />);

    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText(/API Error/i)).toBeInTheDocument();
    });
  });

  it('should clear input after sending message', async () => {
    render(<ChatInterface />);

    const input = screen.getByPlaceholderText('Type your message...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('should handle loading state', async () => {
    (global.fetch as any).mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ text: 'Response' }),
      }), 50))
    );

    render(<ChatInterface />);

    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    // Wait for response to complete
    await waitFor(() => {
      expect(screen.getByText('Response')).toBeInTheDocument();
    });
  });

  it('should send message on Enter key press', async () => {
    render(<ChatInterface />);

    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Enter test' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  it('should not send message on Shift+Enter', () => {
    render(<ChatInterface />);

    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Shift enter test' } });
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13, shiftKey: true });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should display messages in conversation flow', async () => {
    render(<ChatInterface />);

    const input = screen.getByPlaceholderText('Type your message...');
    
    // Send first message
    fireEvent.change(input, { target: { value: 'Previous message' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText('Previous message')).toBeInTheDocument();
      expect(screen.getByText('AI response')).toBeInTheDocument();
    });
  });

  it('should show error message for non-retryable errors', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ 
        error: 'Daily AI message limit exceeded', 
        retryable: false,
        errorType: 'quota_exceeded'
      }),
    });

    render(<ChatInterface />);

    const input = screen.getByPlaceholderText('Type your message...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(screen.getByText(/Daily AI message limit/i)).toBeInTheDocument();
    });
  });

  it('should save conversation after successful message', async () => {
    render(<ChatInterface />);

    const input = screen.getByPlaceholderText('Type your message...');
    fireEvent.change(input, { target: { value: 'Save test' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(mockConversationCreate).toHaveBeenCalled();
    });
  });

  it('should update existing conversation after creating one', async () => {
    render(<ChatInterface />);

    const input = screen.getByPlaceholderText('Type your message...');
    
    // First message creates conversation
    fireEvent.change(input, { target: { value: 'First message' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(mockConversationCreate).toHaveBeenCalled();
    });

    // Second message updates conversation
    fireEvent.change(input, { target: { value: 'Second message' } });
    fireEvent.click(screen.getByRole('button', { name: /send/i }));

    await waitFor(() => {
      expect(mockConversationUpdate).toHaveBeenCalled();
    });
  });
});

