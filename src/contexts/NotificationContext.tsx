"use client";

import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { trpc } from "@/lib/trpc/client";
import { useAuth } from "./AuthContext";

interface NotificationContextType {
  /** Any device on the account has an active subscription. */
  isSubscribed: boolean;
  /**
   * THIS device/browser holds a push subscription. Setup flows must use
   * this, not isSubscribed — the account-wide flag hides an unsubscribed
   * device behind subscriptions created on other devices.
   */
  isSubscribedOnThisDevice: boolean;
  /** False until the device subscription check resolves; gate setup UI on it. */
  deviceStatusKnown: boolean;
  isSupported: boolean;
  subscribe: () => Promise<"subscribed" | "denied" | "unsupported">;
  unsubscribe: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown device";
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  const { data: vapidData } = trpc.notification.getPublicKey.useQuery(
    undefined,
    { enabled: !!user }
  );
  const { data: subscriptions } = trpc.notification.getSubscriptions.useQuery(
    undefined,
    { enabled: !!user }
  );
  const { mutateAsync: doSubscribe } = trpc.notification.subscribe.useMutation();
  const { mutateAsync: doUnsubscribe } = trpc.notification.unsubscribe.useMutation();

  // null = not yet checked. Resolved from this device's actual push
  // subscription, independent of what other devices did on the account.
  const [deviceSubscribed, setDeviceSubscribed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!isSupported) {
      setDeviceSubscribed(false);
      return;
    }
    let cancelled = false;
    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!cancelled) setDeviceSubscribed(subscription !== null);
      })
      .catch(() => {
        if (!cancelled) setDeviceSubscribed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported || !vapidData?.publicKey) return "unsupported" as const;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return "denied" as const;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidData.publicKey,
    });

    const json = subscription.toJSON();
    await doSubscribe({
      endpoint: subscription.endpoint,
      p256dhKey: json.keys?.p256dh || "",
      authKey: json.keys?.auth || "",
      deviceName: `${getDeviceName()} - ${navigator.userAgent.split(" ").pop()?.split("/")[0] || "Browser"}`,
    });

    await utils.notification.getSubscriptions.invalidate();
    setDeviceSubscribed(true);
    return "subscribed" as const;
  }, [isSupported, vapidData, doSubscribe, utils]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await doUnsubscribe({
        endpoint: subscription.endpoint,
      });
      await subscription.unsubscribe();
      await utils.notification.getSubscriptions.invalidate();
      setDeviceSubscribed(false);
    }

  }, [isSupported, doUnsubscribe, utils]);

  const isSubscribed = (subscriptions?.length ?? 0) > 0;

  return (
    <NotificationContext.Provider
      value={{
        isSubscribed,
        isSubscribedOnThisDevice: deviceSubscribed === true,
        deviceStatusKnown: deviceSubscribed !== null,
        isSupported,
        subscribe,
        unsubscribe,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotificationContext() {
  const context = useContext(NotificationContext);
  if (!context)
    throw new Error(
      "useNotificationContext must be used within NotificationProvider"
    );
  return context;
}
