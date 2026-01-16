/*
  # Add Google Calendar Integration

  1. New Tables
    - `google_calendar_integrations`
      - `id` (uuid, primary key)
      - `business_id` (uuid, foreign key) - Links to businesses table
      - `access_token` (text) - OAuth access token for Google Calendar API
      - `refresh_token` (text) - OAuth refresh token to renew access
      - `token_expiry` (timestamptz) - When the access token expires
      - `calendar_id` (text) - The Google Calendar ID to use (default: primary)
      - `is_connected` (boolean) - Whether the integration is active
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on google_calendar_integrations table
    - Add policy for business owners to manage their calendar integration
    - Add policy for developers to view all integrations
*/

-- Create google_calendar_integrations table
CREATE TABLE IF NOT EXISTS google_calendar_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid UNIQUE REFERENCES businesses(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  token_expiry timestamptz,
  calendar_id text DEFAULT 'primary',
  is_connected boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE google_calendar_integrations ENABLE ROW LEVEL SECURITY;

-- Policy: Business owners can view their own calendar integration
CREATE POLICY "Business owners can view own calendar integration"
  ON google_calendar_integrations
  FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Policy: Business owners can insert their own calendar integration
CREATE POLICY "Business owners can insert own calendar integration"
  ON google_calendar_integrations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Policy: Business owners can update their own calendar integration
CREATE POLICY "Business owners can update own calendar integration"
  ON google_calendar_integrations
  FOR UPDATE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Policy: Business owners can delete their own calendar integration
CREATE POLICY "Business owners can delete own calendar integration"
  ON google_calendar_integrations
  FOR DELETE
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE user_id = auth.uid()
    )
  );

-- Policy: Developers can view all calendar integrations
CREATE POLICY "Developers can view all calendar integrations"
  ON google_calendar_integrations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM developer_accounts WHERE user_id = auth.uid()
    )
  );