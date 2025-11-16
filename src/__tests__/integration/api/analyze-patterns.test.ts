import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/ai/analyze-patterns/route';
import { NextRequest } from 'next/server';

// Mock dependencies
vi.mock('@/lib/env', () => ({
  env: {
    NEXT_GOOGLE_GEMINI_API_KEY: 'test-api-key',
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: vi.fn(),
}));

vi.mock('@/lib/ai/data-analyzer', () => ({
  analyzeUserData: vi.fn(),
}));

// Mock Google Generative AI
vi.mock('@google/generative-ai', () => {
  const mockGenerateContent = vi.fn();
  const mockGetGenerativeModel = vi.fn(() => ({
    generateContent: mockGenerateContent,
  }));

  return {
    GoogleGenerativeAI: vi.fn(function() {
      return {
        getGenerativeModel: mockGetGenerativeModel,
      };
    }),
    __mockGenerateContent: mockGenerateContent,
    __mockGetGenerativeModel: mockGetGenerativeModel,
  };
});

import { createServerClient } from '@/lib/supabase/server';
import { analyzeUserData } from '@/lib/ai/data-analyzer';
import { GoogleGenerativeAI } from '@google/generative-ai';

describe('Pattern Analysis API Route', () => {
  let mockSupabase: any;
  let mockRequest: NextRequest;
  let mockGenerateContent: any;

  beforeEach(async () => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Get the mock from the module
    const aiModule = await import('@google/generative-ai');
    mockGenerateContent = (aiModule as any).__mockGenerateContent;
    
    // Set default Gemini response
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          patterns: [
            {
              type: 'procrastination',
              description: 'Tasks completed late',
              confidence: 0.8,
              shouldSave: true,
            },
          ],
        }),
      },
    });

    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    };

    (createServerClient as any).mockResolvedValue(mockSupabase);

    // Create mock request
    mockRequest = new NextRequest('http://localhost:3000/api/ai/analyze-patterns', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Unauthorized' },
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should proceed if user is authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      (analyzeUserData as any).mockResolvedValue({
        taskStats: {
          total: 10,
          completed: 5,
          pending: 3,
          skipped: 2,
          overdue: 1,
          completionRate: 0.5,
          completedLate: 2,
        },
        goalStats: {
          total: 3,
          active: 2,
          completed: 1,
          activeUnder50Percent: 1,
          newGoalsThisWeek: 0,
          completionRate: 0.33,
        },
        taskPatterns: [],
        goalPatterns: [],
        evidenceStats: { total: 5, thisWeek: 2, byType: {} },
      });

      // Mock DB queries for patterns
      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'pattern-1',
                pattern_type: 'procrastination',
                description: 'Tasks completed late',
                confidence: 0.8,
              },
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: {
              id: 'pattern-1',
              pattern_type: 'procrastination',
              description: 'Tasks completed late',
              confidence: 0.8,
            },
            error: null,
          }),
        }),
      });
      mockSupabase.from = mockFrom;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });

  describe('Pattern Detection', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      (analyzeUserData as any).mockResolvedValue({
        taskStats: {
          total: 10,
          completed: 5,
          pending: 3,
          skipped: 2,
          overdue: 1,
          completionRate: 0.5,
          completedLate: 3,
        },
        goalStats: {
          total: 3,
          active: 2,
          completed: 1,
          activeUnder50Percent: 2,
          newGoalsThisWeek: 1,
          completionRate: 0.33,
        },
        taskPatterns: [
          {
            type: 'procrastination',
            description: '3 tasks completed late',
            confidence: 0.6,
            occurrences: 3,
            evidence: ['Task 1', 'Task 2', 'Task 3'],
          },
        ],
        goalPatterns: [
          {
            type: 'new_project_addiction',
            description: '2 goals under 50% complete',
            confidence: 0.7,
            evidence: ['Goal 1', 'Goal 2'],
          },
        ],
        evidenceStats: { total: 5, thisWeek: 2, byType: {} },
      });
    });

    it('should detect and save patterns', async () => {
      const mockPatternData = {
        id: 'pattern-1',
        pattern_type: 'procrastination',
        description: '3 tasks completed late',
        confidence: 0.6,
      };

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: mockPatternData,
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });
      mockSupabase.from = mockFrom;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.patternsDetected).toBeGreaterThan(0);
      expect(mockFrom).toHaveBeenCalledWith('patterns');
    });

    it('should update existing patterns', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      // Mock analyzeUserData to return data that will trigger pattern detection
      (analyzeUserData as any).mockResolvedValue({
        taskStats: {
          total: 10,
          completed: 5,
          pending: 3,
          skipped: 2,
          overdue: 1,
          completionRate: 0.5,
          completedLate: 3, // This should trigger procrastination pattern
        },
        goalStats: {
          total: 5,
          active: 3,
          completed: 2,
          activeUnder50Percent: 1,
          newGoalsThisWeek: 0,
          completionRate: 0.4,
        },
        evidenceStats: {
          total: 10,
          thisWeek: 2,
        },
        taskPatterns: [],
        goalPatterns: [],
      });

      // Mock AI to return procrastination pattern
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            patterns: [
              {
                type: 'procrastination',
                description: '3 tasks completed late',
                confidence: 0.6,
                shouldSave: true,
              },
            ],
          }),
        },
      });

      const existingPattern = {
        pattern_type: 'procrastination',
        last_occurred: new Date('2024-01-01').toISOString(),
      };

      const updatedPattern = {
        id: 'pattern-1',
        pattern_type: 'procrastination',
        description: '3 tasks completed late',
        confidence: 0.6,
      };

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [existingPattern],
            error: null,
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: updatedPattern,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });
      mockSupabase.from = mockFrom;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.patterns.some((p: any) => p.action === 'updated')).toBe(true);
    });

    it('should skip low confidence patterns', async () => {
      (analyzeUserData as any).mockResolvedValue({
        taskStats: {
          total: 10,
          completed: 5,
          pending: 3,
          skipped: 2,
          overdue: 1,
          completionRate: 0.5,
          completedLate: 1,
        },
        goalStats: {
          total: 3,
          active: 2,
          completed: 1,
          activeUnder50Percent: 0,
          newGoalsThisWeek: 0,
          completionRate: 0.33,
        },
        taskPatterns: [
          {
            type: 'procrastination',
            description: 'Only 1 task late',
            confidence: 0.3, // Low confidence
            occurrences: 1,
            evidence: ['Task 1'],
          },
        ],
        goalPatterns: [],
        evidenceStats: { total: 5, thisWeek: 2, byType: {} },
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });
      mockSupabase.from = mockFrom;

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.patternsSaved).toBe(0);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
    });

    it('should handle Gemini quota exceeded error', async () => {
      (analyzeUserData as any).mockResolvedValue({
        taskStats: { total: 0, completed: 0, pending: 0, skipped: 0, overdue: 0, completionRate: 0, completedLate: 0 },
        goalStats: { total: 0, active: 0, completed: 0, activeUnder50Percent: 0, newGoalsThisWeek: 0, completionRate: 0 },
        taskPatterns: [],
        goalPatterns: [],
        evidenceStats: { total: 0, thisWeek: 0, byType: {} },
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });
      mockSupabase.from = mockFrom;

      mockGenerateContent.mockRejectedValue(
        new Error('[GoogleGenerativeAI Error]: quota exceeded')
      );

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.errorType).toBe('quota_exceeded');
    });

    it('should handle invalid API key error', async () => {
      (analyzeUserData as any).mockResolvedValue({
        taskStats: { total: 0, completed: 0, pending: 0, skipped: 0, overdue: 0, completionRate: 0, completedLate: 0 },
        goalStats: { total: 0, active: 0, completed: 0, activeUnder50Percent: 0, newGoalsThisWeek: 0, completionRate: 0 },
        taskPatterns: [],
        goalPatterns: [],
        evidenceStats: { total: 0, thisWeek: 0, byType: {} },
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });
      mockSupabase.from = mockFrom;

      mockGenerateContent.mockRejectedValue(
        new Error('invalid API key')
      );

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.errorType).toBe('service_unavailable');
    });

    it('should handle database errors', async () => {
      (analyzeUserData as any).mockRejectedValue(
        new Error('Failed to fetch tasks: Database connection error')
      );

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.errorType).toBe('unknown');
    });
  });

  describe('AI Response Parsing', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      (analyzeUserData as any).mockResolvedValue({
        taskStats: { total: 5, completed: 3, pending: 2, skipped: 0, overdue: 0, completionRate: 0.6, completedLate: 0 },
        goalStats: { total: 2, active: 1, completed: 1, activeUnder50Percent: 0, newGoalsThisWeek: 0, completionRate: 0.5 },
        taskPatterns: [],
        goalPatterns: [],
        evidenceStats: { total: 3, thisWeek: 1, byType: {} },
      });

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: 'pattern-1',
                pattern_type: 'test_pattern',
                description: 'Test',
                confidence: 0.8,
              },
              error: null,
            }),
          }),
        }),
      });
      mockSupabase.from = mockFrom;
    });

    it('should handle AI response with markdown code blocks', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => `
Here's the analysis:

\`\`\`json
{
  "patterns": [
    {
      "type": "procrastination",
      "description": "Tasks completed late",
      "confidence": 0.7,
      "shouldSave": true
    }
  ]
}
\`\`\`
            `,
        },
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should handle invalid JSON gracefully', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => 'This is not JSON',
        },
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      // Should still succeed but use detected patterns only
      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });
  });
});

