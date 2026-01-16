/*
  # Add Chatbot Configuration Columns to Businesses

  1. Changes
    - Add `chatbot_enabled` (boolean, default true) to businesses table
    - Add `business_type` (text, default 'general') to businesses table
    - Add `chatbot_tone` (text, nullable) to businesses table for custom tone/personality
    - Add `chatbot_goals` (jsonb, default '{}') to businesses table for feature toggles

  2. Notes
    - Chatbot is enabled by default for all businesses
    - Business type determines the chatbot's language and service terminology
    - Chatbot goals stores feature flags (enable_bookings, enable_referrals, enable_service_help)
*/

-- Add chatbot configuration columns to businesses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'chatbot_enabled'
  ) THEN
    ALTER TABLE businesses ADD COLUMN chatbot_enabled boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'business_type'
  ) THEN
    ALTER TABLE businesses ADD COLUMN business_type text DEFAULT 'general';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'chatbot_tone'
  ) THEN
    ALTER TABLE businesses ADD COLUMN chatbot_tone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'chatbot_goals'
  ) THEN
    ALTER TABLE businesses ADD COLUMN chatbot_goals jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Update existing businesses to have chatbot enabled by default
UPDATE businesses
SET 
  chatbot_enabled = true,
  chatbot_goals = '{"enable_bookings": true, "enable_referrals": true, "enable_service_help": true}'::jsonb
WHERE chatbot_enabled IS NULL OR chatbot_goals = '{}'::jsonb;
