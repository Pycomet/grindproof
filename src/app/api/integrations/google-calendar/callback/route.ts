import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { cookies } from 'next/headers';

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
}

interface GoogleUserInfoResponse {
  email: string;
  verified_email: boolean;
  name?: string;
  picture?: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('Google Calendar OAuth error:', error);
    return NextResponse.redirect(
      new URL('/auth/login?error=google_calendar_oauth_denied', request.url)
    );
  }

  if (!code || !state) {
    return NextResponse.redirect(
      new URL('/auth/login?error=invalid_callback', request.url)
    );
  }

  try {
    // Verify state parameter
    const cookieStore = await cookies();
    const storedState = cookieStore.get('google_calendar_oauth_state')?.value;

    if (!storedState || storedState !== state) {
      return NextResponse.redirect(
        new URL('/auth/login?error=invalid_state', request.url)
      );
    }

    // Require authentication for account linking
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(
        new URL('/auth/login?error=session_expired&message=Your session expired. Please sign in again.', request.url)
      );
    }

    // Clear state cookie
    cookieStore.delete('google_calendar_oauth_state');

    // Exchange code for access token and refresh token
    const redirectUri = `${request.nextUrl.origin}/api/integrations/google-calendar/callback`;
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: env.NEXT_GOOGLE_CALENDAR_CLIENT_ID,
        client_secret: env.NEXT_GOOGLE_CALENDAR_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Failed to exchange code for token:', errorText);
      throw new Error('Failed to exchange code for token');
    }

    const tokenData: GoogleTokenResponse = await tokenResponse.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in;

    if (!refreshToken) {
      console.warn('No refresh token received. User may need to reconnect later.');
    }

    // Calculate token expiry timestamp
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Fetch user info (email)
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch Google user info');
    }

    const googleUser: GoogleUserInfoResponse = await userInfoResponse.json();

    // User is already authenticated (verified above), so we just link their Google Calendar
    const userId = user.id;

    // Store integration in database
    const { error: integrationError } = await supabaseAdmin
      .from('integrations')
      .upsert(
        {
          user_id: userId,
          service_type: 'google_calendar',
          credentials: {
            accessToken,
            refreshToken,
            expiresAt,
          },
          metadata: {
            email: googleUser.email,
            name: googleUser.name,
            picture: googleUser.picture,
            calendarId: 'primary',
          },
          status: 'connected',
        },
        {
          onConflict: 'user_id,service_type',
        }
      );

    if (integrationError) {
      console.error('Failed to store integration:', integrationError);
      // Don't fail the whole flow, just log the error
    }

    // Redirect to dashboard - user is already authenticated
    return NextResponse.redirect(new URL('/dashboard?google_calendar_connected=true', request.url));
  } catch (error) {
    console.error('Google Calendar OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/auth/login?error=oauth_callback_failed', request.url)
    );
  }
}

