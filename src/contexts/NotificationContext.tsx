"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { trpc } from "@/lib/trpc/client";
import { useAuth } from "./AuthContext";

interface NotificationContextType {
  isSubscribed: boolean;
  isSupported: boolean;
  subscribe: () => Promise<void>;
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
  const [isSubscribed, setIsSubscribed] = useState(false);
  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window;

  const { data: vapidData } = trpc.notification.getPublicKey.useQuery(
    undefined,
    { enabled: !!user }
  );
  const subscribeMutation = trpc.notification.subscribe.useMutation();
  const unsubscribeMutation = trpc.notification.unsubscribe.useMutation();

  const subscribe = useCallback(async () => {
    if (!isSupported || !vapidData?.publicKey) return;

    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidData.publicKey,
    });

    const json = subscription.toJSON();
    await subscribeMutation.mutateAsync({
      endpoint: subscription.endpoint,
      p256dhKey: json.keys?.p256dh || "",
      authKey: json.keys?.auth || "",
      deviceName: `${getDeviceName()} - ${navigator.userAgent.split(" ").pop()?.split("/")[0] || "Browser"}`,
    });

    setIsSubscribed(true);
  }, [isSupported, vapidData, subscribeMutation]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await unsubscribeMutation.mutateAsync({
        endpoint: subscription.endpoint,
      });
      await subscription.unsubscribe();
    }

    setIsSubscribed(false);
  }, [isSupported, unsubscribeMutation]);

  return (
    <NotificationContext.Provider
      value={{ isSubscribed, isSupported, subscribe, unsubscribe }}
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
