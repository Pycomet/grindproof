# Guided Setup (install + notification onboarding) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every new user exits signup either fully set up (PWA installed where required + push subscribed + test push received) or has explicitly skipped — with the state known server-side.

**Architecture:** A pure client-side detection layer (`platform`, `standalone`, screen state machine) drives a single authed route `/dashboard/setup` that renders one of five screens. Progress persists in a new `profiles.setup_state` column (iOS Safari and the installed PWA do not share storage, so localStorage cannot work). A once-per-session redirect sends `pending` users to setup; a dismissible dashboard checklist card is the re-entry surface.

**Tech Stack:** Next.js 16 App Router (client components), tRPC v11, Supabase Postgres, Tailwind 4, Lucide icons, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-12-guided-setup-design.md`

## Global Constraints

- Branch: `feat/guided-setup` (already created from `origin/main`).
- **Prerequisite:** PR #24 (`fix/ios-push-reliability`) should be merged to main and this branch rebased before Task 4, so `NotificationPayload` has `urgency`/`ttl`. If not merged yet, omit the `urgency`/`ttl` fields in Task 4 Step 3 and add them after rebase.
- Copy rules (design system): second person, blunt, no emoji, no exclamation points. Zinc surfaces, amber accent only via existing `bg-brand`/`text-brand` tokens, Lucide icons.
- `docs/` is gitignored — plan/spec commits need `git add -f`. Nothing else in this plan lives under `docs/`.
- All new client code must guard browser APIs (`typeof window !== "undefined"`) — pages render on the server first.
- Values are exactly: `setup_state ∈ {'pending','completed','dismissed'}`, screens ∈ `{'install','wrong-browser','enable-notifications','test-push','done'}`, platforms ∈ `{'ios-safari','ios-inapp','android','desktop'}`.

---

### Task 1: `profiles.setup_state` column + types

**Files:**
- Create: `supabase/migrations/20260712000000_add_profile_setup_state.sql`
- Modify: `src/lib/supabase/types.ts` (profiles Row/Insert/Update, around lines 45-70)

**Interfaces:**
- Produces: DB column `profiles.setup_state text not null default 'pending'`; TS type field `setup_state: string` available on `Database["public"]["Tables"]["profiles"]`.

- [ ] **Step 1: Write the migration**

```sql
-- supabase/migrations/20260712000000_add_profile_setup_state.sql
alter table public.profiles
  add column if not exists setup_state text not null default 'pending'
  constraint profiles_setup_state_check
  check (setup_state in ('pending', 'completed', 'dismissed'));
```

- [ ] **Step 2: Update the hand-maintained DB types**

In `src/lib/supabase/types.ts`, inside `profiles`, add to `Row`:

```ts
          setup_state: string;
```

and to both `Insert` and `Update`:

```ts
          setup_state?: string;
```

- [ ] **Step 3: Verify types compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260712000000_add_profile_setup_state.sql src/lib/supabase/types.ts
git commit -m "feat(db): add profiles.setup_state for guided setup progress"
```

Note: applying the migration to the linked project (`npx supabase db push`) is deferred to Task 7 — it touches the live database and needs Alfred's go-ahead.

---

### Task 2: Detection layer (pure functions)

**Files:**
- Create: `src/lib/setup/device.ts`
- Test: `src/__tests__/lib/setup-device.test.ts`

**Interfaces:**
- Produces (exact signatures, consumed by Tasks 4-6):

```ts
export type Platform = "ios-safari" | "ios-inapp" | "android" | "desktop";
export type SetupScreen = "install" | "wrong-browser" | "enable-notifications" | "test-push" | "done";
export interface SetupSignals {
  platform: Platform;
  standalone: boolean;
  subscribed: boolean;
  testPushConfirmed: boolean;
}
export function getPlatform(ua: string): Platform;
export function isStandalone(): boolean;
export function selectSetupScreen(signals: SetupSignals): SetupScreen;
```

- [ ] **Step 1: Write the failing tests**

```ts
// src/__tests__/lib/setup-device.test.ts
import { describe, expect, it } from "vitest";
import {
  getPlatform,
  selectSetupScreen,
  type SetupSignals,
} from "@/lib/setup/device";

const IPHONE_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IPHONE_INSTAGRAM =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0";
const IPHONE_CHROME =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/125.0.0.0 Mobile/15E148 Safari/604.1";
const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36";
const MAC_CHROME =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

describe("getPlatform", () => {
  it("detects iPhone Safari", () => {
    expect(getPlatform(IPHONE_SAFARI)).toBe("ios-safari");
  });
  it("detects iOS in-app/non-Safari browsers as ios-inapp", () => {
    expect(getPlatform(IPHONE_INSTAGRAM)).toBe("ios-inapp");
    expect(getPlatform(IPHONE_CHROME)).toBe("ios-inapp");
  });
  it("detects Android and desktop", () => {
    expect(getPlatform(ANDROID_CHROME)).toBe("android");
    expect(getPlatform(MAC_CHROME)).toBe("desktop");
  });
});

describe("selectSetupScreen", () => {
  const base: SetupSignals = {
    platform: "ios-safari",
    standalone: false,
    subscribed: false,
    testPushConfirmed: false,
  };

  it("sends iOS in-app browsers to wrong-browser regardless of other signals", () => {
    expect(selectSetupScreen({ ...base, platform: "ios-inapp" })).toBe("wrong-browser");
  });
  it("sends uninstalled iPhone Safari users to install", () => {
    expect(selectSetupScreen(base)).toBe("install");
  });
  it("sends installed-but-unsubscribed users to enable-notifications", () => {
    expect(selectSetupScreen({ ...base, standalone: true })).toBe("enable-notifications");
  });
  it("does not require install on android/desktop", () => {
    expect(selectSetupScreen({ ...base, platform: "android" })).toBe("enable-notifications");
    expect(selectSetupScreen({ ...base, platform: "desktop" })).toBe("enable-notifications");
  });
  it("sends subscribed users to test-push until confirmed", () => {
    expect(
      selectSetupScreen({ ...base, standalone: true, subscribed: true })
    ).toBe("test-push");
  });
  it("returns done when everything is verified", () => {
    expect(
      selectSetupScreen({
        ...base,
        standalone: true,
        subscribed: true,
        testPushConfirmed: true,
      })
    ).toBe("done");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/lib/setup-device.test.ts`
Expected: FAIL — cannot resolve `@/lib/setup/device`.

- [ ] **Step 3: Implement**

```ts
// src/lib/setup/device.ts
export type Platform = "ios-safari" | "ios-inapp" | "android" | "desktop";

export type SetupScreen =
  | "install"
  | "wrong-browser"
  | "enable-notifications"
  | "test-push"
  | "done";

export interface SetupSignals {
  platform: Platform;
  standalone: boolean;
  subscribed: boolean;
  testPushConfirmed: boolean;
}

// Non-Safari iOS browsers (Chrome/Firefox/in-app webviews) cannot install a
// PWA to the Home Screen, which is the only way iOS allows web push.
const IOS_NON_SAFARI =
  /Instagram|FBAN|FBAV|FB_IAB|Twitter|TikTok|Snapchat|Line\/|GSA\/|CriOS|FxiOS|EdgiOS|OPT\//;

export function getPlatform(ua: string): Platform {
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  if (!isIOS) return /Android/.test(ua) ? "android" : "desktop";
  return IOS_NON_SAFARI.test(ua) ? "ios-inapp" : "ios-safari";
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  return (
    "standalone" in window.navigator &&
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function selectSetupScreen(s: SetupSignals): SetupScreen {
  if (s.platform === "ios-inapp") return "wrong-browser";
  if (s.platform === "ios-safari" && !s.standalone) return "install";
  if (!s.subscribed) return "enable-notifications";
  if (!s.testPushConfirmed) return "test-push";
  return "done";
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/lib/setup-device.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/setup/device.ts src/__tests__/lib/setup-device.test.ts
git commit -m "feat(setup): platform/standalone detection and screen state machine"
```

---

### Task 3: tRPC setup-state procedures

**Files:**
- Modify: `src/server/trpc/routers/profile.ts` (add two procedures to the existing `profileRouter`)
- Test: `src/__tests__/lib/profile-setup-state.test.ts`

**Interfaces:**
- Consumes: existing `router`, `protectedProcedure` from `../context`; `profiles` table keyed by `id`.
- Produces (consumed by Tasks 4-6 via `trpc.profile.*`):
  - `getSetupState` query → `{ setupState: "pending" | "completed" | "dismissed" }`
  - `setSetupState` mutation, input `{ setupState: "pending" | "completed" | "dismissed" }` → same shape back.

- [ ] **Step 1: Write the failing test**

The repo has no tRPC-caller test precedent, so test the procedures through the router's `createCaller` with a stubbed `ctx.db` (same stubbing style as `push-service.test.ts`):

```ts
// src/__tests__/lib/profile-setup-state.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { profileRouter } from "@/server/trpc/routers/profile";

const maybeSingleMock = vi.fn();
const upsertMock = vi.fn();

function makeDb() {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
      })),
      upsert: upsertMock,
    })),
  };
}

function makeCtx() {
  return {
    db: makeDb(),
    user: { id: "user-1", email: "a@b.co", user_metadata: {} },
  } as never;
}

describe("profile setup state", () => {
  beforeEach(() => {
    maybeSingleMock.mockReset();
    upsertMock.mockReset();
  });

  it("returns pending when no profile row exists", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    const caller = profileRouter.createCaller(makeCtx());
    const result = await caller.getSetupState();
    expect(result.setupState).toBe("pending");
  });

  it("returns the stored state", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { setup_state: "completed" },
      error: null,
    });
    const caller = profileRouter.createCaller(makeCtx());
    const result = await caller.getSetupState();
    expect(result.setupState).toBe("completed");
  });

  it("upserts the new state", async () => {
    upsertMock.mockResolvedValue({ error: null });
    const caller = profileRouter.createCaller(makeCtx());
    const result = await caller.setSetupState({ setupState: "dismissed" });
    expect(result.setupState).toBe("dismissed");
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1", setup_state: "dismissed" })
    );
  });

  it("rejects invalid states", async () => {
    const caller = profileRouter.createCaller(makeCtx());
    await expect(
      // @ts-expect-error intentionally invalid
      caller.setSetupState({ setupState: "nope" })
    ).rejects.toThrow();
  });
});
```

If `protectedProcedure`'s middleware requires more ctx fields than `db`/`user`, add the minimal extra stub fields it demands (read `src/server/trpc/context.ts` and mirror what the middleware checks) rather than weakening the middleware.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/lib/profile-setup-state.test.ts`
Expected: FAIL — `getSetupState` is not a procedure on the router.

- [ ] **Step 3: Implement the procedures**

In `src/server/trpc/routers/profile.ts`, add below `updateProfileSchema`:

```ts
export const setupStateSchema = z.enum(["pending", "completed", "dismissed"]);
export type SetupState = z.infer<typeof setupStateSchema>;
```

and add two procedures inside `profileRouter`:

```ts
  getSetupState: protectedProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.db
      .from("profiles")
      .select("setup_state")
      .eq("id", ctx.user.id)
      .maybeSingle();

    if (error) throw new Error(`Failed to fetch setup state: ${error.message}`);
    const parsed = setupStateSchema.safeParse(data?.setup_state);
    return { setupState: parsed.success ? parsed.data : ("pending" as const) };
  }),

  setSetupState: protectedProcedure
    .input(z.object({ setupState: setupStateSchema }))
    .mutation(async ({ ctx, input }) => {
      // Profile row may not exist yet (see getCurrent) — upsert, not update.
      const { error } = await ctx.db.from("profiles").upsert({
        id: ctx.user.id,
        email: ctx.user.email ?? null,
        setup_state: input.setupState,
      });

      if (error) throw new Error(`Failed to update setup state: ${error.message}`);
      return { setupState: input.setupState };
    }),
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/lib/profile-setup-state.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/server/trpc/routers/profile.ts src/__tests__/lib/profile-setup-state.test.ts
git commit -m "feat(trpc): get/set profile setup_state procedures"
```

---

### Task 4: Test-push procedure + `/dashboard/setup` page

**Files:**
- Modify: `src/server/trpc/routers/notification.ts` (add `sendTestPush`)
- Create: `src/app/dashboard/setup/page.tsx`

**Interfaces:**
- Consumes: `sendPushToUser(userId, payload)` from `@/lib/notifications/push-service`; `useNotificationContext()` (`isSupported`, `isSubscribed`, `subscribe`); `getPlatform`/`isStandalone`/`selectSetupScreen` from Task 2; `trpc.profile.getSetupState/setSetupState` from Task 3.
- Produces: `trpc.notification.sendTestPush` mutation → `{ successful: number; failed: number; expired: string[] }`, throws if `successful === 0`. Route `/dashboard/setup` (linked by Tasks 5-6).

- [ ] **Step 1: Add `sendTestPush` to the notification router**

In `src/server/trpc/routers/notification.ts`, add the import and procedure:

```ts
import { sendPushToUser } from "@/lib/notifications/push-service";
```

```ts
  sendTestPush: protectedProcedure.mutation(async ({ ctx }) => {
    const result = await sendPushToUser(ctx.user.id, {
      title: "GrindProof is watching",
      body: "Test roast delivered. Notifications work. No excuses now.",
      url: "/dashboard/setup",
      tag: "test-push",
      urgency: "high",
      ttl: 300,
    });

    if (result.successful === 0) {
      throw new Error(
        "No device received the test push. Check that notifications are enabled."
      );
    }
    return result;
  }),
```

(If PR #24 is not merged into this branch yet, omit `urgency` and `ttl` here and add them after rebasing.)

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Create the setup page**

```tsx
// src/app/dashboard/setup/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BellRing,
  Check,
  Copy,
  Flame,
  Share,
  SquarePlus,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useNotificationContext } from "@/contexts/NotificationContext";
import {
  getPlatform,
  isStandalone,
  selectSetupScreen,
  type Platform,
} from "@/lib/setup/device";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-xl flex-col justify-center gap-6 px-4 py-12">
      {children}
      <Link
        href="/dashboard"
        className="text-center text-sm text-zinc-500 transition-colors hover:text-zinc-300"
      >
        Skip for now
      </Link>
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <h1 className="text-3xl font-bold text-zinc-50 font-[family-name:var(--font-space-grotesk)]">
      {children}
    </h1>
  );
}

function StepCard({
  n,
  icon,
  children,
}: {
  n: number;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4 rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-sm font-bold text-zinc-50">
        {n}
      </div>
      <div className="flex items-center gap-3 text-sm text-zinc-300">
        {icon}
        <span>{children}</span>
      </div>
    </div>
  );
}

export default function SetupPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const { isSubscribed, isSupported, subscribe } = useNotificationContext();

  const [mounted, setMounted] = useState(false);
  const [testPushConfirmed, setTestPushConfirmed] = useState(false);
  const [testPushFailed, setTestPushFailed] = useState(false);
  const [subscribeError, setSubscribeError] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => setMounted(true), []);

  const setState = trpc.profile.setSetupState.useMutation({
    onSuccess: () => utils.profile.getSetupState.invalidate(),
  });
  const sendTest = trpc.notification.sendTestPush.useMutation();

  const platform: Platform = useMemo(
    () => (mounted ? getPlatform(navigator.userAgent) : "desktop"),
    [mounted]
  );

  if (!mounted) return null;

  const screen = selectSetupScreen({
    platform,
    standalone: isStandalone(),
    subscribed: isSubscribed,
    testPushConfirmed,
  });

  if (screen === "wrong-browser") {
    return (
      <Shell>
        <Title>Wrong browser.</Title>
        <p className="text-zinc-300">
          This browser can&apos;t install GrindProof, and iPhones only deliver
          notifications to installed apps. Open grindproof.co in Safari and
          come back to this step.
        </p>
        <button
          onClick={() => {
            navigator.clipboard.writeText("https://grindproof.co/dashboard/setup");
            setCopied(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90"
        >
          <Copy className="h-4 w-4" />
          {copied ? "Copied. Now open Safari." : "Copy link for Safari"}
        </button>
      </Shell>
    );
  }

  if (screen === "install") {
    return (
      <Shell>
        <Title>No install, no roasts.</Title>
        <p className="text-zinc-300">
          iPhones only deliver notifications to apps on your Home Screen. Two
          taps, then reopen GrindProof from the icon — setup continues there.
        </p>
        <div className="space-y-3">
          <StepCard n={1} icon={<Share className="h-4 w-4 shrink-0 text-brand" />}>
            Tap the Share button in Safari&apos;s toolbar
          </StepCard>
          <StepCard n={2} icon={<SquarePlus className="h-4 w-4 shrink-0 text-brand" />}>
            Scroll down and tap &quot;Add to Home Screen&quot;, then Add
          </StepCard>
          <StepCard n={3} icon={<Flame className="h-4 w-4 shrink-0 text-brand" />}>
            Open GrindProof from your Home Screen and log back in
          </StepCard>
        </div>
        <p className="text-sm text-zinc-500">
          You&apos;ll need to log in again inside the installed app — that&apos;s an
          Apple thing, not a bug.
        </p>
      </Shell>
    );
  }

  if (screen === "enable-notifications") {
    const denied =
      typeof Notification !== "undefined" && Notification.permission === "denied";
    return (
      <Shell>
        <Title>Turn on the accountability.</Title>
        <p className="text-zinc-300">
          The 9am plan, the 6pm reckoning, the Sunday roast — all of it arrives
          as notifications. Without them GrindProof is just a to-do list.
        </p>
        {denied ? (
          <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">
            You blocked notifications, and iPhones don&apos;t let us ask twice.
            Fix it manually: Settings → Notifications → GrindProof → Allow
            Notifications. Then come back here.
          </div>
        ) : (
          <button
            onClick={async () => {
              setSubscribeError(false);
              try {
                await subscribe();
              } catch {
                setSubscribeError(true);
              }
            }}
            disabled={!isSupported}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <BellRing className="h-4 w-4" />
            Enable notifications
          </button>
        )}
        {subscribeError && (
          <p className="text-sm text-red-400">
            That didn&apos;t work. Reload and try again.
          </p>
        )}
      </Shell>
    );
  }

  if (screen === "test-push") {
    return (
      <Shell>
        <Title>Prove it works.</Title>
        <p className="text-zinc-300">
          We&apos;ll send one test roast right now. If it shows up, you&apos;re
          done.
        </p>
        <button
          onClick={() => {
            setTestPushFailed(false);
            sendTest.mutate();
          }}
          disabled={sendTest.isPending}
          className="inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {sendTest.isPending ? "Sending..." : "Send test roast"}
        </button>
        {sendTest.isError && (
          <p className="text-sm text-red-400">{sendTest.error.message}</p>
        )}
        {sendTest.isSuccess && (
          <div className="flex gap-3">
            <button
              onClick={() => setTestPushConfirmed(true)}
              className="rounded-full border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-50 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
            >
              It arrived
            </button>
            <button
              onClick={() => setTestPushFailed(true)}
              className="rounded-full border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-400 transition-colors hover:text-zinc-50"
            >
              Nothing came
            </button>
          </div>
        )}
        {testPushFailed && (
          <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">
            <p className="mb-2 font-medium text-zinc-50">Usual suspects:</p>
            <ul className="list-inside list-disc space-y-1">
              <li>A Focus mode (Do Not Disturb, Sleep, Work) is muting it</li>
              <li>Low Power Mode delays background delivery</li>
              <li>Settings → Notifications → GrindProof — banners off</li>
            </ul>
            <p className="mt-2">Fix and hit send again.</p>
          </div>
        )}
      </Shell>
    );
  }

  // done
  return (
    <Shell>
      <Title>Set up. No excuses left.</Title>
      <p className="text-zinc-300">
        Notifications verified. The 9am check-in finds you tomorrow.
      </p>
      <button
        onClick={async () => {
          await setState.mutateAsync({ setupState: "completed" });
          router.replace("/dashboard");
        }}
        disabled={setState.isPending}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-semibold text-brand-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <Check className="h-4 w-4" />
        Go to dashboard
      </button>
    </Shell>
  );
}
```

- [ ] **Step 4: Verify it builds and renders**

Run: `npx tsc --noEmit && npm run build`
Expected: both pass. Then `npm run dev`, log in, open `http://localhost:3000/dashboard/setup` on desktop: should show "Turn on the accountability." (desktop skips install), and after subscribing, "Prove it works."

- [ ] **Step 5: Commit**

```bash
git add src/server/trpc/routers/notification.ts src/app/dashboard/setup/page.tsx
git commit -m "feat(setup): guided setup page with test-push verification"
```

---

### Task 5: Once-per-session redirect for pending users

**Files:**
- Create: `src/components/setup/SetupRedirect.tsx`
- Modify: `src/app/dashboard/layout.tsx` (mount inside `NotificationProvider`)

**Interfaces:**
- Consumes: `trpc.profile.getSetupState`, `useNotificationContext().isSubscribed`, `getPlatform`/`isStandalone` (Task 2).
- Produces: `<SetupRedirect />` — renders nothing; side-effect only.

- [ ] **Step 1: Create the redirect component**

```tsx
// src/components/setup/SetupRedirect.tsx
"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { getPlatform, isStandalone } from "@/lib/setup/device";

const SESSION_KEY = "gp-setup-redirected";

export function SetupRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { isSubscribed } = useNotificationContext();
  const { data } = trpc.profile.getSetupState.useQuery();

  useEffect(() => {
    if (!data || data.setupState !== "pending") return;
    if (pathname.startsWith("/dashboard/setup")) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    // Fully set up on this device (installed where iOS requires it, and
    // subscribed): don't nag, even if setup_state was never marked completed.
    const platform = getPlatform(navigator.userAgent);
    const installOk = platform !== "ios-safari" || isStandalone();
    if (installOk && isSubscribed) return;

    sessionStorage.setItem(SESSION_KEY, "1");
    router.replace("/dashboard/setup");
  }, [data, pathname, isSubscribed, router]);

  return null;
}
```

- [ ] **Step 2: Mount it in the dashboard layout**

In `src/app/dashboard/layout.tsx`, add the import and render it as the first child inside `<NotificationProvider>`:

```tsx
import { SetupRedirect } from "@/components/setup/SetupRedirect";
```

```tsx
      <NotificationProvider>
        <SetupRedirect />
        <ChatProvider>
```

- [ ] **Step 3: Verify behavior manually**

Run: `npm run dev`. With a `pending` profile in a desktop browser with no subscription: first visit to `/dashboard` redirects to `/dashboard/setup`; navigating back to `/dashboard` in the same tab does NOT redirect again (sessionStorage). New tab redirects once again.

- [ ] **Step 4: Commit**

```bash
git add src/components/setup/SetupRedirect.tsx src/app/dashboard/layout.tsx
git commit -m "feat(setup): redirect pending users to setup once per session"
```

---

### Task 6: Dashboard checklist card + settings re-run link

**Files:**
- Create: `src/components/setup/SetupChecklistCard.tsx`
- Modify: `src/app/dashboard/page.tsx` (render card at the top of the main content container)
- Modify: `src/app/dashboard/settings/page.tsx` (add "Re-run setup" link at the bottom of `NotificationsSection`)

**Interfaces:**
- Consumes: `trpc.profile.getSetupState` / `setSetupState`, `useNotificationContext().isSubscribed`, `getPlatform`/`isStandalone`.
- Produces: `<SetupChecklistCard />` — self-hiding card; renders `null` unless `setupState === "pending"`.

- [ ] **Step 1: Create the card**

```tsx
// src/components/setup/SetupChecklistCard.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { getPlatform, isStandalone } from "@/lib/setup/device";

export function SetupChecklistCard() {
  const utils = trpc.useUtils();
  const { data } = trpc.profile.getSetupState.useQuery();
  const { isSubscribed } = useNotificationContext();
  const dismiss = trpc.profile.setSetupState.useMutation({
    onSuccess: () => utils.profile.getSetupState.invalidate(),
  });

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !data || data.setupState !== "pending") return null;

  const platform = getPlatform(navigator.userAgent);
  const installDone = platform !== "ios-safari" || isStandalone();

  const rows = [
    { label: "Install the app", done: installDone },
    { label: "Turn on notifications", done: isSubscribed },
    { label: "Receive a test roast", done: false },
  ];

  return (
    <div className="mb-6 rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-50">
          Setup: {rows.filter((r) => r.done).length} of {rows.length} done
        </p>
        <button
          onClick={() => dismiss.mutate({ setupState: "dismissed" })}
          className="text-xs text-zinc-500 transition-colors hover:text-zinc-300"
        >
          Dismiss
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <Link
            key={row.label}
            href="/dashboard/setup"
            className="flex items-center gap-2 text-sm text-zinc-300 transition-colors hover:text-zinc-50"
          >
            {row.done ? (
              <Check className="h-4 w-4 text-green-400" />
            ) : (
              <X className="h-4 w-4 text-zinc-600" />
            )}
            <span className={row.done ? "line-through opacity-60" : ""}>
              {row.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Render it on the dashboard**

In `src/app/dashboard/page.tsx`: render `<SetupChecklistCard />` as the first child inside the `<main className="flex-1 lg:max-w-xl space-y-3">` element (currently line 41), so it sits above the fold on mobile:

```tsx
      <main className="flex-1 lg:max-w-xl space-y-3">
        <SetupChecklistCard />
```

```tsx
import { SetupChecklistCard } from "@/components/setup/SetupChecklistCard";
```

- [ ] **Step 3: Add the settings link**

In `src/app/dashboard/settings/page.tsx`, at the bottom of `NotificationsSection` (after the push-notification toggle block), add:

```tsx
      <Link
        href="/dashboard/setup"
        className="text-sm text-zinc-400 underline underline-offset-4 transition-colors hover:text-zinc-50"
      >
        Re-run notification setup
      </Link>
```

(Add `import Link from "next/link";` if the file doesn't already import it.)

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run build` — both pass. In `npm run dev`: pending user sees the card with correct ticks; Dismiss hides it permanently (state `dismissed`, survives reload); settings shows the re-run link.

- [ ] **Step 5: Commit**

```bash
git add src/components/setup/SetupChecklistCard.tsx src/app/dashboard/page.tsx src/app/dashboard/settings/page.tsx
git commit -m "feat(setup): dashboard checklist card and settings re-run link"
```

---

### Task 7: Full verification + migration push

**Files:** none new.

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: all green, zero failures — includes the 10 new tests (6 detection, 4 setup-state).

- [ ] **Step 2: Production build**

Run: `npm run build`
Expected: compiles, all pages generate.

- [ ] **Step 3: Apply the migration to the linked Supabase project**

Run: `npx supabase db push`
**STOP — this modifies the live database. Get Alfred's explicit go-ahead first.** Without it, deployed code that selects `setup_state` will error.

- [ ] **Step 4: Manual acceptance on Alfred's iPhone (user zero)**

Checklist: Safari → sign up → redirected to setup → install walkthrough → A2HS → open from icon → log in → "Turn on the accountability." → allow → "Prove it works." → test roast arrives → done screen → dashboard, no card, no redirect. Then: fresh account, skip everything → dashboard shows checklist card → dismiss → card gone, stays gone.

- [ ] **Step 5: Push branch and open PR**

```bash
git push -u origin feat/guided-setup
gh pr create --base main --title "feat(setup): guided install + notification onboarding" # body per git-workflow template
```
