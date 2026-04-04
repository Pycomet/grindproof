# MVP v2 Hardening Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all CRITICAL and HIGH security issues from code review, resolve correctness bugs, regenerate Supabase types to eliminate `as any` casts, and fix the broken test suite.

**Architecture:** Surgical fixes across 12 files. No new features — purely hardening. The AI tools file gets the biggest rework (user-scoped Supabase client, type safety). Email templates get HTML escaping. Cron endpoints get constant-time auth. Tests get fixed to work with vitest 4.1.

**Tech Stack:** Next.js 16, Vitest 4.1, Supabase, Resend, Vercel AI SDK

---

### Task 1: Fix AI Tools — Remove `@ts-nocheck`, Use User-Scoped Client, Add `user_id` Guards

**Files:**
- Modify: `src/lib/ai/tools.ts`
- Modify: `src/app/api/ai/chat/route.ts`

This is the highest-priority fix. The AI tools currently use `supabaseAdmin` (service role key) which bypasses RLS entirely. The `update_task` and `delete_task` mutations don't re-assert `user_id` on the final write. The entire file has `@ts-nocheck`.

- [ ] **Step 1: Rewrite `src/lib/ai/tools.ts`**

Replace the entire file with a version that:
- Removes `// @ts-nocheck` and `/* eslint-disable */`
- Accepts a Supabase client as a parameter instead of creating `supabaseAdmin`
- Adds `.eq("user_id", userId)` to every `update()` and `delete()` call
- Uses proper types instead of `any`

```ts
import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

export function createGrindproofTools(
  userId: string,
  supabase: SupabaseClient<Database>
) {
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
        const { data, error } = await supabase
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

        if (error) return { success: false as const, error: error.message };
        return { success: true as const, task: { id: data.id, title: data.title } };
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
        const { data: tasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .ilike("title", `%${searchQuery}%`)
          .limit(1);

        if (!tasks || tasks.length === 0)
          return { success: false as const, error: `No task found matching "${searchQuery}"` };

        const task = tasks[0];
        const updateData: Record<string, unknown> = {};
        if (updates.title) updateData.title = updates.title;
        if (updates.priority) updateData.priority = updates.priority;
        if (updates.status) updateData.status = updates.status;
        if (updates.dueDate)
          updateData.due_date = new Date(updates.dueDate).toISOString();

        const { error } = await supabase
          .from("tasks")
          .update(updateData)
          .eq("id", task.id)
          .eq("user_id", userId);

        if (error) return { success: false as const, error: error.message };
        return { success: true as const, task: { id: task.id, title: task.title, ...updates } };
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
        const { data: tasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .ilike("title", `%${searchQuery}%`)
          .limit(1);

        if (!tasks || tasks.length === 0)
          return { success: false as const, error: `No task found matching "${searchQuery}"` };

        const task = tasks[0];
        const { error } = await supabase
          .from("tasks")
          .delete()
          .eq("id", task.id)
          .eq("user_id", userId);

        if (error) return { success: false as const, error: error.message };
        return { success: true as const, deleted: { id: task.id, title: task.title } };
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
        let query = supabase
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
        if (error) return { success: false as const, error: error.message };
        return { success: true as const, tasks: data || [], count: data?.length || 0 };
      },
    }),

    list_goals: tool({
      description: "List the user's goals with task progress counts.",
      parameters: z.object({}),
      execute: async () => {
        const { data: goals } = await supabase
          .from("goals")
          .select("id, title, status, priority")
          .eq("user_id", userId);

        if (!goals) return { success: true as const, goals: [] };

        const goalsWithProgress = await Promise.all(
          goals.map(async (goal) => {
            const { count: total } = await supabase
              .from("tasks")
              .select("*", { count: "exact", head: true })
              .eq("goal_id", goal.id);
            const { count: completed } = await supabase
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

        return { success: true as const, goals: goalsWithProgress };
      },
    }),
  };
}
```

- [ ] **Step 2: Update `src/app/api/ai/chat/route.ts` to pass the user-scoped Supabase client to tools**

Also add message validation with zod.

```ts
import { google } from "@ai-sdk/google";
import { streamText, stepCountIs } from "ai";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import { env } from "@/lib/env";
import { GRINDPROOF_SYSTEM_PROMPT } from "@/lib/prompts/system-prompt";
import { createGrindproofTools } from "@/lib/ai/tools";
import type { Database } from "@/lib/supabase/types";

export const maxDuration = 60;

const messageSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().max(10000),
      })
    )
    .max(50),
});

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

  let parsed;
  try {
    parsed = messageSchema.parse(await req.json());
  } catch {
    return new Response("Invalid request body", { status: 400 });
  }

  const result = streamText({
    model: google(env.AI_MODEL),
    system: GRINDPROOF_SYSTEM_PROMPT,
    messages: parsed.messages,
    tools: createGrindproofTools(user.id, supabase),
    stopWhen: stepCountIs(5),
  });

  return result.toUIMessageStreamResponse();
}
```

- [ ] **Step 3: Build and verify no type errors**

Run: `npx next build 2>&1 | tail -20`
Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai/tools.ts src/app/api/ai/chat/route.ts
git commit -m "security: replace supabaseAdmin with user-scoped client in AI tools, add message validation, remove @ts-nocheck"
```

---

### Task 2: Add HTML Escaping to Email Templates

**Files:**
- Modify: `src/lib/notifications/email-service.ts`

User names and AI-generated content are interpolated directly into HTML without escaping, risking HTML injection.

- [ ] **Step 1: Add `escapeHtml` helper and apply it to all interpolated values**

Add this function at the top of the file (after imports) and wrap every user-controlled value:

At the top, after `const FROM_EMAIL = ...`:

```ts
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
```

Then update the three email functions:

In `sendMorningEmail`: change line 13 from:
```ts
const greeting = data.name ? `Hey ${data.name}` : "Hey";
```
to:
```ts
const greeting = data.name ? `Hey ${escapeHtml(data.name)}` : "Hey";
```

In `sendEveningEmail`: change line 38 from:
```ts
const greeting = data.name ? `${data.name}` : "Hey";
```
to:
```ts
const greeting = data.name ? `${escapeHtml(data.name)}` : "Hey";
```

In `sendWeeklyRoastEmail`: change line 67 from:
```ts
const greeting = data.name ? `${data.name}` : "Hey";
```
to:
```ts
const greeting = data.name ? `${escapeHtml(data.name)}` : "Hey";
```

Change the insights HTML (line 68-72) from:
```ts
const insightsHtml = data.insights
    .map(
      (i) =>
        `<li style="margin: 8px 0; color: ${i.severity === "high" ? "#dc2626" : i.severity === "positive" ? "#16a34a" : "#ca8a04"};">${i.emoji} ${i.text}</li>`
    )
    .join("");
```
to:
```ts
const insightsHtml = data.insights
    .map(
      (i) =>
        `<li style="margin: 8px 0; color: ${i.severity === "high" ? "#dc2626" : i.severity === "positive" ? "#16a34a" : "#ca8a04"};">${escapeHtml(i.emoji)} ${escapeHtml(i.text)}</li>`
    )
    .join("");
```

Change the recommendations HTML (line 74-75) from:
```ts
const recsHtml = data.recommendations
    .map((r) => `<li style="margin: 8px 0; color: #52525b;">${r}</li>`)
    .join("");
```
to:
```ts
const recsHtml = data.recommendations
    .map((r) => `<li style="margin: 8px 0; color: #52525b;">${escapeHtml(r)}</li>`)
    .join("");
```

Also escape `data.weekSummary` on line 88:
```ts
<p style="margin: 0; font-size: 14px; color: #52525b;">${escapeHtml(data.weekSummary)}</p>
```

- [ ] **Step 2: Build to verify**

Run: `npx next build 2>&1 | tail -5`
Expected: `✓ Compiled successfully`

- [ ] **Step 3: Commit**

```bash
git add src/lib/notifications/email-service.ts
git commit -m "security: HTML-escape all user/AI content in email templates"
```

---

### Task 3: Constant-Time CRON Auth + Guard `config.ts` with `server-only`

**Files:**
- Modify: `src/app/api/cron/check-notifications/route.ts`
- Modify: `src/app/api/cron/weekly-roast/route.ts`
- Modify: `src/lib/config.ts`

- [ ] **Step 1: Create a shared cron auth helper**

Create `src/lib/cron-auth.ts`:

```ts
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { timingSafeEqual } from "crypto";

export function verifyCronSecret(authHeader: string | null): NextResponse | null {
  const expected = `Bearer ${env.CRON_SECRET}`;
  if (!authHeader || authHeader.length !== expected.length) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);

  if (!timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null; // auth passed
}
```

- [ ] **Step 2: Update `src/app/api/cron/check-notifications/route.ts` to use the helper**

Replace lines 1-11:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { sendMorningEmail, sendEveningEmail } from "@/lib/notifications/email-service";
import { verifyCronSecret } from "@/lib/cron-auth";

export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
```

- [ ] **Step 3: Update `src/app/api/cron/weekly-roast/route.ts` to use the helper**

Replace lines 1-9 (keeping the other imports) and the auth check:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { google } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import { env } from "@/lib/env";
import { WEEKLY_ROAST_PROMPT } from "@/lib/prompts/weekly-roast-prompt";
import { sendWeeklyRoastEmail } from "@/lib/notifications/email-service";
import { verifyCronSecret } from "@/lib/cron-auth";
```

And replace lines 22-25:

```ts
export async function GET(request: NextRequest) {
  const authError = verifyCronSecret(request.headers.get("authorization"));
  if (authError) return authError;
```

- [ ] **Step 4: Guard `src/lib/config.ts` with `server-only` import**

Add as the first line of `src/lib/config.ts`:

```ts
import "server-only";
```

- [ ] **Step 5: Build to verify**

Run: `npx next build 2>&1 | tail -10`
Expected: `✓ Compiled successfully`

If the `server-only` import causes a build error (because `config.ts` is imported from a client component), investigate which client component imports it and split the config — export `APP_CONFIG` from a shared file and `NOTIFICATION_CONFIG` from a server-only file.

- [ ] **Step 6: Commit**

```bash
git add src/lib/cron-auth.ts src/app/api/cron/check-notifications/route.ts src/app/api/cron/weekly-roast/route.ts src/lib/config.ts
git commit -m "security: constant-time cron auth, guard config.ts with server-only"
```

---

### Task 4: Fix Correctness Bugs (Evening Reflections, carryOverTasks, Task Pagination)

**Files:**
- Modify: `src/server/trpc/routers/dailyCheck.ts`
- Modify: `src/server/trpc/routers/task.ts`

- [ ] **Step 1: Fix `submitEveningReflections` to check errors**

Replace the mutation body in `src/server/trpc/routers/dailyCheck.ts` (lines 95-111):

```ts
    .mutation(async ({ ctx, input }) => {
      const failures: string[] = [];

      for (const item of input.reflections) {
        const updateData: Record<string, unknown> = {
          status: item.status,
        };
        if (item.reflection) {
          updateData.reflection = item.reflection;
        }
        const { error } = await ctx.db
          .from("tasks")
          .update(updateData)
          .eq("id", item.taskId)
          .eq("user_id", ctx.user.id);

        if (error) failures.push(item.taskId);
      }

      if (failures.length > 0) {
        throw new Error(`Failed to update tasks: ${failures.join(", ")}`);
      }

      return { success: true, count: input.reflections.length };
    }),
```

- [ ] **Step 2: Add `.max(100)` to `carryOverTasks` input**

In `src/server/trpc/routers/dailyCheck.ts`, change line 62:

```ts
        taskIds: z.array(z.string()),
```
to:
```ts
        taskIds: z.array(z.string()).max(100),
```

- [ ] **Step 3: Add `.limit(200)` to `getAll` tasks query**

In `src/server/trpc/routers/task.ts`, find the `getAll` query chain that ends with:

```ts
      const { data, error } = await query;
```

Change it to:

```ts
      const { data, error } = await query.limit(200);
```

- [ ] **Step 4: Build to verify**

Run: `npx next build 2>&1 | tail -5`
Expected: `✓ Compiled successfully`

- [ ] **Step 5: Commit**

```bash
git add src/server/trpc/routers/dailyCheck.ts src/server/trpc/routers/task.ts
git commit -m "fix: check reflection update errors, cap carryOver input, add task pagination limit"
```

---

### Task 5: Regenerate Supabase Types

**Files:**
- Modify: `src/lib/supabase/types.ts`
- Modify: `src/server/trpc/routers/conversation.ts` (remove `as any`)
- Modify: `src/server/trpc/routers/notification.ts` (remove `as any`)

This eliminates all `as any` casts caused by missing table definitions in the generated types.

- [ ] **Step 1: Regenerate Supabase types**

```bash
npx supabase gen types typescript --project-id legxiwkmlnmpshymbrau > src/lib/supabase/types.ts
```

If the CLI isn't authenticated, run `npx supabase login` first.

- [ ] **Step 2: Remove `as any` casts from `conversation.ts`**

After regeneration, the `conversations` and `weekly_roasts` tables should be in the types. Open `src/server/trpc/routers/conversation.ts` and remove every `(ctx.db as any)` cast, replacing with `ctx.db`.

- [ ] **Step 3: Remove `as any` casts from `notification.ts`**

In `src/server/trpc/routers/notification.ts`:

Line 78 — change `(data as any).email_notifications_enabled` to `data.email_notifications_enabled`
Line 79 — change `(data as any).push_notifications_enabled` to `data.push_notifications_enabled`
Line 126 — change `updateData as any` to just `updateData` (may need proper typing on the object)
Line 138 — change `(data as any).email_notifications_enabled` to `data.email_notifications_enabled`
Line 139 — change `(data as any).push_notifications_enabled` to `data.push_notifications_enabled`

- [ ] **Step 4: Build to verify all type errors resolved**

Run: `npx next build 2>&1 | tail -10`
Expected: `✓ Compiled successfully`

If there are still type errors after regeneration, address them by checking column names match the generated types.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase/types.ts src/server/trpc/routers/conversation.ts src/server/trpc/routers/notification.ts
git commit -m "chore: regenerate Supabase types, remove as-any casts from conversation and notification routers"
```

---

### Task 6: Fix Broken Test Suite

**Files:**
- Modify: `src/__tests__/lib/env.test.ts`
- Modify: `src/__tests__/lib/email-service.test.ts`
- Modify: `src/__tests__/api/cron/check-notifications.test.ts`
- Modify: `src/__tests__/api/cron/weekly-roast.test.ts`
- Modify: `src/__tests__/api/ai/chat.test.ts`

The QA agent generated tests using `vi.isolateModules()` which doesn't exist in vitest 4.1. Tests also have mock structures that don't match the actual code. All 5 test files fail.

- [ ] **Step 1: Fix `env.test.ts`**

Replace `vi.isolateModules()` with `vi.resetModules()` + dynamic `import()`. The pattern is:

```ts
vi.resetModules();
// set env vars
const { env } = await import("@/lib/env");
// assert on env
```

Rewrite the test file with this approach. Also update test assertions to match the escapeHtml changes from Task 2 (email tests).

- [ ] **Step 2: Fix `email-service.test.ts`**

Update test assertions to account for the `escapeHtml` wrapping added in Task 2. For example, `data.name = "Alice"` won't change after escaping (no special chars), but tests that check for HTML content should still pass.

Also ensure the mock for `resend` matches the actual import pattern.

- [ ] **Step 3: Fix `check-notifications.test.ts`**

Update the auth mock to use the new `verifyCronSecret` from `src/lib/cron-auth.ts` (Task 3). The Supabase mock needs to match the actual query chains used in the route.

- [ ] **Step 4: Fix `weekly-roast.test.ts`**

Same auth mock update. Ensure the AI SDK mock matches actual usage (`generateText`, `Output`).

- [ ] **Step 5: Fix `chat.test.ts`**

Update to pass the Supabase client as second argument to `createGrindproofTools(user.id, supabase)` (matches Task 1 changes). Update message validation tests to match the new zod schema.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run --reporter=verbose 2>&1`
Expected: All tests pass

- [ ] **Step 7: Commit**

```bash
git add src/__tests__/
git commit -m "test: fix test suite for vitest 4.1 compatibility and match hardening changes"
```

---

### Task 7: Final Build Verification

**Files:** None (verification only)

- [ ] **Step 1: Full build**

Run: `npx next build 2>&1 | tail -20`
Expected: `✓ Compiled successfully`, all routes listed

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run --reporter=verbose 2>&1`
Expected: All tests pass

- [ ] **Step 3: Commit any remaining fixes if needed**

---

## Issues Deferred (not blocking merge, fix post-MVP)

These were flagged in code review but are lower priority:

- **Weekly roast date range**: `weekStart`/`weekEnd` should be anchored to user's local Sunday midnight, not server UTC `now`. Cosmetic data issue, not security.
- **`NotificationContext.isSubscribed`**: Should check `pushManager.getSubscription()` on mount. UX issue only.
- **`list_goals` N+1 queries**: Could batch into a single grouped query. Performance issue for users with many goals.
- **`env.ts` client-side type cast**: Returns `serverEnvSchema` type on client. Low risk since server-only fields are `undefined` at runtime.
