import { createHmac } from "node:crypto";

import { APP_CONFIG } from "@/lib/config";
import { env } from "@/lib/env";

const SIGN_PREFIX = "reengagement";

function sign(input: string): string {
  return createHmac("sha256", env.CRON_SECRET).update(input).digest("hex");
}

export function createReengagementLink(userId: string, localDate: string): string {
  const payload = `${SIGN_PREFIX}:${userId}:${localDate}`;
  const signature = sign(payload);
  const params = new URLSearchParams({
    uid: userId,
    day: localDate,
    sig: signature,
  });

  return `${APP_CONFIG.BASE_URL}/dashboard?${params.toString()}`;
}

export function verifyReengagementSignature(
  userId: string,
  localDate: string,
  signature: string
): boolean {
  const payload = `${SIGN_PREFIX}:${userId}:${localDate}`;
  return sign(payload) === signature;
}
