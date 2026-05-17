'use client';

import { Suspense } from 'react';
import { TRPCProvider } from '@/lib/trpc/provider';
import { AuthProvider } from '@/contexts/AuthContext';
import { PostHogProvider } from '@/lib/posthog/PostHogProvider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      <AuthProvider>
        <Suspense fallback={null}>
          <PostHogProvider>{children}</PostHogProvider>
        </Suspense>
      </AuthProvider>
    </TRPCProvider>
  );
}
