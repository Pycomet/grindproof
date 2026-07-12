# Guided Setup — install + notification onboarding

**Date:** 2026-07-12
**Status:** Approved by Alfred (chat), pending implementation plan

## Problem

Push notifications are GrindProof's core mechanic (9am Morning Check-in, 6pm Evening Reality Check, Sunday Weekly Roast), and the target audience skews iPhone. On iOS, web push only works after the user manually installs the PWA via Safari's Share → Add to Home Screen — a step Safari never prompts for and most users have never performed. Today the app neither detects install state nor guides anyone through it: an iPhone signup who skips the ritual gets a silently broken product.

Research basis (verified against Apple docs, 2026-07): iOS web push requires Home Screen install; permission can be revoked for silent pushes (fixed separately in PR #24); delivery can be delayed without urgency headers (also PR #24). This spec covers the remaining gap: getting users installed and subscribed in the first place.

## Goals

1. Every new user exits signup either fully set up (installed where required + subscribed + test push received) or has explicitly chosen to skip.
2. The app always knows which of those states a user is in, server-side.
3. Skippers keep seeing a low-pressure path back to setup.

Non-goals: native app, Android install promotion (Android push works without install), marketing-site changes.

## Key constraint that shapes the design

On iOS, the installed Home Screen app has a **separate storage container from Safari** — sessions, localStorage, and service-worker registrations do not transfer. The user will land in the installed app logged out. Therefore setup progress must live server-side (on the profile), and the flow must survive: start in Safari → install → reopen → log in again → resume.

## Design

### 1. Detection layer — `src/lib/setup/device.ts`

Pure client-side functions, individually unit-testable:

- `getPlatform(ua: string)`: `'ios-safari' | 'ios-inapp' | 'android' | 'desktop'` (in-app browsers like Instagram's can't install PWAs and must be told to open Safari)
- `isStandalone()`: `window.matchMedia('(display-mode: standalone)').matches` (plus legacy `navigator.standalone` for iOS)
- Permission/subscription state comes from the existing `NotificationContext` (`isSupported`, `isSubscribed`) and `Notification.permission`.

A pure `selectSetupScreen(signals)` function maps the detected signals to one of the screens below — this is the state machine, testable without a browser.

### 2. Server-side progress

- New column on `profiles`: `setup_state text not null default 'pending'` — values `'pending' | 'completed' | 'dismissed'`. Migration in `supabase/migrations/`.
- tRPC: extend the existing profile/settings router with `getSetupState` / `setSetupState` (authed, self only).
- `completed` is set only after the test-push step is confirmed; `dismissed` only by explicit user action on the checklist card.

### 3. `/setup` route (approach A)

Authed client page at `/dashboard/setup` (`src/app/dashboard/setup/page.tsx`) — inherits the dashboard's auth guard and `NotificationProvider` for free. Renders exactly one screen from the state machine:

| Screen | Shown when | Content |
|---|---|---|
| Install | iPhone Safari, not standalone | Illustrated 3-step A2HS walkthrough (Share → Add to Home Screen → open from icon). States plainly that setup continues inside the installed app. No fake "verify" button. |
| Wrong browser | iOS in-app browser | "Open grindproof.co in Safari" with copy-link button. |
| Enable notifications | Standalone iOS, or Android/desktop, and not subscribed | One button → existing `NotificationContext.subscribe()`. Permission-denied shows honest recovery copy (iOS: Settings → Notifications → GrindProof; cannot re-prompt from web). |
| Test push | Subscribed, not yet verified | "Send test roast" → server push via existing `sendPushToUser` (`urgency: 'high'`). Buttons: "It arrived" (→ Done) / "Nothing came" (→ troubleshooting list: Focus modes, Low Power Mode, notification settings; retry button). |
| Done | All verified | Sets `setup_state = 'completed'`, CTA to dashboard. |

Every screen has a quiet "Skip for now" → dashboard, state stays `pending`. Voice and styling follow the design system: zinc surfaces, amber accent, Lucide icons, blunt second-person copy, no emoji.

"Verified" for the test-push step is session-local UI state (user confirmation click), not a new DB field — `setup_state` is the only persisted state.

### 4. Routing into setup

- After signup: redirect to `/dashboard/setup`.
- After login: if `setup_state === 'pending'` **and** this device isn't fully set up (not standalone-or-desktop with subscription), redirect once per session to `/setup`. Implemented in the authed layout/client, not middleware (needs client-side signals).
- `completed`/`dismissed`: never redirected. Settings gains a "Re-run setup" link to `/dashboard/setup` (also covers new devices later).

### 5. Dashboard checklist card (approach C)

Card on the dashboard, rendered only while `setup_state === 'pending'`: three rows — Install (auto-detected), Notifications (from `isSubscribed`), Test push (done only via `/setup`) — each row links to `/setup`. "Dismiss" sets `dismissed`. Reuses the same detection functions; card styling matches existing dashboard cards.

## Error handling

- **Permission denied on iOS**: terminal from the web; the flow says so and shows the manual Settings path. Never loops the prompt.
- **Test push doesn't arrive**: troubleshooting screen, retry allowed; user can still complete or skip — never trapped.
- **Unsupported context** (in-app browser, old iOS): explicit "open in Safari" screen rather than a broken generic flow.
- **Push send failure server-side**: surfaced as a visible error with retry, not a silent success.

## Testing

- Unit: `getPlatform`, `isStandalone` wrapper, and `selectSetupScreen` state machine (all pure; mock signals). Vitest, colocated with existing test layout under `src/__tests__/`.
- Existing push-service tests cover sending (extended in PR #24).
- tRPC setup-state procedures: unit tests following existing router test patterns.
- Acceptance: manual run on Alfred's physical iPhone — full journey Safari signup → install → re-login → subscribe → test push received. Alfred is user zero.

## Decisions log

- Post-signup dedicated route over modal/banner-only: survives the forced app-switch on iOS install; linkable.
- Server-side `setup_state` over localStorage: iOS storage isolation between Safari and installed app.
- Checklist card (C) included as re-entry surface for skippers; built after the route works.
- No Android A2HS promotion: push works in Android browsers without install; YAGNI.
