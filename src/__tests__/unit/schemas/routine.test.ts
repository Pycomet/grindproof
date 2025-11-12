import { describe, it, expect } from "vitest";
import {
  routineSchema,
  createRoutineSchema,
  updateRoutineSchema,
} from "@/server/trpc/routers/routine";

describe("Routine Schemas", () => {
  describe("routineSchema", () => {
    it("should validate a complete routine object", () => {
      const validRoutine = {
        id: "123",
        name: "Morning Routine",
        description: "Daily morning routine",
        frequency: "daily" as const,
        daysOfWeek: [1, 3, 5],
        timeOfDay: "07:00",
        isActive: true,
        goalId: "goal-123",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = routineSchema.safeParse(validRoutine);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe("Morning Routine");
        expect(result.data.frequency).toBe("daily");
      }
    });

    it("should reject routine without required fields", () => {
      const invalidRoutine = {
        id: "123",
        // missing name
        frequency: "daily",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = routineSchema.safeParse(invalidRoutine);
      expect(result.success).toBe(false);
    });

    it("should reject invalid frequency", () => {
      const invalidRoutine = {
        id: "123",
        name: "Test Routine",
        frequency: "invalid-frequency",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = routineSchema.safeParse(invalidRoutine);
      expect(result.success).toBe(false);
    });

    it("should validate daysOfWeek array", () => {
      const validRoutine = {
        id: "123",
        name: "Test Routine",
        frequency: "weekly" as const,
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // all days
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = routineSchema.safeParse(validRoutine);
      expect(result.success).toBe(true);
    });

    it("should reject invalid day numbers", () => {
      const invalidRoutine = {
        id: "123",
        name: "Test Routine",
        frequency: "weekly" as const,
        daysOfWeek: [7], // invalid (should be 0-6)
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = routineSchema.safeParse(invalidRoutine);
      expect(result.success).toBe(false);
    });
  });

  describe("createRoutineSchema", () => {
    it("should validate routine creation input", () => {
      const validInput = {
        name: "New Routine",
        frequency: "daily" as const,
        isActive: true,
      };

      const result = createRoutineSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should require name", () => {
      const invalidInput = {
        frequency: "daily",
      };

      const result = createRoutineSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should reject empty name", () => {
      const invalidInput = {
        name: "",
      };

      const result = createRoutineSchema.safeParse(invalidInput);
      expect(result.success).toBe(false); // min length is 1
    });

    it("should allow optional fields", () => {
      const minimalInput = {
        name: "Routine Name",
      };

      const result = createRoutineSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
    });
  });

  describe("updateRoutineSchema", () => {
    it("should validate update input with id", () => {
      const validInput = {
        id: "123",
        name: "Updated Name",
      };

      const result = updateRoutineSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it("should require id", () => {
      const invalidInput = {
        name: "Updated Name",
        // missing id
      };

      const result = updateRoutineSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
    });

    it("should allow partial updates", () => {
      const validInput = {
        id: "123",
        isActive: false,
      };

      const result = updateRoutineSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });
});

