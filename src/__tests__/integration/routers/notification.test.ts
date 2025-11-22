import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { notificationRouter } from '@/server/trpc/routers/notification';
import type { Context } from '@/server/trpc/context';

// Mock push notification service
vi.mock('@/lib/notifications/push-service', () => ({
  sendPushNotification: vi.fn().mockResolvedValue(undefined),
  NotificationTemplates: {
    test: vi.fn(() => ({
      title: 'Test Notification',
      body: 'This is a test',
      tag: 'test',
    })),
    morningCheck: vi.fn(() => ({
      title: '🌅 Good Morning! Time to Plan Your Day',
      body: "Let's review your goals and set priorities for today.",
      tag: 'morning-check',
      requireInteraction: true,
      data: {
        url: '/dashboard?view=today&modal=morning-check',
        type: 'morning-check',
      },
    })),
    eveningCheck: vi.fn(() => ({
      title: '🌙 Evening Reality Check',
      body: "How did your day go? Let's review what you accomplished.",
      tag: 'evening-check',
      requireInteraction: true,
      data: {
        url: '/dashboard?view=evening&modal=evening-check',
        type: 'evening-check',
      },
    })),
  },
}));

// Mock config
vi.mock('@/lib/config', () => ({
  NOTIFICATION_CONFIG: {
    VAPID: {
      PUBLIC_KEY: 'test-public-key',
    },
    DEFAULT_TIMES: {
      MORNING: '09:00',
      EVENING: '18:00',
    },
  },
}));

// Helper to create mock context
const createMockContext = (overrides?: Partial<Context>): Context => {
  const mockDb = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn(),
    single: vi.fn(),
  };

  return {
    user: { id: 'test-user-id', email: 'test@example.com' },
    db: mockDb as any,
    supabase: {} as any,
    ...overrides,
  };
};

describe('notification router', () => {
  let mockContext: Context;

  beforeEach(() => {
    mockContext = createMockContext();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getPublicKey', () => {
    it('should return VAPID public key', async () => {
      const caller = notificationRouter.createCaller(mockContext);
      const result = await caller.getPublicKey();

      expect(result).toEqual({
        publicKey: 'test-public-key',
      });
    });
  });

  describe('subscribe', () => {
    it('should save push subscription successfully', async () => {
      const subscriptionData = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
        p256dhKey: 'test-p256dh-key',
        authKey: 'test-auth-key',
        userAgent: 'Mozilla/5.0',
      };

      const savedSubscription = {
        id: 'sub-1',
        user_id: 'test-user-id',
        endpoint: subscriptionData.endpoint,
        p256dh_key: subscriptionData.p256dhKey,
        auth_key: subscriptionData.authKey,
        user_agent: subscriptionData.userAgent,
        is_active: true,
        created_at: new Date().toISOString(),
      };

      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: savedSubscription, error: null }),
      } as any);

      const caller = notificationRouter.createCaller(mockContext);
      const result = await caller.subscribe(subscriptionData);

      expect(result.success).toBe(true);
      expect(result.subscription).toEqual(savedSubscription);
    });

    it('should handle upsert on duplicate endpoint', async () => {
      const subscriptionData = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
        p256dhKey: 'updated-p256dh-key',
        authKey: 'updated-auth-key',
      };

      const upsertMock = vi.fn().mockReturnThis();
      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        upsert: upsertMock,
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: { id: 'sub-1', ...subscriptionData }, 
          error: null 
        }),
      } as any);

      const caller = notificationRouter.createCaller(mockContext);
      await caller.subscribe(subscriptionData);

      // Verify upsert was called with onConflict option
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'test-user-id',
          endpoint: subscriptionData.endpoint,
          is_active: true,
        }),
        { onConflict: 'user_id,endpoint' }
      );
    });

    it('should handle database errors', async () => {
      const subscriptionData = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
        p256dhKey: 'test-key',
        authKey: 'test-auth',
      };

      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Foreign key constraint failed' } 
        }),
      } as any);

      const caller = notificationRouter.createCaller(mockContext);

      await expect(
        caller.subscribe(subscriptionData)
      ).rejects.toThrow('Failed to save subscription: Foreign key constraint failed');
    });

    it('should accept subscription without userAgent', async () => {
      const subscriptionData = {
        endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
        p256dhKey: 'test-key',
        authKey: 'test-auth',
        // userAgent omitted
      };

      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: { id: 'sub-1', ...subscriptionData }, 
          error: null 
        }),
      } as any);

      const caller = notificationRouter.createCaller(mockContext);
      const result = await caller.subscribe(subscriptionData);

      expect(result.success).toBe(true);
    });
  });

  describe('unsubscribe', () => {
    it('should remove subscription by endpoint', async () => {
      const endpoint = 'https://fcm.googleapis.com/fcm/send/abc123';

      const deleteMock = vi.fn().mockReturnThis();
      const eqMock = vi.fn().mockReturnThis();
      
      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        delete: deleteMock,
        eq: eqMock,
      } as any);
      
      // Mock the final eq call to return result
      eqMock.mockReturnValueOnce({ eq: vi.fn().mockResolvedValue({ error: null }) } as any);

      const caller = notificationRouter.createCaller(mockContext);
      const result = await caller.unsubscribe({ endpoint });

      expect(result.success).toBe(true);
      expect(deleteMock).toHaveBeenCalled();
    });

    it('should handle non-existent subscription gracefully', async () => {
      const endpoint = 'https://fcm.googleapis.com/fcm/send/nonexistent';

      const eqMock = vi.fn().mockReturnThis();
      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        delete: vi.fn().mockReturnThis(),
        eq: eqMock,
      } as any);
      
      eqMock.mockReturnValueOnce({ eq: vi.fn().mockResolvedValue({ error: null }) } as any);

      const caller = notificationRouter.createCaller(mockContext);
      const result = await caller.unsubscribe({ endpoint });

      expect(result.success).toBe(true);
    });

    it('should handle database errors', async () => {
      const endpoint = 'https://fcm.googleapis.com/fcm/send/abc123';

      const eqMock = vi.fn().mockReturnThis();
      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        delete: vi.fn().mockReturnThis(),
        eq: eqMock,
      } as any);
      
      eqMock.mockReturnValueOnce({ 
        eq: vi.fn().mockResolvedValue({ error: { message: 'Connection timeout' } }) 
      } as any);

      const caller = notificationRouter.createCaller(mockContext);

      await expect(
        caller.unsubscribe({ endpoint })
      ).rejects.toThrow('Failed to remove subscription: Connection timeout');
    });
  });

  describe('getSettings', () => {
    it('should return user notification settings', async () => {
      const mockSettings = {
        id: 'settings-1',
        user_id: 'test-user-id',
        morning_check_enabled: true,
        morning_check_time: '08:00',
        evening_check_enabled: true,
        evening_check_time: '19:00',
        timezone: 'America/New_York',
      };

      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockSettings, error: null }),
      } as any);

      const caller = notificationRouter.createCaller(mockContext);
      const result = await caller.getSettings();

      expect(result).toEqual({
        morningCheckEnabled: true,
        morningCheckTime: '08:00',
        eveningCheckEnabled: true,
        eveningCheckTime: '19:00',
        timezone: 'America/New_York',
      });
    });

    it('should return default settings when none exist', async () => {
      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      } as any);

      const caller = notificationRouter.createCaller(mockContext);
      const result = await caller.getSettings();

      expect(result).toEqual({
        morningCheckEnabled: true,
        morningCheckTime: '09:00',
        eveningCheckEnabled: true,
        eveningCheckTime: '18:00',
        timezone: expect.any(String), // System timezone
      });
    });

    it('should handle database errors', async () => {
      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Table does not exist' } 
        }),
      } as any);

      const caller = notificationRouter.createCaller(mockContext);

      await expect(
        caller.getSettings()
      ).rejects.toThrow('Failed to fetch notification settings: Table does not exist');
    });
  });

  describe('updateSettings', () => {
    it('should update all settings fields', async () => {
      const updates = {
        morningCheckEnabled: false,
        morningCheckTime: '07:00',
        eveningCheckEnabled: true,
        eveningCheckTime: '20:00',
        timezone: 'Europe/London',
      };

      const updatedSettings = {
        id: 'settings-1',
        user_id: 'test-user-id',
        morning_check_enabled: false,
        morning_check_time: '07:00',
        evening_check_enabled: true,
        evening_check_time: '20:00',
        timezone: 'Europe/London',
      };

      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedSettings, error: null }),
      } as any);

      const caller = notificationRouter.createCaller(mockContext);
      const result = await caller.updateSettings(updates);

      expect(result.success).toBe(true);
      expect(result.settings).toEqual({
        morningCheckEnabled: false,
        morningCheckTime: '07:00',
        eveningCheckEnabled: true,
        eveningCheckTime: '20:00',
        timezone: 'Europe/London',
      });
    });

    it('should update partial settings', async () => {
      const updates = {
        morningCheckTime: '06:30',
      };

      const updatedSettings = {
        id: 'settings-1',
        user_id: 'test-user-id',
        morning_check_enabled: true,
        morning_check_time: '06:30',
        evening_check_enabled: true,
        evening_check_time: '18:00',
        timezone: 'UTC',
      };

      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: updatedSettings, error: null }),
      } as any);

      const caller = notificationRouter.createCaller(mockContext);
      const result = await caller.updateSettings(updates);

      expect(result.success).toBe(true);
      expect(result.settings.morningCheckTime).toBe('06:30');
    });

    it('should validate time format', async () => {
      const updates = {
        morningCheckTime: 'invalid-time',
      };

      const caller = notificationRouter.createCaller(mockContext);

      await expect(
        caller.updateSettings(updates as any)
      ).rejects.toThrow();
    });

    it('should handle database errors', async () => {
      const updates = {
        morningCheckEnabled: false,
      };

      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ 
          data: null, 
          error: { message: 'Check constraint violation' } 
        }),
      } as any);

      const caller = notificationRouter.createCaller(mockContext);

      await expect(
        caller.updateSettings(updates)
      ).rejects.toThrow('Failed to update notification settings: Check constraint violation');
    });
  });

  describe('getSubscriptions', () => {
    it('should return all active subscriptions', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          user_id: 'test-user-id',
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
          p256dh_key: 'key1',
          auth_key: 'auth1',
          is_active: true,
        },
        {
          id: 'sub-2',
          user_id: 'test-user-id',
          endpoint: 'https://fcm.googleapis.com/fcm/send/xyz789',
          p256dh_key: 'key2',
          auth_key: 'auth2',
          is_active: true,
        },
      ];

      const eqMock = vi.fn().mockReturnThis();
      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        select: vi.fn().mockReturnThis(),
        eq: eqMock,
      } as any);
      
      eqMock.mockReturnValueOnce({ 
        eq: vi.fn().mockResolvedValue({ data: mockSubscriptions, error: null }) 
      } as any);

      const caller = notificationRouter.createCaller(mockContext);
      const result = await caller.getSubscriptions();

      expect(result).toEqual(mockSubscriptions);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no subscriptions', async () => {
      const eqMock = vi.fn().mockReturnThis();
      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        select: vi.fn().mockReturnThis(),
        eq: eqMock,
      } as any);
      
      eqMock.mockReturnValueOnce({ 
        eq: vi.fn().mockResolvedValue({ data: [], error: null }) 
      } as any);

      const caller = notificationRouter.createCaller(mockContext);
      const result = await caller.getSubscriptions();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const eqMock = vi.fn().mockReturnThis();
      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        select: vi.fn().mockReturnThis(),
        eq: eqMock,
      } as any);
      
      eqMock.mockReturnValueOnce({ 
        eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Query timeout' } }) 
      } as any);

      const caller = notificationRouter.createCaller(mockContext);

      await expect(
        caller.getSubscriptions()
      ).rejects.toThrow('Failed to fetch subscriptions: Query timeout');
    });
  });

  describe('sendTest', () => {
    it('should send test notification successfully', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
          p256dh_key: 'key1',
          auth_key: 'auth1',
        },
      ];

      const eqMock = vi.fn().mockReturnThis();
      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        select: vi.fn().mockReturnThis(),
        eq: eqMock,
      } as any);
      
      eqMock.mockReturnValueOnce({ 
        eq: vi.fn().mockResolvedValue({ data: mockSubscriptions, error: null }) 
      } as any);

      const caller = notificationRouter.createCaller(mockContext);
      const result = await caller.sendTest({ type: 'test' });

      expect(result.success).toBe(true);
      expect(result.results.successful).toBe(1);
      expect(result.results.failed).toBe(0);
    });

    it('should send morning notification template', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
          p256dh_key: 'key1',
          auth_key: 'auth1',
        },
      ];

      const eqMock = vi.fn().mockReturnThis();
      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        select: vi.fn().mockReturnThis(),
        eq: eqMock,
      } as any);
      
      eqMock.mockReturnValueOnce({ 
        eq: vi.fn().mockResolvedValue({ data: mockSubscriptions, error: null }) 
      } as any);

      const { NotificationTemplates } = await import('@/lib/notifications/push-service');
      const morningCheckSpy = vi.mocked(NotificationTemplates.morningCheck);

      const caller = notificationRouter.createCaller(mockContext);
      await caller.sendTest({ type: 'morning' });

      expect(morningCheckSpy).toHaveBeenCalled();
    });

    it('should send evening notification template', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
          p256dh_key: 'key1',
          auth_key: 'auth1',
        },
      ];

      const eqMock = vi.fn().mockReturnThis();
      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        select: vi.fn().mockReturnThis(),
        eq: eqMock,
      } as any);
      
      eqMock.mockReturnValueOnce({ 
        eq: vi.fn().mockResolvedValue({ data: mockSubscriptions, error: null }) 
      } as any);

      const { NotificationTemplates } = await import('@/lib/notifications/push-service');
      const eveningCheckSpy = vi.mocked(NotificationTemplates.eveningCheck);

      const caller = notificationRouter.createCaller(mockContext);
      await caller.sendTest({ type: 'evening' });

      expect(eveningCheckSpy).toHaveBeenCalled();
    });

    it('should handle no subscriptions error', async () => {
      const eqMock = vi.fn().mockReturnThis();
      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        select: vi.fn().mockReturnThis(),
        eq: eqMock,
      } as any);
      
      eqMock.mockReturnValueOnce({ 
        eq: vi.fn().mockResolvedValue({ data: [], error: null }) 
      } as any);

      const caller = notificationRouter.createCaller(mockContext);

      await expect(
        caller.sendTest()
      ).rejects.toThrow('No active subscriptions found');
    });

    it('should handle expired subscriptions', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/expired',
          p256dh_key: 'key1',
          auth_key: 'auth1',
        },
      ];

      // First call: fetch subscriptions
      const eqMock = vi.fn().mockReturnThis();
      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        select: vi.fn().mockReturnThis(),
        eq: eqMock,
      } as any);
      
      eqMock.mockReturnValueOnce({ 
        eq: vi.fn().mockResolvedValue({ data: mockSubscriptions, error: null }) 
      } as any);

      // Mock sendPushNotification to throw SUBSCRIPTION_EXPIRED
      const { sendPushNotification } = await import('@/lib/notifications/push-service');
      vi.mocked(sendPushNotification).mockRejectedValueOnce(
        new Error('SUBSCRIPTION_EXPIRED')
      );

      // Second call: update subscription
      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      } as any);

      const caller = notificationRouter.createCaller(mockContext);
      const result = await caller.sendTest();

      expect(result.success).toBe(false);
      expect(result.results.expired).toContain('https://fcm.googleapis.com/fcm/send/expired');
    });

    it('should count failed notifications', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
          p256dh_key: 'key1',
          auth_key: 'auth1',
        },
      ];

      const eqMock = vi.fn().mockReturnThis();
      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        select: vi.fn().mockReturnThis(),
        eq: eqMock,
      } as any);
      
      eqMock.mockReturnValueOnce({ 
        eq: vi.fn().mockResolvedValue({ data: mockSubscriptions, error: null }) 
      } as any);

      const { sendPushNotification } = await import('@/lib/notifications/push-service');
      vi.mocked(sendPushNotification).mockRejectedValueOnce(
        new Error('Network error')
      );

      const caller = notificationRouter.createCaller(mockContext);
      const result = await caller.sendTest();

      expect(result.success).toBe(false);
      expect(result.results.failed).toBe(1);
    });

    it('should send to multiple subscriptions', async () => {
      const mockSubscriptions = [
        {
          id: 'sub-1',
          endpoint: 'https://fcm.googleapis.com/fcm/send/abc123',
          p256dh_key: 'key1',
          auth_key: 'auth1',
        },
        {
          id: 'sub-2',
          endpoint: 'https://fcm.googleapis.com/fcm/send/xyz789',
          p256dh_key: 'key2',
          auth_key: 'auth2',
        },
      ];

      const eqMock = vi.fn().mockReturnThis();
      vi.mocked(mockContext.db.from).mockReturnValueOnce({
        ...mockContext.db,
        select: vi.fn().mockReturnThis(),
        eq: eqMock,
      } as any);
      
      eqMock.mockReturnValueOnce({ 
        eq: vi.fn().mockResolvedValue({ data: mockSubscriptions, error: null }) 
      } as any);

      const caller = notificationRouter.createCaller(mockContext);
      const result = await caller.sendTest();

      expect(result.success).toBe(true);
      expect(result.results.successful).toBe(2);
    });
  });
});

