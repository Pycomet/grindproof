# GrindProof MVP v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild GrindProof from an over-engineered prototype into a focused, community-ready MVP with reliable notifications, AI-powered accountability, and a clean single-page dashboard.

**Architecture:** Branch off `main` into `mvp-v2`. Surgically gut non-essential features (integrations, evidence, routines, offline sync, feedback). Rebuild the dashboard as a single scrollable page with floating AI chat. Replace GitHub Actions notifications with Vercel Cron + Resend email + optional web push. Replace raw Gemini SDK with Vercel AI SDK.

**Tech Stack:** Next.js 16, React 19, Tailwind CSS, Radix UI, tRPC, Supabase (Postgres + Auth), Vercel AI SDK + Google Gemini, Resend, Vercel Cron Jobs

**Spec:** `docs/superpowers/specs/2026-04-03-grindproof-mvp-v2-design.md`

---

### Task 1: Create Branch and Install Dependencies

**Files:**
- Modify: `package.json`
- Modify: `next.config.ts`

- [ ] **Step 1: Create the mvp-v2 branch**

```bash
git checkout -b mvp-v2
```

- [ ] **Step 2: Install new dependencies**

```bash
npm install ai @ai-sdk/google resend
```

- [ ] **Step 3: Uninstall removed dependencies**

```bash
npm uninstall next-pwa @google/generative-ai web-push
```

- [ ] **Step 4: Remove @types/web-push from devDependencies**

```bash
npm uninstall @types/web-push
```

- [ ] **Step 5: Simplify next.config.ts**

Replace the entire file with:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default nextConfig;
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json next.config.ts
git commit -m "chore: create mvp-v2 branch, swap deps (ai-sdk, resend, drop next-pwa/gemini/web-push)"
```

---

### Task 2: Mass Delete Non-Essential Files

**Files to delete:**

Components:
- `src/components/EvidenceCard.tsx`
- `src/components/FileUpload.tsx`
- `src/components/ProfilePictureUpload.tsx`
- `src/components/FeedbackPopup.tsx`
- `src/components/InstallPWA.tsx`
- `src/components/UpdateNotification.tsx`
- `src/components/MobileSwipeView.tsx`
- `src/components/SearchInput.tsx`
- `src/components/TaskDialogs.tsx`
- `src/components/ChatWidget.tsx`
- `src/components/ChatInterface.tsx`
- `src/components/MorningCheckDialog.tsx`
- `src/components/EveningCheckDialog.tsx`
- `src/components/LoadingSkeletons.tsx`

tRPC routers:
- `src/server/trpc/routers/evidence.ts`
- `src/server/trpc/routers/pattern.ts`
- `src/server/trpc/routers/routine.ts`
- `src/server/trpc/routers/accountabilityScore.ts`
- `src/server/trpc/routers/upload.ts`
- `src/server/trpc/routers/feedback.ts`
- `src/server/trpc/routers/integration.ts`

Lib modules:
- `src/lib/ai/data-analyzer.ts`
- `src/lib/ai/function-tools.ts`
- `src/lib/prompts/pattern-detection-prompt.ts`
- `src/lib/offline/` (entire directory)
- `src/lib/storage/` (entire directory)
- `src/lib/feedback/` (entire directory)
- `src/lib/markdown.tsx`

Contexts:
- `src/contexts/FeedbackContext.tsx`
- `src/contexts/AppContext.tsx`

Hooks:
- `src/hooks/useOfflineSync.tsx`
- `src/hooks/useNotifications.tsx`

API routes:
- `src/app/api/integrations/` (entire directory)
- `src/app/api/ai/validate-evidence/` (entire directory)
- `src/app/api/ai/analyze-patterns/` (entire directory)
- `src/app/api/ai/generate-roast/` (entire directory)
- `src/app/api/ai/chat/route.ts` (will be rewritten)
- `src/app/api/notifications/` (entire directory)

GitHub Actions:
- `.github/workflows/morning-notifications.yml`
- `.github/workflows/evening-notifications.yml`
- `.github/workflows/hourly-task-review.yml`

Tests:
- `src/__tests__/` (entire directory -- tests will be rewritten for new components)

Other:
- `src/app/test/` (if exists)
- `scripts/merge-sw.js`
- `next-pwa.d.ts`

- [ ] **Step 1: Delete all listed files and directories**

```bash
# Components
rm -f src/components/EvidenceCard.tsx src/components/FileUpload.tsx src/components/ProfilePictureUpload.tsx src/components/FeedbackPopup.tsx src/components/InstallPWA.tsx src/components/UpdateNotification.tsx src/components/MobileSwipeView.tsx src/components/SearchInput.tsx src/components/TaskDialogs.tsx src/components/ChatWidget.tsx src/components/ChatInterface.tsx src/components/MorningCheckDialog.tsx src/components/EveningCheckDialog.tsx src/components/LoadingSkeletons.tsx

# tRPC routers
rm -f src/server/trpc/routers/evidence.ts src/server/trpc/routers/pattern.ts src/server/trpc/routers/routine.ts src/server/trpc/routers/accountabilityScore.ts src/server/trpc/routers/upload.ts src/server/trpc/routers/feedback.ts src/server/trpc/routers/integration.ts

# Lib modules
rm -f src/lib/ai/data-analyzer.ts src/lib/ai/function-tools.ts src/lib/prompts/pattern-detection-prompt.ts src/lib/markdown.tsx
rm -rf src/lib/offline src/lib/storage src/lib/feedback

# Contexts and hooks
rm -f src/contexts/FeedbackContext.tsx src/contexts/AppContext.tsx
rm -f src/hooks/useOfflineSync.tsx src/hooks/useNotifications.tsx

# API routes
rm -rf src/app/api/integrations src/app/api/ai/validate-evidence src/app/api/ai/analyze-patterns src/app/api/ai/generate-roast src/app/api/notifications
rm -f src/app/api/ai/chat/route.ts

# GitHub Actions
rm -f .github/workflows/morning-notifications.yml .github/workflows/evening-notifications.yml .github/workflows/hourly-task-review.yml

# Tests and misc
rm -rf src/__tests__ src/app/test
rm -f scripts/merge-sw.js next-pwa.d.ts
```

- [ ] **Step 2: Commit the mass delete**

```bash
git add -A
git commit -m "chore: gut non-essential features (integrations, evidence, offline, feedback, routines, patterns)"
```

---

### Task 3: Simplify Environment and Config

**Files:**
- Modify: `src/lib/env.ts`
- Modify: `src/lib/config.ts`

- [ ] **Step 1: Rewrite env.ts**

Replace the entire file with:

```ts
import { z } from "zod";

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

const serverEnvSchema = clientEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_GOOGLE_GEMINI_API_KEY: z.string().min(1),
  CRON_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  VAPID_PUBLIC_KEY: z.string().min(1),
  VAPID_PRIVATE_KEY: z.string().min(1),
  VAPID_EMAIL: z.string().min(1),
  AI_MODEL: z.string().optional().default("gemini-2.5-flash"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

function getEnv(): z.infer<typeof serverEnvSchema> {
  const isServer = typeof window === "undefined";
  const isTest = process.env.NODE_ENV === "test";

  if (isTest && !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return {
      NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
      NEXT_GOOGLE_GEMINI_API_KEY: "test-gemini-key",
      CRON_SECRET: "test-cron-secret",
      RESEND_API_KEY: "test-resend-key",
      VAPID_PUBLIC_KEY: "test-vapid-public-key",
      VAPID_PRIVATE_KEY: "test-vapid-private-key",
      VAPID_EMAIL: "mailto:test@test.com",
      AI_MODEL: "gemini-2.5-flash",
      NODE_ENV: "test" as const,
      NEXT_PUBLIC_APP_URL: undefined,
    };
  }

  const schema = isServer ? serverEnvSchema : clientEnvSchema;

  const parsed = schema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NODE_ENV: process.env.NODE_ENV || "development",
    NEXT_GOOGLE_GEMINI_API_KEY: process.env.NEXT_GOOGLE_GEMINI_API_KEY,
    CRON_SECRET: process.env.CRON_SECRET,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY,
    VAPID_EMAIL: process.env.VAPID_EMAIL,
    AI_MODEL: process.env.AI_MODEL,
    NEXT_PUBLIC_APP_URL:
      process.env.NEXT_PUBLIC_APP_URL ||
      (process.env.NEXT_PUBLIC_VERCEL_URL
        ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
        : undefined),
  });

  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    const missing = Object.entries(fieldErrors)
      .filter(([, errors]) => errors && errors.length > 0)
      .map(([key]) => key);
    console.error("Missing environment variables:", missing.join(", "));
    throw new Error("Invalid environment variables - check console for details");
  }

  return parsed.data as z.infer<typeof serverEnvSchema>;
}

export const env = getEnv();
```

- [ ] **Step 2: Rewrite config.ts**

Replace the entire file with:

```ts
import { env } from "./env";

export const AI_CONFIG = {
  MODEL: env.AI_MODEL,
} as const;

export const APP_CONFIG = {
  BASE_URL:
    env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : null) ||
    (process.env.NODE_ENV === "production"
      ? "https://grindproof.co"
      : "http://localhost:3000"),
} as const;

export const NOTIFICATION_CONFIG = {
  VAPID: {
    PUBLIC_KEY: env.VAPID_PUBLIC_KEY,
    PRIVATE_KEY: env.VAPID_PRIVATE_KEY,
    EMAIL: env.VAPID_EMAIL,
  },
  DEFAULT_TIMES: {
    MORNING: "09:00",
    EVENING: "18:00",
  },
} as const;
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/env.ts src/lib/config.ts
git commit -m "refactor: simplify env and config (remove storage, validation, GitHub/GCal vars)"
```

---

### Task 4: Update tRPC App Router and Simplify Surviving Routers

**Files:**
- Modify: `src/server/trpc/routers/_app.ts`
- Modify: `src/server/trpc/routers/task.ts`
- Modify: `src/server/trpc/routers/goal.ts`
- Modify: `src/server/trpc/routers/profile.ts`
- Modify: `src/server/trpc/routers/notification.ts`
- Modify: `src/server/trpc/routers/dailyCheck.ts`

- [ ] **Step 1: Update _app.ts to only include surviving routers**

Replace the entire file with:

```ts
import { router } from "../context";
import { goalRouter } from "./goal";
import { profileRouter } from "./profile";
import { taskRouter } from "./task";
import { conversationRouter } from "./conversation";
import { notificationRouter } from "./notification";
import { dailyCheckRouter } from "./dailyCheck";

export const appRouter = router({
  goal: goalRouter,
  profile: profileRouter,
  task: taskRouter,
  conversation: conversationRouter,
  notification: notificationRouter,
  dailyCheck: dailyCheckRouter,
});

export type AppRouter = typeof appRouter;
```

- [ ] **Step 2: Simplify task.ts -- remove Google Calendar helpers and simplify schemas**

Replace the entire file with:

```ts
import { z } from "zod";
import { router, protectedProcedure } from "../context";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  goalId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  recurrencePattern: z.any().optional(),
});

export const updateTaskSchema = z.object({
  id: z.string().min(1, "ID is required"),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  dueDate: z.date().optional().nullable(),
  startTime: z.date().optional().nullable(),
  endTime: z.date().optional().nullable(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  goalId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["pending", "completed", "skipped"]).optional(),
  reflection: z.string().optional().nullable(),
  recurrencePattern: z.any().optional().nullable(),
});

function mapTaskFromDb(task: any) {
  return {
    id: task.id,
    userId: task.user_id,
    goalId: task.goal_id || null,
    title: task.title,
    description: task.description || null,
    dueDate: task.due_date ? new Date(task.due_date) : null,
    startTime: task.start_time ? new Date(task.start_time) : null,
    endTime: task.end_time ? new Date(task.end_time) : null,
    priority: (task.priority as "high" | "medium" | "low") || "medium",
    status: task.status as "pending" | "completed" | "skipped",
    tags: task.tags || null,
    reflection: task.reflection || null,
    recurrencePattern: task.recurrence_pattern || null,
    createdAt: new Date(task.created_at),
    updatedAt: new Date(task.updated_at),
  };
}

export const taskRouter = router({
  getAll: protectedProcedure
    .input(
      z
        .object({
          status: z.enum(["pending", "completed", "skipped"]).optional(),
          goalId: z.string().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.db
        .from("tasks")
        .select("*")
        .eq("user_id", ctx.user.id)
        .order("due_date", { ascending: true, nullsFirst: false });

      if (input?.status) query = query.eq("status", input.status);
      if (input?.goalId) query = query.eq("goal_id", input.goalId);
      if (input?.startDate)
        query = query.gte("due_date", input.startDate.toISOString());
      if (input?.endDate)
        query = query.lte("due_date", input.endDate.toISOString());

      const { data, error } = await query;
      if (error) throw new Error(`Failed to fetch tasks: ${error.message}`);
      return (data || []).map(mapTaskFromDb);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("tasks")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      if (error) throw new Error(`Failed to fetch task: ${error.message}`);
      if (!data) return null;
      return mapTaskFromDb(data);
    }),

  create: protectedProcedure
    .input(createTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("tasks")
        .insert({
          user_id: ctx.user.id,
          title: input.title,
          description: input.description || null,
          due_date: input.dueDate ? input.dueDate.toISOString() : null,
          start_time: input.startTime ? input.startTime.toISOString() : null,
          end_time: input.endTime ? input.endTime.toISOString() : null,
          priority: input.priority || "medium",
          goal_id: input.goalId || null,
          tags: input.tags || null,
          recurrence_pattern: input.recurrencePattern || null,
          status: "pending",
        })
        .select()
        .maybeSingle();

      if (error) throw new Error(`Failed to create task: ${error.message}`);
      if (!data) throw new Error("Failed to create task: No data returned");
      return mapTaskFromDb(data);
    }),

  update: protectedProcedure
    .input(updateTaskSchema)
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {};

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined)
        updateData.description = input.description || null;
      if (input.dueDate !== undefined)
        updateData.due_date = input.dueDate
          ? input.dueDate.toISOString()
          : null;
      if (input.startTime !== undefined)
        updateData.start_time = input.startTime
          ? input.startTime.toISOString()
          : null;
      if (input.endTime !== undefined)
        updateData.end_time = input.endTime
          ? input.endTime.toISOString()
          : null;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.goalId !== undefined)
        updateData.goal_id = input.goalId || null;
      if (input.tags !== undefined) updateData.tags = input.tags || null;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.reflection !== undefined)
        updateData.reflection = input.reflection || null;
      if (input.recurrencePattern !== undefined)
        updateData.recurrence_pattern = input.recurrencePattern || null;

      const { data, error } = await ctx.db
        .from("tasks")
        .update(updateData)
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error) throw new Error(`Failed to update task: ${error.message}`);
      if (!data) throw new Error("Task not found or access denied");
      return mapTaskFromDb(data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from("tasks")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);

      if (error) throw new Error(`Failed to delete task: ${error.message}`);
      return { success: true, id: input.id };
    }),

  complete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("tasks")
        .update({ status: "completed" })
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error) throw new Error(`Failed to complete task: ${error.message}`);
      if (!data) throw new Error("Task not found or access denied");
      return mapTaskFromDb(data);
    }),

  skip: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        reflection: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("tasks")
        .update({
          status: "skipped",
          reflection: input.reflection || null,
        })
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error) throw new Error(`Failed to skip task: ${error.message}`);
      if (!data) throw new Error("Task not found or access denied");
      return mapTaskFromDb(data);
    }),

  reschedule: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        newDueDate: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("tasks")
        .update({
          due_date: input.newDueDate.toISOString(),
          status: "pending",
        })
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error)
        throw new Error(`Failed to reschedule task: ${error.message}`);
      if (!data) throw new Error("Task not found or access denied");
      return mapTaskFromDb(data);
    }),
});
```

- [ ] **Step 3: Simplify goal.ts -- remove githubRepos, targetDate, timeHorizon, paused status**

Replace the entire file with:

```ts
import { z } from "zod";
import { router, protectedProcedure } from "../context";

export const createGoalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  status: z.enum(["active", "completed"]).default("active"),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
});

export const updateGoalSchema = z.object({
  id: z.string(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["active", "completed"]).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
});

function mapGoalFromDb(goal: any) {
  return {
    id: goal.id,
    userId: goal.user_id,
    title: goal.title,
    description: goal.description || null,
    status: goal.status as "active" | "completed",
    priority: goal.priority as "high" | "medium" | "low",
    createdAt: new Date(goal.created_at),
    updatedAt: new Date(goal.updated_at),
  };
}

export const goalRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("goals")
      .select("*")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`Failed to fetch goals: ${error.message}`);
    return (data || []).map(mapGoalFromDb);
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("goals")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      if (error) throw new Error(`Failed to fetch goal: ${error.message}`);
      if (!data) return null;
      return mapGoalFromDb(data);
    }),

  create: protectedProcedure
    .input(createGoalSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("goals")
        .insert({
          user_id: ctx.user.id,
          title: input.title,
          description: input.description || null,
          status: input.status || "active",
          priority: input.priority || "medium",
        })
        .select()
        .maybeSingle();

      if (error) throw new Error(`Failed to create goal: ${error.message}`);
      if (!data) throw new Error("Failed to create goal: No data returned");
      return mapGoalFromDb(data);
    }),

  update: protectedProcedure
    .input(updateGoalSchema)
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined)
        updateData.description = input.description || null;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.priority !== undefined) updateData.priority = input.priority;

      const { data, error } = await ctx.db
        .from("goals")
        .update(updateData)
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error) throw new Error(`Failed to update goal: ${error.message}`);
      if (!data) throw new Error("Goal not found or access denied");
      return mapGoalFromDb(data);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from("goals")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);

      if (error) throw new Error(`Failed to delete goal: ${error.message}`);
      return { success: true, id: input.id };
    }),
});
```

- [ ] **Step 4: Simplify profile.ts -- remove profilePicUrl, add email field**

Replace the entire file with:

```ts
import { z } from "zod";
import { router, protectedProcedure } from "../context";

export const updateProfileSchema = z.object({
  name: z.string().optional(),
});

export const profileRouter = router({
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("profiles")
      .select("*")
      .eq("id", ctx.user.id)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch profile: ${error.message}`);

    const email = ctx.user.email || "";

    if (!data) {
      return {
        id: ctx.user.id,
        name:
          ctx.user.user_metadata?.name ||
          ctx.user.user_metadata?.full_name ||
          null,
        email,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return {
      id: data.id,
      name: data.name || null,
      email: data.email || email,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  }),

  update: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const { data: existing } = await ctx.db
        .from("profiles")
        .select("*")
        .eq("id", ctx.user.id)
        .maybeSingle();

      const email = ctx.user.email || "";

      if (!existing) {
        const initialName =
          input.name ||
          ctx.user.user_metadata?.name ||
          ctx.user.user_metadata?.full_name ||
          null;

        const { data, error } = await ctx.db
          .from("profiles")
          .insert({ id: ctx.user.id, name: initialName, email })
          .select()
          .maybeSingle();

        if (error) throw new Error(`Failed to create profile: ${error.message}`);
        if (!data) throw new Error("Failed to create profile");

        return {
          id: data.id,
          name: data.name || null,
          email: data.email || email,
          createdAt: new Date(data.created_at),
          updatedAt: new Date(data.updated_at),
        };
      }

      const updateData: Record<string, unknown> = {};
      if (input.name !== undefined) updateData.name = input.name || null;

      const { data, error } = await ctx.db
        .from("profiles")
        .update(updateData)
        .eq("id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error) throw new Error(`Failed to update profile: ${error.message}`);
      if (!data) throw new Error("Failed to update profile");

      return {
        id: data.id,
        name: data.name || null,
        email: data.email || email,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    }),
});
```

- [ ] **Step 5: Simplify notification.ts -- remove hourly review, keep push subscription + settings**

Replace the entire file with:

```ts
import { z } from "zod";
import { router, protectedProcedure } from "../context";
import { NOTIFICATION_CONFIG } from "@/lib/config";

export const notificationRouter = router({
  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        p256dhKey: z.string(),
        authKey: z.string(),
        deviceName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("push_subscriptions")
        .upsert(
          {
            user_id: ctx.user.id,
            endpoint: input.endpoint,
            p256dh_key: input.p256dhKey,
            auth_key: input.authKey,
            device_name: input.deviceName || null,
            is_active: true,
          },
          { onConflict: "user_id,endpoint" }
        )
        .select()
        .single();

      if (error)
        throw new Error(`Failed to save subscription: ${error.message}`);
      return { success: true, subscription: data };
    }),

  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from("push_subscriptions")
        .delete()
        .eq("user_id", ctx.user.id)
        .eq("endpoint", input.endpoint);

      if (error)
        throw new Error(`Failed to remove subscription: ${error.message}`);
      return { success: true };
    }),

  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("notification_settings")
      .select("*")
      .eq("user_id", ctx.user.id)
      .maybeSingle();

    if (error)
      throw new Error(`Failed to fetch settings: ${error.message}`);

    if (!data) {
      return {
        morningCheckEnabled: true,
        morningCheckTime: NOTIFICATION_CONFIG.DEFAULT_TIMES.MORNING,
        eveningCheckEnabled: true,
        eveningCheckTime: NOTIFICATION_CONFIG.DEFAULT_TIMES.EVENING,
        emailNotificationsEnabled: true,
        pushNotificationsEnabled: true,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }

    return {
      morningCheckEnabled: data.morning_check_enabled,
      morningCheckTime: data.morning_check_time,
      eveningCheckEnabled: data.evening_check_enabled,
      eveningCheckTime: data.evening_check_time,
      emailNotificationsEnabled: data.email_notifications_enabled,
      pushNotificationsEnabled: data.push_notifications_enabled,
      timezone: data.timezone,
    };
  }),

  updateSettings: protectedProcedure
    .input(
      z.object({
        morningCheckEnabled: z.boolean().optional(),
        morningCheckTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional(),
        eveningCheckEnabled: z.boolean().optional(),
        eveningCheckTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional(),
        emailNotificationsEnabled: z.boolean().optional(),
        pushNotificationsEnabled: z.boolean().optional(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {
        user_id: ctx.user.id,
      };

      if (input.morningCheckEnabled !== undefined)
        updateData.morning_check_enabled = input.morningCheckEnabled;
      if (input.morningCheckTime !== undefined)
        updateData.morning_check_time = input.morningCheckTime;
      if (input.eveningCheckEnabled !== undefined)
        updateData.evening_check_enabled = input.eveningCheckEnabled;
      if (input.eveningCheckTime !== undefined)
        updateData.evening_check_time = input.eveningCheckTime;
      if (input.emailNotificationsEnabled !== undefined)
        updateData.email_notifications_enabled =
          input.emailNotificationsEnabled;
      if (input.pushNotificationsEnabled !== undefined)
        updateData.push_notifications_enabled =
          input.pushNotificationsEnabled;
      if (input.timezone !== undefined)
        updateData.timezone = input.timezone;

      const { data, error } = await ctx.db
        .from("notification_settings")
        .upsert(updateData, { onConflict: "user_id" })
        .select()
        .single();

      if (error)
        throw new Error(`Failed to update settings: ${error.message}`);

      return {
        morningCheckEnabled: data.morning_check_enabled,
        morningCheckTime: data.morning_check_time,
        eveningCheckEnabled: data.evening_check_enabled,
        eveningCheckTime: data.evening_check_time,
        emailNotificationsEnabled: data.email_notifications_enabled,
        pushNotificationsEnabled: data.push_notifications_enabled,
        timezone: data.timezone,
      };
    }),

  getSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", ctx.user.id)
      .eq("is_active", true);

    if (error)
      throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    return (data || []).map((sub: any) => ({
      endpoint: sub.endpoint,
      deviceName: sub.device_name,
      createdAt: new Date(sub.created_at),
    }));
  }),

  getPublicKey: protectedProcedure.query(() => {
    return { publicKey: NOTIFICATION_CONFIG.VAPID.PUBLIC_KEY };
  }),
});
```

- [ ] **Step 6: Simplify dailyCheck.ts -- remove AI dependency, keep schedule queries**

Replace the entire file with:

```ts
import { z } from "zod";
import { router, protectedProcedure } from "../context";

export const dailyCheckRouter = router({
  getMorningSchedule: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get yesterday's incomplete tasks
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const { data: yesterdayTasks } = await ctx.db
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .gte("due_date", yesterday.toISOString())
      .lt("due_date", today.toISOString())
      .eq("status", "pending");

    // Get today's existing tasks
    const { data: todayTasks } = await ctx.db
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .gte("due_date", today.toISOString())
      .lt("due_date", tomorrow.toISOString())
      .order("start_time", { ascending: true });

    return {
      yesterdayIncomplete: yesterdayTasks || [],
      todayTasks: todayTasks || [],
    };
  }),

  getEveningSchedule: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: todayTasks } = await ctx.db
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .gte("due_date", today.toISOString())
      .lt("due_date", tomorrow.toISOString())
      .order("start_time", { ascending: true });

    return {
      todayTasks: todayTasks || [],
    };
  }),

  carryOverTasks: protectedProcedure
    .input(
      z.object({
        taskIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const today = new Date();
      today.setHours(12, 0, 0, 0); // Set to noon today

      const { error } = await ctx.db
        .from("tasks")
        .update({
          due_date: today.toISOString(),
          status: "pending",
        })
        .in("id", input.taskIds)
        .eq("user_id", ctx.user.id);

      if (error)
        throw new Error(`Failed to carry over tasks: ${error.message}`);
      return { success: true, count: input.taskIds.length };
    }),

  submitEveningReflections: protectedProcedure
    .input(
      z.object({
        reflections: z.array(
          z.object({
            taskId: z.string(),
            status: z.enum(["completed", "skipped"]),
            reflection: z.string().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      for (const item of input.reflections) {
        const updateData: Record<string, unknown> = {
          status: item.status,
        };
        if (item.reflection) {
          updateData.reflection = item.reflection;
        }
        await ctx.db
          .from("tasks")
          .update(updateData)
          .eq("id", item.taskId)
          .eq("user_id", ctx.user.id);
      }

      return { success: true, count: input.reflections.length };
    }),
});
```

- [ ] **Step 7: Verify the build compiles with no import errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: May have errors from deleted components referenced in dashboard/layout -- that's expected and will be fixed in later tasks.

- [ ] **Step 8: Commit**

```bash
git add src/server/trpc/
git commit -m "refactor: simplify tRPC routers (6 surviving, remove calendar/evidence/integration logic)"
```

---

### Task 5: Create New Contexts

**Files:**
- Create: `src/contexts/AuthContext.tsx`
- Create: `src/contexts/TaskContext.tsx`
- Create: `src/contexts/NotificationContext.tsx`

- [ ] **Step 1: Create AuthContext.tsx**

```tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
```

- [ ] **Step 2: Create TaskContext.tsx**

```tsx
"use client";

import {
  createContext,
  useContext,
  useCallback,
  type ReactNode,
} from "react";
import { trpc } from "@/lib/trpc/client";
import { useAuth } from "./AuthContext";

interface Task {
  id: string;
  userId: string;
  goalId: string | null;
  title: string;
  description: string | null;
  dueDate: Date | null;
  startTime: Date | null;
  endTime: Date | null;
  priority: "high" | "medium" | "low";
  status: "pending" | "completed" | "skipped";
  tags: string[] | null;
  reflection: string | null;
  recurrencePattern: any;
  createdAt: Date;
  updatedAt: Date;
}

interface Goal {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: "active" | "completed";
  priority: "high" | "medium" | "low";
  createdAt: Date;
  updatedAt: Date;
}

interface TaskContextType {
  tasks: Task[];
  goals: Goal[];
  isLoading: boolean;
  refreshTasks: () => Promise<void>;
  refreshGoals: () => Promise<void>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export function TaskProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const {
    data: tasks,
    isLoading: tasksLoading,
    refetch: refetchTasks,
  } = trpc.task.getAll.useQuery(undefined, {
    enabled: !!user,
  });

  const {
    data: goals,
    isLoading: goalsLoading,
    refetch: refetchGoals,
  } = trpc.goal.getAll.useQuery(undefined, {
    enabled: !!user,
  });

  const refreshTasks = useCallback(async () => {
    await refetchTasks();
  }, [refetchTasks]);

  const refreshGoals = useCallback(async () => {
    await refetchGoals();
  }, [refetchGoals]);

  return (
    <TaskContext.Provider
      value={{
        tasks: (tasks as Task[]) || [],
        goals: (goals as Goal[]) || [],
        isLoading: tasksLoading || goalsLoading,
        refreshTasks,
        refreshGoals,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
}

export function useTaskContext() {
  const context = useContext(TaskContext);
  if (!context)
    throw new Error("useTaskContext must be used within TaskProvider");
  return context;
}
```

- [ ] **Step 3: Create NotificationContext.tsx**

```tsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { trpc } from "@/lib/trpc/client";
import { useAuth } from "./AuthContext";

interface NotificationContextType {
  isSubscribed: boolean;
  isSupported: boolean;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown device";
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  const { data: vapidData } = trpc.notification.getPublicKey.useQuery(
    undefined,
    { enabled: !!user }
  );
  const subscribeMutation = trpc.notification.subscribe.useMutation();
  const unsubscribeMutation = trpc.notification.unsubscribe.useMutation();

  const subscribe = useCallback(async () => {
    if (!isSupported || !vapidData?.publicKey) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidData.publicKey,
    });

    const json = subscription.toJSON();
    await subscribeMutation.mutateAsync({
      endpoint: subscription.endpoint,
      p256dhKey: json.keys?.p256dh || "",
      authKey: json.keys?.auth || "",
      deviceName: `${getDeviceName()} - ${navigator.userAgent.split(" ").pop()?.split("/")[0] || "Browser"}`,
    });

    setIsSubscribed(true);
  }, [isSupported, vapidData, subscribeMutation]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await unsubscribeMutation.mutateAsync({
        endpoint: subscription.endpoint,
      });
      await subscription.unsubscribe();
    }

    setIsSubscribed(false);
  }, [isSupported, unsubscribeMutation]);

  return (
    <NotificationContext.Provider
      value={{ isSubscribed, isSupported, subscribe, unsubscribe }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context)
    throw new Error(
      "useNotificationContext must be used within NotificationProvider"
    );
  return context;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/contexts/
git commit -m "feat: create focused contexts (AuthContext, TaskContext, NotificationContext)"
```

---

### Task 6: Build Email Service (Resend)

**Files:**
- Create: `src/lib/notifications/email-service.ts`
- Modify: `src/lib/notifications/push-service.ts`

- [ ] **Step 1: Create email-service.ts**

```ts
import { Resend } from "resend";
import { env } from "@/lib/env";
import { APP_CONFIG } from "@/lib/config";

const resend = new Resend(env.RESEND_API_KEY);

const FROM_EMAIL = "GrindProof <notifications@grindproof.co>";

export async function sendMorningEmail(
  to: string,
  data: { name: string | null; carriedOverCount: number }
) {
  const greeting = data.name ? `Hey ${data.name}` : "Hey";
  const carryLine =
    data.carriedOverCount > 0
      ? `You have ${data.carriedOverCount} task${data.carriedOverCount > 1 ? "s" : ""} carried over from yesterday.`
      : "Clean slate today.";

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: "Time to plan your day",
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="margin: 0 0 16px;">${greeting},</h2>
        <p style="color: #52525b; margin: 0 0 24px;">${carryLine} What are you tackling today?</p>
        <a href="${APP_CONFIG.BASE_URL}/dashboard" style="display: inline-block; background: #18181b; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">Plan my day</a>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 32px;">GrindProof - Track what you plan. Prove what you did.</p>
      </div>
    `,
  });
}

export async function sendEveningEmail(
  to: string,
  data: { name: string | null; pendingCount: number }
) {
  const greeting = data.name ? `${data.name}` : "Hey";

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Reality check: ${data.pendingCount} task${data.pendingCount !== 1 ? "s" : ""} waiting`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="margin: 0 0 16px;">Evening, ${greeting}.</h2>
        <p style="color: #52525b; margin: 0 0 24px;">You have ${data.pendingCount} task${data.pendingCount !== 1 ? "s" : ""} still pending. How did today actually go?</p>
        <a href="${APP_CONFIG.BASE_URL}/dashboard" style="display: inline-block; background: #18181b; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">Submit reality check</a>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 32px;">GrindProof - The accountability app that calls out your BS.</p>
      </div>
    `,
  });
}

export async function sendWeeklyRoastEmail(
  to: string,
  data: {
    name: string | null;
    weekSummary: string;
    insights: Array<{ emoji: string; text: string; severity: string }>;
    recommendations: string[];
    completionRate: number;
    tasksCompleted: number;
    tasksTotal: number;
  }
) {
  const greeting = data.name ? `${data.name}` : "Hey";
  const insightsHtml = data.insights
    .map(
      (i) =>
        `<li style="margin: 8px 0; color: ${i.severity === "high" ? "#dc2626" : i.severity === "positive" ? "#16a34a" : "#ca8a04"};">${i.emoji} ${i.text}</li>`
    )
    .join("");
  const recsHtml = data.recommendations
    .map((r) => `<li style="margin: 8px 0; color: #52525b;">${r}</li>`)
    .join("");

  await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Weekly Roast: ${data.completionRate}% completion rate`,
    html: `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 16px;">
        <h2 style="margin: 0 0 8px;">Weekly Roast</h2>
        <p style="color: #a1a1aa; margin: 0 0 24px; font-size: 14px;">${greeting}, here's how your week went.</p>

        <div style="background: #f4f4f5; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 14px; color: #52525b;">${data.weekSummary}</p>
        </div>

        <div style="margin-bottom: 24px;">
          <div style="display: flex; gap: 16px; text-align: center;">
            <div style="flex: 1; background: #f4f4f5; border-radius: 8px; padding: 12px;">
              <div style="font-size: 24px; font-weight: 700;">${data.completionRate}%</div>
              <div style="font-size: 12px; color: #a1a1aa;">Completion</div>
            </div>
            <div style="flex: 1; background: #f4f4f5; border-radius: 8px; padding: 12px;">
              <div style="font-size: 24px; font-weight: 700;">${data.tasksCompleted}/${data.tasksTotal}</div>
              <div style="font-size: 12px; color: #a1a1aa;">Tasks Done</div>
            </div>
          </div>
        </div>

        <h3 style="margin: 0 0 8px; font-size: 16px;">Key Observations</h3>
        <ul style="list-style: none; padding: 0; margin: 0 0 24px;">${insightsHtml}</ul>

        <h3 style="margin: 0 0 8px; font-size: 16px;">Next Week</h3>
        <ul style="list-style: disc; padding-left: 20px; margin: 0 0 24px;">${recsHtml}</ul>

        <a href="${APP_CONFIG.BASE_URL}/dashboard" style="display: inline-block; background: #18181b; color: #fff; padding: 12px 24px; border-radius: 9999px; text-decoration: none; font-weight: 600;">Open Dashboard</a>
        <p style="color: #a1a1aa; font-size: 12px; margin-top: 32px;">GrindProof - Track what you plan. Prove what you did.</p>
      </div>
    `,
  });
}
```

- [ ] **Step 2: Update push-service.ts to remove web-push dependency and use fetch-based VAPID push**

Since we uninstalled `web-push`, we need to decide: either keep push as a stub for now (the cron will primarily send emails) or re-add a lightweight push approach. For the MVP, push is best-effort. Replace with a minimal stub that we can implement later:

```ts
export interface PushSubscription {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  tag?: string;
}

/**
 * Push notifications are best-effort in the MVP.
 * Email (Resend) is the primary notification channel.
 * This stub will be replaced with proper web-push when needed.
 */
export async function sendPushNotification(
  _subscription: PushSubscription,
  _payload: NotificationPayload
): Promise<void> {
  // TODO: Implement web-push sending when push becomes a priority
  // For MVP, email is the primary channel
  console.log("[push] Push notification skipped (not implemented in MVP)");
}

export async function sendToUser(
  subscriptions: PushSubscription[],
  payload: NotificationPayload
): Promise<{ successful: number; failed: number; expired: string[] }> {
  console.log(
    `[push] Would send to ${subscriptions.length} subscriptions:`,
    payload.title
  );
  return { successful: 0, failed: 0, expired: [] };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/notifications/
git commit -m "feat: add Resend email service, stub push notifications for MVP"
```

---

### Task 7: Build AI Chat Route with Vercel AI SDK

**Files:**
- Create: `src/app/api/ai/chat/route.ts`
- Create: `src/lib/ai/tools.ts`
- Modify: `src/lib/prompts/system-prompt.ts`

- [ ] **Step 1: Create AI tool definitions in src/lib/ai/tools.ts**

```ts
import { tool } from "ai";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export function createGrindproofTools(userId: string) {
  return {
    create_task: tool({
      description:
        "Create a new task for the user. Use when they mention wanting to do something, add a task, or plan an activity.",
      parameters: z.object({
        title: z.string().describe("Task title"),
        description: z.string().optional().describe("Task description"),
        dueDate: z
          .string()
          .optional()
          .describe("Due date in YYYY-MM-DD format"),
        priority: z
          .enum(["high", "medium", "low"])
          .default("medium")
          .describe("Task priority"),
        tags: z
          .array(z.string())
          .optional()
          .describe("Tags for categorization"),
      }),
      execute: async ({ title, description, dueDate, priority, tags }) => {
        const { data, error } = await supabaseAdmin
          .from("tasks")
          .insert({
            user_id: userId,
            title,
            description: description || null,
            due_date: dueDate
              ? new Date(dueDate).toISOString()
              : new Date().toISOString(),
            priority,
            tags: tags || null,
            status: "pending",
          })
          .select()
          .single();

        if (error) return { success: false, error: error.message };
        return { success: true, task: { id: data.id, title: data.title } };
      },
    }),

    update_task: tool({
      description:
        "Update an existing task. Search by keywords in the title to find the task, then apply updates.",
      parameters: z.object({
        searchQuery: z
          .string()
          .describe("Keywords to find the task by title"),
        updates: z.object({
          title: z.string().optional(),
          priority: z.enum(["high", "medium", "low"]).optional(),
          status: z.enum(["pending", "completed", "skipped"]).optional(),
          dueDate: z.string().optional().describe("YYYY-MM-DD format"),
        }),
      }),
      execute: async ({ searchQuery, updates }) => {
        const { data: tasks } = await supabaseAdmin
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .ilike("title", `%${searchQuery}%`)
          .limit(1);

        if (!tasks || tasks.length === 0)
          return { success: false, error: `No task found matching "${searchQuery}"` };

        const task = tasks[0];
        const updateData: Record<string, unknown> = {};
        if (updates.title) updateData.title = updates.title;
        if (updates.priority) updateData.priority = updates.priority;
        if (updates.status) updateData.status = updates.status;
        if (updates.dueDate)
          updateData.due_date = new Date(updates.dueDate).toISOString();

        const { error } = await supabaseAdmin
          .from("tasks")
          .update(updateData)
          .eq("id", task.id);

        if (error) return { success: false, error: error.message };
        return { success: true, task: { id: task.id, title: task.title, ...updates } };
      },
    }),

    delete_task: tool({
      description: "Delete a task by searching for it by title keywords.",
      parameters: z.object({
        searchQuery: z
          .string()
          .describe("Keywords to find the task to delete"),
      }),
      execute: async ({ searchQuery }) => {
        const { data: tasks } = await supabaseAdmin
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .ilike("title", `%${searchQuery}%`)
          .limit(1);

        if (!tasks || tasks.length === 0)
          return { success: false, error: `No task found matching "${searchQuery}"` };

        const task = tasks[0];
        const { error } = await supabaseAdmin
          .from("tasks")
          .delete()
          .eq("id", task.id);

        if (error) return { success: false, error: error.message };
        return { success: true, deleted: { id: task.id, title: task.title } };
      },
    }),

    list_tasks: tool({
      description:
        "List the user's tasks, optionally filtered by status or date.",
      parameters: z.object({
        status: z
          .enum(["pending", "completed", "skipped", "all"])
          .default("all")
          .describe("Filter by status"),
        dateFilter: z
          .enum(["today", "tomorrow", "this_week", "overdue", "all"])
          .default("all")
          .describe("Filter by date range"),
      }),
      execute: async ({ status, dateFilter }) => {
        let query = supabaseAdmin
          .from("tasks")
          .select("id, title, status, priority, due_date, tags")
          .eq("user_id", userId)
          .order("due_date", { ascending: true });

        if (status !== "all") query = query.eq("status", status);

        const now = new Date();
        if (dateFilter === "today") {
          const start = new Date(now);
          start.setHours(0, 0, 0, 0);
          const end = new Date(now);
          end.setHours(23, 59, 59, 999);
          query = query
            .gte("due_date", start.toISOString())
            .lte("due_date", end.toISOString());
        } else if (dateFilter === "overdue") {
          query = query.lt("due_date", now.toISOString()).eq("status", "pending");
        }

        const { data, error } = await query.limit(50);
        if (error) return { success: false, error: error.message };
        return { success: true, tasks: data || [], count: data?.length || 0 };
      },
    }),

    list_goals: tool({
      description: "List the user's goals with task progress counts.",
      parameters: z.object({}),
      execute: async () => {
        const { data: goals } = await supabaseAdmin
          .from("goals")
          .select("id, title, status, priority")
          .eq("user_id", userId);

        if (!goals) return { success: true, goals: [] };

        const goalsWithProgress = await Promise.all(
          goals.map(async (goal) => {
            const { count: total } = await supabaseAdmin
              .from("tasks")
              .select("*", { count: "exact", head: true })
              .eq("goal_id", goal.id);
            const { count: completed } = await supabaseAdmin
              .from("tasks")
              .select("*", { count: "exact", head: true })
              .eq("goal_id", goal.id)
              .eq("status", "completed");
            return {
              ...goal,
              totalTasks: total || 0,
              completedTasks: completed || 0,
            };
          })
        );

        return { success: true, goals: goalsWithProgress };
      },
    }),
  };
}
```

- [ ] **Step 2: Create the AI chat route using Vercel AI SDK**

Create `src/app/api/ai/chat/route.ts`:

```ts
import { google } from "@ai-sdk/google";
import { streamText, stepCountIs } from "ai";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import { GRINDPROOF_SYSTEM_PROMPT } from "@/lib/prompts/system-prompt";
import { createGrindproofTools } from "@/lib/ai/tools";
import type { Database } from "@/lib/supabase/types";

export const maxDuration = 60;

export async function POST(req: Request) {
  // Authenticate user
  const cookieHeader = req.headers.get("cookie") || "";
  const cookies: { name: string; value: string }[] = [];
  cookieHeader.split(";").forEach((cookie) => {
    const [name, ...rest] = cookie.trim().split("=");
    if (name) cookies.push({ name, value: rest.join("=") });
  });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookies,
        setAll: () => {},
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { messages } = await req.json();

  const result = streamText({
    model: google(env.AI_MODEL),
    system: GRINDPROOF_SYSTEM_PROMPT,
    messages,
    tools: createGrindproofTools(user.id),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
```

- [ ] **Step 3: Update system-prompt.ts -- remove evidence/GitHub references**

Replace the entire file with:

```ts
export const GRINDPROOF_SYSTEM_PROMPT = `
You are GrindProof: a blunt, data-driven personal accountability coach. Your goal is to help the user finish existing work before starting new projects. Be honest, firm, evidence-based, and never cruel.

Behavior rules:

- Always use real numbers and concrete data when available (tasks, completion rates, dates, patterns).

- Compare planned vs actual behavior for every routine or report.

- Detect: avoidance, new-project addiction, vague tasks, overcommitment.

- If the user tries to create a new goal while they have 5+ active goals under 50% complete, push back and require one of: archive an active goal, show proof of progress, or justify a well-defined exception.

- Be firm but fair. If the user admits the truth, be supportive. If they avoid or lie, call it out directly and succinctly.

- No personal insults. Minimal emoji. Use line breaks for readability.

- If data is missing, explain exactly what you need and provide one simple next step.

- BE CONCISE: Keep responses short and direct. Get straight to the point. Use 2-4 sentences max for general questions. Only provide longer responses when analyzing patterns or generating reports.

- When reacting to morning/evening check-in submissions, keep commentary to 2-3 sentences. Be specific about the data. Save long roasts for the weekly report.

- BE FACTUAL: State facts, not speculation. Use bullet points for lists. Avoid filler words.

Security / style:

- Do not invent data or numbers.

- If you must infer, label the statement as an inference and give the confidence level.

- REMEMBER: You're not here to judge or control — you're here to help them build momentum and follow through. Be the coach you'd want in your corner.
`;
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/ai/chat/route.ts src/lib/ai/tools.ts src/lib/prompts/system-prompt.ts
git commit -m "feat: rebuild AI chat with Vercel AI SDK + Gemini, add function calling tools"
```

---

### Task 8: Build Vercel Cron Routes

**Files:**
- Create: `src/app/api/cron/check-notifications/route.ts`
- Create: `src/app/api/cron/weekly-roast/route.ts`
- Create: `vercel.json`

- [ ] **Step 1: Create check-notifications cron route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { sendMorningEmail, sendEveningEmail } from "@/lib/notifications/email-service";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const now = new Date();
  let emailsSent = 0;

  // Get all notification settings
  const { data: settings, error } = await supabase
    .from("notification_settings")
    .select("user_id, timezone, morning_check_enabled, morning_check_time, evening_check_enabled, evening_check_time, email_notifications_enabled");

  if (error || !settings) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }

  for (const setting of settings) {
    if (!setting.email_notifications_enabled) continue;

    try {
      // Calculate user's local time
      const userTime = new Date(
        now.toLocaleString("en-US", { timeZone: setting.timezone })
      );
      const userHour = userTime.getHours();
      const userMinute = userTime.getMinutes();

      // Check morning
      if (setting.morning_check_enabled && setting.morning_check_time) {
        const [targetHour, targetMinute] = setting.morning_check_time.split(":").map(Number);
        if (userHour === targetHour && Math.abs(userMinute - targetMinute) < 5) {
          // Get user profile for email + name
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, name")
            .eq("id", setting.user_id)
            .single();

          if (profile?.email) {
            // Count yesterday's incomplete tasks
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);

            const { count } = await supabase
              .from("tasks")
              .select("*", { count: "exact", head: true })
              .eq("user_id", setting.user_id)
              .eq("status", "pending")
              .gte("due_date", yesterday.toISOString())
              .lt("due_date", today.toISOString());

            await sendMorningEmail(profile.email, {
              name: profile.name,
              carriedOverCount: count || 0,
            });
            emailsSent++;
          }
        }
      }

      // Check evening
      if (setting.evening_check_enabled && setting.evening_check_time) {
        const [targetHour, targetMinute] = setting.evening_check_time.split(":").map(Number);
        if (userHour === targetHour && Math.abs(userMinute - targetMinute) < 5) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("email, name")
            .eq("id", setting.user_id)
            .single();

          if (profile?.email) {
            const today = new Date(now);
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const { count } = await supabase
              .from("tasks")
              .select("*", { count: "exact", head: true })
              .eq("user_id", setting.user_id)
              .eq("status", "pending")
              .gte("due_date", today.toISOString())
              .lt("due_date", tomorrow.toISOString());

            await sendEveningEmail(profile.email, {
              name: profile.name,
              pendingCount: count || 0,
            });
            emailsSent++;
          }
        }
      }
    } catch (err) {
      console.error(`Error processing user ${setting.user_id}:`, err);
    }
  }

  return NextResponse.json({ success: true, emailsSent });
}
```

- [ ] **Step 2: Create weekly-roast cron route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { env } from "@/lib/env";
import { WEEKLY_ROAST_PROMPT } from "@/lib/prompts/weekly-roast-prompt";
import { sendWeeklyRoastEmail } from "@/lib/notifications/email-service";

const roastSchema = z.object({
  insights: z.array(
    z.object({
      emoji: z.string(),
      text: z.string(),
      severity: z.enum(["high", "medium", "positive"]),
    })
  ),
  recommendations: z.array(z.string()),
  weekSummary: z.string(),
});

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const now = new Date();

  // Get users whose local time is ~9am on Sunday
  const { data: settings } = await supabase
    .from("notification_settings")
    .select("user_id, timezone, email_notifications_enabled");

  if (!settings) {
    return NextResponse.json({ error: "No settings found" }, { status: 500 });
  }

  let roastsGenerated = 0;

  for (const setting of settings) {
    if (!setting.email_notifications_enabled) continue;

    try {
      const userTime = new Date(
        now.toLocaleString("en-US", { timeZone: setting.timezone })
      );
      const userHour = userTime.getHours();
      const userDay = userTime.getDay(); // 0 = Sunday

      // Only process users whose local time is ~9am on Sunday
      if (userDay !== 0 || userHour !== 9) continue;

      // Calculate week range
      const weekEnd = new Date(now);
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);

      // Fetch week's tasks
      const { data: tasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("user_id", setting.user_id)
        .gte("due_date", weekStart.toISOString())
        .lte("due_date", weekEnd.toISOString());

      if (!tasks || tasks.length === 0) continue;

      const completed = tasks.filter((t) => t.status === "completed").length;
      const skipped = tasks.filter((t) => t.status === "skipped").length;
      const pending = tasks.filter((t) => t.status === "pending").length;
      const total = tasks.length;
      const completionRate = Math.round((completed / total) * 100);

      // Get reflections from skipped tasks
      const reflections = tasks
        .filter((t) => t.reflection)
        .map((t) => ({ title: t.title, reflection: t.reflection }));

      const weekData = `
Tasks this week: ${total} total, ${completed} completed, ${skipped} skipped, ${pending} still pending.
Completion rate: ${completionRate}%.
Reflections on skipped tasks: ${reflections.length > 0 ? JSON.stringify(reflections) : "None provided."}
      `.trim();

      // Generate roast with AI
      const { object: roast } = await generateText({
        model: google(env.AI_MODEL),
        system: WEEKLY_ROAST_PROMPT,
        prompt: weekData,
        output: Output.object({ schema: roastSchema }),
      });

      // Store roast
      await supabase.from("weekly_roasts").insert({
        user_id: setting.user_id,
        week_start: weekStart.toISOString().split("T")[0],
        week_end: weekEnd.toISOString().split("T")[0],
        roast_data: roast,
        task_stats: { total, completed, skipped, pending, completionRate },
        delivered_via: ["email"],
      });

      // Send email
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, name")
        .eq("id", setting.user_id)
        .single();

      if (profile?.email) {
        await sendWeeklyRoastEmail(profile.email, {
          name: profile.name,
          weekSummary: roast.weekSummary,
          insights: roast.insights,
          recommendations: roast.recommendations,
          completionRate,
          tasksCompleted: completed,
          tasksTotal: total,
        });
      }

      roastsGenerated++;
    } catch (err) {
      console.error(`Error generating roast for user ${setting.user_id}:`, err);
    }
  }

  return NextResponse.json({ success: true, roastsGenerated });
}
```

- [ ] **Step 3: Create vercel.json with cron configuration**

```json
{
  "crons": [
    {
      "path": "/api/cron/check-notifications",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/weekly-roast",
      "schedule": "0 * * * 0"
    }
  ]
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/api/cron/ vercel.json
git commit -m "feat: add Vercel Cron routes for notifications and weekly roast"
```

---

### Task 9: Update Root Layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Rewrite layout.tsx with simplified providers**

```tsx
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { TRPCProvider } from "@/lib/trpc/provider";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "GrindProof - AI Accountability Coach",
  description:
    "Track what you plan. Prove what you did. Get roasted for the gap.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "GrindProof",
  },
  openGraph: {
    type: "website",
    siteName: "GrindProof",
    title: "GrindProof - AI Accountability Coach",
    description: "The accountability app that actually calls out your BS.",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${spaceGrotesk.variable} antialiased`}
      >
        <TRPCProvider>
          <AuthProvider>{children}</AuthProvider>
        </TRPCProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Update the landing page to be a server component**

Replace `src/app/page.tsx` with:

```tsx
import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <div className="min-h-screen bg-linear-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black">
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="max-w-3xl text-center">
          <div className="mb-8 flex justify-center">
            <Logo size="xl" href="/" />
          </div>

          <p className="mx-auto mb-12 max-w-2xl text-xl leading-relaxed text-zinc-600 dark:text-zinc-400">
            Track what you plan. Prove what you did. Get roasted for the gap.
            <br />
            <span className="text-base text-zinc-500">
              The accountability app that actually calls out your BS.
            </span>
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/auth/login"
              className="w-full rounded-full bg-zinc-900 px-8 py-4 text-base font-semibold text-white transition-all hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200 sm:w-auto"
            >
              Get Started
            </Link>
            <Link
              href="/how-it-works"
              className="w-full rounded-full border-2 border-zinc-300 px-8 py-4 text-base font-semibold text-zinc-700 transition-all hover:border-zinc-900 hover:bg-zinc-900 hover:text-white dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-50 dark:hover:bg-zinc-50 dark:hover:text-zinc-900 sm:w-auto"
            >
              How It Works
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-8 border-t border-zinc-200 pt-12 dark:border-zinc-800">
            <div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                9am
              </div>
              <div className="mt-1 text-sm text-zinc-500">Morning Plan</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                6pm
              </div>
              <div className="mt-1 text-sm text-zinc-500">Reality Check</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
                Sun
              </div>
              <div className="mt-1 text-sm text-zinc-500">Weekly Roast</div>
            </div>
          </div>
        </div>
      </div>

      <footer className="border-t border-zinc-200 bg-white/50 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              &copy; {new Date().getFullYear()} GrindProof. All rights reserved.
            </div>
            <div className="flex items-center gap-4 text-sm">
              <Link
                href="/privacy"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Terms
              </Link>
              <a
                href="mailto:support@grindproof.co"
                className="text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
```

Note: The landing page uses `new Date().getFullYear()` which works in server components. The `Logo` component may need `'use client'` if it uses hooks -- check and adjust.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx
git commit -m "refactor: simplify layout (remove FeedbackProvider, InstallPWA), make landing page a server component"
```

---

### Task 10: Build Dashboard Components

**Files:**
- Create: `src/components/TaskList.tsx`
- Create: `src/components/TaskItem.tsx`
- Create: `src/components/GoalList.tsx`
- Create: `src/components/AddTaskForm.tsx`
- Create: `src/components/MorningCheckIn.tsx`
- Create: `src/components/EveningCheckIn.tsx`
- Create: `src/components/WeeklyRoastCard.tsx`
- Create: `src/components/ChatPanel.tsx`

This is the largest task. Each component should be created as a standalone file. The implementation details depend on the existing Radix UI primitives in `src/components/ui/`. Each component follows the spec's UX design.

**This task is intentionally left at the design level** -- the implementing agent should read the spec (Section: UX Design) and the existing UI components in `src/components/ui/` to build each component. The key contracts are:

- [ ] **Step 1: Create TaskItem.tsx**

A single task row with: checkbox to toggle completion, title, priority badge, due date. Clicking opens edit inline. Uses `trpc.task.update` and `trpc.task.complete` mutations.

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { useTaskContext } from "@/contexts/TaskContext";

interface TaskItemProps {
  task: {
    id: string;
    title: string;
    priority: "high" | "medium" | "low";
    status: "pending" | "completed" | "skipped";
    dueDate: Date | null;
    goalId: string | null;
  };
}

const priorityColors = {
  high: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  low: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
};

export function TaskItem({ task }: TaskItemProps) {
  const { refreshTasks } = useTaskContext();
  const completeMutation = trpc.task.complete.useMutation({
    onSuccess: () => refreshTasks(),
  });
  const updateMutation = trpc.task.update.useMutation({
    onSuccess: () => refreshTasks(),
  });

  const isCompleted = task.status === "completed";

  const handleToggle = () => {
    if (isCompleted) {
      updateMutation.mutate({ id: task.id, status: "pending" });
    } else {
      completeMutation.mutate({ id: task.id });
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
      <button
        onClick={handleToggle}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
          isCompleted
            ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-50 dark:bg-zinc-50 dark:text-zinc-900"
            : "border-zinc-300 hover:border-zinc-500 dark:border-zinc-600"
        }`}
      >
        {isCompleted && (
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>
      <span
        className={`flex-1 text-sm ${isCompleted ? "text-zinc-400 line-through" : "text-zinc-900 dark:text-zinc-50"}`}
      >
        {task.title}
      </span>
      <Badge variant="outline" className={`text-xs ${priorityColors[task.priority]}`}>
        {task.priority}
      </Badge>
      {task.dueDate && (
        <span className="text-xs text-zinc-500">{formatDate(task.dueDate)}</span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create TaskList.tsx**

```tsx
"use client";

import { useTaskContext } from "@/contexts/TaskContext";
import { TaskItem } from "./TaskItem";

export function TaskList() {
  const { tasks, isLoading } = useTaskContext();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayTasks = tasks.filter((t) => {
    if (!t.dueDate) return false;
    const due = new Date(t.dueDate);
    return due >= today && due < tomorrow;
  });

  const pendingTasks = todayTasks.filter((t) => t.status === "pending");
  const completedTasks = todayTasks.filter((t) => t.status === "completed");

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-14 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
          />
        ))}
      </div>
    );
  }

  if (todayTasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-300 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
        No tasks for today. Add one or use the morning check-in.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {pendingTasks.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
      {completedTasks.length > 0 && (
        <>
          <div className="pt-2 text-xs font-medium text-zinc-400">
            Completed ({completedTasks.length})
          </div>
          {completedTasks.map((task) => (
            <TaskItem key={task.id} task={task} />
          ))}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Create GoalList.tsx**

```tsx
"use client";

import { useState } from "react";
import { useTaskContext } from "@/contexts/TaskContext";

export function GoalList() {
  const { goals, tasks, isLoading } = useTaskContext();
  const [collapsed, setCollapsed] = useState(false);

  const activeGoals = goals.filter((g) => g.status === "active");

  if (isLoading || activeGoals.length === 0) return null;

  return (
    <div>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mb-2 flex w-full items-center justify-between text-sm font-semibold text-zinc-900 dark:text-zinc-50"
      >
        <span>Goals ({activeGoals.length})</span>
        <span className="text-zinc-400">{collapsed ? "+" : "-"}</span>
      </button>
      {!collapsed && (
        <div className="space-y-2">
          {activeGoals.map((goal) => {
            const goalTasks = tasks.filter((t) => t.goalId === goal.id);
            const completed = goalTasks.filter(
              (t) => t.status === "completed"
            ).length;
            const total = goalTasks.length;

            return (
              <div
                key={goal.id}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <span className="text-sm text-zinc-900 dark:text-zinc-50">
                  {goal.title}
                </span>
                <span className="text-xs text-zinc-500">
                  {completed}/{total} done
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Create AddTaskForm.tsx**

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useTaskContext } from "@/contexts/TaskContext";

export function AddTaskForm() {
  const [title, setTitle] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const { refreshTasks } = useTaskContext();

  const createMutation = trpc.task.create.useMutation({
    onSuccess: () => {
      setTitle("");
      setIsOpen(false);
      refreshTasks();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate({
      title: title.trim(),
      dueDate: new Date(),
    });
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full rounded-lg border border-dashed border-zinc-300 py-2 text-sm text-zinc-500 transition-colors hover:border-zinc-500 hover:text-zinc-700 dark:border-zinc-700 dark:hover:border-zinc-500 dark:hover:text-zinc-300"
      >
        + Add task
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What needs to get done?"
        className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        onKeyDown={(e) => {
          if (e.key === "Escape") setIsOpen(false);
        }}
      />
      <button
        type="submit"
        disabled={!title.trim() || createMutation.isPending}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        Add
      </button>
    </form>
  );
}
```

- [ ] **Step 5: Create MorningCheckIn.tsx**

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useTaskContext } from "@/contexts/TaskContext";

export function MorningCheckIn() {
  const { refreshTasks } = useTaskContext();
  const { data, isLoading } = trpc.dailyCheck.getMorningSchedule.useQuery();
  const carryOverMutation = trpc.dailyCheck.carryOverTasks.useMutation({
    onSuccess: () => refreshTasks(),
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);

  if (isLoading || !data || submitted) return null;
  if (data.yesterdayIncomplete.length === 0) return null;

  const toggleTask = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (selectedIds.length > 0) {
      carryOverMutation.mutate({ taskIds: selectedIds });
    }
    setSubmitted(true);
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/20">
      <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Morning Check-in
      </h3>
      <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-400">
        You left {data.yesterdayIncomplete.length} task
        {data.yesterdayIncomplete.length > 1 ? "s" : ""} unfinished yesterday.
        Carry over?
      </p>
      <div className="mb-3 space-y-2">
        {data.yesterdayIncomplete.map((task: any) => (
          <label
            key={task.id}
            className="flex cursor-pointer items-center gap-2 text-sm"
          >
            <input
              type="checkbox"
              checked={selectedIds.includes(task.id)}
              onChange={() => toggleTask(task.id)}
              className="rounded border-zinc-300"
            />
            <span className="text-zinc-700 dark:text-zinc-300">
              {task.title}
            </span>
          </label>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={carryOverMutation.isPending}
        className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {selectedIds.length > 0
          ? `Carry over ${selectedIds.length} task${selectedIds.length > 1 ? "s" : ""}`
          : "Skip, fresh start"}
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Create EveningCheckIn.tsx**

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useTaskContext } from "@/contexts/TaskContext";

export function EveningCheckIn() {
  const { refreshTasks } = useTaskContext();
  const { data, isLoading } = trpc.dailyCheck.getEveningSchedule.useQuery();
  const submitMutation = trpc.dailyCheck.submitEveningReflections.useMutation({
    onSuccess: () => refreshTasks(),
  });
  const [reflections, setReflections] = useState<
    Record<string, { status: "completed" | "skipped"; reflection: string }>
  >({});
  const [submitted, setSubmitted] = useState(false);

  if (isLoading || !data || submitted) return null;

  const pendingTasks = data.todayTasks.filter(
    (t: any) => t.status === "pending"
  );
  if (pendingTasks.length === 0) return null;

  const handleStatusChange = (
    taskId: string,
    status: "completed" | "skipped"
  ) => {
    setReflections((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], status, reflection: prev[taskId]?.reflection || "" },
    }));
  };

  const handleReflection = (taskId: string, reflection: string) => {
    setReflections((prev) => ({
      ...prev,
      [taskId]: { ...prev[taskId], reflection },
    }));
  };

  const handleSubmit = () => {
    const items = Object.entries(reflections).map(([taskId, data]) => ({
      taskId,
      status: data.status,
      reflection: data.status === "skipped" ? data.reflection : undefined,
    }));

    if (items.length > 0) {
      submitMutation.mutate({ reflections: items });
    }
    setSubmitted(true);
  };

  const allReviewed = pendingTasks.every(
    (t: any) => reflections[t.id]?.status
  );

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900/50 dark:bg-indigo-950/20">
      <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
        Evening Reality Check
      </h3>
      <p className="mb-3 text-xs text-zinc-600 dark:text-zinc-400">
        {pendingTasks.length} task{pendingTasks.length > 1 ? "s" : ""} still
        pending. What happened?
      </p>
      <div className="mb-3 space-y-3">
        {pendingTasks.map((task: any) => (
          <div key={task.id} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-zinc-700 dark:text-zinc-300">
                {task.title}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => handleStatusChange(task.id, "completed")}
                  className={`rounded px-2 py-1 text-xs ${
                    reflections[task.id]?.status === "completed"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                  }`}
                >
                  Done
                </button>
                <button
                  onClick={() => handleStatusChange(task.id, "skipped")}
                  className={`rounded px-2 py-1 text-xs ${
                    reflections[task.id]?.status === "skipped"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-zinc-100 text-zinc-500 dark:bg-zinc-800"
                  }`}
                >
                  Skipped
                </button>
              </div>
            </div>
            {reflections[task.id]?.status === "skipped" && (
              <input
                placeholder="What happened? (one line)"
                value={reflections[task.id]?.reflection || ""}
                onChange={(e) => handleReflection(task.id, e.target.value)}
                className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
              />
            )}
          </div>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={!allReviewed || submitMutation.isPending}
        className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
      >
        Submit reality check
      </button>
    </div>
  );
}
```

- [ ] **Step 7: Create WeeklyRoastCard.tsx**

```tsx
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useAuth } from "@/contexts/AuthContext";

export function WeeklyRoastCard() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  // Query latest roast -- this uses a raw Supabase query via tRPC
  // For MVP, we'll check if it's Sunday or if there's a recent roast
  const today = new Date();
  const isSunday = today.getDay() === 0;

  // For now, only show on Sunday. Full implementation queries weekly_roasts table.
  if (!isSunday || dismissed || !user) return null;

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-900 p-4 text-white dark:border-zinc-700">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Weekly Roast</h3>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs text-zinc-400 hover:text-zinc-200"
        >
          Dismiss
        </button>
      </div>
      <p className="text-xs text-zinc-400">
        Your weekly roast has been delivered to your email. Check your inbox for
        the full report.
      </p>
    </div>
  );
}
```

- [ ] **Step 8: Create ChatPanel.tsx**

```tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "ai/react";
import { useAuth } from "@/contexts/AuthContext";
import { AnimatePresence, motion } from "framer-motion";

export function ChatPanel() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, input, handleInputChange, handleSubmit, isLoading } =
    useChat({
      api: "/api/ai/chat",
    });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-zinc-900 text-white shadow-lg transition-transform hover:scale-105 dark:bg-zinc-50 dark:text-zinc-900"
      >
        {isOpen ? (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-0 bottom-0 z-40 flex h-[70vh] flex-col rounded-t-2xl border-t border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-900 md:inset-x-auto md:bottom-24 md:right-6 md:h-[500px] md:w-[400px] md:rounded-2xl md:border"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
                GrindProof Coach
              </h3>
              <span className="text-xs text-zinc-500">AI Accountability</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-3">
              {messages.length === 0 && (
                <div className="flex h-full items-center justify-center text-center text-sm text-zinc-400">
                  <p>
                    I'm your accountability coach. Ask me anything, or tell me
                    what you're working on.
                  </p>
                </div>
              )}
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`mb-3 ${message.role === "user" ? "text-right" : "text-left"}`}
                >
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return (
                        <div
                          key={i}
                          className={`inline-block max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                            message.role === "user"
                              ? "bg-zinc-900 text-white dark:bg-zinc-50 dark:text-zinc-900"
                              : "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50"
                          }`}
                        >
                          {part.text}
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              ))}
              {isLoading && (
                <div className="mb-3 text-left">
                  <div className="inline-block rounded-2xl bg-zinc-100 px-4 py-2 text-sm text-zinc-500 dark:bg-zinc-800">
                    ...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800"
            >
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Talk to your coach..."
                  className="flex-1 rounded-full border border-zinc-300 bg-zinc-50 px-4 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900"
                >
                  Send
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 9: Commit**

```bash
git add src/components/TaskItem.tsx src/components/TaskList.tsx src/components/GoalList.tsx src/components/AddTaskForm.tsx src/components/MorningCheckIn.tsx src/components/EveningCheckIn.tsx src/components/WeeklyRoastCard.tsx src/components/ChatPanel.tsx
git commit -m "feat: build dashboard components (TaskList, GoalList, CheckIns, ChatPanel, WeeklyRoast)"
```

---

### Task 11: Build Dashboard Page

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Replace the 4,587-line dashboard with the new clean version**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { TaskProvider } from "@/contexts/TaskContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { TaskList } from "@/components/TaskList";
import { GoalList } from "@/components/GoalList";
import { AddTaskForm } from "@/components/AddTaskForm";
import { MorningCheckIn } from "@/components/MorningCheckIn";
import { EveningCheckIn } from "@/components/EveningCheckIn";
import { WeeklyRoastCard } from "@/components/WeeklyRoastCard";
import { ChatPanel } from "@/components/ChatPanel";
import { useEffect } from "react";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function shouldShowMorning(): boolean {
  const hour = new Date().getHours();
  return hour < 11;
}

function shouldShowEvening(): boolean {
  const hour = new Date().getHours();
  return hour >= 17;
}

function DashboardContent() {
  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
      <WeeklyRoastCard />

      {shouldShowMorning() && <MorningCheckIn />}
      {shouldShowEvening() && <EveningCheckIn />}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Today's Tasks
        </h2>
        <TaskList />
        <div className="mt-2">
          <AddTaskForm />
        </div>
      </div>

      <GoalList />
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-50" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <TaskProvider>
      <NotificationProvider>
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
          {/* Header */}
          <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-4">
              <Logo size="md" href="/" />
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-500">{getGreeting()}</span>
                <button
                  onClick={signOut}
                  className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </header>

          <DashboardContent />
          <ChatPanel />
        </div>
      </NotificationProvider>
    </TaskProvider>
  );
}
```

- [ ] **Step 2: Verify build compiles**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Fix any remaining type errors. Common issues will be:
- `Logo` component might need adjustment if it references deleted contexts
- `Database` types might need updating for new/removed columns

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: rebuild dashboard as single-page layout with floating AI chat"
```

---

### Task 12: Database Migration

**Files:**
- Create: `supabase/migrations/YYYYMMDD_mvp_v2_simplify.sql`

- [ ] **Step 1: Create migration file**

```sql
-- GrindProof MVP v2 Schema Migration
-- Simplifies schema by removing unused columns and tables

-- Drop unused tables
DROP TABLE IF EXISTS routines CASCADE;
DROP TABLE IF EXISTS integrations CASCADE;

-- Simplify goals table
ALTER TABLE goals
  DROP COLUMN IF EXISTS github_repos,
  DROP COLUMN IF EXISTS target_date,
  DROP COLUMN IF EXISTS time_horizon;

-- Update goals status constraint to remove 'paused'
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_status_check;
ALTER TABLE goals ADD CONSTRAINT goals_status_check
  CHECK (status IN ('active', 'completed'));
-- Update any 'paused' goals to 'active'
UPDATE goals SET status = 'active' WHERE status = 'paused';

-- Simplify tasks table
ALTER TABLE tasks
  DROP COLUMN IF EXISTS completion_proof,
  DROP COLUMN IF EXISTS google_calendar_event_id,
  DROP COLUMN IF EXISTS is_synced_with_calendar,
  DROP COLUMN IF EXISTS parent_task_id,
  DROP COLUMN IF EXISTS reminders,
  DROP COLUMN IF EXISTS attachments,
  DROP COLUMN IF EXISTS recurring_event_id;

-- Add reflection column to tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS reflection TEXT;

-- Simplify profiles table
ALTER TABLE profiles
  DROP COLUMN IF EXISTS profile_pic_url;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Update notification_settings: remove hourly, add email/push toggles
ALTER TABLE notification_settings
  DROP COLUMN IF EXISTS hourly_review_enabled,
  DROP COLUMN IF EXISTS hourly_review_start_time,
  DROP COLUMN IF EXISTS hourly_review_end_time;
ALTER TABLE notification_settings
  ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true;

-- Add device tracking to push_subscriptions
ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS device_name TEXT,
  ADD COLUMN IF NOT EXISTS last_successful_push TIMESTAMPTZ;

-- Create weekly_roasts table
CREATE TABLE IF NOT EXISTS weekly_roasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  roast_data JSONB NOT NULL,
  task_stats JSONB,
  delivered_via TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weekly_roasts_user_id ON weekly_roasts(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_roasts_week_start ON weekly_roasts(week_start DESC);

-- Drop unused indexes
DROP INDEX IF EXISTS idx_routines_goal_id;
DROP INDEX IF EXISTS idx_routines_is_active;
DROP INDEX IF EXISTS idx_routines_created_at;
DROP INDEX IF EXISTS idx_integrations_user_id;
DROP INDEX IF EXISTS idx_integrations_service_type;
DROP INDEX IF EXISTS idx_integrations_created_at;
DROP INDEX IF EXISTS idx_tasks_google_calendar_event_id;
DROP INDEX IF EXISTS idx_tasks_parent_task_id;

-- Drop unused triggers
DROP TRIGGER IF EXISTS update_routines_updated_at ON routines;
DROP TRIGGER IF EXISTS update_integrations_updated_at ON integrations;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: add MVP v2 migration (simplify schema, add weekly_roasts table)"
```

---

### Task 13: Final Cleanup and Build Verification

**Files:**
- Various cleanup across remaining files

- [ ] **Step 1: Remove the proxy.ts if it references deleted modules**

```bash
# Check if proxy.ts has any integration references
cat src/proxy.ts
```

If it references integrations or deleted modules, simplify or remove it.

- [ ] **Step 2: Update Supabase types if there's a generated types file**

Check `src/lib/supabase/types.ts` and ensure it matches the new schema. If it's auto-generated, it will need regenerating after the migration runs. For now, ensure it doesn't block compilation.

- [ ] **Step 3: Run the build**

```bash
npm run build
```

Fix any remaining errors. Common issues:
- Missing UI component imports (check if all `ui/` components still exist)
- Type mismatches from removed columns in Supabase types

- [ ] **Step 4: Run linting**

```bash
npm run lint
```

Fix any linting errors.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: final cleanup, fix build errors for MVP v2"
```

- [ ] **Step 6: Verify the branch state**

```bash
git log --oneline mvp-v2 --not main
```

This should show a clean series of commits representing the MVP v2 work.

---

## Summary of All Tasks

| # | Task | Key Output |
|---|------|-----------|
| 1 | Create branch + deps | `mvp-v2` branch, new packages installed |
| 2 | Mass delete | All non-essential files removed |
| 3 | Simplify env/config | Clean env vars, no storage/validation/GitHub config |
| 4 | Simplify tRPC routers | 6 clean routers, no Google Calendar logic |
| 5 | Create contexts | AuthContext, TaskContext, NotificationContext |
| 6 | Email service | Resend integration + push stub |
| 7 | AI chat route | Vercel AI SDK + Gemini + function calling tools |
| 8 | Cron routes | Notification cron + weekly roast cron + vercel.json |
| 9 | Root layout | Simplified providers, server-rendered landing page |
| 10 | Dashboard components | 8 focused components (TaskList, ChatPanel, CheckIns, etc.) |
| 11 | Dashboard page | Single clean page (~100 lines) |
| 12 | Database migration | Schema simplification SQL |
| 13 | Final cleanup | Build verification + fix remaining issues |
