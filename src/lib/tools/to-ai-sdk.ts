import { tool, type Tool } from "ai";
import type { ToolContext, ToolDef } from "./specs";

/**
 * Adapt transport-neutral tool defs into the AI SDK `tool()` shape used by the
 * coach chat route. The context (user id + scoped client) is bound up front
 * because the coach authenticates once per request via cookies.
 */
export function toAiSdkTools(
  defs: ToolDef[],
  ctx: ToolContext
): Record<string, Tool> {
  const tools: Record<string, Tool> = {};
  for (const d of defs) {
    tools[d.name] = tool({
      description: d.description,
      inputSchema: d.inputSchema,
      execute: (input: unknown) => d.execute(ctx, input as never),
    });
  }
  return tools;
}
