import { describe, it, expect } from "vitest";
import {
  goalSchema,
  createGoalSchema,
  updateGoalSchema,
} from "@/server/trpc/routers/goal";

describe("Goal Schemas", () => {
  describe("goalSchema", () => {
    it("should validate a complete goal object", () => {
      const validGoal = {
        id: "123",
        title: "Test Goal",
        description: "Test description",
        targetDate: new Date("2024-12-31"),
        status: "active" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = goalSchema.safeParse(validGoal);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Test Goal");
        expect(result.data.status).toBe("active");
      }
    });

    it("should reject goal without required fields", () => {
      const invalidGoal = {
        id: "123",
        // missing title
        status: "active",
      };

      const result = goalSchema.safeParse(invalidGoal);
      expect(result.success).toBe(false);
    });

    it("should reject invalid status", () => {
      const invalidGoal = {
        id: "123",
        title: "Test Goal",
        status: "invalid-status",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = goalSchema.safeParse(invalidGoal);
      expect(result.success).toBe(false);
    });

    it("should accept optional fields", () => {
      const minimalGoal = {
        id: "123",
        title: "Test Goal",
        status: "active" as const,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = goalSchema.safeParse(minimalGoal);
      expect(result.success).toBe(true);
    });
  });

  describe("createGoalSchema", () => {
    it("should validate goal creation input", () => {
      const validInput = {
        title: "New Goal",
        description: "Description",
        status: "active" as const,
      };

      const result = createGoalSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should ignore id, createdAt, or updatedAt if provided", () => {
      const inputWithExtraFields = {
        id: "123", // will be ignored
        title: "New Goal",
        createdAt: new Date(), // will be ignored
      };

      const result = createGoalSchema.safeParse(inputWithExtraFields);
      expect(result.success).toBe(true);
      if (result.success) {
        // These fields should not be in the output
        expect(result.data).not.toHaveProperty("id");
        expect(result.data).not.toHaveProperty("createdAt");
        expect(result.data).not.toHaveProperty("updatedAt");
        expect(result.data.title).toBe("New Goal");
      }
    });

    it("should require title", () => {
      const invalidInput = {
        description: "No title",
      };

      const result = createGoalSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should accept empty title", () => {
      const invalidInput = {
        title: "",
      };

      const result = createGoalSchema.safeParse(invalidInput);
      expect(result.success).toBe(false); // min length is 1
    });
  });

  describe("updateGoalSchema", () => {
    it("should validate update input with id", () => {
      const validInput = {
        id: "123",
        title: "Updated Title",
      };

      const result = updateGoalSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should require id", () => {
      const invalidInput = {
        title: "Updated Title",
        // missing id
      };

      const result = updateGoalSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should allow partial updates", () => {
      const validInput = {
        id: "123",
        // only updating status
        status: "completed" as const,
      };

      const result = updateGoalSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should allow empty update (only id)", () => {
      const validInput = {
        id: "123",
      };

      const result = updateGoalSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });
});

