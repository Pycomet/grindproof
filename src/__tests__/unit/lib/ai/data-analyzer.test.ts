import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchUserTasksAnalysis,
  fetchUserGoalsAnalysis,
  analyzeTaskPatterns,
  analyzeGoalPatterns,
  fetchEvidenceStats,
  analyzeUserData,
} from '@/lib/ai/data-analyzer';

describe('Data Analyzer Utilities', () => {
  const mockUserId = 'user-123';
  let mockSupabase: any;

  beforeEach(() => {
    // Create mock Supabase client
    mockSupabase = {
      from: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      eq: vi.fn(() => mockSupabase),
      in: vi.fn(() => mockSupabase),
      gte: vi.fn(() => mockSupabase),
      lt: vi.fn(() => mockSupabase),
      order: vi.fn(() => mockSupabase),
    };
  });

  describe('fetchUserTasksAnalysis', () => {
    it('should fetch and analyze tasks correctly', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          user_id: mockUserId,
          status: 'completed',
          due_date: new Date('2024-01-15').toISOString(),
          updated_at: new Date('2024-01-16').toISOString(), // Completed late
          created_at: new Date('2024-01-10').toISOString(),
        },
        {
          id: 'task-2',
          user_id: mockUserId,
          status: 'pending',
          due_date: new Date('2024-01-10').toISOString(), // Overdue
          created_at: new Date('2024-01-08').toISOString(),
        },
        {
          id: 'task-3',
          user_id: mockUserId,
          status: 'skipped',
          due_date: new Date('2024-01-12').toISOString(),
          created_at: new Date('2024-01-08').toISOString(),
        },
      ];

      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockTasks,
              error: null,
            }),
          }),
        }),
      });

      const result = await fetchUserTasksAnalysis(mockUserId, mockSupabase);

      expect(result.tasks).toHaveLength(3);
      expect(result.stats.total).toBe(3);
      expect(result.stats.completed).toBe(1);
      expect(result.stats.pending).toBe(1);
      expect(result.stats.skipped).toBe(1);
      expect(result.stats.completionRate).toBeCloseTo(0.33, 1);
    });

    it('should handle empty task list', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const result = await fetchUserTasksAnalysis(mockUserId, mockSupabase);

      expect(result.tasks).toHaveLength(0);
      expect(result.stats.total).toBe(0);
      expect(result.stats.completionRate).toBe(0);
    });

    it('should handle database errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      await expect(fetchUserTasksAnalysis(mockUserId, mockSupabase))
        .rejects
        .toThrow('Failed to fetch tasks: Database error');
    });
  });

  describe('fetchUserGoalsAnalysis', () => {
    it('should fetch and analyze goals correctly', async () => {
      const now = new Date();
      const mockGoals = [
        {
          id: 'goal-1',
          user_id: mockUserId,
          status: 'active',
          priority: 'high',
          created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        },
        {
          id: 'goal-2',
          user_id: mockUserId,
          status: 'completed',
          priority: 'medium',
          created_at: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
        },
        {
          id: 'goal-3',
          user_id: mockUserId,
          status: 'paused',
          priority: 'low',
          created_at: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days ago
        },
      ];

      const mockTasks = [
        { id: 'task-1', goal_id: 'goal-1', status: 'completed' },
        { id: 'task-2', goal_id: 'goal-1', status: 'pending' },
        { id: 'task-3', goal_id: 'goal-1', status: 'pending' },
        { id: 'task-4', goal_id: 'goal-2', status: 'completed' },
      ];

      // Mock goals query
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'goals') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockGoals,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockTasks,
                error: null,
              }),
            }),
          };
        }
        return mockSupabase;
      });

      const result = await fetchUserGoalsAnalysis(mockUserId, mockSupabase);

      expect(result.goals).toHaveLength(3);
      expect(result.stats.total).toBe(3);
      expect(result.stats.active).toBe(1);
      expect(result.stats.completed).toBe(1);
      expect(result.stats.paused).toBe(1);
      expect(result.stats.highPriorityActive).toBe(1);
      expect(result.stats.completionRate).toBeCloseTo(0.33, 1);
    });

    it('should handle empty goal list', async () => {
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'goals') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return mockSupabase;
      });

      const result = await fetchUserGoalsAnalysis(mockUserId, mockSupabase);

      expect(result.goals).toHaveLength(0);
      expect(result.stats.total).toBe(0);
      expect(result.stats.completionRate).toBe(0);
    });
  });

  describe('analyzeTaskPatterns', () => {
    it('should detect procrastination pattern', () => {
      const tasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          status: 'completed',
          due_date: new Date('2024-01-10').toISOString(),
          updated_at: new Date('2024-01-15').toISOString(), // 5 days late
        },
        {
          id: 'task-2',
          title: 'Task 2',
          status: 'completed',
          due_date: new Date('2024-01-12').toISOString(),
          updated_at: new Date('2024-01-18').toISOString(), // 6 days late
        },
        {
          id: 'task-3',
          title: 'Task 3',
          status: 'completed',
          due_date: new Date('2024-01-08').toISOString(),
          updated_at: new Date('2024-01-07').toISOString(), // On time
        },
      ];

      const patterns = analyzeTaskPatterns(tasks);

      const procrastination = patterns.find(p => p.type === 'procrastination');
      expect(procrastination).toBeDefined();
      expect(procrastination?.occurrences).toBe(2);
      expect(procrastination?.confidence).toBeGreaterThan(0.5);
    });

    it('should detect task skipping pattern', () => {
      const tasks = [
        { id: 'task-1', title: 'Task 1', status: 'skipped' },
        { id: 'task-2', title: 'Task 2', status: 'skipped' },
        { id: 'task-3', title: 'Task 3', status: 'skipped' },
        { id: 'task-4', title: 'Task 4', status: 'completed' },
      ];

      const patterns = analyzeTaskPatterns(tasks);

      const skipping = patterns.find(p => p.type === 'task_skipping');
      expect(skipping).toBeDefined();
      expect(skipping?.occurrences).toBe(3);
      expect(skipping?.confidence).toBeGreaterThan(0.5);
    });

    it('should detect overcommitment pattern', () => {
      const tasks = Array.from({ length: 8 }, (_, i) => ({
        id: `task-${i}`,
        title: `Task ${i}`,
        status: 'pending',
        due_date: new Date('2024-01-01').toISOString(), // All overdue
      }));

      const patterns = analyzeTaskPatterns(tasks);

      const overcommitment = patterns.find(p => p.type === 'overcommitment');
      expect(overcommitment).toBeDefined();
      expect(overcommitment?.occurrences).toBe(8);
    });

    it('should return empty array for empty tasks', () => {
      const patterns = analyzeTaskPatterns([]);
      expect(patterns).toEqual([]);
    });

    it('should not detect patterns below threshold', () => {
      const tasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          status: 'completed',
          due_date: new Date('2024-01-10').toISOString(),
          updated_at: new Date('2024-01-11').toISOString(), // Only 1 late task
        },
        {
          id: 'task-2',
          title: 'Task 2',
          status: 'completed',
          due_date: new Date('2024-01-12').toISOString(),
          updated_at: new Date('2024-01-11').toISOString(), // On time
        },
      ];

      const patterns = analyzeTaskPatterns(tasks);

      // Should not detect procrastination with only 1/2 late tasks (50%)
      const procrastination = patterns.find(p => p.type === 'procrastination');
      expect(procrastination).toBeUndefined();
    });
  });

  describe('analyzeGoalPatterns', () => {
    it('should detect new project addiction pattern', () => {
      const goals = [
        { id: 'goal-1', title: 'Goal 1', status: 'active' },
        { id: 'goal-2', title: 'Goal 2', status: 'active' },
        { id: 'goal-3', title: 'Goal 3', status: 'active' },
        { id: 'goal-4', title: 'Goal 4', status: 'active' },
      ];

      const tasks = [
        { id: 'task-1', goal_id: 'goal-1', status: 'pending' },
        { id: 'task-2', goal_id: 'goal-1', status: 'pending' },
        { id: 'task-3', goal_id: 'goal-2', status: 'pending' },
        { id: 'task-4', goal_id: 'goal-3', status: 'pending' },
      ];

      const patterns = analyzeGoalPatterns(goals, tasks);

      const addiction = patterns.find(p => p.type === 'new_project_addiction');
      expect(addiction).toBeDefined();
      expect(addiction?.confidence).toBeGreaterThan(0);
    });

    it('should detect goal abandonment pattern', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35); // 35 days ago

      const goals = [
        { id: 'goal-1', title: 'Goal 1', status: 'active' },
        { id: 'goal-2', title: 'Goal 2', status: 'active' },
      ];

      const tasks = [
        { id: 'task-1', goal_id: 'goal-1', status: 'pending', updated_at: oldDate.toISOString() },
        { id: 'task-2', goal_id: 'goal-2', status: 'pending', updated_at: oldDate.toISOString() },
      ];

      const patterns = analyzeGoalPatterns(goals, tasks);

      const abandonment = patterns.find(p => p.type === 'goal_abandonment');
      expect(abandonment).toBeDefined();
      expect(abandonment?.confidence).toBeGreaterThan(0);
    });

    it('should detect planning without execution pattern', () => {
      const goals = [
        { id: 'goal-1', title: 'Goal 1', status: 'active' },
        { id: 'goal-2', title: 'Goal 2', status: 'active' },
        { id: 'goal-3', title: 'Goal 3', status: 'active' },
      ];

      const tasks: any[] = []; // No tasks for any goals

      const patterns = analyzeGoalPatterns(goals, tasks);

      const planning = patterns.find(p => p.type === 'planning_without_execution');
      expect(planning).toBeDefined();
      expect(planning?.confidence).toBe(1.0);
    });

    it('should return empty array for empty goals', () => {
      const patterns = analyzeGoalPatterns([], []);
      expect(patterns).toEqual([]);
    });
  });

  describe('fetchEvidenceStats', () => {
    it('should fetch and calculate evidence statistics', async () => {
      const now = new Date();
      const thisWeek = new Date(now);
      thisWeek.setDate(now.getDate() - 2); // 2 days ago

      const mockTasks = [
        { id: 'task-1' },
        { id: 'task-2' },
      ];

      const mockEvidence = [
        {
          id: 'evidence-1',
          task_id: 'task-1',
          type: 'photo',
          submitted_at: thisWeek.toISOString(),
        },
        {
          id: 'evidence-2',
          task_id: 'task-2',
          type: 'screenshot',
          submitted_at: thisWeek.toISOString(),
        },
        {
          id: 'evidence-3',
          task_id: 'task-1',
          type: 'text',
          submitted_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
        },
      ];

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: mockTasks,
                error: null,
              }),
            }),
          };
        }
        if (table === 'evidence') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: mockEvidence,
                error: null,
              }),
            }),
          };
        }
        return mockSupabase;
      });

      const result = await fetchEvidenceStats(mockUserId, mockSupabase);

      expect(result.total).toBe(3);
      expect(result.thisWeek).toBe(2);
      expect(result.byType).toEqual({
        photo: 1,
        screenshot: 1,
        text: 1,
      });
    });

    it('should handle no tasks', async () => {
      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          };
        }
        return mockSupabase;
      });

      const result = await fetchEvidenceStats(mockUserId, mockSupabase);

      expect(result.total).toBe(0);
      expect(result.thisWeek).toBe(0);
      expect(result.byType).toEqual({});
    });
  });

  describe('analyzeUserData', () => {
    it('should perform comprehensive analysis', async () => {
      const mockTasks = [
        {
          id: 'task-1',
          title: 'Task 1',
          user_id: mockUserId,
          status: 'completed',
          due_date: new Date('2024-01-10').toISOString(),
          updated_at: new Date('2024-01-15').toISOString(),
          created_at: new Date('2024-01-08').toISOString(),
        },
      ];

      const mockGoals = [
        {
          id: 'goal-1',
          user_id: mockUserId,
          title: 'Goal 1',
          status: 'active',
          priority: 'high',
          created_at: new Date().toISOString(),
        },
      ];

      const mockGoalTasks = [
        { id: 'task-1', goal_id: 'goal-1', status: 'pending' },
      ];

      const mockUserTasks = [{ id: 'task-1' }];
      const mockEvidence: any[] = [];

      mockSupabase.from = vi.fn((table: string) => {
        if (table === 'tasks') {
          return {
            select: vi.fn((fields: string) => {
              if (fields === 'id') {
                return {
                  eq: vi.fn().mockResolvedValue({
                    data: mockUserTasks,
                    error: null,
                  }),
                };
              }
              if (fields === 'id, goal_id, status') {
                return {
                  eq: vi.fn().mockResolvedValue({
                    data: mockGoalTasks,
                    error: null,
                  }),
                };
              }
              return {
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: mockTasks,
                    error: null,
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
                order: vi.fn().mockResolvedValue({
                  data: mockGoals,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'evidence') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: mockEvidence,
                error: null,
              }),
            }),
          };
        }
        return mockSupabase;
      });

      const result = await analyzeUserData(mockUserId, mockSupabase);

      expect(result).toHaveProperty('taskStats');
      expect(result).toHaveProperty('goalStats');
      expect(result).toHaveProperty('taskPatterns');
      expect(result).toHaveProperty('goalPatterns');
      expect(result).toHaveProperty('evidenceStats');
      
      expect(result.taskStats.total).toBe(1);
      expect(result.goalStats.total).toBe(1);
    });
  });
});

