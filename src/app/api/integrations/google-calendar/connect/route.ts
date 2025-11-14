import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    // Require authentication for account linking
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL('/auth/login?error=authentication_required&message=Please sign in to link your Google Calendar', request.url)
      );
    }

    // Generate state parameter for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in cookie (expires in 10 minutes)
    const cookieStore = await cookies();
    cookieStore.set('google_calendar_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });

    // Build Google OAuth URL
    const redirectUri = `${request.nextUrl.origin}/api/integrations/google-calendar/callback`;
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
    ];
    
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', env.NEXT_GOOGLE_CALENDAR_CLIENT_ID);
    googleAuthUrl.searchParams.set('redirect_uri', redirectUri);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', scopes.join(' '));
    googleAuthUrl.searchParams.set('state', state);
    googleAuthUrl.searchParams.set('access_type', 'offline'); // Request refresh token
    googleAuthUrl.searchParams.set('prompt', 'consent'); // Force consent to get refresh token

    return NextResponse.redirect(googleAuthUrl.toString());
  } catch (error) {
    console.error('Google Calendar OAuth initiation error:', error);
    return NextResponse.redirect(
      new URL('/auth/login?error=oauth_init_failed', request.url)
    );
  }
}

