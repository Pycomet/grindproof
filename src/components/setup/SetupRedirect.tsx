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
  const { isSubscribedOnThisDevice, deviceStatusKnown } =
    useNotificationContext();
  const { data } = trpc.profile.getSetupState.useQuery();

  useEffect(() => {
    if (!data || data.setupState !== "pending") return;
    if (!deviceStatusKnown) return;
    if (pathname.startsWith("/dashboard/setup")) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    // Fully set up on this device (installed where iOS requires it, and
    // subscribed ON THIS DEVICE): don't nag, even if setup_state was never
    // marked completed. Account-wide subscriptions from other devices must
    // not count — that would skip setup on a fresh phone.
    const platform = getPlatform(navigator.userAgent);
    const installOk = platform !== "ios-safari" || isStandalone();
    if (installOk && isSubscribedOnThisDevice) return;

    sessionStorage.setItem(SESSION_KEY, "1");
    router.replace("/dashboard/setup");
  }, [data, pathname, isSubscribedOnThisDevice, deviceStatusKnown, router]);

  return null;
}
