import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestCaller } from "@/__tests__/utils/trpc-test-utils";
import type { Context } from "@/server/trpc/context";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

describe("Integration Router", () => {
  let mockDb: any;
  let caller: Awaited<ReturnType<typeof createTestCaller>>;
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create mock database chain
    const mockSelect = vi.fn().mockReturnThis();
    const mockInsert = vi.fn().mockReturnThis();
    const mockUpdate = vi.fn().mockReturnThis();
    const mockDelete = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockUpsert = vi.fn().mockReturnThis();
    const mockSingle = vi.fn();
    const mockMaybeSingle = vi.fn();
    const mockOrder = vi.fn().mockReturnThis();

    mockDb = {
      from: vi.fn(() => ({
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
        delete: mockDelete,
        upsert: mockUpsert,
        eq: mockEq,
        single: mockSingle,
        maybeSingle: mockMaybeSingle,
        order: mockOrder,
      })),
    };

    // Create caller with mocked context including user
    caller = await createTestCaller({
      db: mockDb as any,
      user: mockUser,
    } as Partial<Context>);
  });

  describe("getAll", () => {
    it("should return all integrations for current user", async () => {
      const mockIntegrations = [
        {
          id: "int-1",
          user_id: "user-123",
          service_type: "github",
          credentials: { token: "secret-token" },
          status: "connected",
          metadata: { username: "testuser" },
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: "int-2",
          user_id: "user-123",
          service_type: "google-calendar",
          credentials: { access_token: "token" },
          status: "connected",
          metadata: null,
          created_at: "2024-01-02T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({ data: mockIntegrations, error: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.integration.getAll();

      expect(mockDb.from).toHaveBeenCalledWith("integrations");
      expect(mockEq).toHaveBeenCalledWith("user_id", "user-123");
      expect(result).toHaveLength(2);
      expect(result[0].serviceType).toBe("github");
      expect(result[1].serviceType).toBe("google-calendar");
    });

    it("should return empty array when no integrations exist", async () => {
      const mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.integration.getAll();

      expect(result).toEqual([]);
    });

    it("should only return integrations for current user", async () => {
      const mockIntegrations = [
        {
          id: "int-1",
          user_id: "user-123",
          service_type: "github",
          credentials: { token: "secret" },
          status: "connected",
          metadata: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({ data: mockIntegrations, error: null });
      const mockEq = vi.fn().mockReturnValue({ order: mockOrder });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.integration.getAll();

      expect(mockEq).toHaveBeenCalledWith("user_id", "user-123");
      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe("user-123");
    });

    it("should throw error when not authenticated", async () => {
      const unauthenticatedCaller = await createTestCaller({
        db: mockDb as any,
        user: null,
      } as Partial<Context>);

      await expect(unauthenticatedCaller.integration.getAll()).rejects.toThrow();
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

      await expect(caller.integration.getAll()).rejects.toThrow("Failed to fetch integrations");
    });
  });

  describe("getByServiceType", () => {
    it("should return integration by service type", async () => {
      const mockIntegration = {
        id: "int-1",
        user_id: "user-123",
        service_type: "github",
        credentials: { token: "secret-token" },
        status: "connected",
        metadata: { username: "testuser" },
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockIntegration, error: null });
      const mockEqService = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqService });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.integration.getByServiceType({ serviceType: "github" });

      expect(mockDb.from).toHaveBeenCalledWith("integrations");
      expect(result).toBeDefined();
      expect(result?.serviceType).toBe("github");
      expect(result?.userId).toBe("user-123");
    });

    it("should return null when integration not found", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEqService = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqService });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.integration.getByServiceType({ serviceType: "github" });

      expect(result).toBeNull();
    });

    it("should throw error when not authenticated", async () => {
      const unauthenticatedCaller = await createTestCaller({
        db: mockDb as any,
        user: null,
      } as Partial<Context>);

      await expect(
        unauthenticatedCaller.integration.getByServiceType({ serviceType: "github" })
      ).rejects.toThrow();
    });
  });

  describe("create", () => {
    it("should create a new integration", async () => {
      const input = {
        serviceType: "github",
        credentials: { token: "secret-token" },
        metadata: { username: "testuser" },
      };

      const mockCreatedIntegration = {
        id: "int-1",
        user_id: "user-123",
        service_type: input.serviceType,
        credentials: input.credentials,
        status: "connected",
        metadata: input.metadata,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockCreatedIntegration, error: null });
      const mockSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockDb.from.mockReturnValue({
        upsert: mockUpsert,
      });

      const result = await caller.integration.create(input);

      expect(mockDb.from).toHaveBeenCalledWith("integrations");
      expect(result.serviceType).toBe("github");
      expect(result.userId).toBe("user-123");
      expect(result.credentials).toEqual(input.credentials);
    });

    it("should handle optional metadata", async () => {
      const input = {
        serviceType: "google-calendar",
        credentials: { access_token: "token" },
      };

      const mockCreatedIntegration = {
        id: "int-2",
        user_id: "user-123",
        service_type: input.serviceType,
        credentials: input.credentials,
        status: "connected",
        metadata: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockCreatedIntegration, error: null });
      const mockSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockDb.from.mockReturnValue({
        upsert: mockUpsert,
      });

      const result = await caller.integration.create(input);

      expect(result.serviceType).toBe("google-calendar");
      expect(result.metadata).toBeUndefined();
    });

    it("should enforce unique constraint on (user_id, service_type)", async () => {
      const input = {
        serviceType: "github",
        credentials: { token: "token" },
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { 
          message: "duplicate key value violates unique constraint",
          code: "23505",
        },
      });
      const mockSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockDb.from.mockReturnValue({
        upsert: mockUpsert,
      });

      await expect(caller.integration.create(input)).rejects.toThrow();
    });

    it("should throw error when not authenticated", async () => {
      const unauthenticatedCaller = await createTestCaller({
        db: mockDb as any,
        user: null,
      } as Partial<Context>);

      await expect(
        unauthenticatedCaller.integration.create({
          serviceType: "github",
          credentials: { token: "token" },
        })
      ).rejects.toThrow();
    });

    it("should throw error on database failure", async () => {
      const input = {
        serviceType: "github",
        credentials: { token: "token" },
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Insert failed" },
      });
      const mockSelect = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockUpsert = vi.fn().mockReturnValue({ select: mockSelect });

      mockDb.from.mockReturnValue({
        upsert: mockUpsert,
      });

      await expect(caller.integration.create(input)).rejects.toThrow("Failed to create integration");
    });
  });

  describe("update", () => {
    it("should update integration credentials and metadata", async () => {
      const input = {
        id: "int-1",
        credentials: { token: "new-token" },
        metadata: { username: "newuser" },
        status: "connected" as const,
      };

      const mockExistingIntegration = {
        id: "int-1",
        user_id: "user-123",
        service_type: "github",
        credentials: { token: "old-token" },
        status: "connected",
        metadata: { username: "olduser" },
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockUpdatedIntegration = {
        id: "int-1",
        user_id: "user-123",
        service_type: "github",
        credentials: input.credentials,
        status: input.status,
        metadata: input.metadata,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      // First call: check if integration exists
      const mockMaybeSingleFirst = vi.fn().mockResolvedValue({ data: mockExistingIntegration, error: null });
      const mockEqUserFirst = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleFirst });
      const mockEqIdFirst = vi.fn().mockReturnValue({ eq: mockEqUserFirst });
      const mockSelectFirst = vi.fn().mockReturnValue({ eq: mockEqIdFirst });

      // Second call: update integration
      const mockMaybeSingleSecond = vi.fn().mockResolvedValue({ data: mockUpdatedIntegration, error: null });
      const mockSelectSecond = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleSecond });
      const mockEqUserSecond = vi.fn().mockReturnValue({ select: mockSelectSecond });
      const mockEqIdSecond = vi.fn().mockReturnValue({ eq: mockEqUserSecond });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqIdSecond });

      let callCount = 0;
      mockDb.from.mockImplementation((table: string) => {
        if (table === "integrations") {
          callCount++;
          if (callCount === 1) {
            return { select: mockSelectFirst };
          } else {
            return { update: mockUpdate };
          }
        }
      });

      const result = await caller.integration.update(input);

      expect(mockDb.from).toHaveBeenCalledWith("integrations");
      expect(result.credentials).toEqual(input.credentials);
      expect(result.metadata).toEqual(input.metadata);
    });

    it("should only update provided fields", async () => {
      const input = {
        id: "int-1",
        credentials: { token: "updated-token" },
      };

      const mockExistingIntegration = {
        id: "int-1",
        user_id: "user-123",
        service_type: "github",
        credentials: { token: "old-token" },
        status: "connected",
        metadata: { username: "olduser" },
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockUpdatedIntegration = {
        id: "int-1",
        user_id: "user-123",
        service_type: "github",
        credentials: input.credentials,
        status: "connected",
        metadata: { username: "olduser" },
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      // First call: check if integration exists
      const mockMaybeSingleFirst = vi.fn().mockResolvedValue({ data: mockExistingIntegration, error: null });
      const mockEqUserFirst = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleFirst });
      const mockEqIdFirst = vi.fn().mockReturnValue({ eq: mockEqUserFirst });
      const mockSelectFirst = vi.fn().mockReturnValue({ eq: mockEqIdFirst });

      // Second call: update integration
      const mockMaybeSingleSecond = vi.fn().mockResolvedValue({ data: mockUpdatedIntegration, error: null });
      const mockSelectSecond = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleSecond });
      const mockEqUserSecond = vi.fn().mockReturnValue({ select: mockSelectSecond });
      const mockEqIdSecond = vi.fn().mockReturnValue({ eq: mockEqUserSecond });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqIdSecond });

      let callCount = 0;
      mockDb.from.mockImplementation((table: string) => {
        if (table === "integrations") {
          callCount++;
          if (callCount === 1) {
            return { select: mockSelectFirst };
          } else {
            return { update: mockUpdate };
          }
        }
      });

      const result = await caller.integration.update(input);

      expect(result.credentials).toEqual(input.credentials);
    });

    it("should throw error when not authenticated", async () => {
      const unauthenticatedCaller = await createTestCaller({
        db: mockDb as any,
        user: null,
      } as Partial<Context>);

      await expect(
        unauthenticatedCaller.integration.update({ id: "int-1", credentials: {} })
      ).rejects.toThrow();
    });

    it("should throw error on database failure", async () => {
      const input = {
        id: "int-1",
        credentials: { token: "token" },
      };

      const mockExistingIntegration = {
        id: "int-1",
        user_id: "user-123",
        service_type: "github",
        credentials: { token: "old-token" },
        status: "connected",
        metadata: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      // First call: check if integration exists
      const mockMaybeSingleFirst = vi.fn().mockResolvedValue({ data: mockExistingIntegration, error: null });
      const mockEqUserFirst = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleFirst });
      const mockEqIdFirst = vi.fn().mockReturnValue({ eq: mockEqUserFirst });
      const mockSelectFirst = vi.fn().mockReturnValue({ eq: mockEqIdFirst });

      // Second call: update fails
      const mockMaybeSingleSecond = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Update failed" },
      });
      const mockSelectSecond = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleSecond });
      const mockEqUserSecond = vi.fn().mockReturnValue({ select: mockSelectSecond });
      const mockEqIdSecond = vi.fn().mockReturnValue({ eq: mockEqUserSecond });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqIdSecond });

      let callCount = 0;
      mockDb.from.mockImplementation((table: string) => {
        if (table === "integrations") {
          callCount++;
          if (callCount === 1) {
            return { select: mockSelectFirst };
          } else {
            return { update: mockUpdate };
          }
        }
      });

      await expect(caller.integration.update(input)).rejects.toThrow("Failed to update integration");
    });
  });

  describe("delete", () => {
    it("should delete an integration", async () => {
      const mockExistingIntegration = {
        id: "int-1",
        user_id: "user-123",
        service_type: "github",
        credentials: { token: "token" },
        status: "connected",
        metadata: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      // First call: check if integration exists
      const mockMaybeSingleFirst = vi.fn().mockResolvedValue({ data: mockExistingIntegration, error: null });
      const mockEqUserFirst = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleFirst });
      const mockEqIdFirst = vi.fn().mockReturnValue({ eq: mockEqUserFirst });
      const mockSelectFirst = vi.fn().mockReturnValue({ eq: mockEqIdFirst });

      // Second call: delete integration
      const mockEqUserSecond = vi.fn().mockResolvedValue({ error: null });
      const mockEqIdSecond = vi.fn().mockReturnValue({ eq: mockEqUserSecond });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEqIdSecond });

      let callCount = 0;
      mockDb.from.mockImplementation((table: string) => {
        if (table === "integrations") {
          callCount++;
          if (callCount === 1) {
            return { select: mockSelectFirst };
          } else {
            return { delete: mockDelete };
          }
        }
      });

      const result = await caller.integration.delete({ id: "int-1" });

      expect(mockDb.from).toHaveBeenCalledWith("integrations");
      expect(result.success).toBe(true);
      expect(result.id).toBe("int-1");
    });

    it("should throw error when not authenticated", async () => {
      const unauthenticatedCaller = await createTestCaller({
        db: mockDb as any,
        user: null,
      } as Partial<Context>);

      await expect(
        unauthenticatedCaller.integration.delete({ id: "int-1" })
      ).rejects.toThrow();
    });

    it("should throw error on delete failure", async () => {
      const mockExistingIntegration = {
        id: "int-1",
        user_id: "user-123",
        service_type: "github",
        credentials: { token: "token" },
        status: "connected",
        metadata: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      // First call: check if integration exists
      const mockMaybeSingleFirst = vi.fn().mockResolvedValue({ data: mockExistingIntegration, error: null });
      const mockEqUserFirst = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleFirst });
      const mockEqIdFirst = vi.fn().mockReturnValue({ eq: mockEqUserFirst });
      const mockSelectFirst = vi.fn().mockReturnValue({ eq: mockEqIdFirst });

      // Second call: delete fails
      const mockEqUserSecond = vi.fn().mockResolvedValue({ error: { message: "Delete failed" } });
      const mockEqIdSecond = vi.fn().mockReturnValue({ eq: mockEqUserSecond });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEqIdSecond });

      let callCount = 0;
      mockDb.from.mockImplementation((table: string) => {
        if (table === "integrations") {
          callCount++;
          if (callCount === 1) {
            return { select: mockSelectFirst };
          } else {
            return { delete: mockDelete };
          }
        }
      });

      await expect(caller.integration.delete({ id: "int-1" })).rejects.toThrow(
        "Failed to delete integration"
      );
    });
  });
});


