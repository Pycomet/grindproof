import { z } from "zod";
import { router, protectedProcedure } from "../context";
import { env } from "@/lib/env";

/**
 * Task schemas
 */
export const taskSchema = z.object({
  id: z.string(),
  userId: z.string(),
  goalId: z.string().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  dueDate: z.date().nullable(),
  startTime: z.date().nullable(),
  endTime: z.date().nullable(),
  reminders: z.array(z.enum(['15min', '1hour', '1day'])).nullable(),
  status: z.enum(["pending", "completed", "skipped"]),
  completionProof: z.string().nullable(),
  tags: z.array(z.string()).nullable(),
  googleCalendarEventId: z.string().nullable(),
  isSyncedWithCalendar: z.boolean(),
  recurrenceRule: z.string().nullable(),
  parentTaskId: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  startTime: z.date().optional(),
  endTime: z.date().optional(),
  reminders: z.array(z.enum(['15min', '1hour', '1day'])).optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  goalId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  recurrenceRule: z.string().optional(),
  syncWithCalendar: z.boolean().default(true),
});

export const updateTaskSchema = z.object({
  id: z.string().min(1, "ID is required"),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  dueDate: z.date().optional(),
  startTime: z.date().optional().nullable(),
  endTime: z.date().optional().nullable(),
  reminders: z.array(z.enum(['15min', '1hour', '1day'])).optional().nullable(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  goalId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(["pending", "completed", "skipped"]).optional(),
  recurrenceRule: z.string().optional(),
  completionProof: z.string().optional().nullable(),
  syncWithCalendar: z.boolean().optional(),
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
    startTime: task.start_time ? new Date(task.start_time) : null,
    endTime: task.end_time ? new Date(task.end_time) : null,
    reminders: task.reminders || null,
    status: task.status as "pending" | "completed" | "skipped",
    completionProof: task.completion_proof || null,
    tags: task.tags || null,
    googleCalendarEventId: task.google_calendar_event_id || null,
    isSyncedWithCalendar: task.is_synced_with_calendar || false,
    recurrenceRule: task.recurrence_rule || null,
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
    startTime?: Date;
    endTime?: Date;
    reminders?: string[];
    recurrenceRule?: string;
  }
) {
  const event: any = {
    summary: task.title,
    description: task.description || "",
  };

  // Handle scheduled time blocks (startTime/endTime take priority)
  if (task.startTime && task.endTime) {
    console.log('Creating time block event:', {
      startTime: task.startTime,
      endTime: task.endTime,
      startISO: task.startTime.toISOString(),
      endISO: task.endTime.toISOString()
    });
    event.start = { 
      dateTime: task.startTime.toISOString(),
      timeZone: 'UTC'
    };
    event.end = { 
      dateTime: task.endTime.toISOString(),
      timeZone: 'UTC'
    };
  } 
  // Handle due date with optional time
  else if (task.dueDate) {
    // Set as all-day event if no specific time, otherwise use dateTime
    const dueDate = new Date(task.dueDate);
    const isAllDay = dueDate.getHours() === 0 && dueDate.getMinutes() === 0;
    
    if (isAllDay) {
      // Format date in local timezone to avoid UTC conversion issues
      // YYYY-MM-DD format required by Google Calendar
      const year = dueDate.getFullYear();
      const month = String(dueDate.getMonth() + 1).padStart(2, '0');
      const day = String(dueDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      event.start = { date: dateStr };
      event.end = { date: dateStr };
    } else {
      event.start = { 
        dateTime: dueDate.toISOString(),
        timeZone: 'UTC'
      };
      event.end = { 
        dateTime: new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour duration
        timeZone: 'UTC'
      };
    }
  }

  // Add reminders
  if (task.reminders && task.reminders.length > 0) {
    console.log('Adding reminders:', task.reminders);
    event.reminders = {
      useDefault: false,
      overrides: task.reminders.map(r => {
        const minutes = r === '15min' ? 15 : r === '1hour' ? 60 : 1440;
        return { method: 'popup', minutes };
      })
    };
    console.log('Reminders configured:', event.reminders);
  } else {
    console.log('No reminders provided:', task.reminders);
  }

  // Add recurrence rule if provided
  if (task.recurrenceRule) {
    // Google Calendar expects RRULE: prefix
    const rruleFormatted = task.recurrenceRule.startsWith('RRULE:') 
      ? task.recurrenceRule 
      : `RRULE:${task.recurrenceRule}`;
    event.recurrence = [rruleFormatted];
    console.log('Adding recurrence rule to Google Calendar:', rruleFormatted);
  }

  console.log('Final event object being sent to Google Calendar:', JSON.stringify(event, null, 2));

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
    startTime?: Date;
    endTime?: Date;
    reminders?: string[];
    recurrenceRule?: string;
  }
) {
  const event: any = {};

  if (updates.title) event.summary = updates.title;
  if (updates.description !== undefined) event.description = updates.description || "";
  
  // Handle scheduled time blocks (startTime/endTime take priority)
  if (updates.startTime !== undefined && updates.endTime !== undefined) {
    if (updates.startTime && updates.endTime) {
      event.start = { 
        dateTime: updates.startTime.toISOString(),
        timeZone: 'UTC'
      };
      event.end = { 
        dateTime: updates.endTime.toISOString(),
        timeZone: 'UTC'
      };
    }
  }
  // Handle due date
  else if (updates.dueDate !== undefined) {
    if (updates.dueDate) {
      const dueDate = new Date(updates.dueDate);
      const isAllDay = dueDate.getHours() === 0 && dueDate.getMinutes() === 0;
      
      if (isAllDay) {
        // Format date in local timezone to avoid UTC conversion
        const year = dueDate.getFullYear();
        const month = String(dueDate.getMonth() + 1).padStart(2, '0');
        const day = String(dueDate.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        event.start = { date: dateStr };
        event.end = { date: dateStr };
      } else {
        event.start = { 
          dateTime: dueDate.toISOString(),
          timeZone: 'UTC'
        };
        event.end = { 
          dateTime: new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString(),
          timeZone: 'UTC'
        };
      }
    }
  }

  // Update reminders if provided
  if (updates.reminders !== undefined) {
    if (updates.reminders && updates.reminders.length > 0) {
      event.reminders = {
        useDefault: false,
        overrides: updates.reminders.map(r => {
          const minutes = r === '15min' ? 15 : r === '1hour' ? 60 : 1440;
          return { method: 'popup', minutes };
        })
      };
    } else {
      event.reminders = { useDefault: true };
    }
  }

  // Update recurrence rule if provided
  if (updates.recurrenceRule !== undefined) {
    if (updates.recurrenceRule) {
      // Google Calendar expects RRULE: prefix
      const rruleFormatted = updates.recurrenceRule.startsWith('RRULE:') 
        ? updates.recurrenceRule 
        : `RRULE:${updates.recurrenceRule}`;
      event.recurrence = [rruleFormatted];
      console.log('Updating recurrence rule in Google Calendar:', rruleFormatted);
    } else {
      // If explicitly set to null/undefined, remove recurrence
      event.recurrence = [];
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
      console.log('Create task input:', {
        title: input.title,
        dueDate: input.dueDate,
        startTime: input.startTime,
        endTime: input.endTime,
        reminders: input.reminders,
        syncWithCalendar: input.syncWithCalendar
      });

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
                  startTime: input.startTime,
                  endTime: input.endTime,
                  reminders: input.reminders,
                  recurrenceRule: input.recurrenceRule || undefined,
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
          start_time: input.startTime ? input.startTime.toISOString() : null,
          end_time: input.endTime ? input.endTime.toISOString() : null,
          reminders: input.reminders || null,
          priority: input.priority || 'medium',
          goal_id: input.goalId || null,
          tags: input.tags || null,
          google_calendar_event_id: googleCalendarEventId,
          is_synced_with_calendar: !!googleCalendarEventId,
          recurrence_rule: input.recurrenceRule || null,
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

      let googleCalendarEventId: string | null = existingTask.google_calendar_event_id;
      let isSyncedWithCalendar = existingTask.is_synced_with_calendar;

      // Get Google Calendar integration if we need it
      const { data: integration } = await ctx.db
        .from("integrations")
        .select("*")
        .eq("user_id", ctx.user.id)
        .eq("service_type", "google_calendar")
        .eq("status", "connected")
        .maybeSingle();

      const credentials = integration?.credentials as { accessToken?: string } | undefined;
      const accessToken = credentials?.accessToken;

      // Handle calendar sync
      if (input.syncWithCalendar && accessToken) {
        try {
          // If task is already synced, update the existing event
          if (existingTask.is_synced_with_calendar && existingTask.google_calendar_event_id) {
            // Only include fields that were actually provided in the update
            const calendarUpdates: {
              title?: string;
              description?: string;
              dueDate?: Date;
              startTime?: Date;
              endTime?: Date;
              reminders?: string[];
              recurrenceRule?: string;
            } = {};
            
            if (input.title !== undefined) calendarUpdates.title = input.title;
            if (input.description !== undefined) calendarUpdates.description = input.description;
            if (input.dueDate !== undefined) calendarUpdates.dueDate = input.dueDate;
            if (input.startTime !== undefined) calendarUpdates.startTime = input.startTime || undefined;
            if (input.endTime !== undefined) calendarUpdates.endTime = input.endTime || undefined;
            if (input.reminders !== undefined) calendarUpdates.reminders = input.reminders || undefined;
            if (input.recurrenceRule !== undefined) calendarUpdates.recurrenceRule = input.recurrenceRule || undefined;
            
            await updateGoogleCalendarEvent(
              accessToken,
              existingTask.google_calendar_event_id,
              calendarUpdates
            );
          } else {
            // Task is not synced yet, create a new calendar event
            const calendarEvent = await createGoogleCalendarEvent(
              accessToken,
              {
                title: input.title || existingTask.title,
                description: input.description !== undefined ? input.description : (existingTask.description || undefined),
                dueDate: input.dueDate !== undefined ? input.dueDate : (existingTask.due_date ? new Date(existingTask.due_date) : undefined),
                startTime: input.startTime !== undefined ? (input.startTime || undefined) : (existingTask.start_time ? new Date(existingTask.start_time) : undefined),
                endTime: input.endTime !== undefined ? (input.endTime || undefined) : (existingTask.end_time ? new Date(existingTask.end_time) : undefined),
                reminders: input.reminders !== undefined ? (input.reminders || undefined) : (Array.isArray(existingTask.reminders) ? existingTask.reminders as string[] : undefined),
                recurrenceRule: input.recurrenceRule !== undefined ? input.recurrenceRule : (existingTask.recurrence_rule || undefined),
              }
            );
            googleCalendarEventId = calendarEvent.id;
            isSyncedWithCalendar = true;
          }
        } catch (error) {
          console.error("Failed to sync with calendar:", error);
          // Continue updating task even if calendar sync fails
        }
      }

      const updateData: Record<string, unknown> = {};

      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined)
        updateData.description = input.description || null;
      if (input.dueDate !== undefined)
        updateData.due_date = input.dueDate ? input.dueDate.toISOString() : null;
      if (input.startTime !== undefined)
        updateData.start_time = input.startTime ? input.startTime.toISOString() : null;
      if (input.endTime !== undefined)
        updateData.end_time = input.endTime ? input.endTime.toISOString() : null;
      if (input.reminders !== undefined)
        updateData.reminders = input.reminders || null;
      if (input.priority !== undefined) updateData.priority = input.priority;
      if (input.goalId !== undefined) updateData.goal_id = input.goalId || null;
      if (input.tags !== undefined) updateData.tags = input.tags || null;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.recurrenceRule !== undefined)
        updateData.recurrence_rule = input.recurrenceRule || null;
      // Only allow completion_proof to be set/updated if task is completed
      if (input.completionProof !== undefined) {
        const finalStatus = input.status !== undefined ? input.status : existingTask.status;
        if (finalStatus === 'completed') {
          updateData.completion_proof = input.completionProof || null;
        } else if (input.completionProof) {
          // If trying to set completion_proof on non-completed task, ignore it
          console.warn('Attempted to set completion_proof on non-completed task, ignoring');
        }
      }
      
      // Update calendar sync fields if they changed
      if (input.syncWithCalendar !== undefined) {
        updateData.is_synced_with_calendar = isSyncedWithCalendar;
        updateData.google_calendar_event_id = googleCalendarEventId;
      }

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
    eventsUrl.searchParams.set("showDeleted", "true");

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
      recurringEventId?: string;
      reminders?: {
        useDefault?: boolean;
        overrides?: Array<{
          method: string;
          minutes: number;
        }>;
      };
    }

    interface CalendarResponse {
      items: CalendarEvent[];
    }

    const calendarData: CalendarResponse = await eventsResponse.json();
    const events = calendarData.items || [];

    // Get all existing tasks with calendar event IDs for this user (single query)
    const { data: existingTasks } = await ctx.db
      .from("tasks")
      .select("id, google_calendar_event_id")
      .eq("user_id", ctx.user.id)
      .not("google_calendar_event_id", "is", null);

    const existingTasksMap = new Map(
      (existingTasks || []).map(t => [t.google_calendar_event_id, t.id])
    );

    const tasksToCreate: any[] = [];
    const tasksToUpdate: any[] = [];
    const tasksToDelete: string[] = [];
    
    // Group recurring events by recurringEventId
    const recurringEventsMap = new Map<string, CalendarEvent[]>();
    const masterEventIds = new Set<string>();

    // Process each event (no DB calls in loop)
    for (const event of events) {
      const existingTaskId = existingTasksMap.get(event.id);

      // Delete tasks for cancelled events
      if (event.status === "cancelled") {
        console.log(`Found cancelled event: ${event.id}`);
        if (existingTaskId) {
          tasksToDelete.push(existingTaskId);
          console.log(`Queued task ${existingTaskId} for deletion`);
        }
        continue;
      }

      // Check if this is a recurring event
      if (event.recurringEventId) {
        // This is an instance of a recurring series
        if (!recurringEventsMap.has(event.recurringEventId)) {
          recurringEventsMap.set(event.recurringEventId, []);
        }
        recurringEventsMap.get(event.recurringEventId)!.push(event);
        masterEventIds.add(event.recurringEventId);
      } else if (event.recurrence && event.recurrence.length > 0) {
        // This is the master recurring event
        masterEventIds.add(event.id);
        if (!recurringEventsMap.has(event.id)) {
          recurringEventsMap.set(event.id, []);
        }
        recurringEventsMap.get(event.id)!.push(event);
      }

      const eventTitle = event.summary || "Untitled Event";
      const eventDescription = event.description || null;
      
      // Extract time information from event
      let dueDate = null;
      let startTime = null;
      let endTime = null;
      
      if (event.start.dateTime && event.end.dateTime) {
        // Event has specific start/end times (scheduled block)
        startTime = new Date(event.start.dateTime);
        endTime = new Date(event.end.dateTime);
        dueDate = startTime; // Use start time as due date for backwards compatibility
      } else if (event.start.date) {
        // All-day event
        dueDate = new Date(event.start.date);
      }
      
      // Extract reminders from event
      let reminders = null;
      if (event.reminders && !event.reminders.useDefault && event.reminders.overrides) {
        reminders = event.reminders.overrides
          .filter((r: any) => r.method === 'popup')
          .map((r: any) => {
            const minutes = r.minutes;
            if (minutes === 15) return '15min';
            if (minutes === 60) return '1hour';
            if (minutes === 1440) return '1day';
            return null;
          })
          .filter((r: any) => r !== null);
        
        if (reminders.length === 0) reminders = null;
      }
      
      // Extract recurrence rule from event
      let recurrenceRule = null;
      if (event.recurrence && event.recurrence.length > 0) {
        // Find RRULE in recurrence array (starts with "RRULE:")
        const rrule = event.recurrence.find((r: string) => r.startsWith('RRULE:'));
        if (rrule) {
          recurrenceRule = rrule.replace('RRULE:', '');
        }
      }
      
      // Determine recurring event ID (master event ID for the series)
      const recurringEventId = event.recurringEventId || (event.recurrence ? event.id : null);

      if (existingTaskId) {
        // Queue for update
        tasksToUpdate.push({
          id: existingTaskId,
          title: eventTitle,
          description: eventDescription,
          due_date: dueDate ? dueDate.toISOString() : null,
          start_time: startTime ? startTime.toISOString() : null,
          end_time: endTime ? endTime.toISOString() : null,
          reminders: reminders,
          recurrence_rule: recurrenceRule,
          recurring_event_id: recurringEventId,
        });
      } else {
        // Queue for creation
        tasksToCreate.push({
          user_id: ctx.user.id,
          title: eventTitle,
          description: eventDescription,
          due_date: dueDate ? dueDate.toISOString() : null,
          start_time: startTime ? startTime.toISOString() : null,
          end_time: endTime ? endTime.toISOString() : null,
          reminders: reminders,
          google_calendar_event_id: event.id,
          is_synced_with_calendar: true,
          status: "pending",
          tags: ["calendar"],
          recurrence_rule: recurrenceRule,
          recurring_event_id: recurringEventId,
        });
      }
    }

    // Batch operations (parallel execution)
    const operations = [];

    // Delete cancelled tasks
    if (tasksToDelete.length > 0) {
      operations.push(
        ctx.db
          .from("tasks")
          .delete()
          .eq("user_id", ctx.user.id)
          .in("id", tasksToDelete)
      );
    }

    // Create new tasks (single batch insert)
    if (tasksToCreate.length > 0) {
      operations.push(
        ctx.db.from("tasks").insert(tasksToCreate)
      );
    }

    // Update existing tasks (batch updates)
    if (tasksToUpdate.length > 0) {
      // Note: Supabase doesn't support batch updates easily, so we do them in parallel
      operations.push(
        ...tasksToUpdate.map(task =>
          ctx.db
            .from("tasks")
            .update({
              title: task.title,
              description: task.description,
              due_date: task.due_date,
              start_time: task.start_time,
              end_time: task.end_time,
              reminders: task.reminders,
              recurrence_rule: task.recurrence_rule,
              recurring_event_id: task.recurring_event_id,
            })
            .eq("id", task.id)
        )
      );
    }

    // Execute all operations in parallel
    try {
      await Promise.all(operations);
    } catch (error) {
      console.error("Error during batch operations:", error);
      throw new Error(`Failed to sync tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const created = tasksToCreate.length;
    const updated = tasksToUpdate.length;
    const deleted = tasksToDelete.length;

    console.log(`Sync completed: ${created} created, ${updated} updated, ${deleted} deleted from ${events.length} total events`);

    return {
      success: true,
      created,
      updated,
      deleted,
      total: events.length,
    };
  }),

  /**
   * Update all tasks in a recurring series
   */
  updateRecurringSeries: protectedProcedure
    .input(z.object({
      recurringEventId: z.string(),
      updates: updateTaskSchema.omit({ id: true }),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get all tasks with this recurring_event_id
      const { data: tasks, error: fetchError } = await ctx.db
        .from("tasks")
        .select("*")
        .eq("user_id", ctx.user.id)
        .eq("recurring_event_id", input.recurringEventId);

      if (fetchError) {
        throw new Error(`Failed to fetch recurring tasks: ${fetchError.message}`);
      }

      if (!tasks || tasks.length === 0) {
        throw new Error("No recurring tasks found");
      }

      // Build update data
      const updateData: Record<string, unknown> = {};
      if (input.updates.title !== undefined) updateData.title = input.updates.title;
      if (input.updates.description !== undefined) updateData.description = input.updates.description || null;
      if (input.updates.priority !== undefined) updateData.priority = input.updates.priority;
      if (input.updates.goalId !== undefined) updateData.goal_id = input.updates.goalId || null;
      if (input.updates.tags !== undefined) updateData.tags = input.updates.tags || null;
      if (input.updates.reminders !== undefined) updateData.reminders = input.updates.reminders || null;

      // Update all tasks in the series
      const { error: updateError } = await ctx.db
        .from("tasks")
        .update(updateData)
        .eq("user_id", ctx.user.id)
        .eq("recurring_event_id", input.recurringEventId);

      if (updateError) {
        throw new Error(`Failed to update recurring tasks: ${updateError.message}`);
      }

      return {
        success: true,
        updatedCount: tasks.length,
      };
    }),

  /**
   * Search tasks using full-text search
   */
  search: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().default(20).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { data, error } = await (ctx.db as any).rpc('search_tasks', {
        query_text: input.query,
        query_user_id: ctx.user.id,
        match_limit: input.limit || 20,
      });

      if (error) {
        throw new Error(`Failed to search tasks: ${error.message}`);
      }

      return (data || []).map(mapTaskFromDb);
    }),
});

