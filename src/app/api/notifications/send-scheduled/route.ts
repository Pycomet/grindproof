import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendToUser, NotificationTemplates, PushSubscription } from '@/lib/notifications/push-service';
import { env } from '@/lib/env';

// This endpoint should be called by a cron job
// For Vercel: Configure in vercel.json
// For other platforms: Use external cron service

export async function POST(request: NextRequest) {
  try {
    // Verify the request is authorized (cron secret)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'dev-cron-secret';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get the current hour and notification type from query params
    const { searchParams } = new URL(request.url);
    const notificationType = searchParams.get('type'); // 'morning' or 'evening'
    
    if (!notificationType || !['morning', 'evening'].includes(notificationType)) {
      return NextResponse.json(
        { error: 'Invalid notification type. Must be "morning" or "evening".' },
        { status: 400 }
      );
    }

    // Create Supabase admin client
    const supabase = createClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get current time in UTC
    const now = new Date();
    const currentHour = now.getUTCHours();
    const currentMinute = now.getUTCMinutes();

    // Query users who should receive notifications at this time
    // We need to account for different timezones
    const { data: settings, error: settingsError } = await supabase
      .from('notification_settings')
      .select('user_id, timezone, morning_check_enabled, morning_check_time, evening_check_enabled, evening_check_time')
      .eq(
        notificationType === 'morning' ? 'morning_check_enabled' : 'evening_check_enabled',
        true
      );

    if (settingsError) {
      console.error('Error fetching notification settings:', settingsError);
      return NextResponse.json(
        { error: 'Failed to fetch notification settings' },
        { status: 500 }
      );
    }

    if (!settings || settings.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users to notify',
        sent: 0,
      });
    }

    // Filter users based on their local time
    const usersToNotify = settings.filter((setting) => {
      try {
        const targetTime = notificationType === 'morning' 
          ? setting.morning_check_time 
          : setting.evening_check_time;
        
        const [targetHour, targetMinute] = targetTime.split(':').map(Number);
        
        // Calculate user's local time
        const userTime = new Date(now.toLocaleString('en-US', { timeZone: setting.timezone }));
        const userHour = userTime.getHours();
        const userMinute = userTime.getMinutes();
        
        // Check if it's time to send notification (within 5 minute window)
        return userHour === targetHour && Math.abs(userMinute - targetMinute) < 5;
      } catch (error) {
        console.error(`Error processing timezone for user ${setting.user_id}:`, error);
        return false;
      }
    });

    if (usersToNotify.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No users in the current time window',
        sent: 0,
      });
    }

    // Get push subscriptions for users
    const userIds = usersToNotify.map(s => s.user_id);
    const { data: subscriptions, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', userIds)
      .eq('is_active', true);

    if (subsError) {
      console.error('Error fetching subscriptions:', subsError);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions found',
        sent: 0,
      });
    }

    // Group subscriptions by user
    const subscriptionsByUser = subscriptions.reduce((acc, sub) => {
      if (!acc[sub.user_id]) {
        acc[sub.user_id] = [];
      }
      acc[sub.user_id].push({
        endpoint: sub.endpoint,
        p256dhKey: sub.p256dh_key,
        authKey: sub.auth_key,
      });
      return acc;
    }, {} as Record<string, PushSubscription[]>);

    // Send notifications
    const template = notificationType === 'morning' 
      ? NotificationTemplates.morningCheck()
      : NotificationTemplates.eveningCheck();

    let totalSent = 0;
    let totalFailed = 0;
    const expiredEndpoints: string[] = [];

    for (const [userId, userSubscriptions] of Object.entries(subscriptionsByUser)) {
      try {
        const result = await sendToUser(userSubscriptions as PushSubscription[], template);
        totalSent += result.successful;
        totalFailed += result.failed;
        expiredEndpoints.push(...result.expired);
      } catch (error) {
        console.error(`Error sending notifications to user ${userId}:`, error);
        totalFailed += (userSubscriptions as PushSubscription[]).length;
      }
    }

    // Mark expired subscriptions as inactive
    if (expiredEndpoints.length > 0) {
      await supabase
        .from('push_subscriptions')
        .update({ is_active: false })
        .in('endpoint', expiredEndpoints);
    }

    return NextResponse.json({
      success: true,
      sent: totalSent,
      failed: totalFailed,
      expired: expiredEndpoints.length,
      users: usersToNotify.length,
    });
  } catch (error) {
    console.error('Error in scheduled notification handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Scheduled notification endpoint',
    usage: 'POST with ?type=morning or ?type=evening',
    auth: 'Requires Authorization: Bearer <CRON_SECRET>',
  });
}

