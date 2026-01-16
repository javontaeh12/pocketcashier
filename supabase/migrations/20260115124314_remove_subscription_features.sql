/*
  # Remove subscription features and related tables

  1. Drop subscription-related tables
    - `subscription_plans`
    - `business_subscriptions`
    - `subscription_payments`
    - `subscription_features`
    - `event_subscriptions`

  2. Remove subscription columns from existing tables
    - Drop `subscription_message_title`, `subscription_message_body`, `subscription_button_text` from `businesses` table
    - Drop `subscription_status`, `can_link_square` from `settings` table

  3. Remove subscription-related RLS policies

  4. Database simplification - removing all subscription billing and email subscription functionality from the platform
*/

DROP TABLE IF EXISTS subscription_features CASCADE;
DROP TABLE IF EXISTS subscription_payments CASCADE;
DROP TABLE IF EXISTS business_subscriptions CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS event_subscriptions CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'subscription_message_title'
  ) THEN
    ALTER TABLE businesses DROP COLUMN subscription_message_title CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'subscription_message_body'
  ) THEN
    ALTER TABLE businesses DROP COLUMN subscription_message_body CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'businesses' AND column_name = 'subscription_button_text'
  ) THEN
    ALTER TABLE businesses DROP COLUMN subscription_button_text CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'subscription_status'
  ) THEN
    ALTER TABLE settings DROP COLUMN subscription_status CASCADE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'can_link_square'
  ) THEN
    ALTER TABLE settings DROP COLUMN can_link_square CASCADE;
  END IF;
END $$;
