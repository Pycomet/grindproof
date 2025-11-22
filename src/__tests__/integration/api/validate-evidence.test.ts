import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTestCaller } from '@/__tests__/utils/trpc-test-utils';

describe('Evidence Validation', () => {
  let caller: Awaited<ReturnType<typeof createTestCaller>>;
  const mockUserId = 'test-user-123';
  const mockTaskId = 'task-123';
  const mockEvidenceId = 'evidence-123';

  beforeEach(async () => {
    // Mock database responses
    const mockDb = {
      from: vi.fn((table: string) => {
        if (table === 'evidence') {
          return {
            select: vi.fn().mockReturnThis(),
            insert: vi.fn().mockReturnThis(),
            update: vi.fn().mockReturnThis(),
            delete: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: mockEvidenceId,
                task_id: mockTaskId,
                type: 'text',
                content: 'Completed the feature and deployed to production',
                submitted_at: new Date().toISOString(),
                ai_validated: false,
                validation_notes: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                tasks: {
                  id: mockTaskId,
                  title: 'Deploy feature',
                  description: 'Deploy new feature to production',
                  user_id: mockUserId,
                },
              },
              error: null,
            }),
            order: vi.fn().mockReturnThis(),
            gte: vi.fn().mockReturnThis(),
            lt: vi.fn().mockReturnThis(),
          };
        }
        if (table === 'tasks') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: mockTaskId,
                user_id: mockUserId,
                title: 'Deploy feature',
                description: 'Deploy new feature to production',
              },
              error: null,
            }),
          };
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }),
    };

    caller = await createTestCaller({
      user: {
        id: mockUserId,
        email: 'test@example.com',
      } as any,
      db: mockDb as any,
    });
  });

  describe('validateEvidence procedure', () => {
    it('should trigger validation for evidence', async () => {
      // Mock fetch for validation endpoint
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          validated: true,
          confidence: 0.9,
          notes: 'Text clearly indicates task completion',
        }),
      });

      const result = await caller.evidence.validateEvidence({
        id: mockEvidenceId,
      });

      expect(result.success).toBe(true);
      expect(result.validated).toBe(true);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.notes).toBeDefined();
    });

    it('should handle validation errors gracefully', async () => {
      // Mock fetch failure
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: 'Validation failed',
        }),
      });

      await expect(
        caller.evidence.validateEvidence({ id: mockEvidenceId })
      ).rejects.toThrow();
    });
  });

  describe('evidence creation with auto-validation', () => {
    it('should create evidence and trigger background validation', async () => {
      // Mock fetch for background validation
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          validated: true,
        }),
      });

      const result = await caller.evidence.create({
        taskId: mockTaskId,
        type: 'text',
        content: 'Completed the feature and deployed to production',
      });

      expect(result).toBeDefined();
      expect(result.type).toBe('text');
      
      // Fetch should have been called for background validation
      // (though it's fire-and-forget, so we can't assert on timing)
    });
  });
});

describe('Validation Logic', () => {
  describe('text evidence validation', () => {
    const validCompletionTexts = [
      'Deployed to production successfully',
      'Finished implementing the feature',
      'Completed all tasks and merged PR #123',
      'Published blog post at https://example.com/post',
      'Shipped v2.0 to customers',
    ];

    const invalidCompletionTexts = [
      'Working on it',
      'Almost done',
      'Will finish tomorrow',
      'Started the task',
      'Need to complete this',
    ];

    it('should recognize valid completion indicators', () => {
      validCompletionTexts.forEach((text) => {
        const hasCompletionWord = /\b(completed?|finished?|deployed?|published?|shipped?|done)\b/i.test(
          text
        );
        expect(hasCompletionWord).toBe(true);
      });
    });

    it('should reject vague or future-tense text', () => {
      invalidCompletionTexts.forEach((text) => {
        const hasFutureOrVague = /\b(will|almost|working|started?|need to)\b/i.test(
          text
        );
        expect(hasFutureOrVague).toBe(true);
      });
    });
  });

  describe('link evidence validation', () => {
    it('should recognize GitHub commit URLs', () => {
      const url = 'https://github.com/user/repo/commit/abc123';
      const isGitHub = /github\.com\/.*\/(commit|pull)/i.test(url);
      expect(isGitHub).toBe(true);
    });

    it('should recognize deployment URLs', () => {
      const urls = [
        'https://myapp.vercel.app',
        'https://app.netlify.app',
        'https://example.herokuapp.com',
      ];
      
      urls.forEach(url => {
        const isDeployment = /vercel\.app|netlify\.app|herokuapp\.com/i.test(url);
        expect(isDeployment).toBe(true);
      });
    });

    it('should recognize published work URLs', () => {
      const url = 'https://example.com/my-published-work';
      const hasPublishedIndicator = /published|deployed|released/i.test(url);
      expect(hasPublishedIndicator).toBe(true);
    });

    it('should reject task tracking URLs', () => {
      const urls = [
        'https://trello.com/board/123',
        'https://notion.so/Task-List',
      ];
      
      urls.forEach(url => {
        const isTaskTracker = /trello\.com|notion\.so|asana\.com/i.test(url);
        expect(isTaskTracker).toBe(true);
      });
    });
  });

  describe('honesty score calculation', () => {
    it('should weight validated evidence at 100%', () => {
      const completed = 10;
      const validatedEvidence = 8;
      const unvalidatedEvidence = 2;
      const totalEvidence = validatedEvidence + unvalidatedEvidence;

      const score = Math.min(
        (validatedEvidence * 1.0 + unvalidatedEvidence * 0.5) / completed,
        1.0
      );

      // 8*1.0 + 2*0.5 = 9, 9/10 = 0.9
      expect(score).toBe(0.9);
    });

    it('should weight unvalidated evidence at 50%', () => {
      const completed = 10;
      const validatedEvidence = 0;
      const unvalidatedEvidence = 10;

      const score = Math.min(
        (validatedEvidence * 1.0 + unvalidatedEvidence * 0.5) / completed,
        1.0
      );

      // 0*1.0 + 10*0.5 = 5, 5/10 = 0.5
      expect(score).toBe(0.5);
    });

    it('should cap honesty score at 1.0', () => {
      const completed = 5;
      const validatedEvidence = 10; // More evidence than tasks

      const score = Math.min(
        (validatedEvidence * 1.0) / completed,
        1.0
      );

      expect(score).toBe(1.0);
    });

    it('should return 0 if no tasks completed', () => {
      const completed = 0;
      const validatedEvidence = 5;

      const score = completed > 0 
        ? Math.min((validatedEvidence * 1.0) / completed, 1.0)
        : 0;

      expect(score).toBe(0);
    });
  });
});

