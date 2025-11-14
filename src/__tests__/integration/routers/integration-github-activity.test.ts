import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createTestCaller } from "@/__tests__/utils/trpc-test-utils";
import type { Context } from "@/server/trpc/context";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Integration Router - GitHub Activity", () => {
  let mockDb: any;
  let caller: Awaited<ReturnType<typeof createTestCaller>>;
  const mockUser = {
    id: "user-123",
    email: "test@example.com",
  };

  const mockAccessToken = "gho_test123456789";
  const mockGitHubIntegration = {
    id: "int-1",
    user_id: "user-123",
    service_type: "github",
    credentials: { accessToken: mockAccessToken },
    status: "connected",
    metadata: {
      githubUsername: "testuser",
      githubId: 12345,
      avatarUrl: "https://github.com/testuser.png",
      name: "Test User",
    },
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const mockMaybeSingle = vi.fn();
    const mockEqStatus = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
    const mockEqService = vi.fn().mockReturnValue({ eq: mockEqStatus });
    const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqService });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });

    mockDb = {
      from: vi.fn(() => ({
        select: mockSelect,
      })),
    };

    caller = await createTestCaller({
      db: mockDb as any,
      user: mockUser,
    } as Partial<Context>);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getGitHubActivity", () => {
    it("should return null when no GitHub integration exists", async () => {
      // Mock database to return no integration
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const mockEqStatus = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEqService = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqService });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const result = await caller.integration.getGitHubActivity({ hours: 24 });

      expect(result).toBeNull();
      expect(mockDb.from).toHaveBeenCalledWith("integrations");
    });

    it("should throw error when integration fetch fails", async () => {
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: null, error: { message: "Database error" } });
      const mockEqStatus = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEqService = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqService });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      await expect(caller.integration.getGitHubActivity({ hours: 24 })).rejects.toThrow(
        "Failed to fetch GitHub integration"
      );
    });

    it("should throw error when access token is missing", async () => {
      const integrationWithoutToken = {
        ...mockGitHubIntegration,
        credentials: {},
      };

      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: integrationWithoutToken, error: null });
      const mockEqStatus = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEqService = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqService });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      await expect(caller.integration.getGitHubActivity({ hours: 24 })).rejects.toThrow(
        "GitHub access token not found"
      );
    });

    it("should successfully fetch and aggregate GitHub activity", async () => {
      // Mock integration exists
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: mockGitHubIntegration, error: null });
      const mockEqStatus = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEqService = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqService });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      // Mock GitHub API responses
      const now = new Date();
      const mockGitHubUser = { login: "testuser", id: 12345 };
      const mockEvents = [
        {
          type: "PushEvent",
          created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          repo: { name: "testuser/repo1" },
          payload: { commits: [{ sha: "abc123" }, { sha: "def456" }] },
        },
        {
          type: "PullRequestEvent",
          created_at: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
          repo: { name: "testuser/repo2" },
          payload: { action: "opened" },
        },
        {
          type: "IssuesEvent",
          created_at: new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString(), // 10 hours ago
          repo: { name: "testuser/repo1" },
          payload: { action: "opened" },
        },
        {
          type: "PushEvent",
          created_at: new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString(), // 30 hours ago (should be filtered out)
          repo: { name: "testuser/repo3" },
          payload: { commits: [{ sha: "xyz789" }] },
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockGitHubUser,
          headers: new Headers({ "X-OAuth-Scopes": "read:user, repo" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvents,
        });

      const result = await caller.integration.getGitHubActivity({ hours: 24 });

      expect(result).toEqual({
        commits: 2, // Only commits from the first PushEvent (within 24 hours)
        pullRequests: 1,
        issues: 1,
        repositories: ["testuser/repo1", "testuser/repo2"],
        totalEvents: 3,
        githubUsername: "testuser",
        needsReconnect: false,
      });

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(1, "https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${mockAccessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        "https://api.github.com/user/events?per_page=100",
        {
          headers: {
            Authorization: `Bearer ${mockAccessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );
    });

    it("should detect missing repo scope and set needsReconnect flag", async () => {
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: mockGitHubIntegration, error: null });
      const mockEqStatus = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEqService = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqService });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const mockGitHubUser = { login: "testuser", id: 12345 };
      const mockEvents: any[] = [];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockGitHubUser,
          headers: new Headers({ "X-OAuth-Scopes": "read:user" }), // Missing 'repo' scope
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvents,
        });

      const result = await caller.integration.getGitHubActivity({ hours: 24 });

      expect(result?.needsReconnect).toBe(true);
      expect(result?.githubUsername).toBe("testuser");
    });

    it("should handle GitHub API authentication failure", async () => {
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: mockGitHubIntegration, error: null });
      const mockEqStatus = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEqService = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqService });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () => "Bad credentials",
      });

      await expect(caller.integration.getGitHubActivity({ hours: 24 })).rejects.toThrow(
        "GitHub API authentication failed"
      );
    });

    it("should use fallback mechanism when /user/events returns 404", async () => {
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: mockGitHubIntegration, error: null });
      const mockEqStatus = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEqService = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqService });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const mockGitHubUser = { login: "testuser", id: 12345 };
      const mockRepos = [
        { full_name: "testuser/repo1", private: false },
        { full_name: "testuser/repo2", private: true },
      ];

      const now = new Date();
      const mockCommits = [
        {
          sha: "abc123",
          commit: { author: { date: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString() } },
        },
        {
          sha: "def456",
          commit: { author: { date: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString() } },
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          // User info
          ok: true,
          json: async () => mockGitHubUser,
          headers: new Headers({ "X-OAuth-Scopes": "read:user, repo" }),
        })
        .mockResolvedValueOnce({
          // /user/events - 404
          ok: false,
          status: 404,
          text: async () => "Not Found",
        })
        .mockResolvedValueOnce({
          // Fallback: repos list
          ok: true,
          json: async () => mockRepos,
        })
        .mockResolvedValueOnce({
          // Commits for repo1
          ok: true,
          json: async () => mockCommits,
        })
        .mockResolvedValueOnce({
          // Commits for repo2
          ok: true,
          json: async () => [],
        });

      const result = await caller.integration.getGitHubActivity({ hours: 24 });

      expect(result?.commits).toBe(2);
      expect(result?.repositories).toContain("testuser/repo1");
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member",
        expect.any(Object)
      );
    });

    it("should throw error when fallback repository fetch fails", async () => {
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: mockGitHubIntegration, error: null });
      const mockEqStatus = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEqService = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqService });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const mockGitHubUser = { login: "testuser", id: 12345 };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockGitHubUser,
          headers: new Headers({ "X-OAuth-Scopes": "read:user, repo" }),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
          text: async () => "Not Found",
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: "Forbidden",
          text: async () => "Rate limit exceeded",
        });

      await expect(caller.integration.getGitHubActivity({ hours: 24 })).rejects.toThrow(
        "Unable to fetch repositories"
      );
    });

    it("should correctly aggregate multiple events from same repository", async () => {
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: mockGitHubIntegration, error: null });
      const mockEqStatus = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEqService = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqService });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const now = new Date();
      const mockGitHubUser = { login: "testuser", id: 12345 };
      const mockEvents = [
        {
          type: "PushEvent",
          created_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
          repo: { name: "testuser/repo1" },
          payload: { commits: [{ sha: "abc123" }] },
        },
        {
          type: "PushEvent",
          created_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
          repo: { name: "testuser/repo1" },
          payload: { commits: [{ sha: "def456" }, { sha: "ghi789" }] },
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockGitHubUser,
          headers: new Headers({ "X-OAuth-Scopes": "read:user, repo" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvents,
        });

      const result = await caller.integration.getGitHubActivity({ hours: 24 });

      expect(result?.commits).toBe(3);
      expect(result?.repositories).toEqual(["testuser/repo1"]);
      expect(result?.totalEvents).toBe(2);
    });

    it("should handle custom time range (hours parameter)", async () => {
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: mockGitHubIntegration, error: null });
      const mockEqStatus = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEqService = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqService });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const now = new Date();
      const mockGitHubUser = { login: "testuser", id: 12345 };
      const mockEvents = [
        {
          type: "PushEvent",
          created_at: new Date(now.getTime() - 10 * 60 * 60 * 1000).toISOString(), // 10 hours ago
          repo: { name: "testuser/repo1" },
          payload: { commits: [{ sha: "abc123" }] },
        },
        {
          type: "PushEvent",
          created_at: new Date(now.getTime() - 50 * 60 * 60 * 1000).toISOString(), // 50 hours ago
          repo: { name: "testuser/repo2" },
          payload: { commits: [{ sha: "def456" }] },
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockGitHubUser,
          headers: new Headers({ "X-OAuth-Scopes": "read:user, repo" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvents,
        });

      const result = await caller.integration.getGitHubActivity({ hours: 48 });

      expect(result?.commits).toBe(1); // Only first commit within 48 hours (10 hours ago)
      expect(result?.repositories).toEqual(["testuser/repo1"]); // 50 hours ago is outside 48-hour window
    });

    it("should return zero counts when no activity in time range", async () => {
      const mockMaybeSingle = vi
        .fn()
        .mockResolvedValue({ data: mockGitHubIntegration, error: null });
      const mockEqStatus = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEqService = vi.fn().mockReturnValue({ eq: mockEqStatus });
      const mockEqUser = vi.fn().mockReturnValue({ eq: mockEqService });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEqUser });

      mockDb.from.mockReturnValue({
        select: mockSelect,
      });

      const mockGitHubUser = { login: "testuser", id: 12345 };
      const mockEvents: any[] = [];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockGitHubUser,
          headers: new Headers({ "X-OAuth-Scopes": "read:user, repo" }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockEvents,
        });

      const result = await caller.integration.getGitHubActivity({ hours: 24 });

      expect(result).toEqual({
        commits: 0,
        pullRequests: 0,
        issues: 0,
        repositories: [],
        totalEvents: 0,
        githubUsername: "testuser",
        needsReconnect: false,
      });
    });

    it("should throw error when not authenticated", async () => {
      const unauthenticatedCaller = await createTestCaller({
        db: mockDb as any,
        user: null,
      } as Partial<Context>);

      await expect(
        unauthenticatedCaller.integration.getGitHubActivity({ hours: 24 })
      ).rejects.toThrow();
    });
  });
});

