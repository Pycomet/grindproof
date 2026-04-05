# Settings Page Design

**Date:** 2026-04-05
**Route:** `/dashboard/settings`
**Branch:** `mvp-v2`

## Overview

User-facing settings page accessible from a gear icon in the dashboard header. Allows users to manage their profile, notification preferences, timezone, and account. No integrations section (removed in MVP v2 simplification).

## Route & Layout

- **File:** `src/app/dashboard/settings/page.tsx` (client component)
- **Layout:** Same `max-w-xl` centered layout as dashboard
- **Navigation:** Back arrow linking to `/dashboard` at the top
- **Entry point:** Gear icon added to the right side of the dashboard header (next to greeting text, before sign-out)

## Sections

### 1. Profile

- Display name text input, pre-filled from `profiles.name`
- "Save" button below the input
- **Backend:** New `profile` tRPC router with `get` query and `update` mutation
  - `get`: fetches `profiles` row by `user_id`, returns `{ name }`
  - `update`: upserts `profiles.name` by `user_id`, returns updated `{ name }`

### 2. Notifications

- **Morning check-in:** Toggle (on/off) + time picker (HH:MM format). Time picker disabled when toggle is off.
- **Evening check-in:** Same toggle + time picker pattern.
- **Email notifications:** Single toggle — master switch for all email sends (morning, evening, weekly roast).
- **Push notifications:** Toggle that triggers browser permission flow via existing `NotificationContext.subscribe()` / `unsubscribe()`. Shows current subscription status.
- **Backend:** Uses existing `notification.getSettings` and `notification.updateSettings` tRPC endpoints. No backend changes needed.

### 3. Timezone

- Auto-detected on first load via `Intl.DateTimeFormat().resolvedOptions().timeZone`
- Select dropdown with all IANA timezones via `Intl.supportedValuesOf('timeZone')` for manual override
- Displays current detected timezone as hint text
- **Backend:** Saved via existing `notification.updateSettings({ timezone })` — timezone is already a field on `notification_settings`

### 4. Account

- **Sign out:** Button using existing `signOut()` from `AuthContext`
- **Delete account:** Red destructive button with confirmation dialog ("Are you sure? This cannot be undone.")
  - **Backend:** New `profile.deleteAccount` mutation
    - Deletes from: `tasks`, `goals`, `notification_settings`, `push_subscriptions`, `notification_log`, `accountability_scores`, `user_feedback`, `profiles`
    - Deletes Supabase auth user via admin API (`supabase.auth.admin.deleteUser`)
    - Uses service role key (server-side only)
    - Returns success, client redirects to `/`

## Data Flow

- Page loads `notification.getSettings` and `profile.get` on mount
- Each section saves independently — no global "save all"
- Toggles save immediately on change (optimistic UI with error rollback)
- Text inputs (display name) save on explicit button click
- Loading skeleton shown while data fetches

## Files to Create

- `src/app/dashboard/settings/page.tsx` — settings page component
- `src/server/trpc/routers/profile.ts` — profile tRPC router (get, update, deleteAccount)

## Files to Modify

- `src/app/dashboard/page.tsx` — add gear icon to header linking to settings
- `src/server/trpc/routers/_app.ts` — register `profileRouter`

## UI Components

Uses existing project UI primitives (buttons, inputs from `src/components/ui/`). No new UI components needed. Time picker uses native `<input type="time">`. Timezone select uses existing `<Select>` component.

## Error Handling

- Failed saves show inline error text below the relevant section
- Delete account failure shows error in the confirmation dialog
- Network errors on toggle changes roll back the toggle state

## Testing

- Unit test for `profile` tRPC router (get, update, deleteAccount)
- Manual testing: toggle states persist across page reloads, timezone auto-detection works, delete account clears all data
