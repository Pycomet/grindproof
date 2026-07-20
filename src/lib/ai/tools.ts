import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { coreToolDefs } from "@/lib/tools/specs";
import { toAiSdkTools } from "@/lib/tools/to-ai-sdk";

/**
 * The in-app coach's tool set.
 *
 * Thin wrapper over the shared, transport-neutral registry in
 * src/lib/tools/specs.ts — the single source of truth for agent tools. The
 * coach keeps its original surface (task CRUD, goal read, accountability, coach
 * memory, history); the fuller goal-write and check-in tools are exposed only
 * over MCP (see src/app/api/mcp). Output sanitization lives in the shared defs,
 * so it applies to both surfaces.
 */
export function createGrindproofTools(
  userId: string,
  supabase: SupabaseClient<Database>
) {
  return toAiSdkTools(coreToolDefs(), { userId, supabase });
}
