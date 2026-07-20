import { describe, it, expect } from "vitest";
import { createTaskSchema, updateTaskSchema } from "@/server/trpc/routers/task";
import { createGoalSchema } from "@/server/trpc/routers/goal";

const long = (n: number) => "a".repeat(n);

describe("task schema length caps", () => {
  it("rejects title over 200 chars", () => {
    expect(createTaskSchema.safeParse({ title: long(201) }).success).toBe(false);
  });
  it("accepts a normal title", () => {
    expect(createTaskSchema.safeParse({ title: "Ship it" }).success).toBe(true);
  });
  it("rejects reflection over 1000 chars", () => {
    expect(updateTaskSchema.safeParse({ id: "x", reflection: long(1001) }).success).toBe(false);
  });
});

describe("goal schema length caps", () => {
  it("rejects title over 200 chars", () => {
    expect(createGoalSchema.safeParse({ title: long(201) }).success).toBe(false);
  });
});
