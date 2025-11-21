/**
 * Notification handler for Capacitor Push Notifications
 * Handles registration, receiving, and action events
 */

import { PushNotifications } from '@capacitor/push-notifications';
import type {
  PushNotificationSchema,
  Token,
  ActionPerformed,
} from '@capacitor/push-notifications';

export interface NotificationConfig {
  onRegistration: (token: string) => Promise<void>;
  onNotificationReceived?: (notification: PushNotificationSchema) => void;
  onNotificationTapped?: (notification: ActionPerformed) => void;
  onRegistrationError?: (error: any) => void;
}

export class NotificationHandler {
  private config: NotificationConfig;
  private isInitialized = false;

  constructor(config: NotificationConfig) {
    this.config = config;
  }

  /**
   * Initialize push notifications
   * Requests permissions and sets up listeners
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) {
      console.log('Notifications already initialized');
      return true;
    }

    try {
      // Check if we're on a native platform
      const { isNative } = await this.checkPlatform();
      if (!isNative) {
        console.log('Not on native platform, skipping push notification setup');
        return false;
      }

      // Request permission
      const result = await PushNotifications.requestPermissions();
      
      if (result.receive === 'granted') {
        // Register with APNS/FCM
        await PushNotifications.register();

        // Set up listeners
        this.setupListeners();
        
        this.isInitialized = true;
        console.log('Push notifications initialized successfully');
        return true;
      } else {
        console.log('Push notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
      this.config.onRegistrationError?.(error);
      return false;
    }
  }

  /**
   * Check if we're running on a native platform
   */
  private async checkPlatform(): Promise<{ isNative: boolean }> {
    if (typeof window === 'undefined') {
      return { isNative: false };
    }

    // Check if Capacitor is available
    try {
      const { Capacitor } = await import('@capacitor/core');
      return { isNative: Capacitor.isNativePlatform() };
    } catch {
      return { isNative: false };
    }
  }

  /**
   * Set up notification listeners
   */
  private setupListeners(): void {
    // Handle registration
    PushNotifications.addListener('registration', async (token: Token) => {
      console.log('Push registration success, token:', token.value);
      try {
        await this.config.onRegistration(token.value);
      } catch (error) {
        console.error('Failed to register token:', error);
      }
    });

    // Handle registration errors
    PushNotifications.addListener('registrationError', (error: any) => {
      console.error('Push registration error:', error);
      this.config.onRegistrationError?.(error);
    });

    // Handle notification received while app is in foreground
    PushNotifications.addListener(
      'pushNotificationReceived',
      (notification: PushNotificationSchema) => {
        console.log('Push notification received:', notification);
        this.config.onNotificationReceived?.(notification);
      }
    );

    // Handle notification tapped
    PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action: ActionPerformed) => {
        console.log('Push notification action performed:', action);
        this.config.onNotificationTapped?.(action);
      }
    );
  }

  /**
   * Get delivered notifications
   */
  async getDeliveredNotifications(): Promise<PushNotificationSchema[]> {
    const { isNative } = await this.checkPlatform();
    if (!isNative) return [];

    const result = await PushNotifications.getDeliveredNotifications();
    return result.notifications;
  }

  /**
   * Remove delivered notifications by ID
   */
  async removeDeliveredNotifications(ids: string[]): Promise<void> {
    const { isNative } = await this.checkPlatform();
    if (!isNative) return;

    await PushNotifications.removeDeliveredNotifications({
      notifications: ids.map(id => ({ id })),
    });
  }

  /**
   * Remove all delivered notifications
   */
  async removeAllDeliveredNotifications(): Promise<void> {
    const { isNative } = await this.checkPlatform();
    if (!isNative) return;

    await PushNotifications.removeAllDeliveredNotifications();
  }

  /**
   * Clean up listeners
   */
  async cleanup(): Promise<void> {
    await PushNotifications.removeAllListeners();
    this.isInitialized = false;
  }
}

