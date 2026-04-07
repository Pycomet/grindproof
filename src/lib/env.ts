import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

const serverEnvSchema = clientEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_GOOGLE_GEMINI_API_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  QSTASH_CURRENT_SIGNING_KEY: z.string().min(1).optional(),
  QSTASH_NEXT_SIGNING_KEY: z.string().min(1).optional(),
  QSTASH_TOKEN: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1),
  VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_EMAIL: z.string().min(1),
  AI_MODEL: z.string().optional().default("gemini-2.5-flash"),
});

const testDefaults: z.infer<typeof serverEnvSchema> = {
  NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
  NEXT_GOOGLE_GEMINI_API_KEY: "test-gemini-key",
  CRON_SECRET: "test-cron-secret",
  QSTASH_CURRENT_SIGNING_KEY: undefined,
  QSTASH_NEXT_SIGNING_KEY: undefined,
  QSTASH_TOKEN: undefined,
  RESEND_API_KEY: "test-resend-key",
  VAPID_PUBLIC_KEY: "test-vapid-public-key",
  VAPID_PRIVATE_KEY: "test-vapid-private-key",
  VAPID_EMAIL: "mailto:test@test.com",
  AI_MODEL: "gemini-2.5-flash",
  NODE_ENV: "test" as const,
  NEXT_PUBLIC_APP_URL: undefined,
};

const rawEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NODE_ENV: process.env.NODE_ENV || "development",
  NEXT_PUBLIC_APP_URL:
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : undefined),
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  NEXT_GOOGLE_GEMINI_API_KEY: process.env.NEXT_GOOGLE_GEMINI_API_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
  QSTASH_CURRENT_SIGNING_KEY: process.env.QSTASH_CURRENT_SIGNING_KEY,
  QSTASH_NEXT_SIGNING_KEY: process.env.QSTASH_NEXT_SIGNING_KEY,
  QSTASH_TOKEN: process.env.QSTASH_TOKEN,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
  VAPID_EMAIL: process.env.VAPID_EMAIL,
  AI_MODEL: process.env.AI_MODEL,
};

const isServer = typeof window === "undefined";
const isTest = process.env.NODE_ENV === "test";

function parseEnv<T extends z.ZodTypeAny>(schema: T, values: Record<string, unknown>): z.infer<T> {
  if (isTest && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return testDefaults as z.infer<T>;
  }

  const parsed = schema.safeParse(values);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const missing = Object.entries(fieldErrors)
      .filter(([, errors]) => errors && errors.length > 0)
      .map(([key]) => key);
    console.error("Missing environment variables:", missing.join(", "));
    throw new Error("Invalid environment variables - check console for details");
  }

  return parsed.data;
}

/**
 * Server-only environment variables. Importing this on the client will throw.
 * Use `clientEnv` for client-safe variables.
 */
export const env: z.infer<typeof serverEnvSchema> = isServer
  ? parseEnv(serverEnvSchema, rawEnv)
  : (() => {
      // On the client, return client-safe env and throw on server-only access
      const clientVars = parseEnv(clientEnvSchema, rawEnv);
      return new Proxy(clientVars as z.infer<typeof serverEnvSchema>, {
        get(target, prop: string) {
          if (prop in target) return (target as Record<string, unknown>)[prop];
          throw new Error(
            `env.${prop} is a server-only variable and cannot be accessed on the client.`
          );
        },
      });
    })();
