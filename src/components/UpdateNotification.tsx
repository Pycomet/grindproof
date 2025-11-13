'use client';

import { useEffect, useState } from 'react';

/**
 * Component that notifies users when a new version of the PWA is available
 * and provides a button to update
 */
export function UpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // Only run in browser and when service workers are supported
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    // Check for updates periodically (every 60 seconds)
    const checkForUpdates = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        await reg.update();
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    };

    // Initial check
    checkForUpdates();

    // Set up periodic checks
    const interval = setInterval(checkForUpdates, 60000); // Check every minute

    // Listen for service worker updates
    const handleControllerChange = () => {
      console.log('Service worker controller changed');
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    // Check for waiting service worker
    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);

      if (reg.waiting) {
        setShowUpdate(true);
      }

      // Listen for new service worker installing
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is available
              setShowUpdate(true);
              console.log('New version available!');
            }
          });
        }
      });
    });

    return () => {
      clearInterval(interval);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const handleUpdate = async () => {
    if (!registration || !registration.waiting) {
      return;
    }

    setIsUpdating(true);

    // Tell the waiting service worker to skip waiting and become active
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Listen for controller change, which means the new SW is now active
    const handleControllerChange = () => {
      setIsUpdating(false);
      // Reload the page to load the new version
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange, {
      once: true,
    });

    // Fallback: if controller doesn't change in 2 seconds, reload anyway
    setTimeout(() => {
      if (isUpdating) {
        window.location.reload();
      }
    }, 2000);
  };

  const handleDismiss = () => {
    setShowUpdate(false);
    // Store dismissal in session storage so it doesn't show again this session
    sessionStorage.setItem('update-dismissed', 'true');
  };

  // Don't show if update was dismissed this session
  useEffect(() => {
    const dismissed = sessionStorage.getItem('update-dismissed');
    if (dismissed && showUpdate) {
      setShowUpdate(false);
    }
  }, [showUpdate]);

  if (!showUpdate) {
    return null;
  }

  return (
    <>
      {/* Mobile bottom banner */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-blue-600 p-4 shadow-lg md:hidden">
        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">
              Update Available
            </h3>
            <p className="text-xs text-blue-100">
              A new version is ready
            </p>
          </div>
          <button
            onClick={handleUpdate}
            disabled={isUpdating}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-blue-600 transition-all hover:bg-blue-50 disabled:opacity-50"
          >
            {isUpdating ? 'Updating...' : 'Update'}
          </button>
          <button
            onClick={handleDismiss}
            className="ml-2 text-blue-100 transition-colors hover:text-white"
            aria-label="Dismiss"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Desktop top banner */}
      <div className="fixed top-0 left-0 right-0 z-50 hidden bg-blue-600 p-3 shadow-lg md:block">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg
              className="h-6 w-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <div>
              <span className="text-sm font-semibold text-white">
                A new version of Grindproof is available.
              </span>
              <span className="ml-2 text-sm text-blue-100">
                Update now for the latest features and improvements.
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-blue-600 transition-all hover:bg-blue-50 disabled:opacity-50"
            >
              {isUpdating ? 'Updating...' : 'Update Now'}
            </button>
            <button
              onClick={handleDismiss}
              className="text-blue-100 transition-colors hover:text-white"
              aria-label="Dismiss"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Lightweight version check indicator for use in settings or footer
 */
export function VersionIndicator() {
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.ready.then((reg) => {
      if (reg.waiting) {
        setHasUpdate(true);
      }

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setHasUpdate(true);
            }
          });
        }
      });
    });
  }, []);

  if (!hasUpdate) {
    return (
      <span className="text-xs text-zinc-500 dark:text-zinc-400">
        Up to date
      </span>
    );
  }

  return (
    <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
      <svg
        className="h-3 w-3"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v3.586L7.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 10.586V7z"
          clipRule="evenodd"
        />
      </svg>
      Update available
    </span>
  );
}

