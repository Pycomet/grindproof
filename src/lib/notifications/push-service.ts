import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import type { Database } from "@/lib/supabase/types";

export interface PushSubscription {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  data?: Record<string, unknown>;
  tag?: string;
  /** Push service delivery priority. iOS may delay non-high pushes for battery reasons. */
  urgency?: "very-low" | "low" | "normal" | "high";
  /** Seconds the push service keeps an undeliverable notification. A stale check-in shouldn't arrive hours late. */
  ttl?: number;
}

const DEFAULT_URGENCY = "high";
const DEFAULT_TTL_SECONDS = 3600;

webpush.setVapidDetails(
  env.VAPID_EMAIL,
  env.VAPID_PUBLIC_KEY,
  env.VAPID_PRIVATE_KEY
);

const adminDb = createClient<Database>(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

function toWebPushSubscription(subscription: PushSubscription) {
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dhKey,
      auth: subscription.authKey,
    },
  };
}

async function deactivateSubscription(endpoint: string): Promise<void> {
  await adminDb
    .from("push_subscriptions")
    .update({ is_active: false })
    .eq("endpoint", endpoint);
}

async function markSubscriptionSuccess(endpoint: string): Promise<void> {
  await adminDb
    .from("push_subscriptions")
    .update({
      is_active: true,
      last_successful_push: new Date().toISOString(),
    })
    .eq("endpoint", endpoint);
}

export async function sendPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload
): Promise<void> {
  const serialized = JSON.stringify({
    title: payload.title,
    body: payload.body,
    tag: payload.tag,
    data: {
      url: payload.url ?? "/dashboard",
      ...(payload.data ?? {}),
    },
  });

  await webpush.sendNotification(toWebPushSubscription(subscription), serialized, {
    urgency: payload.urgency ?? DEFAULT_URGENCY,
    TTL: payload.ttl ?? DEFAULT_TTL_SECONDS,
  });
}

export async function sendToUser(
  subscriptions: PushSubscription[],
  payload: NotificationPayload
): Promise<{ successful: number; failed: number; expired: string[] }> {
  let successful = 0;
  let failed = 0;
  const expired: string[] = [];

  for (const subscription of subscriptions) {
    try {
      await sendPushNotification(subscription, payload);
      successful += 1;
      await markSubscriptionSuccess(subscription.endpoint);
    } catch (error) {
      failed += 1;
      const statusCode = (error as { statusCode?: number })?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        expired.push(subscription.endpoint);
        await deactivateSubscription(subscription.endpoint);
      }
    }
  }

  return { successful, failed, expired };
}

export async function sendPushToUser(
  userId: string,
  payload: NotificationPayload
): Promise<{ successful: number; failed: number; expired: string[] }> {
  const { data, error } = await adminDb
    .from("push_subscriptions")
    .select("endpoint, p256dh_key, auth_key")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (error || !data || data.length === 0) {
    return { successful: 0, failed: 0, expired: [] };
  }

  const subscriptions: PushSubscription[] = data.map((row) => ({
    endpoint: row.endpoint,
    p256dhKey: row.p256dh_key,
    authKey: row.auth_key,
  }));

  return sendToUser(subscriptions, payload);
}
