import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestCaller } from "@/__tests__/utils/trpc-test-utils";
import type { Context } from "@/server/trpc/context";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

describe("Profile Router", () => {
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
      })),
    };

    // Create caller with mocked context including user
    caller = await createTestCaller({
      db: mockDb as any,
      user: mockUser,
    } as Partial<Context>);
  });

  describe("getCurrent", () => {
    it("should return current user's profile when authenticated", async () => {
      const mockProfile = {
        id: "user-123",
        name: "Test User",
        profile_pic_url: "https://example.com/pic.jpg",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockProfile, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.profile.getCurrent();

      expect(mockDb.from).toHaveBeenCalledWith("profiles");
      expect(mockEq).toHaveBeenCalledWith("id", "user-123");
      expect(result).toBeDefined();
      expect(result?.id).toBe("user-123");
      expect(result?.name).toBe("Test User");
      expect(result?.email).toBe("test@example.com"); // From mockUser.email
      expect(result?.profilePicUrl).toBe("https://example.com/pic.jpg");
    });

    it("should return default profile when profile does not exist", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.profile.getCurrent();

      expect(result).toBeDefined();
      expect(result?.id).toBe("user-123");
      expect(result?.email).toBe("test@example.com"); // From mockUser.email
      expect(result?.name).toBeNull(); // No user metadata in mock
      expect(result?.profilePicUrl).toBeNull();
    });

    it("should throw error when not authenticated", async () => {
      // Create caller without user
      const unauthenticatedCaller = await createTestCaller({
        db: mockDb as any,
        user: null,
      } as Partial<Context>);

      await expect(unauthenticatedCaller.profile.getCurrent()).rejects.toThrow();
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

      await expect(caller.profile.getCurrent()).rejects.toThrow("Failed to fetch profile");
    });
  });

  describe("update", () => {
    it("should update profile with name and profile_pic_url", async () => {
      const input = {
        name: "Updated Name",
        profilePicUrl: "https://example.com/new-pic.jpg",
      };

      const mockExistingProfile = {
        id: "user-123",
        name: "Old Name",
        profile_pic_url: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockUpdatedProfile = {
        id: "user-123",
        name: input.name,
        profile_pic_url: input.profilePicUrl,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      // First call: check if profile exists
      const mockMaybeSingleFirst = vi.fn().mockResolvedValue({ data: mockExistingProfile, error: null });
      const mockEqFirst = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleFirst });
      const mockSelectFirst = vi.fn().mockReturnValue({ eq: mockEqFirst });

      // Second call: update profile
      const mockMaybeSingleSecond = vi.fn().mockResolvedValue({ data: mockUpdatedProfile, error: null });
      const mockSelectSecond = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleSecond });
      const mockEqSecond = vi.fn().mockReturnValue({ select: mockSelectSecond });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqSecond });

      let callCount = 0;
      mockDb.from.mockImplementation((table: string) => {
        if (table === "profiles") {
          callCount++;
          if (callCount === 1) {
            return { select: mockSelectFirst };
          } else {
            return { update: mockUpdate };
          }
        }
      });

      const result = await caller.profile.update(input);

      expect(mockDb.from).toHaveBeenCalledWith("profiles");
      expect(result.name).toBe("Updated Name");
      expect(result.profilePicUrl).toBe("https://example.com/new-pic.jpg");
      expect(result.email).toBe("test@example.com"); // From mockUser.email
    });

    it("should update only name when profilePicUrl is not provided", async () => {
      const input = {
        name: "Updated Name Only",
      };

      const mockExistingProfile = {
        id: "user-123",
        name: "Old Name",
        profile_pic_url: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const mockUpdatedProfile = {
        id: "user-123",
        name: input.name,
        profile_pic_url: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      };

      // First call: check if profile exists
      const mockMaybeSingleFirst = vi.fn().mockResolvedValue({ data: mockExistingProfile, error: null });
      const mockEqFirst = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleFirst });
      const mockSelectFirst = vi.fn().mockReturnValue({ eq: mockEqFirst });

      // Second call: update profile
      const mockMaybeSingleSecond = vi.fn().mockResolvedValue({ data: mockUpdatedProfile, error: null });
      const mockSelectSecond = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleSecond });
      const mockEqSecond = vi.fn().mockReturnValue({ select: mockSelectSecond });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqSecond });

      let callCount = 0;
      mockDb.from.mockImplementation((table: string) => {
        if (table === "profiles") {
          callCount++;
          if (callCount === 1) {
            return { select: mockSelectFirst };
          } else {
            return { update: mockUpdate };
          }
        }
      });

      const result = await caller.profile.update(input);

      expect(result.name).toBe("Updated Name Only");
      expect(result.email).toBe("test@example.com"); // From mockUser.email
    });

    it("should create profile if it doesn't exist (upsert behavior)", async () => {
      const input = {
        name: "New Profile",
        profilePicUrl: "https://example.com/pic.jpg",
      };

      const mockCreatedProfile = {
        id: "user-123",
        name: input.name,
        profile_pic_url: input.profilePicUrl,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      // First call returns null (profile doesn't exist)
      const mockMaybeSingleFirst = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEqFirst = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleFirst });
      const mockSelectFirst = vi.fn().mockReturnValue({ eq: mockEqFirst });

      // Second call (insert) returns created profile
      const mockMaybeSingleSecond = vi.fn().mockResolvedValue({ data: mockCreatedProfile, error: null });
      const mockSelectSecond = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleSecond });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelectSecond });

      let callCount = 0;
      mockDb.from.mockImplementation((table: string) => {
        if (table === "profiles") {
          callCount++;
          if (callCount === 1) {
            return { select: mockSelectFirst };
          } else {
            return { insert: mockInsert };
          }
        }
      });

      // For this test, we'll assume the router handles upsert logic
      // In actual implementation, it might use upsert directly
      const result = await caller.profile.update(input);

      expect(result.name).toBe("New Profile");
      expect(result.email).toBe("test@example.com"); // From mockUser.email
    });

    it("should throw error when not authenticated", async () => {
      const unauthenticatedCaller = await createTestCaller({
        db: mockDb as any,
        user: null,
      } as Partial<Context>);

      await expect(
        unauthenticatedCaller.profile.update({ name: "Test" })
      ).rejects.toThrow();
    });

    it("should throw error on database failure", async () => {
      const input = {
        name: "Updated Name",
      };

      const mockExistingProfile = {
        id: "user-123",
        name: "Old Name",
        profile_pic_url: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      // First call: check if profile exists
      const mockMaybeSingleFirst = vi.fn().mockResolvedValue({ data: mockExistingProfile, error: null });
      const mockEqFirst = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleFirst });
      const mockSelectFirst = vi.fn().mockReturnValue({ eq: mockEqFirst });

      // Second call: update fails
      const mockMaybeSingleSecond = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "Update failed" },
      });
      const mockSelectSecond = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingleSecond });
      const mockEqSecond = vi.fn().mockReturnValue({ select: mockSelectSecond });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqSecond });

      let callCount = 0;
      mockDb.from.mockImplementation((table: string) => {
        if (table === "profiles") {
          callCount++;
          if (callCount === 1) {
            return { select: mockSelectFirst };
          } else {
            return { update: mockUpdate };
          }
        }
      });

      await expect(caller.profile.update(input)).rejects.toThrow("Failed to update profile");
    });
  });
});


