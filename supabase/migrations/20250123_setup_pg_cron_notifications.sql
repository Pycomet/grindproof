-- ============================================
-- Setup pg_cron for Scheduled Notifications
-- ============================================
-- This migration sets up pg_cron to replace Vercel cron jobs (which require a paid plan)
-- It schedules two cron jobs that call the existing Next.js API route every hour

-- Enable pg_cron extension (included free in all Supabase plans)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage on cron schema to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Unschedule any existing jobs with the same names (for re-running migration)
SELECT cron.unschedule('send-morning-notifications') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-morning-notifications'
);

SELECT cron.unschedule('send-evening-notifications') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'send-evening-notifications'
);

-- Schedule morning notifications check (every hour at minute 0)
-- The API route handles timezone-based filtering internally
-- Note: Replace 'YOUR_APP_URL' with your actual Vercel deployment URL
-- Note: Replace 'YOUR_CRON_SECRET' with your actual CRON_SECRET value
SELECT cron.schedule(
    'send-morning-notifications',  -- Job name
    '0 * * * *',                   -- Cron schedule: every hour at minute 0
    $$
    SELECT
      net.http_post(
          url:='https://grindproof.co/api/notifications/send-scheduled?type=morning',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);

-- Schedule evening notifications check (every hour at minute 0)
SELECT cron.schedule(
    'send-evening-notifications',  -- Job name
    '0 * * * *',                    -- Cron schedule: every hour at minute 0
    $$
    SELECT
      net.http_post(
          url:='https://grindproof.co/api/notifications/send-scheduled?type=evening',
          headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_CRON_SECRET"}'::jsonb,
          body:='{}'::jsonb
      ) as request_id;
    $$
);


