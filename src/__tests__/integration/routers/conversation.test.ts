import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestCaller } from "@/__tests__/utils/trpc-test-utils";
import type { Context } from "@/server/trpc/context";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

describe("Conversation Router", () => {
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
    it("should return all conversations for user", async () => {
      const mockConversations = [
        {
          id: "conv-1",
          user_id: "user-123",
          messages: [
            { role: "user", content: "Hello" },
            { role: "assistant", content: "Hi there!" },
          ],
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({ data: mockConversations, error: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.conversation.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].messages).toHaveLength(2);
      expect(result[0].messages[0].role).toBe("user");
    });

    it("should return empty array when no conversations exist", async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.conversation.getAll();

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

      await expect(caller.conversation.getAll()).rejects.toThrow("Failed to fetch conversations");
    });
  });

  describe("getById", () => {
    it("should return conversation by id", async () => {
      const mockConversation = {
        id: "conv-1",
        user_id: "user-123",
        messages: [
          { role: "user", content: "What is my goal?" },
          { role: "assistant", content: "Your goal is..." },
        ],
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockConversation, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.conversation.getById({ id: "conv-1" });

      expect(result).toBeDefined();
      expect(result?.messages).toHaveLength(2);
      expect(result?.messages[0].content).toBe("What is my goal?");
    });

    it("should return null if conversation not found", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.conversation.getById({ id: "nonexistent" });

      expect(result).toBeNull();
    });
  });

  describe("create", () => {
    it("should create new conversation", async () => {
      const input = {
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi!" },
        ],
      };

      const mockCreatedConversation = {
        id: "new-id",
        user_id: "user-123",
        messages: input.messages,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockCreatedConversation, error: null });
      const mockSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockDb.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await caller.conversation.create(input);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].role).toBe("user");
    });

    it("should create conversation with empty messages array", async () => {
      const input = {
        messages: [],
      };

      const mockCreatedConversation = {
        id: "new-id",
        user_id: "user-123",
        messages: [],
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockCreatedConversation, error: null });
      const mockSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockDb.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await caller.conversation.create(input);

      expect(result.messages).toHaveLength(0);
    });
  });

  describe("update", () => {
    it("should update conversation messages", async () => {
      const input = {
        id: "conv-1",
        messages: [
          { role: "user", content: "Hello" },
          { role: "assistant", content: "Hi!" },
          { role: "user", content: "How are you?" },
        ],
      };

      const mockExistingConversation = {
        id: "conv-1",
        user_id: "user-123",
        messages: [],
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockUpdatedConversation = {
        ...mockExistingConversation,
        messages: input.messages,
      };

      const mockMaybeSingle1 = vi.fn().mockResolvedValue({ data: mockExistingConversation, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle1 });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect1 = vi.fn().mockReturnValue({ eq: mockEq1 });

      const mockMaybeSingle2 = vi.fn().mockResolvedValue({ data: mockUpdatedConversation, error: null });
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

      const result = await caller.conversation.update(input);

      expect(result.messages).toHaveLength(3);
      expect(result.messages[2].content).toBe("How are you?");
    });

    it("should throw error if conversation not found", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq2 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      await expect(
        caller.conversation.update({ id: "nonexistent", messages: [] })
      ).rejects.toThrow("Conversation not found or access denied");
    });
  });

  describe("delete", () => {
    it("should delete conversation", async () => {
      const mockExistingConversation = {
        id: "conv-1",
        user_id: "user-123",
        messages: [],
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockExistingConversation, error: null });
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

      const result = await caller.conversation.delete({ id: "conv-1" });

      expect(result.success).toBe(true);
      expect(result.id).toBe("conv-1");
    });
  });
});

