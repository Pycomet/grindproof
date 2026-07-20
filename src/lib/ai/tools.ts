import { tool } from "ai";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { computeUserAccountability } from "@/lib/accountability/compute";

/** Escape Postgres LIKE/ILIKE wildcards so user input is treated literally. */
function escapeLike(str: string): string {
  return str.replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export function createGrindproofTools(
  userId: string,
  supabase: SupabaseClient<Database>
) {
  return {
    create_task: tool({
      description:
        "Create a new task for the user. Use when they mention wanting to do something, add a task, or plan an activity.",
      inputSchema: z.object({
        title: z.string().max(200).describe("Task title"),
        description: z.string().max(1000).optional().describe("Task description"),
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
        goalId: z
          .string()
          .optional()
          .describe("Optional goal ID to associate this task with"),
      }),
      execute: async ({ title, description, dueDate, priority, tags, goalId }) => {
        const { data, error } = await supabase
          .from("tasks")
          .insert({
            user_id: userId,
            title,
            description: description ?? null,
            due_date: dueDate
              ? new Date(dueDate).toISOString()
              : new Date().toISOString(),
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

    update_task: tool({
      description:
        "Update an existing task. Search by keywords in the title to find the task, then apply updates.",
      inputSchema: z.object({
        searchQuery: z
          .string()
          .describe("Keywords to find the task by title"),
        updates: z.object({
          title: z.string().max(200).optional(),
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
          .ilike("title", `%${escapeLike(searchQuery)}%`)
          .limit(1);

        if (!tasks || tasks.length === 0) {
          return {
            success: false as const,
            error: `No task found matching "${searchQuery}"`,
          };
        }

        const task = tasks[0];
        const updateData: Record<string, unknown> = {};
        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.priority !== undefined) updateData.priority = updates.priority;
        if (updates.status !== undefined) updateData.status = updates.status;
        if (updates.dueDate)
          updateData.due_date = new Date(updates.dueDate).toISOString();

        const { error } = await supabase
          .from("tasks")
          .update(updateData)
          .eq("id", task.id)
          .eq("user_id", userId);

        if (error) return { success: false as const, error: error.message };
        return {
          success: true as const,
          task: { id: task.id, title: task.title, ...updates },
        };
      },
    }),

    delete_task: tool({
      description: "Delete a task by searching for it by title keywords.",
      inputSchema: z.object({
        searchQuery: z
          .string()
          .describe("Keywords to find the task to delete"),
      }),
      execute: async ({ searchQuery }) => {
        const { data: tasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("user_id", userId)
          .ilike("title", `%${escapeLike(searchQuery)}%`)
          .limit(1);

        if (!tasks || tasks.length === 0) {
          return {
            success: false as const,
            error: `No task found matching "${searchQuery}"`,
          };
        }

        const task = tasks[0];
        const { error } = await supabase
          .from("tasks")
          .delete()
          .eq("id", task.id)
          .eq("user_id", userId);

        if (error) return { success: false as const, error: error.message };
        return {
          success: true as const,
          deleted: { id: task.id, title: task.title },
        };
      },
    }),

    list_tasks: tool({
      description:
        "List the user's tasks, optionally filtered by status or date.",
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
      execute: async ({ status, dateFilter }) => {
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
          query = query
            .gte("due_date", start.toISOString())
            .lte("due_date", end.toISOString());
        } else if (dateFilter === "overdue") {
          query = query
            .lt("due_date", now.toISOString())
            .eq("status", "pending");
        }

        const { data, error } = await query.limit(50);
        if (error) return { success: false as const, error: error.message };

        const tasks = data ?? [];

        // Enrich tasks with goal titles
        const uniqueGoalIds = [...new Set(tasks.map((t) => t.goal_id).filter(Boolean))] as string[];
        const goalTitleMap = new Map<string, string>();

        if (uniqueGoalIds.length > 0) {
          const { data: goals } = await supabase
            .from("goals")
            .select("id, title")
            .in("id", uniqueGoalIds);

          for (const g of goals ?? []) {
            goalTitleMap.set(g.id, g.title);
          }
        }

        const enrichedTasks = tasks.map((t) => ({
          ...t,
          goalTitle: t.goal_id ? (goalTitleMap.get(t.goal_id) ?? null) : null,
        }));

        return {
          success: true as const,
          tasks: enrichedTasks,
          count: enrichedTasks.length,
        };
      },
    }),

    list_goals: tool({
      description: "List the user's goals with task progress counts.",
      inputSchema: z.object({
        status: z
          .enum(["active", "completed", "all"])
          .default("active")
          .describe("Filter goals by status"),
      }),
      execute: async ({ status }) => {
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

            // Get most recent completed task for staleness
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
              totalTasks: total ?? 0,
              completedTasks: completed ?? 0,
              daysSinceLastCompletion,
            };
          })
        );

        return { success: true as const, goals: goalsWithProgress };
      },
    }),

    get_accountability_score: tool({
      description:
        "Get the user's current accountability score, tier, streak, and performance metrics. Use when the user asks about their progress, performance, or score.",
      inputSchema: z.object({}),
      execute: async () => {
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
          activeDays: Math.round(snap.consistencyRate * 14 / 100),
          windowDays: 14,
          todayProgress: {
            completed: snap.today.completed,
            total: snap.today.total,
          },
          drivers: snap.drivers,
        };
      },
    }),

    save_coach_note: tool({
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
        expiresInDays: z
          .number()
          .default(30)
          .describe("How many days until this note expires"),
      }),
      execute: async ({ category, content, relatedTo, expiresInDays }) => {
        // Map input category to DB category
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

    update_coach_note: tool({
      description:
        "Update the status of an existing coaching note. Use to mark commitments as fulfilled or broken.",
      inputSchema: z.object({
        noteId: z.string().describe("The ID of the coaching note to update"),
        status: z
          .enum(["fulfilled", "broken", "expired"])
          .describe("The new status for the note"),
      }),
      execute: async ({ noteId, status }) => {
        const { error } = await supabase
          .from("coach_memory")
          .update({
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", noteId)
          .eq("user_id", userId);

        if (error) return { success: false as const, error: error.message };
        return { success: true as const };
      },
    }),

    get_reflection_history: tool({
      description:
        "Get the user's past task reflections. Use to understand how the user has been feeling about their work.",
      inputSchema: z.object({
        days: z
          .number()
          .default(30)
          .describe("How many days back to look for reflections"),
        limit: z
          .number()
          .default(20)
          .describe("Maximum number of reflections to return"),
      }),
      execute: async ({ days, limit }) => {
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
          taskTitle: t.title,
          reflection: t.reflection,
          dueDate: t.due_date,
          status: t.status,
        }));

        return { success: true as const, reflections };
      },
    }),

    get_task_history: tool({
      description:
        "Get historical task statistics grouped by status, goal, or day. Use for trend analysis and performance reviews.",
      inputSchema: z.object({
        days: z
          .number()
          .default(30)
          .describe("How many days back to include"),
        groupBy: z
          .enum(["status", "goal", "day"])
          .default("status")
          .describe("How to group the results"),
      }),
      execute: async ({ days, groupBy }) => {
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
              goalTitleMap.set(g.id, g.title);
            }
          }

          const grouped: Record<string, { goalTitle: string; completed: number; skipped: number; pending: number; total: number }> = {};
          for (const t of allTasks) {
            const key = t.goal_id ?? "no_goal";
            const goalTitle = t.goal_id ? (goalTitleMap.get(t.goal_id) ?? "Unknown Goal") : "No Goal";
            if (!grouped[key]) {
              grouped[key] = { goalTitle, completed: 0, skipped: 0, pending: 0, total: 0 };
            }
            grouped[key].total++;
            if (t.status === "completed") grouped[key].completed++;
            else if (t.status === "skipped") grouped[key].skipped++;
            else grouped[key].pending++;
          }

          return {
            success: true as const,
            groupBy: "goal" as const,
            stats: Object.values(grouped),
          };
        }

        // groupBy === "day"
        const byDay: Record<string, { date: string; completed: number; skipped: number; pending: number; total: number }> = {};
        for (const t of allTasks) {
          const dateStr = t.due_date ? new Date(t.due_date).toISOString().split("T")[0] : "unknown";
          if (!byDay[dateStr]) {
            byDay[dateStr] = { date: dateStr, completed: 0, skipped: 0, pending: 0, total: 0 };
          }
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
  };
}
