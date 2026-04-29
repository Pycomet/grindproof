/**
 * One-time script to create QStash schedules for the cron routes.
 *
 * Usage:
 *   npx tsx scripts/setup-qstash-schedule.ts
 *
 * Required env vars:
 *   QSTASH_TOKEN         - from Upstash console
 *   NEXT_PUBLIC_APP_URL  - your deployed app URL (e.g. https://grindproof.vercel.app)
 */

import { Client } from "@upstash/qstash";

const QSTASH_TOKEN = process.env.QSTASH_TOKEN;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL;

if (!QSTASH_TOKEN || !APP_URL) {
  console.error("Missing QSTASH_TOKEN or NEXT_PUBLIC_APP_URL env vars");
  process.exit(1);
}

const SCHEDULES = [
  {
    name: "check-notifications",
    path: "/api/cron/check-notifications",
    cron: "0 * * * *", // every hour
  },
  {
    name: "snapshot-accountability",
    path: "/api/cron/snapshot-accountability",
    // Runs hourly on the 5-minute mark to give the previous day's writes
    // time to settle before the snapshot crystallizes.
    cron: "5 * * * *",
  },
];

async function createSchedules() {
  const client = new Client({ token: QSTASH_TOKEN! });

  for (const s of SCHEDULES) {
    const schedule = await client.schedules.create({
      destination: `${APP_URL}${s.path}`,
      cron: s.cron,
    });
    console.log(`✓ ${s.name}`);
    console.log(`  Schedule ID: ${schedule.scheduleId}`);
    console.log(`  Cron: ${s.cron}`);
    console.log(`  Target: ${APP_URL}${s.path}`);
    console.log("");
  }
}

createSchedules().catch((err) => {
  console.error("Failed to create schedules:", err);
  process.exit(1);
});
