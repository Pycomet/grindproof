import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolContext, ToolDef } from "./specs";

/**
 * Register transport-neutral tool defs on an MCP server. Unlike the coach
 * adapter, the identity is not known at registration time — tools are declared
 * once (name/schema/annotations) and the per-call `resolveContext` derives the
 * user id from the request's auth info and builds a scoped client for that one
 * call. See src/app/api/mcp/[transport]/route.ts.
 */
export function registerMcpTools(
  server: McpServer,
  defs: ToolDef[],
  resolveContext: (extra: unknown) => Promise<ToolContext>
): void {
  for (const d of defs) {
    server.registerTool(
      d.name,
      {
        description: d.description,
        // MCP expects a raw Zod shape, not a wrapped z.object().
        inputSchema: d.inputSchema.shape,
        annotations: d.annotations,
      },
      async (args, extra) => {
        try {
          const ctx = await resolveContext(extra);
          const result = await d.execute(ctx, args as never);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(result) }],
          };
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return {
            content: [
              { type: "text" as const, text: JSON.stringify({ success: false, error: message }) },
            ],
            isError: true,
          };
        }
      }
    );
  }
}
