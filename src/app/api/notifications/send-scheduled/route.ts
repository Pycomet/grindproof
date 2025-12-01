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
    const notificationType = searchParams.get('type'); // 'morning', 'evening', or 'hourly'

    if (!notificationType || !['morning', 'evening', 'hourly'].includes(notificationType)) {
      return NextResponse.json(
        { error: 'Invalid notification type. Must be "morning", "evening", or "hourly".' },
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
    let settings;
    let settingsError;

    if (notificationType === 'hourly') {
      const result = await supabase
        .from('notification_settings')
        .select('user_id, timezone, hourly_review_enabled, hourly_review_start_time, hourly_review_end_time')
        .eq('hourly_review_enabled', true);
      settings = result.data;
      settingsError = result.error;
    } else {
      const result = await supabase
        .from('notification_settings')
        .select('user_id, timezone, morning_check_enabled, morning_check_time, evening_check_enabled, evening_check_time')
        .eq(
          notificationType === 'morning' ? 'morning_check_enabled' : 'evening_check_enabled',
          true
        );
      settings = result.data;
      settingsError = result.error;
    }

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
    const usersToNotify = settings.filter((setting: any) => {
      try {
        // Calculate user's local time
        const userTime = new Date(now.toLocaleString('en-US', { timeZone: setting.timezone }));
        const userHour = userTime.getHours();
        const userMinute = userTime.getMinutes();

        if (notificationType === 'hourly') {
          // For hourly notifications, check if user is within active hours
          const [startHour, startMinute] = setting.hourly_review_start_time.split(':').map(Number);
          const [endHour, endMinute] = setting.hourly_review_end_time.split(':').map(Number);

          const currentMinutes = userHour * 60 + userMinute;
          const startMinutes = startHour * 60 + startMinute;
          const endMinutes = endHour * 60 + endMinute;

          return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
        } else {
          // For morning/evening, check specific time
          const targetTime = notificationType === 'morning'
            ? setting.morning_check_time
            : setting.evening_check_time;

          const [targetHour, targetMinute] = targetTime.split(':').map(Number);

          // Check if it's time to send notification (within 5 minute window)
          return userHour === targetHour && Math.abs(userMinute - targetMinute) < 5;
        }
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
    let totalSent = 0;
    let totalFailed = 0;
    const expiredEndpoints: string[] = [];

    for (const [userId, userSubscriptions] of Object.entries(subscriptionsByUser)) {
      try {
        let template;

        if (notificationType === 'hourly') {
          // Query user's tasks for today
          const startOfDay = new Date();
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date();
          endOfDay.setHours(23, 59, 59, 999);

          const { data: tasks } = await supabase
            .from('tasks')
            .select('id, title, status')
            .eq('user_id', userId)
            .eq('status', 'pending')
            .gte('due_date', startOfDay.toISOString())
            .lte('due_date', endOfDay.toISOString());

          const taskCount = tasks?.length || 0;
          let summary;

          if (taskCount === 0) {
            summary = 'All caught up! No pending tasks for today.';
          } else if (taskCount === 1) {
            summary = '1 task remaining today';
          } else {
            summary = `${taskCount} tasks remaining today`;
          }

          template = NotificationTemplates.hourlyTaskReview(summary);
        } else {
          template = notificationType === 'morning'
            ? NotificationTemplates.morningCheck()
            : NotificationTemplates.eveningCheck();
        }

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
    usage: 'POST with ?type=morning, ?type=evening, or ?type=hourly',
    auth: 'Requires Authorization: Bearer <CRON_SECRET>',
  });
}

