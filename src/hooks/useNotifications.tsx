'use client';

import { useState, useEffect, useCallback } from 'react';
import { trpc } from '@/lib/trpc/client';

export type NotificationPermission = 'default' | 'granted' | 'denied';

interface UseNotificationsReturn {
  permission: NotificationPermission;
  isSupported: boolean;
  isSubscribed: boolean;
  isLoading: boolean;
  requestPermission: () => Promise<NotificationPermission>;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
  sendTestNotification: (type?: 'test' | 'morning' | 'evening') => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const subscribeMutation = trpc.notification.subscribe.useMutation();
  const unsubscribeMutation = trpc.notification.unsubscribe.useMutation();
  const testMutation = trpc.notification.sendTest.useMutation();
  const { data: publicKeyData } = trpc.notification.getPublicKey.useQuery();
  const { data: subscriptions, refetch: refetchSubscriptions } = trpc.notification.getSubscriptions.useQuery();

  // Check if notifications are supported and get current permission
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);

    if (supported) {
      setPermission(Notification.permission as NotificationPermission);
    }
  }, []);

  // Check if user has an active subscription
  useEffect(() => {
    if (!subscriptions || subscriptions.length === 0) {
      setIsSubscribed(false);
      return;
    }

    // Check if current registration matches any stored subscription
    const checkSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        
        if (subscription) {
          const hasMatch = subscriptions.some(
            (sub: any) => sub.endpoint === subscription.endpoint
          );
          setIsSubscribed(hasMatch);
        } else {
          setIsSubscribed(false);
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        setIsSubscribed(false);
      }
    };

    checkSubscription();
  }, [subscriptions]);

  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      throw new Error('Notifications are not supported in this browser');
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermission);
      return result as NotificationPermission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      throw error;
    }
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      throw new Error('Notifications are not supported');
    }

    if (permission !== 'granted') {
      const result = await requestPermission();
      if (result !== 'granted') {
        throw new Error('Notification permission denied');
      }
    }

    if (!publicKeyData?.publicKey) {
      throw new Error('VAPID public key not available');
    }

    setIsLoading(true);

    try {
      // Get or register service worker
      let registration = await navigator.serviceWorker.getRegistration();
      
      if (!registration) {
        // In dev mode, use the minimal dev service worker
        // In production, next-pwa generates the full service worker
        const isDev = process.env.NODE_ENV === 'development';
        const swPath = isDev ? '/sw-dev.js' : '/sw.js';
        
        console.log(`Registering service worker: ${swPath}`);
        registration = await navigator.serviceWorker.register(swPath);
        await navigator.serviceWorker.ready;
        console.log('Service worker registered successfully');
      } else {
        console.log('Service worker already registered');
      }

      // Subscribe to push notifications
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKeyData.publicKey),
      });

      // Send subscription to server
      const subscriptionJson = subscription.toJSON();
      await subscribeMutation.mutateAsync({
        endpoint: subscription.endpoint,
        p256dhKey: subscriptionJson.keys?.p256dh || '',
        authKey: subscriptionJson.keys?.auth || '',
        userAgent: navigator.userAgent,
      });

      setIsSubscribed(true);
      await refetchSubscriptions();
    } catch (error) {
      console.error('Error subscribing to notifications:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, permission, publicKeyData, subscribeMutation, requestPermission, refetchSubscriptions]);

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!isSupported) {
      throw new Error('Notifications are not supported');
    }

    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await unsubscribeMutation.mutateAsync({
          endpoint: subscription.endpoint,
        });
      }

      setIsSubscribed(false);
      await refetchSubscriptions();
    } catch (error) {
      console.error('Error unsubscribing from notifications:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, unsubscribeMutation, refetchSubscriptions]);

  const sendTestNotification = useCallback(async (type: 'test' | 'morning' | 'evening' = 'test'): Promise<void> => {
    if (!isSubscribed) {
      throw new Error('Not subscribed to notifications');
    }

    try {
      await testMutation.mutateAsync({ type });
    } catch (error) {
      console.error('Error sending test notification:', error);
      throw error;
    }
  }, [isSubscribed, testMutation]);

  return {
    permission,
    isSupported,
    isSubscribed,
    isLoading: isLoading || subscribeMutation.isPending || unsubscribeMutation.isPending || testMutation.isPending,
    requestPermission,
    subscribe,
    unsubscribe,
    sendTestNotification,
  };
}

// Helper function to convert base64 string to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

