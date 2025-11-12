import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Supabase client for server-side usage
 * Uses the service role key - bypasses row-level security
 * Use this in tRPC procedures for admin operations
 */
export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

/**
 * Get a Supabase client for a specific user session
 * Use this when you have user authentication
 */
export function createServerClient() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

