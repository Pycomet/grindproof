// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
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
      execute: async ({ title, description, dueDate, priority, tags }: any) => {
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
      execute: async ({ searchQuery, updates }: any) => {
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
      execute: async ({ searchQuery }: any) => {
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
      execute: async ({ status, dateFilter }: any) => {
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
