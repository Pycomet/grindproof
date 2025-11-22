import webpush from 'web-push';
import { NOTIFICATION_CONFIG } from '../config';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  NOTIFICATION_CONFIG.VAPID.EMAIL,
  NOTIFICATION_CONFIG.VAPID.PUBLIC_KEY,
  NOTIFICATION_CONFIG.VAPID.PRIVATE_KEY
);

export interface PushSubscription {
  endpoint: string;
  p256dhKey: string;
  authKey: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * Send a push notification to a specific subscription
 */
export async function sendPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload
): Promise<void> {
  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dhKey,
        auth: subscription.authKey,
      },
    };

    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-72x72.png',
      data: {
        url: '/',
        ...payload.data,
      },
      tag: payload.tag,
      requireInteraction: payload.requireInteraction || false,
    });

    await webpush.sendNotification(pushSubscription, notificationPayload);
  } catch (error: any) {
    // Handle specific error cases
    if (error.statusCode === 410 || error.statusCode === 404) {
      // Subscription is no longer valid
      throw new Error('SUBSCRIPTION_EXPIRED');
    }
    console.error('Error sending push notification:', error);
    throw error;
  }
}

/**
 * Send push notifications to all of a user's active subscriptions
 */
export async function sendToUser(
  subscriptions: PushSubscription[],
  payload: NotificationPayload
): Promise<{ successful: number; failed: number; expired: string[] }> {
  const results = {
    successful: 0,
    failed: 0,
    expired: [] as string[],
  };

  await Promise.allSettled(
    subscriptions.map(async (subscription) => {
      try {
        await sendPushNotification(subscription, payload);
        results.successful++;
      } catch (error: any) {
        if (error.message === 'SUBSCRIPTION_EXPIRED') {
          results.expired.push(subscription.endpoint);
        } else {
          results.failed++;
        }
      }
    })
  );

  return results;
}

/**
 * Notification templates
 */
export const NotificationTemplates = {
  morningCheck: (): NotificationPayload => ({
    title: '🌅 Good Morning! Time to Plan Your Day',
    body: "Let's review your goals and set priorities for today.",
    tag: 'morning-check',
    requireInteraction: true,
    data: {
      url: '/dashboard?view=today&modal=morning',
      type: 'morning-check',
    },
  }),

  eveningCheck: (): NotificationPayload => ({
    title: '🌙 Evening Reality Check',
    body: "How did your day go? Let's review what you accomplished.",
    tag: 'evening-check',
    requireInteraction: true,
    data: {
      url: '/dashboard?view=evening&modal=evening',
      type: 'evening-check',
    },
  }),

  taskReminder: (taskTitle: string): NotificationPayload => ({
    title: '⏰ Task Reminder',
    body: `Don't forget: ${taskTitle}`,
    tag: 'task-reminder',
    data: {
      url: '/dashboard?view=today',
      type: 'task-reminder',
    },
  }),

  test: (): NotificationPayload => ({
    title: '✅ Notifications Working!',
    body: 'You will receive reminders for your morning and evening checks.',
    tag: 'test-notification',
    data: {
      url: '/dashboard?view=integrations',
      type: 'test',
    },
  }),
};

