import { z } from "zod";
import { router, protectedProcedure } from "../context";
import { NOTIFICATION_CONFIG } from "@/lib/config";

export const notificationRouter = router({
  subscribe: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        p256dhKey: z.string(),
        authKey: z.string(),
        deviceName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.db
        .from("push_subscriptions")
        .upsert(
          {
            user_id: ctx.user.id,
            endpoint: input.endpoint,
            p256dh_key: input.p256dhKey,
            auth_key: input.authKey,
            device_name: input.deviceName || null,
            is_active: true,
          },
          { onConflict: "user_id,endpoint" }
        )
        .select()
        .single();

      if (error)
        throw new Error(`Failed to save subscription: ${error.message}`);
      return { success: true, subscription: data };
    }),

  unsubscribe: protectedProcedure
    .input(z.object({ endpoint: z.string().url() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.db
        .from("push_subscriptions")
        .delete()
        .eq("user_id", ctx.user.id)
        .eq("endpoint", input.endpoint);

      if (error)
        throw new Error(`Failed to remove subscription: ${error.message}`);
      return { success: true };
    }),

  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("notification_settings")
      .select("*")
      .eq("user_id", ctx.user.id)
      .maybeSingle();

    if (error)
      throw new Error(`Failed to fetch settings: ${error.message}`);

    if (!data) {
      return {
        morningCheckEnabled: true,
        morningCheckTime: NOTIFICATION_CONFIG.DEFAULT_TIMES.MORNING,
        eveningCheckEnabled: true,
        eveningCheckTime: NOTIFICATION_CONFIG.DEFAULT_TIMES.EVENING,
        emailNotificationsEnabled: true,
        pushNotificationsEnabled: true,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }

    return {
      morningCheckEnabled: data.morning_check_enabled,
      morningCheckTime: data.morning_check_time,
      eveningCheckEnabled: data.evening_check_enabled,
      eveningCheckTime: data.evening_check_time,
      emailNotificationsEnabled: data.email_notifications_enabled,
      pushNotificationsEnabled: data.push_notifications_enabled,
      timezone: data.timezone,
    };
  }),

  updateSettings: protectedProcedure
    .input(
      z.object({
        morningCheckEnabled: z.boolean().optional(),
        morningCheckTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional(),
        eveningCheckEnabled: z.boolean().optional(),
        eveningCheckTime: z
          .string()
          .regex(/^\d{2}:\d{2}$/)
          .optional(),
        emailNotificationsEnabled: z.boolean().optional(),
        pushNotificationsEnabled: z.boolean().optional(),
        timezone: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {
        user_id: ctx.user.id,
      };

      if (input.morningCheckEnabled !== undefined)
        updateData.morning_check_enabled = input.morningCheckEnabled;
      if (input.morningCheckTime !== undefined)
        updateData.morning_check_time = input.morningCheckTime;
      if (input.eveningCheckEnabled !== undefined)
        updateData.evening_check_enabled = input.eveningCheckEnabled;
      if (input.eveningCheckTime !== undefined)
        updateData.evening_check_time = input.eveningCheckTime;
      if (input.emailNotificationsEnabled !== undefined)
        updateData.email_notifications_enabled =
          input.emailNotificationsEnabled;
      if (input.pushNotificationsEnabled !== undefined)
        updateData.push_notifications_enabled =
          input.pushNotificationsEnabled;
      if (input.timezone !== undefined)
        updateData.timezone = input.timezone;

      const { data, error } = await ctx.db
        .from("notification_settings")
        .upsert(updateData, { onConflict: "user_id" })
        .select()
        .single();

      if (error)
        throw new Error(`Failed to update settings: ${error.message}`);

      return {
        morningCheckEnabled: data.morning_check_enabled,
        morningCheckTime: data.morning_check_time,
        eveningCheckEnabled: data.evening_check_enabled,
        eveningCheckTime: data.evening_check_time,
        emailNotificationsEnabled: data.email_notifications_enabled,
        pushNotificationsEnabled: data.push_notifications_enabled,
        timezone: data.timezone,
      };
    }),

  getSubscriptions: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", ctx.user.id)
      .eq("is_active", true);

    if (error)
      throw new Error(`Failed to fetch subscriptions: ${error.message}`);
    return (data || []).map((sub: any) => ({
      endpoint: sub.endpoint,
      deviceName: sub.device_name,
      createdAt: new Date(sub.created_at),
    }));
  }),

  getPublicKey: protectedProcedure.query(() => {
    return { publicKey: NOTIFICATION_CONFIG.VAPID.PUBLIC_KEY };
  }),
});
