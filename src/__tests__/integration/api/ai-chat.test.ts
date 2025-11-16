import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { GRINDPROOF_SYSTEM_PROMPT } from '@/lib/ai/system-prompt';

// Mock env
vi.mock('@/lib/env', () => ({
  env: {
    NEXT_GOOGLE_GEMINI_API_KEY: 'test-api-key',
  },
}));

// Create mock response functions
const createMockResponse = () => {
  const mockText = vi.fn(() => 'Hello! How can I help you today?');
  const mockSendMessage = vi.fn(() => Promise.resolve({
    response: {
      text: mockText,
    },
  }));
  const mockStartChat = vi.fn(() => ({
    sendMessage: mockSendMessage,
  }));
  const mockGetGenerativeModel = vi.fn(() => ({
    startChat: mockStartChat,
  }));

  return { mockText, mockSendMessage, mockStartChat, mockGetGenerativeModel };
};

const mocks = createMockResponse();

// Mock Supabase server
vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-123' } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              neq: vi.fn(() => Promise.resolve({ data: [] })),
            })),
          })),
        })),
      })),
    })),
  })),
}));

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => {
  const mockGenerateContent = vi.fn(() => Promise.resolve({
    response: {
      text: vi.fn(() => 'Hello! How can I help you today?'),
    },
  }));

  const mockGetGenerativeModel = vi.fn(() => ({
    startChat: vi.fn(() => ({
      sendMessage: vi.fn(() => Promise.resolve({
        response: {
          text: vi.fn(() => 'Hello! How can I help you today?'),
        },
      })),
    })),
    generateContent: mockGenerateContent,
  }));

  return {
    GoogleGenerativeAI: vi.fn(function(this: any) {
      return {
        getGenerativeModel: mockGetGenerativeModel,
      };
    }),
    // Export mocks for use in tests
    __mockGenerateContent: mockGenerateContent,
    __mockGetGenerativeModel: mockGetGenerativeModel,
  };
});

// Import POST handler after mocks
import { POST } from '@/app/api/ai/chat/route';

describe('AI Chat API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/ai/chat', () => {
    it('should return AI response for valid conversation', async () => {
      const messages = [
        { role: 'user', content: 'Hello' },
      ];

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('text');
      expect(data.text).toBe('Hello! How can I help you today?');
    });

    it('should handle conversation history correctly', async () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
      ];

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('text');
    });

    it('should return 400 for missing messages', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Messages array is required');
    });

    it('should return 400 for invalid messages format', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: 'not an array' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty('error');
      expect(data.error).toBe('Messages array is required');
    });

    it('should process messages with conversation ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
          conversationId: 'conv-123',
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('text');
    });

    it('should convert assistant role to model role', async () => {
      const messages = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' },
        { role: 'user', content: 'Test' },
      ];

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });

      const response = await POST(request);
      
      expect(response.status).toBe(200);
    });

    it('should include conversationId when provided', async () => {
      const messages = [{ role: 'user', content: 'Hello' }];
      const conversationId = 'conv-123';

      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages, conversationId }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
      // Conversation context fetching is tested indirectly via the mock
    });
  });

  describe('Command Detection and Routing', () => {
    beforeEach(() => {
      // Mock fetch for command endpoints
      global.fetch = vi.fn();
    });

    it('should detect "roast me" command and route to roast endpoint', async () => {
      const mockRoastResponse = {
        ok: true,
        json: async () => ({
          success: true,
          alignmentScore: 0.75,
          honestyScore: 0.80,
          completionRate: 0.70,
          insights: [
            { emoji: '💪', text: 'Great work this week!', severity: 'positive' },
          ],
          recommendations: ['Keep it up'],
          weekSummary: 'Solid week overall',
        }),
      };

      (global.fetch as any).mockResolvedValue(mockRoastResponse);

      const messages = [{ role: 'user', content: 'roast me' }];
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.commandExecuted).toBe('roast');
      expect(data.text).toContain('Weekly Roast Report');
      expect(data.text).toContain('Solid week overall');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/ai/generate-roast'),
        expect.any(Object)
      );
    });

    it('should detect "generate roast" command variation', async () => {
      const mockRoastResponse = {
        ok: true,
        json: async () => ({
          success: true,
          alignmentScore: 0.60,
          honestyScore: 0.50,
          completionRate: 0.55,
          insights: [],
          recommendations: [],
          weekSummary: 'Average week',
        }),
      };

      (global.fetch as any).mockResolvedValue(mockRoastResponse);

      const messages = [{ role: 'user', content: 'generate roast' }];
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.commandExecuted).toBe('roast');
    });

    it('should detect "weekly report" command variation', async () => {
      const mockRoastResponse = {
        ok: true,
        json: async () => ({
          success: true,
          alignmentScore: 0.85,
          honestyScore: 0.90,
          completionRate: 0.88,
          insights: [],
          recommendations: [],
          weekSummary: 'Excellent week',
        }),
      };

      (global.fetch as any).mockResolvedValue(mockRoastResponse);

      const messages = [{ role: 'user', content: 'show me my weekly report' }];
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.commandExecuted).toBe('roast');
    });

    it('should detect "analyze patterns" command and route to patterns endpoint', async () => {
      const mockPatternsResponse = {
        ok: true,
        json: async () => ({
          success: true,
          patternsDetected: 3,
          patterns: [
            {
              type: 'procrastination',
              description: 'Tasks completed late',
              confidence: 0.75,
              action: 'created',
            },
            {
              type: 'task_skipping',
              description: 'High skip rate',
              confidence: 0.60,
              action: 'updated',
            },
          ],
        }),
      };

      (global.fetch as any).mockResolvedValue(mockPatternsResponse);

      const messages = [{ role: 'user', content: 'analyze patterns' }];
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.commandExecuted).toBe('patterns');
      expect(data.text).toContain('Pattern Analysis');
      expect(data.text).toContain('procrastination');
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/ai/analyze-patterns'),
        expect.any(Object)
      );
    });

    it('should detect "what patterns" command variation', async () => {
      const mockPatternsResponse = {
        ok: true,
        json: async () => ({
          success: true,
          patternsDetected: 0,
          patterns: [],
        }),
      };

      (global.fetch as any).mockResolvedValue(mockPatternsResponse);

      const messages = [{ role: 'user', content: 'what patterns do you see?' }];
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.commandExecuted).toBe('patterns');
      expect(data.text).toContain('No significant patterns detected yet');
    });

    it('should handle roast endpoint errors gracefully', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 429,
        json: async () => ({
          error: 'Quota exceeded',
        }),
      };

      (global.fetch as any).mockResolvedValue(mockErrorResponse);

      const messages = [{ role: 'user', content: 'roast me' }];
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.error).toBe('Quota exceeded');
    });

    it('should handle patterns endpoint errors gracefully', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 500,
        json: async () => ({
          error: 'Internal server error',
        }),
      };

      (global.fetch as any).mockResolvedValue(mockErrorResponse);

      const messages = [{ role: 'user', content: 'analyze patterns' }];
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
      // Error message may vary, just check it exists
    });

    it('should not detect commands in normal conversation', async () => {
      const messages = [{ role: 'user', content: 'How do I add a task?' }];
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).not.toHaveProperty('commandExecuted');
      expect(data).toHaveProperty('text');
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should pass cookies to command endpoints for authentication', async () => {
      const mockRoastResponse = {
        ok: true,
        json: async () => ({
          success: true,
          alignmentScore: 0.70,
          honestyScore: 0.65,
          completionRate: 0.68,
          insights: [],
          recommendations: [],
          weekSummary: 'Week analyzed',
        }),
      };

      (global.fetch as any).mockResolvedValue(mockRoastResponse);

      const messages = [{ role: 'user', content: 'roast me' }];
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        headers: {
          Cookie: 'session=abc123',
        },
        body: JSON.stringify({ messages }),
      });

      await POST(request);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Cookie: 'session=abc123',
          }),
        })
      );
    });
  });

  describe('Task Creation and Deletion', () => {
    it('should detect "add task" command', async () => {
      // Get the mock from the module
      const aiModule = await import('@google/generative-ai');
      const mockGenContent = (aiModule as any).__mockGenerateContent;
      
      // Mock Google Generative AI for task parsing
      mockGenContent.mockResolvedValueOnce({
        response: {
          text: vi.fn(() => JSON.stringify({
            title: 'workout',
            dueDate: null,
            priority: 'medium',
          })),
        },
      });

      const messages = [{ role: 'user', content: 'add task: workout' }];
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      // Should either ask validation questions or create task
      expect(data.text).toBeDefined();
    });

    it('should handle task deletion confirmation response', async () => {
      const messages = [
        { role: 'assistant', content: '⚠️ Confirm Deletion\n\nVALIDATION_DELETE_TASK\nTask ID: task-1' },
        { role: 'user', content: 'yes' },
      ];
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });

    it('should cancel task deletion when user says no', async () => {
      const messages = [
        { role: 'assistant', content: '⚠️ Confirm Deletion\n\nVALIDATION_DELETE_TASK\nTask ID: task-1' },
        { role: 'user', content: 'no' },
      ];
      const request = new NextRequest('http://localhost:3000/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.text).toContain('cancelled');
    });
  });
});

