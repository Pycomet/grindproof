'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { captureClientEvent } from '@/lib/posthog/client';

interface SignupCtaProps {
  className: string;
  children: React.ReactNode;
  variant: 'hero' | 'nav' | 'footer';
}

export function SignupCta({ className, children, variant }: SignupCtaProps) {
  const searchParams = useSearchParams();

  const handleClick = () => {
    captureClientEvent('signup_started', {
      source: searchParams?.get('utm_source') ?? null,
      landing_variant: searchParams?.get('v') ?? null,
      cta_position: variant,
    });
  };

  return (
    <Link href="/auth/signup" className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}
