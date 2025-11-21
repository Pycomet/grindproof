import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * API endpoint to register device tokens for push notifications
 * POST /api/notifications/register
 * Body: { token: string }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 400 }
      );
    }

    // Get device info from headers
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const platform = userAgent.toLowerCase().includes('iphone') || userAgent.toLowerCase().includes('ipad')
      ? 'ios'
      : userAgent.toLowerCase().includes('android')
      ? 'android'
      : 'unknown';

    // Check if token already exists for this user
    const { data: existingToken } = await supabase
      .from('device_tokens')
      .select('id')
      .eq('user_id', user.id)
      .eq('token', token)
      .single();

    if (existingToken) {
      // Update last_used timestamp
      const { error: updateError } = await supabase
        .from('device_tokens')
        .update({ last_used: new Date().toISOString() })
        .eq('id', existingToken.id);

      if (updateError) {
        console.error('Failed to update token timestamp:', updateError);
        return NextResponse.json(
          { error: 'Failed to update token' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Token already registered',
      });
    }

    // Insert new token
    const { error: insertError } = await supabase
      .from('device_tokens')
      .insert({
        user_id: user.id,
        token,
        platform,
        created_at: new Date().toISOString(),
        last_used: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Failed to register device token:', insertError);
      return NextResponse.json(
        { error: 'Failed to register token' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Token registered successfully',
    });
  } catch (error) {
    console.error('Error in notification registration:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE endpoint to remove device token (e.g., on logout)
 * DELETE /api/notifications/register
 * Body: { token: string }
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 400 }
      );
    }

    // Delete token
    const { error: deleteError } = await supabase
      .from('device_tokens')
      .delete()
      .eq('user_id', user.id)
      .eq('token', token);

    if (deleteError) {
      console.error('Failed to delete device token:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete token' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Token removed successfully',
    });
  } catch (error) {
    console.error('Error in notification deletion:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

