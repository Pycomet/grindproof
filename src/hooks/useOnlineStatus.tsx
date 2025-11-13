'use client';

import { useEffect, useState } from 'react';

/**
 * Hook to detect online/offline status
 * Returns true if online, false if offline
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);

    // Event handlers
    const handleOnline = () => {
      setIsOnline(true);
      console.log('✅ Network connection restored');
    };

    const handleOffline = () => {
      setIsOnline(false);
      console.log('⚠️ Network connection lost');
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

/**
 * Hook to get detailed network information if available
 * Returns network connection details or null
 */
export function useNetworkInformation() {
  const [networkInfo, setNetworkInfo] = useState<{
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
  } | null>(null);

  useEffect(() => {
    // Check if Network Information API is available
    const connection = (navigator as any).connection || 
                       (navigator as any).mozConnection || 
                       (navigator as any).webkitConnection;

    if (!connection) {
      return;
    }

    const updateNetworkInfo = () => {
      setNetworkInfo({
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData,
      });
    };

    // Set initial state
    updateNetworkInfo();

    // Listen for changes
    connection.addEventListener('change', updateNetworkInfo);

    return () => {
      connection.removeEventListener('change', updateNetworkInfo);
    };
  }, []);

  return networkInfo;
}

/**
 * Hook to show a banner when offline
 * Returns component to render or null
 */
export function useOfflineBanner() {
  const isOnline = useOnlineStatus();
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShowBanner(true);
      setWasOffline(true);
    } else if (wasOffline) {
      // Show "back online" message briefly
      const timer = setTimeout(() => {
        setShowBanner(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (!showBanner) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-3 text-center text-sm font-medium ${
        isOnline
          ? 'bg-green-500 text-white'
          : 'bg-orange-500 text-white'
      }`}
    >
      {isOnline ? (
        <>
          <span className="mr-2">✅</span>
          Back online! Your changes will sync automatically.
        </>
      ) : (
        <>
          <span className="mr-2">⚠️</span>
          You're offline. Some features may be limited.
        </>
      )}
    </div>
  );
}

