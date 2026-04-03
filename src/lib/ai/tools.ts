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
      inputSchema: z.object({
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
            description: description ?? null,
            due_date: dueDate
              ? new Date(dueDate).toISOString()
              : new Date().toISOString(),
            priority,
            tags: tags ?? null,
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
      inputSchema: z.object({
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

        if (!tasks || tasks.length === 0) {
          return {
            success: false as const,
            error: `No task found matching "${searchQuery}"`,
          };
        }

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
          .ilike("title", `%${searchQuery}%`)
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
          query = query
            .lt("due_date", now.toISOString())
            .eq("status", "pending");
        }

        const { data, error } = await query.limit(50);
        if (error) return { success: false as const, error: error.message };
        return {
          success: true as const,
          tasks: data ?? [],
          count: data?.length ?? 0,
        };
      },
    }),

    list_goals: tool({
      description: "List the user's goals with task progress counts.",
      inputSchema: z.object({}),
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
              totalTasks: total ?? 0,
              completedTasks: completed ?? 0,
            };
          })
        );

        return { success: true as const, goals: goalsWithProgress };
      },
    }),
  };
}
