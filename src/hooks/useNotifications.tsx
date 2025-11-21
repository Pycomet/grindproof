'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { NotificationHandler } from '@/lib/notifications/handler';
import type {
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications';

interface UseNotificationsOptions {
  onNotificationReceived?: (notification: PushNotificationSchema) => void;
  onNotificationTapped?: (notification: ActionPerformed) => void;
  onError?: (error: any) => void;
}

interface UseNotificationsReturn {
  isSupported: boolean;
  isEnabled: boolean;
  isLoading: boolean;
  token: string | null;
  error: string | null;
  requestPermission: () => Promise<boolean>;
  removeAllNotifications: () => Promise<void>;
}

/**
 * Hook to manage push notifications
 * Handles permission requests, token registration, and notification events
 */
export function useNotifications(
  options: UseNotificationsOptions = {}
): UseNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [isEnabled, setIsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const handlerRef = useRef<NotificationHandler | null>(null);
  const isInitializedRef = useRef(false);

  // Register token with backend
  const registerToken = useCallback(async (deviceToken: string) => {
    try {
      const response = await fetch('/api/notifications/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: deviceToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to register device token');
      }

      setToken(deviceToken);
      setIsEnabled(true);
      console.log('Device token registered successfully');
    } catch (err) {
      console.error('Failed to register token with backend:', err);
      setError('Failed to register device for notifications');
    }
  }, []);

  // Handle notification received
  const handleNotificationReceived = useCallback(
    (notification: PushNotificationSchema) => {
      console.log('Notification received in app:', notification);
      options.onNotificationReceived?.(notification);
    },
    [options]
  );

  // Handle notification tapped
  const handleNotificationTapped = useCallback(
    (action: ActionPerformed) => {
      console.log('Notification tapped:', action);
      options.onNotificationTapped?.(action);
      
      // Handle navigation based on notification data
      if (action.notification.data?.route) {
        const route = action.notification.data.route as string;
        window.location.href = route;
      }
    },
    [options]
  );

  // Handle registration error
  const handleRegistrationError = useCallback(
    (err: any) => {
      console.error('Notification registration error:', err);
      setError(err.message || 'Failed to register for notifications');
      setIsLoading(false);
      options.onError?.(err);
    },
    [options]
  );

  // Check if push notifications are supported
  useEffect(() => {
    const checkSupport = async () => {
      if (typeof window === 'undefined') return;

      try {
        const { Capacitor } = await import('@capacitor/core');
        const isNative = Capacitor.isNativePlatform();
        setIsSupported(isNative);
      } catch {
        setIsSupported(false);
      }
    };

    checkSupport();
  }, []);

  // Request permission and initialize
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      console.log('Push notifications not supported on this platform');
      return false;
    }

    if (isInitializedRef.current) {
      console.log('Notifications already initialized');
      return isEnabled;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create handler if not exists
      if (!handlerRef.current) {
        handlerRef.current = new NotificationHandler({
          onRegistration: registerToken,
          onNotificationReceived: handleNotificationReceived,
          onNotificationTapped: handleNotificationTapped,
          onRegistrationError: handleRegistrationError,
        });
      }

      const success = await handlerRef.current.initialize();
      
      if (success) {
        isInitializedRef.current = true;
      }
      
      setIsLoading(false);
      return success;
    } catch (err) {
      console.error('Failed to request notification permission:', err);
      setError('Failed to enable notifications');
      setIsLoading(false);
      return false;
    }
  }, [
    isSupported,
    isEnabled,
    registerToken,
    handleNotificationReceived,
    handleNotificationTapped,
    handleRegistrationError,
  ]);

  // Remove all delivered notifications
  const removeAllNotifications = useCallback(async () => {
    if (!handlerRef.current) return;
    await handlerRef.current.removeAllDeliveredNotifications();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (handlerRef.current) {
        handlerRef.current.cleanup();
      }
    };
  }, []);

  return {
    isSupported,
    isEnabled,
    isLoading,
    token,
    error,
    requestPermission,
    removeAllNotifications,
  };
}

