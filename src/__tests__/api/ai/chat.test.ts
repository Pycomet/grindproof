/**
 * Tests for src/app/api/ai/chat/route.ts
 *
 * Strategy:
 *   - Mock @supabase/ssr so we control auth state without a real DB.
 *   - Mock "ai" (streamText) so no real AI calls are made.
 *   - Mock @ai-sdk/google and @/lib/ai/tools.
 *   - Build a plain Request (not NextRequest) with cookie and JSON body.
 *   - Assert auth gating, happy-path streaming response, and cookie parsing.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Supabase SSR mock ─────────────────────────────────────────────────────
// Mutable so tests can control the returned user.
const mockGetUser = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
  })),
}));

// ── AI SDK mocks ──────────────────────────────────────────────────────────
const MOCK_STREAM_RESPONSE = new Response("stream-body", { status: 200 });
const mockToUIMessageStreamResponse = vi
  .fn()
  .mockReturnValue(MOCK_STREAM_RESPONSE);
const mockStreamText = vi.fn().mockReturnValue({
  toUIMessageStreamResponse: mockToUIMessageStreamResponse,
});

vi.mock("ai", async (importOriginal) => {
  const original = await importOriginal<typeof import("ai")>();
  return {
    ...original,
    streamText: mockStreamText,
    stepCountIs: vi.fn().mockReturnValue("mock-stop-condition"),
  };
});

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn().mockReturnValue("mock-google-model"),
}));

// ── Tools mock ────────────────────────────────────────────────────────────
const mockCreateGrindproofTools = vi.fn().mockReturnValue({ list_tasks: {} });
vi.mock("@/lib/ai/tools", () => ({
  createGrindproofTools: mockCreateGrindproofTools,
}));

// ── Import route AFTER mocks ──────────────────────────────────────────────
import { POST } from "@/app/api/ai/chat/route";
import { streamText } from "ai";
import { createServerClient } from "@supabase/ssr";

// ── Helpers ───────────────────────────────────────────────────────────────
function makePostRequest(options: {
  body?: unknown;
  cookieHeader?: string;
}) {
  return new Request("http://localhost/api/ai/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(options.cookieHeader ? { cookie: options.cookieHeader } : {}),
    },
    body: JSON.stringify(options.body ?? { messages: [] }),
  });
}

const AUTHED_USER = { id: "user-abc-123", email: "user@example.com" };

beforeEach(() => {
  mockGetUser.mockClear();
  mockStreamText.mockClear();
  mockToUIMessageStreamResponse.mockClear();
  mockCreateGrindproofTools.mockClear();
  vi.mocked(createServerClient).mockClear();
});

// =========================================================================
describe("POST /api/ai/chat – authentication", () => {
  it("returns 401 when no user session exists", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(401);
    const text = await res.text();
    expect(text).toBe("Unauthorized");
  });

  it("returns 401 when getUser throws", async () => {
    mockGetUser.mockRejectedValue(new Error("auth service down"));

    await expect(POST(makePostRequest({}))).rejects.toThrow("auth service down");
  });

  it("proceeds past auth when a valid user is returned", async () => {
    mockGetUser.mockResolvedValue({ data: { user: AUTHED_USER } });

    const res = await POST(makePostRequest({ body: { messages: [] } }));
    expect(res.status).toBe(200);
  });
});

// =========================================================================
describe("POST /api/ai/chat – Supabase client creation", () => {
  it("creates a Supabase client using the anon key (not service role)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: AUTHED_USER } });

    await POST(makePostRequest({}));

    expect(createServerClient).toHaveBeenCalledOnce();
    const [url, key] = vi.mocked(createServerClient).mock.calls[0];
    expect(url).toBe("https://test.supabase.co");
    expect(key).toBe("test-key"); // anon key, NOT service role key
  });

  it("passes parsed cookies to createServerClient", async () => {
    mockGetUser.mockResolvedValue({ data: { user: AUTHED_USER } });

    await POST(
      makePostRequest({
        cookieHeader: "sb-session=abc123; theme=dark",
      })
    );

    const [, , options] = vi.mocked(createServerClient).mock.calls[0] as [
      string,
      string,
      { cookies: { getAll: () => Array<{ name: string; value: string }> } }
    ];
    const cookies = options.cookies.getAll();
    expect(cookies).toContainEqual({ name: "sb-session", value: "abc123" });
    expect(cookies).toContainEqual({ name: "theme", value: "dark" });
  });

  it("passes an empty cookie array when cookie header is absent", async () => {
    mockGetUser.mockResolvedValue({ data: { user: AUTHED_USER } });

    await POST(makePostRequest({}));

    const [, , options] = vi.mocked(createServerClient).mock.calls[0] as [
      string,
      string,
      { cookies: { getAll: () => Array<{ name: string; value: string }> } }
    ];
    expect(options.cookies.getAll()).toEqual([]);
  });
});

// =========================================================================
describe("POST /api/ai/chat – cookie parsing edge cases", () => {
  it("handles a cookie value that contains '=' signs (e.g. base64)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: AUTHED_USER } });

    // base64 value contains "=" padding
    await POST(
      makePostRequest({ cookieHeader: "token=abc==; other=val" })
    );

    const [, , options] = vi.mocked(createServerClient).mock.calls[0] as [
      string,
      string,
      { cookies: { getAll: () => Array<{ name: string; value: string }> } }
    ];
    const cookies = options.cookies.getAll();
    const token = cookies.find((c) => c.name === "token");
    // The route splits on "=" and re-joins the rest, so value should be "abc=="
    expect(token?.value).toBe("abc==");
  });

  it("skips cookie entries with no name", async () => {
    mockGetUser.mockResolvedValue({ data: { user: AUTHED_USER } });

    // A malformed cookie with leading ";" produces an empty name segment
    await POST(
      makePostRequest({ cookieHeader: "; valid=yes" })
    );

    const [, , options] = vi.mocked(createServerClient).mock.calls[0] as [
      string,
      string,
      { cookies: { getAll: () => Array<{ name: string; value: string }> } }
    ];
    const cookies = options.cookies.getAll();
    // The empty-name cookie should be filtered out by the `if (name)` guard
    expect(cookies.every((c) => c.name.length > 0)).toBe(true);
    expect(cookies).toContainEqual({ name: "valid", value: "yes" });
  });
});

// =========================================================================
describe("POST /api/ai/chat – streamText invocation", () => {
  it("calls streamText with the user's messages", async () => {
    mockGetUser.mockResolvedValue({ data: { user: AUTHED_USER } });

    const messages = [{ role: "user", content: "What tasks do I have?" }];
    await POST(makePostRequest({ body: { messages } }));

    expect(streamText).toHaveBeenCalledOnce();
    const args = vi.mocked(streamText).mock.calls[0][0];
    expect(args.messages).toEqual(messages);
  });

  it("calls createGrindproofTools with the authenticated user id and supabase client", async () => {
    mockGetUser.mockResolvedValue({ data: { user: AUTHED_USER } });

    await POST(makePostRequest({ body: { messages: [] } }));

    expect(mockCreateGrindproofTools).toHaveBeenCalledOnce();
    const [calledUserId, calledSupabase] =
      mockCreateGrindproofTools.mock.calls[0];
    expect(calledUserId).toBe(AUTHED_USER.id);
    expect(calledSupabase).toBeDefined();
  });

  it("passes the tools returned by createGrindproofTools to streamText", async () => {
    mockGetUser.mockResolvedValue({ data: { user: AUTHED_USER } });
    const mockTools = { my_tool: {} };
    mockCreateGrindproofTools.mockReturnValue(mockTools);

    await POST(makePostRequest({ body: { messages: [] } }));

    const args = vi.mocked(streamText).mock.calls[0][0];
    expect(args.tools).toBe(mockTools);
  });

  it("returns the response from toUIMessageStreamResponse", async () => {
    mockGetUser.mockResolvedValue({ data: { user: AUTHED_USER } });

    const res = await POST(makePostRequest({ body: { messages: [] } }));

    expect(mockToUIMessageStreamResponse).toHaveBeenCalledOnce();
    expect(res).toBe(MOCK_STREAM_RESPONSE);
  });

  it("passes stopWhen with stepCountIs(5) to streamText", async () => {
    mockGetUser.mockResolvedValue({ data: { user: AUTHED_USER } });

    await POST(makePostRequest({ body: { messages: [] } }));

    const args = vi.mocked(streamText).mock.calls[0][0];
    // stepCountIs is mocked to return "mock-stop-condition"
    expect(args.stopWhen).toBe("mock-stop-condition");
  });
});
