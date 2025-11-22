import { z } from "zod";
import { router, protectedProcedure } from "../context";
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from "@/lib/env";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(env.NEXT_GOOGLE_GEMINI_API_KEY);

export const dailyCheckRouter = router({
  /**
   * Get morning schedule: Calendar events + existing tasks for today
   */
  getMorningSchedule: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get existing tasks for today
    const { data: tasks, error: tasksError } = await ctx.db
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .gte("due_date", today.toISOString())
      .lt("due_date", tomorrow.toISOString())
      .order("start_time", { ascending: true });

    if (tasksError) {
      throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
    }

    // Get calendar events from Google Calendar integration
    // Note: This would call the Google Calendar API via the integration
    // For now, return empty array if no integration
    const { data: integration } = await ctx.db
      .from("integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("service_type", "google_calendar")
      .eq("status", "connected")
      .maybeSingle();

    let calendarEvents: any[] = [];
    // TODO: If integration exists, fetch today's events from Google Calendar API
    // This would be implemented in the integration router

    return {
      tasks: tasks || [],
      calendarEvents,
      hasCalendarIntegration: !!integration,
    };
  }),

  /**
   * Save morning plan: Batch create tasks from AI + Calendar
   */
  saveMorningPlan: protectedProcedure
    .input(
      z.object({
        tasks: z.array(
          z.object({
            title: z.string(),
            description: z.string().optional(),
            dueDate: z.string().optional(),
            startTime: z.string().optional(),
            endTime: z.string().optional(),
            goalId: z.string().optional(),
            priority: z.enum(["high", "medium", "low"]).optional(),
            syncToCalendar: z.boolean().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Batch insert tasks
      const tasksToInsert = input.tasks.map((task) => ({
        user_id: userId,
        title: task.title,
        description: task.description || null,
        due_date: task.dueDate || new Date().toISOString(),
        start_time: task.startTime || null,
        end_time: task.endTime || null,
        goal_id: task.goalId || null,
        priority: task.priority || "medium",
        status: "pending" as const,
      }));

      const { data, error } = await ctx.db
        .from("tasks")
        .insert(tasksToInsert)
        .select();

      if (error) {
        throw new Error(`Failed to create tasks: ${error.message}`);
      }

      // TODO: Sync tasks to calendar for tasks with syncToCalendar=true
      // This would require Google Calendar API integration
      const tasksToSync = input.tasks.filter(t => t.syncToCalendar && t.startTime);
      if (tasksToSync.length > 0) {
        // Future: Call Google Calendar API to create events
        console.log(`${tasksToSync.length} tasks marked for calendar sync`);
      }

      return {
        success: true,
        tasks: data,
        count: data?.length || 0,
      };
    }),

  /**
   * Refine tasks using LLM when local parsing is not confident
   */
  refineTasks: protectedProcedure
    .input(
      z.object({
        input: z.string(),
        locallyParsed: z.array(z.object({
          title: z.string(),
          description: z.string().optional(),
          startTime: z.string().optional(),
          endTime: z.string().optional(),
          priority: z.enum(['high', 'medium', 'low']).optional(),
          estimatedDuration: z.number().optional(),
        })).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const systemPrompt = `You are a task parser. Parse natural language priorities into structured task JSON.

Return ONLY a JSON object with this exact format:
{"tasks": [{"title": "...", "startTime": "...", "endTime": "...", "estimatedDuration": ..., "priority": "..."}]}

Rules:
- title: required, string
- startTime: optional, HH:MM 24-hour format (e.g., "18:00" for 6pm)
- endTime: optional, HH:MM 24-hour format
- estimatedDuration: optional, number in minutes
- priority: optional, "high", "medium", or "low"

Examples:
Input: "Go to gym at 6pm"
Output: {"tasks": [{"title": "Go to gym", "startTime": "18:00", "priority": "medium"}]}

Input: "Work on feature for 2 hours"
Output: {"tasks": [{"title": "Work on feature", "estimatedDuration": 120, "priority": "medium"}]}

Input: "High priority: finish report by 3pm"
Output: {"tasks": [{"title": "Finish report", "endTime": "15:00", "priority": "high"}]}`;

      const userPrompt = `Parse these priorities:\n\n${input.input}`;

      try {
        // Get Gemini model
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          systemInstruction: systemPrompt,
          generationConfig: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        });

        // Generate content
        const result = await model.generateContent(userPrompt);
        const response = await result.response;
        const text = response.text();

        // Parse JSON response
        const parsed = JSON.parse(text);
        return { tasks: parsed.tasks || [] };
      } catch (error: any) {
        console.error('Gemini task parsing error:', error);
        // Return locally parsed tasks as fallback
        return { tasks: input.locallyParsed || [] };
      }
    }),

  /**
   * Get evening comparison: Planned vs Actual
   */
  getEveningComparison: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's tasks with evidence
    const { data: tasks, error: tasksError } = await ctx.db
      .from("tasks")
      .select("*, evidence(*)")
      .eq("user_id", userId)
      .gte("due_date", today.toISOString())
      .lt("due_date", tomorrow.toISOString())
      .order("start_time", { ascending: true });

    if (tasksError) {
      throw new Error(`Failed to fetch tasks: ${tasksError.message}`);
    }

    // Get existing reflection for today (if any)
    const { data: existingReflection } = await ctx.db
      .from("accountability_scores")
      .select("*")
      .eq("user_id", userId)
      .eq("week_start", today.toISOString().split('T')[0])
      .maybeSingle();

    // Calculate stats
    const totalTasks = tasks?.length || 0;
    const completedTasks = tasks?.filter((t) => t.status === "completed").length || 0;
    const pendingTasks = tasks?.filter((t) => t.status === "pending").length || 0;
    const skippedTasks = tasks?.filter((t) => t.status === "skipped").length || 0;

    // Calculate alignment score as decimal (0.0-1.0)
    const alignmentScore = totalTasks > 0 
      ? (completedTasks / totalTasks) 
      : 0;

    // Get GitHub activity (if integration exists)
    const { data: githubIntegration } = await ctx.db
      .from("integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("service_type", "github")
      .eq("status", "connected")
      .maybeSingle();

    // Get Calendar activity
    const { data: calendarIntegration } = await ctx.db
      .from("integrations")
      .select("*")
      .eq("user_id", userId)
      .eq("service_type", "google_calendar")
      .eq("status", "connected")
      .maybeSingle();

    return {
      tasks: tasks || [],
      stats: {
        total: totalTasks,
        completed: completedTasks,
        pending: pendingTasks,
        skipped: skippedTasks,
        alignmentScore,
      },
      integrations: {
        hasGitHub: !!githubIntegration,
        hasCalendar: !!calendarIntegration,
      },
      existingReflection: existingReflection ? {
        reflections: (existingReflection.roast_metadata as any)?.reflections || {},
        evidenceUrls: (existingReflection.roast_metadata as any)?.evidenceUrls || {},
      } : null,
    };
  }),

  /**
   * Save evening reflection: Explanations + Score
   */
  saveEveningReflection: protectedProcedure
    .input(
      z.object({
        date: z.string(),
        alignmentScore: z.number(),
        reflections: z.record(z.string()), // taskId -> reflection text
        evidenceUrls: z.record(z.array(z.string())).optional(), // taskId -> evidence URLs
        completedTasks: z.number(),
        totalTasks: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Format date as YYYY-MM-DD for consistent comparison
      const dateStr = input.date.split('T')[0];
      
      // Save to accountability_scores table (upsert to handle multiple check-ins on same day)
      const { data, error } = await ctx.db
        .from("accountability_scores")
        .upsert({
          user_id: userId,
          week_start: dateStr, // Using date field for daily score
          alignment_score: input.alignmentScore,
          completed_tasks: input.completedTasks,
          total_tasks: input.totalTasks,
          roast_metadata: {
            reflections: input.reflections,
            evidenceUrls: input.evidenceUrls || {},
            checkInType: "evening",
            completedAt: new Date().toISOString(),
          },
        }, {
          onConflict: 'user_id,week_start'
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save reflection: ${error.message}`);
      }

      return {
        success: true,
        score: data,
      };
    }),
});

