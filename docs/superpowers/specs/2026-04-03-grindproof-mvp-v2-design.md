# GrindProof MVP v2 -- Design Spec

## Overview

Rebuild GrindProof from an over-engineered prototype into a focused, community-ready MVP. The core value proposition: **task tracking with teeth** -- structured task management paired with a blunt AI accountability coach.

**Approach:** Branch off `main`, surgically gut non-essential features, rebuild UX and notification system on top of proven infrastructure.

**Branch:** `mvp-v2`

## Target User

People who want a productivity tool that actually holds them accountable. Not developers specifically -- anyone who sets goals and struggles to follow through. The product is being built for a community of early adopters, not just personal use.

## Core Loop

1. **Morning check-in** -- Review yesterday's incomplete tasks, plan today
2. **Throughout the day** -- Check off tasks, chat with AI coach
3. **Evening reality check** -- Mark completions, reflect on what was skipped
4. **Sunday weekly roast** -- AI-generated accountability report for the week

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 16 + React 19 | Keep |
| Styling | Tailwind CSS + Radix UI | Keep |
| Database + Auth | Supabase (Postgres + Google sign-in) | Keep |
| API | tRPC (6 routers) | Simplified from 14 |
| AI | Vercel AI SDK + Google Gemini | Replaces raw Gemini SDK |
| Email | Resend | New -- primary notification channel |
| Scheduling | Vercel Cron Jobs | Replaces GitHub Actions |
| PWA | Minimal service worker (Serwist or hand-written) | Replaces next-pwa |
| Deployment | Vercel | Keep |

---

## What Gets Deleted

### Components to remove:
- `EvidenceCard.tsx`, `FileUpload.tsx`, `ProfilePictureUpload.tsx`
- `FeedbackPopup.tsx`, `InstallPWA.tsx`, `UpdateNotification.tsx`
- `MobileSwipeView.tsx`

### tRPC routers to remove:
- `evidence`, `pattern`, `routine`, `accountabilityScore`, `upload`, `feedback`

### Lib modules to remove:
- `src/lib/ai/data-analyzer.ts`, `src/lib/ai/function-tools.ts`
- `src/lib/prompts/pattern-detection-prompt.ts`
- `src/lib/offline/`, `src/lib/storage/`, `src/lib/feedback/`
- `src/contexts/FeedbackContext.tsx`

### API routes to remove:
- `src/app/api/integrations/` (all GitHub + Google Calendar OAuth routes)
- `src/app/api/ai/validate-evidence/`, `src/app/api/ai/analyze-patterns/`, `src/app/api/ai/generate-roast/`

### Other deletions:
- `.github/workflows/` (all 3 notification workflows)
- `src/hooks/useOfflineSync.tsx`

### Database tables to drop:
- `routines`
- `integrations`
- Any evidence-related tables

---

## Surviving tRPC Routers (6)

| Router | Purpose |
|--------|---------|
| `task` | CRUD + status updates |
| `goal` | Lightweight CRUD |
| `conversation` | AI chat history persistence |
| `dailyCheck` | Morning/evening check-in logic |
| `notification` | Push subscription + settings management |
| `profile` | Basic user profile |

---

## Database Schema (Simplified)

### `goals` (modified)
```sql
id UUID PRIMARY KEY,
user_id UUID NOT NULL REFERENCES auth.users(id),
title TEXT NOT NULL,
description TEXT,
status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```
Dropped: `github_repos`, `target_date`, `time_horizon`, `paused` status.

### `tasks` (modified)
```sql
id UUID PRIMARY KEY,
user_id UUID NOT NULL REFERENCES auth.users(id),
goal_id UUID REFERENCES goals(id) ON DELETE SET NULL,
title TEXT NOT NULL,
description TEXT,
due_date TIMESTAMPTZ,
start_time TIMESTAMPTZ,
end_time TIMESTAMPTZ,
priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('high', 'medium', 'low')),
status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
tags TEXT[],
recurrence_pattern JSONB,
reflection TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```
Dropped: `completion_proof`, `google_calendar_event_id`, `is_synced_with_calendar`, `parent_task_id`, `reminders`.
Added: `reflection` -- one-liner users write during evening check-in for skipped/incomplete tasks.

### `profiles` (modified)
```sql
id UUID PRIMARY KEY REFERENCES auth.users(id),
name TEXT,
email TEXT,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```
Dropped: `profile_pic_url`.
Added: `email` for Resend delivery.

### `notification_settings` (modified)
```sql
user_id UUID PRIMARY KEY REFERENCES auth.users(id),
timezone TEXT NOT NULL,
morning_check_enabled BOOLEAN DEFAULT true,
morning_check_time TEXT DEFAULT '09:00',
evening_check_enabled BOOLEAN DEFAULT true,
evening_check_time TEXT DEFAULT '18:00',
email_notifications_enabled BOOLEAN DEFAULT true,
push_notifications_enabled BOOLEAN DEFAULT true
```
Dropped: `hourly_review_*` columns.
Added: `email_notifications_enabled`, `push_notifications_enabled` as separate toggles.

### `push_subscriptions` (modified)
```sql
user_id UUID NOT NULL REFERENCES auth.users(id),
endpoint TEXT NOT NULL,
p256dh_key TEXT NOT NULL,
auth_key TEXT NOT NULL,
device_name TEXT,
is_active BOOLEAN DEFAULT true,
last_successful_push TIMESTAMPTZ,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
UNIQUE(user_id, endpoint)
```
Added: `device_name`, `last_successful_push`.

### `conversations` (keep as-is)
```sql
id UUID PRIMARY KEY,
user_id UUID NOT NULL REFERENCES auth.users(id),
title TEXT,
messages JSONB,
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### `weekly_roasts` (new)
```sql
id UUID PRIMARY KEY,
user_id UUID NOT NULL REFERENCES auth.users(id),
week_start DATE NOT NULL,
week_end DATE NOT NULL,
roast_data JSONB NOT NULL,
task_stats JSONB,
delivered_via TEXT[] DEFAULT '{}',
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```
Stores generated roasts for dashboard display and re-delivery.

---

## UX Design

### Page Structure

| Route | Purpose | Rendering |
|-------|---------|-----------|
| `/` | Landing page | Server-rendered (static) |
| `/auth/login` | Google sign-in | Client |
| `/dashboard` | Single main app screen | Client |
| `/how-it-works` | Explainer | Server-rendered (static) |
| `/privacy`, `/terms` | Legal | Server-rendered (static) |

### Dashboard Layout

Mobile-first, single scrollable page with three zones:

1. **Header** -- Logo, time-aware greeting ("Good morning" / "Good evening"), sign out
2. **Content** -- Today's tasks, goals (collapsible), contextual check-in card
3. **Floating chat button** -- Opens AI coach as a slide-up panel

### Check-in Card (contextual)

The check-in card appears based on time of day:
- **Before ~11am:** Morning check-in card
- **After ~5pm:** Evening reality check card
- **Between:** Hidden -- just the task list

### Morning Check-in Flow

1. Card shows yesterday's incomplete tasks
2. User checks which to carry over (auto-sets today's date)
3. User adds new tasks inline
4. Hits "Lock in my plan"
5. AI commentary appears in the chat panel: reacts to the plan, calls out overcommitting

### Evening Check-in Flow

1. Card shows today's tasks with completion checkboxes
2. User marks done/skipped, writes a one-line reflection for skipped tasks
3. Hits "Submit reality check"
4. AI commentary in chat: calls out patterns, gives credit where due

### Weekly Roast

- Generated Sunday morning via Vercel Cron
- Delivered as a styled email (Resend) and as a chat message
- Shows on the dashboard as a dismissable card at the top
- Stored in `weekly_roasts` table for history

### AI Chat Panel

- Floating button at bottom-right, slide-up panel on tap
- Persistent conversation (stored in Supabase)
- AI can create/edit/delete tasks via function calling -- changes reflect on dashboard in real time
- Uses Vercel AI SDK's `useChat` hook for streaming responses

### Responsive Design

- **Mobile-first (375px+):** Single column, full-width cards, floating chat button
- **Desktop (768px+):** Centered container (~640px max-width), same vertical layout with more padding
- No sidebar, no multi-column layouts

---

## Notification System

### Three channels, in reliability order:

1. **Email (Resend)** -- Primary. Always delivered.
2. **Web Push** -- Best-effort nudge if browser/PWA is active.
3. **In-app card** -- Visible when user opens dashboard (time-based).

### Vercel Cron Jobs

```json
{
  "crons": [
    { "path": "/api/cron/check-notifications", "schedule": "0 * * * *" },
    { "path": "/api/cron/weekly-roast", "schedule": "0 * * * 0" }
  ]
}
```

### Hourly notification cron logic:

1. Query `notification_settings` for users whose local time matches morning or evening check-in time (5-minute window)
2. Send email via Resend (if `email_notifications_enabled`)
3. Attempt web push to active subscriptions (if `push_notifications_enabled`)
4. Update `last_successful_push` on success, deactivate expired subscriptions

### Weekly roast cron logic (runs hourly on Sundays, checks local time):

1. Query users whose local Sunday morning time is ~9am (5-minute window, same pattern as notification cron)
2. For each user, fetch week's task data (completed, skipped, reflections, goal progress)
3. Generate roast via Gemini (using weekly roast prompt)
4. Store in `weekly_roasts` table
5. Send styled email via Resend
6. Post as a message in user's chat conversation

### Device tracking:

- `push_subscriptions` table includes `device_name` (parsed from user agent)
- Users can see and manage devices in notification settings
- Expired subscriptions auto-deactivated when push returns 410/404

### Email templates (Resend):

- **Morning:** "Time to plan your day. You have X tasks carried over." CTA links to `/dashboard`
- **Evening:** "How did today go? X tasks waiting for your review." CTA links to `/dashboard`
- **Weekly roast:** Full AI-generated report, styled HTML email. The signature deliverable.

---

## AI System

### Stack

Vercel AI SDK with `@ai-sdk/google` provider (Gemini). Replaces direct `@google/generative-ai` usage.

### AI Touchpoints

| Moment | What the AI does | Trigger |
|--------|-----------------|---------|
| Morning check-in submitted | Reacts to the plan | Form submit |
| Evening check-in submitted | Analyzes planned vs actual | Form submit |
| Chat opened | Continues conversation with full context | User-initiated |
| Weekly roast | Full accountability report | Vercel Cron (Sunday) |

### AI Tools (function calling via AI SDK `tool()`)

- `create_task` -- title, due date, priority, goal link
- `update_task` -- find by name, update fields
- `delete_task` -- find by name, remove
- `list_tasks` -- filter by status, date, goal
- `list_goals` -- current goals with progress counts

### System Prompt

Keep existing `GRINDPROOF_SYSTEM_PROMPT` with modifications:
- Remove references to evidence/proof requirements
- Remove GitHub commit/PR references
- Add instruction: keep check-in commentary to 2-3 sentences (save long roasts for Sunday)
- Add instruction: when reacting to check-in submissions, be specific about the data (not generic encouragement)

### API Routes

- `/api/ai/chat` -- streaming chat endpoint using AI SDK's `streamText()`
- `/api/cron/weekly-roast` -- generates roast, stores it, sends via Resend

Conversation history persisted via tRPC `conversation` router to Supabase.

---

## State Management

### Three focused contexts (replaces single AppContext):

| Context | Responsibility | Data |
|---------|---------------|------|
| `AuthContext` | User session | `user`, `signOut()` |
| `TaskContext` | Tasks + goals | `tasks`, `goals`, CRUD methods, optimistic updates |
| `NotificationContext` | Push state | `isSubscribed`, `subscribe()`, `unsubscribe()` |

### Key decisions:

- No localStorage hydration layer. React Query's cache handles it.
- No offline sync / IndexedDB.
- Optimistic updates with rollback in `TaskContext` only.
- AI chat state managed by AI SDK's `useChat` hook (no context needed).
- Auth is isolated so user object changes don't re-render task lists.

---

## Offline / Slow Connection Handling

No offline-first architecture. Pragmatic graceful degradation:

- **Offline:** "You're offline" banner. Previously loaded tasks remain visible (React Query memory cache). Create/edit/complete actions disabled.
- **Slow connection:** Optimistic UI updates -- actions feel instant, sync in background. React Query retries failed requests (3 retries, exponential backoff). If sync fails, UI rolls back with a toast message.
- **PWA service worker:** Caches app shell (HTML, CSS, JS, fonts) for instant load. Data always requires network.

---

## Component Structure (target)

```
src/
  app/
    page.tsx                    # Landing (server component)
    layout.tsx                  # Root layout (simplified providers)
    auth/login/page.tsx         # Login
    dashboard/page.tsx          # Main app (~200-300 lines max)
    how-it-works/page.tsx       # Static
    privacy/page.tsx            # Static
    terms/page.tsx              # Static
    api/
      [trpc]/route.ts           # tRPC handler
      ai/chat/route.ts          # AI SDK streaming endpoint
      cron/
        check-notifications/route.ts
        weekly-roast/route.ts
  components/
    Logo.tsx
    ChatPanel.tsx               # Slide-up AI chat
    TaskList.tsx                # Today's tasks
    TaskItem.tsx                # Single task row
    GoalList.tsx                # Goals section
    GoalItem.tsx                # Single goal
    MorningCheckIn.tsx          # Morning form + AI reaction
    EveningCheckIn.tsx          # Evening form + AI reaction
    WeeklyRoastCard.tsx         # Dismissable roast display
    NotificationSettings.tsx    # Manage email/push/devices
    AddTaskForm.tsx             # Inline task creation
    ui/                         # Radix primitives (keep)
  contexts/
    AuthContext.tsx
    TaskContext.tsx
    NotificationContext.tsx
  hooks/
    useNotifications.tsx        # Push subscription logic
  server/
    trpc/
      context.ts
      routers/
        _app.ts
        task.ts
        goal.ts
        conversation.ts
        dailyCheck.ts
        notification.ts
        profile.ts
  lib/
    ai/                         # AI SDK tool definitions
    supabase/                   # Client + server + types
    trpc/                       # Client + provider
    prompts/
      system-prompt.ts
      weekly-roast-prompt.ts
    notifications/
      push-service.ts
      email-service.ts          # Resend integration
    config.ts
    env.ts
    utils.ts
```

---

## What This Spec Does NOT Cover

- Google Calendar integration (deferred -- build when users request it)
- GitHub integration (cut)
- Evidence/proof system (cut)
- Offline data sync (cut)
- Multi-language support
- Billing / premium tiers
- Admin dashboard
- User-to-user social features

These are all future considerations, not MVP scope.
