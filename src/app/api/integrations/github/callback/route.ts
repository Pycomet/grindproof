import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { env } from '@/lib/env';
import { cookies } from 'next/headers';

interface GitHubTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
}

interface GitHubUserResponse {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('GitHub OAuth error:', error);
    return NextResponse.redirect(
      new URL('/auth/login?error=github_oauth_denied', request.url)
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
    const storedState = cookieStore.get('github_oauth_state')?.value;

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
    cookieStore.delete('github_oauth_state');

    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: env.NEXT_GITHUB_CLIENT_ID,
        client_secret: env.NEXT_GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for token');
    }

    const tokenData: GitHubTokenResponse = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Fetch GitHub user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch GitHub user info');
    }

    const githubUser: GitHubUserResponse = await userResponse.json();

    // User is already authenticated (verified above), so we just link their GitHub account
    const userId = user.id;

    // Store integration in database
    const { error: integrationError } = await supabaseAdmin
      .from('integrations')
      .upsert(
        {
          user_id: userId,
          service_type: 'github',
          credentials: {
            accessToken,
          },
          metadata: {
            githubUsername: githubUser.login,
            githubId: githubUser.id,
            avatarUrl: githubUser.avatar_url,
            name: githubUser.name,
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
    return NextResponse.redirect(new URL('/dashboard?github_connected=true', request.url));
  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/auth/login?error=oauth_callback_failed', request.url)
    );
  }
}

