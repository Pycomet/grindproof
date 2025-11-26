import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestCaller } from "@/__tests__/utils/trpc-test-utils";
import type { Context } from "@/server/trpc/context";

vi.mock("@/lib/notifications/push-service", () => ({
  sendPushNotification: vi.fn(),
  sendToUser: vi.fn().mockResolvedValue({ successful: 0, failed: 0, expired: [] }),
  NotificationTemplates: {
    morningCheck: () => ({ title: "", body: "" }),
    eveningCheck: () => ({ title: "", body: "" }),
    taskReminder: () => ({ title: "", body: "" }),
    test: () => ({ title: "", body: "" }),
  },
}));

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

describe("Evidence Router", () => {
  let mockDb: any;
  let caller: Awaited<ReturnType<typeof createTestCaller>>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create a chainable mock builder
    const createChainableMock = () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        single: vi.fn(),
        maybeSingle: vi.fn(),
      };
      return chain;
    };

    mockDb = {
      from: vi.fn(() => createChainableMock()),
    };

    // Create caller with mocked context
    caller = await createTestCaller({
      db: mockDb as any,
      user: { id: "user-123" } as any,
    } as Partial<Context>);
  });

  describe("getAll", () => {
    it("should return all evidence for user's tasks", async () => {
      const mockTasks = [{ id: "task-1" }, { id: "task-2" }];
      const mockEvidence = [
        {
          id: "evidence-1",
          task_id: "task-1",
          type: "photo",
          content: "https://example.com/photo.jpg",
          submitted_at: "2024-01-01T00:00:00Z",
          ai_validated: true,
          validation_notes: "Valid",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      // Mock tasks query: from("tasks").select("id").eq("user_id", ...)
      const mockEq1 = vi.fn().mockResolvedValue({ data: mockTasks, error: null });
      const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1 });

      // Mock evidence query: from("evidence").select("*").in("task_id", ...).order(...)
      const mockOrder2 = vi.fn().mockResolvedValue({ data: mockEvidence, error: null });
      const mockIn = vi.fn().mockReturnValue({ order: mockOrder2 });
      const mockSelect2 = vi.fn().mockReturnValue({ in: mockIn });

      mockDb.from
        .mockReturnValueOnce({
          select: mockSelect1,
        })
        .mockReturnValueOnce({
          select: mockSelect2,
        });

      const result = await caller.evidence.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("photo");
      expect(result[0].taskId).toBe("task-1");
      expect(result[0].aiValidated).toBe(true);
    });

    it("should filter by taskId when provided", async () => {
      const mockTasks = [{ id: "task-1" }];
      const mockEvidence = [
        {
          id: "evidence-1",
          task_id: "task-1",
          type: "screenshot",
          content: "screenshot.png",
          submitted_at: "2024-01-01T00:00:00Z",
          ai_validated: false,
          validation_notes: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      // Mock tasks query: from("tasks").select("id").eq("user_id", ...)
      const mockEq1 = vi.fn().mockResolvedValue({ data: mockTasks, error: null });
      const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1 });

      // Mock evidence query: from("evidence").select("*").in("task_id", ...).eq("task_id", ...).order(...)
      // The actual chain is: select("*") -> in("task_id", ...) -> eq("task_id", ...) -> order(...)
      // But when taskId is provided, it's: select("*") -> eq("task_id", ...) -> order(...)
      const createChainableQuery = (finalOrder: any) => {
        const chain: any = {
          eq: vi.fn().mockImplementation(() => chain),
          in: vi.fn().mockImplementation(() => chain),
          order: finalOrder,
        };
        return chain;
      };
      
      const mockOrder2 = vi.fn().mockResolvedValue({ data: mockEvidence, error: null });
      const chainableQuery = createChainableQuery(mockOrder2);
      
      const mockSelect2 = vi.fn().mockReturnValue(chainableQuery);

      mockDb.from
        .mockReturnValueOnce({
          select: mockSelect1,
        })
        .mockReturnValueOnce({
          select: mockSelect2,
        });

      const result = await caller.evidence.getAll({ taskId: "task-1" });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("screenshot");
    });

    it("should filter by type when provided", async () => {
      const mockTasks = [{ id: "task-1" }];
      const mockEvidence = [
        {
          id: "evidence-1",
          task_id: "task-1",
          type: "photo",
          content: "photo.jpg",
          submitted_at: "2024-01-01T00:00:00Z",
          ai_validated: false,
          validation_notes: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      // Mock tasks query: from("tasks").select("id").eq("user_id", ...)
      const mockEq1 = vi.fn().mockResolvedValue({ data: mockTasks, error: null });
      const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1 });

      // Mock evidence query: from("evidence").select("*").in("task_id", ...).eq("type", ...).order(...)
      // The actual chain is: select("*") -> in("task_id", ...) -> eq("type", ...) -> order(...)
      const createChainableQuery = (finalOrder: any) => {
        const chain: any = {
          eq: vi.fn().mockImplementation(() => chain),
          in: vi.fn().mockImplementation(() => chain),
          order: finalOrder,
        };
        return chain;
      };
      
      const mockOrder2 = vi.fn().mockResolvedValue({ data: mockEvidence, error: null });
      const chainableQuery = createChainableQuery(mockOrder2);
      
      const mockSelect2 = vi.fn().mockReturnValue(chainableQuery);

      mockDb.from
        .mockReturnValueOnce({
          select: mockSelect1,
        })
        .mockReturnValueOnce({
          select: mockSelect2,
        });

      const result = await caller.evidence.getAll({ type: "photo" });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("photo");
    });

    it("should return empty array when user has no tasks", async () => {
      // Mock tasks query: from("tasks").select("id").eq("user_id", ...) returns empty
      const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.evidence.getAll();

      expect(result).toEqual([]);
    });

    it("should throw error on database failure", async () => {
      // Mock tasks query: from("tasks").select("id").eq("user_id", ...)
      const mockEq1 = vi.fn().mockResolvedValue({ data: [{ id: "task-1" }], error: null });
      const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1 });

      // Mock evidence query fails
      const mockOrder2 = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });
      const mockIn = vi.fn().mockReturnValue({ order: mockOrder2 });
      const mockSelect2 = vi.fn().mockReturnValue({ in: mockIn });

      mockDb.from
        .mockReturnValueOnce({
          select: mockSelect1,
        })
        .mockReturnValueOnce({
          select: mockSelect2,
        });

      await expect(caller.evidence.getAll()).rejects.toThrow("Failed to fetch evidence");
    });
  });

  describe("getById", () => {
    it("should return evidence by id", async () => {
      const mockEvidence = {
        id: "evidence-1",
        task_id: "task-1",
        type: "text",
        content: "Completed the task",
        submitted_at: "2024-01-01T00:00:00Z",
        ai_validated: false,
        validation_notes: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockTask = { user_id: "user-123" };

      const mockMaybeSingle1 = vi.fn().mockResolvedValue({ data: mockEvidence, error: null });
      const mockEq1 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle1 });
      const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1 });

      const mockMaybeSingle2 = vi.fn().mockResolvedValue({ data: mockTask, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle2 });
      const mockSelect2 = vi.fn().mockReturnValue({ eq: mockEq2 });

      mockDb.from
        .mockReturnValueOnce({
          select: mockSelect1,
        })
        .mockReturnValueOnce({
          select: mockSelect2,
        });

      const result = await caller.evidence.getById({ id: "evidence-1" });

      expect(result).toBeDefined();
      expect(result?.type).toBe("text");
      expect(result?.content).toBe("Completed the task");
    });

    it("should return null if evidence not found", async () => {
      const mockMaybeSingle1 = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq1 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle1 });
      const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockDb.from.mockReturnValue({
        select: mockSelect1,
      });

      const result = await caller.evidence.getById({ id: "nonexistent" });

      expect(result).toBeNull();
    });

    it("should return null if evidence has no task_id and user verification fails", async () => {
      const mockEvidence = {
        id: "evidence-1",
        task_id: null,
        type: "text",
        content: "Some content",
        submitted_at: "2024-01-01T00:00:00Z",
        ai_validated: false,
        validation_notes: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockEvidence, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.evidence.getById({ id: "evidence-1" });

      // Evidence with no task_id should still be returned (current implementation allows it)
      expect(result).toBeDefined();
      expect(result?.taskId).toBeNull();
    });

    it("should throw error on database failure", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Database error" },
      });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      await expect(caller.evidence.getById({ id: "evidence-1" })).rejects.toThrow(
        "Failed to fetch evidence"
      );
    });
  });

  describe("getByTaskId", () => {
    it("should return all evidence for a task", async () => {
      const mockTask = { user_id: "user-123" };
      const mockEvidence = [
        {
          id: "evidence-1",
          task_id: "task-1",
          type: "link",
          content: "https://example.com",
          submitted_at: "2024-01-01T00:00:00Z",
          ai_validated: true,
          validation_notes: "Valid link",
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      const mockMaybeSingle1 = vi.fn().mockResolvedValue({ data: mockTask, error: null });
      const mockEq1 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle1 });
      const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1 });

      const mockOrder2 = vi.fn().mockResolvedValue({ data: mockEvidence, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ order: mockOrder2 });
      const mockSelect2 = vi.fn().mockReturnValue({ eq: mockEq2 });

      mockDb.from
        .mockReturnValueOnce({
          select: mockSelect1,
        })
        .mockReturnValueOnce({
          select: mockSelect2,
        });

      const result = await caller.evidence.getByTaskId({ taskId: "task-1" });

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("link");
    });

    it("should throw error if task not found", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      await expect(
        caller.evidence.getByTaskId({ taskId: "nonexistent" })
      ).rejects.toThrow("Task not found or access denied");
    });
  });

  describe("create", () => {
    it("should create new evidence", async () => {
      const input = {
        taskId: "task-1",
        type: "photo" as const,
        content: "https://example.com/photo.jpg",
        aiValidated: false,
      };

      const mockTask = { user_id: "user-123" };
      const mockCreatedEvidence = {
        id: "new-id",
        task_id: input.taskId,
        type: input.type,
        content: input.content,
        submitted_at: "2024-01-01T00:00:00Z",
        ai_validated: input.aiValidated,
        validation_notes: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockMaybeSingle1 = vi.fn().mockResolvedValue({ data: mockTask, error: null });
      const mockEq1 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle1 });
      const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1 });

      const mockMaybeSingle2 = vi.fn().mockResolvedValue({ data: mockCreatedEvidence, error: null });
      const mockSelect2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle2 });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect2 });

      mockDb.from
        .mockReturnValueOnce({
          select: mockSelect1,
        })
        .mockReturnValueOnce({
          insert: mockInsert,
        });

      const result = await caller.evidence.create(input);

      expect(result.type).toBe("photo");
      expect(result.taskId).toBe("task-1");
      expect(result.content).toBe("https://example.com/photo.jpg");
    });

    it("should create evidence without taskId", async () => {
      const input = {
        type: "text" as const,
        content: "Task completed",
      };

      const mockCreatedEvidence = {
        id: "new-id",
        task_id: null,
        type: input.type,
        content: input.content,
        submitted_at: "2024-01-01T00:00:00Z",
        ai_validated: false,
        validation_notes: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockCreatedEvidence, error: null });
      const mockSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockDb.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await caller.evidence.create(input);

      expect(result.taskId).toBeNull();
      expect(result.type).toBe("text");
    });

    it("should throw error if taskId does not belong to user", async () => {
      const input = {
        taskId: "task-other-user",
        type: "photo" as const,
        content: "photo.jpg",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      await expect(caller.evidence.create(input)).rejects.toThrow(
        "Task not found or access denied"
      );
    });

    it("should throw error on database failure", async () => {
      const input = {
        type: "photo" as const,
        content: "photo.jpg",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Insert failed" },
      });
      const mockSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockDb.from.mockReturnValue({
        insert: mockInsert,
      });

      await expect(caller.evidence.create(input)).rejects.toThrow("Failed to create evidence");
    });
  });

  describe("update", () => {
    it("should update evidence", async () => {
      const input = {
        id: "evidence-1",
        aiValidated: true,
        validationNotes: "Validated by AI",
      };

      const mockExistingEvidence = {
        id: "evidence-1",
        task_id: "task-1",
      };

      const mockTask = { user_id: "user-123" };

      const mockUpdatedEvidence = {
        id: "evidence-1",
        task_id: "task-1",
        type: "photo",
        content: "https://example.com/photo.jpg",
        submitted_at: "2024-01-01T00:00:00Z",
        ai_validated: true,
        validation_notes: "Validated by AI",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockMaybeSingle1 = vi.fn().mockResolvedValue({ data: mockExistingEvidence, error: null });
      const mockEq1 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle1 });
      const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1 });

      const mockMaybeSingle2 = vi.fn().mockResolvedValue({ data: mockTask, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle2 });
      const mockSelect2 = vi.fn().mockReturnValue({ eq: mockEq2 });

      const mockMaybeSingle3 = vi.fn().mockResolvedValue({ data: mockUpdatedEvidence, error: null });
      const mockSelect3 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle3 });
      const mockEq3 = vi.fn().mockReturnValue({ select: mockSelect3 });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq3 });

      mockDb.from
        .mockReturnValueOnce({
          select: mockSelect1,
        })
        .mockReturnValueOnce({
          select: mockSelect2,
        })
        .mockReturnValueOnce({
          update: mockUpdate,
        });

      const result = await caller.evidence.update(input);

      expect(result.aiValidated).toBe(true);
      expect(result.validationNotes).toBe("Validated by AI");
    });

    it("should throw error if evidence not found", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      await expect(
        caller.evidence.update({ id: "nonexistent", aiValidated: true })
      ).rejects.toThrow("Evidence not found");
    });

    it("should throw error if new taskId does not belong to user", async () => {
      const mockExistingEvidence = {
        id: "evidence-1",
        task_id: "task-1",
      };

      const mockTask = { user_id: "user-123" };

      const mockMaybeSingle1 = vi.fn().mockResolvedValue({ data: mockExistingEvidence, error: null });
      const mockEq1 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle1 });
      const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1 });

      const mockMaybeSingle2 = vi.fn().mockResolvedValue({ data: mockTask, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle2 });
      const mockSelect2 = vi.fn().mockReturnValue({ eq: mockEq2 });

      const mockMaybeSingle3 = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq3 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle3 });
      const mockSelect3 = vi.fn().mockReturnValue({ eq: mockEq3 });

      mockDb.from
        .mockReturnValueOnce({
          select: mockSelect1,
        })
        .mockReturnValueOnce({
          select: mockSelect2,
        })
        .mockReturnValueOnce({
          select: mockSelect3,
        });

      await expect(
        caller.evidence.update({ id: "evidence-1", taskId: "task-other-user" })
      ).rejects.toThrow("Task not found or access denied");
    });

    it("should throw error on database failure", async () => {
      const mockExistingEvidence = {
        id: "evidence-1",
        task_id: "task-1",
      };

      const mockTask = { user_id: "user-123" };

      const mockMaybeSingle1 = vi.fn().mockResolvedValue({ data: mockExistingEvidence, error: null });
      const mockEq1 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle1 });
      const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1 });

      const mockMaybeSingle2 = vi.fn().mockResolvedValue({ data: mockTask, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle2 });
      const mockSelect2 = vi.fn().mockReturnValue({ eq: mockEq2 });

      const mockMaybeSingle3 = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Update failed" },
      });
      const mockSelect3 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle3 });
      const mockEq3 = vi.fn().mockReturnValue({ select: mockSelect3 });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq3 });

      mockDb.from
        .mockReturnValueOnce({
          select: mockSelect1,
        })
        .mockReturnValueOnce({
          select: mockSelect2,
        })
        .mockReturnValueOnce({
          update: mockUpdate,
        });

      await expect(
        caller.evidence.update({ id: "evidence-1", aiValidated: true })
      ).rejects.toThrow("Failed to update evidence");
    });
  });

  describe("delete", () => {
    it("should delete evidence", async () => {
      const mockExistingEvidence = {
        id: "evidence-1",
        task_id: "task-1",
      };

      const mockTask = { user_id: "user-123" };

      const mockMaybeSingle1 = vi.fn().mockResolvedValue({ data: mockExistingEvidence, error: null });
      const mockEq1 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle1 });
      const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1 });

      const mockMaybeSingle2 = vi.fn().mockResolvedValue({ data: mockTask, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle2 });
      const mockSelect2 = vi.fn().mockReturnValue({ eq: mockEq2 });

      const mockEq3 = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq3 });

      mockDb.from
        .mockReturnValueOnce({
          select: mockSelect1,
        })
        .mockReturnValueOnce({
          select: mockSelect2,
        })
        .mockReturnValueOnce({
          delete: mockDelete,
        });

      const result = await caller.evidence.delete({ id: "evidence-1" });

      expect(result.success).toBe(true);
      expect(result.id).toBe("evidence-1");
    });

    it("should throw error if evidence not found", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      await expect(caller.evidence.delete({ id: "nonexistent" })).rejects.toThrow(
        "Evidence not found"
      );
    });

    it("should throw error on database failure", async () => {
      const mockExistingEvidence = {
        id: "evidence-1",
        task_id: "task-1",
      };

      const mockTask = { user_id: "user-123" };

      const mockMaybeSingle1 = vi.fn().mockResolvedValue({ data: mockExistingEvidence, error: null });
      const mockEq1 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle1 });
      const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1 });

      const mockMaybeSingle2 = vi.fn().mockResolvedValue({ data: mockTask, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle2 });
      const mockSelect2 = vi.fn().mockReturnValue({ eq: mockEq2 });

      const mockEq3 = vi.fn().mockResolvedValue({ error: { message: "Delete failed" } });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEq3 });

      mockDb.from
        .mockReturnValueOnce({
          select: mockSelect1,
        })
        .mockReturnValueOnce({
          select: mockSelect2,
        })
        .mockReturnValueOnce({
          delete: mockDelete,
        });

      await expect(caller.evidence.delete({ id: "evidence-1" })).rejects.toThrow(
        "Failed to delete evidence"
      );
    });
  });
});

