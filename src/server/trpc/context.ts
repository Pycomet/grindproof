import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Context for tRPC procedures
 * This is where you can add request-specific data like user sessions, database connections, etc.
 */
export function createContext() {
  return {
    db: supabaseAdmin,
    // Add other context here (e.g., user session, etc.)
  };
}

export type Context = ReturnType<typeof createContext>;

/**
 * Initialize tRPC
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

