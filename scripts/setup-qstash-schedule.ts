/**
 * One-time script to create the hourly QStash schedule for check-notifications.
 *
 * Usage:
 *   npx tsx scripts/setup-qstash-schedule.ts
 *
 * Required env vars:
 *   QSTASH_TOKEN - from Upstash console
 *   NEXT_PUBLIC_APP_URL - your deployed app URL (e.g. https://grindproof.vercel.app)
 */

import { Client } from "@upstash/qstash";

const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

if (!QSTASH_TOKEN || !APP_URL) {
  console.error("Missing QSTASH_TOKEN or NEXT_PUBLIC_APP_URL env vars");
  process.exit(1);
}

async function createSchedule() {
  const client = new Client({ token: QSTASH_TOKEN! });

  const schedule = await client.schedules.create({
    destination: `${APP_URL}/api/cron/check-notifications`,
    cron: "0 * * * *",
  });

  console.log("QStash schedule created successfully!");
  console.log("Schedule ID:", schedule.scheduleId);
  console.log("Cron: every hour (0 * * * *)");
  console.log(`Target: ${APP_URL}/api/cron/check-notifications`);
}

createSchedule().catch((err) => {
  console.error("Failed to create schedule:", err);
  process.exit(1);
});
