'use client';

import { TRPCProvider } from '@/lib/trpc/provider';
import { AuthProvider } from '@/contexts/AuthContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TRPCProvider>
      <AuthProvider>{children}</AuthProvider>
    </TRPCProvider>
  );
}
