import "server-only";

import { PostHog } from "posthog-node";

const phKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const phHost = "https://us.i.posthog.com";

export type RetentionNudgeVariant = "treatment" | "control";

const RETENTION_NUDGE_FLAG_KEY = "retention-reentry-nudge";

function toRetentionNudgeVariant(value: unknown): RetentionNudgeVariant {
  if (value === "treatment" || value === true) return "treatment";
  return "control";
}

export async function getRetentionNudgeVariant(
  distinctId: string
): Promise<RetentionNudgeVariant> {
  if (!phKey) return "control";

  const client = new PostHog(phKey, {
    host: phHost,
    flushAt: 1,
    flushInterval: 0,
  });

  try {
    const rawVariant = await client.getFeatureFlag(
      RETENTION_NUDGE_FLAG_KEY,
      distinctId
    );

    const variant = toRetentionNudgeVariant(rawVariant);

    client.capture({
      distinctId,
      event: "$feature_flag_called",
      properties: {
        $feature_flag: RETENTION_NUDGE_FLAG_KEY,
        $feature_flag_response: variant,
      },
    });

    return variant;
  } catch (err) {
    console.error("[PostHog] feature flag evaluation failed:", err);
    return "control";
  } finally {
    client.shutdown();
  }
}

export const RETENTION_FLAG_KEY = RETENTION_NUDGE_FLAG_KEY;
