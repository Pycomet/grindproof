import { z } from "zod";
import { router, protectedProcedure } from "../context";
import { sendPushNotification, NotificationTemplates } from "@/lib/notifications/push-service";
import { NOTIFICATION_CONFIG } from "@/lib/config";

export const notificationRouter = router({
  /**
   * Subscribe to push notifications
   */
  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        p256dhKey: z.string(),
        authKey: z.string(),
        userAgent: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Insert or update subscription
      const { data, error } = await ctx.db
        .from("push_subscriptions")
        .upsert(
          {
            user_id: userId,
            endpoint: input.endpoint,
            p256dh_key: input.p256dhKey,
            auth_key: input.authKey,
            user_agent: input.userAgent,
            is_active: true,
          },
          {
            onConflict: "user_id,endpoint",
          }
        )
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to save subscription: ${error.message}`);
      }

      return { success: true, subscription: data };
    }),

  /**
   * Unsubscribe from push notifications
   */
  unsubscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const { error } = await ctx.db
        .from("push_subscriptions")
        .delete()
        .eq("user_id", userId)
        .eq("endpoint", input.endpoint);

      if (error) {
        throw new Error(`Failed to remove subscription: ${error.message}`);
      }

      return { success: true };
    }),

  /**
   * Get user's notification settings
   */
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const { data, error } = await ctx.db
      .from("notification_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to fetch notification settings: ${error.message}`);
    }

    // Return default settings if none exist
    if (!data) {
      return {
        morningCheckEnabled: true,
        morningCheckTime: NOTIFICATION_CONFIG.DEFAULT_TIMES.MORNING,
        eveningCheckEnabled: true,
        eveningCheckTime: NOTIFICATION_CONFIG.DEFAULT_TIMES.EVENING,
        hourlyReviewEnabled: false,
        hourlyReviewStartTime: '09:00',
        hourlyReviewEndTime: '21:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }

    return {
      morningCheckEnabled: data.morning_check_enabled,
      morningCheckTime: data.morning_check_time,
      eveningCheckEnabled: data.evening_check_enabled,
      eveningCheckTime: data.evening_check_time,
      hourlyReviewEnabled: data.hourly_review_enabled,
      hourlyReviewStartTime: data.hourly_review_start_time,
      hourlyReviewEndTime: data.hourly_review_end_time,
      timezone: data.timezone,
    };
  }),

  /**
   * Update notification settings
   */
  updateSettings: protectedProcedure
    .input(
      z.object({
        morningCheckEnabled: z.boolean().optional(),
        morningCheckTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        eveningCheckEnabled: z.boolean().optional(),
        eveningCheckTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        hourlyReviewEnabled: z.boolean().optional(),
        hourlyReviewStartTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        hourlyReviewEndTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const updateData: any = {
        user_id: userId,
      };

      if (input.morningCheckEnabled !== undefined) {
        updateData.morning_check_enabled = input.morningCheckEnabled;
      }
      if (input.morningCheckTime !== undefined) {
        updateData.morning_check_time = input.morningCheckTime;
      }
      if (input.eveningCheckEnabled !== undefined) {
        updateData.evening_check_enabled = input.eveningCheckEnabled;
      }
      if (input.eveningCheckTime !== undefined) {
        updateData.evening_check_time = input.eveningCheckTime;
      }
      if (input.hourlyReviewEnabled !== undefined) {
        updateData.hourly_review_enabled = input.hourlyReviewEnabled;
      }
      if (input.hourlyReviewStartTime !== undefined) {
        updateData.hourly_review_start_time = input.hourlyReviewStartTime;
      }
      if (input.hourlyReviewEndTime !== undefined) {
        updateData.hourly_review_end_time = input.hourlyReviewEndTime;
      }
      if (input.timezone !== undefined) {
        updateData.timezone = input.timezone;
      }

      const { data, error } = await ctx.db
        .from("notification_settings")
        .upsert(updateData, {
          onConflict: "user_id",
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to update notification settings: ${error.message}`);
      }

      return {
        success: true,
        settings: {
          morningCheckEnabled: data.morning_check_enabled,
          morningCheckTime: data.morning_check_time,
          eveningCheckEnabled: data.evening_check_enabled,
          eveningCheckTime: data.evening_check_time,
          hourlyReviewEnabled: data.hourly_review_enabled,
          hourlyReviewStartTime: data.hourly_review_start_time,
          hourlyReviewEndTime: data.hourly_review_end_time,
          timezone: data.timezone,
        },
      };
    }),

  /**
   * Get user's active subscriptions
   */
  getSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const { data, error } = await ctx.db
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) {
      throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    }

    return data || [];
  }),

  /**
   * Send a test notification
   */
  sendTest: protectedProcedure
    .input(
      z.object({
        type: z.enum(['test', 'morning', 'evening', 'hourly']).default('test'),
      }).optional()
    )
    .mutation(async ({ ctx, input }) => {
    const userId = ctx.user.id;
    const notificationType = input?.type || 'test';

    // Get user's active subscriptions
    const { data: subscriptions, error } = await ctx.db
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true);

    if (error) {
      throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    }

    if (!subscriptions || subscriptions.length === 0) {
      throw new Error("No active subscriptions found");
    }

    // Select notification template based on type
    let notificationPayload;
    switch (notificationType) {
      case 'morning':
        notificationPayload = NotificationTemplates.morningCheck();
        break;
      case 'evening':
        notificationPayload = NotificationTemplates.eveningCheck();
        break;
      case 'hourly':
        notificationPayload = NotificationTemplates.hourlyTaskReview('You have 3 pending tasks today');
        break;
      default:
        notificationPayload = NotificationTemplates.test();
    }

    // Send test notification to all subscriptions
    const results = {
      successful: 0,
      failed: 0,
      expired: [] as string[],
    };

    for (const subscription of subscriptions) {
      try {
        await sendPushNotification(
          {
            endpoint: subscription.endpoint,
            p256dhKey: subscription.p256dh_key,
            authKey: subscription.auth_key,
          },
          notificationPayload
        );
        results.successful++;
      } catch (error: any) {
        if (error.message === "SUBSCRIPTION_EXPIRED") {
          results.expired.push(subscription.endpoint);
          // Mark subscription as inactive
          await ctx.db
            .from("push_subscriptions")
            .update({ is_active: false })
            .eq("endpoint", subscription.endpoint);
        } else {
          results.failed++;
        }
      }
    }

    return {
      success: results.successful > 0,
      results,
    };
  }),

  /**
   * Get VAPID public key for client-side subscription
   */
  getPublicKey: protectedProcedure.query(() => {
    return { publicKey: NOTIFICATION_CONFIG.VAPID.PUBLIC_KEY };
  }),
});

