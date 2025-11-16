import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestCaller } from "@/__tests__/utils/trpc-test-utils";
import type { Context } from "@/server/trpc/context";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

describe("Pattern Router", () => {
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
    it("should return all patterns for user", async () => {
      const mockPatterns = [
        {
          id: "pattern-1",
          user_id: "user-123",
          pattern_type: "thursday_new_project",
          description: "User starts new projects on Thursdays",
          confidence: 0.85,
          occurrences: 5,
          first_detected: "2024-01-01T00:00:00Z",
          last_occurred: "2024-01-15T00:00:00Z",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-15T00:00:00Z",
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({ data: mockPatterns, error: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.pattern.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].patternType).toBe("thursday_new_project");
      expect(result[0].confidence).toBe(0.85);
      expect(result[0].occurrences).toBe(5);
    });

    it("should return empty array when no patterns exist", async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.pattern.getAll();

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

      await expect(caller.pattern.getAll()).rejects.toThrow("Failed to fetch patterns");
    });
  });

  describe("getById", () => {
    it("should return pattern by id", async () => {
      const mockPattern = {
        id: "pattern-1",
        user_id: "user-123",
        pattern_type: "gym_skip_after_meetings",
        description: "User skips gym after meetings",
        confidence: 0.75,
        occurrences: 3,
        first_detected: "2024-01-01T00:00:00Z",
        last_occurred: "2024-01-10T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-10T00:00:00Z",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockPattern, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.pattern.getById({ id: "pattern-1" });

      expect(result).toBeDefined();
      expect(result?.patternType).toBe("gym_skip_after_meetings");
      expect(result?.confidence).toBe(0.75);
    });

    it("should return null if pattern not found", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.pattern.getById({ id: "nonexistent" });

      expect(result).toBeNull();
    });
  });

  describe("getByType", () => {
    it("should return patterns by type", async () => {
      const mockPatterns = [
        {
          id: "pattern-1",
          user_id: "user-123",
          pattern_type: "thursday_new_project",
          description: "User starts new projects on Thursdays",
          confidence: 0.85,
          occurrences: 5,
          first_detected: "2024-01-01T00:00:00Z",
          last_occurred: "2024-01-15T00:00:00Z",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-15T00:00:00Z",
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({ data: mockPatterns, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ order: mockOrder });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.pattern.getByType({ patternType: "thursday_new_project" });

      expect(result).toHaveLength(1);
      expect(result[0].patternType).toBe("thursday_new_project");
    });
  });

  describe("create", () => {
    it("should create new pattern", async () => {
      const input = {
        patternType: "thursday_new_project",
        description: "User starts new projects on Thursdays",
        confidence: 0.85,
        occurrences: 1,
      };

      const mockCreatedPattern = {
        id: "new-id",
        user_id: "user-123",
        pattern_type: input.patternType,
        description: input.description,
        confidence: input.confidence,
        occurrences: input.occurrences,
        first_detected: "2024-01-01T00:00:00Z",
        last_occurred: "2024-01-01T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockCreatedPattern, error: null });
      const mockSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockDb.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await caller.pattern.create(input);

      expect(result.patternType).toBe("thursday_new_project");
      expect(result.confidence).toBe(0.85);
      expect(result.occurrences).toBe(1);
    });

    it("should use default values when not provided", async () => {
      const input = {
        patternType: "gym_skip_after_meetings",
      };

      const mockCreatedPattern = {
        id: "new-id",
        user_id: "user-123",
        pattern_type: input.patternType,
        description: null,
        confidence: 0.0,
        occurrences: 1,
        first_detected: "2024-01-01T00:00:00Z",
        last_occurred: "2024-01-01T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockCreatedPattern, error: null });
      const mockSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockDb.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await caller.pattern.create(input);

      expect(result.confidence).toBe(0.0);
      expect(result.occurrences).toBe(1);
    });

    it("should throw error on database failure", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Insert failed" },
      });
      const mockSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockDb.from.mockReturnValue({
        insert: mockInsert,
      });

      await expect(
        caller.pattern.create({ patternType: "test_pattern" })
      ).rejects.toThrow("Failed to create pattern");
    });
  });

  describe("update", () => {
    it("should update pattern", async () => {
      const input = {
        id: "pattern-1",
        confidence: 0.9,
        occurrences: 6,
        lastOccurred: new Date("2024-01-20T00:00:00Z"),
      };

      const mockExistingPattern = {
        id: "pattern-1",
        user_id: "user-123",
        pattern_type: "thursday_new_project",
        description: "User starts new projects on Thursdays",
        confidence: 0.85,
        occurrences: 5,
        first_detected: "2024-01-01T00:00:00Z",
        last_occurred: "2024-01-15T00:00:00Z",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-15T00:00:00Z",
      };

      const mockUpdatedPattern = {
        ...mockExistingPattern,
        confidence: 0.9,
        occurrences: 6,
        last_occurred: "2024-01-20T00:00:00Z",
      };

      const mockMaybeSingle1 = vi.fn().mockResolvedValue({ data: mockExistingPattern, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle1 });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1 });

      const mockMaybeSingle2 = vi.fn().mockResolvedValue({ data: mockUpdatedPattern, error: null });
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

      const result = await caller.pattern.update(input);

      expect(result.confidence).toBe(0.9);
      expect(result.occurrences).toBe(6);
    });

    it("should throw error if pattern not found", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      await expect(
        caller.pattern.update({ id: "nonexistent", confidence: 0.9 })
      ).rejects.toThrow("Pattern not found or access denied");
    });
  });

  describe("delete", () => {
    it("should delete pattern", async () => {
      const mockExistingPattern = {
        id: "pattern-1",
        user_id: "user-123",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockExistingPattern, error: null });
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

      const result = await caller.pattern.delete({ id: "pattern-1" });

      expect(result.success).toBe(true);
      expect(result.id).toBe("pattern-1");
    });
  });
});

