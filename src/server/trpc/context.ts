import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { supabaseAdmin } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import type { User } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Context for tRPC procedures
 * This is where you can add request-specific data like user sessions, database connections, etc.
 */
export async function createContext(opts?: { req?: Request }) {
  let user: User | null = null;

  // Extract user from request if available
  if (opts?.req) {
    try {
      // Create a server client from the request cookies
      const supabase = createServerClient<Database>(
        env.NEXT_PUBLIC_SUPABASE_URL,
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          cookies: {
            getAll() {
              // Extract cookies from the request
              const cookieHeader = opts.req.headers.get("cookie") || "";
              const cookies: { name: string; value: string }[] = [];
              
              cookieHeader.split(";").forEach((cookie) => {
                const [name, ...rest] = cookie.trim().split("=");
                if (name) {
                  cookies.push({ name, value: rest.join("=") });
                }
              });
              
              return cookies;
            },
            setAll() {
              // Cookies are set via response headers in the route handler
              // This is a no-op here as we can't set cookies in the context
            },
          },
        }
      );
      
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      user = authUser;
    } catch (error) {
      // User not authenticated, user remains null
      user = null;
    }
  }

  return {
    db: supabaseAdmin,
    user,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;

/**
 * Initialize tRPC
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Protected procedure - requires authentication
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // TypeScript now knows user is not null
    },
  });
});

