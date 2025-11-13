'use client';

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { useEffect, useState } from "react";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Check online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Auto redirect when back online
  useEffect(() => {
    if (isOnline) {
      const timer = setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  return (
    <div className="min-h-screen bg-linear-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-black">
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="max-w-md text-center">
          {/* Logo */}
          <div className="mb-8 flex justify-center">
            <Logo size="lg" />
          </div>

          {/* Status Icon */}
          <div className="mb-6 flex justify-center">
            {isOnline ? (
              <div className="rounded-full bg-green-500/20 p-4">
                <svg
                  className="h-12 w-12 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            ) : (
              <div className="rounded-full bg-orange-500/20 p-4">
                <svg
                  className="h-12 w-12 text-orange-600 dark:text-orange-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"
                  />
                </svg>
              </div>
            )}
          </div>

          {/* Message */}
          <h1 className="mb-4 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {isOnline ? "Back Online!" : "You're Offline"}
          </h1>
          
          <p className="mb-8 text-zinc-600 dark:text-zinc-400">
            {isOnline ? (
              <>Reconnecting you to Grindproof...</>
            ) : (
              <>
                No internet connection detected. Some features may be limited, but
                you can still view cached content.
              </>
            )}
          </p>

          {/* Actions */}
          <div className="flex flex-col gap-4">
            {!isOnline && (
              <>
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-full bg-zinc-900 px-6 py-3 text-base font-semibold text-white transition-all hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                  Try Again
                </button>
                
                <Link
                  href="/dashboard"
                  className="rounded-full border-2 border-zinc-300 px-6 py-3 text-base font-semibold text-zinc-700 transition-all hover:border-zinc-900 hover:bg-zinc-900 hover:text-white dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-50 dark:hover:bg-zinc-50 dark:hover:text-zinc-900"
                >
                  View Cached Dashboard
                </Link>
              </>
            )}
          </div>

          {/* Tips */}
          {!isOnline && (
            <div className="mt-12 rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-left dark:border-zinc-800 dark:bg-zinc-900">
              <h3 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-50">
                Tips for Offline Mode:
              </h3>
              <ul className="space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>Your progress will sync automatically when you're back online</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>Previously viewed goals and routines are still accessible</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">•</span>
                  <span>Check your WiFi or cellular data connection</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

