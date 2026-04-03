export interface PushSubscription {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  tag?: string;
}

/**
 * Push notifications are best-effort in the MVP.
 * Email (Resend) is the primary notification channel.
 * This stub will be replaced with proper web-push when needed.
 */
export async function sendPushNotification(
  _subscription: PushSubscription,
  _payload: NotificationPayload
): Promise<void> {
  // TODO: Implement web-push sending when push becomes a priority
  // For MVP, email is the primary channel
  console.log("[push] Push notification skipped (not implemented in MVP)");
}

export async function sendToUser(
  subscriptions: PushSubscription[],
  payload: NotificationPayload
): Promise<{ successful: number; failed: number; expired: string[] }> {
  console.log(
    `[push] Would send to ${subscriptions.length} subscriptions:`,
    payload.title
  );
  return { successful: 0, failed: 0, expired: [] };
}
