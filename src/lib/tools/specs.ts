import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { computeUserAccountability } from "@/lib/accountability/compute";
import { sanitizeForPrompt } from "@/lib/prompts/sanitize";
import {
  createGoalSchema,
  updateGoalSchema,
  createGoal,
  updateGoal,
  deleteGoal,
} from "@/lib/actions/goals";
import {
  morningCheckInSchema,
  eveningReflectionsSchema,
  taskReflectionSchema,
  recordMorningCheckIn,
  recordEveningReflections,
  recordTaskReflection,
} from "@/lib/actions/daily-checks";

/**
 * Transport-neutral tool registry — the single source of truth for GrindProof's
 * agent tools. The AI-SDK coach route and the MCP server both build their tool
 * surfaces from these defs (see to-ai-sdk.ts / to-mcp.ts), so a tool is defined
 * once and stays in lockstep across both.
 *
 * Each def's `execute` takes an explicit `ToolContext` (the user id + a client
 * already scoped to that user), so the same logic runs unchanged whether the
 * caller authenticated via cookies (coach) or a personal access token (MCP).
 */

export interface ToolContext {
  userId: string;
  supabase: SupabaseClient<Database>;
}

/** Subset of MCP tool annotations we set. */
export interface ToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
}

export interface ToolDef<S extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>> {
  name: string;
  description: string;
  inputSchema: S;
  annotations?: ToolAnnotations;
  execute: (ctx: ToolContext, input: z.infer<S>) => Promise<unknown>;
}

/** Helper to define a def with input-type inference preserved. */
function def<S extends z.ZodObject<z.ZodRawShape>>(d: ToolDef<S>): ToolDef {
  return d as unknown as ToolDef;
}

/** Escape Postgres LIKE/ILIKE wildcards so user input is treated literally. */
function escapeLike(str: string): string {
  return str.replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * The original coach tool set: task CRUD, goal read, accountability, coach
 * memory, and history. Executors preserved verbatim from the former
 * createGrindproofTools, including the sanitizeForPrompt output hardening —
 * tool results feed back into a model across agentic steps, so stored
 * user-authored text is sanitized to defuse indirect prompt injection.
 */
export function coreToolDefs(): ToolDef[] {
  return [
    def({
      name: "create_task",
      description:
        "Create a new task for the user. Use when they mention wanting to do something, add a task, or plan an activity.",
      inputSchema: z.object({
        title: z.string().max(200).describe("Task title"),
        description: z.string().max(1000).optional().describe("Task description"),
        dueDate: z.string().optional().describe("Due date in YYYY-MM-DD format"),
        priority: z
          .enum(["high", "medium", "low"])
          .default("medium")
          .describe("Task priority"),
        tags: z.array(z.string()).optional().describe("Tags for categorization"),
        goalId: z
          .string()
          .optional()
          .describe("Optional goal ID to associate this task with"),
      }),
      execute: async ({ userId, supabase }, { title, description, dueDate, priority, tags, goalId }) => {
        const { data, error } = await supabase
          .from("tasks")
          .insert({
            user_id: userId,
            title,
            description: description ?? null,
            due_date: dueDate ? new Date(dueDate).toISOString() : new Date().toISOString(),
            priority,
            tags: tags ?? null,
            status: "pending",
            goal_id: goalId ?? null,
          })
          .select()
          .single();

        if (error) return { success: false as const, error: error.message };
        return { success: true as const, task: { id: data.id, title: data.title } };
      },
    }),

    def({
      name: "update_task",
      description:
        "Update an existing task. Search by keywords in the title to find the task, then apply updates.",
      inputSchema: z.object({
        searchQuery: z.string().describe("Keywords to find the task by title"),
        updates: z.object({
          title: z.string().max(200).optional(),
          priority: z.enum(["high", "medium", "low"]).optional(),
          status: z.enum(["pending", "completed", "skipped"]).optional(),
          dueDate: z.string().optional().describe("YYYY-MM-DD format"),
        }),
      }),
      execute: async ({ userId, supabase }, { searchQuery, updates }) => {
        const { data: tasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .ilike("title", `%${escapeLike(searchQuery)}%`)
          .limit(1);

        if (!tasks || tasks.length === 0) {
          return { success: false as const, error: `No task found matching "${searchQuery}"` };
        }

        const task = tasks[0];
        const updateData: Record<string, unknown> = {};
        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.priority !== undefined) updateData.priority = updates.priority;
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.dueDate) updateData.due_date = new Date(updates.dueDate).toISOString();

        const { error } = await supabase
          .from("tasks")
          .update(updateData)
          .eq("id", task.id)
          .eq("user_id", userId);

        if (error) return { success: false as const, error: error.message };
        return { success: true as const, task: { id: task.id, title: task.title, ...updates } };
      },
    }),

    def({
      name: "delete_task",
      description: "Delete a task by searching for it by title keywords.",
      annotations: { destructiveHint: true },
      inputSchema: z.object({
        searchQuery: z.string().describe("Keywords to find the task to delete"),
      }),
      execute: async ({ userId, supabase }, { searchQuery }) => {
        const { data: tasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .ilike("title", `%${escapeLike(searchQuery)}%`)
          .limit(1);

        if (!tasks || tasks.length === 0) {
          return { success: false as const, error: `No task found matching "${searchQuery}"` };
        }

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

    def({
      name: "list_tasks",
      description: "List the user's tasks, optionally filtered by status or date.",
      annotations: { readOnlyHint: true },
      inputSchema: z.object({
        status: z
          .enum(["pending", "completed", "skipped", "all"])
          .default("all")
          .describe("Filter by status"),
        dateFilter: z
          .enum(["today", "tomorrow", "this_week", "overdue", "all"])
          .default("all")
          .describe("Filter by date range"),
      }),
      execute: async ({ userId, supabase }, { status, dateFilter }) => {
        let query = supabase
          .from("tasks")
          .select("id, title, status, priority, due_date, tags, reflection, goal_id, created_at, carry_over_count")
          .eq("user_id", userId)
          .order("due_date", { ascending: true });

        if (status !== "all") query = query.eq("status", status);

        const now = new Date();
        if (dateFilter === "today") {
          const start = new Date(now);
          start.setHours(0, 0, 0, 0);
          const end = new Date(now);
          end.setHours(23, 59, 59, 999);
          query = query.gte("due_date", start.toISOString()).lte("due_date", end.toISOString());
        } else if (dateFilter === "overdue") {
          query = query.lt("due_date", now.toISOString()).eq("status", "pending");
        }

        const { data, error } = await query.limit(50);
        if (error) return { success: false as const, error: error.message };

        const tasks = data ?? [];

        const uniqueGoalIds = [...new Set(tasks.map((t) => t.goal_id).filter(Boolean))] as string[];
        const goalTitleMap = new Map<string, string>();
        if (uniqueGoalIds.length > 0) {
          const { data: goals } = await supabase
            .from("goals")
            .select("id, title")
            .in("id", uniqueGoalIds);
          for (const g of goals ?? []) {
            goalTitleMap.set(g.id, sanitizeForPrompt(g.title, 200));
          }
        }

        // Tool results feed back into the model across multiple agentic steps.
        // Sanitize user-authored strings so stored task/goal text can't act as
        // indirect prompt injection when it is read back.
        const enrichedTasks = tasks.map((t) => ({
          ...t,
          title: sanitizeForPrompt(t.title, 200),
          reflection: t.reflection ? sanitizeForPrompt(t.reflection, 1000) : t.reflection,
          tags: Array.isArray(t.tags) ? t.tags.map((tag) => sanitizeForPrompt(tag, 100)) : t.tags,
          goalTitle: t.goal_id ? (goalTitleMap.get(t.goal_id) ?? null) : null,
        }));

        return { success: true as const, tasks: enrichedTasks, count: enrichedTasks.length };
      },
    }),

    def({
      name: "list_goals",
      description: "List the user's goals with task progress counts.",
      annotations: { readOnlyHint: true },
      inputSchema: z.object({
        status: z
          .enum(["active", "completed", "all"])
          .default("active")
          .describe("Filter goals by status"),
      }),
      execute: async ({ userId, supabase }, { status }) => {
        let query = supabase
          .from("goals")
          .select("id, title, description, status, priority, created_at")
          .eq("user_id", userId);

        if (status !== "all") query = query.eq("status", status);

        const { data: goals } = await query;
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

            const { data: recentCompleted } = await supabase
              .from("tasks")
              .select("due_date")
              .eq("goal_id", goal.id)
              .eq("status", "completed")
              .order("due_date", { ascending: false })
              .limit(1);

            let daysSinceLastCompletion: number | null = null;
            if (recentCompleted && recentCompleted.length > 0 && recentCompleted[0].due_date) {
              const lastDate = new Date(recentCompleted[0].due_date);
              const now = new Date();
              daysSinceLastCompletion = Math.floor(
                (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)
              );
            }

            return {
              ...goal,
              title: sanitizeForPrompt(goal.title, 200),
              description: goal.description ? sanitizeForPrompt(goal.description, 1000) : goal.description,
              totalTasks: total ?? 0,
              completedTasks: completed ?? 0,
              daysSinceLastCompletion,
            };
          })
        );

        return { success: true as const, goals: goalsWithProgress };
      },
    }),

    def({
      name: "get_accountability_score",
      description:
        "Get the user's current accountability score, tier, streak, and performance metrics. Use when the user asks about their progress, performance, or score.",
      annotations: { readOnlyHint: true },
      inputSchema: z.object({}),
      execute: async ({ userId, supabase }) => {
        const snap = await computeUserAccountability(supabase, userId);
        return {
          success: true as const,
          score: snap.score,
          tier: `${snap.tier.name} (${snap.tier.color})`,
          currentStreak: snap.streak,
          weightedCompletion: snap.weightedCompletion,
          consistencyRate: Math.round(snap.consistencyRate),
          disciplineScore: snap.disciplineScore,
          delta: snap.delta,
          activeDays: Math.round((snap.consistencyRate * 14) / 100),
          windowDays: 14,
          todayProgress: { completed: snap.today.completed, total: snap.today.total },
          drivers: snap.drivers,
        };
      },
    }),

    def({
      name: "save_coach_note",
      description:
        "Save a coaching note to memory. Use to record commitments, recommendations, observed patterns, or excuses for future reference.",
      inputSchema: z.object({
        category: z
          .enum(["commitment", "recommendation", "pattern_flagged", "observation", "excuse_called"])
          .describe("The type of coaching note"),
        content: z.string().max(500).describe("The content of the coaching note"),
        relatedTo: z
          .object({
            taskIds: z.array(z.string()).optional(),
            goalIds: z.array(z.string()).optional(),
            score: z.number().optional(),
          })
          .optional()
          .describe("Optional context linking this note to tasks, goals, or a score"),
        expiresInDays: z.number().default(30).describe("How many days until this note expires"),
      }),
      execute: async ({ userId, supabase }, { category, content, relatedTo, expiresInDays }) => {
        const dbCategory =
          category === "pattern_flagged"
            ? "pattern"
            : category === "excuse_called"
              ? "excuse_flagged"
              : category;

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        const { data, error } = await supabase
          .from("coach_memory")
          .insert({
            user_id: userId,
            category: dbCategory as "commitment" | "recommendation" | "pattern" | "observation" | "excuse_flagged",
            content,
            source: "coach_inline",
            related_to: relatedTo ?? null,
            expires_at: expiresAt.toISOString(),
          })
          .select("id")
          .single();

        if (error) return { success: false as const, error: error.message };
        return { success: true as const, noteId: data.id };
      },
    }),

    def({
      name: "update_coach_note",
      description:
        "Update the status of an existing coaching note. Use to mark commitments as fulfilled or broken.",
      inputSchema: z.object({
        noteId: z.string().describe("The ID of the coaching note to update"),
        status: z.enum(["fulfilled", "broken", "expired"]).describe("The new status for the note"),
      }),
      execute: async ({ userId, supabase }, { noteId, status }) => {
        const { error } = await supabase
          .from("coach_memory")
          .update({ status, updated_at: new Date().toISOString() })
          .eq("id", noteId)
          .eq("user_id", userId);

        if (error) return { success: false as const, error: error.message };
        return { success: true as const };
      },
    }),

    def({
      name: "get_reflection_history",
      description:
        "Get the user's past task reflections. Use to understand how the user has been feeling about their work.",
      annotations: { readOnlyHint: true },
      inputSchema: z.object({
        days: z.number().default(30).describe("How many days back to look for reflections"),
        limit: z.number().default(20).describe("Maximum number of reflections to return"),
      }),
      execute: async ({ userId, supabase }, { days, limit }) => {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const { data, error } = await supabase
          .from("tasks")
          .select("title, reflection, due_date, status")
          .eq("user_id", userId)
          .not("reflection", "is", null)
          .gte("due_date", since.toISOString())
          .order("due_date", { ascending: false })
          .limit(limit);

        if (error) return { success: false as const, error: error.message };

        const reflections = (data ?? []).map((t) => ({
          taskTitle: sanitizeForPrompt(t.title, 200),
          reflection: t.reflection ? sanitizeForPrompt(t.reflection, 1000) : t.reflection,
          dueDate: t.due_date,
          status: t.status,
        }));

        return { success: true as const, reflections };
      },
    }),

    def({
      name: "get_task_history",
      description:
        "Get historical task statistics grouped by status, goal, or day. Use for trend analysis and performance reviews.",
      annotations: { readOnlyHint: true },
      inputSchema: z.object({
        days: z.number().default(30).describe("How many days back to include"),
        groupBy: z
          .enum(["status", "goal", "day"])
          .default("status")
          .describe("How to group the results"),
      }),
      execute: async ({ userId, supabase }, { days, groupBy }) => {
        const since = new Date();
        since.setDate(since.getDate() - days);

        const { data, error } = await supabase
          .from("tasks")
          .select("id, status, due_date, goal_id")
          .eq("user_id", userId)
          .gte("due_date", since.toISOString())
          .order("due_date", { ascending: true });

        if (error) return { success: false as const, error: error.message };

        const allTasks = data ?? [];

        if (groupBy === "status") {
          const completed = allTasks.filter((t) => t.status === "completed").length;
          const skipped = allTasks.filter((t) => t.status === "skipped").length;
          const pending = allTasks.filter((t) => t.status === "pending").length;
          return {
            success: true as const,
            groupBy: "status" as const,
            stats: { completed, skipped, pending, total: allTasks.length },
          };
        }

        if (groupBy === "goal") {
          const uniqueGoalIds = [...new Set(allTasks.map((t) => t.goal_id).filter(Boolean))] as string[];
          const goalTitleMap = new Map<string, string>();
          if (uniqueGoalIds.length > 0) {
            const { data: goals } = await supabase
              .from("goals")
              .select("id, title")
              .in("id", uniqueGoalIds);
            for (const g of goals ?? []) {
              goalTitleMap.set(g.id, sanitizeForPrompt(g.title, 200));
            }
          }

          const grouped: Record<string, { goalTitle: string; completed: number; skipped: number; pending: number; total: number }> = {};
          for (const t of allTasks) {
            const key = t.goal_id ?? "no_goal";
            const goalTitle = t.goal_id ? (goalTitleMap.get(t.goal_id) ?? "Unknown Goal") : "No Goal";
            if (!grouped[key]) grouped[key] = { goalTitle, completed: 0, skipped: 0, pending: 0, total: 0 };
            grouped[key].total++;
            if (t.status === "completed") grouped[key].completed++;
            else if (t.status === "skipped") grouped[key].skipped++;
            else grouped[key].pending++;
          }

          return { success: true as const, groupBy: "goal" as const, stats: Object.values(grouped) };
        }

        const byDay: Record<string, { date: string; completed: number; skipped: number; pending: number; total: number }> = {};
        for (const t of allTasks) {
          const dateStr = t.due_date ? new Date(t.due_date).toISOString().split("T")[0] : "unknown";
          if (!byDay[dateStr]) byDay[dateStr] = { date: dateStr, completed: 0, skipped: 0, pending: 0, total: 0 };
          byDay[dateStr].total++;
          if (t.status === "completed") byDay[dateStr].completed++;
          else if (t.status === "skipped") byDay[dateStr].skipped++;
          else byDay[dateStr].pending++;
        }

        return {
          success: true as const,
          groupBy: "day" as const,
          stats: Object.values(byDay).sort((a, b) => a.date.localeCompare(b.date)),
        };
      },
    }),
  ];
}

/** Goal write tools — new surface for agents (goals were read-only before). */
export function goalWriteToolDefs(): ToolDef[] {
  return [
    def({
      name: "create_goal",
      description: "Create a new goal for the user.",
      inputSchema: createGoalSchema,
      execute: ({ userId, supabase }, input) => createGoal(supabase, userId, input),
    }),
    def({
      name: "update_goal",
      description: "Update an existing goal by id. Only provided fields change.",
      inputSchema: updateGoalSchema,
      execute: ({ userId, supabase }, input) => updateGoal(supabase, userId, input),
    }),
    def({
      name: "delete_goal",
      description: "Delete a goal by id.",
      annotations: { destructiveHint: true },
      inputSchema: z.object({ id: z.string().describe("The goal id to delete") }),
      execute: ({ userId, supabase }, { id }) => deleteGoal(supabase, userId, id),
    }),
  ];
}

/** Check-in / reflection logging tools — the core GrindProof rituals. */
export function checkInToolDefs(): ToolDef[] {
  return [
    def({
      name: "record_morning_checkin",
      description:
        "Record the morning check-in: optionally carry the given still-pending task ids forward to today, and mark the morning ritual complete.",
      inputSchema: morningCheckInSchema,
      execute: ({ userId, supabase }, input) => recordMorningCheckIn(supabase, userId, input),
    }),
    def({
      name: "record_evening_checkin",
      description:
        "Record the evening reality-check: set each task completed or skipped with an optional reflection, carry skipped tasks forward, and mark the evening ritual complete.",
      annotations: { destructiveHint: true },
      inputSchema: eveningReflectionsSchema,
      execute: ({ userId, supabase }, input) => recordEveningReflections(supabase, userId, input),
    }),
    def({
      name: "record_task_reflection",
      description:
        "Record a reflection (and optionally a new status) on a single task by id.",
      inputSchema: taskReflectionSchema,
      execute: ({ userId, supabase }, input) => recordTaskReflection(supabase, userId, input),
    }),
  ];
}

/** Full agent surface exposed over MCP: core + goal write + check-in logging. */
export function allToolDefs(): ToolDef[] {
  return [...coreToolDefs(), ...goalWriteToolDefs(), ...checkInToolDefs()];
}
