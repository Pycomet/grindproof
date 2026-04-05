import "server-only";
import { env } from "./env";

export const AI_CONFIG = {
  MODEL: env.AI_MODEL,
} as const;

export const APP_CONFIG = {
  BASE_URL:
    env.NEXT_PUBLIC_APP_URL ||
    (typeof window !== "undefined" ? window.location.origin : null) ||
    (process.env.NODE_ENV === "production"
      ? "https://grindproof.co"
      : "http://localhost:3000"),
} as const;

export const NOTIFICATION_CONFIG = {
  VAPID: {
    PUBLIC_KEY: env.VAPID_PUBLIC_KEY,
    PRIVATE_KEY: env.VAPID_PRIVATE_KEY,
    EMAIL: env.VAPID_EMAIL,
  },
  DEFAULT_TIMES: {
    MORNING: "09:00",
    EVENING: "18:00",
  },
} as const;
