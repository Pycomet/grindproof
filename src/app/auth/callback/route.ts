import { createServerClient } from '@/lib/supabase/server';
import { captureServerEvent } from '@/lib/posthog/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Server-side conversion event — fires after DB commit, not from client.
      // GRI-6 relies on this being server-side so ad-blockers can't suppress it.
      await captureServerEvent(data.user.id, 'signup_completed', {
        signup_method: data.user.app_metadata?.provider ?? 'email',
        user_id: data.user.id,
      });

      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  // If there's an error or no code, redirect to login with error
  return NextResponse.redirect(
    new URL(`/auth/login?error=oauth_callback_failed`, request.url)
  );
}

