import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

// Mock modules before importing
vi.mock("@/lib/supabase/server", () => ({
  createServerClient: vi.fn(),
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

vi.mock("@/lib/env", () => ({
  env: {
    NEXT_GITHUB_CLIENT_ID: "test-client-id",
    NEXT_GITHUB_CLIENT_SECRET: "test-client-secret",
  },
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

const mockCreateServerClient = vi.fn();
const mockSupabaseAdmin = { from: vi.fn() };
const mockCookies = vi.fn();

describe("GitHub OAuth Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET /api/integrations/github/connect", () => {
    it("should redirect unauthenticated users to login", async () => {
      // Mock unauthenticated user
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      };

      const { createServerClient } = await import("@/lib/supabase/server");
      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any);

      const { cookies } = await import("next/headers");
      vi.mocked(cookies).mockResolvedValue({
        set: vi.fn(),
      } as any);

      // Import the route handler
      const { GET } = await import("@/app/api/integrations/github/connect/route");

      const request = new NextRequest("http://localhost:3000/api/integrations/github/connect");
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/auth/login");
      expect(response.headers.get("location")).toContain("error=authentication_required");
    });

    it("should generate state and redirect to GitHub for authenticated users", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
      };

      const { createServerClient } = await import("@/lib/supabase/server");
      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any);

      const mockSetCookie = vi.fn();
      const { cookies } = await import("next/headers");
      vi.mocked(cookies).mockResolvedValue({
        set: mockSetCookie,
      } as any);

      const { GET } = await import("@/app/api/integrations/github/connect/route");

      const request = new NextRequest("http://localhost:3000/api/integrations/github/connect");
      const response = await GET(request);

      // Should set state cookie
      expect(mockSetCookie).toHaveBeenCalledWith(
        "github_oauth_state",
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          sameSite: "lax",
          maxAge: 600,
          path: "/",
        })
      );

      // Should redirect to GitHub
      expect(response.status).toBe(307);
      const location = response.headers.get("location");
      expect(location).toContain("https://github.com/login/oauth/authorize");
      expect(location).toContain("client_id=test-client-id");
      expect(location).toContain("scope=read%3Auser+repo");
      expect(location).toContain("state=");
      expect(location).toContain(
        "redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fintegrations%2Fgithub%2Fcallback"
      );
    });

    it("should handle errors and redirect to login", async () => {
      const { createServerClient } = await import("@/lib/supabase/server");
      vi.mocked(createServerClient).mockRejectedValue(new Error("Database error"));

      const { GET } = await import("@/app/api/integrations/github/connect/route");

      const request = new NextRequest("http://localhost:3000/api/integrations/github/connect");
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/auth/login");
      expect(response.headers.get("location")).toContain("error=oauth_init_failed");
    });
  });

  describe("GET /api/integrations/github/callback", () => {
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    beforeEach(() => {
      mockFetch.mockClear();
    });

    it("should redirect to login when user denies authorization", async () => {
      const { GET } = await import("@/app/api/integrations/github/callback/route");

      const request = new NextRequest(
        "http://localhost:3000/api/integrations/github/callback?error=access_denied"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/auth/login");
      expect(response.headers.get("location")).toContain("error=github_oauth_denied");
    });

    it("should redirect to login when code or state is missing", async () => {
      const { GET } = await import("@/app/api/integrations/github/callback/route");

      const request = new NextRequest(
        "http://localhost:3000/api/integrations/github/callback?code=abc123"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/auth/login");
      expect(response.headers.get("location")).toContain("error=invalid_callback");
    });

    it("should redirect to login when state validation fails", async () => {
      const { cookies } = await import("next/headers");
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "stored-state" }),
        delete: vi.fn(),
      } as any);

      const { GET } = await import("@/app/api/integrations/github/callback/route");

      const request = new NextRequest(
        "http://localhost:3000/api/integrations/github/callback?code=abc123&state=different-state"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/auth/login");
      expect(response.headers.get("location")).toContain("error=invalid_state");
    });

    it("should redirect to login when user is not authenticated", async () => {
      const { cookies } = await import("next/headers");
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: "matching-state" }),
        delete: vi.fn(),
      } as any);

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
        },
      };

      const { createServerClient } = await import("@/lib/supabase/server");
      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any);

      const { GET } = await import("@/app/api/integrations/github/callback/route");

      const request = new NextRequest(
        "http://localhost:3000/api/integrations/github/callback?code=abc123&state=matching-state"
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/auth/login");
      expect(response.headers.get("location")).toContain("error=session_expired");
    });

    it("should successfully complete OAuth flow and store integration", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      const matchingState = "matching-state";

      const { cookies } = await import("next/headers");
      const mockDeleteCookie = vi.fn();
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: matchingState }),
        delete: mockDeleteCookie,
      } as any);

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
      };

      const { createServerClient } = await import("@/lib/supabase/server");
      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any);

      // Mock GitHub token exchange
      const mockAccessToken = "gho_test123456789";
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: mockAccessToken }),
      });

      // Mock GitHub user info
      const mockGitHubUser = {
        id: 12345,
        login: "testuser",
        name: "Test User",
        avatar_url: "https://github.com/testuser.png",
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockGitHubUser,
      });

      // Mock Supabase integration upsert
      const { supabaseAdmin } = await import("@/lib/supabase/server");
      const mockUpsert = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        upsert: mockUpsert,
      } as any);

      const { GET } = await import("@/app/api/integrations/github/callback/route");

      const request = new NextRequest(
        `http://localhost:3000/api/integrations/github/callback?code=test-code&state=${matchingState}`
      );
      const response = await GET(request);

      // Should delete state cookie
      expect(mockDeleteCookie).toHaveBeenCalledWith("github_oauth_state");

      // Should exchange code for token
      expect(mockFetch).toHaveBeenCalledWith(
        "https://github.com/login/oauth/access_token",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            client_id: "test-client-id",
            client_secret: "test-client-secret",
            code: "test-code",
          }),
        })
      );

      // Should fetch GitHub user info
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/user",
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockAccessToken}`,
          }),
        })
      );

      // Should store integration
      expect(mockUpsert).toHaveBeenCalledWith(
        {
          user_id: mockUser.id,
          service_type: "github",
          credentials: { accessToken: mockAccessToken },
          metadata: {
            githubUsername: mockGitHubUser.login,
            githubId: mockGitHubUser.id,
            avatarUrl: mockGitHubUser.avatar_url,
            name: mockGitHubUser.name,
          },
          status: "connected",
        },
        { onConflict: "user_id,service_type" }
      );

      // Should redirect to dashboard
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/dashboard");
      expect(response.headers.get("location")).toContain("github_connected=true");
    });

    it("should handle token exchange failure", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      const matchingState = "matching-state";

      const { cookies } = await import("next/headers");
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: matchingState }),
        delete: vi.fn(),
      } as any);

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
      };

      const { createServerClient } = await import("@/lib/supabase/server");
      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any);

      // Mock failed token exchange
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      const { GET } = await import("@/app/api/integrations/github/callback/route");

      const request = new NextRequest(
        `http://localhost:3000/api/integrations/github/callback?code=invalid-code&state=${matchingState}`
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/auth/login");
      expect(response.headers.get("location")).toContain("error=oauth_callback_failed");
    });

    it("should handle GitHub user info fetch failure", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      const matchingState = "matching-state";

      const { cookies } = await import("next/headers");
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: matchingState }),
        delete: vi.fn(),
      } as any);

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
      };

      const { createServerClient } = await import("@/lib/supabase/server");
      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any);

      // Mock successful token exchange
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "test-token" }),
      });

      // Mock failed user info fetch
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
      });

      const { GET } = await import("@/app/api/integrations/github/callback/route");

      const request = new NextRequest(
        `http://localhost:3000/api/integrations/github/callback?code=test-code&state=${matchingState}`
      );
      const response = await GET(request);

      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/auth/login");
      expect(response.headers.get("location")).toContain("error=oauth_callback_failed");
    });

    it("should continue even if integration storage fails (logs error)", async () => {
      const mockUser = { id: "user-123", email: "test@example.com" };
      const matchingState = "matching-state";

      const { cookies } = await import("next/headers");
      vi.mocked(cookies).mockResolvedValue({
        get: vi.fn().mockReturnValue({ value: matchingState }),
        delete: vi.fn(),
      } as any);

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser } }),
        },
      };

      const { createServerClient } = await import("@/lib/supabase/server");
      vi.mocked(createServerClient).mockResolvedValue(mockSupabase as any);

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: "test-token" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 12345,
            login: "testuser",
            name: "Test User",
            avatar_url: "https://github.com/testuser.png",
          }),
        });

      // Mock integration storage failure
      const { supabaseAdmin } = await import("@/lib/supabase/server");
      const mockUpsert = vi
        .fn()
        .mockResolvedValue({ error: { message: "Database error" } });
      vi.mocked(supabaseAdmin.from).mockReturnValue({
        upsert: mockUpsert,
      } as any);

      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const { GET } = await import("@/app/api/integrations/github/callback/route");

      const request = new NextRequest(
        `http://localhost:3000/api/integrations/github/callback?code=test-code&state=${matchingState}`
      );
      const response = await GET(request);

      // Should still redirect to dashboard (error is logged but not thrown)
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toContain("/dashboard");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Failed to store integration:",
        expect.any(Object)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});

