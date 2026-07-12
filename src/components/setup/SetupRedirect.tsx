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
