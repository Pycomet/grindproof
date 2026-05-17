'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  capturePageview,
  captureClientEvent,
  identifyUser,
  initPostHog,
} from './client';

const INBOUND_SHARE_KEY = 'grindproof:share_referrer_recorded';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (!pathname) return;
    const qs = searchParams?.toString();
    capturePageview(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!user) return;
    identifyUser(user.id, {
      signup_date: user.created_at,
      email: user.email,
    });
  }, [user]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathname !== '/') return;

    const ref = searchParams?.get('ref');
    const surface = searchParams?.get('share_surface');
    const fromTwitter = /(?:^|\.)(?:t\.co|twitter\.com|x\.com)/i.test(
      document.referrer || '',
    );

    if (!ref && !fromTwitter) return;

    if (sessionStorage.getItem(INBOUND_SHARE_KEY)) return;
    sessionStorage.setItem(INBOUND_SHARE_KEY, '1');

    captureClientEvent('share_link_clicked', {
      referrer_user_id: ref ?? null,
      share_surface: surface ?? (fromTwitter ? 'twitter' : 'unknown'),
      raw_referrer: document.referrer || null,
    });
  }, [pathname, searchParams]);

  return <>{children}</>;
}
