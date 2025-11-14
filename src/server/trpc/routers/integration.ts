import { z } from "zod";
import { router, protectedProcedure } from "../context";
import { env } from "@/lib/env";

/**
 * Integration schemas
 */
export const integrationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  serviceType: z.string(),
  credentials: z.record(z.unknown()),
  status: z.enum(["connected", "disconnected", "error"]),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const createIntegrationSchema = z.object({
  serviceType: z.string().min(1, "Service type is required"),
  credentials: z.record(z.unknown()),
  metadata: z.record(z.unknown()).optional(),
  status: z.enum(["connected", "disconnected", "error"]).optional(),
});

export const updateIntegrationSchema = z.object({
  id: z.string(),
  credentials: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
  status: z.enum(["connected", "disconnected", "error"]).optional(),
});

/**
 * Integration router
 * Handles all integration-related procedures
 */
export const integrationRouter = router({
  /**
   * Get all integrations for current user
   */
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("integrations")
      .select("*")
      .eq("user_id", ctx.user.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch integrations: ${error.message}`);
    }

    return (data || []).map((integration) => ({
      id: integration.id,
      userId: integration.user_id,
      serviceType: integration.service_type,
      credentials: integration.credentials,
      status: integration.status as "connected" | "disconnected" | "error",
      metadata: integration.metadata || undefined,
      createdAt: new Date(integration.created_at),
      updatedAt: new Date(integration.updated_at),
    }));
  }),

  /**
   * Get integration by service type
   */
  getByServiceType: protectedProcedure
    .input(z.object({ serviceType: z.string() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("integrations")
        .select("*")
        .eq("user_id", ctx.user.id)
        .eq("service_type", input.serviceType)
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to fetch integration: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        serviceType: data.service_type,
        credentials: data.credentials,
        status: data.status as "connected" | "disconnected" | "error",
        metadata: data.metadata || undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    }),

  /**
   * Create or update an integration (upsert)
   */
  create: protectedProcedure
    .input(createIntegrationSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("integrations")
        .upsert(
          {
            user_id: ctx.user.id,
            service_type: input.serviceType,
            credentials: input.credentials,
            status: input.status || "connected",
            metadata: input.metadata || null,
          },
          {
            onConflict: "user_id,service_type",
          }
        )
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to create integration: ${error.message}`);
      }

      if (!data) {
        throw new Error("Failed to create integration: No data returned");
      }

      return {
        id: data.id,
        userId: data.user_id,
        serviceType: data.service_type,
        credentials: data.credentials,
        status: data.status as "connected" | "disconnected" | "error",
        metadata: data.metadata || undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    }),

  /**
   * Update an integration
   */
  update: protectedProcedure
    .input(updateIntegrationSchema)
    .mutation(async ({ ctx, input }) => {
      // First verify the integration belongs to the user
      const { data: existingIntegration } = await ctx.db
        .from("integrations")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      if (!existingIntegration) {
        throw new Error("Integration not found or access denied");
      }

      const updateData: Record<string, unknown> = {};

      if (input.credentials !== undefined) updateData.credentials = input.credentials;
      if (input.metadata !== undefined) updateData.metadata = input.metadata || null;
      if (input.status !== undefined) updateData.status = input.status;

      const { data, error } = await ctx.db
        .from("integrations")
        .update(updateData)
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .select()
        .maybeSingle();

      if (error) {
        throw new Error(`Failed to update integration: ${error.message}`);
      }

      if (!data) {
        throw new Error("Failed to update integration: No data returned");
      }

      return {
        id: data.id,
        userId: data.user_id,
        serviceType: data.service_type,
        credentials: data.credentials,
        status: data.status as "connected" | "disconnected" | "error",
        metadata: data.metadata || undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    }),

  /**
   * Delete an integration
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the integration belongs to the user before deleting
      const { data: existingIntegration } = await ctx.db
        .from("integrations")
        .select("*")
        .eq("id", input.id)
        .eq("user_id", ctx.user.id)
        .maybeSingle();

      if (!existingIntegration) {
        throw new Error("Integration not found or access denied");
      }

      const { error } = await ctx.db
        .from("integrations")
        .delete()
        .eq("id", input.id)
        .eq("user_id", ctx.user.id);

      if (error) {
        throw new Error(`Failed to delete integration: ${error.message}`);
      }

      return { success: true, id: input.id };
    }),

  /**
   * Get GitHub activity summary for a specified time range
   */
  getGitHubActivity: protectedProcedure
    .input(
      z.object({
        hours: z.number().min(1).max(720).default(24), // 1 hour to 30 days (720 hours)
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const hours = input?.hours ?? 24;
    // Get GitHub integration
    const { data: integration, error: integrationError } = await ctx.db
      .from("integrations")
      .select("*")
      .eq("user_id", ctx.user.id)
      .eq("service_type", "github")
      .eq("status", "connected")
      .maybeSingle();

    if (integrationError) {
      throw new Error(`Failed to fetch GitHub integration: ${integrationError.message}`);
    }

    if (!integration) {
      return null; // No GitHub integration connected
    }

    const credentials = integration.credentials as { accessToken?: string };
    const accessToken = credentials?.accessToken;

    if (!accessToken) {
      throw new Error("GitHub access token not found");
    }

    // Calculate time range based on input
    const since = new Date();
    since.setHours(since.getHours() - hours);

    try {
      // First, verify the token works by fetching user info
      const userResponse = await fetch(`https://api.github.com/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!userResponse.ok) {
        const errorText = await userResponse.text();
        throw new Error(`GitHub API authentication failed: ${userResponse.status} ${userResponse.statusText}. ${errorText}`);
      }

      // Check token scopes
      const scopes = userResponse.headers.get('X-OAuth-Scopes');
      console.log('GitHub token scopes:', scopes);
      
      // Warn if repo scope is missing
      if (scopes && !scopes.includes('repo')) {
        console.warn('GitHub token is missing "repo" scope. Private repository access will be limited. Please reconnect your GitHub account.');
      }

      const githubUser = await userResponse.json();
      const githubUsername = githubUser.login || (integration.metadata as { githubUsername?: string })?.githubUsername;

      if (!githubUsername) {
        throw new Error("GitHub username not found");
      }

      // Try to fetch events for the authenticated user (includes private repos)
      // Using /user/events to get all events
      const eventsResponse = await fetch(
        `https://api.github.com/user/events?per_page=100`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      );

      interface GitHubEvent {
        type: string;
        created_at: string;
        repo?: {
          name: string;
        };
        payload?: {
          commits?: Array<{ sha: string }>;
          action?: string;
        };
      }

      let events: GitHubEvent[] = [];

      // If /user/events fails (404), try fetching from repositories directly
      if (!eventsResponse.ok) {
        if (eventsResponse.status === 404) {
          // Fallback: Fetch user's repositories and get activity from them
          // Using affiliation=owner,collaborator,organization_member to get all repos user has access to
          // Note: Cannot use 'type' parameter when 'affiliation' is specified
          const reposResponse = await fetch(
            `https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: "application/vnd.github.v3+json",
              },
            }
          );

          if (!reposResponse.ok) {
            const errorText = await reposResponse.text();
            throw new Error(`GitHub API: Unable to fetch repositories. Status: ${reposResponse.status} ${reposResponse.statusText}. ${errorText}`);
          }

          const repos = await reposResponse.json();
          
          // For each repo, fetch recent commits
          const repoPromises = repos.slice(0, 10).map(async (repo: { full_name: string; private: boolean }) => {
            try {
              const commitsResponse = await fetch(
                `https://api.github.com/repos/${repo.full_name}/commits?since=${since.toISOString()}&per_page=100`,
                {
                  headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "application/vnd.github.v3+json",
                  },
                }
              );

              if (commitsResponse.ok) {
                const commits = await commitsResponse.json() as Array<{
                  sha: string;
                  commit: {
                    author: {
                      date: string;
                    };
                  };
                }>;
                return commits.map((commit) => ({
                  type: "PushEvent",
                  created_at: commit.commit.author.date,
                  repo: { name: repo.full_name },
                  payload: { commits: [{ sha: commit.sha }] },
                }));
              }
              return [];
            } catch {
              return [];
            }
          });

          const repoEvents = await Promise.all(repoPromises);
          events = repoEvents.flat();
        } else {
          const errorText = await eventsResponse.text();
          throw new Error(`GitHub API error: ${eventsResponse.status} ${eventsResponse.statusText}. ${errorText}`);
        }
      } else {
        events = await eventsResponse.json();
      }

      // Filter events from last 24 hours and categorize
      const recentEvents = events.filter((event) => {
        const eventDate = new Date(event.created_at);
        return eventDate >= since;
      });

      // Count by type
      const pullRequests = recentEvents.filter((e) => e.type === "PullRequestEvent").length;
      const issues = recentEvents.filter((e) => e.type === "IssuesEvent").length;
      const totalCommits = recentEvents
        .filter((e) => e.type === "PushEvent")
        .reduce((sum, e) => sum + (e.payload?.commits?.length || 0), 0);

      // Get unique repositories
      const repos = new Set(
        recentEvents
          .filter((e) => e.repo)
          .map((e) => e.repo!.name)
      );

      return {
        commits: totalCommits,
        pullRequests,
        issues,
        repositories: Array.from(repos),
        totalEvents: recentEvents.length,
        githubUsername,
        needsReconnect: scopes && !scopes.includes('repo'),
      };
    } catch (error) {
      console.error("Failed to fetch GitHub activity:", error);
      throw new Error(`Failed to fetch GitHub activity: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }),

  getGoogleCalendarActivity: protectedProcedure
    .input(
      z.object({
        hours: z.number().default(24),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const hours = input?.hours ?? 24;

      // Get Google Calendar integration
      const { data: integration, error: integrationError } = await ctx.db
        .from("integrations")
        .select("*")
        .eq("user_id", ctx.user.id)
        .eq("service_type", "google_calendar")
        .eq("status", "connected")
        .maybeSingle();

      if (integrationError) {
        throw new Error(`Failed to fetch Google Calendar integration: ${integrationError.message}`);
      }

      if (!integration) {
        return null; // No Google Calendar integration connected
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
      let needsReconnect = false;
      if (expiresAt) {
        const expiryDate = new Date(expiresAt);
        const now = new Date();
        
        // If token expires in less than 5 minutes, refresh it
        if (expiryDate.getTime() - now.getTime() < 5 * 60 * 1000) {
          if (refreshToken) {
            try {
              const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                  client_id: env.NEXT_GOOGLE_CALENDAR_CLIENT_ID,
                  client_secret: env.NEXT_GOOGLE_CALENDAR_CLIENT_SECRET,
                  refresh_token: refreshToken,
                  grant_type: 'refresh_token',
                }),
              });

              if (tokenResponse.ok) {
                const tokenData = await tokenResponse.json() as {
                  access_token: string;
                  expires_in: number;
                };
                
                accessToken = tokenData.access_token;
                const newExpiresAt = new Date(Date.now() + tokenData.expires_in * 1000).toISOString();

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
              } else {
                console.warn('Failed to refresh Google Calendar token');
                needsReconnect = true;
              }
            } catch (error) {
              console.error('Error refreshing token:', error);
              needsReconnect = true;
            }
          } else {
            needsReconnect = true;
          }
        }
      }

      // Calculate time range
      const timeMin = new Date();
      timeMin.setHours(timeMin.getHours() - hours);
      const timeMax = new Date();

      try {
        // Fetch events from Google Calendar
        const calendarId = 'primary';
        const eventsUrl = new URL(`https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`);
        eventsUrl.searchParams.set('timeMin', timeMin.toISOString());
        eventsUrl.searchParams.set('timeMax', timeMax.toISOString());
        eventsUrl.searchParams.set('singleEvents', 'true');
        eventsUrl.searchParams.set('orderBy', 'startTime');
        eventsUrl.searchParams.set('maxResults', '250');

        const eventsResponse = await fetch(eventsUrl.toString(), {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/json',
          },
        });

        if (!eventsResponse.ok) {
          const errorText = await eventsResponse.text();
          console.error('Google Calendar API error:', errorText);
          throw new Error(`Google Calendar API error: ${eventsResponse.status} ${eventsResponse.statusText}`);
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
          attendees?: Array<{
            email: string;
            responseStatus: string;
            self?: boolean;
          }>;
          status: string;
          transparency?: string;
        }

        interface CalendarResponse {
          items: CalendarEvent[];
        }

        const calendarData: CalendarResponse = await eventsResponse.json();
        const events = calendarData.items || [];

        // Count events by type
        const now = new Date();
        const pastEvents = events.filter((e) => {
          const endTime = new Date(e.end.dateTime || e.end.date || '');
          return endTime < now;
        });

        const upcomingEvents = events.filter((e) => {
          const startTime = new Date(e.start.dateTime || e.start.date || '');
          return startTime > now;
        });

        // Count by response status
        const acceptedEvents = events.filter((e) => {
          if (!e.attendees) return true; // If no attendees, assume accepted
          const selfAttendee = e.attendees.find((a) => a.self);
          return !selfAttendee || selfAttendee.responseStatus === 'accepted';
        });

        const declinedEvents = events.filter((e) => {
          if (!e.attendees) return false;
          const selfAttendee = e.attendees.find((a) => a.self);
          return selfAttendee && selfAttendee.responseStatus === 'declined';
        });

        return {
          totalEvents: events.length,
          pastEvents: pastEvents.length,
          upcomingEvents: upcomingEvents.length,
          acceptedEvents: acceptedEvents.length,
          declinedEvents: declinedEvents.length,
          email: (integration.metadata as { email?: string })?.email,
          needsReconnect,
        };
      } catch (error) {
        console.error("Failed to fetch Google Calendar activity:", error);
        throw new Error(`Failed to fetch Google Calendar activity: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }),
});



