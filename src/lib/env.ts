import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const serverEnvSchema = clientEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_GITHUB_CLIENT_ID: z.string().min(1),
  NEXT_GITHUB_CLIENT_SECRET: z.string().min(1),
  NEXT_GOOGLE_CALENDAR_CLIENT_ID: z.string().min(1),
  NEXT_GOOGLE_CALENDAR_CLIENT_SECRET: z.string().min(1),
  NEXT_GOOGLE_GEMINI_API_KEY: z.string().min(1),
});

function getEnv(): z.infer<typeof serverEnvSchema> {
  const isServer = typeof window === 'undefined';
  const isTest = process.env.NODE_ENV === 'test';
  
  // Skip validation in tests if mocking
  if (isTest && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return {
      NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-key',
      NEXT_GITHUB_CLIENT_ID: 'test-github-client-id',
      NEXT_GITHUB_CLIENT_SECRET: 'test-github-client-secret',
      NEXT_GOOGLE_CALENDAR_CLIENT_ID: 'test-google-client-id',
      NEXT_GOOGLE_CALENDAR_CLIENT_SECRET: 'test-google-client-secret',
      NEXT_GOOGLE_GEMINI_API_KEY: 'test-google-gemini-api-key',
      NODE_ENV: 'test' as const,
    };
  }

  const schema = isServer ? serverEnvSchema : clientEnvSchema;

  const parsed = schema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NODE_ENV: process.env.NODE_ENV || 'development',
    NEXT_GITHUB_CLIENT_ID: process.env.NEXT_GITHUB_CLIENT_ID,
    NEXT_GITHUB_CLIENT_SECRET: process.env.NEXT_GITHUB_CLIENT_SECRET,
    NEXT_GOOGLE_CALENDAR_CLIENT_ID: process.env.NEXT_GOOGLE_CALENDAR_CLIENT_ID,
    NEXT_GOOGLE_CALENDAR_CLIENT_SECRET: process.env.NEXT_GOOGLE_CALENDAR_CLIENT_SECRET,
    NEXT_GOOGLE_GEMINI_API_KEY: process.env.NEXT_GOOGLE_GEMINI_API_KEY,
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const missingVars: string[] = [];
    const invalidVars: string[] = [];
    
    Object.entries(fieldErrors).forEach(([key, errors]) => {
      if (errors && errors.length > 0) {
        const value = process.env[key];
        if (!value || value.trim() === '') {
          missingVars.push(key);
        } else {
          invalidVars.push(`${key}: ${errors[0]}`);
        }
      }
    });
    
    if (missingVars.length > 0) {
      console.error("❌ Missing environment variables:", missingVars.join(", "));
    }
    if (invalidVars.length > 0) {
      console.error("❌ Invalid environment variables:", invalidVars.join(", "));
    }
    
    throw new Error("Invalid environment variables - check console for details");
  }

  return parsed.data as z.infer<typeof serverEnvSchema>;
}

export const env = getEnv();
