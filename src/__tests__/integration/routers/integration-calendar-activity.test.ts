import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestCaller } from "@/__tests__/utils/trpc-test-utils";
import type { Context } from "@/server/trpc/context";

// Mock Supabase
vi.mock("@/lib/supabase/server", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

// Mock env
vi.mock("@/lib/env", () => ({
  env: {
    NEXT_GOOGLE_CALENDAR_CLIENT_ID: "test-client-id",
    NEXT_GOOGLE_CALENDAR_CLIENT_SECRET: "test-client-secret",
  },
}));

describe("Google Calendar Activity Endpoint", () => {
  let mockDb: any;
  let caller: Awaited<ReturnType<typeof createTestCaller>>;
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Create caller with mocked context including authenticated user
    // The mockDb will be set up per test
    caller = await createTestCaller({
      db: mockDb as any,
      user: mockUser,
    } as Partial<Context>);
  });

  describe("getGoogleCalendarActivity", () => {
    it("should return null when no calendar integration exists", async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEq3 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq2 = vi.fn().mockReturnValue({ eq: mockEq3 });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockDb = {
        from: vi.fn(() => ({
          select: mockSelect,
        })),
      };

      // Re-create caller with new mockDb
      caller = await createTestCaller({
        db: mockDb as any,
        user: mockUser,
      } as Partial<Context>);

      const result = await caller.integration.getGoogleCalendarActivity({ hours: 24 });

      expect(result).toBeNull();
      expect(mockDb.from).toHaveBeenCalledWith("integrations");
    });

    it("should fetch and return calendar events", async () => {
      const mockIntegration = {
        id: "int-1",
        user_id: "user-123",
        service_type: "google_calendar",
        credentials: {
          accessToken: "test-access-token",
          refreshToken: "test-refresh-token",
          expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        },
        metadata: {
          email: "user@example.com",
          calendarId: "primary",
        },
        status: "connected",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockIntegration, error: null });
      const mockEq3 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq2 = vi.fn().mockReturnValue({ eq: mockEq3 });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockDb = {
        from: vi.fn(() => ({
          select: mockSelect,
        })),
      };

      // Re-create caller with new mockDb
      caller = await createTestCaller({
        db: mockDb as any,
        user: mockUser,
      } as Partial<Context>);

      const now = new Date();
      const pastEvent = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
      const futureEvent = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours from now

      // Mock Google Calendar API response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "event-1",
              summary: "Past Meeting",
              start: { dateTime: pastEvent.toISOString() },
              end: { dateTime: new Date(pastEvent.getTime() + 60 * 60 * 1000).toISOString() },
              status: "confirmed",
              attendees: [{ email: "user@example.com", responseStatus: "accepted", self: true }],
            },
            {
              id: "event-2",
              summary: "Upcoming Meeting",
              start: { dateTime: futureEvent.toISOString() },
              end: { dateTime: new Date(futureEvent.getTime() + 60 * 60 * 1000).toISOString() },
              status: "confirmed",
              attendees: [{ email: "user@example.com", responseStatus: "accepted", self: true }],
            },
          ],
        }),
      } as any);

      const result = await caller.integration.getGoogleCalendarActivity({ hours: 24 });

      expect(result).toEqual({
        totalEvents: 2,
        pastEvents: 1,
        upcomingEvents: 1,
        acceptedEvents: 2,
        declinedEvents: 0,
        email: "user@example.com",
        needsReconnect: false,
      });
    });

    it("should handle token refresh when expired", async () => {
      const expiredDate = new Date(Date.now() - 1000); // Already expired
      const mockIntegration = {
        id: "int-1",
        user_id: "user-123",
        service_type: "google_calendar",
        credentials: {
          accessToken: "old-access-token",
          refreshToken: "test-refresh-token",
          expiresAt: expiredDate.toISOString(),
        },
        metadata: {
          email: "user@example.com",
        },
        status: "connected",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockIntegration, error: null });
      const mockEq3 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq2 = vi.fn().mockReturnValue({ eq: mockEq3 });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      const mockUpdateEq2 = vi.fn().mockResolvedValue({ error: null });
      const mockUpdateEq1 = vi.fn().mockReturnValue({ eq: mockUpdateEq2 });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockUpdateEq1 });

      mockDb = {
        from: vi.fn(() => ({
          select: mockSelect,
          update: mockUpdate,
        })),
      };

      // Re-create caller with new mockDb
      caller = await createTestCaller({
        db: mockDb as any,
        user: mockUser,
      } as Partial<Context>);

      // Mock token refresh and calendar API calls
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: "new-access-token",
            expires_in: 3600,
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [] }),
        } as any);

      const result = await caller.integration.getGoogleCalendarActivity({ hours: 24 });

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
      expect(result?.needsReconnect).toBe(false);
    });

    it("should set needsReconnect when refresh token fails", async () => {
      const expiredDate = new Date(Date.now() - 1000);
      const mockIntegration = {
        id: "int-1",
        user_id: "user-123",
        service_type: "google_calendar",
        credentials: {
          accessToken: "old-access-token",
          refreshToken: "test-refresh-token",
          expiresAt: expiredDate.toISOString(),
        },
        metadata: {
          email: "user@example.com",
        },
        status: "connected",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockIntegration, error: null });
      const mockEq3 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq2 = vi.fn().mockReturnValue({ eq: mockEq3 });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockDb = {
        from: vi.fn(() => ({
          select: mockSelect,
        })),
      };

      // Re-create caller with new mockDb
      caller = await createTestCaller({
        db: mockDb as any,
        user: mockUser,
      } as Partial<Context>);

      // Mock failed token refresh but successful calendar call with old token
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ items: [] }),
        } as any);

      const result = await caller.integration.getGoogleCalendarActivity({ hours: 24 });

      expect(result?.needsReconnect).toBe(true);
    });

    it("should count accepted and declined events correctly", async () => {
      const mockIntegration = {
        id: "int-1",
        user_id: "user-123",
        service_type: "google_calendar",
        credentials: {
          accessToken: "test-access-token",
          expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        },
        metadata: {
          email: "user@example.com",
        },
        status: "connected",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockIntegration, error: null });
      const mockEq3 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq2 = vi.fn().mockReturnValue({ eq: mockEq3 });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockDb = {
        from: vi.fn(() => ({
          select: mockSelect,
        })),
      };

      // Re-create caller with new mockDb
      caller = await createTestCaller({
        db: mockDb as any,
        user: mockUser,
      } as Partial<Context>);

      const now = new Date();

      // Mock calendar events with different response statuses
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          items: [
            {
              id: "event-1",
              summary: "Accepted Event",
              start: { dateTime: now.toISOString() },
              end: { dateTime: new Date(now.getTime() + 60 * 60 * 1000).toISOString() },
              attendees: [{ email: "user@example.com", responseStatus: "accepted", self: true }],
            },
            {
              id: "event-2",
              summary: "Declined Event",
              start: { dateTime: now.toISOString() },
              end: { dateTime: new Date(now.getTime() + 60 * 60 * 1000).toISOString() },
              attendees: [{ email: "user@example.com", responseStatus: "declined", self: true }],
            },
            {
              id: "event-3",
              summary: "Event without attendees",
              start: { dateTime: now.toISOString() },
              end: { dateTime: new Date(now.getTime() + 60 * 60 * 1000).toISOString() },
            },
          ],
        }),
      } as any);

      const result = await caller.integration.getGoogleCalendarActivity({ hours: 24 });

      expect(result?.acceptedEvents).toBe(2); // Accepted + no attendees (assumed accepted)
      expect(result?.declinedEvents).toBe(1);
    });

    it("should handle API errors gracefully", async () => {
      const mockIntegration = {
        id: "int-1",
        user_id: "user-123",
        service_type: "google_calendar",
        credentials: {
          accessToken: "test-access-token",
          expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        },
        metadata: {
          email: "user@example.com",
        },
        status: "connected",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockIntegration, error: null });
      const mockEq3 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq2 = vi.fn().mockReturnValue({ eq: mockEq3 });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockDb = {
        from: vi.fn(() => ({
          select: mockSelect,
        })),
      };

      // Re-create caller with new mockDb
      caller = await createTestCaller({
        db: mockDb as any,
        user: mockUser,
      } as Partial<Context>);

      // Mock API error
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: async () => "Access denied",
      } as any);

      await expect(
        caller.integration.getGoogleCalendarActivity({ hours: 24 })
      ).rejects.toThrow("Failed to fetch Google Calendar activity");
    });

    it("should respect custom time range", async () => {
      const mockIntegration = {
        id: "int-1",
        user_id: "user-123",
        service_type: "google_calendar",
        credentials: {
          accessToken: "test-access-token",
          expiresAt: new Date(Date.now() + 3600 * 1000).toISOString(),
        },
        metadata: {
          email: "user@example.com",
        },
        status: "connected",
      };

      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockIntegration, error: null });
      const mockEq3 = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEq2 = vi.fn().mockReturnValue({ eq: mockEq3 });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });

      mockDb = {
        from: vi.fn(() => ({
          select: mockSelect,
        })),
      };

      // Re-create caller with new mockDb
      caller = await createTestCaller({
        db: mockDb as any,
        user: mockUser,
      } as Partial<Context>);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ items: [] }),
      } as any);
      global.fetch = mockFetch;

      await caller.integration.getGoogleCalendarActivity({ hours: 168 }); // 7 days

      const fetchUrl = mockFetch.mock.calls[0][0];
      expect(fetchUrl).toContain("timeMin=");
      expect(fetchUrl).toContain("timeMax=");
    });
  });
});

