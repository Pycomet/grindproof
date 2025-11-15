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

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(),
}));

import { createServerClient } from '@/lib/supabase/server';
import { analyzeUserData } from '@/lib/ai/data-analyzer';
import { GoogleGenerativeAI } from '@google/generative-ai';

describe('Weekly Roast API Route', () => {
  let mockSupabase: any;
  let mockGenAI: any;
  let mockRequest: NextRequest;

  beforeEach(() => {
    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(),
    };

    (createServerClient as any).mockResolvedValue(mockSupabase);

    // Mock Gemini AI
    const mockSendMessage = vi.fn();
    const mockResponse = {
      response: vi.fn().mockResolvedValue({
        text: vi.fn().mockReturnValue(JSON.stringify({
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
        })),
      }),
    };
    mockSendMessage.mockResolvedValue(mockResponse);

    mockGenAI = {
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockSendMessage,
      }),
    };

    (GoogleGenerativeAI as any).mockImplementation(() => mockGenAI);

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

      // Mock all DB queries
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'tasks') {
          return {
            select: vi.fn((fields: string) => {
              if (fields === 'id') {
                return {
                  eq: vi.fn().mockResolvedValue({
                    data: mockTasks.map(t => ({ id: t.id })),
                    error: null,
                  }),
                };
              }
              if (fields === '*') {
                return {
                  eq: vi.fn().mockReturnValue({
                    gte: vi.fn().mockReturnValue({
                      lt: vi.fn().mockResolvedValue({
                        data: mockTasks,
                        error: null,
                      }),
                    }),
                  }),
                };
              }
              return {
                eq: vi.fn().mockReturnValue({
                  gte: vi.fn().mockReturnValue({
                    lt: vi.fn().mockResolvedValue({
                      data: mockTasks,
                      error: null,
                    }),
                  }),
                }),
              };
            }),
          };
        }
        if (table === 'goals') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lt: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'evidence') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                gte: vi.fn().mockReturnValue({
                  lt: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'patterns') {
          return {
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
          };
        }
        if (table === 'accountability_scores') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockResolvedValue({
              data: null,
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockResolvedValue({ data: null, error: null }),
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

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'tasks') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                gte: vi.fn(() => ({
                  lt: vi.fn().mockResolvedValue({ data: [], error: null }),
                })),
              })),
            })),
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lt: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
              })),
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
            in: vi.fn(() => ({
              gte: vi.fn(() => ({
                lt: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          })),
          insert: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const response = await POST(customRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.weekStart).toBe(customWeekStart);
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

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'accountability_scores') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null, // No existing score
                    error: null,
                  }),
                }),
              }),
            }),
            insert: insertMock,
          };
        }
        // Mock all other tables
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lt: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
            in: vi.fn(() => ({
              gte: vi.fn(() => ({
                lt: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
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
    });

    it('should update existing accountability score', async () => {
      const updateMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'accountability_scores') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'score-1' }, // Existing score
                    error: null,
                  }),
                }),
              }),
            }),
            update: updateMock,
          };
        }
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lt: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
              order: vi.fn(() => ({
                limit: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
            in: vi.fn(() => ({
              gte: vi.fn(() => ({
                lt: vi.fn().mockResolvedValue({ data: [], error: null }),
              })),
            })),
          })),
        };
      });

      const response = await POST(mockRequest);

      expect(response.status).toBe(200);
      expect(updateMock).toHaveBeenCalled();
      const updateCall = updateMock.mock.calls[0][0];
      expect(updateCall).toHaveProperty('alignment_score');
      expect(updateCall).toHaveProperty('honesty_score');
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

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lt: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
          in: vi.fn(() => ({
            gte: vi.fn(() => ({
              lt: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
        })),
        insert: vi.fn().mockResolvedValue({ data: null, error: null }),
      }));
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
      mockGenAI.getGenerativeModel.mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: vi.fn().mockResolvedValue({
            text: vi.fn().mockReturnValue('Invalid JSON response'),
          }),
        }),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.insights).toBeDefined();
      expect(data.insights.length).toBeGreaterThan(0);
    });

    it('should handle AI response with markdown code blocks', async () => {
      mockGenAI.getGenerativeModel.mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          response: vi.fn().mockResolvedValue({
            text: vi.fn().mockReturnValue(`
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
            `),
          }),
        }),
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

      mockSupabase.from = vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            gte: vi.fn(() => ({
              lt: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
        })),
      }));

      mockGenAI.getGenerativeModel.mockReturnValue({
        generateContent: vi.fn().mockRejectedValue(
          new Error('quota exceeded')
        ),
      });

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.errorType).toBe('quota_exceeded');
    });

    it('should handle database errors gracefully', async () => {
      (analyzeUserData as any).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await POST(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
    });
  });
});

