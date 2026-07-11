# GrindProof

**Track what you plan. Prove what you did. Get roasted for the gap.**

![GrindProof: promise a 5am wake-up, get roasted for the gap](.github/grindproof-promo.gif)

Live at [grindproof.co](https://grindproof.co).

GrindProof is an AI accountability app for people who are done lying to themselves. It's not a habit tracker — no streaks to game, no badges, no confetti. You say what you'll do, it checks whether you did it, and it calls you out when you didn't.

## The three rituals

- **Morning Check-in** — plan the day. Yesterday's unfinished tasks get carried over or confronted, not quietly forgotten.
- **Evening Reality Check** — mark what got done. Whatever didn't, you explain — and the excuse goes on the record.
- **Weekly Roast** — every Sunday, a report with the receipts: completion rate, streaks worth keeping, the tasks you've skipped every single day, and recommendations that don't spare your feelings.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router) with React 19, deployed on Vercel
- [Supabase](https://supabase.com) — auth and Postgres
- tRPC + TanStack Query for the API layer
- AI SDK with Google Gemini for check-in analysis and roast generation
- Tailwind CSS 4, Radix UI, Lucide icons
- Resend for email, Web Push for notifications, QStash for scheduled jobs, PostHog for analytics
- Vitest for tests

## Getting started

Copy the environment template and fill in your keys (Supabase, Gemini, VAPID, Resend, QStash):

```bash
cp .env.example .env.local
```

Install and run:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts:

```bash
npm run test:run          # run the test suite
npm run generate:icons    # regenerate PWA icons
npm run build             # production build
```

Database schema and migrations live in `supabase/`.
