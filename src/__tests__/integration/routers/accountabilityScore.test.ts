import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestCaller } from "@/__tests__/utils/trpc-test-utils";
import type { Context } from "@/server/trpc/context";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

describe("Accountability Score Router", () => {
  let mockDb: any;
  let caller: Awaited<ReturnType<typeof createTestCaller>>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create mock database chain
    const mockSelect = vi.fn().mockReturnThis();
    const mockInsert = vi.fn().mockReturnThis();
    const mockUpdate = vi.fn().mockReturnThis();
    const mockDelete = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockOrder = vi.fn().mockReturnThis();
    const mockSingle = vi.fn();
    const mockMaybeSingle = vi.fn();

    mockDb = {
      from: vi.fn(() => ({
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
        eq: mockEq,
        order: mockOrder,
        single: mockSingle,
        maybeSingle: mockMaybeSingle,
      })),
    };

    // Create caller with mocked context
    caller = await createTestCaller({
      db: mockDb as any,
      user: { id: "user-123" } as any,
    } as Partial<Context>);
  });

  describe("getAll", () => {
    it("should return all accountability scores for user", async () => {
      const mockScores = [
        {
          id: "score-1",
          user_id: "user-123",
          week_start: "2024-01-01",
          alignment_score: 0.85,
          honesty_score: 0.9,
          completion_rate: 0.8,
          new_projects_started: 2,
          evidence_submissions: 5,
          insights: [{ emoji: '💪', text: 'Great week', severity: 'positive' }],
          recommendations: ['Keep it up'],
          week_summary: 'Excellent progress',
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({ data: mockScores, error: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.accountabilityScore.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].alignmentScore).toBe(0.85);
      expect(result[0].honestyScore).toBe(0.9);
      expect(result[0].completionRate).toBe(0.8);
      expect(result[0].newProjectsStarted).toBe(2);
      expect(result[0].evidenceSubmissions).toBe(5);
      expect(result[0].insights).toEqual([{ emoji: '💪', text: 'Great week', severity: 'positive' }]);
      expect(result[0].recommendations).toEqual(['Keep it up']);
      expect(result[0].weekSummary).toBe('Excellent progress');
    });

    it("should return empty array when no scores exist", async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.accountabilityScore.getAll();

      expect(result).toEqual([]);
    });

    it("should throw error on database failure", async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      await expect(caller.accountabilityScore.getAll()).rejects.toThrow(
        "Failed to fetch accountability scores"
      );
    });
  });

  describe("getById", () => {
    it("should return score by id", async () => {
      const mockScore = {
        id: "score-1",
        user_id: "user-123",
        week_start: "2024-01-01",
        alignment_score: 0.85,
        honesty_score: 0.9,
        completion_rate: 0.8,
        new_projects_started: 2,
        evidence_submissions: 5,
        insights: [{ emoji: '💪', text: 'Great week', severity: 'positive' }],
        recommendations: ['Keep it up'],
        week_summary: 'Excellent progress',
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockScore, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.accountabilityScore.getById({ id: "score-1" });

      expect(result).toBeDefined();
      expect(result?.alignmentScore).toBe(0.85);
      expect(result?.honestyScore).toBe(0.9);
      expect(result?.insights).toEqual([{ emoji: '💪', text: 'Great week', severity: 'positive' }]);
      expect(result?.recommendations).toEqual(['Keep it up']);
      expect(result?.weekSummary).toBe('Excellent progress');
    });

    it("should return null if score not found", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.accountabilityScore.getById({ id: "nonexistent" });

      expect(result).toBeNull();
    });
  });

  describe("getByWeek", () => {
    it("should return score for specific week", async () => {
      const mockScore = {
        id: "score-1",
        user_id: "user-123",
        week_start: "2024-01-01",
        alignment_score: 0.85,
        honesty_score: 0.9,
        completion_rate: 0.8,
        new_projects_started: 2,
        evidence_submissions: 5,
        insights: [{ emoji: '💪', text: 'Great week', severity: 'positive' }],
        recommendations: ['Keep it up'],
        week_summary: 'Excellent progress',
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      // Mock: from("accountability_scores").select("*").eq("user_id", ...).eq("week_start", ...).maybeSingle()
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockScore, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.accountabilityScore.getByWeek({
        weekStart: new Date("2024-01-01"),
      });

      expect(result).toBeDefined();
      expect(result?.alignmentScore).toBe(0.85);
      expect(result?.insights).toEqual([{ emoji: '💪', text: 'Great week', severity: 'positive' }]);
      expect(result?.recommendations).toEqual(['Keep it up']);
      expect(result?.weekSummary).toBe('Excellent progress');
    });

    it("should return score with null/empty metadata when not present", async () => {
      const mockScore = {
        id: "score-1",
        user_id: "user-123",
        week_start: "2024-01-01",
        alignment_score: 0.85,
        honesty_score: 0.9,
        completion_rate: 0.8,
        new_projects_started: 2,
        evidence_submissions: 5,
        insights: null,
        recommendations: null,
        week_summary: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockScore, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.accountabilityScore.getByWeek({
        weekStart: new Date("2024-01-01"),
      });

      expect(result).toBeDefined();
      expect(result?.insights).toEqual([]);
      expect(result?.recommendations).toEqual([]);
      expect(result?.weekSummary).toBeNull();
    });

    it("should return null if score not found for week", async () => {
      // Mock: from("accountability_scores").select("*").eq("user_id", ...).eq("week_start", ...).maybeSingle()
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.accountabilityScore.getByWeek({
        weekStart: new Date("2024-01-08"),
      });

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create new accountability score", async () => {
      const input = {
        weekStart: new Date("2024-01-01"),
        alignmentScore: 0.85,
        honestyScore: 0.9,
        completionRate: 0.8,
        newProjectsStarted: 2,
        evidenceSubmissions: 5,
      };

      const mockCreatedScore = {
        id: "new-id",
        user_id: "user-123",
        week_start: "2024-01-01",
        alignment_score: input.alignmentScore,
        honesty_score: input.honestyScore,
        completion_rate: input.completionRate,
        new_projects_started: input.newProjectsStarted,
        evidence_submissions: input.evidenceSubmissions,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      // Mock check for existing score: from("accountability_scores").select("id").eq("user_id", ...).eq("week_start", ...).maybeSingle()
      const mockMaybeSingle1 = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq2_1 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle1 });
      const mockEq1_1 = vi.fn().mockReturnValue({ eq: mockEq2_1 });
      const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1_1 });

      // Mock insert
      const mockMaybeSingle2 = vi.fn().mockResolvedValue({ data: mockCreatedScore, error: null });
      const mockSelect2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle2 });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect2 });

      mockDb.from
        .mockReturnValueOnce({
          select: mockSelect1,
        })
        .mockReturnValueOnce({
          insert: mockInsert,
        });

      const result = await caller.accountabilityScore.create(input);

      expect(result.alignmentScore).toBe(0.85);
      expect(result.honestyScore).toBe(0.9);
      expect(result.completionRate).toBe(0.8);
      expect(result.newProjectsStarted).toBe(2);
      expect(result.evidenceSubmissions).toBe(5);
    });

    it("should throw error if score already exists for week", async () => {
      const input = {
        weekStart: new Date("2024-01-01"),
        alignmentScore: 0.85,
      };

      const mockExisting = { id: "existing-id" };

      // Mock: from("accountability_scores").select("id").eq("user_id", ...).eq("week_start", ...).maybeSingle()
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockExisting, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      await expect(caller.accountabilityScore.create(input)).rejects.toThrow(
        "Accountability score already exists for this week"
      );
    });

    it("should use default values when not provided", async () => {
      const input = {
        weekStart: new Date("2024-01-01"),
      };

      const mockCreatedScore = {
        id: "new-id",
        user_id: "user-123",
        week_start: "2024-01-01",
        alignment_score: null,
        honesty_score: null,
        completion_rate: null,
        new_projects_started: 0,
        evidence_submissions: 0,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      // Mock check for existing score: from("accountability_scores").select("id").eq("user_id", ...).eq("week_start", ...).maybeSingle()
      const mockMaybeSingle1 = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq2_1 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle1 });
      const mockEq1_1 = vi.fn().mockReturnValue({ eq: mockEq2_1 });
      const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1_1 });

      const mockMaybeSingle2 = vi.fn().mockResolvedValue({ data: mockCreatedScore, error: null });
      const mockSelect2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle2 });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect2 });

      mockDb.from
        .mockReturnValueOnce({
          select: mockSelect1,
        })
        .mockReturnValueOnce({
          insert: mockInsert,
        });

      const result = await caller.accountabilityScore.create(input);

      expect(result.alignmentScore).toBeNull();
      expect(result.newProjectsStarted).toBe(0);
      expect(result.evidenceSubmissions).toBe(0);
    });
  });

  describe("update", () => {
    it("should update accountability score", async () => {
      const input = {
        id: "score-1",
        alignmentScore: 0.9,
        completionRate: 0.85,
        newProjectsStarted: 3,
      };

      const mockExistingScore = {
        id: "score-1",
        user_id: "user-123",
        week_start: "2024-01-01",
        alignment_score: 0.85,
        honesty_score: 0.9,
        completion_rate: 0.8,
        new_projects_started: 2,
        evidence_submissions: 5,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockUpdatedScore = {
        ...mockExistingScore,
        alignment_score: 0.9,
        completion_rate: 0.85,
        new_projects_started: 3,
      };

      const mockMaybeSingle1 = vi.fn().mockResolvedValue({ data: mockExistingScore, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle1 });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1 });

      const mockMaybeSingle2 = vi.fn().mockResolvedValue({ data: mockUpdatedScore, error: null });
      const mockSelect2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle2 });
      const mockEq4 = vi.fn().mockReturnValue({ select: mockSelect2 });
      const mockEq3 = vi.fn().mockReturnValue({ eq: mockEq4 });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq3 });

      mockDb.from
        .mockReturnValueOnce({
          select: mockSelect1,
        })
        .mockReturnValueOnce({
          update: mockUpdate,
        });

      const result = await caller.accountabilityScore.update(input);

      expect(result.alignmentScore).toBe(0.9);
      expect(result.completionRate).toBe(0.85);
      expect(result.newProjectsStarted).toBe(3);
    });

    it("should throw error if score not found", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      await expect(
        caller.accountabilityScore.update({ id: "nonexistent", alignmentScore: 0.9 })
      ).rejects.toThrow("Accountability score not found or access denied");
    });
  });

  describe("delete", () => {
    it("should delete accountability score", async () => {
      const mockExistingScore = {
        id: "score-1",
        user_id: "user-123",
        week_start: "2024-01-01",
        alignment_score: 0.85,
        honesty_score: 0.9,
        completion_rate: 0.8,
        new_projects_started: 2,
        evidence_submissions: 5,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockExistingScore, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      const mockEq4 = vi.fn().mockResolvedValue({ error: null });
      const mockEq3 = vi.fn().mockReturnValue({ eq: mockEq4 });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq3 });

      mockDb.from
        .mockReturnValueOnce({
          select: mockSelect,
        })
        .mockReturnValueOnce({
          delete: mockDelete,
        });

      const result = await caller.accountabilityScore.delete({ id: "score-1" });

      expect(result.success).toBe(true);
      expect(result.id).toBe("score-1");
    });
  });
});

