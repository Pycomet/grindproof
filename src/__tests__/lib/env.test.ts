/**
 * Tests for src/lib/env.ts
 *
 * @vitest-environment node
 *
 * env.ts uses a module-level call to getEnv() at import time. Because Vitest
 * caches modules, every test that needs a different set of process.env values
 * must reset the module registry via vi.resetModules() so getEnv() is
 * re-evaluated with fresh process.env state.
 *
 * Must run in node environment (not jsdom) because env.ts checks
 * `typeof window === "undefined"` to decide server vs client schema.
 */

describe("env – test environment shortcut", () => {
  it("returns the test-fallback object when NODE_ENV=test and NEXT_PUBLIC_SUPABASE_URL is absent", async () => {
    const { env } = await import("@/lib/env");

    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://test.supabase.co");
    expect(env.NEXT_PUBLIC_SUPABASE_ANON_KEY).toBe("test-key");
    expect(env.SUPABASE_SERVICE_ROLE_KEY).toBe("test-service-key");
    expect(env.NEXT_GOOGLE_GEMINI_API_KEY).toBe("test-gemini-key");
    expect(env.CRON_SECRET).toBe("test-cron-secret");
    expect(env.RESEND_API_KEY).toBe("test-resend-key");
    expect(env.VAPID_PUBLIC_KEY).toBe("test-vapid-public-key");
    expect(env.VAPID_PRIVATE_KEY).toBe("test-vapid-private-key");
    expect(env.VAPID_EMAIL).toBe("mailto:test@test.com");
    expect(env.AI_MODEL).toBe("gemini-2.5-flash");
    expect(env.NODE_ENV).toBe("test");
  });
});

describe("env – server-side validation", () => {
  const VALID_SERVER_ENV = {
    NODE_ENV: "development",
    NEXT_PUBLIC_SUPABASE_URL: "https://abc.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-value",
    SUPABASE_SERVICE_ROLE_KEY: "service-role-key-value",
    SUPABASE_JWT_SECRET: "jwt-secret-value",
    NEXT_GOOGLE_GEMINI_API_KEY: "gemini-key-value",
    CRON_SECRET: "super-secret",
    RESEND_API_KEY: "re_test_key",
    VAPID_PUBLIC_KEY: "vapid-pub",
    VAPID_PRIVATE_KEY: "vapid-priv",
    VAPID_EMAIL: "mailto:admin@example.com",
  };

  /** Set env vars, reset module cache, dynamically import, then restore. */
  async function withEnv(
    overrides: Record<string, string | undefined>
  ): Promise<typeof import("@/lib/env")> {
    const original: Record<string, string | undefined> = {};
    for (const key of Object.keys(overrides)) {
      original[key] = process.env[key];
      if (overrides[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = overrides[key];
      }
    }

    vi.resetModules();

    try {
      return await import("@/lib/env");
    } finally {
      for (const key of Object.keys(overrides)) {
        if (original[key] === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = original[key];
        }
      }
    }
  }

  it("parses a fully valid server env without throwing", async () => {
    const { env } = await withEnv(VALID_SERVER_ENV);
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe("https://abc.supabase.co");
    expect(env.CRON_SECRET).toBe("super-secret");
    expect(env.AI_MODEL).toBe("gemini-2.5-flash"); // default
  });

  it("uses AI_MODEL default of gemini-2.5-flash when absent", async () => {
    const { env } = await withEnv({ ...VALID_SERVER_ENV, AI_MODEL: undefined });
    expect(env.AI_MODEL).toBe("gemini-2.5-flash");
  });

  it("uses a custom AI_MODEL when set", async () => {
    const { env } = await withEnv({ ...VALID_SERVER_ENV, AI_MODEL: "gemini-1.5-pro" });
    expect(env.AI_MODEL).toBe("gemini-1.5-pro");
  });

  it("derives NEXT_PUBLIC_APP_URL from NEXT_PUBLIC_VERCEL_URL when APP_URL is absent", async () => {
    const { env } = await withEnv({
      ...VALID_SERVER_ENV,
      NEXT_PUBLIC_APP_URL: undefined,
      NEXT_PUBLIC_VERCEL_URL: "my-app-abc123.vercel.app",
    });
    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://my-app-abc123.vercel.app");
  });

  it("prefers explicit NEXT_PUBLIC_APP_URL over NEXT_PUBLIC_VERCEL_URL", async () => {
    const { env } = await withEnv({
      ...VALID_SERVER_ENV,
      NEXT_PUBLIC_APP_URL: "https://grindproof.co",
      NEXT_PUBLIC_VERCEL_URL: "my-app-abc123.vercel.app",
    });
    expect(env.NEXT_PUBLIC_APP_URL).toBe("https://grindproof.co");
  });

  it("throws when a required server variable is missing", async () => {
    await expect(
      withEnv({ ...VALID_SERVER_ENV, CRON_SECRET: undefined })
    ).rejects.toThrow("Invalid environment variables");
  });

  it("throws when NEXT_PUBLIC_SUPABASE_URL is not a valid URL", async () => {
    await expect(
      withEnv({ ...VALID_SERVER_ENV, NEXT_PUBLIC_SUPABASE_URL: "not-a-url" })
    ).rejects.toThrow("Invalid environment variables");
  });

  it("throws when RESEND_API_KEY is an empty string", async () => {
    await expect(
      withEnv({ ...VALID_SERVER_ENV, RESEND_API_KEY: "" })
    ).rejects.toThrow("Invalid environment variables");
  });
});
