import { vi } from "vitest";
import { appRouter } from "@/server/trpc/routers/_app";
import { createContext } from "@/server/trpc/context";
import type { Context } from "@/server/trpc/context";

/**
 * Create a test caller for tRPC routers
 * This allows you to call tRPC procedures directly in tests
 */
export const createTestCaller = (context?: Partial<Context>) => {
  const testContext = {
    ...createContext(),
    ...context,
  } as Context;
  
  // Create caller directly from router
  return appRouter.createCaller(testContext);
};

/**
 * Mock Supabase client for testing
 */
export function createMockSupabaseClient() {
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
      order: vi.fn().mockReturnThis(),
    })),
  };
}

