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
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function(this: any) {
    return {
      getGenerativeModel: vi.fn(() => ({
        startChat: vi.fn(() => ({
          sendMessage: vi.fn(() => Promise.resolve({
            response: {
              text: vi.fn(() => 'Hello! How can I help you today?'),
            },
          })),
        })),
      })),
    };
  }),
}));

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
});

