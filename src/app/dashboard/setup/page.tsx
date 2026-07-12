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
