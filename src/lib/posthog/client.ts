import posthog from 'posthog-js';

let initialized = false;

export function initPostHog(): void {
  if (initialized || typeof window === 'undefined') return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: 'https://us.i.posthog.com',
    capture_pageview: false,
    capture_pageleave: true,
    persistence: 'localStorage+cookie',
  });
  initialized = true;
}

export function captureClientEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (!initialized) return;
  posthog.capture(event, properties);
}

export function identifyUser(
  userId: string,
  properties?: Record<string, unknown>,
): void {
  if (!initialized) return;
  posthog.identify(userId, properties);
}

export function resetPostHog(): void {
  if (!initialized) return;
  posthog.reset();
}

export function capturePageview(path: string): void {
  if (!initialized) return;
  posthog.capture('$pageview', { $current_url: path });
}
