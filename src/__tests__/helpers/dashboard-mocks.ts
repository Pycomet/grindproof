import { vi } from 'vitest';

/**
 * Shared mocks for Dashboard component tests
 * 
 * These mock implementations can be used in test files to avoid duplication.
 * Import the mock values and use them with vi.mock() at the top level of your test file.
 * 
 * @example
 * ```ts
 * import { useNotificationsMock, useOfflineSyncMock } from '@/__tests__/helpers/dashboard-mocks';
 * 
 * vi.mock('@/hooks/useNotifications', () => ({
 *   useNotifications: () => useNotificationsMock,
 * }));
 * 
 * vi.mock('@/hooks/useOfflineSync', () => ({
 *   useOfflineSync: () => useOfflineSyncMock,
 * }));
 * ```
 */

/**
 * Factory function to create a fresh useNotifications mock instance
 * This prevents the hook from trying to access navigator.serviceWorker
 * and navigator.pushManager which aren't available in the test environment
 * 
 * Creates a new instance each time to avoid state leakage between tests
 */
export function createUseNotificationsMock() {
  return {
    permission: 'granted' as NotificationPermission,
    isSupported: true,
    isSubscribed: false,
    isLoading: false,
    requestPermission: vi.fn().mockResolvedValue('granted'),
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    sendTestNotification: vi.fn().mockResolvedValue(undefined),
  };
}

/**
 * Factory function to create a fresh useOfflineSync mock instance
 * Creates a new instance each time to avoid state leakage between tests
 */
export function createUseOfflineSyncMock() {
  return {
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    queueMutation: vi.fn(),
    syncPendingMutations: vi.fn(),
    forceSync: vi.fn(),
  };
}

/**
 * Default mock instances (for convenience)
 * Note: These are shared instances. For isolated tests, use the factory functions above.
 */
export const useNotificationsMock = createUseNotificationsMock();
export const useOfflineSyncMock = createUseOfflineSyncMock();

