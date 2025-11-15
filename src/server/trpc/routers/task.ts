import { z } from "zod";
import { router, protectedProcedure } from "../context";
import { env } from "@/lib/env";

/**
 * Task schemas
 */
export const recurrencePatternSchema = z.object({
  type: z.enum(["daily", "weekly", "monthly", "custom"]),
  interval: z.number().min(1).default(1),
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  endDate: z.date().optional(),
  rrule: z.string().optional(), // Google Calendar RRULE format
});

export const taskSchema = z.object({
  id: z.string(),
  userId: z.string(),
  goalId: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  dueDate: z.date().nullable(),
  status: z.enum(["pending", "completed", "skipped"]),
  completionProof: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  googleCalendarEventId: z.string().nullable(),
  isSyncedWithCalendar: z.boolean(),
  recurrencePattern: recurrencePatternSchema.nullable(),
  parentTaskId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  goalId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  recurrencePattern: recurrencePatternSchema.optional(),
  syncWithCalendar: z.boolean().default(true),
});

export const updateTaskSchema = z.object({
  id: z.string().min(1, "ID is required"),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  goalId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["pending", "completed", "skipped"]).optional(),
  recurrencePattern: recurrencePatternSchema.optional(),
});

/**
 * Helper function to convert DB row to task object
 */
function mapTaskFromDb(task: any): z.infer<typeof taskSchema> {
  return {
    id: task.id,
    userId: task.user_id,
    goalId: task.goal_id || null,
    title: task.title,
    description: task.description || null,
    dueDate: task.due_date ? new Date(task.due_date) : null,
    status: task.status as "pending" | "completed" | "skipped",
    completionProof: task.completion_proof || null,
    tags: task.tags || null,
    googleCalendarEventId: task.google_calendar_event_id || null,
    isSyncedWithCalendar: task.is_synced_with_calendar || false,
    recurrencePattern: task.recurrence_pattern || null,
    parentTaskId: task.parent_task_id || null,
    createdAt: new Date(task.created_at),
    updatedAt: new Date(task.updated_at),
  };
}

/**
 * Helper function to create Google Calendar event
 */
async function createGoogleCalendarEvent(
  accessToken: string,
  task: {
    title: string;
    description?: string;
    dueDate?: Date;
    recurrencePattern?: z.infer<typeof recurrencePatternSchema> | null;
  }
) {
  const event: any = {
    summary: task.title,
    description: task.description || "",
  };

  if (task.dueDate) {
    // Set as all-day event if no specific time, otherwise use dateTime
    const dueDate = new Date(task.dueDate);
    const isAllDay = dueDate.getHours() === 0 && dueDate.getMinutes() === 0;
    
    if (isAllDay) {
      const dateStr = dueDate.toISOString().split('T')[0];
      event.start = { date: dateStr };
      event.end = { date: dateStr };
    } else {
      event.start = { dateTime: dueDate.toISOString() };
      event.end = { 
        dateTime: new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString() // 1 hour duration
      };
    }
  }

  // Add recurrence rule if provided
  if (task.recurrencePattern?.rrule) {
    event.recurrence = [task.recurrencePattern.rrule];
  }

  const response = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create calendar event: ${response.status} ${errorText}`
    );
  }

  return await response.json();
}

/**
 * Helper function to update Google Calendar event
 */
async function updateGoogleCalendarEvent(
  accessToken: string,
  eventId: string,
  updates: {
    title?: string;
    description?: string;
    dueDate?: Date;
  }
) {
  const event: any = {};

  if (updates.title) event.summary = updates.title;
  if (updates.description !== undefined) event.description = updates.description || "";
  
  if (updates.dueDate) {
    const dueDate = new Date(updates.dueDate);
    const isAllDay = dueDate.getHours() === 0 && dueDate.getMinutes() === 0;
    
    if (isAllDay) {
      const dateStr = dueDate.toISOString().split('T')[0];
      event.start = { date: dateStr };
      event.end = { date: dateStr };
    } else {
      event.start = { dateTime: dueDate.toISOString() };
      event.end = { 
        dateTime: new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString()
      };
    }
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(event),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to update calendar event: ${response.status} ${errorText}`
    );
  }

  return await response.json();
}

/**
 * Helper function to delete Google Calendar event
 */
async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string
) {
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(
      `Failed to delete calendar event: ${response.status} ${errorText}`
    );
  }
}

/**
 * Task router
 * Handles all task-related procedures
 */
export const taskRouter = router({
  /**
   * Get all tasks for the authenticated user with optional filters
   */
  getAll: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "completed", "skipped"]).optional(),
        goalId: z.string().optional(),
        tags: z.array(z.string()).optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.db
        .from("tasks")
        .select("*")
        .eq("user_id", ctx.user.id)
        .order("due_date", { ascending: true, nullsFirst: false });

      // Apply filters
      if (input?.status) {
        query = query.eq("status", input.status);
      }

      if (input?.goalId) {
        query = query.eq("goal_id", input.goalId);
      }

      if (input?.startDate) {
        query = query.gte("due_date", input.startDate.toISOString());
      }

      if (input?.endDate) {
        query = query.lte("due_date", input.endDate.toISOString());
      }

      if (input?.tags && input.tags.length > 0) {
        query = query.overlaps("tags", input.tags);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to fetch tasks: ${error.message}`);
      }

      return (data || []).map(mapTaskFromDb);
    }),

  /**
   * Get a task by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("tasks")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch task: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      return mapTaskFromDb(data);
    }),

  /**
   * Create a new task
   */
  create: protectedProcedure
    .input(createTaskSchema)
    .mutation(async ({ ctx, input }) => {
      let googleCalendarEventId: string | null = null;

      // If sync with calendar is enabled, create the event first
      if (input.syncWithCalendar) {
        try {
          // Get Google Calendar integration
          const { data: integration } = await ctx.db
            .from("integrations")
            .select("*")
            .eq("user_id", ctx.user.id)
            .eq("service_type", "google_calendar")
            .eq("status", "connected")
            .maybeSingle();

          if (integration) {
            const credentials = integration.credentials as {
              accessToken?: string;
            };
            const accessToken = credentials?.accessToken;

            if (accessToken) {
              const calendarEvent = await createGoogleCalendarEvent(
                accessToken,
                {
                  title: input.title,
                  description: input.description,
                  dueDate: input.dueDate,
                  recurrencePattern: input.recurrencePattern || null,
                }
              );
              googleCalendarEventId = calendarEvent.id;
            }
          }
        } catch (error) {
          console.error("Failed to create calendar event:", error);
          // Continue creating task even if calendar sync fails
        }
      }

      // Create task in database
      const { data, error } = await ctx.db
        .from("tasks")
        .insert({
          user_id: ctx.user.id,
          title: input.title,
          description: input.description || null,
          due_date: input.dueDate ? input.dueDate.toISOString() : null,
          goal_id: input.goalId || null,
          tags: input.tags || null,
          google_calendar_event_id: googleCalendarEventId,
          is_synced_with_calendar: !!googleCalendarEventId,
          recurrence_pattern: input.recurrencePattern || null,
          status: "pending",
        })
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to create task: ${error.message}`);
      }

      if (!data) {
        throw new Error("Failed to create task: No data returned");
      }

      return mapTaskFromDb(data);
    }),

  /**
   * Update a task
   */
  update: protectedProcedure
    .input(updateTaskSchema)
    .mutation(async ({ ctx, input }) => {
      // Get existing task to check if it's synced with calendar
      const { data: existingTask } = await ctx.db
        .from("tasks")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      if (!existingTask) {
        throw new Error("Task not found or access denied");
      }

      // If task is synced with calendar, update the calendar event
      if (existingTask.is_synced_with_calendar && existingTask.google_calendar_event_id) {
        try {
          const { data: integration } = await ctx.db
            .from("integrations")
            .select("*")
            .eq("user_id", ctx.user.id)
            .eq("service_type", "google_calendar")
            .eq("status", "connected")
            .maybeSingle();

          if (integration) {
            const credentials = integration.credentials as {
              accessToken?: string;
            };
            const accessToken = credentials?.accessToken;

            if (accessToken) {
              await updateGoogleCalendarEvent(
                accessToken,
                existingTask.google_calendar_event_id,
                {
                  title: input.title,
                  description: input.description,
                  dueDate: input.dueDate,
                }
              );
            }
          }
        } catch (error) {
          console.error("Failed to update calendar event:", error);
          // Continue updating task even if calendar sync fails
        }
      }

      const updateData: Record<string, unknown> = {};

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined)
        updateData.description = input.description || null;
      if (input.dueDate !== undefined)
        updateData.due_date = input.dueDate ? input.dueDate.toISOString() : null;
      if (input.goalId !== undefined) updateData.goal_id = input.goalId || null;
      if (input.tags !== undefined) updateData.tags = input.tags || null;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.recurrencePattern !== undefined)
        updateData.recurrence_pattern = input.recurrencePattern || null;

      const { data, error } = await ctx.db
        .from("tasks")
        .update(updateData)
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to update task: ${error.message}`);
      }

      if (!data) {
        throw new Error("Failed to update task: No data returned");
      }

      return mapTaskFromDb(data);
    }),

  /**
   * Delete a task
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Get task to check if it's synced with calendar
      const { data: task } = await ctx.db
        .from("tasks")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      if (!task) {
        throw new Error("Task not found or access denied");
      }

      // If synced with calendar, delete the calendar event
      if (task.is_synced_with_calendar && task.google_calendar_event_id) {
        try {
          const { data: integration } = await ctx.db
            .from("integrations")
            .select("*")
            .eq("user_id", ctx.user.id)
            .eq("service_type", "google_calendar")
            .eq("status", "connected")
            .maybeSingle();

          if (integration) {
            const credentials = integration.credentials as {
              accessToken?: string;
            };
            const accessToken = credentials?.accessToken;

            if (accessToken) {
              await deleteGoogleCalendarEvent(
                accessToken,
                task.google_calendar_event_id
              );
            }
          }
        } catch (error) {
          console.error("Failed to delete calendar event:", error);
          // Continue deleting task even if calendar deletion fails
        }
      }

      const { error } = await ctx.db
        .from("tasks")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);

      if (error) {
        throw new Error(`Failed to delete task: ${error.message}`);
      }

      return { success: true, id: input.id };
    }),

  /**
   * Mark task as complete with optional proof
   */
  complete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        proof: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("tasks")
        .update({
          status: "completed",
          completion_proof: input.proof || null,
        })
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to complete task: ${error.message}`);
      }

      if (!data) {
        throw new Error("Task not found or access denied");
      }

      return mapTaskFromDb(data);
    }),

  /**
   * Mark task as skipped
   */
  skip: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("tasks")
        .update({ status: "skipped" })
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to skip task: ${error.message}`);
      }

      if (!data) {
        throw new Error("Task not found or access denied");
      }

      return mapTaskFromDb(data);
    }),

  /**
   * Reschedule a task to a new date
   */
  reschedule: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        newDueDate: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get existing task
      const { data: existingTask } = await ctx.db
        .from("tasks")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      if (!existingTask) {
        throw new Error("Task not found or access denied");
      }

      // Update calendar event if synced
      if (existingTask.is_synced_with_calendar && existingTask.google_calendar_event_id) {
        try {
          const { data: integration } = await ctx.db
            .from("integrations")
            .select("*")
            .eq("user_id", ctx.user.id)
            .eq("service_type", "google_calendar")
            .eq("status", "connected")
            .maybeSingle();

          if (integration) {
            const credentials = integration.credentials as {
              accessToken?: string;
            };
            const accessToken = credentials?.accessToken;

            if (accessToken) {
              await updateGoogleCalendarEvent(
                accessToken,
                existingTask.google_calendar_event_id,
                {
                  dueDate: input.newDueDate,
                }
              );
            }
          }
        } catch (error) {
          console.error("Failed to update calendar event:", error);
        }
      }

      const { data, error } = await ctx.db
        .from("tasks")
        .update({
          due_date: input.newDueDate.toISOString(),
          status: "pending", // Reset to pending when rescheduled
        })
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to reschedule task: ${error.message}`);
      }

      if (!data) {
        throw new Error("Task not found or access denied");
      }

      return mapTaskFromDb(data);
    }),

  /**
   * Sync tasks from Google Calendar
   * Pulls events from the last 7 days to next 30 days
   */
  syncFromCalendar: protectedProcedure.mutation(async ({ ctx }) => {
    // Get Google Calendar integration
    const { data: integration } = await ctx.db
      .from("integrations")
      .select("*")
      .eq("user_id", ctx.user.id)
      .eq("service_type", "google_calendar")
      .eq("status", "connected")
      .maybeSingle();

    if (!integration) {
      throw new Error("Google Calendar not connected");
    }

    const credentials = integration.credentials as {
      accessToken?: string;
      refreshToken?: string;
      expiresAt?: string;
    };

    let accessToken = credentials?.accessToken;
    const refreshToken = credentials?.refreshToken;
    const expiresAt = credentials?.expiresAt;

    if (!accessToken) {
      throw new Error("Google Calendar access token not found");
    }

    // Check if token is expired and refresh if needed
    if (expiresAt) {
      const expiryDate = new Date(expiresAt);
      const now = new Date();

      if (expiryDate.getTime() - now.getTime() < 5 * 60 * 1000) {
        if (refreshToken) {
          try {
            const tokenResponse = await fetch(
              "https://oauth2.googleapis.com/token",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/x-www-form-urlencoded",
                },
                body: new URLSearchParams({
                  client_id: env.NEXT_GOOGLE_CALENDAR_CLIENT_ID,
                  client_secret: env.NEXT_GOOGLE_CALENDAR_CLIENT_SECRET,
                  refresh_token: refreshToken,
                  grant_type: "refresh_token",
                }),
              }
            );

            if (tokenResponse.ok) {
              const tokenData = (await tokenResponse.json()) as {
                access_token: string;
                expires_in: number;
              };

              accessToken = tokenData.access_token;
              const newExpiresAt = new Date(
                Date.now() + tokenData.expires_in * 1000
              ).toISOString();

              // Update token in database
              await ctx.db
                .from("integrations")
                .update({
                  credentials: {
                    accessToken,
                    refreshToken,
                    expiresAt: newExpiresAt,
                  },
                })
                .eq("user_id", ctx.user.id)
                .eq("service_type", "google_calendar");
            }
          } catch (error) {
            console.error("Failed to refresh token:", error);
            throw new Error("Failed to refresh Google Calendar token");
          }
        } else {
          throw new Error("No refresh token available");
        }
      }
    }

    // Calculate time range (7 days ago to 30 days forward)
    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - 7);
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 30);

    // Fetch events from Google Calendar
    const calendarId = "primary";
    const eventsUrl = new URL(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`
    );
    eventsUrl.searchParams.set("timeMin", timeMin.toISOString());
    eventsUrl.searchParams.set("timeMax", timeMax.toISOString());
    eventsUrl.searchParams.set("singleEvents", "true");
    eventsUrl.searchParams.set("orderBy", "startTime");
    eventsUrl.searchParams.set("maxResults", "250");

    const eventsResponse = await fetch(eventsUrl.toString(), {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!eventsResponse.ok) {
      const errorText = await eventsResponse.text();
      throw new Error(
        `Google Calendar API error: ${eventsResponse.status} ${errorText}`
      );
    }

    interface CalendarEvent {
      id: string;
      summary?: string;
      description?: string;
      start: {
        dateTime?: string;
        date?: string;
      };
      end: {
        dateTime?: string;
        date?: string;
      };
      status: string;
      recurrence?: string[];
    }

    interface CalendarResponse {
      items: CalendarEvent[];
    }

    const calendarData: CalendarResponse = await eventsResponse.json();
    const events = calendarData.items || [];

    let created = 0;
    let updated = 0;

    // Process each event
    for (const event of events) {
      // Skip cancelled events
      if (event.status === "cancelled") {
        // Check if task exists and mark as deleted or completed
        const { data: existingTask } = await ctx.db
          .from("tasks")
          .select("id")
          .eq("user_id", ctx.user.id)
          .eq("google_calendar_event_id", event.id)
          .maybeSingle();

        if (existingTask) {
          await ctx.db
            .from("tasks")
            .update({ status: "skipped" })
            .eq("id", existingTask.id);
        }
        continue;
      }

      const eventTitle = event.summary || "Untitled Event";
      const eventDescription = event.description || null;
      const eventStart = event.start.dateTime || event.start.date;
      const dueDate = eventStart ? new Date(eventStart) : null;

      // Check if task already exists
      const { data: existingTask } = await ctx.db
        .from("tasks")
        .select("*")
        .eq("user_id", ctx.user.id)
        .eq("google_calendar_event_id", event.id)
        .maybeSingle();

      if (existingTask) {
        // Update existing task
        await ctx.db
          .from("tasks")
          .update({
            title: eventTitle,
            description: eventDescription,
            due_date: dueDate ? dueDate.toISOString() : null,
          })
          .eq("id", existingTask.id);
        updated++;
      } else {
        // Create new task from calendar event
        await ctx.db.from("tasks").insert({
          user_id: ctx.user.id,
          title: eventTitle,
          description: eventDescription,
          due_date: dueDate ? dueDate.toISOString() : null,
          google_calendar_event_id: event.id,
          is_synced_with_calendar: true,
          status: "pending",
          tags: ["calendar"],
        });
        created++;
      }
    }

    return {
      success: true,
      created,
      updated,
      total: events.length,
    };
  }),
});

