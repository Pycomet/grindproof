# Example: Creating Schemas and Types for AI Goal & Routine Assistant

This file shows examples of how to create Zod schemas and TypeScript types when you're ready to implement them.

## Zod Schemas (for tRPC validation)

Zod schemas are already set up in the router files (`src/server/trpc/routers/goal.ts` and `routine.ts`). Here's the pattern:

```typescript
import { z } from "zod";

// Base schema with all fields
export const goalSchema = z.object({
  id: z.string(),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  targetDate: z.date().optional(),
  status: z.enum(["active", "completed", "paused"]).default("active"),
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Schema for creating (omit auto-generated fields)
export const createGoalSchema = goalSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Schema for updating (make fields optional, but require id)
export const updateGoalSchema = createGoalSchema.partial().extend({
  id: z.string(),
});
```

## TypeScript Types (optional, for type inference)

If you want to create TypeScript types from your Zod schemas, you can do:

```typescript
import { z } from "zod";
import { goalSchema } from "@/server/trpc/routers/goal";

// Infer TypeScript type from Zod schema
export type Goal = z.infer<typeof goalSchema>;

// Or create custom types
export type GoalStatus = "active" | "completed" | "paused";

export interface Goal {
  id: string;
  title: string;
  description?: string;
  targetDate?: Date;
  status: GoalStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

## Usage in Components

```typescript
import { trpc } from "@/lib/trpc/client";
import type { Goal } from "@/lib/types"; // if you create types

// The tRPC hooks already provide full type safety
const { data: goals } = trpc.goal.getAll.useQuery();
// goals is automatically typed based on your Zod schema return type
```

## Notes

- Zod schemas in router files are required for tRPC validation
- TypeScript types are optional but helpful for:
  - Shared types across frontend/backend
  - Type inference in components
  - Better IDE autocomplete
- You can infer types from Zod schemas using `z.infer<typeof schema>`

