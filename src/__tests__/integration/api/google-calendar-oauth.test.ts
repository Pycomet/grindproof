import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as connectRoute } from "@/app/api/integrations/google-calendar/connect/route";
import { GET as callbackRoute } from "@/app/api/integrations/google-calendar/callback/route";
import { NextRequest } from "next/server";

// Mock modules
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(),
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_GOOGLE_CALENDAR_CLIENT_ID: "test-client-id",
    NEXT_GOOGLE_CALENDAR_CLIENT_SECRET: "test-client-secret",
  },
}));

describe("Google Calendar OAuth Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Connect Route", () => {
    it("should require authentication", async () => {
      const { createServerClient } = await import("@/lib/supabase/server");
      
      vi.mocked(createServerClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/integrations/google-calendar/connect");
      const response = await connectRoute(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/auth/login");
      expect(response.headers.get("location")).toContain("error=authentication_required");
    });

    it("should generate CSRF state and redirect to Google OAuth", async () => {
      const { createServerClient } = await import("@/lib/supabase/server");
      const { cookies } = await import("next/headers");

      const mockSet = vi.fn();
      vi.mocked(cookies).mockResolvedValue({
        set: mockSet,
      } as any);

      vi.mocked(createServerClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-123", email: "test@example.com" } },
            error: null,
          }),
        },
      } as any);

      const request = new NextRequest("http://localhost:3000/api/integrations/google-calendar/connect");
      const response = await connectRoute(request);

      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("accounts.google.com/o/oauth2/v2/auth");
      expect(location).toContain("client_id=test-client-id");
      expect(location).toContain("access_type=offline");
      expect(location).toContain("prompt=consent");
      expect(location).toContain("scope=");
      expect(location).toContain("calendar.readonly");
      expect(location).toContain("calendar.events");
      
      expect(mockSet).toHaveBeenCalledWith(
        "google_calendar_oauth_state",
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          maxAge: 600,
        })
      );
    });
  });

  describe("Callback Route", () => {
    it("should handle OAuth errors", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/integrations/google-calendar/callback?error=access_denied"
      );
      const response = await callbackRoute(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/auth/login");
      expect(response.headers.get("location")).toContain("error=google_calendar_oauth_denied");
    });

    it("should require code and state parameters", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/integrations/google-calendar/callback"
      );
      const response = await callbackRoute(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("error=invalid_callback");
    });

    it("should verify CSRF state", async () => {
      const { cookies } = await import("next/headers");

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "stored-state" }),
        delete: vi.fn(),
      } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/integrations/google-calendar/callback?code=test-code&state=invalid-state"
      );
      const response = await callbackRoute(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("error=invalid_state");
    });

    it("should require authenticated user", async () => {
      const { createServerClient } = await import("@/lib/supabase/server");
      const { cookies } = await import("next/headers");

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "test-state" }),
        delete: vi.fn(),
      } as any);

      vi.mocked(createServerClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: null },
            error: null,
          }),
        },
      } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/integrations/google-calendar/callback?code=test-code&state=test-state"
      );
      const response = await callbackRoute(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("error=session_expired");
    });

    it("should exchange code for tokens and store integration", async () => {
      const { createServerClient, supabaseAdmin } = await import("@/lib/supabase/server");
      const { cookies } = await import("next/headers");

      const mockDelete = vi.fn();
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "test-state" }),
        delete: mockDelete,
      } as any);

      vi.mocked(createServerClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-123", email: "test@example.com" } },
            error: null,
          }),
        },
      } as any);

      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        upsert: mockUpsert,
      } as any);

      // Mock fetch for token exchange
      global.fetch = vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: "test-access-token",
            refresh_token: "test-refresh-token",
            expires_in: 3600,
          }),
        } as any)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            email: "user@example.com",
            verified_email: true,
          }),
        } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/integrations/google-calendar/callback?code=test-code&state=test-state"
      );
      const response = await callbackRoute(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/dashboard");
      expect(response.headers.get("location")).toContain("google_calendar_connected=true");

      expect(mockDelete).toHaveBeenCalledWith("google_calendar_oauth_state");
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: "user-123",
          service_type: "google_calendar",
          status: "connected",
          credentials: expect.objectContaining({
            accessToken: "test-access-token",
            refreshToken: "test-refresh-token",
          }),
          metadata: expect.objectContaining({
            email: "user@example.com",
            calendarId: "primary",
          }),
        }),
        expect.any(Object)
      );
    });

    it("should handle token exchange failure", async () => {
      const { createServerClient } = await import("@/lib/supabase/server");
      const { cookies } = await import("next/headers");

      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "test-state" }),
        delete: vi.fn(),
      } as any);

      vi.mocked(createServerClient).mockResolvedValue({
        auth: {
          getUser: vi.fn().mockResolvedValue({
            data: { user: { id: "user-123", email: "test@example.com" } },
            error: null,
          }),
        },
      } as any);

      // Mock failed token exchange
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: async () => "Invalid code",
      } as any);

      const request = new NextRequest(
        "http://localhost:3000/api/integrations/google-calendar/callback?code=invalid-code&state=test-state"
      );
      const response = await callbackRoute(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("error=oauth_callback_failed");
    });
  });
});

