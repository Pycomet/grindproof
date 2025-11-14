import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestCaller } from "@/__tests__/utils/trpc-test-utils";
import type { Context } from "@/server/trpc/context";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

describe("Routine Router", () => {
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

    mockDb = {
      from: vi.fn(() => ({
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
        eq: mockEq,
        order: mockOrder,
        single: mockSingle,
      })),
    };

    // Create caller with mocked context
    caller = await createTestCaller({
      db: mockDb as any,
    } as Partial<Context>);
  });

  describe("getAll", () => {
    it("should return all routines", async () => {
      const mockRoutines = [
        {
          id: "1",
          name: "Morning Routine",
          description: "Daily morning routine",
          frequency: "daily",
          days_of_week: null,
          time_of_day: "07:00",
          is_active: true,
          goal_id: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({ data: mockRoutines, error: null });
      const mockSelect = vi.fn().mockReturnValue({ order: mockOrder });
      
      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.routine.getAll();

      expect(mockDb.from).toHaveBeenCalledWith("routines");
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Morning Routine");
      expect(result[0].isActive).toBe(true);
    });
  });

  describe("getById", () => {
    it("should return a routine by id", async () => {
      const mockRoutine = {
        id: "1",
        name: "Test Routine",
        description: "Test description",
        frequency: "daily",
        days_of_week: [1, 3, 5],
        time_of_day: "09:00",
        is_active: true,
        goal_id: "goal-123",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockRoutine, error: null });
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      
      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.routine.getById({ id: "1" });

      expect(result).toBeDefined();
      expect(result?.name).toBe("Test Routine");
      expect(result?.daysOfWeek).toEqual([1, 3, 5]);
      expect(result?.goalId).toBe("goal-123");
    });
  });

  describe("getByGoalId", () => {
    it("should return routines for a specific goal", async () => {
      const mockRoutines = [
        {
          id: "1",
          name: "Routine 1",
          frequency: "daily",
          days_of_week: null,
          time_of_day: null,
          is_active: true,
          goal_id: "goal-123",
          description: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({ data: mockRoutines, error: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });
      
      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.routine.getByGoalId({ goalId: "goal-123" });

      expect(result).toHaveLength(1);
      expect(result[0].goalId).toBe("goal-123");
    });
  });

  describe("create", () => {
    it("should create a new routine", async () => {
      const input = {
        name: "New Routine",
        frequency: "daily" as const,
        isActive: true,
      };

      const mockCreatedRoutine = {
        id: "new-id",
        name: input.name,
        description: null,
        frequency: input.frequency,
        days_of_week: null,
        time_of_day: null,
        is_active: input.isActive,
        goal_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockCreatedRoutine, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      
      mockDb.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await caller.routine.create(input);

      expect(result.name).toBe("New Routine");
      expect(result.frequency).toBe("daily");
      expect(result.isActive).toBe(true);
    });

    it("should handle weekly routines with days of week", async () => {
      const input = {
        name: "Weekly Routine",
        frequency: "weekly" as const,
        daysOfWeek: [1, 3, 5],
        isActive: true,
      };

      const mockCreatedRoutine = {
        id: "new-id",
        name: input.name,
        description: null,
        frequency: input.frequency,
        days_of_week: input.daysOfWeek,
        time_of_day: null,
        is_active: input.isActive,
        goal_id: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockSingle = vi.fn().mockResolvedValue({ data: mockCreatedRoutine, error: null });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      
      mockDb.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await caller.routine.create(input);

      expect(result.frequency).toBe("weekly");
      expect(result.daysOfWeek).toEqual([1, 3, 5]);
    });
  });

  describe("toggleActive", () => {
    it("should toggle routine active status", async () => {
      // First call - get current status
      const mockRoutine = {
        is_active: true,
      };

      // Mock the select for getting current routine
      const mockSingle1 = vi.fn().mockResolvedValue({ data: mockRoutine, error: null });
      const mockEq1 = vi.fn().mockReturnValue({ single: mockSingle1 });
      const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1 });
      
      // Mock the update
      const mockSingle2 = vi.fn().mockResolvedValue({
        data: { id: "1", is_active: false },
        error: null,
      });
      const mockSelect2 = vi.fn().mockReturnValue({ single: mockSingle2 });
      const mockEq2 = vi.fn().mockReturnValue({ select: mockSelect2 });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq2 });
      
      mockDb.from
        .mockReturnValueOnce({
          select: mockSelect1,
        })
        .mockReturnValueOnce({
          update: mockUpdate,
        });

      const result = await caller.routine.toggleActive({ id: "1" });

      expect(result.id).toBe("1");
      expect(result.isActive).toBe(false);
    });
  });
});

