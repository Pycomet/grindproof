import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

/**
 * Supabase client for client-side usage (browser)
 * Uses the anon key - row-level security policies apply
 */
export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

