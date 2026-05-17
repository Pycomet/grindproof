import posthog from 'posthog-js';

let initialized = false;
let initInFlight: Promise<void> | null = null;

type QueuedCall =
  | { kind: 'capture'; event: string; properties?: Record<string, unknown> }
  | { kind: 'identify'; userId: string; properties?: Record<string, unknown> }
  | { kind: 'pageview'; path: string };

const queue: QueuedCall[] = [];

async function resolveConfig(): Promise<{ key: string | null; apiHost: string }> {
  const buildTimeKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (buildTimeKey) {
    return { key: buildTimeKey, apiHost: 'https://us.i.posthog.com' };
  }

  try {
    const res = await fetch('/api/public/posthog-config', {
      cache: 'force-cache',
    });
    if (!res.ok) return { key: null, apiHost: 'https://us.i.posthog.com' };
    const data = (await res.json()) as { key: string | null; apiHost?: string };
    return {
      key: data.key,
      apiHost: data.apiHost ?? 'https://us.i.posthog.com',
    };
  } catch {
    return { key: null, apiHost: 'https://us.i.posthog.com' };
  }
}

function drainQueue(): void {
  while (queue.length > 0) {
    const call = queue.shift();
    if (!call) continue;
    if (call.kind === 'capture') {
      posthog.capture(call.event, call.properties);
    } else if (call.kind === 'identify') {
      posthog.identify(call.userId, call.properties);
    } else if (call.kind === 'pageview') {
      posthog.capture('$pageview', { $current_url: call.path });
    }
  }
}

export function initPostHog(): void {
  if (initialized || initInFlight || typeof window === 'undefined') return;

  initInFlight = resolveConfig().then((cfg) => {
    if (!cfg.key) {
      initInFlight = null;
      queue.length = 0;
      return;
    }
    posthog.init(cfg.key, {
      api_host: cfg.apiHost,
      capture_pageview: false,
      capture_pageleave: true,
      persistence: 'localStorage+cookie',
    });
    initialized = true;
    initInFlight = null;
    drainQueue();
  });
}

export function captureClientEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  if (initialized) {
    posthog.capture(event, properties);
    return;
  }
  if (initInFlight) queue.push({ kind: 'capture', event, properties });
}

export function identifyUser(
  userId: string,
  properties?: Record<string, unknown>,
): void {
  if (initialized) {
    posthog.identify(userId, properties);
    return;
  }
  if (initInFlight) queue.push({ kind: 'identify', userId, properties });
}

export function resetPostHog(): void {
  if (!initialized) return;
  posthog.reset();
}

export function capturePageview(path: string): void {
  if (initialized) {
    posthog.capture('$pageview', { $current_url: path });
    return;
  }
  if (initInFlight) queue.push({ kind: 'pageview', path });
}
