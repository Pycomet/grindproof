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
  
  // Storage configuration (optional with defaults)
  STORAGE_MAX_FILE_SIZE_MB: z.string().optional().default('5'),
  STORAGE_MAX_IMAGE_DIMENSION: z.string().optional().default('4096'),
  STORAGE_PROFILE_BUCKET: z.string().optional().default('profile-pictures'),
  STORAGE_EVIDENCE_BUCKET: z.string().optional().default('task-evidence'),
  
  // AI model configuration (optional with defaults)
  AI_TEXT_MODEL: z.string().optional().default('gemini-2.5-flash'),
  AI_VISION_MODEL: z.string().optional().default('gemini-2.5-flash'),
  
  // Validation configuration (optional with defaults)
  VALIDATION_MIN_CONFIDENCE: z.string().optional().default('0.5'),
  VALIDATION_VALIDATED_WEIGHT: z.string().optional().default('1.0'),
  VALIDATION_UNVALIDATED_WEIGHT: z.string().optional().default('0.5'),
  
  // App configuration (optional with defaults)
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
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
      STORAGE_MAX_FILE_SIZE_MB: '5',
      STORAGE_MAX_IMAGE_DIMENSION: '4096',
      STORAGE_PROFILE_BUCKET: 'profile-pictures',
      STORAGE_EVIDENCE_BUCKET: 'task-evidence',
      AI_TEXT_MODEL: 'gemini-2.5-flash',
      AI_VISION_MODEL: 'gemini-2.0-flash-exp',
      VALIDATION_MIN_CONFIDENCE: '0.5',
      VALIDATION_VALIDATED_WEIGHT: '1.0',
      VALIDATION_UNVALIDATED_WEIGHT: '0.5',
      NEXT_PUBLIC_APP_URL: undefined,
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
    STORAGE_MAX_FILE_SIZE_MB: process.env.STORAGE_MAX_FILE_SIZE_MB,
    STORAGE_MAX_IMAGE_DIMENSION: process.env.STORAGE_MAX_IMAGE_DIMENSION,
    STORAGE_PROFILE_BUCKET: process.env.STORAGE_PROFILE_BUCKET,
    STORAGE_EVIDENCE_BUCKET: process.env.STORAGE_EVIDENCE_BUCKET,
    AI_TEXT_MODEL: process.env.AI_TEXT_MODEL,
    AI_VISION_MODEL: process.env.AI_VISION_MODEL,
    VALIDATION_MIN_CONFIDENCE: process.env.VALIDATION_MIN_CONFIDENCE,
    VALIDATION_VALIDATED_WEIGHT: process.env.VALIDATION_VALIDATED_WEIGHT,
    VALIDATION_UNVALIDATED_WEIGHT: process.env.VALIDATION_UNVALIDATED_WEIGHT,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_VERCEL_URL 
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : undefined,
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
