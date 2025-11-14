import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestCaller } from "@/__tests__/utils/trpc-test-utils";
import type { Context } from "@/server/trpc/context";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

describe("Goal Router", () => {
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
    } as Partial<Context>);
  });

  describe("getAll", () => {
    it("should return all goals", async () => {
      const mockGoals = [
        {
          id: "1",
          title: "Goal 1",
          description: "Description 1",
          target_date: "2024-12-31T00:00:00Z",
          status: "active",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "2",
          title: "Goal 2",
          description: null,
          target_date: null,
          status: "completed",
          created_at: "2024-01-02T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({ data: mockGoals, error: null });
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
      
      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.goal.getAll();

      expect(mockDb.from).toHaveBeenCalledWith("goals");
      expect(result).toHaveLength(2);
      expect(result[0].title).toBe("Goal 1");
      expect(result[1].status).toBe("completed");
    });

    it("should return empty array when no goals exist", async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
      
      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.goal.getAll();

      expect(result).toEqual([]);
    });

    it("should throw error on database failure", async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
      
      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      await expect(caller.goal.getAll()).rejects.toThrow("Failed to fetch goals");
    });
  });

  describe("getById", () => {
    it("should return a goal by id", async () => {
      const mockGoal = {
        id: "1",
        title: "Test Goal",
        description: "Test description",
        target_date: null,
        status: "active",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockGoal, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      
      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.goal.getById({ id: "1" });

      expect(result).toBeDefined();
      expect(result?.title).toBe("Test Goal");
      expect(result?.id).toBe("1");
    });

    it("should return null when goal not found", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      
      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.goal.getById({ id: "999" });

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create a new goal", async () => {
      const input = {
        title: "New Goal",
        description: "New description",
        status: "active" as const,
      };

      const mockCreatedGoal = {
        id: "new-id",
        title: input.title,
        description: input.description,
        target_date: null,
        status: input.status,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockCreatedGoal, error: null });
      const mockSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      
      mockDb.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await caller.goal.create(input);

      expect(result.title).toBe("New Goal");
      expect(result.id).toBe("new-id");
      expect(result.status).toBe("active");
    });

    it("should handle optional fields", async () => {
      const input = {
        title: "Minimal Goal",
      };

      const mockCreatedGoal = {
        id: "new-id",
        title: input.title,
        description: null,
        target_date: null,
        status: "active",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockCreatedGoal, error: null });
      const mockSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      
      mockDb.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await caller.goal.create(input);

      expect(result.title).toBe("Minimal Goal");
      expect(result.description).toBeUndefined();
    });
  });

  describe("update", () => {
    it("should update a goal", async () => {
      const input = {
        id: "1",
        title: "Updated Title",
        status: "completed" as const,
      };

      const mockUpdatedGoal = {
        id: "1",
        title: "Updated Title",
        description: null,
        target_date: null,
        status: "completed",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockUpdatedGoal, error: null });
      const mockSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq = vi.fn().mockReturnValue({ select: mockSelect });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      
      mockDb.from.mockReturnValue({
        update: mockUpdate,
      });

      const result = await caller.goal.update(input);

      expect(result.title).toBe("Updated Title");
      expect(result.status).toBe("completed");
    });
  });

  describe("delete", () => {
    it("should delete a goal", async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
      
      mockDb.from.mockReturnValue({
        delete: mockDelete,
      });

      const result = await caller.goal.delete({ id: "1" });

      expect(result.success).toBe(true);
      expect(result.id).toBe("1");
    });

    it("should throw error on delete failure", async () => {
      const mockEq = vi.fn().mockResolvedValue({ error: { message: "Delete failed" } });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq });
      
      mockDb.from.mockReturnValue({
        delete: mockDelete,
      });

      await expect(caller.goal.delete({ id: "1" })).rejects.toThrow(
        "Failed to delete goal"
      );
    });
  });
});

