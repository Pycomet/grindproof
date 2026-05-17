import { PostHog } from 'posthog-node';

const phKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

/**
 * Capture a server-side PostHog event.
 * Creates a short-lived client per call — correct for Vercel serverless functions.
 * No-op when NEXT_PUBLIC_POSTHOG_KEY is not set.
 *
 * GRI-6 requires signup_completed + first_checkin_completed to fire server-side
 * so ad-blockers can't suppress them and the funnel data is trustworthy.
 */
export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>,
): Promise<void> {
  if (!phKey) return Promise.resolve();

  return new Promise((resolve) => {
    try {
      const client = new PostHog(phKey, {
        host: 'https://us.i.posthog.com',
        flushAt: 1,
        flushInterval: 0,
      });
      client.capture({ distinctId, event, properties: properties ?? {} });
      // shutdown() flushes the single-event queue and resolves
      client.shutdown();
      resolve();
    } catch (err) {
      // Non-fatal: analytics must never break the product path
      console.error('[PostHog] server capture failed:', err);
      resolve();
    }
  });
}
