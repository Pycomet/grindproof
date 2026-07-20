/**
 * Tests for src/lib/tools/specs.ts — the shared tool registry.
 *
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
  coreToolDefs,
  goalWriteToolDefs,
  checkInToolDefs,
  allToolDefs,
} from "@/lib/tools/specs";

describe("tool registry", () => {
  it("composes the full MCP surface from core + goal-write + check-in", () => {
    expect(coreToolDefs()).toHaveLength(10);
    expect(goalWriteToolDefs()).toHaveLength(3);
    expect(checkInToolDefs()).toHaveLength(3);
    expect(allToolDefs()).toHaveLength(16);
  });

  it("gives every def a unique name and an object input schema", () => {
    const defs = allToolDefs();
    const names = defs.map((d) => d.name);
    expect(new Set(names).size).toBe(names.length);
    for (const d of defs) {
      // A ZodObject exposes `.shape` — required by the MCP adapter.
      expect(d.inputSchema.shape).toBeDefined();
      expect(typeof d.description).toBe("string");
    }
  });

  it("marks read-only tools with readOnlyHint", () => {
    const byName = Object.fromEntries(allToolDefs().map((d) => [d.name, d]));
    for (const name of [
      "list_tasks",
      "list_goals",
      "get_accountability_score",
      "get_reflection_history",
      "get_task_history",
    ]) {
      expect(byName[name].annotations?.readOnlyHint).toBe(true);
    }
  });

  it("marks destructive tools with destructiveHint", () => {
    const byName = Object.fromEntries(allToolDefs().map((d) => [d.name, d]));
    for (const name of ["delete_task", "delete_goal", "record_evening_checkin"]) {
      expect(byName[name].annotations?.destructiveHint).toBe(true);
    }
    // Read-only tools must not be flagged destructive.
    expect(byName["list_tasks"].annotations?.destructiveHint).toBeUndefined();
  });
});
