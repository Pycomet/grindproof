# Settings Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `/dashboard/settings` page where users manage their profile, notifications, timezone, and account.

**Architecture:** Single client page component broken into section components. Uses existing tRPC `notification` and `profile` routers for most data. Adds a `deleteAccount` mutation to the profile router. Gear icon in the dashboard header provides navigation.

**Tech Stack:** Next.js App Router, tRPC, Supabase, shadcn/ui (Input, Label, Select, Dialog, Card), Tailwind CSS, lucide-react icons.

---

### Task 1: Add `deleteAccount` mutation to profile router

**Files:**
- Modify: `src/server/trpc/routers/profile.ts`

- [ ] **Step 1: Add the deleteAccount mutation**

Add this mutation after the existing `update` mutation in `src/server/trpc/routers/profile.ts`:

```ts
deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
  const userId = ctx.user.id;

  // Delete user data from all tables (order matters for foreign keys)
  const tables = [
    "notification_log",
    "push_subscriptions",
    "notification_settings",
    "user_feedback",
    "accountability_scores",
    "tasks",
    "goals",
    "profiles",
  ] as const;

  for (const table of tables) {
    const { error } = await ctx.db.from(table).delete().eq("user_id", userId);
    if (error) {
      console.error(`Failed to delete from ${table}:`, error.message);
    }
  }

  // Delete the auth user via admin API
  const { createClient } = await import("@supabase/supabase-js");
  const adminDb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  const { error: authError } = await adminDb.auth.admin.deleteUser(userId);
  if (authError) {
    throw new Error(`Failed to delete auth user: ${authError.message}`);
  }

  return { success: true };
}),
```

Note: We need the `env` import at the top. The file already imports from `"../context"` — for the admin client we use `process.env` directly since `env` from `@/lib/env` would also work but the dynamic import of `@supabase/supabase-js` keeps it cleaner.

- [ ] **Step 2: Verify the server builds**

Run: `npx tsc --noEmit`
Expected: No type errors related to profile router.

- [ ] **Step 3: Commit**

```bash
git add src/server/trpc/routers/profile.ts
git commit -m "feat: add deleteAccount mutation to profile router"
```

---

### Task 2: Add gear icon to dashboard header

**Files:**
- Modify: `src/app/dashboard/page.tsx`

- [ ] **Step 1: Add the gear icon link**

At the top of `src/app/dashboard/page.tsx`, add the `Link` and icon import:

```ts
import Link from "next/link";
import { Settings } from "lucide-react";
```

- [ ] **Step 2: Replace the sign-out button area in the header**

In the header's `<div className="flex items-center gap-4">`, replace the existing sign-out button with a gear icon link (sign-out moves to the settings page):

Change the header right section from:

```tsx
<div className="flex items-center gap-4">
  <span className="text-sm text-zinc-500">{getGreeting()}</span>
  <button
    onClick={signOut}
    className="text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50"
  >
    Sign Out
  </button>
</div>
```

To:

```tsx
<div className="flex items-center gap-4">
  <span className="text-sm text-zinc-500">{getGreeting()}</span>
  <Link
    href="/dashboard/settings"
    className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
  >
    <Settings className="h-5 w-5" />
  </Link>
</div>
```

- [ ] **Step 3: Remove the unused `signOut` destructure if no longer used in this file**

In the `Dashboard` component, change:

```ts
const { user, isLoading, signOut } = useAuth();
```

To:

```ts
const { user, isLoading } = useAuth();
```

- [ ] **Step 4: Verify the page renders**

Run: `pnpm dev` and navigate to `/dashboard`. Confirm the gear icon appears in the header and links to `/dashboard/settings`.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "feat: add settings gear icon to dashboard header"
```

---

### Task 3: Create the settings page

**Files:**
- Create: `src/app/dashboard/settings/page.tsx`

This is the main task. The page has four sections: Profile, Notifications, Timezone, and Account.

- [ ] **Step 1: Create the settings page file**

Create `src/app/dashboard/settings/page.tsx` with the full implementation:

```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { trpc } from "@/lib/trpc/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

function ProfileSection() {
  const { data: profile, isLoading } = trpc.profile.getCurrent.useQuery();
  const utils = trpc.useUtils();
  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => utils.profile.getCurrent.invalidate(),
  });
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile?.name]);

  const handleSave = () => {
    updateProfile.mutate(
      { name },
      {
        onSuccess: () => {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  };

  if (isLoading) return <SectionSkeleton />;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Profile</h2>
      <div className="space-y-2">
        <Label htmlFor="name">Display name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={updateProfile.isPending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {updateProfile.isPending ? "Saving..." : "Save"}
        </button>
        {saved && <span className="text-sm text-green-600 dark:text-green-400">Saved</span>}
        {updateProfile.isError && (
          <span className="text-sm text-red-600 dark:text-red-400">Failed to save</span>
        )}
      </div>
    </section>
  );
}

function NotificationsSection() {
  const { data: settings, isLoading } = trpc.notification.getSettings.useQuery();
  const utils = trpc.useUtils();
  const updateSettings = trpc.notification.updateSettings.useMutation({
    onSuccess: () => utils.notification.getSettings.invalidate(),
  });
  const { isSubscribed, isSupported, subscribe, unsubscribe } = useNotificationContext();

  const toggle = (field: string, value: boolean) => {
    updateSettings.mutate({ [field]: value });
  };

  const updateTime = (field: string, value: string) => {
    updateSettings.mutate({ [field]: value });
  };

  if (isLoading || !settings) return <SectionSkeleton />;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Notifications</h2>

      {/* Morning check-in */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Morning check-in</p>
          <p className="text-xs text-zinc-500">Daily planning reminder</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={settings.morningCheckTime}
            onChange={(e) => updateTime("morningCheckTime", e.target.value)}
            disabled={!settings.morningCheckEnabled}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
          <ToggleSwitch
            checked={settings.morningCheckEnabled}
            onChange={(v) => toggle("morningCheckEnabled", v)}
          />
        </div>
      </div>

      {/* Evening check-in */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Evening check-in</p>
          <p className="text-xs text-zinc-500">Daily review reminder</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="time"
            value={settings.eveningCheckTime}
            onChange={(e) => updateTime("eveningCheckTime", e.target.value)}
            disabled={!settings.eveningCheckEnabled}
            className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-50"
          />
          <ToggleSwitch
            checked={settings.eveningCheckEnabled}
            onChange={(v) => toggle("eveningCheckEnabled", v)}
          />
        </div>
      </div>

      {/* Email notifications */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Email notifications</p>
          <p className="text-xs text-zinc-500">Receive check-in reminders via email</p>
        </div>
        <ToggleSwitch
          checked={settings.emailNotificationsEnabled}
          onChange={(v) => toggle("emailNotificationsEnabled", v)}
        />
      </div>

      {/* Push notifications */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Push notifications</p>
          <p className="text-xs text-zinc-500">
            {isSupported ? "Browser push notifications" : "Not supported in this browser"}
          </p>
        </div>
        <ToggleSwitch
          checked={isSubscribed}
          onChange={(v) => (v ? subscribe() : unsubscribe())}
          disabled={!isSupported}
        />
      </div>

      {updateSettings.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">Failed to update settings</p>
      )}
    </section>
  );
}

function TimezoneSection() {
  const { data: settings, isLoading } = trpc.notification.getSettings.useQuery();
  const utils = trpc.useUtils();
  const updateSettings = trpc.notification.updateSettings.useMutation({
    onSuccess: () => utils.notification.getSettings.invalidate(),
  });

  const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timezones = Intl.supportedValuesOf("timeZone");

  if (isLoading || !settings) return <SectionSkeleton />;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Timezone</h2>
      <p className="text-xs text-zinc-500">
        Detected: {detectedTz}
      </p>
      <Select
        value={settings.timezone}
        onValueChange={(value) => updateSettings.mutate({ timezone: value })}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select timezone" />
        </SelectTrigger>
        <SelectContent>
          {timezones.map((tz) => (
            <SelectItem key={tz} value={tz}>
              {tz.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {updateSettings.isError && (
        <p className="text-sm text-red-600 dark:text-red-400">Failed to update timezone</p>
      )}
    </section>
  );
}

function AccountSection() {
  const { signOut } = useAuth();
  const router = useRouter();
  const deleteAccount = trpc.profile.deleteAccount.useMutation({
    onSuccess: () => {
      router.push("/");
    },
  });

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Account</h2>

      <button
        onClick={signOut}
        className="w-full rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Sign out
      </button>

      <Dialog>
        <DialogTrigger asChild>
          <button className="w-full rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950">
            Delete account
          </button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all your data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deleteAccount.isError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              Failed to delete account. Please try again.
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <button className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800">
                Cancel
              </button>
            </DialogClose>
            <button
              onClick={() => deleteAccount.mutate()}
              disabled={deleteAccount.isPending}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleteAccount.isPending ? "Deleting..." : "Delete my account"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
        checked ? "bg-zinc-900 dark:bg-zinc-50" : "bg-zinc-200 dark:bg-zinc-700"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform dark:bg-zinc-900 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

function SectionSkeleton() {
  return (
    <div className="space-y-3">
      <div className="h-5 w-24 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
      <div className="h-9 w-full animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-50" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-xl items-center gap-3 px-4 py-4">
          <Link
            href="/dashboard"
            className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">Settings</h1>
        </div>
      </header>

      <div className="mx-auto max-w-xl space-y-8 px-4 py-6">
        <ProfileSection />
        <hr className="border-zinc-200 dark:border-zinc-800" />
        <NotificationsSection />
        <hr className="border-zinc-200 dark:border-zinc-800" />
        <TimezoneSection />
        <hr className="border-zinc-200 dark:border-zinc-800" />
        <AccountSection />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify the page renders**

Run: `pnpm dev` and navigate to `/dashboard/settings`. Confirm:
- Back arrow links to `/dashboard`
- Profile section shows name input with save button
- Notification toggles and time pickers render
- Timezone dropdown populates with IANA timezones
- Account section shows sign out and delete account buttons

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/settings/page.tsx
git commit -m "feat: add settings page with profile, notifications, timezone, and account sections"
```

---

### Task 4: Wrap settings page with required providers

The settings page uses `useNotificationContext()` and `trpc` queries, which need their providers. The dashboard page wraps content in `TaskProvider > NotificationProvider > ChatProvider`, but the settings route is a separate page. We need to add a dashboard layout that shares providers.

**Files:**
- Create: `src/app/dashboard/layout.tsx`
- Modify: `src/app/dashboard/page.tsx` — remove provider wrapping (now in layout)

- [ ] **Step 1: Create the dashboard layout**

Create `src/app/dashboard/layout.tsx`:

```tsx
"use client";

import { TaskProvider } from "@/contexts/TaskContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ChatProvider } from "@/contexts/ChatContext";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TaskProvider>
      <NotificationProvider>
        <ChatProvider>
          {children}
        </ChatProvider>
      </NotificationProvider>
    </TaskProvider>
  );
}
```

- [ ] **Step 2: Remove providers from dashboard page**

In `src/app/dashboard/page.tsx`, the `Dashboard` component currently wraps content in `<TaskProvider><NotificationProvider><ChatProvider>`. Remove those wrappers so it returns the inner content directly:

Change:

```tsx
return (
  <TaskProvider>
    <NotificationProvider>
      <ChatProvider>
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
          <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-4">
              <Logo size="md" href="/" />
              <div className="flex items-center gap-4">
                <span className="text-sm text-zinc-500">{getGreeting()}</span>
                <Link
                  href="/dashboard/settings"
                  className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
                >
                  <Settings className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </header>

          <DashboardContent />
          <ChatPanel />
        </div>
      </ChatProvider>
    </NotificationProvider>
  </TaskProvider>
);
```

To:

```tsx
return (
  <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-4">
        <Logo size="md" href="/" />
        <div className="flex items-center gap-4">
          <span className="text-sm text-zinc-500">{getGreeting()}</span>
          <Link
            href="/dashboard/settings"
            className="text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-50 transition-colors"
          >
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>

    <DashboardContent />
    <ChatPanel />
  </div>
);
```

Also remove the now-unused provider imports from the top of the file:

```ts
// Remove these imports:
import { TaskProvider } from "@/contexts/TaskContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { ChatProvider } from "@/contexts/ChatContext";
```

- [ ] **Step 3: Verify both pages work**

Run: `pnpm dev`
- Navigate to `/dashboard` — should work as before (providers now come from layout)
- Navigate to `/dashboard/settings` — notification toggles should work (providers shared via layout)

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/layout.tsx src/app/dashboard/page.tsx
git commit -m "refactor: move providers to dashboard layout for shared access"
```

---

### Task 5: End-to-end manual testing and polish

**Files:**
- Possibly modify: `src/app/dashboard/settings/page.tsx` (if issues found)

- [ ] **Step 1: Test profile save flow**

1. Go to `/dashboard/settings`
2. Change the display name, click Save
3. Reload the page — name should persist
4. Clear the name, click Save — should save as null

- [ ] **Step 2: Test notification toggles**

1. Toggle morning check-in off — time picker should grey out
2. Toggle it back on — time picker should re-enable
3. Change the morning time — reload, should persist
4. Toggle email notifications off — reload, should persist

- [ ] **Step 3: Test timezone selection**

1. Verify the detected timezone shows as hint text
2. Select a different timezone from the dropdown
3. Reload — selected timezone should persist

- [ ] **Step 4: Test account actions**

1. Click "Delete account" — confirmation dialog should appear
2. Click "Cancel" — dialog closes, nothing happens
3. Click "Sign out" — redirects to login page

- [ ] **Step 5: Commit any fixes**

```bash
git add -u
git commit -m "fix: settings page polish from manual testing"
```
