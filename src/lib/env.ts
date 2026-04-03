import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const serverEnvSchema = clientEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_GOOGLE_GEMINI_API_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_EMAIL: z.string().min(1),
  AI_MODEL: z.string().optional().default("gemini-2.5-flash"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

function getEnv(): z.infer<typeof serverEnvSchema> {
  const isServer = typeof window === "undefined";
  const isTest = process.env.NODE_ENV === "test";

  if (isTest && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return {
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
      NEXT_GOOGLE_GEMINI_API_KEY: "test-gemini-key",
      CRON_SECRET: "test-cron-secret",
      RESEND_API_KEY: "test-resend-key",
      VAPID_PUBLIC_KEY: "test-vapid-public-key",
      VAPID_PRIVATE_KEY: "test-vapid-private-key",
      VAPID_EMAIL: "mailto:test@test.com",
      AI_MODEL: "gemini-2.5-flash",
      NODE_ENV: "test" as const,
      NEXT_PUBLIC_APP_URL: undefined,
    };
  }

  const schema = isServer ? serverEnvSchema : clientEnvSchema;

  const parsed = schema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NODE_ENV: process.env.NODE_ENV || "development",
    NEXT_GOOGLE_GEMINI_API_KEY: process.env.NEXT_GOOGLE_GEMINI_API_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_EMAIL: process.env.VAPID_EMAIL,
    AI_MODEL: process.env.AI_MODEL,
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : undefined),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const missing = Object.entries(fieldErrors)
      .filter(([, errors]) => errors && errors.length > 0)
      .map(([key]) => key);
    console.error("Missing environment variables:", missing.join(", "));
    throw new Error("Invalid environment variables - check console for details");
  }

  return parsed.data as z.infer<typeof serverEnvSchema>;
}

export const env = getEnv();
