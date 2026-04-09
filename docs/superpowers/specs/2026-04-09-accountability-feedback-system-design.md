# Accountability Feedback System — Design Spec

## Overview

Add an app-to-user feedback system that gives users continuous signal about their performance through a blended accountability score, streak tracking, a dashboard summary widget, and a dedicated stats page.

**Goal:** Close the engagement gap between daily task completion and the weekly roast. Give users a number to care about every day.

**Scope (v1):** Score engine, dashboard widget, stats page, AI context injection. No milestones, no sharing, no referrals — those are future iterations.

---

## 1. Accountability Score Engine

### Formula

```
score = (completionRate × 0.6) + (consistencyRate × 0.4) + streakBonus
```

- **completionRate** = `completedTasks / totalTasks × 100` over a rolling 14-day window (if totalTasks is 0, completionRate is 0)
- **consistencyRate** = `activeDays / 14 × 100` over the same 14-day window
- **streakBonus** = `min(currentStreak - 6, 5)` if streak >= 7, else 0 (capped at +5 points)
- **Final score** = `min(score, 100)` — clamped to 0–100

An "active day" is any day where the user completed at least 1 task OR completed a daily check-in (morning or evening).

### Score Tiers

| Range | Tier | Color |
|-------|------|-------|
| 0–39 | Slacking | Red |
| 40–59 | Warming Up | Orange |
| 60–74 | Grinding | Amber |
| 75–89 | Locked In | Green |
| 90–100 | Proven | Purple |

### Design Decisions

- **Rolling 14-day window.** Recent performance matters more than historical. A bad week 3 months ago shouldn't haunt you.
- **Computed on-the-fly.** Score is calculated from existing `tasks` and `daily_checks` data. No new tables needed for the score itself.
- **No penalties.** Skipping a day doesn't subtract — it just means fewer active days in the window. Less punishing, more motivating.
- **Streak bonus is small and capped.** It rewards sustained effort without dominating the score.

### Implementation

New tRPC router: `accountabilityScore` in `src/server/trpc/routers/accountabilityScore.ts`.

**Procedures:**

- `getScore` — returns current score, tier, streak, completion rate, consistency rate, delta from 7 days ago, and today's task progress (completed/total)
- `getScoreTrend` — returns daily scores over a given time range (14d, 30d, all time) for the stats page chart
- `getActivityHeatmap` — returns daily task completion counts over the given range for the heatmap

All three query existing `tasks` and `daily_checks` tables — no new tables, no stored scores.

**Streak calculation:** Count consecutive days (backwards from today) where the user had at least 1 completed task or a daily check-in record.

**Delta calculation:** Run the same score formula against the window shifted back 7 days and subtract.

---

## 2. Dashboard Summary Widget

### Component

New component: `src/components/AccountabilityWidget.tsx`

### Placement

Top of the dashboard, above `StoicQuote`. First thing the user sees. Inserted into `DashboardContent` in `src/app/dashboard/page.tsx`.

### Layout

Single row with three sections:

1. **Score ring** (left) — circular progress indicator showing the numeric score. Ring color matches the tier. Tier label below the ring. Delta indicator: "+3 from last week" in green/red/gray.
2. **Streak counter** (center) — large number with "day streak" label. Fire indicator for active streaks.
3. **Today's progress** (right) — "5/7 done" showing today's completed vs total tasks. "View Stats →" link to `/dashboard/stats`.

### Styling

- Follow existing patterns: `dark:bg-zinc-900` card backgrounds, `zinc-800` borders, `max-w-xl` container
- Use shadcn/ui `Card` component to match other dashboard cards
- Responsive: on mobile, stack the three sections vertically

### Data

Calls `trpc.accountabilityScore.getScore` — single query, no waterfalls.

---

## 3. Stats Page

### Route

New page: `src/app/dashboard/stats/page.tsx`

### Layout

Follows existing dashboard layout (`max-w-xl`, same header). Sections top to bottom:

1. **Header row** — "Your Progress" title + time range toggle (14 days / 30 days / All time)
2. **Summary cards** — 4 cards in a row: Score (with delta), Streak (with best streak), Completion Rate (with delta), Active Days (with percentage)
3. **Score trend chart** — bar chart showing daily scores over the selected window. Empty/gray bars for inactive days. Today's bar highlighted. Built with plain CSS/HTML — no chart library.
4. **Activity heatmap** — GitHub-style grid. Cell intensity = tasks completed that day. Color scale: empty → light green → dark green → purple (for high-output days). 14-day default, expands for longer ranges.

### Styling

- Same dark theme, zinc palette, shadcn/ui components
- No chart library — bars and heatmap cells are styled `div` elements. Keeps the bundle lean.

### Data

- Summary cards + chart: `trpc.accountabilityScore.getScoreTrend`
- Heatmap: `trpc.accountabilityScore.getActivityHeatmap`
- Time range toggle is client-side state that re-fetches with the selected range.

---

## 4. AI Context Injection

### Weekly Roast

Update `src/lib/prompts/weekly-roast-prompt.ts` to include score data in the prompt context:

- Current score and tier
- Score delta from last week
- Current streak length
- Consistency rate

The roast prompt already receives `taskStats`. We add the score data alongside it. The AI naturally references it — no new prompt engineering needed beyond providing the data.

### AI Coach Chat

Add a `get_accountability_score` tool to `src/lib/ai/tools.ts`:

- Returns the same data as the `getScore` procedure
- The coach can pull it when users ask "how am I doing" or when contextually relevant
- No changes to the system prompt — the tool description is sufficient for the AI to use it appropriately

---

## 5. Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `src/server/trpc/routers/accountabilityScore.ts` | Score engine — getScore, getScoreTrend, getActivityHeatmap |
| `src/components/AccountabilityWidget.tsx` | Dashboard summary widget |
| `src/app/dashboard/stats/page.tsx` | Stats page |

### Modified Files

| File | Change |
|------|--------|
| `src/server/trpc/routers/_app.ts` | Register `accountabilityScore` router |
| `src/app/dashboard/page.tsx` | Add `AccountabilityWidget` above `StoicQuote` |
| `src/lib/prompts/weekly-roast-prompt.ts` | Add score/streak/tier to prompt context |
| `src/lib/ai/tools.ts` | Add `get_accountability_score` tool |
| `src/app/api/cron/weekly-roast/route.ts` | Pass score data to the roast prompt |

### No New Database Tables

Everything is computed from existing `tasks` and `daily_checks` tables.

---

## 6. What's NOT in v1

- Milestones / achievements (v2 — add if score engagement is proven)
- Share My Roast / social sharing (v2)
- Referral system (v3)
- Leaderboards / public profiles (not planned)
- Push notifications for score changes (not planned)
