import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/ai/generate-roast/route';
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

// Mock Google Generative AI - use factory function to access mocks
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: mockGenerateContent,
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(function() {
    return {
      getGenerativeModel: () => mockGetGenerativeModel(),
    };
  }),
}));

import { createServerClient } from '@/lib/supabase/server';
import { analyzeUserData } from '@/lib/ai/data-analyzer';
import { GoogleGenerativeAI } from '@google/generative-ai';

describe('Weekly Roast API Route', () => {
  let mockSupabase: any;
  let mockRequest: NextRequest;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Set default Gemini response
    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          insights: [
            {
              emoji: '💪',
              text: 'Completed 5/10 tasks this week',
              severity: 'medium',
            },
          ],
          recommendations: [
            'Focus on completing pending tasks',
            'Set more realistic daily goals',
          ],
          weekSummary: 'Good progress this week, keep pushing!',
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
    mockRequest = new NextRequest('http://localhost:3000/api/ai/generate-roast', {
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
  });

  describe('Metric Calculation', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      (analyzeUserData as any).mockResolvedValue({
        taskStats: {
          total: 20,
          completed: 12,
          pending: 6,
          skipped: 2,
          overdue: 3,
          completionRate: 0.6,
        },
        goalStats: {
          total: 5,
          active: 3,
          completed: 2,
          activeUnder50Percent: 2,
          newGoalsThisWeek: 1,
        },
        taskPatterns: [],
        goalPatterns: [],
        evidenceStats: { total: 8, thisWeek: 3, byType: { photo: 2, text: 1 } },
      });
    });

    it('should calculate weekly metrics correctly', async () => {
      const weekStart = new Date('2024-01-07');
      const weekEnd = new Date('2024-01-14');

      const mockTasks = [
        {
          id: 'task-1',
          user_id: 'user-123',
          status: 'completed',
          due_date: new Date('2024-01-10').toISOString(),
          created_at: new Date('2024-01-08').toISOString(),
        },
        {
          id: 'task-2',
          user_id: 'user-123',
          status: 'pending',
          due_date: new Date('2024-01-11').toISOString(),
          created_at: new Date('2024-01-09').toISOString(),
        },
      ];

      // Helper to create chainable query builder
      const createQueryBuilder = (finalResult: any) => {
        const builder: any = {
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(finalResult),
          maybeSingle: vi.fn().mockResolvedValue(finalResult),
        };
        // Make methods return the builder for chaining
        builder.eq.mockReturnValue(builder);
        builder.gte.mockReturnValue(builder);
        builder.lt.mockReturnValue(builder);
        builder.in.mockReturnValue(builder);
        builder.order.mockReturnValue(builder);
        return builder;
      };

      // Mock all DB queries
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'tasks') {
          return {
            select: vi.fn((fields: string) => {
              if (fields === 'id') {
                return createQueryBuilder({
                  data: mockTasks.map(t => ({ id: t.id })),
                  error: null,
                });
              }
              // For '*' or other fields, return tasks with chaining
              return createQueryBuilder({
                data: mockTasks,
                error: null,
              });
            }),
          };
        }
        if (table === 'goals') {
          return {
            select: vi.fn(() => createQueryBuilder({
              data: [],
              error: null,
            })),
          };
        }
        if (table === 'evidence') {
          return {
            select: vi.fn(() => createQueryBuilder({
              data: [],
              error: null,
            })),
          };
        }
        if (table === 'patterns') {
          return {
            select: vi.fn(() => createQueryBuilder({
              data: [],
              error: null,
            })),
          };
        }
        if (table === 'accountability_scores') {
          return {
            select: vi.fn(() => createQueryBuilder({
              data: null,
              error: null,
            })),
            insert: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: null,
                error: null,
              }),
            }),
          };
        }
        return {
          select: vi.fn(() => createQueryBuilder({
            data: null,
            error: null,
          })),
        };
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data).toHaveProperty('alignmentScore');
      expect(data).toHaveProperty('honestyScore');
      expect(data).toHaveProperty('completionRate');
      expect(data.alignmentScore).toBeGreaterThanOrEqual(0);
      expect(data.alignmentScore).toBeLessThanOrEqual(1);
    });

    it('should handle custom week start date', async () => {
      const customWeekStart = '2024-01-14';
      const customRequest = new NextRequest('http://localhost:3000/api/ai/generate-roast', {
        method: 'POST',
        body: JSON.stringify({ weekStart: customWeekStart }),
      });

      (analyzeUserData as any).mockResolvedValue({
        taskStats: { total: 0, completed: 0, pending: 0, skipped: 0, overdue: 0, completionRate: 0 },
        goalStats: { total: 0, active: 0, completed: 0, activeUnder50Percent: 0, newGoalsThisWeek: 0 },
        taskPatterns: [],
        goalPatterns: [],
        evidenceStats: { total: 0, thisWeek: 0, byType: {} },
      });

      // Helper to create chainable query builder
      const createQueryBuilder = (finalResult: any) => {
        const builder: any = {
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(finalResult),
          maybeSingle: vi.fn().mockResolvedValue(finalResult),
        };
        builder.eq.mockReturnValue(builder);
        builder.gte.mockReturnValue(builder);
        builder.lt.mockReturnValue(builder);
        builder.in.mockReturnValue(builder);
        builder.order.mockReturnValue(builder);
        return builder;
      };

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'tasks') {
          return {
            select: vi.fn(() => createQueryBuilder({
              data: [],
              error: null,
            })),
          };
        }
        if (table === 'goals') {
          return {
            select: vi.fn(() => createQueryBuilder({
              data: [],
              error: null,
            })),
          };
        }
        if (table === 'evidence') {
          return {
            select: vi.fn(() => createQueryBuilder({
              data: [],
              error: null,
            })),
          };
        }
        if (table === 'patterns') {
          return {
            select: vi.fn(() => createQueryBuilder({
              data: [],
              error: null,
            })),
          };
        }
        if (table === 'accountability_scores') {
          return {
            select: vi.fn(() => createQueryBuilder({
              data: null,
              error: null,
            })),
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        return {
          select: vi.fn(() => createQueryBuilder({
            data: null,
            error: null,
          })),
        };
      });

      const response = await POST(customRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      // The weekStart might be adjusted due to timezone, so just check it's a valid date string
      expect(data.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // Check that it's close to the requested date (within 1 day, inclusive)
      const requestedDate = new Date(customWeekStart);
      const returnedDate = new Date(data.weekStart);
      const diffDays = Math.abs((returnedDate.getTime() - requestedDate.getTime()) / (1000 * 60 * 60 * 24));
      expect(diffDays).toBeLessThanOrEqual(1);
    });
  });

  describe('Database Persistence', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      (analyzeUserData as any).mockResolvedValue({
        taskStats: { total: 10, completed: 7, pending: 3, skipped: 0, overdue: 0, completionRate: 0.7 },
        goalStats: { total: 3, active: 2, completed: 1, activeUnder50Percent: 1, newGoalsThisWeek: 0 },
        taskPatterns: [],
        goalPatterns: [],
        evidenceStats: { total: 5, thisWeek: 2, byType: {} },
      });
    });

    it('should create new accountability score', async () => {
      const insertMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      // Helper to create chainable query builder
      const createQueryBuilder = (finalResult: any) => {
        const builder: any = {
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(finalResult),
          maybeSingle: vi.fn().mockResolvedValue(finalResult),
        };
        builder.eq.mockReturnValue(builder);
        builder.gte.mockReturnValue(builder);
        builder.lt.mockReturnValue(builder);
        builder.in.mockReturnValue(builder);
        builder.order.mockReturnValue(builder);
        return builder;
      };

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'accountability_scores') {
          return {
            select: vi.fn(() => createQueryBuilder({
              data: null, // No existing score
              error: null,
            })),
            insert: insertMock,
          };
        }
        // Mock all other tables
        return {
          select: vi.fn(() => createQueryBuilder({
            data: [],
            error: null,
          })),
        };
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(insertMock).toHaveBeenCalled();
      const insertCall = insertMock.mock.calls[0][0];
      expect(insertCall).toHaveProperty('user_id');
      expect(insertCall).toHaveProperty('week_start');
      expect(insertCall).toHaveProperty('alignment_score');
      expect(insertCall).toHaveProperty('honesty_score');
      expect(insertCall).toHaveProperty('insights');
      expect(insertCall).toHaveProperty('recommendations');
      expect(insertCall).toHaveProperty('week_summary');
      expect(Array.isArray(insertCall.insights)).toBe(true);
      expect(Array.isArray(insertCall.recommendations)).toBe(true);
    });

    it('should update existing accountability score', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      // Helper to create chainable query builder
      const createQueryBuilder = (finalResult: any) => {
        const builder: any = {
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(finalResult),
          maybeSingle: vi.fn().mockResolvedValue(finalResult),
        };
        builder.eq.mockReturnValue(builder);
        builder.gte.mockReturnValue(builder);
        builder.lt.mockReturnValue(builder);
        builder.in.mockReturnValue(builder);
        builder.order.mockReturnValue(builder);
        return builder;
      };

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'accountability_scores') {
          return {
            select: vi.fn(() => createQueryBuilder({
              data: { id: 'score-1' }, // Existing score
              error: null,
            })),
            update: updateMock,
          };
        }
        return {
          select: vi.fn(() => createQueryBuilder({
            data: [],
            error: null,
          })),
        };
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(updateMock).toHaveBeenCalled();
      const updateCall = updateMock.mock.calls[0][0];
      expect(updateCall).toHaveProperty('alignment_score');
      expect(updateCall).toHaveProperty('honesty_score');
      expect(updateCall).toHaveProperty('insights');
      expect(updateCall).toHaveProperty('recommendations');
      expect(updateCall).toHaveProperty('week_summary');
      expect(Array.isArray(updateCall.insights)).toBe(true);
      expect(Array.isArray(updateCall.recommendations)).toBe(true);
    });

    it('should save insights, recommendations, and weekSummary to database', async () => {
      const insertMock = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      });

      const mockInsights = [
        { emoji: '💪', text: 'Great progress', severity: 'positive' },
        { emoji: '⚠️', text: 'Some tasks overdue', severity: 'medium' },
      ];
      const mockRecommendations = [
        'Focus on completing pending tasks',
        'Set more realistic deadlines',
      ];
      const mockWeekSummary = 'Good week overall with room for improvement';

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({
            insights: mockInsights,
            recommendations: mockRecommendations,
            weekSummary: mockWeekSummary,
          }),
        },
      });

      // Helper to create chainable query builder
      const createQueryBuilder = (finalResult: any) => {
        const builder: any = {
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(finalResult),
          maybeSingle: vi.fn().mockResolvedValue(finalResult),
        };
        builder.eq.mockReturnValue(builder);
        builder.gte.mockReturnValue(builder);
        builder.lt.mockReturnValue(builder);
        builder.in.mockReturnValue(builder);
        builder.order.mockReturnValue(builder);
        return builder;
      };

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'accountability_scores') {
          return {
            select: vi.fn(() => createQueryBuilder({
              data: null, // No existing score
              error: null,
            })),
            insert: insertMock,
          };
        }
        return {
          select: vi.fn(() => createQueryBuilder({
            data: [],
            error: null,
          })),
        };
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(insertMock).toHaveBeenCalled();
      const insertCall = insertMock.mock.calls[0][0];
      
      // Verify insights are saved
      expect(insertCall.insights).toEqual(mockInsights);
      expect(insertCall.insights.length).toBe(2);
      
      // Verify recommendations are saved
      expect(insertCall.recommendations).toEqual(mockRecommendations);
      expect(insertCall.recommendations.length).toBe(2);
      
      // Verify week summary is saved
      expect(insertCall.week_summary).toBe(mockWeekSummary);
      
      // Verify response includes the data
      expect(data.insights).toEqual(mockInsights);
      expect(data.recommendations).toEqual(mockRecommendations);
      expect(data.weekSummary).toBe(mockWeekSummary);
    });
  });

  describe('AI Insights Generation', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      (analyzeUserData as any).mockResolvedValue({
        taskStats: { total: 15, completed: 10, pending: 5, skipped: 0, overdue: 2, completionRate: 0.67 },
        goalStats: { total: 4, active: 3, completed: 1, activeUnder50Percent: 2, newGoalsThisWeek: 1 },
        taskPatterns: [],
        goalPatterns: [],
        evidenceStats: { total: 7, thisWeek: 4, byType: {} },
      });

      // Helper to create chainable query builder
      const createQueryBuilder = (finalResult: any) => {
        const builder: any = {
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(finalResult),
          maybeSingle: vi.fn().mockResolvedValue(finalResult),
        };
        builder.eq.mockReturnValue(builder);
        builder.gte.mockReturnValue(builder);
        builder.lt.mockReturnValue(builder);
        builder.in.mockReturnValue(builder);
        builder.order.mockReturnValue(builder);
        return builder;
      };

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'accountability_scores') {
          return {
            select: vi.fn(() => createQueryBuilder({
              data: null,
              error: null,
            })),
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        return {
          select: vi.fn(() => createQueryBuilder({
            data: [],
            error: null,
          })),
        };
      });
    });

    it('should include AI-generated insights in response', async () => {
      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty('insights');
      expect(Array.isArray(data.insights)).toBe(true);
      expect(data).toHaveProperty('recommendations');
      expect(Array.isArray(data.recommendations)).toBe(true);
      expect(data).toHaveProperty('weekSummary');
    });

    it('should provide fallback insights if AI parsing fails', async () => {
      // Ensure we have some metrics for fallback insights
      (analyzeUserData as any).mockResolvedValue({
        taskStats: { total: 10, completed: 5, pending: 5, skipped: 0, overdue: 0, completionRate: 0.5 },
        goalStats: { total: 3, active: 2, completed: 1, activeUnder50Percent: 1, newGoalsThisWeek: 0 },
        taskPatterns: [],
        goalPatterns: [],
        evidenceStats: { total: 5, thisWeek: 2, byType: {} },
      });

      // Mock tasks so calculateWeeklyMetrics can compute metrics
      const mockTasks = [
        {
          id: 'task-1',
          user_id: 'user-123',
          status: 'completed',
          due_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        {
          id: 'task-2',
          user_id: 'user-123',
          status: 'pending',
          due_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
      ];

      // Helper to create chainable query builder
      const createQueryBuilder = (finalResult: any) => {
        const builder: any = {
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(finalResult),
          maybeSingle: vi.fn().mockResolvedValue(finalResult),
        };
        builder.eq.mockReturnValue(builder);
        builder.gte.mockReturnValue(builder);
        builder.lt.mockReturnValue(builder);
        builder.in.mockReturnValue(builder);
        builder.order.mockReturnValue(builder);
        return builder;
      };

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'tasks') {
          return {
            select: vi.fn((fields: string) => {
              if (fields === 'id') {
                return createQueryBuilder({
                  data: mockTasks.map(t => ({ id: t.id })),
                  error: null,
                });
              }
              return createQueryBuilder({
                data: mockTasks,
                error: null,
              });
            }),
          };
        }
        if (table === 'goals') {
          return {
            select: vi.fn(() => createQueryBuilder({
              data: [],
              error: null,
            })),
          };
        }
        if (table === 'evidence') {
          return {
            select: vi.fn(() => createQueryBuilder({
              data: [],
              error: null,
            })),
          };
        }
        if (table === 'patterns') {
          return {
            select: vi.fn(() => createQueryBuilder({
              data: [],
              error: null,
            })),
          };
        }
        if (table === 'accountability_scores') {
          return {
            select: vi.fn(() => createQueryBuilder({
              data: null,
              error: null,
            })),
            insert: vi.fn().mockResolvedValue({ data: null, error: null }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          };
        }
        return {
          select: vi.fn(() => createQueryBuilder({
            data: [],
            error: null,
          })),
        };
      });

      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '{ invalid json }', // Has JSON-like structure but invalid, will trigger catch block
        },
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.insights).toBeDefined();
      expect(Array.isArray(data.insights)).toBe(true);
      // Fallback should always provide at least one insight
      expect(data.insights.length).toBeGreaterThan(0);
    });

    it('should handle AI response with markdown code blocks', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => `
Here's your roast:

\`\`\`json
{
  "insights": [
    {
      "emoji": "🔥",
      "text": "Great week!",
      "severity": "positive"
    }
  ],
  "recommendations": ["Keep it up"],
  "weekSummary": "Solid performance"
}
\`\`\`
            `,
        },
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.insights).toBeDefined();
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
        taskStats: { total: 0, completed: 0, pending: 0, skipped: 0, overdue: 0, completionRate: 0 },
        goalStats: { total: 0, active: 0, completed: 0, activeUnder50Percent: 0, newGoalsThisWeek: 0 },
        taskPatterns: [],
        goalPatterns: [],
        evidenceStats: { total: 0, thisWeek: 0, byType: {} },
      });

      // Helper to create chainable query builder
      const createQueryBuilder = (finalResult: any) => {
        const builder: any = {
          eq: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue(finalResult),
          maybeSingle: vi.fn().mockResolvedValue(finalResult),
        };
        builder.eq.mockReturnValue(builder);
        builder.gte.mockReturnValue(builder);
        builder.lt.mockReturnValue(builder);
        builder.in.mockReturnValue(builder);
        builder.order.mockReturnValue(builder);
        return builder;
      };

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => createQueryBuilder({
          data: [],
          error: null,
        })),
      }));

      mockGenerateContent.mockRejectedValue(
        new Error('quota exceeded')
      );

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.errorType).toBe('quota_exceeded');
    });

    it('should handle database errors gracefully', async () => {
      (analyzeUserData as any).mockRejectedValue(
        new Error('Database connection failed')
      );

      // Mock Supabase to return error
      mockSupabase.from = vi.fn(() => {
        throw new Error('Database connection failed');
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});


