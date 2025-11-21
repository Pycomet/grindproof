-- Create device_tokens table for storing push notification tokens
-- This table stores FCM (Firebase Cloud Messaging) and APNS (Apple Push Notification Service) tokens

CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android', 'web', 'unknown')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Ensure a token is unique per user
  UNIQUE(user_id, token)
);

-- Create index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);

-- Create index for faster lookups by token
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);

-- Enable Row Level Security
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own tokens
CREATE POLICY "Users can view their own device tokens"
  ON device_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own tokens
CREATE POLICY "Users can insert their own device tokens"
  ON device_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own tokens
CREATE POLICY "Users can update their own device tokens"
  ON device_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own tokens
CREATE POLICY "Users can delete their own device tokens"
  ON device_tokens
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment to table
COMMENT ON TABLE device_tokens IS 'Stores device tokens for push notifications (FCM/APNS)';
COMMENT ON COLUMN device_tokens.token IS 'The FCM or APNS device token';
COMMENT ON COLUMN device_tokens.platform IS 'The platform: ios, android, web, or unknown';
COMMENT ON COLUMN device_tokens.last_used IS 'Last time this token was used to send a notification';

